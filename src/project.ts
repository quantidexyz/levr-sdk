import { erc20Abi, zeroAddress } from 'viem'

import { IClankerToken, LevrFactory_v1, LevrGovernor_v1, LevrStaking_v1 } from './abis'
import { formatBalanceWithUsd } from './balance'
import { GET_FACTORY_ADDRESS, WETH } from './constants'
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

export type StakingStats = {
  totalStaked: BalanceResult
  apr: {
    token: { raw: bigint; percentage: number }
    weth: { raw: bigint; percentage: number } | null
  }
  outstandingRewards: {
    staking: {
      available: BalanceResult
      pending: BalanceResult
    }
    weth: {
      available: BalanceResult
      pending: BalanceResult
    } | null
  }
  rewardRates: {
    token: BalanceResult
    weth: BalanceResult | null
  }
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
  stakingStats?: StakingStats
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

  const wethAddress = WETH(chainId)?.address

  // Fetch token metadata, forwarder, treasury stats, governance data, and staking pool stats using multicall
  const contracts: any[] = [
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
    // Staking pool stats (pool-level, same for all users)
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'totalStaked',
    },
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'aprBps',
    },
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'outstandingRewards',
      args: [clankerToken],
    },
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'rewardRatePerSecond',
      args: [clankerToken],
    },
    ...(wethAddress
      ? [
          {
            address: staking,
            abi: LevrStaking_v1,
            functionName: 'outstandingRewards' as const,
            args: [wethAddress],
          },
          {
            address: staking,
            abi: LevrStaking_v1,
            functionName: 'rewardRatePerSecond' as const,
            args: [wethAddress],
          },
        ]
      : []),
  ]

  const multicallResults = await publicClient.multicall({ contracts })

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
  const totalStaked = multicallResults[10]
  const aprBps = multicallResults[11]
  const outstandingRewardsToken = multicallResults[12]
  const tokenRewardRate = multicallResults[13]
  const outstandingRewardsWeth = wethAddress ? multicallResults[14] : null
  const wethRewardRate = wethAddress ? multicallResults[15] : null

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
  const wethUsdPrice = pricing ? parseFloat(pricing.wethUsd) : null

  const treasuryStats: TreasuryStats = {
    balance: formatBalanceWithUsd(treasuryBalanceRaw, tokenDecimals, tokenUsdPrice),
    totalAllocated: formatBalanceWithUsd(totalAllocatedRaw, tokenDecimals, tokenUsdPrice),
    utilization,
  }

  // Calculate staking pool stats
  const totalStakedRaw = totalStaked.result as bigint
  const aprBpsRaw = aprBps.result as bigint
  const outstandingRewardsTokenRaw = outstandingRewardsToken.result as [bigint, bigint]
  const tokenRewardRateRaw = tokenRewardRate.result as bigint

  // Calculate WETH APR if available
  let wethApr: { raw: bigint; percentage: number } | null = null
  let outstandingRewardsWethRaw: [bigint, bigint] | null = null
  let wethRewardRateRaw: bigint | null = null

  if (wethAddress && outstandingRewardsWeth && wethRewardRate) {
    outstandingRewardsWethRaw = outstandingRewardsWeth.result as [bigint, bigint]
    wethRewardRateRaw = wethRewardRate.result as bigint

    if (pricing && totalStakedRaw > 0n) {
      const wethUsd = parseFloat(pricing.wethUsd)
      const tokenUsd = parseFloat(pricing.tokenUsd)

      if (tokenUsd > 0) {
        const wethPriceInTokens = wethUsd / tokenUsd
        const secondsPerYear = BigInt(365 * 24 * 60 * 60)
        const annualWethRewards = wethRewardRateRaw * secondsPerYear

        const priceScaleFactor = BigInt(1e18)
        const wethPriceScaled = BigInt(Math.floor(wethPriceInTokens * Number(priceScaleFactor)))
        const annualRewardsInUnderlying = (annualWethRewards * wethPriceScaled) / priceScaleFactor

        const aprBpsWeth =
          totalStakedRaw > 0n ? (annualRewardsInUnderlying * 10000n) / totalStakedRaw : 0n
        wethApr = {
          raw: aprBpsWeth,
          percentage: Number(aprBpsWeth) / 100,
        }
      }
    }
  }

  const stakingStats: StakingStats = {
    totalStaked: formatBalanceWithUsd(totalStakedRaw, tokenDecimals, tokenUsdPrice),
    apr: {
      token: {
        raw: aprBpsRaw,
        percentage: Number(aprBpsRaw) / 100,
      },
      weth: wethApr,
    },
    outstandingRewards: {
      staking: {
        available: formatBalanceWithUsd(
          outstandingRewardsTokenRaw[0],
          tokenDecimals,
          tokenUsdPrice
        ),
        pending: formatBalanceWithUsd(outstandingRewardsTokenRaw[1], tokenDecimals, tokenUsdPrice),
      },
      weth:
        outstandingRewardsWethRaw && wethAddress
          ? {
              available: formatBalanceWithUsd(outstandingRewardsWethRaw[0], 18, wethUsdPrice),
              pending: formatBalanceWithUsd(outstandingRewardsWethRaw[1], 18, wethUsdPrice),
            }
          : null,
    },
    rewardRates: {
      token: formatBalanceWithUsd(tokenRewardRateRaw, tokenDecimals, tokenUsdPrice),
      weth:
        wethRewardRateRaw !== null
          ? formatBalanceWithUsd(wethRewardRateRaw, 18, wethUsdPrice)
          : null,
    },
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
    stakingStats,
    feeReceivers,
    pricing,
  }
}
