import type { Address, PublicClient } from 'viem'

import LevrFactory_v1 from './abis/LevrFactory_v1'
import { GET_FACTORY_ADDRESS } from './constants'

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
}>

/**
 * Fetches the factory configuration from the blockchain using multicall
 * @param publicClient - The public client for reading from the blockchain
 * @param chainId - The chain ID
 * @returns The factory configuration
 */
export async function getFactoryConfig(
  publicClient: PublicClient,
  chainId: number
): Promise<FactoryConfig | null> {
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)
  if (!factoryAddress) {
    return null
  }

  try {
    const results = await publicClient.multicall({
      contracts: [
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'protocolFeeBps',
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'protocolTreasury',
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'streamWindowSeconds',
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'proposalWindowSeconds',
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'votingWindowSeconds',
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'maxActiveProposals',
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'quorumBps',
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'approvalBps',
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'minSTokenBpsToSubmit',
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'maxProposalAmountBps',
        },
      ] as const,
    })

    // Check for any errors in the results
    const [
      protocolFeeBps,
      protocolTreasury,
      streamWindowSeconds,
      proposalWindowSeconds,
      votingWindowSeconds,
      maxActiveProposals,
      quorumBps,
      approvalBps,
      minSTokenBpsToSubmit,
      maxProposalAmountBps,
    ] = results.map((result) => {
      if (result.status === 'failure') {
        throw new Error(`Contract call failed: ${result.error?.message}`)
      }
      return result.result
    })

    return {
      protocolFeeBps: protocolFeeBps as number,
      protocolTreasury: protocolTreasury as Address,
      streamWindowSeconds: streamWindowSeconds as number,
      proposalWindowSeconds: proposalWindowSeconds as number,
      votingWindowSeconds: votingWindowSeconds as number,
      maxActiveProposals: maxActiveProposals as number,
      quorumBps: quorumBps as number,
      approvalBps: approvalBps as number,
      minSTokenBpsToSubmit: minSTokenBpsToSubmit as number,
      maxProposalAmountBps: maxProposalAmountBps as number,
    }
  } catch (error) {
    console.error('Failed to fetch factory config:', error)
    return null
  }
}
