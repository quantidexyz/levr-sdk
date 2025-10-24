'use client'

import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'

import type { AirdropStatus, Project } from '../..'
import { getAirdropStatus } from '../../airdrop'

export type UseAirdropStatusQueryParams = {
  project?: Project | null
  enabled?: boolean
  ipfsSearchUrl?: string // Full URL to /api/ipfs-search
  ipfsJsonUrl?: string // Full URL to /api/ipfs-json
}

/**
 * Hook to fetch airdrop status for a treasury
 * This should be called separately from project data
 */
export function useAirdropStatusQuery({
  project,
  enabled: e = true,
  ipfsSearchUrl,
  ipfsJsonUrl,
}: UseAirdropStatusQueryParams) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id

  const enabled = !!publicClient && !!project && !!chainId && e

  return useQuery<AirdropStatus | null>({
    queryKey: ['airdrop-status', project?.token.address, chainId, ipfsSearchUrl, ipfsJsonUrl],
    enabled,
    queryFn: () => {
      if (!publicClient || !project) return null
      return getAirdropStatus(
        publicClient,
        project.token.address,
        project.treasury,
        project.token.decimals,
        project.pricing?.tokenUsd ? parseFloat(project.pricing.tokenUsd) : null,
        ipfsSearchUrl,
        ipfsJsonUrl
      )
    },
    staleTime: 30_000, // 30 seconds cache
  })
}
