import type { Address, PublicClient } from 'viem'
import { zeroAddress } from 'viem'

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
  maxRewardTokens: number
}>

/**
 * Fetches the global factory configuration from the blockchain
 * @param publicClient - The public client for reading from the blockchain
 * @param chainId - The chain ID
 * @returns The global factory configuration
 */
export async function getGlobalFactoryConfig(
  publicClient: PublicClient,
  chainId: number
): Promise<Pick<FactoryConfig, 'protocolFeeBps' | 'protocolTreasury'> | null> {
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
      ] as const,
    })

    // Check for any errors in the results
    const [protocolFeeBps, protocolTreasury] = results.map((result) => {
      if (result.status === 'failure') {
        throw new Error(`Contract call failed: ${result.error?.message}`)
      }
      return result.result
    })

    return {
      protocolFeeBps: protocolFeeBps as number,
      protocolTreasury: protocolTreasury as Address,
    }
  } catch (error) {
    console.error('Failed to fetch global factory config:', error)
    return null
  }
}

/**
 * Fetches the project-specific factory configuration from the blockchain
 * @param publicClient - The public client for reading from the blockchain
 * @param factoryAddress - The factory address
 * @param clankerToken - The Clanker token address
 * @returns The project-specific factory configuration
 */
export async function getProjectFactoryConfig(
  publicClient: PublicClient,
  factoryAddress: Address,
  clankerToken: Address
): Promise<Omit<FactoryConfig, 'protocolFeeBps' | 'protocolTreasury'> | null> {
  try {
    const results = await publicClient.multicall({
      contracts: [
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'streamWindowSeconds',
          args: [clankerToken],
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'proposalWindowSeconds',
          args: [clankerToken],
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'votingWindowSeconds',
          args: [clankerToken],
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'maxActiveProposals',
          args: [clankerToken],
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'quorumBps',
          args: [clankerToken],
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'approvalBps',
          args: [clankerToken],
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'minSTokenBpsToSubmit',
          args: [clankerToken],
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'maxProposalAmountBps',
          args: [clankerToken],
        },
        {
          address: factoryAddress,
          abi: LevrFactory_v1,
          functionName: 'maxRewardTokens',
          args: [clankerToken],
        },
      ] as const,
    })

    // Check for any errors in the results
    const [
      streamWindowSeconds,
      proposalWindowSeconds,
      votingWindowSeconds,
      maxActiveProposals,
      quorumBps,
      approvalBps,
      minSTokenBpsToSubmit,
      maxProposalAmountBps,
      maxRewardTokens,
    ] = results.map((result) => {
      if (result.status === 'failure') {
        throw new Error(`Contract call failed: ${result.error?.message}`)
      }
      return result.result
    })

    return {
      streamWindowSeconds: streamWindowSeconds as number,
      proposalWindowSeconds: proposalWindowSeconds as number,
      votingWindowSeconds: votingWindowSeconds as number,
      maxActiveProposals: maxActiveProposals as number,
      quorumBps: quorumBps as number,
      approvalBps: approvalBps as number,
      minSTokenBpsToSubmit: minSTokenBpsToSubmit as number,
      maxProposalAmountBps: maxProposalAmountBps as number,
      maxRewardTokens: maxRewardTokens as number,
    }
  } catch (error) {
    console.error('Failed to fetch project factory config:', error)
    return null
  }
}

/**
 * Fetches the complete factory configuration from the blockchain
 * @param publicClient - The public client for reading from the blockchain
 * @param chainId - The chain ID
 * @param clankerToken - The Clanker token address (for project-specific config, defaults to zero address)
 * @returns The complete factory configuration
 */
export async function getFactoryConfig(
  publicClient: PublicClient,
  chainId: number,
  clankerToken?: Address
): Promise<FactoryConfig | null> {
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)
  if (!factoryAddress) {
    return null
  }

  try {
    const globalConfig = await getGlobalFactoryConfig(publicClient, chainId)
    if (!globalConfig) {
      return null
    }

    // Use zero address if no clanker token provided
    const tokenAddress = clankerToken || zeroAddress

    const projectConfig = await getProjectFactoryConfig(publicClient, factoryAddress, tokenAddress)
    if (!projectConfig) {
      return null
    }

    return {
      ...globalConfig,
      ...projectConfig,
    }
  } catch (error) {
    console.error('Failed to fetch factory config:', error)
    return null
  }
}
