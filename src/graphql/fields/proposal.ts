import type { GraphQLQueryResult, GraphQLSubscriptionArgs } from '..'
import type { SubscriptionResult } from '../gen'

// ============================================================================
// Base Field Definitions
// ============================================================================

export const levrProposalFields = {
  __scalar: true,
  project: {
    __scalar: true,
    clankerToken: {
      __scalar: true,
    },
  },
  token: {
    __scalar: true,
  },
} as const satisfies GraphQLSubscriptionArgs['LevrProposal']

export const levrVoteFields = {
  __scalar: true,
} as const satisfies GraphQLSubscriptionArgs['LevrVote']

// ============================================================================
// Query/Subscription Field Builders
// ============================================================================

export type ProposalsQueryParams = {
  projectId: string
  cycleId?: number
  offset?: number
  limit?: number
}

export const getLevrProposalsFields = ({
  projectId,
  cycleId,
  offset,
  limit,
}: ProposalsQueryParams) => {
  return {
    LevrProposal: {
      __args: {
        where: {
          project_id: { _eq: projectId.toLowerCase() },
          ...(cycleId !== undefined && { cycleId: { _eq: cycleId } }),
        },
        order_by: [{ createdAt: 'desc' as const }],
        ...(offset !== undefined && { offset }),
        ...(limit !== undefined && { limit }),
      },
      ...levrProposalFields,
    },
  }
}

/**
 * Get fields for querying a single proposal by ID
 */
export const getLevrProposalByIdFields = (proposalId: string) => {
  return {
    LevrProposal_by_pk: {
      __args: {
        id: proposalId.toLowerCase(),
      },
      ...levrProposalFields,
    },
  }
}

/**
 * Get fields for querying proposals with user votes
 */
export type ProposalsWithVotesQueryParams = {
  projectId: string
  cycleId?: number
  userAddress?: string
  offset?: number
  limit?: number
}

export const getLevrProposalsWithVotesFields = ({
  projectId,
  cycleId,
  userAddress,
  offset,
  limit,
}: ProposalsWithVotesQueryParams) => {
  return {
    LevrProposal: {
      __args: {
        where: {
          project_id: { _eq: projectId.toLowerCase() },
          ...(cycleId !== undefined && { cycleId: { _eq: cycleId } }),
        },
        order_by: [{ createdAt: 'desc' as const }],
        ...(offset !== undefined && { offset }),
        ...(limit !== undefined && { limit }),
      },
      ...levrProposalFields,
      ...(userAddress && {
        votes: {
          __args: {
            where: { voter: { _eq: userAddress.toLowerCase() } },
          },
          ...levrVoteFields,
        },
      }),
    },
  }
}

/**
 * Get fields for querying user votes on specific proposals
 */
export type UserVotesQueryParams = {
  userAddress: string
  proposalIds: string[]
}

export const getLevrVotesFields = ({ userAddress, proposalIds }: UserVotesQueryParams) => {
  return {
    LevrVote: {
      __args: {
        where: {
          voter: { _eq: userAddress.toLowerCase() },
          proposal_id: { _in: proposalIds.map((id) => id.toLowerCase()) },
        },
      },
      ...levrVoteFields,
    },
  }
}

// ============================================================================
// Types
// ============================================================================

type LevrProposalsFields = ReturnType<typeof getLevrProposalsFields>
export type LevrProposalsResult = SubscriptionResult<LevrProposalsFields>
export type LevrProposalData = LevrProposalsResult['LevrProposal'][number]

type LevrProposalByIdFields = ReturnType<typeof getLevrProposalByIdFields>
export type LevrProposalByIdQueryFields = LevrProposalByIdFields
export type LevrProposalByIdResult = GraphQLQueryResult<LevrProposalByIdQueryFields>
export type LevrProposalByIdData = LevrProposalByIdResult['LevrProposal_by_pk']

type LevrProposalsWithVotesFields = ReturnType<typeof getLevrProposalsWithVotesFields>
export type LevrProposalsWithVotesResult = SubscriptionResult<LevrProposalsWithVotesFields>
export type LevrProposalWithVotesData = LevrProposalsWithVotesResult['LevrProposal'][number]

type LevrVotesFields = ReturnType<typeof getLevrVotesFields>
export type LevrVotesResult = GraphQLQueryResult<LevrVotesFields>
export type LevrVoteData = LevrVotesResult['LevrVote'][number]
