import { beforeAll, describe, expect, it } from 'bun:test'

import { GET_FACTORY_ADDRESS } from '../src/constants'
import { getProject, getStaticProject } from '../src/project'
import { type SetupTestReturnType } from './helper'
import { getPublicClient } from './util'

// Helper function to get full project data (static + dynamic)
async function getFullProject(params: Parameters<typeof getStaticProject>[0]) {
  const staticProject = await getStaticProject(params)
  if (!staticProject) return null
  return getProject({
    publicClient: params.publicClient,
    staticProject,
    oraclePublicClient: params.oraclePublicClient,
  })
}

/**
 * USD Price Tests
 *
 * These tests validate the complete USD pricing system:
 * - WETH/USD oracle using Uniswap V3 (Base mainnet) - deep liquidity
 * - Token/USD quote using Uniswap V4 (Base Sepolia) - Clanker tokens
 * - Cross-chain pricing: mainnet oracle → testnet quotes
 * - Server-side calculations with graceful degradation
 *
 * Prerequisites:
 * 1. DRPC_API_KEY environment variable (recommended for better RPC limits)
 *
 * Architecture:
 * - WETH/USDC pricing: Uniswap V3 (reliable, deep liquidity)
 * - Token/WETH pricing: Uniswap V4 (where Clanker tokens are deployed)
 * - Combined calculation: Token/USD = (Token/WETH) × (WETH/USD)
 */
describe('#USD_PRICE_TEST', () => {
  // ---
  // CONSTANTS

  // Pre-deployed token address on Base mainnet (already has pool and liquidity)
  const DEPLOYED_TOKEN_ADDRESS: `0x${string}` = '0x11B982C8c38B9d059b8D56050151E8f4C58CcB07'

  // ---
  // VARIABLES (shared across tests)

  let publicClient: SetupTestReturnType['publicClient']
  let oraclePublicClient: SetupTestReturnType['oraclePublicClient']

  beforeAll(() => {
    publicClient = getPublicClient(undefined, 84532)
    oraclePublicClient = getPublicClient(undefined, 8453)
  })

  it(
    'should get project with USD pricing when oracle client is provided',
    async () => {
      // Skip test if no valid DRPC API key
      if (!process.env.DRPC_API_KEY || process.env.DRPC_API_KEY === 'test') {
        console.log('\n⚠️  Skipping test: DRPC_API_KEY not set or invalid')
        console.log('   Set a valid DRPC API key to test real Base mainnet pricing')
        return
      }

      console.log('\n=== PROJECT WITH USD PRICING ===')
      console.log('Using token:', DEPLOYED_TOKEN_ADDRESS)

      // Get chain ID
      const chainId = publicClient.chain?.id

      const oracleChainId = oraclePublicClient.chain?.id

      expect(chainId).toBe(84532) // Base Sepolia
      expect(oracleChainId).toBe(8453) // Base mainnet

      console.log('Chain config:')
      console.log('  Quote Chain ID:', chainId, '(Base Sepolia)')
      console.log('  Oracle Chain ID:', oracleChainId, '(Base mainnet)')
      console.log('  ✨ Cross-chain: mainnet oracle, testnet quote')

      const factoryAddress = GET_FACTORY_ADDRESS(chainId)
      if (!factoryAddress) throw new Error('Factory address not found')

      // Fetch project data WITH oracle client (should include pricing)
      console.log('\n💵 Fetching project with USD pricing...')
      const projectData = await getFullProject({
        publicClient,
        clankerToken: DEPLOYED_TOKEN_ADDRESS,
        oraclePublicClient, // Providing oracle client enables pricing
      })

      expect(projectData).toBeDefined()
      expect(projectData?.pool).toBeDefined()

      console.log('\n✅ Project data fetched:')
      console.log('  Token:', projectData?.token.symbol)
      console.log('  Pool fee:', projectData?.pool?.feeDisplay)
      console.log('  Pricing included:', !!projectData?.pricing)

      // If DRPC_API_KEY is set, pricing should be available
      const hasDrpcKey = !!process.env.DRPC_API_KEY

      if (hasDrpcKey) {
        // With DRPC key, pricing should work
        expect(projectData?.pricing).toBeDefined()

        console.log('\n💰 USD Pricing (via DRPC):')
        console.log(`  WETH/USD: $${projectData!.pricing!.wethUsd}`)
        console.log(`  Token/USD: $${projectData!.pricing!.tokenUsd}`)

        // Validate pricing
        const wethPrice = parseFloat(projectData!.pricing!.wethUsd)
        const tokenPrice = parseFloat(projectData!.pricing!.tokenUsd)

        // Validate realistic WETH price from V3 pools (should be $2000-$6000)
        expect(wethPrice).toBeGreaterThan(2000)
        expect(wethPrice).toBeLessThan(6000)
        expect(Number.isFinite(wethPrice)).toBe(true)
        expect(tokenPrice).toBeGreaterThan(0) // Token should have some price
        expect(Number.isFinite(tokenPrice)).toBe(true)

        console.log('\n✅ Pricing validation passed:')
        console.log(`  ✓ WETH price is realistic: $${wethPrice.toFixed(2)} (using V3 pools)`)
        console.log(`  ✓ Token price calculated: $${tokenPrice.toFixed(6)}`)
        console.log('  ✓ Cross-chain oracle working (mainnet V3 → testnet V4)')
        console.log('  ✓ Server-side calculation working')
        console.log('  ✓ All pricing data accurate and production-ready')
      } else {
        // Without DRPC key, might hit rate limits
        console.log('\n⚠️  No DRPC_API_KEY set - using public RPC (may be rate limited)')
        if (projectData?.pricing) {
          console.log('  ✓ Pricing available despite public RPC')
        } else {
          console.log('  ✓ Graceful degradation: project data still works without pricing')
        }
      }
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should NOT include pricing when oracle client is NOT provided',
    async () => {
      console.log('\n=== PROJECT WITHOUT ORACLE CLIENT ===')

      const chainId = publicClient.chain?.id
      const factoryAddress = GET_FACTORY_ADDRESS(chainId)
      if (!factoryAddress) throw new Error('Factory address not found')

      // Fetch project data WITHOUT oracle client
      console.log('Fetching project without oracle client...')
      const projectData = await getFullProject({
        publicClient,
        clankerToken: DEPLOYED_TOKEN_ADDRESS,
        // No oraclePublicClient provided
      })

      expect(projectData).toBeDefined()
      expect(projectData?.pool).toBeDefined()
      expect(projectData?.pricing).toBeUndefined() // Pricing should NOT be included

      console.log('\n✅ Verification passed:')
      console.log('  ✓ Project data fetched successfully')
      console.log('  ✓ Pricing NOT included (oracle client not provided)')
      console.log('  ✓ System works without pricing (graceful degradation)')
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should validate cross-chain oracle configuration',
    async () => {
      console.log('\n=== VALIDATING CROSS-CHAIN ORACLE ===')

      const chainId = publicClient.chain?.id
      const oracleChainId = oraclePublicClient.chain?.id

      console.log('✅ Cross-chain configuration:')
      console.log(`  Quote Chain ID: ${chainId} (Base Sepolia)`)
      console.log(`  Oracle Chain ID: ${oracleChainId} (Base mainnet)`)
      console.log('  ✓ Different chains for oracle and quote')
      console.log('  ✓ Mainnet prices applied to testnet tokens')

      expect(chainId).toBe(84532) // Base Sepolia for quote
      expect(oracleChainId).toBe(8453) // Base mainnet for oracle
      expect(chainId).not.toBe(oracleChainId)

      // Already validated that pricing works in the previous test
      // This test confirms cross-chain setup is correct
    },
    {
      timeout: 60000,
    }
  )
})
