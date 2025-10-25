import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'

import { fetchVaultData, getVaultStatus } from '../../vault'
import { queryKeys } from '../query-keys'
import { useClanker } from './use-clanker'

/**
 * Hook to fetch complete vault data for a token
 * Returns both allocation and claimable information with computed status
 * @param token - Token address
 * @param chainId - Optional chain ID
 */
export const useVault = (token: `0x${string}` | undefined, chainId?: number) => {
  const publicClient = usePublicClient()

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
 * Uses the Clanker SDK internally - pass the token to claim
 */
export const useVaultClaim = () => {
  const queryClient = useQueryClient()
  const { data: clanker } = useClanker()

  return useMutation({
    mutationFn: async (token: `0x${string}`) => {
      if (!clanker) throw new Error('Clanker SDK not initialized')

      const result = await clanker.claimVaultedTokens({ token })
      if (result.error) {
        throw result.error
      }

      // Wait for transaction receipt before returning
      if (result.txHash && clanker.publicClient) {
        const receipt = await clanker.publicClient.waitForTransactionReceipt({
          hash: result.txHash as `0x${string}`,
        })

        if (receipt.status === 'reverted') {
          throw new Error('Claim transaction reverted')
        }

        return receipt
      }

      return result.txHash
    },
    onSuccess: (_, token) => {
      // Invalidate vault queries after successful claim
      queryClient.invalidateQueries({
        queryKey: queryKeys.vault(token),
      })
    },
  })
}
