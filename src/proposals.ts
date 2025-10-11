import type { ExtractAbiItem, Log } from 'viem'
import { formatUnits } from 'viem'

import { LevrGovernor_v1 } from './abis'
import type { FormattedProposalDetails } from './governance'
import type { PopPublicClient } from './types'

export type ProposalsParams = {
  publicClient: PopPublicClient
  governorAddress: `0x${string}`
  tokenDecimals?: number
  fromBlock?: bigint
  toBlock?: bigint | 'latest'
  pageSize?: number
}

export type ProposalsResult = {
  proposals: FormattedProposalDetails[]
  fromBlock: bigint
  toBlock: bigint
}

type ProposalCreatedEvent = Log<
  bigint,
  number,
  false,
  ExtractAbiItem<typeof LevrGovernor_v1, 'ProposalCreated'>,
  false
>

const proposalCreatedEvent = LevrGovernor_v1.find(
  (item) => item.type === 'event' && item.name === 'ProposalCreated'
)

/**
 * Get multiple proposals data from governor contract
 */
export async function proposals({
  publicClient,
  governorAddress,
  tokenDecimals = 18,
  fromBlock,
  toBlock = 'latest',
  pageSize = 50,
}: ProposalsParams): Promise<ProposalsResult> {
  if (Object.values({ publicClient, governorAddress }).some((value) => !value)) {
    throw new Error('Invalid proposals params')
  }

  // Determine block range
  const latestBlock = await publicClient.getBlockNumber()
  const from = fromBlock ?? latestBlock - latestBlock / 10n // Default to last 10% of blocks
  const to = toBlock === 'latest' ? latestBlock : toBlock

  // Fetch ProposalCreated events - indexed events are efficient even across large ranges
  const allLogs = (await publicClient.getLogs({
    address: governorAddress,
    event: proposalCreatedEvent,
    fromBlock: from,
    toBlock: to,
  })) as ProposalCreatedEvent[]

  // Sort by block number descending (most recent first)
  const logs = allLogs.sort((a, b) => {
    if (a.blockNumber > b.blockNumber) return -1
    if (a.blockNumber < b.blockNumber) return 1
    return 0
  })

  // Limit to pageSize
  const limitedLogs = logs.slice(0, pageSize)

  if (limitedLogs.length === 0) {
    return {
      proposals: [],
      fromBlock: from,
      toBlock: to,
    }
  }

  // Extract proposal IDs from events
  const proposalIds = limitedLogs.map((log) => log.args.proposalId!)

  // Batch fetch all proposal details
  const contracts = proposalIds.map((proposalId) => ({
    address: governorAddress,
    abi: LevrGovernor_v1,
    functionName: 'getProposal' as const,
    args: [proposalId],
  }))

  const results = await publicClient.multicall({ contracts })

  // Parse results into FormattedProposalDetails objects
  const proposals: FormattedProposalDetails[] = []

  for (let i = 0; i < proposalIds.length; i++) {
    const result = results[i].result as {
      id: bigint
      proposalType: number
      proposer: `0x${string}`
      amount: bigint
      recipient: `0x${string}`
      description: string
      createdAt: bigint
      votingStartsAt: bigint
      votingEndsAt: bigint
      yesVotes: bigint
      noVotes: bigint
      totalBalanceVoted: bigint
      executed: boolean
      cycleId: bigint
    }

    // Skip if proposal data is invalid
    if (!result) {
      continue
    }

    proposals.push({
      id: result.id,
      proposalType: result.proposalType,
      proposer: result.proposer,
      amount: {
        raw: result.amount,
        formatted: formatUnits(result.amount, tokenDecimals),
      },
      recipient: result.recipient,
      description: result.description,
      createdAt: {
        timestamp: result.createdAt,
        date: new Date(Number(result.createdAt) * 1000),
      },
      votingStartsAt: {
        timestamp: result.votingStartsAt,
        date: new Date(Number(result.votingStartsAt) * 1000),
      },
      votingEndsAt: {
        timestamp: result.votingEndsAt,
        date: new Date(Number(result.votingEndsAt) * 1000),
      },
      yesVotes: {
        raw: result.yesVotes,
        formatted: formatUnits(result.yesVotes, tokenDecimals),
      },
      noVotes: {
        raw: result.noVotes,
        formatted: formatUnits(result.noVotes, tokenDecimals),
      },
      totalBalanceVoted: result.totalBalanceVoted,
      executed: result.executed,
      cycleId: result.cycleId,
    })
  }

  return {
    proposals,
    fromBlock: from,
    toBlock: to,
  }
}
