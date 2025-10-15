'use client'

import { useQuery } from '@tanstack/react-query'
import { Clanker } from 'clanker-sdk/v4'
import { usePublicClient, useWalletClient } from 'wagmi'

import { queryKeys } from '../query-keys'

/**
 * Hook to get Clanker SDK instance
 */
export function useClanker() {
  const publicClient = usePublicClient()
  const { data: wallet } = useWalletClient()

  return useQuery({
    queryKey: queryKeys.clanker(publicClient?.chain.id, wallet?.account?.address),
    queryFn: () => {
      try {
        return new Clanker({ publicClient: publicClient!, wallet: wallet! })
      } catch {
        return null
      }
    },
    enabled: !!publicClient && !!wallet,
  })
}
