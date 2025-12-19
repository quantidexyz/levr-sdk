import { beforeAll, describe, expect, it } from 'bun:test'

import { GET_FACTORY_ADDRESS } from '../src/constants'
import { getProject, getStaticProject } from '../src/project'
import type { PopPublicClient } from '../src/types'
import { getWethUsdPrice } from '../src/usd-price'
import { getPublicClient } from './util'

// Helper function to get full project data (static + dynamic)
async function getFullProject(params: Parameters<typeof getStaticProject>[0]) {
  const staticProject = await getStaticProject(params)
  if (!staticProject?.isRegistered) return null
  return getProject({
    publicClient: params.publicClient,
    staticProject,
  })
}

/**
 * USD Price Tests
 *
 * These tests validate the USD pricing system:
 * - WETH/USD pricing using V3 quoter (simulates swap)
 * - Token/Paired pricing via V4 sqrtPriceX96 (spot price from pool state)
 *
 * Prerequisites:
 * 1. DRPC_API_KEY environment variable (recommended for better RPC limits)
 *
 * Architecture:
 * - WETH/USDC pricing: V3 quoter (tries multiple fee tiers)
 * - Token/WETH pricing: V4 sqrtPriceX96 from StateView (efficient single view call)
 * - Combined calculation: Token/USD = (Token/WETH) × (WETH/USD)
 */
describe('#USD_PRICE_TEST', () => {
  // ---
  // CONSTANTS

  // Pre-deployed token address on Base mainnet (already has pool and liquidity)
  const DEPLOYED_TOKEN_ADDRESS: `0x${string}` = '0x11B982C8c38B9d059b8D56050151E8f4C58CcB07'

  // ---
  // VARIABLES (shared across tests)

  let publicClient: PopPublicClient

  beforeAll(() => {
    // Use Base mainnet for USD pricing tests (WETH/USDC pool exists there)
    publicClient = getPublicClient(undefined, 8453)
  })

  it(
    'should get WETH/USD price using V3 quoter',
    async () => {
      // Skip test if no valid DRPC API key
      if (!process.env.DRPC_API_KEY || process.env.DRPC_API_KEY === 'test') {
        console.log('\n⚠️  Skipping test: DRPC_API_KEY not set or invalid')
        console.log('   Set a valid DRPC API key to test real Base mainnet pricing')
        return
      }

      console.log('\n=== WETH/USD PRICE VIA V3 QUOTER ===')

      const chainId = publicClient.chain?.id
      expect(chainId).toBe(8453) // Base mainnet

      console.log('Chain config:')
      console.log('  Chain ID:', chainId, '(Base mainnet)')

      // Get WETH/USD price
      console.log('\n💵 Fetching WETH/USD price via V3 quoter...')
      const { priceUsd, fee } = await getWethUsdPrice({ publicClient })

      const wethPrice = parseFloat(priceUsd)

      console.log('\n💰 WETH/USD Pricing:')
      console.log(`  Price: $${priceUsd}`)
      console.log(`  Fee tier: ${fee / 10000}%`)

      // Validate realistic WETH price (should be $2000-$6000)
      expect(wethPrice).toBeGreaterThan(2000)
      expect(wethPrice).toBeLessThan(6000)
      expect(Number.isFinite(wethPrice)).toBe(true)

      console.log('\n✅ Pricing validation passed:')
      console.log(`  ✓ WETH price is realistic: $${wethPrice.toFixed(2)}`)
      console.log('  ✓ Using V3 quoter')
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should get project with USD pricing',
    async () => {
      // Skip test if no valid DRPC API key
      if (!process.env.DRPC_API_KEY || process.env.DRPC_API_KEY === 'test') {
        console.log('\n⚠️  Skipping test: DRPC_API_KEY not set or invalid')
        console.log('   Set a valid DRPC API key to test real Base mainnet pricing')
        return
      }

      console.log('\n=== PROJECT WITH USD PRICING ===')
      console.log('Using token:', DEPLOYED_TOKEN_ADDRESS)

      const chainId = publicClient.chain?.id
      expect(chainId).toBe(8453) // Base mainnet

      const factoryAddress = GET_FACTORY_ADDRESS(chainId)
      if (!factoryAddress) throw new Error('Factory address not found')

      // Fetch project data (pricing is now automatic)
      console.log('\n💵 Fetching project with USD pricing...')
      const projectData = await getFullProject({
        publicClient,
        clankerToken: DEPLOYED_TOKEN_ADDRESS,
      })

      expect(projectData).toBeDefined()

      console.log('\n✅ Project data fetched:')
      console.log('  Token:', projectData?.token.symbol)
      console.log('  Pool fee:', projectData?.pool?.feeDisplay ?? 'N/A')
      console.log('  Pool exists:', !!projectData?.pool)
      console.log('  Pricing included:', !!projectData?.pricing)

      const hasPool = !!projectData?.pool

      if (hasPool) {
        expect(projectData?.pricing).toBeDefined()

        console.log('\n💰 USD Pricing:')
        console.log(`  WETH/USD: $${projectData!.pricing!.pairedTokenUsd}`)
        console.log(`  Token/USD: $${projectData!.pricing!.tokenUsd}`)

        // Validate pricing
        const wethPrice = parseFloat(projectData!.pricing!.pairedTokenUsd)
        const tokenPrice = parseFloat(projectData!.pricing!.tokenUsd)

        // Validate realistic WETH price (should be $2000-$6000)
        expect(wethPrice).toBeGreaterThan(2000)
        expect(wethPrice).toBeLessThan(6000)
        expect(Number.isFinite(wethPrice)).toBe(true)
        expect(tokenPrice).toBeGreaterThan(0)
        expect(Number.isFinite(tokenPrice)).toBe(true)

        console.log('\n✅ Pricing validation passed:')
        console.log(`  ✓ WETH price is realistic: $${wethPrice.toFixed(2)}`)
        console.log(`  ✓ Token price calculated: $${tokenPrice.toFixed(6)}`)
      } else {
        console.log('\n⚠️  No pool deployed for this token - pricing unavailable')
        console.log('  This is expected - pricing requires a Uniswap V4 pool')
      }
    },
    {
      timeout: 60000,
    }
  )
})
