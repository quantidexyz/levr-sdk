import type { PublicClient } from 'viem'
import { encodeAbiParameters, keccak256, zeroAddress } from 'viem'

import { StateView } from './abis'
import { UNISWAP_V4_STATE_VIEW } from './constants'
import type { PoolKey } from './types'

/**
 * @description Sort two token addresses for pool key (currency0 < currency1)
 */
export const sortTokens = (
  tokenA: `0x${string}`,
  tokenB: `0x${string}`
): [`0x${string}`, `0x${string}`] => {
  return tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA]
}

/**
 * @description Default pool configuration
 * 0.3% fee tier is the most common on Uniswap
 */
export const DEFAULT_POOL_CONFIG = {
  fee: 3000, // 0.3% fee tier (most common)
  tickSpacing: 60, // Corresponds to 0.3% fee tier
  hooks: zeroAddress, // No hooks by default
} as const

/**
 * @description Create a pool key for two tokens
 * @param token0 First token address
 * @param token1 Second token address
 * @param fee Fee tier (in hundredths of a bip, e.g. 3000 = 0.3%). Defaults to 3000 (0.3%)
 * @param tickSpacing Tick spacing. Defaults to 60 (for 0.3% fee tier)
 * @param hooks Hooks address. Defaults to zero address (no hooks)
 * @returns Properly sorted PoolKey
 */
export const createPoolKey = (
  token0: `0x${string}`,
  token1: `0x${string}`,
  fee: number = DEFAULT_POOL_CONFIG.fee,
  tickSpacing: number = DEFAULT_POOL_CONFIG.tickSpacing,
  hooks: `0x${string}` = DEFAULT_POOL_CONFIG.hooks
): PoolKey => {
  const [currency0, currency1] = sortTokens(token0, token1)
  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  }
}

/**
 * @description Calculate pool ID from pool key (keccak256 of abi.encode(PoolKey))
 * @param poolKey Pool key
 * @returns Pool ID as bytes32
 */
export const getPoolId = (poolKey: PoolKey): `0x${string}` => {
  return keccak256(
    encodeAbiParameters(
      [
        {
          type: 'tuple',
          components: [
            { name: 'currency0', type: 'address' },
            { name: 'currency1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'hooks', type: 'address' },
          ],
        },
      ],
      [poolKey]
    )
  )
}

/**
 * @description Common fee tiers and their corresponding tick spacings
 * Ordered by preference: 0.3% is most common for major pairs, then 0.05%, then 1%
 * From Uniswap V4 documentation
 */
export const COMMON_FEE_TIERS = [
  { fee: 3000, tickSpacing: 60 }, // 0.3% - Most common for major pairs like WETH/USDC
  { fee: 500, tickSpacing: 10 }, // 0.05%
  { fee: 10000, tickSpacing: 200 }, // 1%
] as const

/**
 * @description Parameters for discovering a pool
 */
export type DiscoverPoolParams = {
  publicClient: PublicClient
  token0: `0x${string}`
  token1: `0x${string}`
  hooks?: `0x${string}`
  feeTiers?: readonly { fee: number; tickSpacing: number }[]
}

/**
 * @description Return type for pool discovery
 */
export type DiscoverPoolReturnType = {
  poolKey: PoolKey
  sqrtPriceX96: bigint
  liquidity: bigint
  tick: number
} | null

/**
 * @description Discover an existing pool by trying common fee tiers
 * @param params Discovery parameters
 * @returns Pool data if found, null otherwise
 *
 * @remarks
 * This function tries to find an initialized pool by:
 * 1. Trying common fee tiers (0.05%, 0.3%, 1%)
 * 2. Querying StateView contract to check if pool exists and has liquidity
 * 3. Returning the first valid pool found
 *
 * Uses Uniswap V4's StateView contract to fetch pool state:
 * - getSlot0(): sqrtPriceX96, tick, protocol/LP fees
 * - getLiquidity(): pool liquidity
 *
 * @example
 * ```typescript
 * const pool = await discoverPool({
 *   publicClient,
 *   token0: WETH_ADDRESS,
 *   token1: USDC_ADDRESS,
 * })
 * if (pool) {
 *   console.log('Found pool:', pool.poolKey)
 *   console.log('Liquidity:', pool.liquidity)
 * }
 * ```
 */
export const discoverPool = async ({
  publicClient,
  token0,
  token1,
  hooks = zeroAddress,
  feeTiers = COMMON_FEE_TIERS,
}: DiscoverPoolParams): Promise<DiscoverPoolReturnType> => {
  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const stateViewAddress = UNISWAP_V4_STATE_VIEW(chainId)
  if (!stateViewAddress) {
    throw new Error(`StateView address not found for chain ID ${chainId}`)
  }

  // Check ALL fee tiers and select the most liquid pool
  let bestPool: DiscoverPoolReturnType = null
  let maxLiquidity = 0n

  for (const { fee, tickSpacing } of feeTiers) {
    try {
      const poolKey = createPoolKey(token0, token1, fee, tickSpacing, hooks)
      const poolId = getPoolId(poolKey)

      // Query pool state from StateView contract
      const [slot0Result, liquidityResult] = await Promise.all([
        publicClient.readContract({
          address: stateViewAddress,
          abi: StateView,
          functionName: 'getSlot0',
          args: [poolId],
        }),
        publicClient.readContract({
          address: stateViewAddress,
          abi: StateView,
          functionName: 'getLiquidity',
          args: [poolId],
        }),
      ])

      const [sqrtPriceX96, tick] = slot0Result
      const liquidity = liquidityResult

      // In V4, getLiquidity() returns current tick liquidity which can be 0
      // even if pool has liquidity in other ticks. Check if pool is initialized by sqrtPrice
      const poolInitialized = sqrtPriceX96 > 0n

      if (poolInitialized) {
        poolCandidates.push({ fee, liquidity })

        // For WETH/USDC, prefer pools with actual liquidity in current tick
        // Only use 0.3% preference if it has liquidity, otherwise select by liquidity
        const hasCurrentTickLiquidity = liquidity > 0n

        if (hasCurrentTickLiquidity && liquidity > maxLiquidity) {
          maxLiquidity = liquidity
          bestPool = {
            poolKey,
            sqrtPriceX96,
            liquidity,
            tick: Number(tick),
          }
        } else if (!hasCurrentTickLiquidity && !bestPool) {
          // Fallback: if no pools with liquidity yet, take any initialized pool
          bestPool = {
            poolKey,
            sqrtPriceX96,
            liquidity,
            tick: Number(tick),
          }
        }
      }
    } catch (error) {
      // Pool doesn't exist or error querying, try next fee tier
      continue
    }
  }

  return bestPool
}

/**
 * @description Find a liquid pool by discovering pools with liquidity
 * @param params Discovery parameters
 * @returns Pool key if found, null otherwise
 *
 * @remarks
 * This is a convenience wrapper around discoverPool that returns just the pool key.
 * It uses the StateView contract to find pools with actual liquidity.
 *
 * @example
 * ```typescript
 * const poolKey = await findLiquidPool({
 *   publicClient,
 *   token0: WETH_ADDRESS,
 *   token1: USDC_ADDRESS,
 * })
 * if (poolKey) {
 *   console.log('Found pool with fee tier:', poolKey.fee)
 * }
 * ```
 */
export type FindLiquidPoolParams = DiscoverPoolParams

export const findLiquidPool = async (params: FindLiquidPoolParams): Promise<PoolKey | null> => {
  const pool = await discoverPool(params)
  return pool?.poolKey ?? null
}
