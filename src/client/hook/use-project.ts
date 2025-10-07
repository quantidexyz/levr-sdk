'use client'

import { useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient } from 'wagmi'

import { GET_FACTORY_ADDRESS } from '../../constants'
import { project } from '../../project'
import type { Project } from '../../project'

export type UseProjectParams = {
  clankerToken?: `0x${string}`
  enabled?: boolean
}

export function useProject({ clankerToken, enabled: e = true }: UseProjectParams) {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)

  const enabled = !!publicClient && !!factoryAddress && !!clankerToken && e

  return useQuery<Project | null>({
    queryKey: ['project', factoryAddress, clankerToken, chainId],
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
