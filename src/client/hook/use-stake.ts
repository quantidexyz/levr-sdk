'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address, TransactionReceipt } from 'viem'
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi'

import { WETH } from '../../constants'
import type { ClaimParams } from '../../stake'
import { Stake } from '../../stake'
import { needsApproval } from '../../util'
import { useLevrContext } from '../levr-provider'
import { queryKeys } from '../query-keys'

export type UseStakingQueriesParams = {
  clankerToken: Address | null
  projectData: any
  enabled?: boolean
}

/**
 * Internal: Creates all staking queries with logic
 * Used by LevrProvider
 */
export function useStakingQueries({
  clankerToken,
  projectData,
  enabled: e = true,
}: UseStakingQueriesParams) {
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { address: userAddress } = useAccount()
  const wethAddress = WETH(chainId)?.address

  // Create StakeService instance
  const stakeService = useMemo(() => {
    if (!wallet.data || !publicClient || !projectData) {
      return null
    }
    return new Stake({
      wallet: wallet.data,
      publicClient,
      stakingAddress: projectData.staking,
      tokenAddress: projectData.token.address,
      tokenDecimals: projectData.token.decimals,
      trustedForwarder: projectData.forwarder,
    })
  }, [wallet.data, publicClient, projectData])

  const allowance = useQuery({
    queryKey: queryKeys.staking.allowance(
      projectData?.staking,
      projectData?.token.address,
      userAddress
    ),
    queryFn: async () => {
      if (!stakeService) return { raw: 0n, formatted: '0' }
      return stakeService.getAllowance()
    },
    enabled: e && !!publicClient && !!projectData && !!userAddress && !!stakeService,
  })

  const poolData = useQuery({
    queryKey: queryKeys.staking.poolData(projectData?.staking, projectData?.token.address),
    queryFn: async () => {
      if (!stakeService) return null
      return stakeService.getPoolData()
    },
    enabled: e && !!publicClient && !!projectData && !!stakeService,
  })

  const userData = useQuery({
    queryKey: queryKeys.staking.userData(projectData?.staking, userAddress),
    queryFn: async () => {
      if (!stakeService) return null
      return stakeService.getUserData()
    },
    enabled: e && !!publicClient && !!projectData && !!userAddress && !!stakeService,
  })

  const outstandingRewardsStaking = useQuery({
    queryKey: queryKeys.staking.outstandingRewards(
      projectData?.staking,
      projectData?.token.address,
      userAddress
    ),
    queryFn: async () => {
      if (!stakeService)
        return {
          available: { raw: 0n, formatted: '0' },
          pending: { raw: 0n, formatted: '0' },
        }
      return stakeService.getOutstandingRewards()
    },
    enabled: e && !!publicClient && !!projectData && !!userAddress && !!stakeService,
  })

  const outstandingRewardsWeth = useQuery({
    queryKey: queryKeys.staking.outstandingRewards(projectData?.staking, wethAddress, userAddress),
    queryFn: async () => {
      if (!wethAddress || !stakeService) return null
      return stakeService.getOutstandingRewards(wethAddress)
    },
    enabled:
      e && !!publicClient && !!projectData && !!userAddress && !!stakeService && !!wethAddress,
  })

  const claimableRewardsStaking = useQuery({
    queryKey: queryKeys.staking.claimableRewards(
      projectData?.staking,
      projectData?.token.address,
      userAddress
    ),
    queryFn: async () => {
      if (!stakeService) return null
      return stakeService.getClaimableRewards()
    },
    enabled: e && !!publicClient && !!projectData && !!userAddress && !!stakeService,
  })

  const claimableRewardsWeth = useQuery({
    queryKey: queryKeys.staking.claimableRewards(projectData?.staking, wethAddress, userAddress),
    queryFn: async () => {
      if (!wethAddress || !stakeService) return null
      return stakeService.getClaimableRewards(wethAddress)
    },
    enabled:
      e && !!publicClient && !!projectData && !!userAddress && !!stakeService && !!wethAddress,
  })

  return {
    stakeService,
    allowance,
    poolData,
    userData,
    outstandingRewardsStaking,
    outstandingRewardsWeth,
    claimableRewardsStaking,
    claimableRewardsWeth,
  }
}

// ========================================
// PUBLIC HOOK (exported from index.ts)
// ========================================

export type UseStakeParams = {
  clankerToken?: `0x${string}`
  enabled?: boolean

  onApproveSuccess?: (receipt: TransactionReceipt) => void
  onApproveError?: (error: unknown) => void

  onStakeSuccess?: (receipt: TransactionReceipt) => void
  onStakeError?: (error: unknown) => void

  onUnstakeSuccess?: (receipt: TransactionReceipt) => void
  onUnstakeError?: (error: unknown) => void

  onClaimSuccess?: (receipt: TransactionReceipt) => void
  onClaimError?: (error: unknown) => void

  onAccrueSuccess?: (receipt: TransactionReceipt) => void
  onAccrueError?: (error: unknown) => void
}

/**
 * Hook to access staking data and mutations from LevrProvider
 * @throws Error if used outside LevrProvider
 */
export function useStake({
  clankerToken: _clankerToken,
  enabled: _enabled = true,

  onApproveSuccess,
  onApproveError,

  onStakeSuccess,
  onStakeError,

  onUnstakeSuccess,
  onUnstakeError,

  onClaimSuccess,
  onClaimError,

  onAccrueSuccess,
  onAccrueError,
}: UseStakeParams = {}) {
  const { stakeService, project, staking, balances, refetch, clankerToken } = useLevrContext()
  const chainId = useChainId()
  const wethAddress = WETH(chainId)?.address

  // Approve mutation
  const approve = useMutation({
    mutationFn: async (amount: number | string | bigint) => {
      if (!stakeService) throw new Error('Stake service is not connected')

      return stakeService.approve(amount)
    },
    onSuccess: async (receipt) => {
      await staking.allowance.refetch()
      onApproveSuccess?.(receipt)
    },
    onError: onApproveError,
  })

  // Stake mutation
  const stake = useMutation({
    mutationFn: async (amount: number | string | bigint) => {
      if (!stakeService) throw new Error('Stake service is not connected')

      return stakeService.stake(amount)
    },
    onSuccess: async (receipt) => {
      await refetch.afterStake()
      onStakeSuccess?.(receipt)
    },
    onError: onStakeError,
  })

  // Unstake mutation
  const unstake = useMutation({
    mutationFn: async ({
      amount,
      to,
    }: {
      amount: number | string | bigint
      to?: `0x${string}`
    }) => {
      if (!stakeService) throw new Error('Stake service is not connected')

      return stakeService.unstake({
        amount,
        to,
      })
    },
    onSuccess: async (receipt) => {
      await refetch.afterStake()
      onUnstakeSuccess?.(receipt)
    },
    onError: onUnstakeError,
  })

  // Claim mutation
  const claim = useMutation({
    mutationFn: async (params: ClaimParams | void) => {
      if (!stakeService) throw new Error('Stake service is not connected')

      return stakeService.claimRewards(params)
    },
    onSuccess: async (receipt) => {
      await refetch.afterStake()
      onClaimSuccess?.(receipt)
    },
    onError: onClaimError,
  })

  // Accrue rewards mutation
  const accrueRewards = useMutation({
    mutationFn: async (tokenAddress?: `0x${string}`) => {
      if (!stakeService) throw new Error('Stake service is not connected')

      return stakeService.accrueRewards(tokenAddress)
    },
    onSuccess: async (receipt, tokenAddress) => {
      // Refetch specific reward queries based on token
      if (tokenAddress === wethAddress) {
        await Promise.all([
          staking.outstandingRewardsWeth.refetch(),
          staking.claimableRewardsWeth.refetch(),
        ])
      } else {
        await Promise.all([
          staking.outstandingRewardsStaking.refetch(),
          staking.claimableRewardsStaking.refetch(),
        ])
      }
      await Promise.all([staking.poolData.refetch(), staking.userData.refetch()])
      onAccrueSuccess?.(receipt)
    },
    onError: onAccrueError,
  })

  // Accrue all rewards mutation (multicall)
  const accrueAllRewards = useMutation({
    mutationFn: async () => {
      if (!stakeService) throw new Error('Stake service is not connected')

      const tokenAddresses: `0x${string}`[] = []
      if (clankerToken) tokenAddresses.push(clankerToken)
      if (wethAddress) tokenAddresses.push(wethAddress)

      return stakeService.accrueAllRewards(tokenAddresses)
    },
    onSuccess: async (receipt) => {
      await Promise.all([
        staking.outstandingRewardsStaking.refetch(),
        staking.outstandingRewardsWeth.refetch(),
        staking.claimableRewardsStaking.refetch(),
        staking.claimableRewardsWeth.refetch(),
        staking.poolData.refetch(),
        staking.userData.refetch(),
      ])
      onAccrueSuccess?.(receipt)
    },
    onError: onAccrueError,
  })

  // Combine outstanding rewards (for accrual display)
  const outstandingRewards = useMemo(() => {
    const stakingRewards = staking.outstandingRewardsStaking.data
    const wethRewards = staking.outstandingRewardsWeth.data

    if (!stakingRewards) return null

    return {
      staking: stakingRewards,
      weth: wethRewards,
    }
  }, [staking.outstandingRewardsStaking.data, staking.outstandingRewardsWeth.data])

  // Combine claimable rewards (for user display)
  const claimableRewards = useMemo(() => {
    const stakingRewards = staking.claimableRewardsStaking.data
    const wethRewards = staking.claimableRewardsWeth.data

    if (!stakingRewards) return null

    return {
      staking: stakingRewards,
      weth: wethRewards,
    }
  }, [staking.claimableRewardsStaking.data, staking.claimableRewardsWeth.data])

  // Helper to check if approval is needed for an amount
  const nA = (amount: string | number): boolean => {
    if (!project.data || staking.allowance.data === undefined) return false
    return needsApproval(staking.allowance.data.formatted, amount, project.data.token.decimals)
  }

  return {
    // Mutations
    approve,
    stake,
    unstake,
    claim,
    accrueRewards,
    accrueAllRewards,

    // Queries from context (grouped by multicall)
    allowance: staking.allowance,
    poolData: staking.poolData,
    userData: staking.userData,
    outstandingRewardsStaking: staking.outstandingRewardsStaking,
    outstandingRewardsWeth: staking.outstandingRewardsWeth,
    claimableRewardsStaking: staking.claimableRewardsStaking,
    claimableRewardsWeth: staking.claimableRewardsWeth,
    balances,

    // Helpers
    needsApproval: nA,

    // Convenience accessors for individual values
    tokenBalance: balances.data?.token,
    stakedBalance: staking.userData.data?.stakedBalance,
    totalStaked: staking.poolData.data?.totalStaked,
    escrowBalance: staking.poolData.data?.escrowBalance,
    streamParams: staking.poolData.data?.streamParams,
    rewardRatePerSecond: staking.poolData.data?.rewardRatePerSecond,
    aprBps: staking.userData.data?.aprBps,
    wethRewardRate: null, // TODO: Add to provider if needed
    aprBpsWeth: null, // TODO: Add to provider if needed
    rewardsData: outstandingRewards, // For accrual display
    claimableData: claimableRewards, // For user claimable amounts

    // Loading states
    isLoadingPoolData: staking.poolData.isLoading,
    isLoadingUserData: staking.userData.isLoading,
    isLoadingOutstandingRewards:
      staking.outstandingRewardsStaking.isLoading || staking.outstandingRewardsWeth.isLoading,
    isLoadingClaimableRewards:
      staking.claimableRewardsStaking.isLoading || staking.claimableRewardsWeth.isLoading,
    isLoadingBalances: balances.isLoading,
  }
}
