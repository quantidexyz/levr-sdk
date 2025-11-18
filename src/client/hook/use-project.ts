'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import type { ProjectsParams, ProjectsResult, RegisteredStaticProject, StaticProject } from '../..'
import { getProject, getProjects, getStaticProject } from '../../project'
import type { PopPublicClient } from '../../types'
import { queryKeys } from '../query-keys'

export type UseStaticProjectQueryParams = {
  clankerToken: Address | null
  enabled?: boolean
}

/**
 * Internal: Fetches static project data that doesn't change frequently
 * Only refetches when the token address changes
 */
export function useStaticProjectQuery({
  clankerToken,
  enabled: e = true,
}: UseStaticProjectQueryParams) {
  const publicClient = usePublicClient()
  const { address: userAddress } = useAccount()
  const chainId = publicClient?.chain?.id

  const enabled = !!publicClient && !!clankerToken && !!chainId && e

  return useQuery<StaticProject | null>({
    queryKey: queryKeys.staticProject(clankerToken!, chainId!, userAddress ?? null),
    enabled,
    queryFn: () =>
      getStaticProject({
        publicClient: publicClient!,
        clankerToken: clankerToken!,
        userAddress, // Pass userAddress so areYouAnAdmin works out of the box
      }),
    staleTime: Infinity, // Static data never goes stale automatically
  })
}

export type UseProjectQueryParams = {
  clankerToken: Address | null
  oraclePublicClient: PopPublicClient
  enabled?: boolean
}

/**
 * Internal: Creates project query with all logic
 * Used by LevrProvider
 * Fetches dynamic stats (treasury, staking, governance, pricing) using static data from useStaticProjectQuery
 */
export function useProjectQuery({
  clankerToken,
  oraclePublicClient,
  enabled: e = true,
}: UseProjectQueryParams) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id

  // Fetch static data (only refetches when token changes)
  const { data: staticProject, refetch: refetchStatic } = useStaticProjectQuery({
    clankerToken,
    enabled: e,
  })

  const registeredStaticProject = staticProject?.isRegistered
    ? (staticProject as RegisteredStaticProject)
    : null

  const enabled = !!publicClient && !!clankerToken && !!chainId && !!registeredStaticProject && e

  const query = useQuery({
    queryKey: queryKeys.project(clankerToken!, chainId!),
    enabled,
    queryFn: () =>
      getProject({
        publicClient: publicClient!,
        staticProject: registeredStaticProject!,
        oraclePublicClient: oraclePublicClient,
      }),
    staleTime: 30_000, // 30 seconds cache for dynamic data
  })

  return {
    ...query,
    refetchStatic,
  }
}

export type UseProjectsParams = {
  enabled?: boolean
} & Omit<ProjectsParams, 'publicClient'>

export function useProjects({ enabled: e = true, offset, limit }: UseProjectsParams = {}) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain.id

  const enabled = !!publicClient && !!chainId && e

  return useQuery<ProjectsResult>({
    queryKey: ['projects', chainId, offset, limit],
    enabled,
    queryFn: () =>
      getProjects({
        publicClient: publicClient!,
        offset,
        limit,
      }),
    staleTime: 30_000,
  })
}
