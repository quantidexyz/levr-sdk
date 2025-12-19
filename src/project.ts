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
import { getPairedTokenUsdPrice, getUsdPrice } from './usd-price'
import { isWETH } from './util'

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
}

export type ProjectMetadata = {
  description: string
  socialMediaUrls: []
  auditUrls: []
}

export type PairedTokenInfo = {
  address: `0x${string}`
  symbol: string
  decimals: number
  isNative: boolean // true if WETH (enables native ETH UX)
}

export type PoolInfo = {
  poolKey: PoolKey
  feeDisplay: string
  numPositions: bigint
  pairedToken: PairedTokenInfo
}

export type TreasuryStats = {
  balance: BalanceResult
  totalAllocated: BalanceResult
  utilization: number // percentage (0-100)
  stakingContractBalance: BalanceResult
  escrowBalance: BalanceResult // Staked principal only (excludes unaccounted rewards)
  stakingContractPairedBalance?: BalanceResult
}

export type StakingStats = {
  totalStaked: BalanceResult
  apr: {
    token: { raw: bigint; percentage: number }
    pairedToken: { raw: bigint; percentage: number } | null
  }
  outstandingRewards: {
    staking: {
      available: BalanceResult
      pending: BalanceResult
    }
    pairedToken: {
      available: BalanceResult
      pending: BalanceResult
    } | null
  }
  rewardRates: {
    token: BalanceResult
    pairedToken: BalanceResult | null
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
  MulticallResult<bigint>?, // staking balance (paired token) - optional
]

type StakingContractsResult = [
  MulticallResult<bigint>, // totalStaked
  MulticallResult<bigint>, // aprBps
  MulticallResult<bigint>, // outstandingRewards (token) - now returns only available
  MulticallResult<bigint>, // rewardRatePerSecond (token)
  MulticallResult<[bigint, bigint, bigint]>, // getTokenStreamInfo (token) - returns (streamStart, streamEnd, streamTotal)
  MulticallResult<bigint>?, // outstandingRewards (paired token) - optional, returns only available
  MulticallResult<bigint>?, // rewardRatePerSecond (paired token) - optional
  MulticallResult<[bigint, bigint, bigint]>?, // getTokenStreamInfo (paired token) - optional, returns (streamStart, streamEnd, streamTotal)
]

type PendingFeesContractsResult = [
  MulticallResult<bigint>, // pending fees for token (staking recipient)
  MulticallResult<bigint>?, // pending fees for paired token (staking recipient) - optional
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

type IndexedPoolToken = {
  address?: string | null
  symbol?: string | null
  decimals?: number | null
} | null

type IndexedV4Pool = {
  token0?: IndexedPoolToken
  token1?: IndexedPoolToken
} | null

// ---
// Paired Token Resolution

/**
 * Resolves paired token info from pool key and indexed data.
 * Handles WETH/WBNB detection and fallback symbol resolution.
 */
function resolvePairedToken(
  poolKey: PoolKey,
  clankerToken: `0x${string}`,
  clankerSymbol: string | null | undefined,
  v4Pool: IndexedV4Pool | null | undefined,
  chainId: number
): PairedTokenInfo {
  // Get paired token address from pool key (case-insensitive)
  const isCurrency0Clanker = poolKey.currency0.toLowerCase() === clankerToken.toLowerCase()
  const pairedTokenAddress = isCurrency0Clanker ? poolKey.currency1 : poolKey.currency0

  // Check if paired token is native (WETH/WBNB)
  const wethInfo = WETH(chainId)
  const isNativeByAddress = isWETH(pairedTokenAddress, chainId)

  // Find paired token from indexed v4Pool data
  const indexedPairedToken = findIndexedPairedToken(v4Pool, pairedTokenAddress)

  // Also check if native by symbol (fallback when address doesn't match)
  const isNativeBySymbol = wethInfo && indexedPairedToken?.symbol === wethInfo.symbol

  // Return native token info if WETH/WBNB
  if ((isNativeByAddress || isNativeBySymbol) && wethInfo) {
    return {
      address: wethInfo.address,
      symbol: wethInfo.symbol,
      decimals: wethInfo.decimals,
      isNative: true,
    }
  }

  // Return non-native paired token info
  const symbol = resolveSymbol(indexedPairedToken?.symbol)
  return {
    address: pairedTokenAddress,
    symbol,
    decimals: indexedPairedToken?.decimals ?? 18,
    isNative: false,
  }
}

/**
 * Finds the paired token from indexed v4Pool data by address matching.
 */
function findIndexedPairedToken(
  v4Pool: IndexedV4Pool | null | undefined,
  pairedTokenAddress: `0x${string}`
): IndexedPoolToken | null {
  if (!v4Pool) return null

  const { token0, token1 } = v4Pool
  const targetAddress = pairedTokenAddress.toLowerCase()

  // Match by address
  if (token0?.address?.toLowerCase() === targetAddress) return token0
  if (token1?.address?.toLowerCase() === targetAddress) return token1

  return null
}

/**
 * Resolves symbol for paired token.
 * Returns the symbol if available, otherwise falls back to 'PAIRED'.
 *
 * Note: We no longer check against clankerSymbol because tokens can legitimately
 * have the same symbol (e.g., a clanker named "U" paired with U stablecoin).
 * Address matching in findIndexedPairedToken ensures we get the correct token.
 */
function resolveSymbol(symbol: string | null | undefined): string {
  if (symbol) return symbol
  return 'PAIRED'
}

// ---
// Contract Getters

function getTreasuryContracts(
  clankerToken: `0x${string}`,
  treasury: `0x${string}`,
  staking: `0x${string}`,
  pairedTokenAddress?: `0x${string}`
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

  if (pairedTokenAddress) {
    contracts.push({
      address: pairedTokenAddress,
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
  pairedTokenAddress?: `0x${string}`
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

  const pairedContracts = pairedTokenAddress
    ? [
        {
          address: staking,
          abi: LevrStaking_v1,
          functionName: 'outstandingRewards' as const,
          args: [pairedTokenAddress],
        },
        {
          address: staking,
          abi: LevrStaking_v1,
          functionName: 'rewardRatePerSecond' as const,
          args: [pairedTokenAddress],
        },
        {
          address: staking,
          abi: LevrStaking_v1,
          functionName: 'getTokenStreamInfo' as const,
          args: [pairedTokenAddress],
        },
      ]
    : []

  return [...baseContracts, ...pairedContracts]
}

function getPendingFeesContracts(
  feeLockerAddress: `0x${string}`,
  feeRecipient: `0x${string}`,
  clankerToken: `0x${string}`,
  pairedTokenAddress?: `0x${string}`
) {
  const baseContracts = [
    {
      address: feeLockerAddress,
      abi: IClankerFeeLocker,
      functionName: 'availableFees' as const,
      args: [feeRecipient, clankerToken],
    },
  ]

  const pairedContracts = pairedTokenAddress
    ? [
        {
          address: feeLockerAddress,
          abi: IClankerFeeLocker,
          functionName: 'availableFees' as const,
          args: [feeRecipient, pairedTokenAddress],
        },
      ]
    : []

  return [...baseContracts, ...pairedContracts]
}

// ---
// Parsers

function parseTreasuryStats(
  results: TreasuryContractsResult,
  tokenDecimals: number,
  totalSupply: bigint,
  tokenUsdPrice: number | null,
  pairedTokenUsdPrice?: number | null,
  pairedTokenDecimals: number = 18
): TreasuryStats {
  const [treasuryBalance, stakingBalance, escrowBalance, stakingPairedBalance] = results

  const treasuryBalanceRaw = treasuryBalance.result
  const stakingBalanceRaw = stakingBalance.result
  const escrowBalanceRaw = escrowBalance.result
  const stakingPairedBalanceRaw = stakingPairedBalance ? stakingPairedBalance.result : null

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
    stakingContractPairedBalance: stakingPairedBalanceRaw
      ? formatBalanceWithUsd(
          stakingPairedBalanceRaw,
          pairedTokenDecimals,
          pairedTokenUsdPrice ?? null
        )
      : undefined,
  }
}

function parseStakingStats(
  results: StakingContractsResult,
  pendingFeesResults: PendingFeesContractsResult | null,
  tokenDecimals: number,
  tokenUsdPrice: number | null,
  pairedTokenUsdPrice: number | null,
  pairedTokenDecimals: number = 18,
  blockTimestamp: bigint,
  pricing?: PricingResult,
  feeSplitterPending?: { token: bigint; pairedToken: bigint | null }
): StakingStats {
  const totalStakedRaw = results[0].result
  const aprBpsRaw = results[1].result
  const outstandingRewardsTokenAvailable = results[2].result // Now returns only available
  const tokenRewardRateRaw = results[3].result
  // Extract stream info from getTokenStreamInfo tuple (streamStart, streamEnd, streamTotal)
  const streamInfoRaw = results[4].result as [bigint, bigint, bigint]
  const tokenStreamStartRaw = streamInfoRaw[0]
  const tokenStreamEndRaw = streamInfoRaw[1]

  // Check if pairedToken data is present
  const hasPairedTokenData = results.length > 5
  const outstandingRewardsPairedAvailable =
    hasPairedTokenData && results[5] ? results[5].result : null
  const pairedTokenRewardRateRaw = hasPairedTokenData && results[6] ? results[6].result : null

  // Check if token stream is currently active
  const isTokenStreamActive =
    tokenStreamStartRaw <= blockTimestamp && blockTimestamp <= tokenStreamEndRaw

  // Check if pairedToken stream is active (if available) and get longest active stream window
  let isPairedTokenStreamActive = false
  let pairedTokenStreamStartRaw = 0n
  let pairedTokenStreamEndRaw = 0n

  if (hasPairedTokenData && results[7]) {
    const pairedTokenStreamInfoRaw = results[7].result as [bigint, bigint, bigint]
    pairedTokenStreamStartRaw = pairedTokenStreamInfoRaw[0]
    pairedTokenStreamEndRaw = pairedTokenStreamInfoRaw[1]

    isPairedTokenStreamActive =
      pairedTokenStreamStartRaw <= blockTimestamp && blockTimestamp <= pairedTokenStreamEndRaw
  }

  // Stream is active if either token or pairedToken reward stream is active
  const isStreamActive = isTokenStreamActive || isPairedTokenStreamActive

  // Determine which stream window to display
  let displayStreamStartRaw = tokenStreamStartRaw
  let displayStreamEndRaw = tokenStreamEndRaw

  const tokenStreamDuration =
    tokenStreamEndRaw > tokenStreamStartRaw ? tokenStreamEndRaw - tokenStreamStartRaw : 0n
  const pairedTokenStreamDuration =
    pairedTokenStreamStartRaw > 0n && pairedTokenStreamEndRaw > pairedTokenStreamStartRaw
      ? pairedTokenStreamEndRaw - pairedTokenStreamStartRaw
      : 0n

  if (isTokenStreamActive && isPairedTokenStreamActive) {
    // When both streams are active, display the one that ends last
    displayStreamStartRaw =
      pairedTokenStreamEndRaw > tokenStreamEndRaw ? pairedTokenStreamStartRaw : tokenStreamStartRaw
    displayStreamEndRaw =
      pairedTokenStreamEndRaw > tokenStreamEndRaw ? pairedTokenStreamEndRaw : tokenStreamEndRaw
  } else if (isTokenStreamActive) {
    displayStreamStartRaw = tokenStreamStartRaw
    displayStreamEndRaw = tokenStreamEndRaw
  } else if (isPairedTokenStreamActive) {
    displayStreamStartRaw = pairedTokenStreamStartRaw
    displayStreamEndRaw = pairedTokenStreamEndRaw
  } else if (pairedTokenStreamDuration > tokenStreamDuration) {
    // No active streams: keep prior behaviour of showing the longer window
    displayStreamStartRaw = pairedTokenStreamStartRaw
    displayStreamEndRaw = pairedTokenStreamEndRaw
  }

  // Get pending fees from ClankerFeeLocker (staking recipient)
  const stakingPendingToken = pendingFeesResults?.[0]?.result ?? 0n
  const stakingPendingPaired = pendingFeesResults?.[1]?.result ?? 0n

  // Calculate pairedToken APR if available
  let pairedTokenApr: { raw: bigint; percentage: number } | null = null

  if (
    pairedTokenRewardRateRaw !== null &&
    pairedTokenRewardRateRaw !== undefined &&
    pricing &&
    totalStakedRaw > 0n
  ) {
    const pairedTokenUsd = parseFloat(pricing.pairedTokenUsd)
    const tokenUsd = parseFloat(pricing.tokenUsd)

    if (tokenUsd > 0) {
      const pairedTokenPriceInTokens = pairedTokenUsd / tokenUsd
      const secondsPerYear = BigInt(365 * 24 * 60 * 60)
      const annualPairedRewards = pairedTokenRewardRateRaw * secondsPerYear

      const priceScaleFactor = BigInt(1e18)
      const pairedTokenPriceScaled = BigInt(
        Math.floor(pairedTokenPriceInTokens * Number(priceScaleFactor))
      )
      const annualRewardsInUnderlying =
        (annualPairedRewards * pairedTokenPriceScaled) / priceScaleFactor

      const aprBpsPairedToken =
        totalStakedRaw > 0n ? (annualRewardsInUnderlying * 10000n) / totalStakedRaw : 0n
      pairedTokenApr = {
        raw: aprBpsPairedToken,
        percentage: Number(aprBpsPairedToken) / 100,
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
  const pairedTokenPendingTotal = stakingPendingPaired // Already queried for correct recipient

  return {
    totalStaked: formatBalanceWithUsd(totalStakedRaw, tokenDecimals, tokenUsdPrice),
    apr: {
      token: {
        raw: aprBpsRaw,
        percentage: Number(aprBpsRaw) / 100,
      },
      pairedToken: pairedTokenApr,
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
      pairedToken:
        outstandingRewardsPairedAvailable !== null
          ? {
              available: formatBalanceWithUsd(
                outstandingRewardsPairedAvailable,
                pairedTokenDecimals,
                pairedTokenUsdPrice
              ),
              pending: formatBalanceWithUsd(
                pairedTokenPendingTotal,
                pairedTokenDecimals,
                pairedTokenUsdPrice
              ),
            }
          : null,
    },
    rewardRates: {
      token: formatBalanceWithUsd(tokenRewardRateRaw, tokenDecimals, tokenUsdPrice),
      pairedToken:
        pairedTokenRewardRateRaw !== null && pairedTokenRewardRateRaw !== undefined
          ? formatBalanceWithUsd(pairedTokenRewardRateRaw, pairedTokenDecimals, pairedTokenUsdPrice)
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

    // Resolve paired token info from pool key and indexed data
    const pairedToken = resolvePairedToken(
      poolKey,
      clankerToken,
      indexedToken.symbol,
      indexedToken.v4Pool,
      chainId
    )

    poolInfo = {
      poolKey,
      feeDisplay: poolKey.fee === 0x800000 ? 'Dynamic' : `${(poolKey.fee / 10000).toFixed(2)}%`,
      numPositions: tokenRewards.numPositions,
      pairedToken,
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
}: ProjectParams): Promise<Project | null> {
  if (Object.values({ publicClient, staticProject }).some((value) => !value)) {
    throw new Error('Invalid project params')
  }

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  // Get paired token info from static project if available
  const pairedTokenInfo = staticProject.pool?.pairedToken
  const pairedTokenAddress = pairedTokenInfo?.address
  const clankerToken = staticProject.token.address
  const feeSplitterAddress = staticProject.feeSplitter?.address
  const rewardTokens = pairedTokenAddress ? [clankerToken, pairedTokenAddress] : [clankerToken]

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
      pairedTokenAddress
    ),
    ...getStakingContracts(staticProject.staking, clankerToken, pairedTokenAddress),
    ...(feeLockerAddress
      ? getPendingFeesContracts(
          feeLockerAddress,
          stakingFeeRecipient,
          clankerToken,
          pairedTokenAddress
        )
      : []),
    ...(feeSplitterAddress && staticProject.feeSplitter?.isActive
      ? getFeeSplitterDynamicContracts(clankerToken, feeSplitterAddress, rewardTokens)
      : []),
  ]

  // Fetch all data in parallel: indexed governance, pricing, block, and RPC multicall
  const [indexedProject, pricing, block, results] = await Promise.all([
    getIndexedProject(chainId, clankerToken),
    fetchPricing(publicClient, staticProject),
    publicClient.getBlock(),
    publicClient.multicall({ contracts }),
  ])

  const blockTimestamp = block.timestamp

  // Calculate slice indices for multicall results
  const treasuryCount = pairedTokenAddress ? 4 : 3
  const stakingCount = pairedTokenAddress ? 8 : 5
  const pendingFeesCount = feeLockerAddress ? (pairedTokenAddress ? 2 : 1) : 0
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
  const pairedTokenUsdPrice = pricing ? parseFloat(pricing.pairedTokenUsd) : null

  // Parse fee splitter dynamic data
  let feeSplitter = staticProject.feeSplitter
  let feeSplitterPendingFees: { token: bigint; pairedToken: bigint | null } | undefined

  if (feeSplitterDynamicResults && staticProject.feeSplitter) {
    const feeSplitterDynamic = parseFeeSplitterDynamic(
      feeSplitterDynamicResults as any,
      pairedTokenAddress
    )
    feeSplitter = { ...staticProject.feeSplitter, ...feeSplitterDynamic }

    if (staticProject.feeSplitter.isActive && feeSplitterDynamic.pendingFees) {
      feeSplitterPendingFees = {
        token: feeSplitterDynamic.pendingFees.token,
        pairedToken: feeSplitterDynamic.pendingFees.pairedToken ?? null,
      }
    }
  }

  // Parse stats
  const treasuryStats = parseTreasuryStats(
    treasuryResults,
    staticProject.token.decimals,
    staticProject.token.totalSupply,
    tokenUsdPrice,
    pairedTokenUsdPrice,
    pairedTokenInfo?.decimals ?? 18
  )

  const stakingStats = parseStakingStats(
    stakingResults,
    pendingFeesResults,
    staticProject.token.decimals,
    tokenUsdPrice,
    pairedTokenUsdPrice,
    pairedTokenInfo?.decimals ?? 18,
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
  publicClient: PopPublicClient,
  staticProject: RegisteredStaticProject
): Promise<PricingResult | undefined> {
  if (!staticProject.pool) return undefined

  try {
    const pairedToken = staticProject.pool.pairedToken

    const tokenUsdData = await getUsdPrice({
      publicClient,
      tokenAddress: staticProject.token.address,
      tokenDecimals: staticProject.token.decimals,
      pairedTokenAddress: pairedToken.address,
      pairedTokenDecimals: pairedToken.decimals,
      quoteFee: staticProject.pool.poolKey.fee,
      quoteTickSpacing: staticProject.pool.poolKey.tickSpacing,
      quoteHooks: staticProject.pool.poolKey.hooks,
    })

    // Get paired token USD price (WETH/WBNB = oracle, stablecoins = $1.00)
    const pairedTokenUsdPrice = await getPairedTokenUsdPrice({
      publicClient,
      pairedTokenAddress: pairedToken.address,
    })

    return {
      tokenUsd: tokenUsdData.priceUsd,
      pairedTokenUsd: pairedTokenUsdPrice,
    }
  } catch (error) {
    console.warn('Failed to fetch USD pricing:', error)
    return undefined
  }
}
