'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import { GET_FACTORY_ADDRESS } from '../../constants'
import { project } from '../../project'
import { queryKeys } from '../query-keys'

export type UseProjectQueryParams = {
  clankerToken: Address | null
  enabled?: boolean
}

/**
 * Internal: Creates project query with all logic
 * Used by LevrProvider
 */
export function useProjectQuery({ clankerToken, enabled: e = true }: UseProjectQueryParams) {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)

  const enabled = !!publicClient && !!factoryAddress && !!clankerToken && e

  return useQuery({
    queryKey: queryKeys.project(factoryAddress!, clankerToken!, chainId!),
    enabled,
    queryFn: async () => {
      return project({
        publicClient: publicClient!,
        factoryAddress: factoryAddress!,
        chainId: chainId!,
        clankerToken: clankerToken!,
      })
    },
    staleTime: 15_000,
  })
}
