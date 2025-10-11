import type { ExtractAbiItem, Log } from 'viem'
import { erc20Abi, formatUnits, zeroAddress } from 'viem'

import { IClankerToken, LevrFactory_v1 } from './abis'
import { WETH } from './constants'
import type { PoolInfo, Project, ProjectMetadata, TreasuryStats } from './project'
import type { PopPublicClient } from './types'

export type ProjectsParams = {
  publicClient: PopPublicClient
  factoryAddress: `0x${string}`
  chainId: number
  fromBlock?: bigint
  toBlock?: bigint | 'latest'
  pageSize?: number
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
}: ProjectsParams): Promise<ProjectsResult> {
  if (Object.values({ publicClient, factoryAddress, chainId }).some((value) => !value)) {
    throw new Error('Invalid projects params')
  }

  // Determine block range
  const latestBlock = await publicClient.getBlockNumber()
  const from = fromBlock ?? latestBlock - latestBlock / 10n // Default to last 10% of blocks
  const to = toBlock === 'latest' ? latestBlock : toBlock

  // Fetch Registered events - indexed events are efficient even across large ranges
  const allLogs = (await publicClient.getLogs({
    address: factoryAddress,
    event: registeredEvent,
    fromBlock: from,
    toBlock: to,
  })) as RegisteredEvent[]

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

  // First, get project contracts for all tokens
  const projectContracts = await publicClient.multicall({
    contracts: clankerTokens.map((token) => ({
      address: factoryAddress,
      abi: LevrFactory_v1,
      functionName: 'getProjectContracts' as const,
      args: [token],
    })),
  })

  // Filter out unregistered projects and prepare valid tokens with their contracts
  const validTokensWithContracts = clankerTokens
    .map((token, index) => {
      const projectResult = projectContracts[index].result as {
        treasury: `0x${string}`
        governor: `0x${string}`
        staking: `0x${string}`
        stakedToken: `0x${string}`
      }

      if (
        [
          projectResult.treasury,
          projectResult.governor,
          projectResult.staking,
          projectResult.stakedToken,
        ].some((a) => a === zeroAddress)
      ) {
        return null
      }

      return { token, contracts: projectResult }
    })
    .filter(Boolean) as Array<{
    token: `0x${string}`
    contracts: {
      treasury: `0x${string}`
      governor: `0x${string}`
      staking: `0x${string}`
      stakedToken: `0x${string}`
    }
  }>

  if (validTokensWithContracts.length === 0) {
    return {
      projects: [],
      fromBlock: from,
      toBlock: to,
    }
  }

  // Batch fetch all token metadata and treasury stats
  const contracts = validTokensWithContracts.flatMap(({ token, contracts }) => [
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
    // Treasury stats
    {
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [contracts.treasury],
    },
    {
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [contracts.staking],
    },
  ])

  const results = await publicClient.multicall({ contracts })

  // Parse results into Project objects
  const projects: Omit<Project, 'forwarder'>[] = []
  const callsPerProject = 8 // Updated to include treasury and staking balance

  for (let i = 0; i < validTokensWithContracts.length; i++) {
    const { token, contracts: projectContracts } = validTokensWithContracts[i]
    const offset = i * callsPerProject

    const decimals = results[offset].result as number
    const name = results[offset + 1].result as string
    const symbol = results[offset + 2].result as string
    const totalSupply = results[offset + 3].result as bigint
    const metadataStr = results[offset + 4].result as string | undefined
    const imageUrl = results[offset + 5].result as string | undefined
    const treasuryBalance = results[offset + 6].result as bigint
    const stakingBalance = results[offset + 7].result as bigint

    // Parse metadata JSON
    let parsedMetadata: ProjectMetadata | null = null
    if (metadataStr) {
      try {
        parsedMetadata = JSON.parse(metadataStr)
      } catch {
        // If parsing fails, leave as null
      }
    }

    // Calculate treasury stats
    const totalAllocated = treasuryBalance + stakingBalance
    const utilization =
      totalSupply > 0n
        ? Number((totalAllocated * 10000n) / totalSupply) / 100 // Convert to percentage
        : 0

    const treasuryStats: TreasuryStats = {
      balance: {
        raw: treasuryBalance,
        formatted: formatUnits(treasuryBalance, decimals),
      },
      totalAllocated: {
        raw: totalAllocated,
        formatted: formatUnits(totalAllocated, decimals),
      },
      utilization,
    }

    // Extract pool information
    // Clanker V4 tokens are always paired with WETH and use the token as the hook
    let poolInfo: PoolInfo | undefined
    try {
      const wethAddress = WETH(chainId)?.address
      if (wethAddress) {
        // Determine currency ordering (currency0 < currency1)
        const isTokenCurrency0 = token.toLowerCase() < wethAddress.toLowerCase()

        // Standard Clanker V4 pool configuration
        const fee = 3000 // 0.3% fee
        const tickSpacing = 60

        poolInfo = {
          poolKey: {
            currency0: isTokenCurrency0 ? token : wethAddress,
            currency1: isTokenCurrency0 ? wethAddress : token,
            fee,
            tickSpacing,
            hooks: token, // Token acts as the hook in Clanker V4
          },
          feeDisplay: `${(fee / 10000).toFixed(2)}%`,
          numPositions: 0n, // Would need separate query for actual count
        }
      }
    } catch {
      // If construction fails, poolInfo remains undefined
    }

    projects.push({
      treasury: projectContracts.treasury,
      governor: projectContracts.governor,
      staking: projectContracts.staking,
      stakedToken: projectContracts.stakedToken,
      token: {
        address: token,
        decimals,
        name,
        symbol,
        totalSupply,
        metadata: parsedMetadata,
        imageUrl,
      },
      pool: poolInfo,
      treasuryStats,
    })
  }

  return {
    projects,
    fromBlock: from,
    toBlock: to,
  }
}
