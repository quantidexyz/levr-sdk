import { erc20Abi } from 'viem'

import { IClankerAirdrop } from './abis'
import { formatBalanceWithUsd } from './balance'
import { GET_CLANKER_AIRDROP_ADDRESS, TREASURY_AIRDROP_AMOUNTS } from './constants'
import type { BalanceResult, PopPublicClient } from './types'

export type AirdropStatus = {
  availableAmount: BalanceResult
  allocatedAmount: BalanceResult
  isAvailable: boolean
  error?: string
}

type AirdropAllocation = {
  amount: bigint
  available: bigint
  status: 'available' | 'locked' | 'claimed' | 'not_found'
  error?: string
}

/**
 * Find treasury airdrop allocation by checking all known amounts using multicall
 */
async function findTreasuryAllocation(
  publicClient: PopPublicClient,
  clankerToken: `0x${string}`,
  treasury: `0x${string}`
): Promise<AirdropAllocation | null> {
  const chainId = publicClient.chain?.id
  const airdropAddress = GET_CLANKER_AIRDROP_ADDRESS(chainId)

  if (!airdropAddress) return null

  // Prepare multicall for all possible treasury airdrop amounts + treasury balance check
  const amounts = Object.values(TREASURY_AIRDROP_AMOUNTS).map(
    (amountInTokens) => BigInt(amountInTokens) * 10n ** 18n
  )

  const results = await publicClient.multicall({
    contracts: [
      // First check treasury balance
      {
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [treasury],
      },
      // Then check all airdrop amounts
      ...amounts.map((amount) => ({
        address: airdropAddress,
        abi: IClankerAirdrop,
        functionName: 'amountAvailableToClaim' as const,
        args: [clankerToken, treasury, amount],
      })),
    ] as any, // Mixed ABIs in multicall
    allowFailure: true,
  })

  // Extract treasury balance from first result
  const treasuryBalanceResult = results[0]
  const treasuryBalance =
    treasuryBalanceResult && treasuryBalanceResult.status === 'success'
      ? (treasuryBalanceResult.result as bigint)
      : 0n

  // Extract airdrop check results (skip first result which is balance)
  const airdropResults = results.slice(1)

  // Collect all valid results
  const allResults: Array<{
    amount: bigint
    available: bigint
    status: 'available' | 'locked' | 'claimed' | 'not_found'
    error?: string
    priority: number // Lower is better
  }> = []

  for (let i = 0; i < airdropResults.length; i++) {
    const result = airdropResults[i]
    const amount = amounts[i]

    if (result.status === 'success' && result.result !== undefined) {
      const available = result.result as bigint

      if (available > 0n) {
        // Available - highest priority (1)
        allResults.push({ amount, available, status: 'available', priority: 1 })
      } else {
        // Available is 0 - check treasury balance to determine if claimed or locked
        const isClaimed = treasuryBalance >= amount
        const priority = isClaimed ? 4 : 2
        const status = isClaimed ? 'claimed' : 'locked'
        const error = isClaimed ? 'Treasury airdrop already claimed' : 'Airdrop is still locked'

        allResults.push({ amount, available: 0n, status, priority, error })
      }
    } else if (result.status === 'failure') {
      const errorMessage = result.error?.message || ''

      // AirdropNotCreated means this amount wasn't configured - skip entirely
      if (errorMessage.includes('AirdropNotCreated')) {
        continue
      }

      // AirdropNotUnlocked means this amount exists but is locked (priority 2)
      if (errorMessage.includes('AirdropNotUnlocked')) {
        allResults.push({
          amount,
          available: 0n,
          status: 'locked',
          error: 'Airdrop is still locked',
          priority: 2,
        })
        continue
      }

      // Already claimed errors (priority 3)
      if (errorMessage.includes('UserMaxClaimed') || errorMessage.includes('TotalMaxClaimed')) {
        allResults.push({
          amount,
          available: 0n,
          status: 'claimed',
          error: 'Already claimed maximum amount',
          priority: 3,
        })
        continue
      }

      // Arithmetic underflow/overflow means a different amount was claimed - skip
      if (errorMessage.includes('underflow') || errorMessage.includes('overflow')) {
        continue
      }

      // Other errors - treat as locked (priority 2)
      allResults.push({
        amount,
        available: 0n,
        status: 'locked',
        error: errorMessage,
        priority: 2,
      })
    }
  }

  // If no results found, return null
  if (allResults.length === 0) {
    return null
  }

  // Sort by priority (lower is better), then by amount (higher is better for same priority)
  allResults.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }
    // For same priority, prefer larger amounts
    return a.amount > b.amount ? -1 : 1
  })

  // Return the best result
  const best = allResults[0]

  return {
    amount: best.amount,
    available: best.available,
    status: best.status,
    error: best.error,
  }
}

/**
 * Get treasury airdrop status
 */
export async function getTreasuryAirdropStatus(
  publicClient: PopPublicClient,
  clankerToken: `0x${string}`,
  treasury: `0x${string}`,
  tokenDecimals: number,
  tokenUsdPrice: number | null
): Promise<AirdropStatus | null> {
  const allocation = await findTreasuryAllocation(publicClient, clankerToken, treasury)

  if (!allocation) {
    return null
  }

  // Generate appropriate error message based on status
  let error: string | undefined
  switch (allocation.status) {
    case 'available':
      error = undefined
      break
    case 'locked':
      error = allocation.error || 'Airdrop is still locked (lockup period not passed)'
      break
    case 'claimed':
      error = 'Treasury airdrop already claimed'
      break
    case 'not_found':
      error = 'No treasury airdrop found'
      break
  }

  return {
    availableAmount: formatBalanceWithUsd(allocation.available, tokenDecimals, tokenUsdPrice),
    allocatedAmount: formatBalanceWithUsd(allocation.amount, tokenDecimals, tokenUsdPrice),
    isAvailable: allocation.status === 'available' && allocation.available > 0n,
    error,
  }
}

/**
 * Get available airdrop amount for treasury
 */
export async function getTreasuryAirdropAvailable(
  publicClient: PopPublicClient,
  clankerToken: `0x${string}`,
  treasury: `0x${string}`
): Promise<bigint> {
  const allocation = await findTreasuryAllocation(publicClient, clankerToken, treasury)
  return allocation?.available || 0n
}
