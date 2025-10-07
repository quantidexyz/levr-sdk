import { erc20Abi, zeroAddress } from 'viem'
import type { ExtractAbiItem, Log } from 'viem'

import { IClankerToken, LevrFactory_v1 } from './abis'
import { WETH } from './constants'
import type { PoolInfo, Project, ProjectMetadata } from './project'
import type { PopPublicClient } from './types'

export type ProjectsParams = {
  publicClient: PopPublicClient
  factoryAddress: `0x${string}`
  chainId: number
  fromBlock?: bigint
  toBlock?: bigint | 'latest'
  pageSize?: number
  blockRangeLimit?: number
}

export type ProjectsResult = {
  projects: Omit<Project, 'forwarder'>[]
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

/**
 * Get multiple projects data
 */
export async function projects({
  publicClient,
  factoryAddress,
  chainId,
  fromBlock,
  toBlock = 'latest',
  pageSize = 100,
  blockRangeLimit = 10000,
}: ProjectsParams): Promise<ProjectsResult> {
  if (Object.values({ publicClient, factoryAddress, chainId }).some((value) => !value)) {
    throw new Error('Invalid projects params')
  }

  // Determine block range
  const latestBlock = await publicClient.getBlockNumber()
  const from = fromBlock ?? 0n
  const to = toBlock === 'latest' ? latestBlock : toBlock

  // Fetch Registered events in chunks to avoid RPC limits
  // Start from recent blocks and work backwards for faster results
  const limit = BigInt(blockRangeLimit)
  const chunks: Array<{ from: bigint; to: bigint }> = []

  // Create chunk ranges working backwards from latest block
  let currentTo = to
  while (currentTo >= from) {
    const currentFrom = currentTo - limit + 1n < from ? from : currentTo - limit + 1n
    chunks.push({ from: currentFrom, to: currentTo })

    // Stop creating chunks if we have enough for reasonable pagination
    if (chunks.length >= 10) break

    currentTo = currentFrom - 1n
  }

  // Fetch all chunks in parallel
  const allLogs: RegisteredEvent[] = []

  // Process chunks in batches to avoid overwhelming the RPC
  const batchSize = 5
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(
        (chunk) =>
          publicClient.getLogs({
            address: factoryAddress,
            event: registeredEvent,
            fromBlock: chunk.from,
            toBlock: chunk.to,
          }) as Promise<RegisteredEvent[]>
      )
    )

    // Flatten and add to all logs
    for (const chunkLogs of batchResults) {
      allLogs.push(...chunkLogs)
    }

    // Stop if we have enough logs for pagination
    if (allLogs.length >= pageSize) {
      break
    }
  }

  // Sort by block number descending (most recent first)
  const logs = allLogs.sort((a, b) => {
    if (a.blockNumber > b.blockNumber) return -1
    if (a.blockNumber < b.blockNumber) return 1
    return 0
  })

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
      address: factoryAddress,
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
      abi: IClankerToken,
      functionName: 'metadata' as const,
    },
    {
      address: token,
      abi: IClankerToken,
      functionName: 'imageUrl' as const,
    },
  ])

  const results = await publicClient.multicall({ contracts })

  // Parse results into Project objects
  const projects: Omit<Project, 'forwarder'>[] = []
  const callsPerProject = 7

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
    const imageUrl = results[offset + 6].result as string | undefined

    // Parse metadata JSON
    let parsedMetadata: ProjectMetadata | null = null
    if (metadataStr) {
      try {
        parsedMetadata = JSON.parse(metadataStr)
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
        const isTokenCurrency0 = clankerTokens[i].toLowerCase() < wethAddress.toLowerCase()

        // Standard Clanker V4 pool configuration
        const fee = 3000 // 0.3% fee
        const tickSpacing = 60

        poolInfo = {
          poolKey: {
            currency0: isTokenCurrency0 ? clankerTokens[i] : wethAddress,
            currency1: isTokenCurrency0 ? wethAddress : clankerTokens[i],
            fee,
            tickSpacing,
            hooks: clankerTokens[i], // Token acts as the hook in Clanker V4
          },
          feeDisplay: `${(fee / 10000).toFixed(2)}%`,
          numPositions: 0n, // Would need separate query for actual count
        }
      }
    } catch {
      // If construction fails, poolInfo remains undefined
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
        imageUrl,
      },
      pool: poolInfo,
    })
  }

  return {
    projects,
    fromBlock: from,
    toBlock: to,
  }
}
