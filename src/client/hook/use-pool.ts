'use client'

import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'

import type { PoolData } from '../../pool'
import { pool } from '../../pool'
import type { Project } from '../../project'
import { queryKeys } from '../query-keys'

export type UsePoolQueryParams = {
  project: Project | null | undefined
  enabled?: boolean
}

/**
 * Internal: Creates pool query with pool-specific data
 * Used by LevrProvider
 */
export function usePoolQuery({ project: projectData, enabled: e = true }: UsePoolQueryParams) {
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: queryKeys.pool(projectData?.pool?.poolKey),
    queryFn: async (): Promise<PoolData | null> => {
      if (!projectData) return null

      return pool({
        publicClient: publicClient!,
        project: projectData,
      })
    },
    enabled: e && !!publicClient && !!projectData?.pool?.poolKey,
    staleTime: 30_000, // Pool data changes less frequently
    refetchInterval: 30_000,
  })
}
