import type { GraphQLQueryArgs, GraphQLQueryResult, GraphQLSubscriptionArgs } from '..'
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
export type LevrProjectByIdQueryFields = LevrProjectByIdFields & GraphQLQueryArgs
export type LevrProjectByIdResult = GraphQLQueryResult<LevrProjectByIdQueryFields>

/**
 * Indexed project data returned from graphql query
 */
export type LevrProjectByIdData = {
  id: string
  chainId: string // BigInt as string
  treasury_id: string
  governor_id: string
  staking_id: string
  stakedToken_id: string
  verified: boolean
  totalStaked: string
  totalProposals: string
  streamWindowSeconds: string
  proposalWindowSeconds: string
  votingWindowSeconds: string
  maxActiveProposals: string
  quorumBps: string
  approvalBps: string
  minSTokenBpsToSubmit: string
  maxProposalAmountBps: string
  minimumQuorumBps: string
  createdAt: string
  updatedAt: string
  clankerToken: {
    id: string
    chainId: string
    address: string
    symbol: string | null
    name: string | null
    decimals: number | null
    totalSupply: string | null
    imageUrl: string | null
    metadata: string | null
    originalAdmin: string | null
    admin: string | null
    context: string | null
    createdAt: string
    updatedAt: string
  } | null
}
