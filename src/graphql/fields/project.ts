import type { GraphQLQueryResult, GraphQLSubscriptionArgs } from '..'
import type { SubscriptionResult } from '../gen'

// ============================================================================
// Base Field Definitions
// ============================================================================

/**
 * Minimal fields for project list/card views
 * Optimized to only fetch fields needed for ProjectCard component
 */
export const levrProjectListFields = {
  // Identity
  id: true,
  chainId: true,
  // Stats displayed in card
  verified: true,
  totalStaked: true,
  totalStakedUsd: true,
  tvlUsd: true,
  totalProposals: true,
  stakerCount: true,
  currentCycleId: true,
  activeBoostProposals: true,
  activeTransferProposals: true,
  // Token info for display
  clankerToken: {
    address: true,
    name: true,
    symbol: true,
    decimals: true,
    totalSupply: true,
    priceUsd: true,
    imageUrl: true,
    metadata: true,
  },
} as const satisfies GraphQLSubscriptionArgs['LevrProject']

/**
 * V4 Pool fields for token pool data
 */
export const v4PoolFields = {
  id: true,
  poolId: true,
  sqrtPriceX96: true,
  tick: true,
  liquidity: true,
  fee: true,
  tickSpacing: true,
  hooks: true,
  token0: {
    address: true,
    symbol: true,
    decimals: true,
  },
  token1: {
    address: true,
    symbol: true,
    decimals: true,
  },
} as const

/**
 * Full fields for detailed project views
 */
export const levrProjectFields = {
  __scalar: true,
  clankerToken: {
    __scalar: true,
    v4Pool: v4PoolFields,
  },
} as const satisfies GraphQLSubscriptionArgs['LevrProject']

// ============================================================================
// Query/Subscription Field Builders
// ============================================================================

export type ProjectSortField = 'stakerCount' | 'createdAt' | 'marketCap'
export type ProjectSortDirection = 'asc' | 'desc'

export type ProjectsQueryParams = {
  search?: string
  offset?: number
  limit?: number
  sortBy?: ProjectSortField
  sortDirection?: ProjectSortDirection
}

export const getLevrProjectsFields = ({
  search,
  offset,
  limit,
  sortBy = 'stakerCount',
  sortDirection = 'desc',
}: ProjectsQueryParams = {}) => {
  const searchFilter = search
    ? {
        _or: [
          { clankerToken: { name: { _ilike: `%${search}%` } } },
          { clankerToken: { symbol: { _ilike: `%${search}%` } } },
          { clankerToken: { address: { _ilike: `%${search}%` } } },
        ],
      }
    : undefined

  // Handle nested sorting for market cap (uses token priceUsd as proxy)
  // Use nulls_last to ensure 0/null marketcap values appear at the end
  const orderBy =
    sortBy === 'marketCap'
      ? [
          {
            clankerToken: {
              priceUsd:
                sortDirection === 'desc'
                  ? ('desc_nulls_last' as const)
                  : ('asc_nulls_last' as const),
            },
          },
        ]
      : [{ [sortBy]: sortDirection }]

  return {
    LevrProject: {
      __args: {
        ...(searchFilter && { where: searchFilter }),
        order_by: orderBy,
        ...(offset !== undefined && { offset }),
        ...(limit !== undefined && { limit }),
      },
      ...levrProjectListFields,
    },
  }
}

/**
 * Get fields for querying a single project by chainId and clanker token address
 * Uses composite ID format: ${chainId}-${tokenAddress}
 */
export const getLevrProjectByIdFields = (chainId: number, clankerTokenAddress: string) => {
  const compositeId = `${chainId}-${clankerTokenAddress.toLowerCase()}`
  return {
    LevrProject_by_pk: {
      __args: {
        id: compositeId,
      },
      ...levrProjectFields,
    },
  }
}

// ============================================================================
// Types
// ============================================================================

type LevrProjectsFields = ReturnType<typeof getLevrProjectsFields>
export type LevrProjectsResult = SubscriptionResult<LevrProjectsFields>
export type LevrProjectData = LevrProjectsResult['LevrProject'][number]

type LevrProjectByIdFields = ReturnType<typeof getLevrProjectByIdFields>
export type LevrProjectByIdQueryFields = LevrProjectByIdFields
export type LevrProjectByIdResult = GraphQLQueryResult<LevrProjectByIdQueryFields>

/**
 * Indexed project data returned from graphql query
 */
export type LevrProjectByIdData = LevrProjectByIdResult['LevrProject_by_pk']

// ============================================================================
// Adapted Types (for UI consumption)
// ============================================================================

/** Project stats for list/card views */
export type ProjectStats = {
  verified: boolean
  totalStaked: bigint
  totalStakedUsd: string | null
  tvlUsd: string | null
  totalProposals: bigint
  stakerCount: bigint
  currentCycleId: bigint
  activeBoostProposals: bigint
  activeTransferProposals: bigint
}

/** Token info for list/card views */
export type TokenInfo = {
  address: `0x${string}`
  decimals: number
  name: string
  symbol: string
  totalSupply: bigint
  priceUsd: string | null
  metadata: Record<string, unknown> | null
  imageUrl?: string
}

/** Project summary for list/card views */
export type ProjectListItem = {
  chainId: number
  token: TokenInfo
  stats: ProjectStats
}

/** Indexed V4 pool data from clankerToken.v4Pool */
export type IndexedPoolData = {
  poolId: string
  sqrtPriceX96: bigint
  tick: number
  liquidity: bigint
  fee: number
  tickSpacing: number
  hooks: `0x${string}`
  token0: { address: `0x${string}`; symbol: string; decimals: number }
  token1: { address: `0x${string}`; symbol: string; decimals: number }
}
