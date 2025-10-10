'use client'

import { useQuery } from '@tanstack/react-query'
import { Clanker } from 'clanker-sdk/v4'
import type { Address } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { IClankerToken } from '../../abis'
import { useLevrContext } from '../levr-provider'
import { queryKeys } from '../query-keys'

export type UseClankerTokenQueryParams = {
  clankerToken: Address | null
  enabled?: boolean
}

/**
 * Internal: Creates clanker token metadata query
 * Used by LevrProvider
 */
export function useClankerTokenQuery({
  clankerToken,
  enabled: e = true,
}: UseClankerTokenQueryParams) {
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: queryKeys.clankerToken(clankerToken!),
    queryFn: async () => {
      const allData = await publicClient?.readContract({
        address: clankerToken!,
        abi: IClankerToken,
        functionName: 'allData',
      })

      if (!allData) return null

      const [originalAdmin, admin, image, metadata, context] = allData

      return {
        originalAdmin,
        admin,
        image,
        metadata,
        context,
      }
    },
    enabled: e && !!clankerToken && !!publicClient,
  })
}

// ========================================
// PUBLIC HOOK (exported from index.ts)
// ========================================

/**
 * Hook to get Clanker SDK instance
 * For token metadata, use useClankerToken() from index.ts
 */
export function useClanker(_clankerToken?: `0x${string}`) {
  const publicClient = usePublicClient()
  const { data: wallet } = useWalletClient()

  return useQuery({
    queryKey: queryKeys.clanker(publicClient?.chain.id, wallet?.account?.address),
    queryFn: () => {
      try {
        return new Clanker({ publicClient: publicClient!, wallet: wallet! })
      } catch {
        return null
      }
    },
    enabled: !!publicClient && !!wallet,
  })
}
