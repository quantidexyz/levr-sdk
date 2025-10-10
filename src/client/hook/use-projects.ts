'use client'

import { useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient } from 'wagmi'

import { GET_FACTORY_ADDRESS } from '../../constants'
import type { ProjectsParams, ProjectsResult } from '../../projects'
import { projects } from '../../projects'

export type UseProjectsParams = {
  enabled?: boolean
} & Omit<ProjectsParams, 'publicClient' | 'factoryAddress' | 'chainId'>

export function useProjects({ enabled: e = true, ...params }: UseProjectsParams = {}) {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)

  const enabled = !!publicClient && !!factoryAddress && e

  return useQuery<ProjectsResult>({
    queryKey: ['projects', factoryAddress, chainId, params],
    enabled,
    queryFn: () =>
      projects({
        publicClient: publicClient!,
        factoryAddress: factoryAddress!,
        chainId: chainId!,
        ...params,
      }),
    staleTime: 30_000,
  })
}
