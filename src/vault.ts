/**
 * Vault utilities for interacting with the Clanker Vault contract
 * This module provides server-side functions to retrieve and interact with vault state
 */

import type { PublicClient } from 'viem'

import { ClankerVault } from './abis'
import { GET_VAULT_ADDRESS } from './constants'

/**
 * Type representing vault allocation state
 */
export type VaultAllocation = {
  token: `0x${string}`
  amountTotal: bigint
  amountClaimed: bigint
  lockupEndTime: bigint
  vestingEndTime: bigint
  admin: `0x${string}`
}

/**
 * Type representing claimable vault state
 */
export type VaultClaimableState = {
  claimable: bigint
  total: bigint
  claimed: bigint
  lockupEndTime: bigint
  vestingEndTime: bigint
}

/**
 * Retrieve the vault allocation state for a token
 * @param publicClient - Viem public client
 * @param tokenAddress - Token address to query
 * @param chainId - Chain ID (optional, can be inferred from publicClient)
 * @returns Vault allocation data or undefined if not found
 */
export const getVaultAllocation = async (
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  chainId?: number
): Promise<VaultAllocation | undefined> => {
  const actualChainId = chainId || publicClient.chain?.id
  if (!actualChainId) throw new Error('Chain ID not found')

  const vaultAddress = GET_VAULT_ADDRESS(actualChainId)
  if (!vaultAddress) throw new Error(`Vault not configured for chain ${actualChainId}`)

  try {
    const allocation = (await publicClient.readContract({
      address: vaultAddress,
      abi: ClankerVault,
      functionName: 'allocation',
      args: [tokenAddress],
    })) as [`0x${string}`, bigint, bigint, bigint, bigint, `0x${string}`]

    return {
      token: allocation[0],
      amountTotal: allocation[1],
      amountClaimed: allocation[2],
      lockupEndTime: allocation[3],
      vestingEndTime: allocation[4],
      admin: allocation[5],
    }
  } catch (error) {
    // Allocation may not exist
    return undefined
  }
}

/**
 * Retrieve the amount of tokens available to claim from the vault
 * @param publicClient - Viem public client
 * @param tokenAddress - Token address to query
 * @param chainId - Chain ID (optional, can be inferred from publicClient)
 * @returns Amount claimable or 0n if not available
 */
export const getVaultClaimableAmount = async (
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  chainId?: number
): Promise<bigint> => {
  const actualChainId = chainId || publicClient.chain?.id
  if (!actualChainId) throw new Error('Chain ID not found')

  const vaultAddress = GET_VAULT_ADDRESS(actualChainId)
  if (!vaultAddress) throw new Error(`Vault not configured for chain ${actualChainId}`)

  try {
    const claimable = (await publicClient.readContract({
      address: vaultAddress,
      abi: ClankerVault,
      functionName: 'amountAvailableToClaim',
      args: [tokenAddress],
    })) as bigint

    return claimable
  } catch (error) {
    // If not claimable, return 0
    return 0n
  }
}

/**
 * Retrieve complete vault state including both allocation and claimable amount
 * @param publicClient - Viem public client
 * @param tokenAddress - Token address to query
 * @param chainId - Chain ID (optional, can be inferred from publicClient)
 * @returns Complete vault state or undefined if allocation doesn't exist
 */
export const getVaultState = async (
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  chainId?: number
): Promise<VaultClaimableState | undefined> => {
  const actualChainId = chainId || publicClient.chain?.id
  if (!actualChainId) throw new Error('Chain ID not found')

  const allocation = await getVaultAllocation(publicClient, tokenAddress, actualChainId)
  if (!allocation) return undefined

  const claimable = await getVaultClaimableAmount(publicClient, tokenAddress, actualChainId)

  return {
    claimable,
    total: allocation.amountTotal,
    claimed: allocation.amountClaimed,
    lockupEndTime: allocation.lockupEndTime,
    vestingEndTime: allocation.vestingEndTime,
  }
}
