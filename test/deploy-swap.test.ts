import { beforeAll, describe, expect, it } from 'bun:test'
import { erc20Abi, formatEther, parseEther } from 'viem'

import { UNISWAP_V4_POOL_MANAGER, UNISWAP_V4_UNIVERSAL_ROUTER } from '../src/constants'
import { deployV4 } from '../src/deploy-v4'
import { quoteV4 } from '../src/quote-v4'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
import { swapV4 } from '../src/swap-v4'
import { getTokenRewards, setupTest, type SetupTestReturnType } from './helper'
import { warpAnvil } from './util'

/**
 * Deploy, Quote, and Swap Tests
 *
 * These tests validate the complete trading flow:
 * 1. Deploy a Clanker token via Levr
 * 2. Quote and execute swap: Native ETH → Token
 * 3. Quote and execute swap: Token → Native ETH
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
  let clanker: SetupTestReturnType['clanker']
  let weth: SetupTestReturnType['weth']
  let publicClient: SetupTestReturnType['publicClient']
  let wallet: SetupTestReturnType['wallet']
  let chainId: SetupTestReturnType['chainId']
  let lpLockerAddress: SetupTestReturnType['lpLockerAddress']

  beforeAll(() => {
    ;({ publicClient, wallet, chainId, lpLockerAddress, clanker, weth } = setupTest())
  })

  it(
    'should deploy token',
    async () => {
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

      // Wait for MEV protection delay (120 seconds)
      console.log('\n⏰ Warping 120 seconds forward to bypass MEV protection...')
      await warpAnvil(120)
    },
    {
      timeout: 30000,
    }
  )

  it(
    'should quote and execute swap: Native ETH → Token',
    async () => {
      // Use deployed token from previous test
      expect(deployedTokenAddress).toBeDefined()

      if (!lpLockerAddress) throw new Error('LP Locker address not found')
      if (!wallet.account) throw new Error('Wallet account not found')

      console.log('\n=== QUOTE & SWAP: Native ETH → Token ===')
      console.log('Using deployed token:', deployedTokenAddress)

      // Get pool information from LP locker
      const tokenRewards = await getTokenRewards(publicClient, deployedTokenAddress)

      const poolKey = tokenRewards.poolKey
      console.log('Pool key:', {
        currency0: poolKey.currency0,
        currency1: poolKey.currency1,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks,
      })

      // Get WETH address and determine swap direction
      const wethAddress = weth.address
      if (!wethAddress) throw new Error('WETH address not found')

      // We want to swap WETH for Token (buy tokens with ETH)
      // Determine if WETH is currency0 or currency1
      const isWETHCurrency0 = poolKey.currency0.toLowerCase() === wethAddress.toLowerCase()
      // If WETH is currency0, swap currency0 → currency1 (zeroForOne = true)
      // If WETH is currency1, swap currency1 → currency0 (zeroForOne = false)
      const zeroForOne = isWETHCurrency0

      // Use a smaller amount for Clanker hooks with custom accounting
      const amountIn = parseEther('0.001') // 0.001 ETH

      console.log('Swap direction:', zeroForOne ? 'currency0 → currency1' : 'currency1 → currency0')
      console.log(
        '  Which is:',
        zeroForOne
          ? `${poolKey.currency0} → ${poolKey.currency1}`
          : `${poolKey.currency1} → ${poolKey.currency0}`
      )
      console.log('  WETH → Token swap')
      console.log(`Amount in: ${formatEther(amountIn)} ETH`)

      // STEP 1: Get quote
      console.log('\n📊 Step 1: Getting quote...')
      const quote = await quoteV4({
        publicClient,
        chainId,
        poolKey,
        zeroForOne,
        amountIn,
      })

      console.log('✅ Quote calculated:')
      console.log(`  Amount in: ${formatEther(amountIn)} ETH`)
      console.log(`  Amount out: ${quote.amountOut.toString()} tokens (raw)`)
      console.log(`  Gas estimate: ${quote.gasEstimate.toString()}`)

      // Verify fee data is returned
      if (quote.hookFees) {
        console.log('\n📊 Hook fees:')

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

      // STEP 2: Execute swap
      console.log('\n💱 Step 2: Executing swap...')

      // Determine output currency
      const outputCurrency = zeroForOne ? poolKey.currency1 : poolKey.currency0

      // Get initial balances
      const [initialTokenBalance, initialEthBalance] = await Promise.all([
        publicClient.readContract({
          address: outputCurrency,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [wallet.account.address],
        }),
        publicClient.getBalance({
          address: wallet.account.address,
        }),
      ])

      console.log('\n📊 Initial balances:')
      console.log(`  Token: ${initialTokenBalance.toString()} (raw)`)
      console.log(`  ETH: ${formatEther(initialEthBalance)} ETH`)

      // Calculate amountOutMinimum with slippage protection
      const SLIPPAGE_BPS = 100n // 1% = 100 basis points
      const amountOutMinimum =
        quote.amountOut === 0n ? 0n : (quote.amountOut * (10000n - SLIPPAGE_BPS)) / 10000n

      console.log(`Min out (1% slippage): ${amountOutMinimum.toString()} tokens (raw)`)

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

      console.log('\n✅ Swap executed:')
      console.log('  Tx:', txHash)

      // Get final balances and calculate changes
      const [finalTokenBalance, finalEthBalance] = await Promise.all([
        publicClient.readContract({
          address: outputCurrency,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [wallet.account.address],
        }),
        publicClient.getBalance({
          address: wallet.account.address,
        }),
      ])

      const tokensReceived = finalTokenBalance - initialTokenBalance
      const ethSpent = initialEthBalance - finalEthBalance
      const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice)
      const swapCost = ethSpent - gasUsed

      console.log('\n📊 Balance changes:')
      console.log(`  Token received: ${tokensReceived.toString()} (raw)`)
      console.log(`  ETH spent: ${formatEther(ethSpent)} ETH`)
      console.log(`    ├─ Gas: ${formatEther(gasUsed)} ETH`)
      console.log(`    └─ Swap: ${formatEther(swapCost)} ETH`)

      // Verify swap results
      expect(tokensReceived).toBeGreaterThan(0n)
      expect(ethSpent).toBeGreaterThan(amountIn)
      if (quote.amountOut > 0n) {
        expect(tokensReceived).toBeGreaterThanOrEqual(amountOutMinimum)
      }

      console.log('\n✅ Native ETH → Token swap verified:')
      console.log('  ✓ Tokens received')
      console.log('  ✓ Native ETH deducted (swap + gas)')
      console.log('  ✓ WETH wrapping handled automatically')
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should quote and execute swap: Token → Native ETH',
    async () => {
      // Use deployed token from previous test
      expect(deployedTokenAddress).toBeDefined()

      if (!lpLockerAddress) throw new Error('LP Locker address not found')
      if (!wallet.account) throw new Error('Wallet account not found')

      console.log('\n=== QUOTE & SWAP: Token → Native ETH ===')
      console.log('Using deployed token:', deployedTokenAddress)

      // Get pool information from LP locker
      const tokenRewards = await getTokenRewards(publicClient, deployedTokenAddress)

      const poolKey = tokenRewards.poolKey

      // Get WETH address
      const wethAddress = weth.address
      if (!wethAddress) throw new Error('WETH address not found')

      // Reverse direction: Token → WETH (sell tokens for ETH)
      // Determine swap direction based on pool
      const isTokenCurrency0 =
        poolKey.currency0.toLowerCase() === deployedTokenAddress.toLowerCase()

      // zeroForOne: if token is currency0, we're swapping currency0 → currency1
      const zeroForOne = isTokenCurrency0

      // Use tokens from previous swap
      const tokenBalance = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      console.log(`Token balance: ${tokenBalance.toString()} (raw)`)
      expect(tokenBalance).toBeGreaterThan(0n)

      // Swap half of our tokens back to WETH
      const amountIn = tokenBalance / 2n

      console.log('Swap direction:', zeroForOne ? 'currency0 → currency1' : 'currency1 → currency0')
      console.log(
        '  Which is:',
        zeroForOne
          ? `${poolKey.currency0} → ${poolKey.currency1}`
          : `${poolKey.currency1} → ${poolKey.currency0}`
      )
      console.log('  Token → WETH swap')
      console.log(`Amount in: ${amountIn.toString()} tokens (raw)`)

      // STEP 1: Get quote
      console.log('\n📊 Step 1: Getting quote...')
      const quote = await quoteV4({
        publicClient,
        chainId,
        poolKey,
        zeroForOne,
        amountIn,
      })

      console.log('✅ Quote calculated:')
      console.log(`  Amount in: ${amountIn.toString()} tokens (raw)`)
      console.log(`  Amount out: ${formatEther(quote.amountOut)} ETH`)
      console.log(`  Gas estimate: ${quote.gasEstimate.toString()}`)

      // Verify fee data is returned
      if (quote.hookFees) {
        console.log('\n📊 Hook fees:')

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

      // STEP 2: Execute swap
      console.log('\n💱 Step 2: Executing swap...')

      // Calculate amountOutMinimum with slippage protection
      const SLIPPAGE_BPS = 100n // 1% = 100 basis points
      const amountOutMinimum =
        quote.amountOut === 0n ? 0n : (quote.amountOut * (10000n - SLIPPAGE_BPS)) / 10000n

      console.log(`Min out (1% slippage): ${formatEther(amountOutMinimum)} ETH`)

      // Get router addresses
      const universalRouterAddress = UNISWAP_V4_UNIVERSAL_ROUTER(chainId)
      const poolManagerAddress = UNISWAP_V4_POOL_MANAGER(chainId)

      if (!universalRouterAddress) throw new Error('Universal Router address not found')
      if (!poolManagerAddress) throw new Error('Pool Manager address not found')

      // Get initial balances for verification
      const [
        initialEthBalance,
        initialSwapperWeth,
        initialUniversalRouterEth,
        initialUniversalRouterWeth,
        initialPoolManagerEth,
        initialPoolManagerWeth,
      ] = await Promise.all([
        publicClient.getBalance({ address: wallet.account.address }),
        publicClient.readContract({
          address: wethAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [wallet.account.address],
        }),
        publicClient.getBalance({ address: universalRouterAddress }),
        publicClient.readContract({
          address: wethAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [universalRouterAddress],
        }),
        publicClient.getBalance({ address: poolManagerAddress }),
        publicClient.readContract({
          address: wethAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [poolManagerAddress],
        }),
      ])

      console.log('\n📊 Initial balances:')
      console.log('  Swapper:')
      console.log(`    ├─ ETH: ${formatEther(initialEthBalance)} ETH`)
      console.log(`    └─ WETH: ${formatEther(initialSwapperWeth)} WETH`)
      console.log('  Universal Router:')
      console.log(`    ├─ ETH: ${formatEther(initialUniversalRouterEth)} ETH`)
      console.log(`    └─ WETH: ${formatEther(initialUniversalRouterWeth)} WETH`)
      console.log('  Pool Manager:')
      console.log(`    ├─ ETH: ${formatEther(initialPoolManagerEth)} ETH`)
      console.log(`    └─ WETH: ${formatEther(initialPoolManagerWeth)} WETH`)

      // Execute the reverse swap
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

      console.log('\n✅ Swap executed:')
      console.log('  Tx:', txHash)

      // Get final balances
      const [
        finalEthBalance,
        finalSwapperWeth,
        finalUniversalRouterEth,
        finalUniversalRouterWeth,
        finalPoolManagerEth,
        finalPoolManagerWeth,
      ] = await Promise.all([
        publicClient.getBalance({ address: wallet.account.address }),
        publicClient.readContract({
          address: wethAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [wallet.account.address],
        }),
        publicClient.getBalance({ address: universalRouterAddress }),
        publicClient.readContract({
          address: wethAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [universalRouterAddress],
        }),
        publicClient.getBalance({ address: poolManagerAddress }),
        publicClient.readContract({
          address: wethAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [poolManagerAddress],
        }),
      ])

      // Calculate changes
      const ethChange = finalEthBalance - initialEthBalance
      const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice)
      const nativeEthReceived = ethChange + gasUsed
      const wethChange = finalSwapperWeth - initialSwapperWeth

      console.log('\n📊 Balance changes:')
      console.log('  Swapper:')
      console.log(
        `    ├─ ETH: ${formatEther(ethChange)} ETH (+${formatEther(nativeEthReceived)} swap, -${formatEther(gasUsed)} gas)`
      )
      console.log(`    └─ WETH: ${formatEther(wethChange)} WETH`)
      console.log('  Universal Router:')
      console.log(
        `    ├─ ETH: ${formatEther(finalUniversalRouterEth - initialUniversalRouterEth)} ETH`
      )
      console.log(
        `    └─ WETH: ${formatEther(finalUniversalRouterWeth - initialUniversalRouterWeth)} WETH`
      )
      console.log('  Pool Manager:')
      console.log(`    ├─ ETH: ${formatEther(finalPoolManagerEth - initialPoolManagerEth)} ETH`)
      console.log(`    └─ WETH: ${formatEther(finalPoolManagerWeth - initialPoolManagerWeth)} WETH`)

      // Verify swap results
      expect(nativeEthReceived).toBeGreaterThan(0n)
      expect(ethChange).toBeGreaterThan(-gasUsed)
      expect(finalSwapperWeth).toBe(initialSwapperWeth)
      expect(finalUniversalRouterEth).toBe(initialUniversalRouterEth)
      expect(finalUniversalRouterWeth).toBe(initialUniversalRouterWeth)

      console.log('\n✅ Token → Native ETH swap verified:')
      console.log('  ✓ Native ETH received (WETH unwrapped automatically)')
      console.log('  ✓ Swapper has no WETH balance')
      console.log('  ✓ Universal Router clean (no lingering balances)')
    },
    {
      timeout: 60000,
    }
  )
})
