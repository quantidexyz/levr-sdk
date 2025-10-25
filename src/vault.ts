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
 * Vault status enum
 */
export enum VaultStatus {
  LOCKED = 'locked',
  VESTING = 'vesting',
  VESTED = 'vested',
}

/**
 * Type representing vault status with computed information
 */
export type VaultStatusData = {
  status: VaultStatus
  statusMessage: string
  descriptionMessage: string
  daysRemaining: number
  claimable: bigint
  total: bigint
  claimed: bigint
  lockupEndTime: bigint
  vestingEndTime: bigint
}

/**
 * Build contract calls for vault data
 * @param vaultAddress - Vault contract address
 * @param tokenAddress - Token address to query
 * @returns Array of contract calls
 */
function getVaultContracts(vaultAddress: `0x${string}`, tokenAddress: `0x${string}`) {
  return [
    {
      address: vaultAddress,
      abi: ClankerVault,
      functionName: 'allocation' as const,
      args: [tokenAddress],
    },
    {
      address: vaultAddress,
      abi: ClankerVault,
      functionName: 'amountAvailableToClaim' as const,
      args: [tokenAddress],
    },
  ]
}

/**
 * Parse vault contract results
 * @param results - Array of contract call results
 * @returns Parsed vault state or undefined if allocation doesn't exist
 */
function parseVaultData(
  results: readonly any[]
): { allocation: VaultAllocation; claimable: bigint } | undefined {
  const allocationResult = results[0]
  const claimableResult = results[1]

  // Check if allocation call failed
  if (allocationResult.status === 'failure') {
    return undefined
  }

  const allocation = allocationResult.result as [
    `0x${string}`,
    bigint,
    bigint,
    bigint,
    bigint,
    `0x${string}`,
  ]

  const claimable = (claimableResult.result ?? 0n) as bigint

  return {
    allocation: {
      token: allocation[0],
      amountTotal: allocation[1],
      amountClaimed: allocation[2],
      lockupEndTime: allocation[3],
      vestingEndTime: allocation[4],
      admin: allocation[5],
    },
    claimable,
  }
}

/**
 * Fetch vault data using multicall
 * @param publicClient - Viem public client
 * @param tokenAddress - Token address to query
 * @param chainId - Chain ID (optional, can be inferred from publicClient)
 * @returns Parsed vault data or undefined if allocation doesn't exist
 */
export async function fetchVaultData(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  chainId?: number
): Promise<{ allocation: VaultAllocation; claimable: bigint } | undefined> {
  const actualChainId = chainId || publicClient.chain?.id
  if (!actualChainId) throw new Error('Chain ID not found')

  const vaultAddress = GET_VAULT_ADDRESS(actualChainId)
  if (!vaultAddress) throw new Error(`Vault not configured for chain ${actualChainId}`)

  try {
    const contracts = getVaultContracts(vaultAddress, tokenAddress)
    const results = await publicClient.multicall({ contracts })
    return parseVaultData(results)
  } catch {
    return undefined
  }
}

/**
 * Get vault status with computed messages
 * @param data - Vault data from fetchVaultData
 * @param blockTimestamp - Current block timestamp in seconds (for consistency)
 * @returns Vault status data with messages
 */
export function getVaultStatus(
  data: {
    allocation: VaultAllocation
    claimable: bigint
  },
  blockTimestamp: number
): VaultStatusData {
  const lockupEndTime = Number(data.allocation.lockupEndTime)
  const vestingEndTime = Number(data.allocation.vestingEndTime)

  let status: VaultStatus
  let statusMessage: string
  let descriptionMessage: string
  let daysRemaining: number

  if (blockTimestamp < lockupEndTime) {
    // Still in lockup
    status = VaultStatus.LOCKED
    daysRemaining = Math.ceil((lockupEndTime - blockTimestamp) / (24 * 60 * 60))
    statusMessage = 'Tokens Locked'
    descriptionMessage = `Your tokens will be available to claim in ${daysRemaining} days.`
  } else if (blockTimestamp < vestingEndTime) {
    // In vesting period
    status = VaultStatus.VESTING
    daysRemaining = Math.ceil((vestingEndTime - blockTimestamp) / (24 * 60 * 60))
    statusMessage = 'Vesting in Progress'
    descriptionMessage = `Tokens are vesting linearly. ${daysRemaining} days until fully vested.`
  } else {
    // Fully vested
    status = VaultStatus.VESTED
    daysRemaining = 0
    statusMessage = 'Vesting Complete'
    descriptionMessage =
      data.claimable > 0n
        ? 'All tokens are now available to claim.'
        : 'All tokens in this vault have been claimed.'
  }

  return {
    status,
    statusMessage,
    descriptionMessage,
    daysRemaining,
    claimable: data.claimable,
    total: data.allocation.amountTotal,
    claimed: data.allocation.amountClaimed,
    lockupEndTime: data.allocation.lockupEndTime,
    vestingEndTime: data.allocation.vestingEndTime,
  }
}
