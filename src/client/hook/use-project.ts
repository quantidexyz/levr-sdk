'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { usePublicClient } from 'wagmi'

import { project } from '../../project'
import type { PopPublicClient } from '../../types'
import { queryKeys } from '../query-keys'

export type UseProjectQueryParams = {
  clankerToken: Address | null
  oraclePublicClient: PopPublicClient
  enabled?: boolean
}

/**
 * Internal: Creates project query with all logic
 * Used by LevrProvider
 */
export function useProjectQuery({
  clankerToken,
  oraclePublicClient,
  enabled: e = true,
}: UseProjectQueryParams) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id

  const enabled = !!publicClient && !!clankerToken && !!chainId && e

  return useQuery({
    queryKey: queryKeys.project(clankerToken!, chainId!),
    enabled,
    queryFn: async () => {
      return project({
        publicClient: publicClient!,
        clankerToken: clankerToken!,
        oraclePublicClient: oraclePublicClient,
      })
    },
    staleTime: 300_000, // 5 minutes cache for pricing data
  })
}
