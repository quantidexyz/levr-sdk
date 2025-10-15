'use client'

import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'

import type { AirdropStatus, Project } from '../..'
import { getTreasuryAirdropStatus } from '../../treasury'

export type UseAirdropStatusQueryParams = {
  project?: Project | null
  enabled?: boolean
}

/**
 * Hook to fetch airdrop status for a treasury
 * This should be called separately from project data
 */
export function useAirdropStatusQuery({ project, enabled: e = true }: UseAirdropStatusQueryParams) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id

  const enabled = !!publicClient && !!project && !!chainId && e

  return useQuery<AirdropStatus | null>({
    queryKey: ['airdrop-status', project?.token.address, chainId],
    enabled,
    queryFn: () =>
      getTreasuryAirdropStatus(
        publicClient!,
        project?.token.address!,
        project?.treasury!,
        project?.token.decimals!,
        project?.pricing?.tokenUsd ? parseFloat(project?.pricing?.tokenUsd) : null
      ),
    staleTime: 30_000, // 30 seconds cache
  })
}
