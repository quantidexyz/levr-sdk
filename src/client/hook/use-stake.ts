'use client'

import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { TransactionReceipt } from 'viem'
import { useChainId, usePublicClient, useWalletClient } from 'wagmi'

import { WETH } from '../../constants'
import type { ClaimParams } from '../../stake'
import { Stake } from '../../stake'
import { needsApproval } from '../../util'
import { useLevrContext } from '../levr-provider'

export type UseStakeParams = {
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
 * Hook to access staking data and mutations
 * All data comes from context.user, all mutations use context.stakeService
 * @throws Error if used outside LevrProvider
 */
export function useStake({
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
  const { project, user, refetch } = useLevrContext()
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const wethAddress = WETH(chainId)?.address

  // Create Stake instance for mutations (like governance does)
  const stakeService = useMemo(() => {
    if (!wallet.data || !publicClient || !project.data) {
      return null
    }
    return new Stake({
      wallet: wallet.data,
      publicClient,
      project: project.data,
    })
  }, [wallet.data, publicClient, project.data])

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

      return stakeService.accrueAllRewards({ tokens: tokenAddresses })
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

    // Helpers
    needsApproval: nA,

    // Loading states
    isLoading: user.isLoading || project.isLoading,
    isApproving: approve.isPending,
    isStaking: stake.isPending,
    isUnstaking: unstake.isPending,
    isClaiming: claim.isPending,
    isAccruing: accrueRewards.isPending || accrueAllRewards.isPending,
  }
}
