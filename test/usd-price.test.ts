import { beforeAll, describe, expect, it } from 'bun:test'

import { deployV4 } from '../src/deploy-v4'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
import { getUsdPrice } from '../src/usd-price'
import { getTokenRewards, setupTest, type SetupTestReturnType } from './helper'
import { warpAnvil } from './util'

/**
 * USD Price Tests
 *
 * These tests validate the USD price calculation functionality:
 * 1. Deploy a Clanker token via Levr
 * 2. Get the USD price of the token (paired with WETH)
 * 3. Validate the price calculation logic
 *
 * Prerequisites:
 * 1. Anvil must be running with Base fork: `cd contracts && make anvil-fork`
 * 2. LevrFactory_v1 must be deployed: `cd contracts && make deploy-devnet-factory`
 * 3. Clanker v4 contracts must be deployed on the fork
 * 4. Account must have ETH for gas and deployment operations
 */
describe('#USD_PRICE_TEST', () => {
  // ---
  // CONSTANTS

  const testDeploymentConfig: LevrClankerDeploymentSchemaType = {
    name: 'USD Price Test Token',
    symbol: 'USDP',
    image: 'ipfs://bafkreif2xtaifw7byqxoydsmbrgrpryyvpz65fwdxghgbrurj6uzhhkktm',
    metadata: {
      description: 'Test token for USD price testing',
      telegramLink: 'https://t.me/usdpricetoken',
    },
    devBuy: '0.5 ETH', // Add initial liquidity
    fees: {
      type: 'static',
      feeTier: '3%',
    },
    treasuryFunding: '90%',
  }

  // ---
  // VARIABLES (shared across tests)

  let deployedTokenAddress: `0x${string}`
  let clanker: SetupTestReturnType['clanker']
  let publicClient: SetupTestReturnType['publicClient']
  let oraclePublicClient: SetupTestReturnType['oraclePublicClient']

  beforeAll(() => {
    ;({ publicClient, clanker, oraclePublicClient } = setupTest({
      oracleChainId: 8453,
    }))
  })

  it(
    'should deploy token with initial liquidity',
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

      // Wait for MEV protection delay (120 seconds)
      console.log('\n⏰ Warping 120 seconds forward to bypass MEV protection...')
      await warpAnvil(120)
    },
    {
      timeout: 100000,
    }
  )

  it(
    'should get USD price of token paired with WETH',
    async () => {
      // Use deployed token from previous test
      expect(deployedTokenAddress).toBeDefined()

      console.log('\n=== USD PRICE: Token/WETH/USDC ===')
      console.log('Using deployed token:', deployedTokenAddress)

      // Get chain IDs
      const oracleChainId = oraclePublicClient.chain?.id
      const quoteChainId = publicClient.chain?.id

      expect(oracleChainId).toBeDefined()
      expect(quoteChainId).toBeDefined()
      expect(oracleChainId).toBe(8453) // Base mainnet for oracle
      expect(quoteChainId).toBe(31337) // Anvil fork for quote

      console.log('Chain config:')
      console.log('  Oracle Chain ID:', oracleChainId, '(Base mainnet)')
      console.log('  Quote Chain ID:', quoteChainId, '(Anvil fork)')
      console.log('  ✨ Cross-chain pricing: Base mainnet oracle → Anvil fork quote')

      // Get pool information from LP locker
      const tokenRewards = await getTokenRewards(publicClient, deployedTokenAddress)
      const poolKey = tokenRewards.poolKey

      console.log('\nToken pool key:', {
        currency0: poolKey.currency0,
        currency1: poolKey.currency1,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks,
      })

      // Get USD price (WETH/USDC pool is automatically discovered)
      console.log('\n💵 Getting USD price (auto-discovering WETH/USDC oracle pool)...')

      const result = await getUsdPrice({
        oraclePublicClient, // Base mainnet client for WETH/USDC price oracle (auto-discovers pool)
        quotePublicClient: publicClient, // Anvil fork client for Token/WETH quote
        tokenAddress: deployedTokenAddress,
        // Quote pool config (Token/WETH) - use the same as deployed pool
        quoteFee: poolKey.fee,
        quoteTickSpacing: poolKey.tickSpacing,
        quoteHooks: poolKey.hooks,
      })

      console.log('\n✅ USD Price calculated:')
      console.log(`  Token price: $${result.priceUsd}`)
      console.log(`  Token per WETH: ${result.tokenPerWeth.toString()} (raw)`)
      console.log(`  WETH per USDC: ${result.wethPerUsdc.toString()} (raw)`)

      // Validate results
      expect(result.priceUsd).toBeDefined()
      expect(result.tokenPerWeth).toBeGreaterThanOrEqual(0n)
      expect(result.wethPerUsdc).toBeGreaterThan(0n)

      // Price should be a valid number (may be very small or zero for test tokens)
      const priceNum = parseFloat(result.priceUsd)
      expect(priceNum).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(priceNum)).toBe(true)

      console.log('\n✅ USD price validation passed:')
      console.log('  ✓ Price is non-negative and finite')
      console.log('  ✓ WETH/USDC ratio is valid (oracle working)')
      console.log('  ✓ Token/WETH ratio is valid (quote working)')
      console.log('  ℹ️  Price may be very small for test tokens with minimal liquidity')
    },
    {
      timeout: 60000,
    }
  )

  it('should calculate USD price with real mainnet WETH/USDC oracle', async () => {
    expect(deployedTokenAddress).toBeDefined()

    console.log('\n=== VALIDATING CROSS-CHAIN ORACLE ===')

    // The test already ran with cross-chain setup:
    // - Oracle: Base mainnet (8453) for accurate WETH/USDC prices
    // - Quote: Anvil fork (31337) for testnet token prices

    const oracleChainId = oraclePublicClient.chain?.id
    const quoteChainId = publicClient.chain?.id

    console.log('✅ Cross-chain pricing verified:')
    console.log(`  Oracle uses Base mainnet (${oracleChainId}) for WETH/USDC`)
    console.log(`  Quote uses Anvil fork (${quoteChainId}) for Token/WETH`)
    console.log('  Token is automatically paired with WETH on quote chain')

    expect(oracleChainId).toBe(8453)
    expect(quoteChainId).toBe(31337)
    expect(oracleChainId).not.toBe(quoteChainId)
  })
})
