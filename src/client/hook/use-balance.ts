'use client'

import { useQuery } from '@tanstack/react-query'
import { erc20Abi, formatUnits } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import { LevrStaking_v1 } from '../../abis'
import { useProject } from './use-project'

export type UseBalanceParams = {
  clankerToken?: `0x${string}`
  enabled?: boolean
}

export function useBalance({ clankerToken, enabled = true }: UseBalanceParams) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const project = useProject({ clankerToken })

  const query = useQuery({
    queryKey: ['balance', clankerToken, address, project.data?.staking],
    queryFn: async () => {
      const results = await publicClient!.multicall({
        contracts: [
          {
            address: clankerToken!,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address!],
          },
          {
            address: project.data!.staking,
            abi: LevrStaking_v1,
            functionName: 'stakedBalanceOf',
            args: [address!],
          },
        ],
      })

      const [tokenBalance, stakedBalance] = results.map((r) => r.result!)
      const decimals = project.data!.token.decimals

      return {
        tokenBalance: {
          raw: tokenBalance as bigint,
          formatted: formatUnits(tokenBalance as bigint, decimals),
        },
        stakedBalance: {
          raw: stakedBalance as bigint,
          formatted: formatUnits(stakedBalance as bigint, decimals),
        },
      }
    },
    enabled: enabled && !!publicClient && !!clankerToken && !!project.data && !!address,
    refetchInterval: 10_000, // Refetch every 10 seconds
  })

  return {
    ...query,
    tokenBalance: query.data?.tokenBalance,
    stakedBalance: query.data?.stakedBalance,
  }
}
