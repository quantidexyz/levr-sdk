'use client'

import { useQuery } from '@tanstack/react-query'
import { erc20Abi, zeroAddress } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import { IClankerToken, LevrFactory_v1 } from '../../abis'
import { GET_FACTORY_ADDRESS, WETH } from '../../constants'
import type { PoolKey } from '../../types'

export type ProjectMetadata = {
  description: string
  socialMediaUrls: []
  auditUrls: []
}

export type PoolInfo = {
  poolKey: PoolKey
  feeDisplay: string
  numPositions: bigint
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
  pool?: PoolInfo
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

      // Extract pool information
      // Clanker V4 tokens are always paired with WETH and use the token as the hook
      let poolInfo: PoolInfo | undefined
      try {
        const wethAddress = WETH(chainId)?.address
        if (wethAddress) {
          // Determine currency ordering (currency0 < currency1)
          const isTokenCurrency0 = clankerToken!.toLowerCase() < wethAddress.toLowerCase()

          // Standard Clanker V4 pool configuration
          const fee = 3000 // 0.3% fee
          const tickSpacing = 60

          poolInfo = {
            poolKey: {
              currency0: isTokenCurrency0 ? clankerToken! : wethAddress,
              currency1: isTokenCurrency0 ? wethAddress : clankerToken!,
              fee,
              tickSpacing,
              hooks: clankerToken!, // Token acts as the hook in Clanker V4
            },
            feeDisplay: `${(fee / 10000).toFixed(2)}%`,
            numPositions: 0n, // Would need separate query for actual count
          }
        }
      } catch {
        // If construction fails, poolInfo remains undefined
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
        pool: poolInfo,
      }
    },
    staleTime: 15_000,
  })
}
