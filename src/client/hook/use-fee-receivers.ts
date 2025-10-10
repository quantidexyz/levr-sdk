'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'

import type { UpdateFeeReceiverParams } from '../../fee-receivers'
import { feeReceivers, updateFeeReceiver } from '../../fee-receivers'

/**
 * The parameters for the useFeeReceivers hook.
 * @param clankerToken - The clanker token address.
 * @param enabled - Whether the hook is enabled.
 * @param onSuccess - The callback function to call when the mutation is successful.
 * @param onError - The callback function to call when the mutation is errored.
 */
export type UseFeeReceiversParams = {
  clankerToken: `0x${string}` | undefined
  enabled?: boolean
  onSuccess?: (hash: `0x${string}`) => void
  onError?: (error: unknown) => void
}

/**
 * Hook to get the fee receivers and update them.
 * @param FeeReceiversParams - The parameters for the hook.
 * @returns The query and mutate functions.
 */
export function useFeeReceivers({
  clankerToken,
  enabled: e = true,
  onSuccess,
  onError,
}: UseFeeReceiversParams) {
  const publicClient = usePublicClient()
  const wallet = useWalletClient()
  const chainId = publicClient?.chain?.id
  const address = wallet.data?.account?.address

  const enabled = !!publicClient && !!chainId && !!clankerToken && e

  const query = useQuery({
    queryKey: ['fee-receivers', clankerToken, address, chainId],
    enabled,
    queryFn: () =>
      feeReceivers({
        publicClient: publicClient!,
        clankerToken: clankerToken!,
        chainId: chainId!,
        userAddress: address,
      }),
    staleTime: 15_000,
  })

  const mutate = useMutation({
    mutationFn: (params: Omit<UpdateFeeReceiverParams, 'walletClient' | 'chainId'>) =>
      updateFeeReceiver({
        walletClient: wallet.data!,
        clankerToken: params.clankerToken,
        chainId: chainId!,
        rewardIndex: params.rewardIndex,
        newRecipient: params.newRecipient,
      }),
    onSuccess: (hash) => onSuccess?.(hash),
    onError: onError,
  })

  return {
    query,
    mutate,
  }
}
