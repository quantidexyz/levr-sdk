'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address, TransactionReceipt } from 'viem'
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi'

import { WETH } from '../../constants'
import type { Project } from '../../project'
import type { ClaimParams } from '../../stake'
import { Stake } from '../../stake'
import { needsApproval } from '../../util'
import { useLevrContext } from '../levr-provider'
import { queryKeys } from '../query-keys'

export type UseStakingQueriesParams = {
  clankerToken: Address | null
  projectData: Project | null | undefined
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
      pricing: projectData.pricing,
    })
  }, [wallet.data, publicClient, projectData])

  const allowance = useQuery({
    queryKey: queryKeys.staking.allowance(
      projectData?.staking,
      projectData?.token.address,
      userAddress
    ),
    queryFn: async () => {
      return stakeService!.getAllowance()
    },
    enabled: e && !!publicClient && !!projectData && !!userAddress && !!stakeService,
  })

  const poolData = useQuery({
    queryKey: queryKeys.staking.poolData(projectData?.staking, projectData?.token.address),
    queryFn: async () => {
      return stakeService!.getPoolData()
    },
    enabled: e && !!publicClient && !!projectData && !!stakeService,
  })

  const userData = useQuery({
    queryKey: queryKeys.staking.userData(projectData?.staking, userAddress),
    queryFn: async () => {
      return stakeService!.getUserData()
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
      return stakeService!.getOutstandingRewards()
    },
    enabled: e && !!publicClient && !!projectData && !!userAddress && !!stakeService,
  })

  const outstandingRewardsWeth = useQuery({
    queryKey: queryKeys.staking.outstandingRewards(projectData?.staking, wethAddress, userAddress),
    queryFn: async () => {
      return stakeService!.getOutstandingRewards(wethAddress!)
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
      return stakeService!.getClaimableRewards()
    },
    enabled: e && !!publicClient && !!projectData && !!userAddress && !!stakeService,
  })

  const claimableRewardsWeth = useQuery({
    queryKey: queryKeys.staking.claimableRewards(projectData?.staking, wethAddress, userAddress),
    queryFn: async () => {
      return stakeService!.getClaimableRewards(wethAddress!)
    },
    enabled:
      e && !!publicClient && !!projectData && !!userAddress && !!stakeService && !!wethAddress,
  })

  // Query: WETH reward rate per second
  const wethRewardRate = useQuery({
    queryKey: ['staking', 'wethRewardRate', projectData?.staking, wethAddress],
    queryFn: async () => {
      return stakeService!.getRewardRatePerSecond(wethAddress!)
    },
    enabled: e && !!publicClient && !!projectData && !!stakeService && !!wethAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Query: WETH APR (calculated off-chain using pool price)
  const aprBpsWeth = useQuery({
    queryKey: [
      'staking',
      'aprBpsWeth',
      projectData?.staking,
      projectData?.pool?.poolKey,
      wethAddress,
    ],
    queryFn: async () => {
      return stakeService!.calculateWethApr()
    },
    enabled:
      e &&
      !!publicClient &&
      !!projectData &&
      !!projectData.pricing &&
      !!stakeService &&
      !!wethAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
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
    wethRewardRate,
    aprBpsWeth,
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
  const { stakeService, project, user, refetch } = useLevrContext()
  const chainId = useChainId()
  const wethAddress = WETH(chainId)?.address

  // Approve mutation
  const approve = useMutation({
    mutationFn: async (amount: number | string | bigint) => {
      if (!stakeService) throw new Error('Stake service is not connected')

      return stakeService.approve(amount)
    },
    onSuccess: async (receipt) => {
      await user.refetch() // Refetch allowance in user.staking
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
    onSuccess: async (result) => {
      await refetch.afterUnstake()
      onUnstakeSuccess?.(result.receipt)
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
      await refetch.afterClaim()
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
    onSuccess: async (receipt) => {
      await refetch.afterAccrue()
      onAccrueSuccess?.(receipt)
    },
    onError: onAccrueError,
  })

  // Accrue all rewards mutation (multicall)
  const accrueAllRewards = useMutation({
    mutationFn: async () => {
      if (!stakeService) throw new Error('Stake service is not connected')

      const tokenAddresses: `0x${string}`[] = []
      if (project.data?.token.address) tokenAddresses.push(project.data.token.address)
      if (wethAddress) tokenAddresses.push(wethAddress)

      return stakeService.accrueAllRewards(tokenAddresses)
    },
    onSuccess: async (receipt) => {
      await refetch.afterAccrue()
      onAccrueSuccess?.(receipt)
    },
    onError: onAccrueError,
  })

  // Helper to check if approval is needed for an amount
  const nA = (amount: string | number): boolean => {
    if (!project.data || !user.data?.staking.allowance) return false
    return needsApproval(user.data.staking.allowance.formatted, amount, project.data.token.decimals)
  }

  return {
    // Mutations
    approve,
    stake,
    unstake,
    claim,
    accrueRewards,
    accrueAllRewards,

    // Queries from context (new structure)
    user,
    project,

    // Helpers
    needsApproval: nA,

    // Convenience accessors for individual values
    tokenBalance: user.data?.balances.token,
    stakedBalance: user.data?.staking.stakedBalance,
    allowance: user.data?.staking.allowance,
    rewards: user.data?.staking.rewards,
    apr: user.data?.staking.apr,

    // Loading states
    isLoading: user.isLoading || project.isLoading,
    isApproving: approve.isPending,
    isStaking: stake.isPending,
    isUnstaking: unstake.isPending,
    isClaiming: claim.isPending,
    isAccruing: accrueRewards.isPending || accrueAllRewards.isPending,
  }
}
