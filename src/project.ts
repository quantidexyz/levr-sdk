import { erc20Abi, zeroAddress } from 'viem'

import { IClankerToken, LevrFactory_v1, LevrGovernor_v1 } from './abis'
import { formatBalanceWithUsd } from './balance'
import { GET_FACTORY_ADDRESS } from './constants'
import type { FeeReceiverAdmin } from './fee-receivers'
import { getTokenRewards, parseFeeReceivers } from './fee-receivers'
import type { BalanceResult, PoolKey, PopPublicClient, PricingResult } from './types'
import { getUsdPrice, getWethUsdPrice } from './usd-price'

export type ProjectParams = {
  publicClient: PopPublicClient
  clankerToken: `0x${string}`
  oraclePublicClient?: PopPublicClient
  userAddress?: `0x${string}`
}

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

export type TreasuryStats = {
  balance: BalanceResult
  totalAllocated: BalanceResult
  utilization: number // percentage (0-100)
}

export type Project = {
  chainId: number
  treasury: `0x${string}`
  governor: `0x${string}`
  staking: `0x${string}`
  stakedToken: `0x${string}`
  forwarder: `0x${string}`
  factory: `0x${string}`
  currentCycleId: bigint
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
  treasuryStats?: TreasuryStats
  feeReceivers?: FeeReceiverAdmin[]
  pricing?: PricingResult
}

/**
 * Get project data for a clanker token
 */
export async function project({
  publicClient,
  clankerToken,
  oraclePublicClient,
  userAddress,
}: ProjectParams): Promise<Project | null> {
  if (Object.values({ publicClient, clankerToken }).some((value) => !value)) {
    throw new Error('Invalid project params')
  }

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const factoryAddress = GET_FACTORY_ADDRESS(chainId)
  if (!factoryAddress) throw new Error('Factory address not found')

  const { treasury, governor, staking, stakedToken } = await publicClient.readContract({
    address: factoryAddress,
    abi: LevrFactory_v1,
    functionName: 'getProjectContracts',
    args: [clankerToken],
  })

  if ([treasury, governor, staking, stakedToken].some((a) => a === zeroAddress)) return null

  // Fetch token metadata, forwarder, treasury stats, and governance data using multicall
  const multicallResults = await publicClient.multicall({
    contracts: [
      {
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'decimals',
      },
      {
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'name',
      },
      {
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'symbol',
      },
      {
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'totalSupply',
      },
      {
        address: clankerToken,
        abi: IClankerToken,
        functionName: 'metadata',
      },
      {
        address: clankerToken,
        abi: IClankerToken,
        functionName: 'imageUrl',
      },
      {
        address: factoryAddress,
        abi: LevrFactory_v1,
        functionName: 'trustedForwarder',
      },
      // Treasury stats
      {
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [treasury],
      },
      {
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [staking],
      },
      // Governance data
      {
        address: governor,
        abi: LevrGovernor_v1,
        functionName: 'currentCycleId',
      },
    ],
  })

  const decimals = multicallResults[0]
  const name = multicallResults[1]
  const symbol = multicallResults[2]
  const totalSupply = multicallResults[3]
  const metadata = multicallResults[4]
  const imageUrl = multicallResults[5]
  const forwarder = multicallResults[6]
  const treasuryBalance = multicallResults[7]
  const stakingBalance = multicallResults[8]
  const currentCycleId = multicallResults[9]

  // Parse metadata JSON
  let parsedMetadata: ProjectMetadata | null = null
  if (metadata.result && typeof metadata.result === 'string') {
    try {
      parsedMetadata = JSON.parse(metadata.result)
    } catch {
      // If parsing fails, leave as null
    }
  }

  // Extract pool information and fee receivers from LP locker
  let poolInfo: PoolInfo | undefined
  let feeReceivers: FeeReceiverAdmin[] | undefined
  try {
    // Use shared utility to get tokenRewards (no duplication)
    const tokenRewards = await getTokenRewards(publicClient, clankerToken)

    const poolKey = tokenRewards.poolKey
    poolInfo = {
      poolKey,
      feeDisplay: poolKey.fee === 0x800000 ? 'Dynamic' : `${(poolKey.fee / 10000).toFixed(2)}%`,
      numPositions: tokenRewards.numPositions,
    }

    // Parse fee receivers using shared utility (no logic duplication)
    // Pass userAddress so areYouAnAdmin works out of the box
    feeReceivers = parseFeeReceivers(tokenRewards, userAddress)
  } catch {
    // If reading fails (e.g., token not deployed through Clanker), poolInfo remains undefined
  }

  // Calculate treasury stats
  const tokenDecimals = decimals.result as number
  const treasuryBalanceRaw = treasuryBalance.result as bigint
  const stakingBalanceRaw = stakingBalance.result as bigint
  const totalSupplyRaw = totalSupply.result as bigint

  // Total allocated = treasury + staking balances (protocol-controlled tokens)
  const totalAllocatedRaw = treasuryBalanceRaw + stakingBalanceRaw

  // Utilization = (total allocated / total supply) * 100
  const utilization =
    totalSupplyRaw > 0n
      ? Number((totalAllocatedRaw * 10000n) / totalSupplyRaw) / 100 // Convert to percentage
      : 0

  // Fetch pricing data if oracle client is provided and pool exists
  let pricing: PricingResult | undefined

  if (oraclePublicClient && poolInfo) {
    try {
      const [wethUsdData, tokenUsdData] = await Promise.all([
        getWethUsdPrice({ publicClient: oraclePublicClient }),
        getUsdPrice({
          oraclePublicClient,
          quotePublicClient: publicClient,
          tokenAddress: clankerToken,
          quoteFee: poolInfo.poolKey.fee,
          quoteTickSpacing: poolInfo.poolKey.tickSpacing,
          quoteHooks: poolInfo.poolKey.hooks,
        }),
      ])

      pricing = {
        wethUsd: wethUsdData.priceUsd,
        tokenUsd: tokenUsdData.priceUsd,
      }
    } catch (error) {
      // If pricing fails, continue without it (graceful degradation)
      console.warn('Failed to fetch USD pricing:', error)
    }
  }

  // Calculate USD values for treasury stats if pricing is available
  const tokenUsdPrice = pricing ? parseFloat(pricing.tokenUsd) : null

  const treasuryStats: TreasuryStats = {
    balance: formatBalanceWithUsd(treasuryBalanceRaw, tokenDecimals, tokenUsdPrice),
    totalAllocated: formatBalanceWithUsd(totalAllocatedRaw, tokenDecimals, tokenUsdPrice),
    utilization,
  }

  return {
    chainId,
    treasury,
    governor,
    staking,
    stakedToken,
    forwarder: forwarder.result as `0x${string}`,
    factory: factoryAddress,
    currentCycleId: currentCycleId.result as bigint,
    token: {
      address: clankerToken,
      decimals: tokenDecimals,
      name: name.result as string,
      symbol: symbol.result as string,
      totalSupply: totalSupplyRaw,
      metadata: parsedMetadata,
      imageUrl: imageUrl.result as string | undefined,
    },
    pool: poolInfo,
    treasuryStats,
    feeReceivers,
    pricing,
  }
}
