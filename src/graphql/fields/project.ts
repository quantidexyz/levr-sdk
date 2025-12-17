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
    imageUrl: true,
    metadata: true,
  },
} as const satisfies GraphQLSubscriptionArgs['LevrProject']

/**
 * Full fields for detailed project views
 */
export const levrProjectFields = {
  __scalar: true,
  clankerToken: {
    __scalar: true,
  },
} as const satisfies GraphQLSubscriptionArgs['LevrProject']

// ============================================================================
// Query/Subscription Field Builders
// ============================================================================

export type ProjectsQueryParams = {
  search?: string
  offset?: number
  limit?: number
}

export const getLevrProjectsFields = ({ search, offset, limit }: ProjectsQueryParams = {}) => {
  const searchFilter = search
    ? {
        _or: [
          { clankerToken: { name: { _ilike: `%${search}%` } } },
          { clankerToken: { symbol: { _ilike: `%${search}%` } } },
          { clankerToken: { address: { _ilike: `%${search}%` } } },
        ],
      }
    : undefined

  return {
    LevrProject: {
      __args: {
        ...(searchFilter && { where: searchFilter }),
        order_by: [{ stakerCount: 'desc' as const }],
        ...(offset !== undefined && { offset }),
        ...(limit !== undefined && { limit }),
      },
      ...levrProjectListFields,
    },
  }
}

/**
 * Get fields for querying a single project by clanker token address
 */
export const getLevrProjectByIdFields = (clankerTokenAddress: string) => {
  return {
    LevrProject_by_pk: {
      __args: {
        id: clankerTokenAddress.toLowerCase(),
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
  metadata: Record<string, unknown> | null
  imageUrl?: string
}

/** Project summary for list/card views */
export type ProjectListItem = {
  chainId: number
  token: TokenInfo
  stats: ProjectStats
}
