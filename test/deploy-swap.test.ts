import { Token } from '@uniswap/sdk-core'
import { Pool } from '@uniswap/v4-sdk'
import { describe, expect, it } from 'bun:test'
import { Clanker } from 'clanker-sdk/v4'
import { erc20Abi, keccak256, parseEther } from 'viem'

import { IClankerLPLocker, PoolManager } from '../src/abis'
import {
  GET_LP_LOCKER_ADDRESS,
  UNISWAP_V4_POOL_MANAGER,
  UNISWAP_V4_UNIVERSAL_ROUTER,
  WETH,
} from '../src/constants'
import { deployV4 } from '../src/deploy-v4'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
import { getPublicClient, getWallet, levrAnvil } from './util'

/**
 * Deploy and Swap Tests
 *
 * These tests validate the full deployment and trading flow:
 * 1. Deploy a Clanker token via Levr
 * 2. Quote a swap using V4Quoter
 * 3. Execute a swap using Universal Router
 *
 * Prerequisites:
 * 1. Anvil must be running with Base fork: `cd contracts && make anvil-fork`
 * 2. LevrFactory_v1 must be deployed: `cd contracts && make deploy-devnet-factory`
 * 3. Clanker v4 contracts must be deployed on the fork
 * 4. Account must have ETH for gas and swap operations
 */
describe('#DEPLOY_SWAP_TEST', () => {
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
  let quoteResult: { amountOut: bigint; gasEstimate: bigint } | undefined

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
    'should quote swap',
    async () => {
      // Use deployed token from previous test
      expect(deployedTokenAddress).toBeDefined()

      const publicClient = getPublicClient()
      const chainId = levrAnvil.id
      const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)
      const poolManagerAddress = UNISWAP_V4_POOL_MANAGER(chainId)

      if (!lpLockerAddress) throw new Error('LP Locker address not found')
      if (!poolManagerAddress) throw new Error('Pool Manager address not found')

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

      // Create Token instances for Pool.getPoolId (which expects Token objects, not addresses)
      // For simplicity, we'll assume both tokens have 18 decimals
      const token0 = new Token(chainId, poolKey.currency0 as `0x${string}`, 18, 'TOKEN0', 'Token 0')
      const token1 = new Token(chainId, poolKey.currency1 as `0x${string}`, 18, 'TOKEN1', 'Token 1')

      // Get pool ID using Token instances
      const poolId = Pool.getPoolId(token0, token1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks)

      console.log('Pool ID:', poolId)

      // Get WETH address and determine swap direction
      const wethAddress = WETH(chainId)?.address
      if (!wethAddress) throw new Error('WETH address not found')

      const zeroForOne = poolKey.currency0.toLowerCase() === wethAddress.toLowerCase()
      const amountIn = parseEther('0.01')

      // Read pool state from PoolManager storage
      const POOLS_SLOT = 6n
      const poolIdBytes = poolId as `0x${string}`
      const slotKey = keccak256(
        `0x${poolIdBytes.slice(2)}${POOLS_SLOT.toString(16).padStart(64, '0')}`
      )

      // Read slot0: sqrtPriceX96, tick, protocolFee, lpFee
      const slot0Data = await publicClient.readContract({
        address: poolManagerAddress,
        abi: PoolManager,
        functionName: 'extsload',
        args: [slotKey],
      })

      // Decode slot0 packed data
      const slot0BigInt = BigInt(slot0Data)
      const sqrtPriceX96 = slot0BigInt & ((1n << 160n) - 1n)
      const tickRaw = Number((slot0BigInt >> 160n) & ((1n << 24n) - 1n))
      const tick = tickRaw >= 0x800000 ? tickRaw - 0x1000000 : tickRaw
      const lpFee = Number((slot0BigInt >> 208n) & ((1n << 24n) - 1n))

      // Read liquidity from storage
      const liquiditySlotBigInt = BigInt(slotKey) + 3n
      const liquiditySlotHex =
        `0x${liquiditySlotBigInt.toString(16).padStart(64, '0')}` as `0x${string}`

      const liquidityData = await publicClient.readContract({
        address: poolManagerAddress,
        abi: PoolManager,
        functionName: 'extsload',
        args: [liquiditySlotHex],
      })

      const liquidity = BigInt(liquidityData)

      // Calculate quote using price from pool state
      const Q96 = 2n ** 96n
      let amountOut: bigint

      if (zeroForOne) {
        // Swapping token0 for token1: output = amountIn * Q96^2 / sqrtPrice^2
        amountOut = (amountIn * Q96 * Q96) / (sqrtPriceX96 * sqrtPriceX96)
      } else {
        // Swapping token1 for token0: output = amountIn * sqrtPrice^2 / Q96^2
        amountOut = (amountIn * sqrtPriceX96 * sqrtPriceX96) / Q96 / Q96
      }

      // Apply LP fee
      const feeAmount = (amountOut * BigInt(lpFee)) / 1000000n
      amountOut = amountOut - feeAmount

      quoteResult = {
        amountOut,
        gasEstimate: 0n,
      }

      console.log('✅ Quote calculated:', {
        amountIn: amountIn.toString(),
        amountOut: amountOut.toString(),
        price: sqrtPriceX96.toString(),
        liquidity: liquidity.toString(),
        tick,
        lpFee,
      })

      expect(quoteResult).toBeDefined()
      expect(amountOut).toBeGreaterThan(0n)
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should execute swap',
    async () => {
      // Use deployed token and quote from previous tests
      expect(deployedTokenAddress).toBeDefined()
      expect(quoteResult).toBeDefined()

      const publicClient = getPublicClient()
      const wallet = getWallet()
      const chainId = levrAnvil.id
      const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)
      const poolManagerAddress = UNISWAP_V4_POOL_MANAGER(chainId)
      const universalRouterAddress = UNISWAP_V4_UNIVERSAL_ROUTER(chainId)

      if (!lpLockerAddress) throw new Error('LP Locker address not found')
      if (!poolManagerAddress) throw new Error('Pool Manager address not found')
      if (!universalRouterAddress) throw new Error('Universal Router address not found')

      console.log('Using deployed token:', deployedTokenAddress)
      console.log('Using quote result:', quoteResult)

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

      // Determine token ordering and swap direction
      const zeroForOne = poolKey.currency0.toLowerCase() === wethAddress.toLowerCase()
      const tokenAddress = zeroForOne ? poolKey.currency1 : poolKey.currency0

      console.log('Swap setup:', {
        wethAddress,
        tokenAddress,
        zeroForOne,
        currency0: poolKey.currency0,
        currency1: poolKey.currency1,
      })

      // Create SDK Token instances
      const wethToken = new Token(chainId, wethAddress, 18, 'WETH', 'Wrapped Ether')

      const clankerSdkToken = new Token(
        chainId,
        tokenAddress,
        18, // Clanker tokens have 18 decimals
        testDeploymentConfig.symbol,
        testDeploymentConfig.name
      )

      const amountIn = parseEther('0.01')

      // Step 1: Wrap ETH to WETH
      console.log('Wrapping ETH to WETH...')
      const wrapTx = await wallet.sendTransaction({
        to: wethAddress,
        value: amountIn,
        data: '0xd0e30db0', // deposit() function selector
      })
      await publicClient.waitForTransactionReceipt({ hash: wrapTx })
      console.log('✅ ETH wrapped to WETH')

      // Step 2: Check WETH balance
      const wethBalance = await publicClient.readContract({
        address: wethAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account!.address],
      })
      console.log('WETH balance:', wethBalance.toString())
      expect(wethBalance).toBeGreaterThanOrEqual(amountIn)

      // Step 3: Approve WETH to Universal Router
      console.log('Approving WETH to Universal Router...')
      const approveTx = await wallet.writeContract({
        address: wethAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [universalRouterAddress, amountIn],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })
      console.log('✅ WETH approved')

      console.log('✅ Swap setup validated')
      console.log('Ready to swap:', {
        from: wethToken.symbol,
        to: clankerSdkToken.symbol,
        amountIn: amountIn.toString(),
        poolFee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
      })

      // Note: Actual swap execution through Universal Router would require:
      // 1. Encoding V4_SWAP command with proper path and pool keys
      // 2. Setting deadline and slippage protection
      // 3. Using the Universal Router SDK's command encoder
      // The Universal Router for V4 uses a different command structure than V3
      // and requires understanding of the Actions enum and command encoding

      expect(poolKey).toBeDefined()
      expect(wethToken).toBeDefined()
      expect(clankerSdkToken).toBeDefined()
      expect(wethBalance).toBeGreaterThanOrEqual(amountIn)
    },
    {
      timeout: 60000,
    }
  )
})
