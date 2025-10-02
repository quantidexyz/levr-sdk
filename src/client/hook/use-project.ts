'use client'

import { useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient } from 'wagmi'

import { LevrFactory_v1 } from '../../abis'

export type Project = {
  treasury: `0x${string}`
  governor: `0x${string}`
  staking: `0x${string}`
  stakedToken: `0x${string}`
}

export type UseProjectParams = {
  factoryAddress?: `0x${string}`
  clankerToken?: `0x${string}`
  enabled?: boolean
}

export function useProjectContracts({
  factoryAddress,
  clankerToken,
  enabled: e,
}: UseProjectParams) {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()

  const enabled = !!publicClient && !!factoryAddress && !!clankerToken && (e ?? true)

  return useQuery<Project | null>({
    queryKey: ['project-contracts', factoryAddress, clankerToken, chainId],
    enabled,
    queryFn: async () => {
      const { treasury, governor, staking, stakedToken } = await publicClient!.readContract({
        address: factoryAddress!,
        abi: LevrFactory_v1,
        functionName: 'getProjectContracts',
        args: [clankerToken!],
      })

      return { treasury, governor, staking, stakedToken }
    },
    staleTime: 15_000,
  })
}
