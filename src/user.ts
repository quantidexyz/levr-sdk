import { erc20Abi } from 'viem'

import { LevrStaking_v1 } from './abis'
import { formatBalanceWithUsd } from './balance'
import { WETH } from './constants'
import type { Project } from './project'
import type { BalanceResult, PopPublicClient } from './types'

export type UserParams = {
  publicClient: PopPublicClient
  userAddress: `0x${string}`
  project: Project
}

export type UserBalances = {
  token: BalanceResult
  weth: BalanceResult
  eth: BalanceResult
}

export type UserStaking = {
  stakedBalance: BalanceResult
  allowance: BalanceResult
  claimableRewards: {
    staking: BalanceResult
    weth: BalanceResult | null
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
  wethAddress?: `0x${string}`
}) {
  const contracts = [
    {
      address: params.clankerToken,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [params.userAddress],
    },
  ]

  if (params.wethAddress) {
    contracts.push({
      address: params.wethAddress,
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
  wethAddress?: `0x${string}`
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

  if (params.wethAddress) {
    contracts.push({
      address: params.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'claimableRewards' as const,
      args: [params.userAddress, params.wethAddress],
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

  const wethAddress = WETH(chainId)?.address
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

  if (wethAddress) {
    contracts.push({
      address: wethAddress,
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
      wethAddress,
    })
  )

  // Execute single multicall + native balance
  const [nativeBalance, ...multicallResults] = await Promise.all([
    publicClient.getBalance({ address: userAddress }),
    publicClient.multicall({ contracts }),
  ])

  const results = multicallResults[0]

  // Parse balance results
  const stakingDataStartIndex = wethAddress ? 2 : 1

  const tokenBalanceRaw = results[0].result as bigint
  const wethBalanceRaw = wethAddress ? (results[1].result as bigint) : 0n

  // Parse user-specific staking results (pool stats now in project)
  const stakedBalance = results[stakingDataStartIndex + 0].result as bigint
  const allowance = results[stakingDataStartIndex + 1].result as bigint
  const claimableRewardsToken = results[stakingDataStartIndex + 2].result as bigint
  const votingPower = results[stakingDataStartIndex + 3].result as bigint

  // Parse WETH claimable rewards if available
  const claimableRewardsWeth = wethAddress
    ? (results[stakingDataStartIndex + 4].result as bigint)
    : null

  // Calculate USD values
  const tokenPrice = pricing ? parseFloat(pricing.tokenUsd) : null
  const wethPrice = pricing ? parseFloat(pricing.wethUsd) : null

  return {
    balances: {
      token: formatBalanceWithUsd(tokenBalanceRaw, tokenDecimals, tokenPrice),
      weth: formatBalanceWithUsd(wethBalanceRaw, 18, wethPrice),
      eth: formatBalanceWithUsd(nativeBalance, 18, wethPrice),
    },
    staking: {
      stakedBalance: formatBalanceWithUsd(stakedBalance, tokenDecimals, tokenPrice),
      allowance: formatBalanceWithUsd(allowance, tokenDecimals, tokenPrice),
      claimableRewards: {
        staking: formatBalanceWithUsd(claimableRewardsToken, tokenDecimals, tokenPrice),
        weth:
          claimableRewardsWeth !== null && wethAddress
            ? formatBalanceWithUsd(claimableRewardsWeth, 18, wethPrice)
            : null,
      },
    },
    votingPower: votingPower.toString(),
  }
}
