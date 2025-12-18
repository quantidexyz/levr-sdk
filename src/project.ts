import { erc20Abi, zeroAddress } from 'viem'

import {
  IClankerFeeLocker,
  IClankerLpLockerFeeConversion,
  LevrFactory_v1,
  LevrStaking_v1,
} from './abis'
import { formatBalanceWithUsd } from './balance'
import {
  GET_FACTORY_ADDRESS,
  GET_FEE_LOCKER_ADDRESS,
  GET_LP_LOCKER_ADDRESS,
  WETH,
} from './constants'
import type { FeeReceiverAdmin, FeeSplitterDynamic, FeeSplitterStatic } from './fee-receivers'
import {
  getFeeReceiverContracts,
  getFeeSplitterDynamicContracts,
  getFeeSplitterStaticContracts,
  parseFeeReceivers,
  parseFeeSplitterDynamic,
  parseFeeSplitterStatic,
} from './fee-receivers'
import { getFeeSplitter } from './fee-splitter'
import { query } from './graphql'
import { getLevrProjectByIdFields, type LevrProjectByIdData } from './graphql/fields/project'
import type { BalanceResult, PoolKey, PopPublicClient, PricingResult } from './types'
import { getUsdPrice, getWethUsdPrice } from './usd-price'

// ============================================================================
// Re-export Indexed Project Data Type
// ============================================================================

/**
 * Indexed project data from the GraphQL indexer.
 * Re-exported for external use in ProjectParams.
 */
export type IndexedProjectData = LevrProjectByIdData

export type StaticProjectParams = {
  publicClient: PopPublicClient
  clankerToken: `0x${string}`
  userAddress?: `0x${string}`
}

export type ProjectParams = {
  publicClient: PopPublicClient
  staticProject: RegisteredStaticProject
  oraclePublicClient?: PopPublicClient
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
  stakingContractBalance: BalanceResult
  escrowBalance: BalanceResult // Staked principal only (excludes unaccounted rewards)
  stakingContractWethBalance?: BalanceResult
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
  streamParams: {
    windowSeconds: number
    streamStart: bigint
    streamEnd: bigint
    isActive: boolean
  }
}

export type GovernanceStats = {
  currentCycleId: bigint
  activeProposalCount: {
    boost: bigint
    transfer: bigint
  }
}

/**
 * Combined fee splitter data (static from getStaticProject + dynamic from getProject)
 */
export type FeeSplitter = FeeSplitterStatic & Partial<FeeSplitterDynamic>

export type Project = {
  chainId: number
  treasury: `0x${string}`
  governor: `0x${string}`
  staking: `0x${string}`
  stakedToken: `0x${string}`
  forwarder: `0x${string}`
  factory: `0x${string}`
  token: {
    address: `0x${string}`
    decimals: number
    name: string
    symbol: string
    totalSupply: bigint
    metadata: ProjectMetadata | null
    imageUrl?: string
    originalAdmin: `0x${string}`
    admin: `0x${string}`
    context: string
  }
  pool?: PoolInfo
  treasuryStats?: TreasuryStats
  stakingStats?: StakingStats
  governanceStats?: GovernanceStats
  feeReceivers?: FeeReceiverAdmin[]
  feeSplitter?: FeeSplitter
  pricing?: PricingResult
  blockTimestamp?: bigint
}

type StaticProjectBase = Pick<
  Project,
  'forwarder' | 'factory' | 'token' | 'feeReceivers' | 'feeSplitter'
>

export type RegisteredStaticProject = StaticProjectBase & {
  isRegistered: true
  treasury: `0x${string}`
  governor: `0x${string}`
  staking: `0x${string}`
  stakedToken: `0x${string}`
  pool?: PoolInfo
}

export type UnregisteredStaticProject = StaticProjectBase & {
  isRegistered: false
  pool?: undefined
}

export type StaticProject = RegisteredStaticProject | UnregisteredStaticProject

type FeePreferenceResult = readonly (number | undefined)[]

type FetchFeePreferencesParams = {
  publicClient: PopPublicClient
  chainId: number
  clankerToken: `0x${string}`
  slotCount: number
}

async function fetchFeePreferences({
  publicClient,
  chainId,
  clankerToken,
  slotCount,
}: FetchFeePreferencesParams): Promise<FeePreferenceResult | undefined> {
  if (!slotCount) return undefined

  const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)
  if (!lpLockerAddress) return undefined

  try {
    const contracts = Array.from({ length: slotCount }, (_, index) => ({
      address: lpLockerAddress,
      abi: IClankerLpLockerFeeConversion,
      functionName: 'feePreferences' as const,
      args: [clankerToken, BigInt(index)],
    }))

    const results = await publicClient.multicall({
      allowFailure: true,
      contracts,
    })

    const preferences: (number | undefined)[] = new Array(slotCount).fill(undefined)
    results.forEach((result, index) => {
      if (result.status === 'success') {
        preferences[index] = Number(result.result)
      }
    })

    return preferences.some((value) => value !== undefined) ? preferences : undefined
  } catch (error) {
    return undefined
  }
}

// ---
// Multicall Result Types

type MulticallResult<T> = {
  result: T
  status: 'success' | 'failure'
  error?: Error
}

type TreasuryContractsResult = [
  MulticallResult<bigint>, // treasury balance
  MulticallResult<bigint>, // staking balance (clanker token)
  MulticallResult<bigint>, // escrow balance (clanker token - staked principal only)
  MulticallResult<bigint>?, // staking balance (weth) - optional
]

type StakingContractsResult = [
  MulticallResult<bigint>, // totalStaked
  MulticallResult<bigint>, // aprBps
  MulticallResult<bigint>, // outstandingRewards (token) - now returns only available
  MulticallResult<bigint>, // rewardRatePerSecond (token)
  MulticallResult<[bigint, bigint, bigint]>, // getTokenStreamInfo (token) - returns (streamStart, streamEnd, streamTotal)
  MulticallResult<bigint>?, // outstandingRewards (weth) - optional, returns only available
  MulticallResult<bigint>?, // rewardRatePerSecond (weth) - optional
  MulticallResult<[bigint, bigint, bigint]>?, // getTokenStreamInfo (weth) - optional, returns (streamStart, streamEnd, streamTotal)
]

type PendingFeesContractsResult = [
  MulticallResult<bigint>, // pending fees for token (staking recipient)
  MulticallResult<bigint>?, // pending fees for weth (staking recipient) - optional
]

type TokenData = {
  address: `0x${string}`
  decimals: number
  name: string
  symbol: string
  totalSupply: bigint
  metadata: ProjectMetadata | null
  imageUrl?: string
  originalAdmin: `0x${string}`
  admin: `0x${string}`
  context: string
}

type FactoryData = {
  treasury: `0x${string}`
  governor: `0x${string}`
  staking: `0x${string}`
  stakedToken: `0x${string}`
  forwarder: `0x${string}`
}

// ---
// Contract Getters

function getTreasuryContracts(
  clankerToken: `0x${string}`,
  treasury: `0x${string}`,
  staking: `0x${string}`,
  wethAddress?: `0x${string}`
) {
  const contracts = [
    {
      address: clankerToken,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [treasury],
    },
    {
      address: clankerToken,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [staking],
    },
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'escrowBalance' as const,
      args: [clankerToken],
    },
  ]

  if (wethAddress) {
    contracts.push({
      address: wethAddress,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [staking],
    })
  }

  return contracts
}

function getStakingContracts(
  staking: `0x${string}`,
  clankerToken: `0x${string}`,
  wethAddress?: `0x${string}`
) {
  const baseContracts = [
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'totalStaked' as const,
    },
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'aprBps' as const,
    },
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'outstandingRewards' as const,
      args: [clankerToken],
    },
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'rewardRatePerSecond' as const,
      args: [clankerToken],
    },
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'getTokenStreamInfo' as const,
      args: [clankerToken],
    },
  ]

  const wethContracts = wethAddress
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
        {
          address: staking,
          abi: LevrStaking_v1,
          functionName: 'getTokenStreamInfo' as const,
          args: [wethAddress],
        },
      ]
    : []

  return [...baseContracts, ...wethContracts]
}

function getPendingFeesContracts(
  feeLockerAddress: `0x${string}`,
  feeRecipient: `0x${string}`,
  clankerToken: `0x${string}`,
  wethAddress?: `0x${string}`
) {
  const baseContracts = [
    {
      address: feeLockerAddress,
      abi: IClankerFeeLocker,
      functionName: 'availableFees' as const,
      args: [feeRecipient, clankerToken],
    },
  ]

  const wethContracts = wethAddress
    ? [
        {
          address: feeLockerAddress,
          abi: IClankerFeeLocker,
          functionName: 'availableFees' as const,
          args: [feeRecipient, wethAddress],
        },
      ]
    : []

  return [...baseContracts, ...wethContracts]
}

// ---
// Parsers

function parseTreasuryStats(
  results: TreasuryContractsResult,
  tokenDecimals: number,
  totalSupply: bigint,
  tokenUsdPrice: number | null,
  wethUsdPrice?: number | null
): TreasuryStats {
  const [treasuryBalance, stakingBalance, escrowBalance, stakingWethBalance] = results

  const treasuryBalanceRaw = treasuryBalance.result
  const stakingBalanceRaw = stakingBalance.result
  const escrowBalanceRaw = escrowBalance.result
  const stakingWethBalanceRaw = stakingWethBalance ? stakingWethBalance.result : null

  // Total allocated = treasury + staking balances (protocol-controlled tokens)
  const totalAllocatedRaw = treasuryBalanceRaw + stakingBalanceRaw

  // Utilization = (total allocated / total supply) * 100
  const utilizationBps = totalSupply > 0n ? (totalAllocatedRaw * 10000n) / totalSupply : 0n
  const utilization = Number(utilizationBps) / 100

  return {
    balance: formatBalanceWithUsd(treasuryBalanceRaw, tokenDecimals, tokenUsdPrice),
    totalAllocated: formatBalanceWithUsd(totalAllocatedRaw, tokenDecimals, tokenUsdPrice),
    utilization,
    stakingContractBalance: formatBalanceWithUsd(stakingBalanceRaw, tokenDecimals, tokenUsdPrice),
    escrowBalance: formatBalanceWithUsd(escrowBalanceRaw, tokenDecimals, tokenUsdPrice),
    stakingContractWethBalance: stakingWethBalanceRaw
      ? formatBalanceWithUsd(stakingWethBalanceRaw, 18, wethUsdPrice ?? null)
      : undefined,
  }
}

function parseStakingStats(
  results: StakingContractsResult,
  pendingFeesResults: PendingFeesContractsResult | null,
  tokenDecimals: number,
  tokenUsdPrice: number | null,
  wethUsdPrice: number | null,
  blockTimestamp: bigint,
  pricing?: PricingResult,
  feeSplitterPending?: { token: bigint; weth: bigint | null }
): StakingStats {
  const totalStakedRaw = results[0].result
  const aprBpsRaw = results[1].result
  const outstandingRewardsTokenAvailable = results[2].result // Now returns only available
  const tokenRewardRateRaw = results[3].result
  // Extract stream info from getTokenStreamInfo tuple (streamStart, streamEnd, streamTotal)
  const streamInfoRaw = results[4].result as [bigint, bigint, bigint]
  const tokenStreamStartRaw = streamInfoRaw[0]
  const tokenStreamEndRaw = streamInfoRaw[1]

  // Check if WETH data is present
  const hasWethData = results.length > 5
  const outstandingRewardsWethAvailable = hasWethData && results[5] ? results[5].result : null
  const wethRewardRateRaw = hasWethData && results[6] ? results[6].result : null

  // Check if token stream is currently active
  const isTokenStreamActive =
    tokenStreamStartRaw <= blockTimestamp && blockTimestamp <= tokenStreamEndRaw

  // Check if WETH stream is active (if available) and get longest active stream window
  let isWethStreamActive = false
  let wethStreamStartRaw = 0n
  let wethStreamEndRaw = 0n

  if (hasWethData && results[7]) {
    const wethStreamInfoRaw = results[7].result as [bigint, bigint, bigint]
    wethStreamStartRaw = wethStreamInfoRaw[0]
    wethStreamEndRaw = wethStreamInfoRaw[1]

    isWethStreamActive = wethStreamStartRaw <= blockTimestamp && blockTimestamp <= wethStreamEndRaw
  }

  // Stream is active if either token or WETH reward stream is active
  const isStreamActive = isTokenStreamActive || isWethStreamActive

  // Determine which stream window to display
  let displayStreamStartRaw = tokenStreamStartRaw
  let displayStreamEndRaw = tokenStreamEndRaw

  const tokenStreamDuration =
    tokenStreamEndRaw > tokenStreamStartRaw ? tokenStreamEndRaw - tokenStreamStartRaw : 0n
  const wethStreamDuration =
    wethStreamStartRaw > 0n && wethStreamEndRaw > wethStreamStartRaw
      ? wethStreamEndRaw - wethStreamStartRaw
      : 0n

  if (isTokenStreamActive && isWethStreamActive) {
    // When both streams are active, display the one that ends last
    displayStreamStartRaw =
      wethStreamEndRaw > tokenStreamEndRaw ? wethStreamStartRaw : tokenStreamStartRaw
    displayStreamEndRaw =
      wethStreamEndRaw > tokenStreamEndRaw ? wethStreamEndRaw : tokenStreamEndRaw
  } else if (isTokenStreamActive) {
    displayStreamStartRaw = tokenStreamStartRaw
    displayStreamEndRaw = tokenStreamEndRaw
  } else if (isWethStreamActive) {
    displayStreamStartRaw = wethStreamStartRaw
    displayStreamEndRaw = wethStreamEndRaw
  } else if (wethStreamDuration > tokenStreamDuration) {
    // No active streams: keep prior behaviour of showing the longer window
    displayStreamStartRaw = wethStreamStartRaw
    displayStreamEndRaw = wethStreamEndRaw
  }

  // Get pending fees from ClankerFeeLocker (staking recipient)
  const stakingPendingToken = pendingFeesResults?.[0]?.result ?? 0n
  const stakingPendingWeth = pendingFeesResults?.[1]?.result ?? 0n

  // Calculate WETH APR if available
  let wethApr: { raw: bigint; percentage: number } | null = null

  if (
    wethRewardRateRaw !== null &&
    wethRewardRateRaw !== undefined &&
    pricing &&
    totalStakedRaw > 0n
  ) {
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

  // Calculate stream window from the stream time range
  const streamWindowSecondsRaw =
    displayStreamEndRaw > displayStreamStartRaw
      ? Number(displayStreamEndRaw - displayStreamStartRaw)
      : 0

  // SECURITY FIX: Pending fees now queried for correct recipient
  // When fee splitter is active: stakingPendingToken = fee splitter's pending from ClankerFeeLocker
  // When fee splitter is NOT active: stakingPendingToken = staking's pending from ClankerFeeLocker
  // Note: feeSplitterPending is now local balance only (not from ClankerFeeLocker), so we don't add it
  const tokenPendingTotal = stakingPendingToken // Already queried for correct recipient
  const wethPendingTotal = stakingPendingWeth // Already queried for correct recipient

  return {
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
          outstandingRewardsTokenAvailable,
          tokenDecimals,
          tokenUsdPrice
        ),
        pending: formatBalanceWithUsd(tokenPendingTotal, tokenDecimals, tokenUsdPrice),
      },
      weth:
        outstandingRewardsWethAvailable !== null
          ? {
              available: formatBalanceWithUsd(outstandingRewardsWethAvailable, 18, wethUsdPrice),
              pending: formatBalanceWithUsd(wethPendingTotal, 18, wethUsdPrice),
            }
          : null,
    },
    rewardRates: {
      token: formatBalanceWithUsd(tokenRewardRateRaw, tokenDecimals, tokenUsdPrice),
      weth:
        wethRewardRateRaw !== null && wethRewardRateRaw !== undefined
          ? formatBalanceWithUsd(wethRewardRateRaw, 18, wethUsdPrice)
          : null,
    },
    streamParams: {
      windowSeconds: streamWindowSecondsRaw,
      streamStart: displayStreamStartRaw,
      streamEnd: displayStreamEndRaw,
      isActive: isStreamActive,
    },
  }
}

// ============================================================================
// Indexed Project Data
// ============================================================================

/**
 * Fetch project data from the indexer
 * Returns null if the project is not found in the indexer
 */
export async function getIndexedProject(
  chainId: number,
  clankerToken: `0x${string}`
): Promise<IndexedProjectData | null> {
  try {
    const fields = getLevrProjectByIdFields(chainId, clankerToken)
    const result = await query(fields)
    // Cast to our explicit type since the generated types can be complex
    return (result.LevrProject_by_pk as IndexedProjectData | null) ?? null
  } catch {
    return null
  }
}

// ============================================================================
// Static Project Functions
// ============================================================================

/**
 * Get static project data that doesn't change frequently
 * This includes contract addresses, token metadata, pool info, and fee receivers
 *
 * Uses indexed data for token and project data, only fetches via RPC what's not indexed
 */
export async function getStaticProject({
  publicClient,
  clankerToken,
  userAddress,
}: StaticProjectParams): Promise<StaticProject | null> {
  if (Object.values({ publicClient, clankerToken }).some((value) => !value)) {
    throw new Error('Invalid project params')
  }

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const factoryAddress = GET_FACTORY_ADDRESS(chainId)
  if (!factoryAddress) throw new Error('Factory address not found')

  // Fetch indexed data and fee splitter in parallel
  const [indexedProject, feeSplitterAddress] = await Promise.all([
    getIndexedProject(chainId, clankerToken),
    getFeeSplitter({ publicClient, clankerToken, chainId }),
  ])

  if (!indexedProject) return null

  // Parse token data from indexed project
  const indexedToken = indexedProject.clankerToken
  if (!indexedToken) return null

  let parsedMetadata: ProjectMetadata | null = null
  if (indexedToken.metadata && typeof indexedToken.metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(indexedToken.metadata)
    } catch {
      // If parsing fails, leave as null
    }
  }

  const tokenData: TokenData = {
    address: clankerToken,
    decimals: indexedToken.decimals ?? 18,
    name: indexedToken.name ?? '',
    symbol: indexedToken.symbol ?? '',
    totalSupply: indexedToken.totalSupply ? BigInt(indexedToken.totalSupply) : 0n,
    metadata: parsedMetadata,
    imageUrl: indexedToken.imageUrl ?? undefined,
    originalAdmin: (indexedToken.originalAdmin ?? zeroAddress) as `0x${string}`,
    admin: (indexedToken.admin ?? zeroAddress) as `0x${string}`,
    context: indexedToken.context ?? '',
  }

  // Parse factory data from indexed project
  const { treasury_id, governor_id, staking_id, stakedToken_id } = indexedProject
  const indexedFactory =
    treasury_id && governor_id && staking_id && stakedToken_id
      ? {
          treasury: treasury_id as `0x${string}`,
          governor: governor_id as `0x${string}`,
          staking: staking_id as `0x${string}`,
          stakedToken: stakedToken_id as `0x${string}`,
          forwarder: zeroAddress as `0x${string}`,
        }
      : null

  // Only fetch what's not in the indexer: forwarder, fee receivers, fee splitter
  const contracts = [
    // Forwarder is not indexed
    {
      address: factoryAddress,
      abi: LevrFactory_v1,
      functionName: 'trustedForwarder' as const,
    },
    // Fee receivers from LP locker (not indexed)
    ...getFeeReceiverContracts(clankerToken, chainId),
    // Fee splitter static data if available
    ...(feeSplitterAddress ? getFeeSplitterStaticContracts(clankerToken, feeSplitterAddress) : []),
  ]

  const multicallResults = await publicClient.multicall({ contracts })

  // Parse results
  let idx = 0

  // Forwarder
  const forwarderResult = multicallResults[idx] as MulticallResult<`0x${string}`>
  idx += 1

  const factoryData: FactoryData = indexedFactory
    ? { ...indexedFactory, forwarder: forwarderResult.result ?? zeroAddress }
    : {
        treasury: zeroAddress,
        governor: zeroAddress,
        staking: zeroAddress,
        stakedToken: zeroAddress,
        forwarder: forwarderResult.result ?? zeroAddress,
      }

  // Fee receivers (tokenRewards)
  const tokenRewardsResult = multicallResults[idx]
  idx += 1

  // Fee splitter static
  const feeSplitterStaticCount = feeSplitterAddress ? 3 : 0
  const feeSplitterStaticResults = feeSplitterAddress
    ? multicallResults.slice(idx, idx + feeSplitterStaticCount)
    : null
  idx += feeSplitterStaticCount

  // Check if project exists
  const { treasury, governor, staking, stakedToken } = factoryData
  const isRegistered = [treasury, governor, staking, stakedToken].every((a) => a !== zeroAddress)

  // Extract pool information and fee receivers from LP locker
  let poolInfo: PoolInfo | undefined
  let feeReceivers: FeeReceiverAdmin[] | undefined

  if (tokenRewardsResult.status === 'success') {
    const tokenRewards = tokenRewardsResult.result as {
      poolKey: PoolKey
      numPositions: bigint
      rewardAdmins?: readonly `0x${string}`[]
      rewardRecipients?: readonly `0x${string}`[]
      rewardBps?: readonly number[]
    }

    const poolKey = tokenRewards.poolKey
    poolInfo = {
      poolKey,
      feeDisplay: poolKey.fee === 0x800000 ? 'Dynamic' : `${(poolKey.fee / 10000).toFixed(2)}%`,
      numPositions: tokenRewards.numPositions,
    }

    const rewardSlotCount =
      tokenRewards.rewardRecipients?.length ??
      tokenRewards.rewardAdmins?.length ??
      tokenRewards.rewardBps?.length ??
      0

    const feePreferences =
      rewardSlotCount > 0
        ? await fetchFeePreferences({
            publicClient,
            chainId,
            clankerToken,
            slotCount: rewardSlotCount,
          })
        : undefined

    // Parse fee receivers using shared utility (no logic duplication)
    // Pass userAddress so areYouAnAdmin works out of the box
    feeReceivers = parseFeeReceivers(
      {
        rewardAdmins: tokenRewards.rewardAdmins,
        rewardRecipients: tokenRewards.rewardRecipients,
        rewardBps: tokenRewards.rewardBps,
        ...(feePreferences ? { feePreferences } : {}),
      },
      userAddress
    )
  }
  // If tokenRewards fails (e.g., token not deployed through Clanker), poolInfo remains undefined

  // Parse fee splitter static data
  let feeSplitter: FeeSplitter | undefined
  if (feeSplitterStaticResults) {
    // Get current fee recipient from fee receivers (if user is admin)
    const currentFeeRecipient = feeReceivers?.find((fr) => fr.areYouAnAdmin)?.recipient

    const parsed = parseFeeSplitterStatic(
      feeSplitterStaticResults as any,
      currentFeeRecipient,
      feeSplitterAddress
    )
    feeSplitter = parsed ?? undefined
  }

  const baseProject: StaticProjectBase = {
    forwarder: factoryData.forwarder,
    factory: factoryAddress,
    token: tokenData,
    feeReceivers,
    feeSplitter,
  }

  if (!isRegistered) {
    return {
      ...baseProject,
      isRegistered: false,
    }
  }

  return {
    ...baseProject,
    isRegistered: true,
    treasury: factoryData.treasury,
    governor: factoryData.governor,
    staking: factoryData.staking,
    stakedToken: factoryData.stakedToken,
    pool: poolInfo,
  }
}

/**
 * Get project data for a clanker token
 * Requires staticProject data to avoid refetching static information
 * Fetches dynamic data including treasury, staking stats, and pricing
 *
 * Governance stats are fetched from the indexer (no RPC calls needed)
 */
export async function getProject({
  publicClient,
  staticProject,
  oraclePublicClient,
}: ProjectParams): Promise<Project | null> {
  if (Object.values({ publicClient, staticProject }).some((value) => !value)) {
    throw new Error('Invalid project params')
  }

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const wethAddress = WETH(chainId)?.address
  const clankerToken = staticProject.token.address
  const feeSplitterAddress = staticProject.feeSplitter?.address
  const rewardTokens = wethAddress ? [clankerToken, wethAddress] : [clankerToken]

  // Determine fee recipient for pending fees query
  const feeLockerAddress = GET_FEE_LOCKER_ADDRESS(chainId)
  const stakingFeeRecipient =
    feeSplitterAddress && staticProject.feeSplitter?.isActive
      ? feeSplitterAddress
      : staticProject.staking

  // Build contract calls (governance is fetched from indexer, not RPC)
  const contracts = [
    ...getTreasuryContracts(
      clankerToken,
      staticProject.treasury,
      staticProject.staking,
      wethAddress
    ),
    ...getStakingContracts(staticProject.staking, clankerToken, wethAddress),
    ...(feeLockerAddress
      ? getPendingFeesContracts(feeLockerAddress, stakingFeeRecipient, clankerToken, wethAddress)
      : []),
    ...(feeSplitterAddress && staticProject.feeSplitter?.isActive
      ? getFeeSplitterDynamicContracts(clankerToken, feeSplitterAddress, rewardTokens)
      : []),
  ]

  // Fetch all data in parallel: indexed governance, pricing, block, and RPC multicall
  const [indexedProject, pricing, block, results] = await Promise.all([
    getIndexedProject(chainId, clankerToken),
    fetchPricing(oraclePublicClient, publicClient, staticProject),
    publicClient.getBlock(),
    publicClient.multicall({ contracts }),
  ])

  const blockTimestamp = block.timestamp

  // Calculate slice indices for multicall results
  const treasuryCount = wethAddress ? 4 : 3
  const stakingCount = wethAddress ? 8 : 5
  const pendingFeesCount = feeLockerAddress ? (wethAddress ? 2 : 1) : 0
  const feeSplitterDynamicCount =
    feeSplitterAddress && staticProject.feeSplitter?.isActive ? rewardTokens.length : 0

  let idx = 0
  const treasuryResults = results.slice(idx, idx + treasuryCount) as TreasuryContractsResult
  idx += treasuryCount

  const stakingResults = results.slice(idx, idx + stakingCount) as StakingContractsResult
  idx += stakingCount

  const pendingFeesResults =
    pendingFeesCount > 0
      ? (results.slice(idx, idx + pendingFeesCount) as PendingFeesContractsResult)
      : null
  idx += pendingFeesCount

  const feeSplitterDynamicResults =
    feeSplitterDynamicCount > 0 ? results.slice(idx, idx + feeSplitterDynamicCount) : null

  // Calculate USD values for stats
  const tokenUsdPrice = pricing ? parseFloat(pricing.tokenUsd) : null
  const wethUsdPrice = pricing ? parseFloat(pricing.wethUsd) : null

  // Parse fee splitter dynamic data
  let feeSplitter = staticProject.feeSplitter
  let feeSplitterPendingFees: { token: bigint; weth: bigint | null } | undefined

  if (feeSplitterDynamicResults && staticProject.feeSplitter) {
    const feeSplitterDynamic = parseFeeSplitterDynamic(
      feeSplitterDynamicResults as any,
      wethAddress
    )
    feeSplitter = { ...staticProject.feeSplitter, ...feeSplitterDynamic }

    if (staticProject.feeSplitter.isActive && feeSplitterDynamic.pendingFees) {
      feeSplitterPendingFees = {
        token: feeSplitterDynamic.pendingFees.token,
        weth: feeSplitterDynamic.pendingFees.weth ?? null,
      }
    }
  }

  // Parse stats
  const treasuryStats = parseTreasuryStats(
    treasuryResults,
    staticProject.token.decimals,
    staticProject.token.totalSupply,
    tokenUsdPrice,
    wethUsdPrice
  )

  const stakingStats = parseStakingStats(
    stakingResults,
    pendingFeesResults,
    staticProject.token.decimals,
    tokenUsdPrice,
    wethUsdPrice,
    blockTimestamp,
    pricing,
    feeSplitterPendingFees
  )

  // Use indexed governance data (no RPC calls needed)
  const governanceStats: GovernanceStats = indexedProject
    ? {
        currentCycleId: BigInt(indexedProject.currentCycleId ?? '1'),
        activeProposalCount: {
          boost: BigInt(indexedProject.activeBoostProposals ?? '0'),
          transfer: BigInt(indexedProject.activeTransferProposals ?? '0'),
        },
      }
    : { currentCycleId: 1n, activeProposalCount: { boost: 0n, transfer: 0n } }

  return {
    chainId,
    ...staticProject,
    treasuryStats,
    stakingStats,
    governanceStats,
    pricing,
    feeSplitter,
    blockTimestamp,
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function fetchPricing(
  oraclePublicClient: PopPublicClient | undefined,
  quotePublicClient: PopPublicClient,
  staticProject: RegisteredStaticProject
): Promise<PricingResult | undefined> {
  if (!oraclePublicClient || !staticProject.pool) return undefined

  try {
    const [wethUsdData, tokenUsdData] = await Promise.all([
      getWethUsdPrice({ publicClient: oraclePublicClient }),
      getUsdPrice({
        oraclePublicClient,
        quotePublicClient,
        tokenAddress: staticProject.token.address,
        tokenDecimals: staticProject.token.decimals,
        quoteFee: staticProject.pool.poolKey.fee,
        quoteTickSpacing: staticProject.pool.poolKey.tickSpacing,
        quoteHooks: staticProject.pool.poolKey.hooks,
      }),
    ])

    return {
      wethUsd: wethUsdData.priceUsd,
      tokenUsd: tokenUsdData.priceUsd,
    }
  } catch (error) {
    console.warn('Failed to fetch USD pricing:', error)
    return undefined
  }
}
