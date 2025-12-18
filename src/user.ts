import { erc20Abi } from 'viem'

import { LevrStaking_v1 } from './abis'
import { formatBalanceWithUsd } from './balance'
import type { Project } from './project'
import type { BalanceResult, PopPublicClient } from './types'

export type UserParams = {
  publicClient: PopPublicClient
  userAddress: `0x${string}`
  project: Project
}

export type UserBalances = {
  token: BalanceResult
  pairedToken: BalanceResult
  nativeEth?: BalanceResult // Only present when pairedToken.isNative
}

export type UserStaking = {
  stakedBalance: BalanceResult
  allowance: BalanceResult
  claimableRewards: {
    staking: BalanceResult
    pairedToken: BalanceResult | null
  }
}

export type User = {
  balances: UserBalances
  staking: UserStaking
  votingPower: string
}

// ========================================
// HELPER UTILS (for composition in larger multicalls)
// ========================================

/**
 * Helper: Get balance contracts for multicall composition
 */
export function balanceContracts(params: {
  userAddress: `0x${string}`
  clankerToken: `0x${string}`
  pairedTokenAddress?: `0x${string}`
}) {
  const contracts = [
    {
      address: params.clankerToken,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [params.userAddress],
    },
  ]

  if (params.pairedTokenAddress) {
    contracts.push({
      address: params.pairedTokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [params.userAddress],
    })
  }

  return contracts
}

/**
 * Helper: Get user-specific staking contracts for multicall composition
 * Pool-level stats (totalStaked, apr, outstandingRewards) now in project.ts
 */
export function stakingContracts(params: {
  userAddress: `0x${string}`
  stakingAddress: `0x${string}`
  stakedTokenAddress: `0x${string}`
  clankerToken: `0x${string}`
  pairedTokenAddress?: `0x${string}`
}) {
  const contracts = [
    {
      address: params.stakedTokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [params.userAddress],
    },
    {
      address: params.clankerToken,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [params.userAddress, params.stakingAddress],
    },
    {
      address: params.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'claimableRewards',
      args: [params.userAddress, params.clankerToken],
    },
    {
      address: params.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'getVotingPower',
      args: [params.userAddress],
    },
  ]

  if (params.pairedTokenAddress) {
    contracts.push({
      address: params.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'claimableRewards' as const,
      args: [params.userAddress, params.pairedTokenAddress],
    })
  }

  return contracts
}

// ========================================
// MAIN USER DATA FUNCTION
// ========================================

/**
 * Get all user-related data in a single efficient multicall
 * Composes balances, staking, and governance data with USD values
 */
export async function getUser({ publicClient, userAddress, project }: UserParams): Promise<User> {
  if (Object.values({ publicClient, userAddress, project }).some((value) => !value)) {
    throw new Error('Invalid user params')
  }

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  // Get paired token info from project
  const pairedTokenInfo = project.pool?.pairedToken
  const pairedTokenAddress = pairedTokenInfo?.address
  const { clankerToken, stakingAddress, stakedTokenAddress, tokenDecimals, pricing } = {
    clankerToken: project.token.address,
    stakingAddress: project.staking,
    stakedTokenAddress: project.stakedToken,
    tokenDecimals: project.token.decimals,
    pricing: project.pricing,
  }

  // Build single comprehensive multicall for ALL user data
  const contracts: any[] = [
    // Balances
    {
      address: clankerToken,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [userAddress],
    },
  ]

  if (pairedTokenAddress) {
    contracts.push({
      address: pairedTokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [userAddress],
    })
  }

  // Add staking contracts
  contracts.push(
    ...stakingContracts({
      userAddress,
      stakingAddress,
      stakedTokenAddress,
      clankerToken,
      pairedTokenAddress,
    })
  )

  // Execute single multicall + native balance
  const [nativeBalance, ...multicallResults] = await Promise.all([
    publicClient.getBalance({ address: userAddress }),
    publicClient.multicall({ contracts }),
  ])

  const results = multicallResults[0]

  // Parse balance results
  const stakingDataStartIndex = pairedTokenAddress ? 2 : 1

  const tokenBalanceRaw = results[0].result as bigint
  const pairedTokenBalanceRaw = pairedTokenAddress ? (results[1].result as bigint) : 0n

  // Parse user-specific staking results (pool stats now in project)
  const stakedBalance = results[stakingDataStartIndex + 0].result as bigint
  const allowance = results[stakingDataStartIndex + 1].result as bigint
  const claimableRewardsToken = results[stakingDataStartIndex + 2].result as bigint
  const votingPower = results[stakingDataStartIndex + 3].result as bigint

  // Parse paired token claimable rewards if available
  const claimableRewardsPaired = pairedTokenAddress
    ? (results[stakingDataStartIndex + 4].result as bigint)
    : null

  // Calculate USD values
  const tokenPrice = pricing ? parseFloat(pricing.tokenUsd) : null
  const pairedTokenPrice = pricing ? parseFloat(pricing.pairedTokenUsd) : null

  const balances: UserBalances = {
    token: formatBalanceWithUsd(tokenBalanceRaw, tokenDecimals, tokenPrice),
    pairedToken: formatBalanceWithUsd(
      pairedTokenBalanceRaw,
      pairedTokenInfo?.decimals ?? 18,
      pairedTokenPrice
    ),
  }

  // Only add nativeEth if paired token is WETH (isNative = true)
  if (pairedTokenInfo?.isNative) {
    balances.nativeEth = formatBalanceWithUsd(nativeBalance, 18, pairedTokenPrice)
  }

  return {
    balances,
    staking: {
      stakedBalance: formatBalanceWithUsd(stakedBalance, tokenDecimals, tokenPrice),
      allowance: formatBalanceWithUsd(allowance, tokenDecimals, tokenPrice),
      claimableRewards: {
        staking: formatBalanceWithUsd(claimableRewardsToken, tokenDecimals, tokenPrice),
        pairedToken:
          claimableRewardsPaired !== null && pairedTokenAddress
            ? formatBalanceWithUsd(
                claimableRewardsPaired,
                pairedTokenInfo?.decimals ?? 18,
                pairedTokenPrice
              )
            : null,
      },
    },
    votingPower: votingPower.toString(),
  }
}
