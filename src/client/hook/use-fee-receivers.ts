'use client'

import { useMutation } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'

import type { UpdateFeeReceiverParams } from '../../fee-receivers'
import { updateFeeReceiver } from '../../fee-receivers'
import { useLevrContext } from '../levr-provider'

// Fee receivers data comes from project() multicall in src/project.ts
// The areYouAnAdmin flag is already calculated based on userAddress

// ========================================
// PUBLIC HOOK (exported from index.ts)
// ========================================

export type UseFeeReceiversParams = {
  onSuccess?: (hash: `0x${string}`) => void
  onError?: (error: unknown) => void
}

/**
 * Hook to access fee receivers and update mutations
 * Fee receivers come from project.feeReceivers (with areYouAnAdmin already calculated)
 */
export function useFeeReceivers({ onSuccess, onError }: UseFeeReceiversParams = {}) {
  const { project, refetch } = useLevrContext()
  const publicClient = usePublicClient()
  const wallet = useWalletClient()
  const chainId = publicClient?.chain?.id

  const mutate = useMutation({
    mutationFn: (params: Omit<UpdateFeeReceiverParams, 'walletClient' | 'chainId'>) =>
      updateFeeReceiver({
        walletClient: wallet.data!,
        clankerToken: params.clankerToken,
        chainId: chainId!,
        rewardIndex: params.rewardIndex,
        newRecipient: params.newRecipient,
      }),
    onSuccess: async (hash) => {
      await refetch.project() // Refetch project to update fee receivers
      onSuccess?.(hash)
    },
    onError: onError,
  })

  return {
    data: project.data?.feeReceivers, // Already has areYouAnAdmin calculated!
    isLoading: project.isLoading,
    error: project.error,
    mutate,
  }
}
