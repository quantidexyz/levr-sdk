'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi'

import type { UpdateFeeReceiverParams } from '../../fee-receivers'
import { feeReceivers, updateFeeReceiver } from '../../fee-receivers'
import { useLevrContext } from '../levr-provider'
import { queryKeys } from '../query-keys'

export type UseFeeReceiversQueryParams = {
  clankerToken: Address | null
  enabled?: boolean
}

/**
 * Internal: Creates fee receivers query with all logic
 * Used by LevrProvider
 */
export function useFeeReceiversQuery({
  clankerToken,
  enabled: e = true,
}: UseFeeReceiversQueryParams) {
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { address: userAddress } = useAccount()

  return useQuery({
    queryKey: queryKeys.feeReceivers(clankerToken!, userAddress, chainId),
    queryFn: () =>
      feeReceivers({
        publicClient: publicClient!,
        clankerToken: clankerToken!,
        chainId: chainId!,
        userAddress,
      }),
    enabled: e && !!publicClient && !!chainId && !!clankerToken,
    staleTime: 15_000,
  })
}

// ========================================
// PUBLIC HOOK (exported from index.ts)
// ========================================

export type UseFeeReceiversParams = {
  clankerToken?: `0x${string}` | undefined
  enabled?: boolean
  onSuccess?: (hash: `0x${string}`) => void
  onError?: (error: unknown) => void
}

/**
 * Hook to access fee receivers query and mutations
 * Returns both query data and mutation function
 */
export function useFeeReceivers({
  clankerToken: _clankerToken,
  enabled: _e = true,
  onSuccess,
  onError,
}: UseFeeReceiversParams = {}) {
  const { feeReceivers: query, refetch } = useLevrContext()
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
      await refetch.feeReceivers()
      onSuccess?.(hash)
    },
    onError: onError,
  })

  return {
    query,
    mutate,
  }
}
