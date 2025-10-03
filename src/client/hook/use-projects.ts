'use client'

import { useQuery } from '@tanstack/react-query'
import { erc20Abi, zeroAddress } from 'viem'
import type { ExtractAbiItem, Log } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import { IClankerTokenABI, LevrFactory_v1 } from '../../abis'
import { GET_FACTORY_ADDRESS } from '../../constants'
import type { Project, ProjectMetadata } from './use-project'

export type UseProjectsParams = {
  enabled?: boolean
  fromBlock?: bigint
  toBlock?: bigint | 'latest'
  pageSize?: number
}

export type ProjectsResult = {
  projects: Project[]
  fromBlock: bigint
  toBlock: bigint
}

type RegisteredEvent = Log<
  bigint,
  number,
  false,
  ExtractAbiItem<typeof LevrFactory_v1, 'Registered'>,
  false
>

const registeredEvent = LevrFactory_v1.find(
  (item) => item.type === 'event' && item.name === 'Registered'
)

export function useProjects({
  enabled: e = true,
  fromBlock,
  toBlock = 'latest',
  pageSize = 100,
}: UseProjectsParams = {}) {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)

  const enabled = !!publicClient && !!factoryAddress && e

  return useQuery<ProjectsResult>({
    queryKey: ['projects', factoryAddress, chainId, fromBlock, toBlock, pageSize],
    enabled,
    queryFn: async () => {
      // Determine block range
      const latestBlock = await publicClient!.getBlockNumber()
      const from = fromBlock ?? 0n
      const to = toBlock === 'latest' ? latestBlock : toBlock

      // Fetch Registered events
      const logs = (await publicClient!.getLogs({
        address: factoryAddress!,
        event: registeredEvent,
        fromBlock: from,
        toBlock: to,
      })) as RegisteredEvent[]

      // Limit to pageSize
      const limitedLogs = logs.slice(0, pageSize)

      if (limitedLogs.length === 0) {
        return {
          projects: [],
          fromBlock: from,
          toBlock: to,
        }
      }

      // Extract unique clanker tokens
      const clankerTokens = limitedLogs.map((log) => log.args.clankerToken!)

      // Batch fetch all project contracts and token metadata
      const contracts = clankerTokens.flatMap((token) => [
        // Project contracts
        {
          address: factoryAddress!,
          abi: LevrFactory_v1,
          functionName: 'getProjectContracts' as const,
          args: [token],
        },
        // Token metadata
        {
          address: token,
          abi: erc20Abi,
          functionName: 'decimals' as const,
        },
        {
          address: token,
          abi: erc20Abi,
          functionName: 'name' as const,
        },
        {
          address: token,
          abi: erc20Abi,
          functionName: 'symbol' as const,
        },
        {
          address: token,
          abi: erc20Abi,
          functionName: 'totalSupply' as const,
        },
        {
          address: token,
          abi: IClankerTokenABI,
          functionName: 'metadata' as const,
        },
      ])

      const results = await publicClient!.multicall({ contracts })

      // Parse results into Project objects
      const projects: Project[] = []
      const callsPerProject = 6

      for (let i = 0; i < clankerTokens.length; i++) {
        const offset = i * callsPerProject
        const projectResult = results[offset].result as {
          treasury: `0x${string}`
          governor: `0x${string}`
          staking: `0x${string}`
          stakedToken: `0x${string}`
        }

        // Skip if project not registered
        if (
          [
            projectResult.treasury,
            projectResult.governor,
            projectResult.staking,
            projectResult.stakedToken,
          ].some((a) => a === zeroAddress)
        ) {
          continue
        }

        const decimals = results[offset + 1].result as number
        const name = results[offset + 2].result as string
        const symbol = results[offset + 3].result as string
        const totalSupply = results[offset + 4].result as bigint
        const metadataStr = results[offset + 5].result as string | undefined

        // Parse metadata JSON
        let parsedMetadata: ProjectMetadata | null = null
        if (metadataStr) {
          try {
            parsedMetadata = JSON.parse(metadataStr)
          } catch {
            // If parsing fails, leave as null
          }
        }

        projects.push({
          treasury: projectResult.treasury,
          governor: projectResult.governor,
          staking: projectResult.staking,
          stakedToken: projectResult.stakedToken,
          token: {
            address: clankerTokens[i],
            decimals,
            name,
            symbol,
            totalSupply,
            metadata: parsedMetadata,
          },
        })
      }

      return {
        projects,
        fromBlock: from,
        toBlock: to,
      }
    },
    staleTime: 30_000,
  })
}
