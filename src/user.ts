import { erc20Abi, formatUnits, zeroAddress } from 'viem'

import { IClankerAirdrop, LevrStaking_v1 } from './abis'
import type { TokenConfig } from './balance'
import { balance } from './balance'
import { GET_CLANKER_AIRDROP_ADDRESS, WETH } from './constants'
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
  rewards: {
    outstanding: {
      staking: {
        available: BalanceResult
        pending: BalanceResult
      }
      weth: {
        available: BalanceResult
        pending: BalanceResult
      } | null
    }
    claimable: {
      staking: BalanceResult
      weth: BalanceResult | null
    }
  }
  apr: {
    token: { raw: bigint; percentage: number }
    weth: { raw: bigint; percentage: number } | null
  }
}

export type UserGovernance = {
  votingPower: BalanceResult
  airdrop: {
    availableAmount: BalanceResult
    allocatedAmount: BalanceResult
    isAvailable: boolean
    error?: string
  } | null
}

export type UserData = {
  balances: UserBalances
  staking: UserStaking
  governance: UserGovernance
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
 * Helper: Get staking contracts for multicall composition
 */
export function stakingContracts(params: {
  userAddress: `0x${string}`
  stakingAddress: `0x${string}`
  clankerToken: `0x${string}`
  wethAddress?: `0x${string}`
}) {
  const contracts: any[] = [
    {
      address: params.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'stakedBalanceOf' as const,
      args: [params.userAddress],
    },
    {
      address: params.clankerToken,
      abi: erc20Abi,
      functionName: 'allowance' as const,
      args: [params.userAddress, params.stakingAddress],
    },
    {
      address: params.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'outstandingRewards' as const,
      args: [params.clankerToken],
    },
    {
      address: params.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'claimableRewards' as const,
      args: [params.userAddress, params.clankerToken],
    },
    {
      address: params.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'aprBps' as const,
    },
    {
      address: params.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'getVotingPower' as const,
      args: [params.userAddress],
    },
    {
      address: params.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'totalStaked' as const,
    },
  ]

  if (params.wethAddress) {
    contracts.push(
      {
        address: params.stakingAddress,
        abi: LevrStaking_v1,
        functionName: 'outstandingRewards' as const,
        args: [params.wethAddress],
      },
      {
        address: params.stakingAddress,
        abi: LevrStaking_v1,
        functionName: 'claimableRewards' as const,
        args: [params.userAddress, params.wethAddress],
      },
      {
        address: params.stakingAddress,
        abi: LevrStaking_v1,
        functionName: 'rewardRatePerSecond' as const,
        args: [params.wethAddress],
      }
    )
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
export async function user({ publicClient, userAddress, project }: UserParams): Promise<UserData> {
  if (Object.values({ publicClient, userAddress, project }).some((value) => !value)) {
    throw new Error('Invalid user params')
  }

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const wethAddress = WETH(chainId)?.address
  const { clankerToken, stakingAddress, treasuryAddress, tokenDecimals, pricing } = {
    clankerToken: project.token.address,
    stakingAddress: project.staking,
    treasuryAddress: project.treasury,
    tokenDecimals: project.token.decimals,
    pricing: project.pricing,
  }

  // Fetch balances using existing balance function
  const tokens: TokenConfig[] = [
    { address: clankerToken, decimals: tokenDecimals, key: 'token' },
    { address: zeroAddress, decimals: 18, key: 'eth' },
  ]

  if (wethAddress) {
    tokens.push({ address: wethAddress, decimals: 18, key: 'weth' })
  }

  const balances = await balance({
    publicClient,
    address: userAddress,
    tokens,
    pricing,
  })

  // Build comprehensive multicall using helper utils
  const stakingContractsData = stakingContracts({
    userAddress,
    stakingAddress,
    clankerToken,
    wethAddress,
  })

  const results = await publicClient.multicall({ contracts: stakingContractsData })

  // Parse staking results
  const stakedBalance = results[0].result as bigint
  const allowance = results[1].result as bigint
  const outstandingRewardsToken = results[2].result as [bigint, bigint]
  const claimableRewardsToken = results[3].result as bigint
  const aprBps = results[4].result as bigint
  const votingPower = results[5].result as bigint
  const totalStaked = results[6].result as bigint

  // Parse WETH rewards if available
  let outstandingRewardsWeth: [bigint, bigint] | null = null
  let claimableRewardsWeth: bigint | null = null
  let wethRewardRate: bigint | null = null

  if (wethAddress) {
    outstandingRewardsWeth = results[7].result as [bigint, bigint]
    claimableRewardsWeth = results[8].result as bigint
    wethRewardRate = results[9].result as bigint
  }

  // Calculate USD values
  const tokenPrice = pricing ? parseFloat(pricing.tokenUsd) : null
  const wethPrice = pricing ? parseFloat(pricing.wethUsd) : null

  const formatWithUsd = (amount: bigint, decimals: number, price: number | null): BalanceResult => {
    const formatted = formatUnits(amount, decimals)
    return {
      raw: amount,
      formatted,
      usd: price ? (parseFloat(formatted) * price).toString() : undefined,
    }
  }

  // Calculate WETH APR if available
  let wethApr: { raw: bigint; percentage: number } | null = null
  if (wethAddress && wethRewardRate !== null && pricing && totalStaked > 0n) {
    const wethUsd = parseFloat(pricing.wethUsd)
    const tokenUsd = parseFloat(pricing.tokenUsd)

    if (tokenUsd > 0) {
      const wethPriceInTokens = wethUsd / tokenUsd
      const secondsPerYear = BigInt(365 * 24 * 60 * 60)
      const annualWethRewards = wethRewardRate * secondsPerYear

      const priceScaleFactor = BigInt(1e18)
      const wethPriceScaled = BigInt(Math.floor(wethPriceInTokens * Number(priceScaleFactor)))
      const annualRewardsInUnderlying = (annualWethRewards * wethPriceScaled) / priceScaleFactor

      const aprBpsWeth = totalStaked > 0n ? (annualRewardsInUnderlying * 10000n) / totalStaked : 0n
      wethApr = {
        raw: aprBpsWeth,
        percentage: Number(aprBpsWeth) / 100,
      }
    }
  }

  // Get airdrop status
  let airdropStatus: UserGovernance['airdrop'] = null
  const airdropAddress = GET_CLANKER_AIRDROP_ADDRESS(chainId)

  if (airdropAddress) {
    try {
      // Try to find treasury airdrop allocation (simplified version)
      const airdropAmount = 50_000_000_000n * 10n ** 18n // 50B tokens default

      const availableAmount = await publicClient.readContract({
        address: airdropAddress,
        abi: IClankerAirdrop,
        functionName: 'amountAvailableToClaim',
        args: [clankerToken, treasuryAddress, airdropAmount],
      })

      airdropStatus = {
        availableAmount: formatWithUsd(availableAmount, tokenDecimals, tokenPrice),
        allocatedAmount: formatWithUsd(airdropAmount, tokenDecimals, tokenPrice),
        isAvailable: availableAmount > 0n,
      }
    } catch (error) {
      // Airdrop not found or error - return null
      airdropStatus = null
    }
  }

  return {
    balances: {
      token: balances.token,
      weth: balances.weth || { raw: 0n, formatted: '0' },
      eth: balances.eth,
    },
    staking: {
      stakedBalance: formatWithUsd(stakedBalance, tokenDecimals, tokenPrice),
      allowance: formatWithUsd(allowance, tokenDecimals, tokenPrice),
      rewards: {
        outstanding: {
          staking: {
            available: formatWithUsd(outstandingRewardsToken[0], tokenDecimals, tokenPrice),
            pending: formatWithUsd(outstandingRewardsToken[1], tokenDecimals, tokenPrice),
          },
          weth:
            outstandingRewardsWeth && wethAddress
              ? {
                  available: formatWithUsd(outstandingRewardsWeth[0], 18, wethPrice),
                  pending: formatWithUsd(outstandingRewardsWeth[1], 18, wethPrice),
                }
              : null,
        },
        claimable: {
          staking: formatWithUsd(claimableRewardsToken, tokenDecimals, tokenPrice),
          weth:
            claimableRewardsWeth !== null && wethAddress
              ? formatWithUsd(claimableRewardsWeth, 18, wethPrice)
              : null,
        },
      },
      apr: {
        token: {
          raw: aprBps,
          percentage: Number(aprBps) / 100,
        },
        weth: wethApr,
      },
    },
    governance: {
      votingPower: formatWithUsd(votingPower, tokenDecimals, tokenPrice),
      airdrop: airdropStatus,
    },
  }
}
