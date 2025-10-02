'use client'

import { useQuery } from '@tanstack/react-query'
import { zeroAddress } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import { LevrFactory_v1 } from '../../abis'
import { GET_FACTORY_ADDRESS } from '../../constants'

export type Project = {
  treasury: `0x${string}`
  governor: `0x${string}`
  staking: `0x${string}`
  stakedToken: `0x${string}`
}

export type UseProjectParams = {
  clankerToken?: `0x${string}`
  enabled?: boolean
}

export function useProject({ clankerToken, enabled: e }: UseProjectParams) {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)

  const enabled = !!publicClient && !!factoryAddress && !!clankerToken && (e ?? true)

  return useQuery<Project | null>({
    queryKey: ['project', factoryAddress, clankerToken, chainId],
    enabled,
    queryFn: async () => {
      const { treasury, governor, staking, stakedToken } = await publicClient!.readContract({
        address: factoryAddress!,
        abi: LevrFactory_v1,
        functionName: 'getProjectContracts',
        args: [clankerToken!],
      })

      if ([treasury, governor, staking, stakedToken].some((a) => a === zeroAddress)) return null

      return { treasury, governor, staking, stakedToken }
    },
    staleTime: 15_000,
  })
}
