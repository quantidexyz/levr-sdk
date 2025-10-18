'use client'

import { useMutation } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'

import type { UpdateFeeReceiverParams } from '../../fee-receivers'
import { updateFeeReceiver } from '../../fee-receivers'

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
  const publicClient = usePublicClient()
  const wallet = useWalletClient()
  const chainId = publicClient?.chain?.id

  return useMutation({
    mutationFn: (
      params: Omit<UpdateFeeReceiverParams, 'walletClient' | 'publicClient' | 'chainId'>
    ) =>
      updateFeeReceiver({
        walletClient: wallet.data!,
        publicClient: publicClient!,
        clankerToken: params.clankerToken,
        chainId: chainId!,
        rewardIndex: params.rewardIndex,
        newRecipient: params.newRecipient,
      }),
    onSuccess: async (receipt) => {
      onSuccess?.(receipt.transactionHash)
    },
    onError: onError,
  })
}
