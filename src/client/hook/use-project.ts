'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import type { ProjectsParams, ProjectsResult } from '../..'
import { getProject, getProjects } from '../../project'
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
  const { address: userAddress } = useAccount()
  const chainId = publicClient?.chain?.id

  const enabled = !!publicClient && !!clankerToken && !!chainId && e

  return useQuery({
    queryKey: queryKeys.project(clankerToken!, chainId!),
    enabled,
    queryFn: () =>
      getProject({
        publicClient: publicClient!,
        clankerToken: clankerToken!,
        oraclePublicClient: oraclePublicClient,
        userAddress, // Pass userAddress so areYouAnAdmin works out of the box
      }),
    staleTime: 300_000, // 5 minutes cache for pricing data
  })
}

export type UseProjectsParams = {
  enabled?: boolean
} & Omit<ProjectsParams, 'publicClient' | 'factoryAddress' | 'chainId'>

export function useProjects({
  enabled: e = true,
  fromBlock,
  pageSize,
  toBlock,
}: UseProjectsParams = {}) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain.id

  const enabled = !!publicClient && !!chainId && e

  return useQuery<ProjectsResult>({
    queryKey: ['projects', chainId, fromBlock, pageSize, toBlock],
    enabled,
    queryFn: () =>
      getProjects({
        publicClient: publicClient!,
        fromBlock,
        pageSize,
        toBlock,
      }),
    staleTime: 30_000,
  })
}
