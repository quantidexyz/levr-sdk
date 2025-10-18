'use client'

import { useMutation } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'

import type { SplitConfigUI } from '../../fee-receivers'
import { configureSplits, updateRecipientToSplitter } from '../../fee-receivers'

export type SplitConfig = SplitConfigUI

export type UpdateSplitterParams = {
  clankerToken: `0x${string}`
  splits: readonly SplitConfigUI[]
  rewardIndex: number | bigint
  isSplitterAlreadyActive?: boolean // Skip recipient update if already active
}

export type UseConfigureSplitsParams = {
  onConfigureSplitsSuccess?: (hash: `0x${string}`) => void
  onUpdateRecipientSuccess?: (hash: `0x${string}`) => void
  onSuccess?: (hash: `0x${string}`) => void
  onError?: (error: unknown) => void
}

export function useConfigureSplits({
  onConfigureSplitsSuccess,
  onUpdateRecipientSuccess,
  onSuccess,
  onError,
}: UseConfigureSplitsParams = {}) {
  const publicClient = usePublicClient()
  const wallet = useWalletClient()
  const chainId = publicClient?.chain?.id

  return useMutation({
    mutationFn: async (params: UpdateSplitterParams) => {
      // Step 1: Configure splits (waits for receipt)
      const configureSplitsReceipt = await configureSplits({
        walletClient: wallet.data!,
        publicClient: publicClient!,
        clankerToken: params.clankerToken,
        chainId: chainId!,
        splits: params.splits,
      })

      onConfigureSplitsSuccess?.(configureSplitsReceipt.transactionHash)

      // Step 2: Update reward recipient to splitter (only if not already active)
      if (!params.isSplitterAlreadyActive) {
        const updateRecipientReceipt = await updateRecipientToSplitter({
          walletClient: wallet.data!,
          publicClient: publicClient!,
          clankerToken: params.clankerToken,
          chainId: chainId!,
          rewardIndex: params.rewardIndex,
        })

        onUpdateRecipientSuccess?.(updateRecipientReceipt.transactionHash)

        return updateRecipientReceipt.transactionHash
      }

      // If already active, just return the configure splits hash
      return configureSplitsReceipt.transactionHash
    },
    onSuccess: async (hash) => {
      onSuccess?.(hash)
    },
    onError: onError,
  })
}
