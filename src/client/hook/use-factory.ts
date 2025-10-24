'use client'

import { useQuery } from '@tanstack/react-query'
import { useChainId, usePublicClient } from 'wagmi'

import { getFactoryConfig } from '../../factory'
import { useLevrContext } from '../levr-provider'
import { queryKeys } from '../query-keys'

/**
 * Hook to fetch factory configuration directly (used internally by LevrProvider)
 * @internal
 */
export function useFactoryConfigQuery(params?: { enabled?: boolean }) {
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const enabled = params?.enabled ?? true

  return useQuery({
    queryKey: queryKeys.factoryConfig(chainId),
    queryFn: async () => {
      if (!publicClient) {
        return null
      }
      return getFactoryConfig(publicClient, chainId)
    },
    enabled: enabled && !!publicClient,
    staleTime: Infinity, // Factory config never changes unless chain changes
    gcTime: 1000 * 60 * 60, // Cache for 1 hour
  })
}

/**
 * Hook to access factory config from LevrProvider
 */
export function useFactory() {
  return useLevrContext().factoryConfig
}
