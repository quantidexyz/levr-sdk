'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { TransactionReceipt } from 'viem'
import { useChainId, usePublicClient, useWalletClient } from 'wagmi'

import { WETH } from '../../constants'
import { Stake } from '../../stake'
import type { ClaimParams } from '../../stake'
import { needsApproval } from '../../util'
import { useBalance } from './use-balance'
import { useProject } from './use-project'

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

export function useStake({
  clankerToken,
  enabled = true,

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
}: UseStakeParams) {
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const address = wallet.data?.account?.address

  const project = useProject({ clankerToken })

  // Create StakeService instance with shared parameters
  const stakeService = useMemo(() => {
    if (!wallet.data || !publicClient || !project.data) {
      return null
    }
    return new Stake({
      wallet: wallet.data,
      publicClient,
      stakingAddress: project.data.staking,
      tokenAddress: project.data.token.address,
      tokenDecimals: project.data.token.decimals,
      trustedForwarder: project.data.forwarder,
    })
  }, [wallet.dataUpdatedAt, publicClient, project.dataUpdatedAt])

  // Query: Token balance
  const balances = useBalance({
    tokens:
      project.data && clankerToken
        ? [{ address: clankerToken, decimals: project.data.token.decimals, key: 'token' }]
        : [],
    enabled: enabled && !!project.data && !!clankerToken,
  })

  // Approve mutation
  const approve = useMutation({
    mutationFn: async (amount: number | string | bigint) => {
      if (!stakeService) throw new Error('Stake service is not connected')

      return stakeService.approve(amount)
    },
    onSuccess: (receipt) => {
      // Auto-refetch allowance after successful approval
      allowance.refetch()
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
    onSuccess: (receipt) => {
      // Auto-refetch after successful stake
      allowance.refetch()
      poolData.refetch()
      userData.refetch()
      balances.refetch()
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
    onSuccess: (receipt) => {
      // Auto-refetch after successful unstake
      poolData.refetch()
      userData.refetch()
      balances.refetch()
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
    onSuccess: (receipt) => {
      // Auto-refetch after successful claim
      poolData.refetch()
      userData.refetch()
      balances.refetch()
      claimableRewardsStaking.refetch()
      claimableRewardsWeth.refetch()
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
    onSuccess: (receipt, tokenAddress) => {
      // Auto-refetch after successful accrual
      if (tokenAddress === wethAddress) {
        outstandingRewardsWeth.refetch()
        claimableRewardsWeth.refetch()
      } else {
        outstandingRewardsStaking.refetch()
        claimableRewardsStaking.refetch()
      }
      poolData.refetch()
      userData.refetch()
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
    onSuccess: (receipt) => {
      // Auto-refetch all reward queries after successful accrual
      outstandingRewardsStaking.refetch()
      outstandingRewardsWeth.refetch()
      claimableRewardsStaking.refetch()
      claimableRewardsWeth.refetch()
      poolData.refetch()
      userData.refetch()
      onAccrueSuccess?.(receipt)
    },
    onError: onAccrueError,
  })

  // Query: Allowance
  const allowance = useQuery({
    queryKey: ['staking', 'allowance', project.data?.token.address, project.data?.staking, address],
    queryFn: async () => {
      return stakeService!.getAllowance()
    },
    enabled: enabled && !!publicClient && !!project.data && !!address && !!stakeService,
  })

  // Query: Pool-level data (multicall for efficiency)
  const poolData = useQuery({
    queryKey: ['staking', 'poolData', project.data?.staking, project.data?.token.address],
    queryFn: async () => {
      return stakeService!.getPoolData()
    },
    enabled: enabled && !!publicClient && !!project.data && !!stakeService,
  })

  // Query: User-specific data (multicall for efficiency)
  const userData = useQuery({
    queryKey: ['staking', 'userData', project.data?.staking, address],
    queryFn: async () => {
      return stakeService!.getUserData()
    },
    enabled: enabled && !!publicClient && !!project.data && !!address && !!stakeService,
  })

  // Get WETH address for the current chain
  const wethAddress = WETH(chainId)?.address

  // Query: Outstanding rewards for staking token
  const outstandingRewardsStaking = useQuery({
    queryKey: [
      'staking',
      'outstandingRewards',
      project.data?.staking,
      project.data?.token.address,
      address,
    ],
    queryFn: async () => {
      return stakeService!.getOutstandingRewards()
    },
    enabled: enabled && !!publicClient && !!project.data && !!address && !!stakeService,
  })

  // Query: Outstanding rewards for WETH (paired token)
  const outstandingRewardsWeth = useQuery({
    queryKey: ['staking', 'outstandingRewards', project.data?.staking, wethAddress, address],
    queryFn: async () => {
      if (!wethAddress) return null
      return stakeService!.getOutstandingRewards(wethAddress)
    },
    enabled:
      enabled && !!publicClient && !!project.data && !!address && !!stakeService && !!wethAddress,
  })

  // Query: Claimable rewards for staking token
  const claimableRewardsStaking = useQuery({
    queryKey: [
      'staking',
      'claimableRewards',
      project.data?.staking,
      project.data?.token.address,
      address,
    ],
    queryFn: async () => {
      return stakeService!.getClaimableRewards()
    },
    enabled: enabled && !!publicClient && !!project.data && !!address && !!stakeService,
    refetchInterval: 5000, // Refetch every 5 seconds to show streaming progress
  })

  // Query: Claimable rewards for WETH (paired token)
  const claimableRewardsWeth = useQuery({
    queryKey: ['staking', 'claimableRewards', project.data?.staking, wethAddress, address],
    queryFn: async () => {
      if (!wethAddress) return null
      return stakeService!.getClaimableRewards(wethAddress)
    },
    enabled:
      enabled && !!publicClient && !!project.data && !!address && !!stakeService && !!wethAddress,
    refetchInterval: 5000, // Refetch every 5 seconds to show streaming progress
  })

  // Query: WETH reward rate per second
  const wethRewardRate = useQuery({
    queryKey: ['staking', 'wethRewardRate', project.data?.staking, wethAddress],
    queryFn: async () => {
      if (!wethAddress) return null
      return stakeService!.getRewardRatePerSecond(wethAddress)
    },
    enabled: enabled && !!publicClient && !!project.data && !!stakeService && !!wethAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Combine outstanding rewards (for accrual display)
  const outstandingRewards = useMemo(() => {
    const stakingRewards = outstandingRewardsStaking.data
    const wethRewards = outstandingRewardsWeth.data

    if (!stakingRewards) return null

    return {
      staking: stakingRewards,
      weth: wethRewards,
    }
  }, [outstandingRewardsStaking.data, outstandingRewardsWeth.data])

  // Combine claimable rewards (for user display)
  const claimableRewards = useMemo(() => {
    const stakingRewards = claimableRewardsStaking.data
    const wethRewards = claimableRewardsWeth.data

    if (!stakingRewards) return null

    return {
      staking: stakingRewards,
      weth: wethRewards,
    }
  }, [claimableRewardsStaking.data, claimableRewardsWeth.data])

  // Helper to check if approval is needed for an amount
  const nA = (amount: string | number): boolean => {
    if (!project.data || allowance.data === undefined) return false
    return needsApproval(allowance.data.formatted, amount, project.data.token.decimals)
  }

  return {
    // Mutations
    approve,
    stake,
    unstake,
    claim,
    accrueRewards,
    accrueAllRewards,

    // Queries (grouped by multicall)
    allowance,
    poolData,
    userData,
    outstandingRewardsStaking,
    outstandingRewardsWeth,
    claimableRewardsStaking,
    claimableRewardsWeth,
    wethRewardRate,
    balances,

    // Helpers
    needsApproval: nA,

    // Convenience accessors for individual values
    tokenBalance: balances.data?.token,
    stakedBalance: userData.data?.stakedBalance,
    totalStaked: poolData.data?.totalStaked,
    escrowBalance: poolData.data?.escrowBalance,
    streamParams: poolData.data?.streamParams,
    rewardRatePerSecond: poolData.data?.rewardRatePerSecond,
    aprBps: userData.data?.aprBps,
    aprBpsWeth: userData.data?.aprBpsWeth,
    rewardsData: outstandingRewards, // For accrual display
    claimableData: claimableRewards, // For user claimable amounts

    // Loading states
    isLoadingPoolData: poolData.isLoading,
    isLoadingUserData: userData.isLoading,
    isLoadingOutstandingRewards:
      outstandingRewardsStaking.isLoading || outstandingRewardsWeth.isLoading,
    isLoadingClaimableRewards: claimableRewardsStaking.isLoading || claimableRewardsWeth.isLoading,
    isLoadingBalances: balances.isLoading,
  }
}
