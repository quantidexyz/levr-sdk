import type { GraphQLQueryResult, GraphQLSubscriptionArgs } from '..'
import type { SubscriptionResult } from '../gen'

// ============================================================================
// Base Field Definitions
// ============================================================================

export const levrProjectFields = {
  __scalar: true,
  clankerToken: {
    __scalar: true,
  },
  // Stats are included via __scalar: true, but we explicitly list for clarity:
  // - verified, totalStaked, totalProposals, stakerCount
  // - currentCycleId, activeBoostProposals, activeTransferProposals
  // - createdAt, updatedAt
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
        order_by: [{ updatedAt: 'desc' as const }],
        ...(offset !== undefined && { offset }),
        ...(limit !== undefined && { limit }),
      },
      ...levrProjectFields,
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
