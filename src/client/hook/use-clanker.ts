'use client'

import { useQuery } from '@tanstack/react-query'
import { Clanker } from 'clanker-sdk/v4'
import { usePublicClient, useWalletClient } from 'wagmi'

import { IClankerTokenABI } from '../../abis'

/**
 * Returns a Clanker SDK instance bound to the current wagmi public and wallet clients.
 * If the wallet client is not available (disconnected), returns undefined.
 */
export function useClanker(clankerToken?: `0x${string}`) {
  const publicClient = usePublicClient()
  const { data: wallet } = useWalletClient()

  const clanker = useQuery({
    queryKey: ['clanker', publicClient?.chain.id, wallet?.account?.address],
    queryFn: () => {
      try {
        return new Clanker({ publicClient: publicClient!, wallet: wallet! })
      } catch {
        return null
      }
    },
    enabled: !!publicClient && !!wallet,
  })

  const token = useQuery({
    queryKey: ['clanker-token', clankerToken],
    queryFn: async () => {
      const allData = await publicClient?.readContract({
        address: clankerToken!,
        abi: IClankerTokenABI,
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
    enabled: !!clankerToken,
  })

  return { clanker, token }
}
