import { StateView } from './abis'
import { UNISWAP_V4_STATE_VIEW } from './constants'
import { getPoolId } from './pool-key'
import type { Project } from './project'
import type { BalanceResult, PoolKey, PopPublicClient } from './types'

export type PoolParams = {
  publicClient: PopPublicClient
  project: Project
}

export type PoolData = {
  poolKey: PoolKey
  sqrtPriceX96: bigint
  tick: number
  liquidity: BalanceResult
  protocolFee: number
  lpFee: number
  feeDisplay: string
}

// ========================================
// HELPER UTILS (for composition in larger multicalls)
// ========================================

/**
 * Helper: Get pool state contracts for multicall composition
 */
export function poolStateContracts(params: {
  stateViewAddress: `0x${string}`
  poolId: `0x${string}`
}) {
  return [
    {
      address: params.stateViewAddress,
      abi: StateView,
      functionName: 'getSlot0' as const,
      args: [params.poolId],
    },
    {
      address: params.stateViewAddress,
      abi: StateView,
      functionName: 'getLiquidity' as const,
      args: [params.poolId],
    },
  ]
}

// ========================================
// MAIN POOL DATA FUNCTION
// ========================================

/**
 * Get pool-specific data including liquidity, price, and fees
 * Uses StateView contract for efficient state queries
 */
export async function pool({ publicClient, project }: PoolParams): Promise<PoolData | null> {
  if (Object.values({ publicClient, project }).some((value) => !value)) {
    throw new Error('Invalid pool params')
  }

  if (!project.pool?.poolKey) return null

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const stateViewAddress = UNISWAP_V4_STATE_VIEW(chainId)
  if (!stateViewAddress) {
    throw new Error(`StateView address not found for chain ID ${chainId}`)
  }

  const poolKey = project.pool.poolKey
  const poolId = getPoolId(poolKey)

  // Use helper to get contracts and execute multicall
  const contracts = poolStateContracts({ stateViewAddress, poolId })
  const results = await publicClient.multicall({ contracts })

  const slot0Result = results[0].result as [bigint, number, number, number]
  const liquidityResult = results[1].result as bigint

  const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0Result
  const liquidity = liquidityResult

  // Determine fee display from project
  const feeDisplay = project.pool.feeDisplay

  return {
    poolKey,
    sqrtPriceX96,
    tick: Number(tick),
    liquidity: {
      raw: liquidity,
      formatted: liquidity.toString(),
    },
    protocolFee: Number(protocolFee),
    lpFee: Number(lpFee),
    feeDisplay,
  }
}
