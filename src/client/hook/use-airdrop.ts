'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { usePublicClient } from 'wagmi'

import type { AirdropStatus } from '../..'
import { getTreasuryAirdropStatus } from '../../treasury'

export type UseAirdropStatusParams = {
  clankerToken: Address | null
  treasury: Address | null
  tokenDecimals: number | null
  tokenUsdPrice: number | null
  enabled?: boolean
}

/**
 * Hook to fetch airdrop status for a treasury
 * This should be called separately from project data
 */
export function useAirdropStatus({
  clankerToken,
  treasury,
  tokenDecimals,
  tokenUsdPrice,
  enabled: e = true,
}: UseAirdropStatusParams) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id

  const enabled =
    !!publicClient && !!clankerToken && !!treasury && tokenDecimals !== null && !!chainId && e

  return useQuery<AirdropStatus | null>({
    queryKey: ['airdrop-status', clankerToken, treasury, chainId],
    enabled,
    queryFn: () =>
      getTreasuryAirdropStatus(
        publicClient!,
        clankerToken!,
        treasury!,
        tokenDecimals!,
        tokenUsdPrice
      ),
    staleTime: 30_000, // 30 seconds cache
  })
}
