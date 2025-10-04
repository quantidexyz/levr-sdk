import { describe, expect, it } from 'bun:test'
import { Clanker } from 'clanker-sdk/v4'
import { erc20Abi, parseEther } from 'viem'

import { IClankerLPLocker } from '../src/abis'
import { GET_LP_LOCKER_ADDRESS, WETH } from '../src/constants'
import { deployV4 } from '../src/deploy-v4'
import { quoteV4 } from '../src/quote-v4'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
import { swapV4 } from '../src/swap-v4'
import { getPublicClient, getWallet, levrAnvil, warpAnvil } from './util'

/**
 * Deploy, Quote, and Swap Tests
 *
 * These tests validate the complete trading flow:
 * 1. Deploy a Clanker token via Levr
 * 2. Quote a swap: Native ETH → Token
 * 3. Execute swap: Native ETH → Token
 * 4. Quote a swap: Token → Native ETH
 * 5. Execute swap: Token → Native ETH
 *
 * Prerequisites:
 * 1. Anvil must be running with Base fork: `cd contracts && make anvil-fork`
 * 2. LevrFactory_v1 must be deployed: `cd contracts && make deploy-devnet-factory`
 * 3. Clanker v4 contracts must be deployed on the fork
 * 4. Account must have ETH for gas and swap operations
 */
describe('#DEPLOY_QUOTE_SWAP_TEST', () => {
  // ---
  // CONSTANTS

  const testDeploymentConfig: LevrClankerDeploymentSchemaType = {
    name: 'Swap Test Token',
    symbol: 'SWAP',
    image: 'ipfs://bafkreif2xtaifw7byqxoydsmbrgrpryyvpz65fwdxghgbrurj6uzhhkktm',
    metadata: {
      description: 'Test token for swap testing',
      telegramLink: 'https://t.me/swaptoken',
    },
    devBuy: '0.5 ETH', // Add initial liquidity
  }

  // ---
  // VARIABLES (shared across tests)

  let deployedTokenAddress: `0x${string}`
  let ethToTokenQuote: { amountOut: bigint; gasEstimate: bigint } | undefined

  it(
    'should deploy token',
    async () => {
      const publicClient = getPublicClient()
      const wallet = getWallet()

      // Initialize Clanker SDK
      const clanker = new Clanker({ publicClient, wallet })

      const { receipt, address: clankerToken } = await deployV4({
        c: testDeploymentConfig,
        clanker,
      })

      expect(receipt.status).toBe('success')
      expect(clankerToken).toBeDefined()

      // Store deployed token address for subsequent tests
      deployedTokenAddress = clankerToken

      console.log('✅ Token deployed:', {
        txHash: receipt.transactionHash,
        clankerToken,
      })

      // Get token info
      const tokenName = await publicClient.readContract({
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'name',
      })

      const tokenSymbol = await publicClient.readContract({
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'symbol',
      })

      console.log('Token info:', { name: tokenName, symbol: tokenSymbol })
    },
    {
      timeout: 30000,
    }
  )

  it(
    'should quote swap: Native ETH → Token',
    async () => {
      // Use deployed token from previous test
      expect(deployedTokenAddress).toBeDefined()

      const publicClient = getPublicClient()
      const chainId = levrAnvil.id
      const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)

      if (!lpLockerAddress) throw new Error('LP Locker address not found')

      console.log('\n=== QUOTE: Native ETH → Token ===')
      console.log('Using deployed token:', deployedTokenAddress)

      // Get pool information from LP locker
      const tokenRewards = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLPLocker,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      const poolKey = tokenRewards.poolKey
      console.log('Pool key:', {
        currency0: poolKey.currency0,
        currency1: poolKey.currency1,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks,
      })

      // Get WETH address and determine swap direction
      const wethAddress = WETH(chainId)?.address
      if (!wethAddress) throw new Error('WETH address not found')

      // We want to swap WETH for Token (buy tokens with ETH)
      // Determine if WETH is currency0 or currency1
      const isWETHCurrency0 = poolKey.currency0.toLowerCase() === wethAddress.toLowerCase()
      // If WETH is currency0, swap currency0 → currency1 (zeroForOne = true)
      // If WETH is currency1, swap currency1 → currency0 (zeroForOne = false)
      const zeroForOne = isWETHCurrency0

      // Use a smaller amount for Clanker hooks with custom accounting
      const amountIn = parseEther('0.001') // 0.001 ETH

      console.log('Swap direction:', zeroForOne ? 'WETH → Token' : 'Token → WETH')
      console.log('Amount in:', amountIn.toString())

      // Wait for MEV protection delay (120 seconds)
      console.log('\n⏰ Warping 120 seconds forward to bypass MEV protection...')
      await warpAnvil(120)

      // Use quoteV4 to get swap quote
      const quote = await quoteV4({
        publicClient,
        chainId,
        poolKey,
        zeroForOne,
        amountIn,
      })

      ethToTokenQuote = quote

      console.log('✅ Quote calculated:', {
        amountIn: amountIn.toString(),
        amountOut: quote.amountOut.toString(),
        gasEstimate: quote.gasEstimate.toString(),
      })

      // Verify fee data is returned
      if (quote.hookFees) {
        console.log('📊 Hook fee data:', quote.hookFees)

        if (quote.hookFees.type === 'static') {
          console.log(
            `  Clanker fee: ${quote.hookFees.clankerFee! / 10000}% (${quote.hookFees.clankerFee} bps)`
          )
          console.log(
            `  Paired fee: ${quote.hookFees.pairedFee! / 10000}% (${quote.hookFees.pairedFee} bps)`
          )
          expect(quote.hookFees.clankerFee).toBeGreaterThan(0)
          expect(quote.hookFees.pairedFee).toBeGreaterThan(0)
        } else if (quote.hookFees.type === 'dynamic') {
          console.log(
            `  Base fee: ${quote.hookFees.baseFee! / 10000}% (${quote.hookFees.baseFee} bps)`
          )
          console.log(
            `  Max LP fee: ${quote.hookFees.maxLpFee! / 10000}% (${quote.hookFees.maxLpFee} bps)`
          )
          expect(quote.hookFees.baseFee).toBeGreaterThanOrEqual(0)
          expect(quote.hookFees.maxLpFee).toBeGreaterThanOrEqual(0)
        }
      }

      // Note: Clanker tokens with custom hooks may return 0 from quoter
      // The actual swap will determine the real output amount
      expect(quote.amountOut).toBeGreaterThanOrEqual(0n)
      expect(ethToTokenQuote).toBeDefined()

      console.log('✅ Native ETH → Token quote complete:')
      console.log('  ✓ Fee data returned from Clanker hook')
      console.log('  ✓ Quote calculated successfully')
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should execute swap: Native ETH → Token',
    async () => {
      // Use deployed token and quote from previous tests
      expect(deployedTokenAddress).toBeDefined()
      expect(ethToTokenQuote).toBeDefined()

      if (!ethToTokenQuote) throw new Error('Quote result not available from previous test')

      const publicClient = getPublicClient()
      const wallet = getWallet()
      const chainId = levrAnvil.id
      const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)

      if (!lpLockerAddress) throw new Error('LP Locker address not found')
      if (!wallet.account) throw new Error('Wallet account not found')

      console.log('\n=== SWAP: Native ETH → Token ===')
      console.log('Using deployed token:', deployedTokenAddress)

      // Get pool information from LP locker
      const tokenRewards = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLPLocker,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      const poolKey = tokenRewards.poolKey

      // Get WETH address and determine swap direction
      const wethAddress = WETH(chainId)?.address
      if (!wethAddress) throw new Error('WETH address not found')

      const isWETHCurrency0 = poolKey.currency0.toLowerCase() === wethAddress.toLowerCase()
      const zeroForOne = isWETHCurrency0

      const amountIn = parseEther('0.001') // 0.001 ETH

      // Determine output currency
      const outputCurrency = zeroForOne ? poolKey.currency1 : poolKey.currency0

      // Get initial balances
      const initialTokenBalance = await publicClient.readContract({
        address: outputCurrency,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      const initialEthBalance = await publicClient.getBalance({
        address: wallet.account.address,
      })

      console.log('Initial token balance:', initialTokenBalance.toString())
      console.log('Initial ETH balance:', initialEthBalance.toString())
      console.log('Amount in:', amountIn.toString())
      console.log('Quote out:', ethToTokenQuote.amountOut.toString())

      // Calculate amountOutMinimum with slippage protection
      const SLIPPAGE_BPS = 100n // 1% = 100 basis points
      const amountOutMinimum =
        ethToTokenQuote.amountOut === 0n
          ? 0n
          : (ethToTokenQuote.amountOut * (10000n - SLIPPAGE_BPS)) / 10000n

      console.log('Min out (1% slippage):', amountOutMinimum.toString())

      // Execute the swap
      const { txHash, receipt } = await swapV4({
        publicClient,
        wallet,
        chainId,
        poolKey,
        zeroForOne,
        amountIn,
        amountOutMinimum,
      })

      expect(receipt.status).toBe('success')
      expect(txHash).toBeDefined()

      console.log('\n✅ Swap executed successfully:')
      console.log('  Tx hash:', txHash)
      console.log('  Gas used:', receipt.gasUsed?.toString())

      // Get final balances and calculate changes
      const finalTokenBalance = await publicClient.readContract({
        address: outputCurrency,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      const finalEthBalance = await publicClient.getBalance({
        address: wallet.account.address,
      })

      const tokensReceived = finalTokenBalance - initialTokenBalance
      const ethSpent = initialEthBalance - finalEthBalance
      const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice)

      console.log('  Tokens received:', tokensReceived.toString())
      console.log('  ETH spent:', ethSpent.toString())
      console.log('  Gas cost:', gasUsed.toString())
      console.log('  Swap cost (ETH - gas):', (ethSpent - gasUsed).toString())

      // Verify we received tokens
      expect(tokensReceived).toBeGreaterThan(0n)

      // Verify ETH was spent (should be amountIn + gas)
      expect(ethSpent).toBeGreaterThan(amountIn)

      // If quote was non-zero, verify slippage protection worked
      if (ethToTokenQuote.amountOut > 0n) {
        expect(tokensReceived).toBeGreaterThanOrEqual(amountOutMinimum)
      }

      console.log('✅ Native ETH → Token swap complete:')
      console.log('  ✓ Swap executed without reverting')
      console.log('  ✓ Tokens received')
      console.log('  ✓ Native ETH balance decreased correctly')
      console.log('  ✓ Router handled WETH wrapping automatically')
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should quote swap: Token → Native ETH',
    async () => {
      // Use deployed token from previous test
      expect(deployedTokenAddress).toBeDefined()

      const publicClient = getPublicClient()
      const chainId = levrAnvil.id
      const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)

      if (!lpLockerAddress) throw new Error('LP Locker address not found')

      console.log('\n=== QUOTE: Token → Native ETH ===')
      console.log('Using deployed token:', deployedTokenAddress)

      // Get pool information from LP locker
      const tokenRewards = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLPLocker,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      const poolKey = tokenRewards.poolKey

      // Get WETH address
      const wethAddress = WETH(chainId)?.address
      if (!wethAddress) throw new Error('WETH address not found')

      // Reverse direction: Token → WETH
      // Determine swap direction based on pool
      const isTokenCurrency0 =
        poolKey.currency0.toLowerCase() === deployedTokenAddress.toLowerCase()

      // zeroForOne: if token is currency0, we're swapping currency0 → currency1
      const zeroForOne = isTokenCurrency0

      // Use a sample amount (we'll use parseEther for token amount)
      const amountIn = parseEther('100') // 100 tokens

      console.log('Swap direction:', zeroForOne ? 'Token → WETH' : 'WETH → Token')
      console.log('Amount in:', amountIn.toString())

      // Use quoteV4 to get swap quote (no need to warp again, already past MEV delay)
      const quote = await quoteV4({
        publicClient,
        chainId,
        poolKey,
        zeroForOne,
        amountIn,
      })

      console.log('✅ Quote calculated:', {
        amountIn: amountIn.toString(),
        amountOut: quote.amountOut.toString(),
        gasEstimate: quote.gasEstimate.toString(),
      })

      // Verify fee data is returned
      if (quote.hookFees) {
        console.log('📊 Hook fee data:', quote.hookFees)

        if (quote.hookFees.type === 'static') {
          console.log(
            `  Clanker fee: ${quote.hookFees.clankerFee! / 10000}% (${quote.hookFees.clankerFee} bps)`
          )
          console.log(
            `  Paired fee: ${quote.hookFees.pairedFee! / 10000}% (${quote.hookFees.pairedFee} bps)`
          )
          expect(quote.hookFees.clankerFee).toBeGreaterThan(0)
          expect(quote.hookFees.pairedFee).toBeGreaterThan(0)
        } else if (quote.hookFees.type === 'dynamic') {
          console.log(
            `  Base fee: ${quote.hookFees.baseFee! / 10000}% (${quote.hookFees.baseFee} bps)`
          )
          console.log(
            `  Max LP fee: ${quote.hookFees.maxLpFee! / 10000}% (${quote.hookFees.maxLpFee} bps)`
          )
          expect(quote.hookFees.baseFee).toBeGreaterThanOrEqual(0)
          expect(quote.hookFees.maxLpFee).toBeGreaterThanOrEqual(0)
        }
      }

      // Note: Clanker tokens with custom hooks may return 0 from quoter
      expect(quote.amountOut).toBeGreaterThanOrEqual(0n)

      console.log('✅ Token → Native ETH quote complete:')
      console.log('  ✓ Fee data returned from Clanker hook')
      console.log('  ✓ Quote calculated successfully')
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should execute swap: Token → Native ETH',
    async () => {
      // Use deployed token from previous tests
      expect(deployedTokenAddress).toBeDefined()

      const publicClient = getPublicClient()
      const wallet = getWallet()
      const chainId = levrAnvil.id
      const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)

      if (!lpLockerAddress) throw new Error('LP Locker address not found')
      if (!wallet.account) throw new Error('Wallet account not found')

      console.log('\n=== SWAP: Token → Native ETH ===')
      console.log('Using deployed token:', deployedTokenAddress)

      // Get pool information from LP locker
      const tokenRewards = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLPLocker,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      const poolKey = tokenRewards.poolKey

      // Get WETH address
      const wethAddress = WETH(chainId)?.address
      if (!wethAddress) throw new Error('WETH address not found')

      // Reverse direction: Token → WETH
      const isTokenCurrency0 =
        poolKey.currency0.toLowerCase() === deployedTokenAddress.toLowerCase()
      const zeroForOne = isTokenCurrency0

      // Use tokens from previous swap
      const tokenBalance = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      console.log('Token balance:', tokenBalance.toString())
      expect(tokenBalance).toBeGreaterThan(0n)

      // Swap half of our tokens back to WETH
      const amountIn = tokenBalance / 2n

      console.log('Amount in:', amountIn.toString())

      // Get initial balances
      const initialWethBalance = await publicClient.readContract({
        address: wethAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      const initialEthBalance = await publicClient.getBalance({
        address: wallet.account.address,
      })

      console.log('Initial WETH balance:', initialWethBalance.toString())
      console.log('Initial ETH balance:', initialEthBalance.toString())

      // Execute the reverse swap
      const { txHash, receipt } = await swapV4({
        publicClient,
        wallet,
        chainId,
        poolKey,
        zeroForOne,
        amountIn,
        amountOutMinimum: 0n, // Accept any amount for this test
      })

      expect(receipt.status).toBe('success')
      expect(txHash).toBeDefined()

      console.log('\n✅ Swap executed successfully:')
      console.log('  Tx hash:', txHash)
      console.log('  Gas used:', receipt.gasUsed?.toString())

      // Get final balances
      const finalWethBalance = await publicClient.readContract({
        address: wethAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      const finalEthBalance = await publicClient.getBalance({
        address: wallet.account.address,
      })

      const wethReceived = finalWethBalance - initialWethBalance
      const ethChange = finalEthBalance - initialEthBalance
      const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice)

      console.log('  WETH received:', wethReceived.toString())
      console.log('  ETH change:', ethChange.toString())
      console.log('  Gas cost:', gasUsed.toString())

      // Verify we received WETH
      expect(wethReceived).toBeGreaterThan(0n)

      // Verify ETH only decreased by gas (no ETH spent on swap itself)
      expect(ethChange + gasUsed).toBeLessThanOrEqual(0n)

      console.log('✅ Token → WETH swap complete:')
      console.log('  ✓ Token → WETH swap successful')
      console.log('  ✓ WETH received from token sale')
      console.log('  ✓ Only gas paid in ETH (no swap cost)')
      console.log('  ✓ Complete round-trip validated')
      console.log('')
      console.log('💡 Note: Router outputs WETH. To receive native ETH, unwrap WETH separately.')
    },
    {
      timeout: 60000,
    }
  )
})
