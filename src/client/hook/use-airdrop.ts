'use client'

import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'

import type { AirdropStatus } from '../..'
import { getTreasuryAirdropStatus } from '../../treasury'
import { useProject } from '..'

export type UseAirdropStatusParams = {
  enabled?: boolean
}

/**
 * Hook to fetch airdrop status for a treasury
 * This should be called separately from project data
 */
export function useAirdropStatus({ enabled: e = true }: UseAirdropStatusParams = {}) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id
  const project = useProject()

  const enabled = !!publicClient && !!project.data && !!chainId && e

  return useQuery<AirdropStatus | null>({
    queryKey: ['airdrop-status', project.data?.token.address, chainId],
    enabled,
    queryFn: () =>
      getTreasuryAirdropStatus(
        publicClient!,
        project.data?.token.address!,
        project.data?.treasury!,
        project.data?.token.decimals!,
        project.data?.pricing?.tokenUsd ? parseFloat(project.data?.pricing?.tokenUsd) : null
      ),
    staleTime: 30_000, // 30 seconds cache
  })
}
