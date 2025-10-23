'use client'

import { useMutation } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'

import type { SplitConfigUI } from '../../fee-receivers'
import { configureSplitsAndUpdateRecipient } from '../../fee-receivers'

export type SplitConfig = SplitConfigUI

export type UpdateSplitterParams = {
  clankerToken: `0x${string}`
  splits: readonly SplitConfigUI[]
  rewardIndex: bigint | number
}

export type UseConfigureSplitsParams = {
  onConfigureSplitsSuccess?: (hash: `0x${string}`) => void
  onUpdateRecipientSuccess?: (hash: `0x${string}`) => void
  onRecipientAlreadyActive?: () => void
  onSplitsUnchanged?: () => void
  onSuccess?: (hash?: `0x${string}`) => void
  onError?: (error: Error) => void
}

export function useConfigureSplits({
  onConfigureSplitsSuccess,
  onUpdateRecipientSuccess,
  onRecipientAlreadyActive,
  onSplitsUnchanged,
  onSuccess,
  onError,
}: UseConfigureSplitsParams = {}) {
  const publicClient = usePublicClient()
  const wallet = useWalletClient()
  const chainId = publicClient?.chain?.id

  return useMutation({
    mutationFn: async (params: UpdateSplitterParams) => {
      // Use the smart flow that checks if splits/recipient updates are needed
      const result = await configureSplitsAndUpdateRecipient({
        walletClient: wallet.data!,
        publicClient: publicClient!,
        clankerToken: params.clankerToken,
        chainId: chainId!,
        splits: params.splits,
        rewardIndex: params.rewardIndex,
      })

      // Notify if splits were configured
      if (result.configureSplitsReceipt) {
        onConfigureSplitsSuccess?.(result.configureSplitsReceipt.transactionHash)
      } else if (result.splitsWereUnchanged) {
        onSplitsUnchanged?.()
      }

      // Notify if recipient was updated
      if (result.updateRecipientReceipt) {
        onUpdateRecipientSuccess?.(result.updateRecipientReceipt.transactionHash)
      } else if (result.recipientWasAlreadyActive) {
        onRecipientAlreadyActive?.()
      }

      // Return the final hash (prefer update, then configure, or undefined if nothing changed)
      return (
        result.updateRecipientReceipt?.transactionHash ??
        result.configureSplitsReceipt?.transactionHash
      )
    },
    onSuccess: async (hash) => {
      onSuccess?.(hash)
    },
    onError: onError,
  })
}
