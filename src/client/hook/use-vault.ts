import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PublicClient } from 'viem'

import { fetchVaultData, getVaultStatus } from '../../vault'
import { queryKeys } from '../query-keys'

/**
 * Hook to fetch complete vault data for a token
 * Returns both allocation and claimable information with computed status
 * @param publicClient - Viem public client
 * @param token - Token address
 * @param chainId - Optional chain ID
 */
export const useVault = (
  publicClient: PublicClient | undefined,
  token: `0x${string}` | undefined,
  chainId?: number
) => {
  return useQuery({
    queryKey: queryKeys.vault(token, chainId),
    queryFn: async () => {
      if (!publicClient || !token) return null
      const [data, block] = await Promise.all([
        fetchVaultData(publicClient, token, chainId),
        publicClient.getBlock({ blockTag: 'latest' }),
      ])
      if (!data) return null
      return getVaultStatus(data, Number(block.timestamp))
    },
    enabled: !!publicClient && !!token,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  })
}

/**
 * Hook to claim vaulted tokens
 * Uses the Clanker SDK directly - pass the claim function
 */
export const useVaultClaim = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      claimFn: () => Promise<{ txHash?: string; error?: any }>
      token: `0x${string}`
    }) => {
      const result = await params.claimFn()
      if (result.error) {
        throw result.error
      }
      return result.txHash
    },
    onSuccess: (_, { token }) => {
      // Invalidate vault queries after successful claim
      queryClient.invalidateQueries({
        queryKey: queryKeys.vault(token),
      })
    },
  })
}
