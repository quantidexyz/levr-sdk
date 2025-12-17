import { formatUnits } from 'viem'

import { LevrGovernor_v1 } from './abis'
import type { FormattedProposalDetails } from './governance'
import { query } from './graphql'
import {
  getLevrProposalByIdFields,
  getLevrProposalsWithVotesFields,
} from './graphql/fields/proposal'
import type { PopPublicClient, PricingResult } from './types'

export type ProposalsParams = {
  publicClient: PopPublicClient
  governorAddress: `0x${string}`
  projectId: string
  cycleId?: bigint
  tokenDecimals?: number
  pricing?: PricingResult
  pageSize?: number
  userAddress?: `0x${string}`
}

export type ProposalsResult = {
  proposals: EnrichedProposalDetails[]
  cycleId: bigint
  winner: bigint
}

export type EnrichedProposalDetails = FormattedProposalDetails & {
  meetsQuorum: boolean
  meetsApproval: boolean
  state: number
  voteReceipt?: {
    hasVoted: boolean
    support: boolean
    votes: bigint
  }
}

/**
 * Get proposals data from GraphQL indexer with live RPC data for state
 * meetsQuorum, meetsApproval, state, and winner are fetched from contract
 */
export async function proposals({
  publicClient,
  governorAddress,
  projectId,
  cycleId,
  tokenDecimals = 18,
  pricing,
  pageSize = 50,
  userAddress,
}: ProposalsParams): Promise<ProposalsResult> {
  if (!projectId) {
    throw new Error('projectId is required')
  }

  // Get current cycle ID if not provided
  const currentCycleId =
    cycleId ??
    (await publicClient.readContract({
      address: governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'currentCycleId',
    }))

  const fields = getLevrProposalsWithVotesFields({
    projectId,
    cycleId: currentCycleId !== undefined ? Number(currentCycleId) : undefined,
    userAddress,
    limit: pageSize,
  })

  const [indexedResult, winner] = await Promise.all([
    query(fields),
    publicClient.readContract({
      address: governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getWinner',
      args: [currentCycleId],
    }),
  ])

  const indexedProposals = indexedResult.LevrProposal

  if (indexedProposals.length === 0) {
    return {
      proposals: [],
      cycleId: currentCycleId,
      winner,
    }
  }

  // Extract proposal IDs and build multicall to fetch live state from RPC
  const proposalIds = indexedProposals.map((p) => BigInt(p.id.split('-').pop() ?? '0'))

  // Build multicall for getProposal (returns state, meetsQuorum, meetsApproval) and optionally getVoteReceipt
  const contracts = proposalIds.flatMap((proposalId) => {
    const base = [
      {
        address: governorAddress,
        abi: LevrGovernor_v1,
        functionName: 'getProposal' as const,
        args: [proposalId],
      },
    ]

    if (userAddress) {
      return [
        ...base,
        {
          address: governorAddress,
          abi: LevrGovernor_v1,
          functionName: 'getVoteReceipt' as const,
          args: [proposalId, userAddress],
        },
      ]
    }

    return base
  })

  const rpcResults = await publicClient.multicall({ contracts })

  // Parse results
  const contractsPerProposal = userAddress ? 2 : 1
  const parsedProposals: EnrichedProposalDetails[] = indexedProposals.map((p, i) => {
    const baseIndex = i * contractsPerProposal
    const rpcProposal = rpcResults[baseIndex].result as any
    const voteReceiptData = userAddress
      ? (rpcResults[baseIndex + 1].result as
          | { hasVoted: boolean; support: boolean; votes: bigint }
          | undefined)
      : undefined

    const amountRaw = BigInt(p.amount ?? 0)
    const yesVotesRaw = BigInt(p.yesVotes ?? 0)
    const noVotesRaw = BigInt(p.noVotes ?? 0)

    const amountFormatted = formatUnits(amountRaw, tokenDecimals)
    const yesVotesFormatted = formatUnits(yesVotesRaw, tokenDecimals)
    const noVotesFormatted = formatUnits(noVotesRaw, tokenDecimals)
    const tokenPrice = pricing ? parseFloat(pricing.tokenUsd) : null

    const proposalIdNum = BigInt(p.id.split('-').pop() ?? '0')

    // Get user vote from indexed votes array as fallback
    const indexedUserVote = (p as any).votes?.[0]

    return {
      id: proposalIdNum,
      proposalType: p.proposalType === 'BoostStakingPool' ? 0 : 1,
      proposer: p.proposer as `0x${string}`,
      token: p.token_id as `0x${string}`,
      amount: {
        raw: amountRaw,
        formatted: amountFormatted,
        usd: tokenPrice ? (parseFloat(amountFormatted) * tokenPrice).toString() : undefined,
      },
      recipient: (p.recipient ?? '') as `0x${string}`,
      description: p.description ?? '',
      createdAt: {
        timestamp: BigInt(p.createdAt),
        date: new Date(Number(p.createdAt) * 1000),
      },
      votingStartsAt: {
        timestamp: BigInt(p.votingStartsAt),
        date: new Date(Number(p.votingStartsAt) * 1000),
      },
      votingEndsAt: {
        timestamp: BigInt(p.votingEndsAt),
        date: new Date(Number(p.votingEndsAt) * 1000),
      },
      yesVotes: {
        raw: yesVotesRaw,
        formatted: yesVotesFormatted,
        usd: tokenPrice ? (parseFloat(yesVotesFormatted) * tokenPrice).toString() : undefined,
      },
      noVotes: {
        raw: noVotesRaw,
        formatted: noVotesFormatted,
        usd: tokenPrice ? (parseFloat(noVotesFormatted) * tokenPrice).toString() : undefined,
      },
      totalBalanceVoted: BigInt(p.totalBalanceVoted ?? 0),
      executed: p.executed,
      cycleId: BigInt(p.cycleId),
      // Live values from RPC
      meetsQuorum: rpcProposal?.meetsQuorum ?? false,
      meetsApproval: rpcProposal?.meetsApproval ?? false,
      state: rpcProposal?.state ?? 0,
      voteReceipt:
        voteReceiptData ??
        (indexedUserVote
          ? {
              hasVoted: true,
              support: indexedUserVote.support,
              votes: BigInt(indexedUserVote.votes ?? 0),
            }
          : undefined),
    }
  })

  return {
    proposals: parsedProposals,
    cycleId: currentCycleId,
    winner,
  }
}

export async function proposal(
  publicClient: PopPublicClient,
  governorAddress: `0x${string}`,
  projectId: string,
  proposalId: bigint,
  tokenDecimals: number = 18,
  pricing?: PricingResult
): Promise<EnrichedProposalDetails | null> {
  if (!proposalId) {
    throw new Error('proposalId is required')
  }

  // Construct composite ID for GraphQL query
  const compositeId = `${projectId.toLowerCase()}-${proposalId.toString()}`
  const fields = getLevrProposalByIdFields(compositeId)
  const [indexedResult, rpcResult] = await Promise.all([
    query(fields),
    publicClient.readContract({
      address: governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getProposal',
      args: [proposalId],
    }),
  ])

  const p = indexedResult.LevrProposal_by_pk
  if (!p) return null

  const rpcProposal = rpcResult as any

  const amountRaw = BigInt(p.amount ?? 0)
  const yesVotesRaw = BigInt(p.yesVotes ?? 0)
  const noVotesRaw = BigInt(p.noVotes ?? 0)

  const amountFormatted = formatUnits(amountRaw, tokenDecimals)
  const yesVotesFormatted = formatUnits(yesVotesRaw, tokenDecimals)
  const noVotesFormatted = formatUnits(noVotesRaw, tokenDecimals)
  const tokenPrice = pricing ? parseFloat(pricing.tokenUsd) : null

  const proposalIdNum = BigInt(p.id.split('-').pop() ?? '0')

  return {
    id: proposalIdNum,
    proposalType: p.proposalType === 'BoostStakingPool' ? 0 : 1,
    proposer: p.proposer as `0x${string}`,
    token: p.token_id as `0x${string}`,
    amount: {
      raw: amountRaw,
      formatted: amountFormatted,
      usd: tokenPrice ? (parseFloat(amountFormatted) * tokenPrice).toString() : undefined,
    },
    recipient: (p.recipient ?? '') as `0x${string}`,
    description: p.description ?? '',
    createdAt: {
      timestamp: BigInt(p.createdAt),
      date: new Date(Number(p.createdAt) * 1000),
    },
    votingStartsAt: {
      timestamp: BigInt(p.votingStartsAt),
      date: new Date(Number(p.votingStartsAt) * 1000),
    },
    votingEndsAt: {
      timestamp: BigInt(p.votingEndsAt),
      date: new Date(Number(p.votingEndsAt) * 1000),
    },
    yesVotes: {
      raw: yesVotesRaw,
      formatted: yesVotesFormatted,
      usd: tokenPrice ? (parseFloat(yesVotesFormatted) * tokenPrice).toString() : undefined,
    },
    noVotes: {
      raw: noVotesRaw,
      formatted: noVotesFormatted,
      usd: tokenPrice ? (parseFloat(noVotesFormatted) * tokenPrice).toString() : undefined,
    },
    totalBalanceVoted: BigInt(p.totalBalanceVoted ?? 0),
    executed: p.executed,
    cycleId: BigInt(p.cycleId),
    // Live values from RPC
    meetsQuorum: rpcProposal?.meetsQuorum ?? false,
    meetsApproval: rpcProposal?.meetsApproval ?? false,
    state: rpcProposal?.state ?? 0,
  }
}
