'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'

import { updateTokenAdmin, updateTokenImage, updateTokenMetadata } from '../../token-admin'
import { queryKeys } from '../query-keys'

export type UseTokenAdminParams = {
  onUpdateMetadataSuccess?: (hash: `0x${string}`) => void
  onUpdateMetadataError?: (error: unknown) => void
  onUpdateImageSuccess?: (hash: `0x${string}`) => void
  onUpdateImageError?: (error: unknown) => void
  onUpdateAdminSuccess?: (hash: `0x${string}`) => void
  onUpdateAdminError?: (error: unknown) => void
}

/**
 * Hook for token admin operations (update metadata, image, transfer admin)
 * Requires the connected wallet to be the current token admin
 */
export function useTokenAdmin({
  onUpdateMetadataSuccess,
  onUpdateMetadataError,
  onUpdateImageSuccess,
  onUpdateImageError,
  onUpdateAdminSuccess,
  onUpdateAdminError,
}: UseTokenAdminParams = {}) {
  const publicClient = usePublicClient()
  const wallet = useWalletClient()
  const queryClient = useQueryClient()

  const updateMetadataMutation = useMutation({
    mutationFn: async ({
      clankerToken,
      metadata,
    }: {
      clankerToken: `0x${string}`
      metadata: string
    }) => {
      if (!wallet.data || !publicClient) {
        throw new Error('Wallet or public client not available')
      }

      return updateTokenMetadata({
        walletClient: wallet.data,
        publicClient,
        clankerToken,
        metadata,
      })
    },
    onSuccess: async (receipt, variables) => {
      // Invalidate project query to refresh metadata
      const chainId = publicClient?.chain?.id
      if (chainId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.project(variables.clankerToken, chainId),
        })
      }
      onUpdateMetadataSuccess?.(receipt.transactionHash)
    },
    onError: onUpdateMetadataError,
  })

  const updateImageMutation = useMutation({
    mutationFn: async ({
      clankerToken,
      imageUrl,
    }: {
      clankerToken: `0x${string}`
      imageUrl: string
    }) => {
      if (!wallet.data || !publicClient) {
        throw new Error('Wallet or public client not available')
      }

      return updateTokenImage({
        walletClient: wallet.data,
        publicClient,
        clankerToken,
        imageUrl,
      })
    },
    onSuccess: async (receipt, variables) => {
      // Invalidate project query to refresh image
      const chainId = publicClient?.chain?.id
      if (chainId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.project(variables.clankerToken, chainId),
        })
      }
      onUpdateImageSuccess?.(receipt.transactionHash)
    },
    onError: onUpdateImageError,
  })

  const updateAdminMutation = useMutation({
    mutationFn: async ({
      clankerToken,
      newAdmin,
    }: {
      clankerToken: `0x${string}`
      newAdmin: `0x${string}`
    }) => {
      if (!wallet.data || !publicClient) {
        throw new Error('Wallet or public client not available')
      }

      return updateTokenAdmin({
        walletClient: wallet.data,
        publicClient,
        clankerToken,
        newAdmin,
      })
    },
    onSuccess: async (receipt, variables) => {
      // Invalidate project query to refresh admin
      const chainId = publicClient?.chain?.id
      if (chainId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.project(variables.clankerToken, chainId),
        })
      }
      onUpdateAdminSuccess?.(receipt.transactionHash)
    },
    onError: onUpdateAdminError,
  })

  return {
    updateMetadata: updateMetadataMutation,
    updateImage: updateImageMutation,
    updateAdmin: updateAdminMutation,
  }
}
