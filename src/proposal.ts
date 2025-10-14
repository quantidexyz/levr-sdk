import { formatUnits } from 'viem'

import { LevrGovernor_v1 } from './abis'
import type { FormattedProposalDetails } from './governance'
import type { PopPublicClient, PricingResult } from './types'

export type ProposalsParams = {
  publicClient: PopPublicClient
  governorAddress: `0x${string}`
  cycleId?: bigint // Optional: defaults to current cycle
  tokenDecimals?: number
  pricing?: PricingResult
  pageSize?: number
  userAddress?: `0x${string}` // Optional: include vote receipts if provided
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
    support: boolean // true = yes, false = no
    votes: bigint
  }
}

/**
 * Get call data contracts for a single proposal
 * Returns 1-2 contract configs: getProposal (includes state, meetsQuorum, meetsApproval), [getVoteReceipt]
 */
export function proposalCallData(
  governorAddress: `0x${string}`,
  proposalId: bigint,
  userAddress?: `0x${string}`
) {
  const baseContracts = [
    {
      address: governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getProposal' as const,
      args: [proposalId],
    },
  ]

  // Add vote receipt if userAddress is provided
  if (userAddress) {
    return [
      ...baseContracts,
      {
        address: governorAddress,
        abi: LevrGovernor_v1,
        functionName: 'getVoteReceipt' as const,
        args: [proposalId, userAddress],
      },
    ]
  }

  return baseContracts
}

/**
 * Parse proposal data from multicall results
 * Expects 1-2 results: [getProposal (includes state, meetsQuorum, meetsApproval), [getVoteReceipt]]
 */
export function parseProposalData(
  results: readonly any[],
  tokenDecimals: number,
  pricing?: PricingResult
): EnrichedProposalDetails {
  const proposalData = results[0] as any
  // State, meetsQuorum, and meetsApproval are now included in the proposal data
  const state = proposalData.state as number
  const meetsQuorum = proposalData.meetsQuorum as boolean
  const meetsApproval = proposalData.meetsApproval as boolean
  const voteReceiptData = results[1] as
    | { hasVoted: boolean; support: boolean; votes: bigint }
    | undefined

  const amountFormatted = formatUnits(proposalData.amount, tokenDecimals)
  const yesVotesFormatted = formatUnits(proposalData.yesVotes, tokenDecimals)
  const noVotesFormatted = formatUnits(proposalData.noVotes, tokenDecimals)
  const tokenPrice = pricing ? parseFloat(pricing.tokenUsd) : null

  return {
    id: proposalData.id,
    proposalType: proposalData.proposalType,
    proposer: proposalData.proposer,
    amount: {
      raw: proposalData.amount,
      formatted: amountFormatted,
      usd: tokenPrice ? (parseFloat(amountFormatted) * tokenPrice).toString() : undefined,
    },
    recipient: proposalData.recipient,
    description: proposalData.description,
    createdAt: {
      timestamp: proposalData.createdAt,
      date: new Date(Number(proposalData.createdAt) * 1000),
    },
    votingStartsAt: {
      timestamp: proposalData.votingStartsAt,
      date: new Date(Number(proposalData.votingStartsAt) * 1000),
    },
    votingEndsAt: {
      timestamp: proposalData.votingEndsAt,
      date: new Date(Number(proposalData.votingEndsAt) * 1000),
    },
    yesVotes: {
      raw: proposalData.yesVotes,
      formatted: yesVotesFormatted,
      usd: tokenPrice ? (parseFloat(yesVotesFormatted) * tokenPrice).toString() : undefined,
    },
    noVotes: {
      raw: proposalData.noVotes,
      formatted: noVotesFormatted,
      usd: tokenPrice ? (parseFloat(noVotesFormatted) * tokenPrice).toString() : undefined,
    },
    totalBalanceVoted: proposalData.totalBalanceVoted,
    executed: proposalData.executed,
    cycleId: proposalData.cycleId,
    meetsQuorum,
    meetsApproval,
    state,
    voteReceipt: voteReceiptData,
  }
}

/**
 * Get proposals data from governor contract with enriched data
 * Uses getProposalsForCycle() then single multicall to get all proposal data
 */
export async function proposals({
  publicClient,
  governorAddress,
  cycleId,
  tokenDecimals = 18,
  pricing,
  pageSize = 50,
  userAddress,
}: ProposalsParams): Promise<ProposalsResult> {
  if (Object.values({ publicClient, governorAddress }).some((value) => !value)) {
    throw new Error('Invalid proposals params')
  }

  // Get current cycle ID if not provided
  const currentCycleId =
    cycleId ??
    (await publicClient.readContract({
      address: governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'currentCycleId',
    }))

  // Get all proposal IDs for the cycle
  const proposalIds = await publicClient.readContract({
    address: governorAddress,
    abi: LevrGovernor_v1,
    functionName: 'getProposalsForCycle',
    args: [currentCycleId],
  })

  // Limit to pageSize (most recent first, array is already in reverse order)
  const limitedIds = Array.from(proposalIds).slice(0, pageSize)

  if (limitedIds.length === 0) {
    return {
      proposals: [],
      cycleId: currentCycleId,
      winner: 0n,
    }
  }

  // Build single multicall using proposalCallData utility (includes vote receipts if userAddress provided)
  const contracts = limitedIds.flatMap((proposalId) =>
    proposalCallData(governorAddress, proposalId, userAddress)
  )

  const results = await publicClient.multicall({ contracts })

  // Parse results using parseProposalData utility
  const parsedProposals: EnrichedProposalDetails[] = []
  const contractsPerProposal = userAddress ? 2 : 1 // 2 if including vote receipt, 1 otherwise

  for (let i = 0; i < limitedIds.length; i++) {
    const baseIndex = i * contractsPerProposal
    const proposalResults = [
      results[baseIndex].result,
      userAddress ? results[baseIndex + 1].result : undefined,
    ]

    // Skip if proposal data is invalid
    if (!proposalResults[0]) {
      continue
    }

    parsedProposals.push(parseProposalData(proposalResults, tokenDecimals, pricing))
  }

  const winner = await publicClient.readContract({
    address: governorAddress,
    abi: LevrGovernor_v1,
    functionName: 'getWinner',
    args: [currentCycleId],
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
  proposalId: bigint,
  tokenDecimals: number,
  pricing?: PricingResult,
  userAddress?: `0x${string}`
) {
  const results = await publicClient.multicall({
    contracts: proposalCallData(governorAddress, proposalId, userAddress),
  })

  // Extract .result from each multicall result
  const extractedResults = results.map((r) => r.result)

  return parseProposalData(extractedResults, tokenDecimals, pricing)
}
