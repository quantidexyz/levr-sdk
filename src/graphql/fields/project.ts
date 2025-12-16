import type { GraphQLSubscriptionArgs } from '..'
import type { SubscriptionResult } from '../gen'

// ============================================================================
// Base Field Definitions
// ============================================================================

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
        order_by: [{ updatedAt: 'desc' as const }],
        ...(offset !== undefined && { offset }),
        ...(limit !== undefined && { limit }),
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
