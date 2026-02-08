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
 * Get proposals data from GraphQL indexer
 * meetsQuorum, meetsApproval, state are now indexed and updated on each vote
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

  const [indexedResult, winner, block] = await Promise.all([
    query(fields),
    publicClient.readContract({
      address: governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getWinner',
      args: [currentCycleId],
    }),
    publicClient.getBlock(),
  ])

  const indexedProposals = indexedResult.LevrProposal

  if (indexedProposals.length === 0) {
    return {
      proposals: [],
      cycleId: currentCycleId,
      winner,
    }
  }

  // Parse indexed proposals - no RPC calls needed for meetsQuorum/meetsApproval/state
  const parsedProposals: EnrichedProposalDetails[] = indexedProposals.map((p) => {
    const amountRaw = BigInt(p.amount ?? 0)
    const yesVotesRaw = BigInt(p.yesVotes ?? 0)
    const noVotesRaw = BigInt(p.noVotes ?? 0)

    const amountFormatted = formatUnits(amountRaw, tokenDecimals)
    const yesVotesFormatted = formatUnits(yesVotesRaw, tokenDecimals)
    const noVotesFormatted = formatUnits(noVotesRaw, tokenDecimals)
    const tokenPrice = pricing ? parseFloat(pricing.tokenUsd) : null

    const proposalIdNum = BigInt(p.id.split('-').pop() ?? '0')

    // Get user vote from indexed votes array
    const indexedUserVote = (p as any).votes?.[0]

    // Client-side state correction: the indexer only updates state on vote
    // events, so it can be stale (e.g. stuck on "Pending" if no votes were
    // ever cast, or "Active" after the voting window closed). Fully replicate
    // the contract's _state() logic using the on-chain block timestamp.
    const blockTs = Number(block.timestamp)
    const votingStart = Number(p.votingStartsAt)
    const votingEnd = Number(p.votingEndsAt)

    let computedState: number
    if (p.executed) {
      computedState = 4 // Executed (terminal)
    } else if (BigInt(p.cycleId) < currentCycleId) {
      computedState = 3 // Defeated (prior cycle = expired)
    } else if (blockTs < votingStart) {
      computedState = 0 // Pending
    } else if (blockTs <= votingEnd) {
      computedState = 1 // Active
    } else {
      // Post-voting: check quorum, approval, and winner
      if ((p.meetsQuorum ?? false) && (p.meetsApproval ?? false) && winner === proposalIdNum) {
        computedState = 2 // Succeeded
      } else {
        computedState = 3 // Defeated
      }
    }

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
      meetsQuorum: p.meetsQuorum ?? false,
      meetsApproval: p.meetsApproval ?? false,
      state: computedState,
      voteReceipt: indexedUserVote
        ? {
            hasVoted: true,
            support: indexedUserVote.support,
            votes: BigInt(indexedUserVote.votes ?? 0),
          }
        : undefined,
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

  const [indexedResult, block] = await Promise.all([query(fields), publicClient.getBlock()])

  const p = indexedResult.LevrProposal_by_pk
  if (!p) return null

  // Fetch winner + currentCycleId in parallel for state correction
  const cycleId = BigInt(p.cycleId)
  const [winner, currentCycleId] = await Promise.all([
    publicClient.readContract({
      address: governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getWinner',
      args: [cycleId],
    }),
    publicClient.readContract({
      address: governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'currentCycleId',
    }),
  ])

  const amountRaw = BigInt(p.amount ?? 0)
  const yesVotesRaw = BigInt(p.yesVotes ?? 0)
  const noVotesRaw = BigInt(p.noVotes ?? 0)

  const amountFormatted = formatUnits(amountRaw, tokenDecimals)
  const yesVotesFormatted = formatUnits(yesVotesRaw, tokenDecimals)
  const noVotesFormatted = formatUnits(noVotesRaw, tokenDecimals)
  const tokenPrice = pricing ? parseFloat(pricing.tokenUsd) : null

  const proposalIdNum = BigInt(p.id.split('-').pop() ?? '0')

  // Client-side state correction (same logic as proposals())
  const blockTs = Number(block.timestamp)
  const votingStart = Number(p.votingStartsAt)
  const votingEnd = Number(p.votingEndsAt)

  let computedState: number
  if (p.executed) {
    computedState = 4 // Executed (terminal)
  } else if (cycleId < currentCycleId) {
    computedState = 3 // Defeated (prior cycle = expired)
  } else if (blockTs < votingStart) {
    computedState = 0 // Pending
  } else if (blockTs <= votingEnd) {
    computedState = 1 // Active
  } else {
    // Post-voting: check quorum, approval, and winner
    if ((p.meetsQuorum ?? false) && (p.meetsApproval ?? false) && winner === proposalIdNum) {
      computedState = 2 // Succeeded
    } else {
      computedState = 3 // Defeated
    }
  }

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
    cycleId,
    meetsQuorum: p.meetsQuorum ?? false,
    meetsApproval: p.meetsApproval ?? false,
    state: computedState,
  }
}
