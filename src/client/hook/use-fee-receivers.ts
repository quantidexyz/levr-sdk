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

export type FeeReceiverAdmin = {
  areYouAnAdmin: boolean
  admin: `0x${string}`
  recipient: `0x${string}`
  percentage: number
}

/**
 * Hook to access fee receivers query and mutations
 * Returns both query data and mutation function
 * Fee receivers come from project.feeReceivers
 */
export function useFeeReceivers({
  clankerToken: _clankerToken,
  enabled: _e = true,
  onSuccess,
  onError,
}: UseFeeReceiversParams = {}) {
  const { project, refetch, userAddress } = useLevrContext()
  const publicClient = usePublicClient()
  const wallet = useWalletClient()
  const chainId = publicClient?.chain?.id

  // Add user-specific admin check to fee receivers from project
  const feeReceiversWithAdmin: FeeReceiverAdmin[] | undefined = project.data?.feeReceivers?.map(
    (receiver) => ({
      ...receiver,
      areYouAnAdmin: userAddress
        ? receiver.admin.toLowerCase() === userAddress.toLowerCase()
        : false,
    })
  )

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
    data: feeReceiversWithAdmin,
    isLoading: project.isLoading,
    error: project.error,
    mutate,
  }
}
