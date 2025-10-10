'use client'

import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'

import type { ProposalsParams, ProposalsResult } from '../../proposals'
import { proposals } from '../../proposals'

export type UseProposalsParams = Omit<ProposalsParams, 'publicClient'> & {
  enabled?: boolean
}

/**
 * Hook for fetching proposals from a governor contract
 * @param params - Hook parameters
 * @returns Query for proposals data
 */
export function useProposals({
  governorAddress,
  tokenDecimals = 18,
  fromBlock,
  toBlock = 'latest',
  pageSize = 50,
  blockRangeLimit = 10000,
  enabled = true,
}: UseProposalsParams) {
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: [
      'proposals',
      governorAddress,
      tokenDecimals,
      fromBlock?.toString(),
      toBlock?.toString(),
      pageSize,
      blockRangeLimit,
    ],
    queryFn: async (): Promise<ProposalsResult> => {
      if (!publicClient) throw new Error('Public client not connected')

      return await proposals({
        publicClient,
        governorAddress,
        tokenDecimals,
        fromBlock,
        toBlock,
        pageSize,
        blockRangeLimit,
      })
    },
    enabled: enabled && !!publicClient && !!governorAddress,
    retry: 1,
    staleTime: 5000, // 5 seconds - allows quick refetch after invalidation
    refetchInterval: 30000, // 30 seconds
  })
}
