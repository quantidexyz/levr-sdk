'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { usePublicClient } from 'wagmi'

import type { ProposalsParams } from '../../proposals'
import { proposals as proposalsListQuery } from '../../proposals'
import { queryKeys } from '../query-keys'

export type UseProposalsParams = Omit<ProposalsParams, 'publicClient'> & {
  enabled?: boolean
}

export type UseProposalsQueryParams = {
  governorAddress?: Address
  tokenDecimals?: number
  enabled?: boolean
}

/**
 * Internal: Creates proposals query with all logic
 * Used by LevrProvider
 */
export function useProposalsQuery({
  governorAddress,
  tokenDecimals = 18,
  enabled: e = true,
}: UseProposalsQueryParams) {
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: queryKeys.proposals(governorAddress!, tokenDecimals, undefined, 'latest', 50),
    queryFn: async () => {
      if (!publicClient || !governorAddress) return null
      return proposalsListQuery({
        publicClient,
        governorAddress,
        tokenDecimals,
        fromBlock: undefined,
        toBlock: 'latest',
        pageSize: 50,
      })
    },
    enabled: e && !!publicClient && !!governorAddress,
    retry: 1,
    staleTime: 5000,
    refetchInterval: 30000,
  })
}
