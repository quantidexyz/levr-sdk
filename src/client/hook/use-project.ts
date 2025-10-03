'use client'

import { useQuery } from '@tanstack/react-query'
import { erc20Abi, zeroAddress } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import { IClankerToken, LevrFactory_v1 } from '../../abis'
import { GET_FACTORY_ADDRESS } from '../../constants'

export type ProjectMetadata = {
  description: string
  socialMediaUrls: []
  auditUrls: []
}

export type Project = {
  treasury: `0x${string}`
  governor: `0x${string}`
  staking: `0x${string}`
  stakedToken: `0x${string}`
  token: {
    address: `0x${string}`
    decimals: number
    name: string
    symbol: string
    totalSupply: bigint
    metadata: ProjectMetadata | null
    imageUrl?: string
  }
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

      // Fetch token metadata using multicall
      const [decimals, name, symbol, totalSupply, metadata, imageUrl] =
        await publicClient!.multicall({
          contracts: [
            {
              address: clankerToken!,
              abi: erc20Abi,
              functionName: 'decimals',
            },
            {
              address: clankerToken!,
              abi: erc20Abi,
              functionName: 'name',
            },
            {
              address: clankerToken!,
              abi: erc20Abi,
              functionName: 'symbol',
            },
            {
              address: clankerToken!,
              abi: erc20Abi,
              functionName: 'totalSupply',
            },
            {
              address: clankerToken!,
              abi: IClankerToken,
              functionName: 'metadata',
            },
            {
              address: clankerToken!,
              abi: IClankerToken,
              functionName: 'imageUrl',
            },
          ],
        })

      // Parse metadata JSON
      let parsedMetadata: ProjectMetadata | null = null
      if (metadata.result && typeof metadata.result === 'string') {
        try {
          parsedMetadata = JSON.parse(metadata.result)
        } catch {
          // If parsing fails, leave as null
        }
      }

      return {
        treasury,
        governor,
        staking,
        stakedToken,
        token: {
          address: clankerToken!,
          decimals: decimals.result as number,
          name: name.result as string,
          symbol: symbol.result as string,
          totalSupply: totalSupply.result as bigint,
          metadata: parsedMetadata,
          imageUrl: imageUrl.result as string | undefined,
        },
      }
    },
    staleTime: 15_000,
  })
}
