import type { Address } from 'viem'

import { query } from './graphql'
import { getLevrFactoryFields, type LevrFactoryData } from './graphql/fields/factory'

export type FactoryConfig = Readonly<{
  protocolFeeBps: number
  protocolTreasury: Address
  streamWindowSeconds: number
  proposalWindowSeconds: number
  votingWindowSeconds: number
  maxActiveProposals: number
  quorumBps: number
  approvalBps: number
  minSTokenBpsToSubmit: number
  maxProposalAmountBps: number
  minimumQuorumBps: number
}>

/**
 * Adapts indexed factory data to the FactoryConfig shape
 */
function adaptIndexedFactory(data: LevrFactoryData): FactoryConfig {
  return {
    protocolFeeBps: Number(data.protocolFeeBps),
    protocolTreasury: data.protocolTreasury as Address,
    streamWindowSeconds: Number(data.streamWindowSeconds),
    proposalWindowSeconds: Number(data.proposalWindowSeconds),
    votingWindowSeconds: Number(data.votingWindowSeconds),
    maxActiveProposals: Number(data.maxActiveProposals),
    quorumBps: Number(data.quorumBps),
    approvalBps: Number(data.approvalBps),
    minSTokenBpsToSubmit: Number(data.minSTokenBpsToSubmit),
    maxProposalAmountBps: Number(data.maxProposalAmountBps),
    minimumQuorumBps: Number(data.minimumQuorumBps),
  }
}

/**
 * Fetches the factory configuration from the indexer
 * @returns The factory configuration or null if not found
 */
export async function getFactoryConfig(): Promise<FactoryConfig | null> {
  try {
    const fields = getLevrFactoryFields()
    const result = await query(fields)

    if (!result.LevrFactory_by_pk) {
      return null
    }

    return adaptIndexedFactory(result.LevrFactory_by_pk)
  } catch (error) {
    console.error('Failed to fetch factory config:', error)
    return null
  }
}
