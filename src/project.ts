import { erc20Abi, zeroAddress } from 'viem'

import { IClankerToken, LevrFactory_v1, LevrGovernor_v1, LevrStaking_v1 } from './abis'
import { formatBalanceWithUsd } from './balance'
import { GET_FACTORY_ADDRESS, WETH } from './constants'
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
import type { BalanceResult, PoolKey, PopPublicClient, PricingResult } from './types'
import { getUsdPrice, getWethUsdPrice } from './usd-price'

export type StaticProjectParams = {
  publicClient: PopPublicClient
  clankerToken: `0x${string}`
  userAddress?: `0x${string}`
}

export type ProjectParams = {
  publicClient: PopPublicClient
  staticProject: StaticProject
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

export type StaticProject = Pick<
  Project,
  | 'treasury'
  | 'governor'
  | 'staking'
  | 'stakedToken'
  | 'forwarder'
  | 'factory'
  | 'token'
  | 'pool'
  | 'feeReceivers'
  | 'feeSplitter'
>

// ---
// Multicall Result Types

type MulticallResult<T> = {
  result: T
  status: 'success' | 'failure'
  error?: Error
}

type TokenContractsResult = [
  MulticallResult<number>, // decimals
  MulticallResult<string>, // name
  MulticallResult<string>, // symbol
  MulticallResult<bigint>, // totalSupply
  MulticallResult<[`0x${string}`, `0x${string}`, string, string, string]>, // allData: [originalAdmin, admin, image, metadata, context]
]

type FactoryContractsResult = [
  MulticallResult<{
    treasury: `0x${string}`
    governor: `0x${string}`
    staking: `0x${string}`
    stakedToken: `0x${string}`
  }>, // getProjectContracts
  MulticallResult<`0x${string}`>, // trustedForwarder
]

type TreasuryContractsResult = [
  MulticallResult<bigint>, // treasury balance
  MulticallResult<bigint>, // staking balance (clanker token)
  MulticallResult<bigint>?, // staking balance (weth) - optional
]

type GovernanceContractsResult = [
  MulticallResult<bigint>, // currentCycleId
  MulticallResult<bigint>, // activeProposalCount (boost - type 0)
  MulticallResult<bigint>, // activeProposalCount (transfer - type 1)
]

type StakingContractsResult = [
  MulticallResult<bigint>, // totalStaked
  MulticallResult<bigint>, // aprBps
  MulticallResult<[bigint, bigint]>, // outstandingRewards (token)
  MulticallResult<bigint>, // rewardRatePerSecond (token)
  MulticallResult<number>, // streamWindowSeconds
  MulticallResult<bigint>, // streamStart
  MulticallResult<bigint>, // streamEnd
  MulticallResult<[bigint, bigint]>?, // outstandingRewards (weth) - optional
  MulticallResult<bigint>?, // rewardRatePerSecond (weth) - optional
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

type GovernanceData = {
  currentCycleId: bigint
  activeProposalCount: {
    boost: bigint
    transfer: bigint
  }
}

// ---
// Contract Getters

function getTokenContracts(clankerToken: `0x${string}`) {
  return [
    {
      address: clankerToken,
      abi: erc20Abi,
      functionName: 'decimals' as const,
    },
    {
      address: clankerToken,
      abi: erc20Abi,
      functionName: 'name' as const,
    },
    {
      address: clankerToken,
      abi: erc20Abi,
      functionName: 'symbol' as const,
    },
    {
      address: clankerToken,
      abi: erc20Abi,
      functionName: 'totalSupply' as const,
    },
    {
      address: clankerToken,
      abi: IClankerToken,
      functionName: 'allData' as const,
    },
  ]
}

function getFactoryContracts(factoryAddress: `0x${string}`, clankerToken: `0x${string}`) {
  return [
    {
      address: factoryAddress,
      abi: LevrFactory_v1,
      functionName: 'getProjectContracts' as const,
      args: [clankerToken],
    },
    {
      address: factoryAddress,
      abi: LevrFactory_v1,
      functionName: 'trustedForwarder' as const,
    },
  ]
}

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

function getGovernanceContracts(governor: `0x${string}`) {
  return [
    {
      address: governor,
      abi: LevrGovernor_v1,
      functionName: 'currentCycleId' as const,
    },
    {
      address: governor,
      abi: LevrGovernor_v1,
      functionName: 'activeProposalCount' as const,
      args: [0], // boost type
    },
    {
      address: governor,
      abi: LevrGovernor_v1,
      functionName: 'activeProposalCount' as const,
      args: [1], // transfer type
    },
  ]
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
      functionName: 'streamWindowSeconds' as const,
    },
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'streamStart' as const,
    },
    {
      address: staking,
      abi: LevrStaking_v1,
      functionName: 'streamEnd' as const,
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
      ]
    : []

  return [...baseContracts, ...wethContracts]
}

// ---
// Parsers

function parseTokenData(results: TokenContractsResult, clankerToken: `0x${string}`): TokenData {
  const [decimals, name, symbol, totalSupply, allData] = results

  // Extract allData fields: [originalAdmin, admin, image, metadata, context]
  const [originalAdmin, admin, image, metadata, context] = allData.result

  // Parse metadata JSON
  let parsedMetadata: ProjectMetadata | null = null
  if (metadata && typeof metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(metadata)
    } catch {
      // If parsing fails, leave as null
    }
  }

  return {
    address: clankerToken,
    decimals: decimals.result,
    name: name.result,
    symbol: symbol.result,
    totalSupply: totalSupply.result,
    metadata: parsedMetadata,
    imageUrl: image || undefined,
    originalAdmin,
    admin,
    context,
  }
}

function parseFactoryData(results: FactoryContractsResult): FactoryData {
  const [projectContracts, forwarder] = results
  const { treasury, governor, staking, stakedToken } = projectContracts.result

  return {
    treasury,
    governor,
    staking,
    stakedToken,
    forwarder: forwarder.result,
  }
}

function parseTreasuryStats(
  results: TreasuryContractsResult,
  tokenDecimals: number,
  totalSupply: bigint,
  tokenUsdPrice: number | null,
  wethUsdPrice?: number | null
): TreasuryStats {
  const [treasuryBalance, stakingBalance, stakingWethBalance] = results

  const treasuryBalanceRaw = treasuryBalance.result
  const stakingBalanceRaw = stakingBalance.result
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
    stakingContractWethBalance: stakingWethBalanceRaw
      ? formatBalanceWithUsd(stakingWethBalanceRaw, 18, wethUsdPrice ?? null)
      : undefined,
  }
}

function parseGovernanceData(results: GovernanceContractsResult): GovernanceData {
  const [currentCycleId, boostCount, transferCount] = results
  return {
    currentCycleId: currentCycleId.result === 0n ? 1n : currentCycleId.result,
    activeProposalCount: {
      boost: boostCount.result,
      transfer: transferCount.result,
    },
  }
}

function parseStakingStats(
  results: StakingContractsResult,
  tokenDecimals: number,
  tokenUsdPrice: number | null,
  wethUsdPrice: number | null,
  blockTimestamp: bigint,
  pricing?: PricingResult,
  feeSplitterPending?: { token: bigint; weth: bigint | null }
): StakingStats {
  const totalStakedRaw = results[0].result
  const aprBpsRaw = results[1].result
  const outstandingRewardsTokenRaw = results[2].result
  const tokenRewardRateRaw = results[3].result
  const streamWindowSecondsRaw = results[4].result
  const streamStartRaw = results[5].result
  const streamEndRaw = results[6].result

  // Check if WETH data is present
  const hasWethData = results.length > 7
  const outstandingRewardsWethRaw = hasWethData && results[7] ? results[7].result : null
  const wethRewardRateRaw = hasWethData && results[8] ? results[8].result : null

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

  // Calculate if stream is active using blockchain timestamp
  const isStreamActive = streamStartRaw <= blockTimestamp && blockTimestamp <= streamEndRaw

  // When fee splitter is active, ADD both fee splitter's pending AND staking's pending
  // (hybrid setup: fee splitter gets some %, staking gets rest % directly from ClankerFeeLocker)
  // When fee splitter is NOT active, use only staking's pending from ClankerFeeLocker
  const tokenPendingTotal = feeSplitterPending
    ? feeSplitterPending.token + outstandingRewardsTokenRaw[1] // ADD both portions
    : outstandingRewardsTokenRaw[1] // Use staking's pending (it's the only recipient)

  const wethPendingTotal =
    feeSplitterPending?.weth !== undefined
      ? (feeSplitterPending.weth ?? 0n) + (outstandingRewardsWethRaw?.[1] ?? 0n) // ADD both portions
      : outstandingRewardsWethRaw
        ? outstandingRewardsWethRaw[1] // Use staking's pending (it's the only recipient)
        : null

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
          outstandingRewardsTokenRaw[0],
          tokenDecimals,
          tokenUsdPrice
        ),
        pending: formatBalanceWithUsd(tokenPendingTotal, tokenDecimals, tokenUsdPrice),
      },
      weth: outstandingRewardsWethRaw
        ? {
            available: formatBalanceWithUsd(outstandingRewardsWethRaw[0], 18, wethUsdPrice),
            pending: formatBalanceWithUsd(wethPendingTotal ?? 0n, 18, wethUsdPrice),
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
      windowSeconds: Number(streamWindowSecondsRaw),
      streamStart: streamStartRaw,
      streamEnd: streamEndRaw,
      isActive: isStreamActive,
    },
  }
}

// ---

export type ProjectsParams = {
  publicClient: PopPublicClient
  offset?: number
  limit?: number
}

export type ProjectsResult = {
  projects: Omit<
    Project,
    'forwarder' | 'pool' | 'pricing' | 'stakingStats' | 'governanceStats' | 'feeReceivers'
  >[]
  total: number
}

/**
 * Get multiple projects data using factory's paginated getProjects()
 */
export async function getProjects({
  publicClient,
  offset = 0,
  limit = 50,
}: ProjectsParams): Promise<ProjectsResult> {
  if (Object.values({ publicClient }).some((value) => !value)) {
    throw new Error('Invalid projects params')
  }

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const factoryAddress = GET_FACTORY_ADDRESS(chainId)
  if (!factoryAddress) throw new Error('Factory address not found')

  // Get projects from factory using paginated view function
  const [projectsData, total] = await publicClient.readContract({
    address: factoryAddress,
    abi: LevrFactory_v1,
    functionName: 'getProjects',
    args: [BigInt(offset), BigInt(limit)],
  })

  if (projectsData.length === 0) {
    return {
      projects: [],
      total: Number(total),
    }
  }

  // Track contracts and their mapping per project for correct result parsing
  const contractsPerProject: { tokenCount: number; treasuryCount: number }[] = []

  // Build contract calls for all projects (token data + treasury balances)
  const contracts = projectsData.flatMap((projectInfo) => {
    const tokenContracts = getTokenContracts(projectInfo.clankerToken)
    const treasuryContracts = getTreasuryContracts(
      projectInfo.clankerToken,
      projectInfo.project.treasury,
      projectInfo.project.staking,
      undefined
    )

    contractsPerProject.push({
      tokenCount: tokenContracts.length,
      treasuryCount: treasuryContracts.length,
    })

    return [...tokenContracts, ...treasuryContracts]
  })

  const results = await publicClient.multicall({ contracts })

  // Parse results into Project objects
  const projects: Omit<
    Project,
    | 'forwarder'
    | 'pool'
    | 'pricing'
    | 'stakingStats'
    | 'governanceStats'
    | 'feeReceivers'
    | 'airdrop'
    | 'blockTimestamp'
  >[] = []
  let currentOffset = 0

  for (let i = 0; i < projectsData.length; i++) {
    const projectInfo = projectsData[i]
    const tokenCount = contractsPerProject[i].tokenCount
    const treasuryCount = contractsPerProject[i].treasuryCount

    // Extract results for this project
    const tokenResults = results.slice(
      currentOffset,
      currentOffset + tokenCount
    ) as TokenContractsResult
    currentOffset += tokenCount

    const treasuryResults = results.slice(
      currentOffset,
      currentOffset + treasuryCount
    ) as TreasuryContractsResult
    currentOffset += treasuryCount

    // Parse using our type-safe parsers
    const tokenData = parseTokenData(tokenResults, projectInfo.clankerToken)
    const treasuryStats = parseTreasuryStats(
      treasuryResults,
      tokenData.decimals,
      tokenData.totalSupply,
      null // No pricing for list view
    )

    projects.push({
      chainId,
      treasury: projectInfo.project.treasury,
      governor: projectInfo.project.governor,
      staking: projectInfo.project.staking,
      stakedToken: projectInfo.project.stakedToken,
      factory: factoryAddress,
      token: tokenData,
      treasuryStats,
    })
  }

  return {
    projects,
    total: Number(total),
  }
}

/**
 * Get static project data that doesn't change frequently
 * This includes contract addresses, token metadata, pool info, and fee receivers
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

  // Get deployed fee splitter for this token (if exists)
  const feeSplitterAddress = await getFeeSplitter({
    publicClient,
    clankerToken,
    chainId,
  })

  // Build contract calls including tokenRewards and fee splitter static in the same multicall
  const contracts = [
    ...getTokenContracts(clankerToken),
    ...getFactoryContracts(factoryAddress, clankerToken),
    ...getFeeReceiverContracts(clankerToken, chainId),
    ...(feeSplitterAddress ? getFeeSplitterStaticContracts(clankerToken, feeSplitterAddress) : []),
  ]

  const multicallResults = await publicClient.multicall({ contracts })

  // Calculate slice indices for each data group
  const tokenCount = 5
  const factoryCount = 2
  const tokenRewardsCount = 1
  const feeSplitterStaticCount = feeSplitterAddress ? 3 : 0

  let idx = 0
  const tokenResults = multicallResults.slice(idx, idx + tokenCount) as TokenContractsResult
  idx += tokenCount

  const factoryResults = multicallResults.slice(idx, idx + factoryCount) as FactoryContractsResult
  idx += factoryCount

  const tokenRewardsResult = multicallResults[idx]
  idx += tokenRewardsCount

  const feeSplitterStaticResults = feeSplitterAddress
    ? multicallResults.slice(idx, idx + feeSplitterStaticCount)
    : null
  idx += feeSplitterStaticCount

  // Parse results using individual parsers
  const tokenData = parseTokenData(tokenResults, clankerToken)
  const factoryData = parseFactoryData(factoryResults)

  // Check if project exists
  const { treasury, governor, staking, stakedToken } = factoryData
  if ([treasury, governor, staking, stakedToken].some((a) => a === zeroAddress)) return null

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

    // Parse fee receivers using shared utility (no logic duplication)
    // Pass userAddress so areYouAnAdmin works out of the box
    feeReceivers = parseFeeReceivers(tokenRewards, userAddress)
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

  return {
    treasury: factoryData.treasury,
    governor: factoryData.governor,
    staking: factoryData.staking,
    stakedToken: factoryData.stakedToken,
    forwarder: factoryData.forwarder,
    factory: factoryAddress,
    token: tokenData,
    pool: poolInfo,
    feeReceivers,
    feeSplitter,
  }
}

/**
 * Get project data for a clanker token
 * Requires staticProject data to avoid refetching static information
 * Fetches dynamic data including treasury, governance, staking stats, and pricing
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
  // Use fee splitter from staticProject (already fetched in getStaticProject)
  const feeSplitterAddress = staticProject.feeSplitter?.address
  const rewardTokens = wethAddress ? [clankerToken, wethAddress] : [clankerToken]

  // Fetch pricing data if oracle client is provided and pool exists
  let pricing: PricingResult | undefined

  if (oraclePublicClient && staticProject.pool) {
    try {
      const [wethUsdData, tokenUsdData] = await Promise.all([
        getWethUsdPrice({ publicClient: oraclePublicClient }),
        getUsdPrice({
          oraclePublicClient,
          quotePublicClient: publicClient,
          tokenAddress: clankerToken,
          tokenDecimals: staticProject.token.decimals,
          quoteFee: staticProject.pool.poolKey.fee,
          quoteTickSpacing: staticProject.pool.poolKey.tickSpacing,
          quoteHooks: staticProject.pool.poolKey.hooks,
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

  // Get current block timestamp for accurate stream status
  const block = await publicClient.getBlock()
  const blockTimestamp = block.timestamp

  // Fetch only dynamic data (treasury, governance, staking stats, and fee splitter dynamic)
  const contracts = [
    ...getTreasuryContracts(
      clankerToken,
      staticProject.treasury,
      staticProject.staking,
      wethAddress
    ),
    ...getGovernanceContracts(staticProject.governor),
    ...getStakingContracts(staticProject.staking, clankerToken, wethAddress),
    ...(feeSplitterAddress && staticProject.feeSplitter?.isActive
      ? getFeeSplitterDynamicContracts(clankerToken, feeSplitterAddress, rewardTokens)
      : []),
  ]

  const results = await publicClient.multicall({ contracts })

  // Calculate slice indices for dynamic data
  const treasuryCount = wethAddress ? 3 : 2
  const governanceCount = 3 // currentCycleId + 2 activeProposalCount calls
  const stakingCount = wethAddress ? 9 : 7 // Added 3 stream-related calls
  const feeSplitterDynamicCount =
    feeSplitterAddress && staticProject.feeSplitter?.isActive ? rewardTokens.length : 0

  let idx = 0
  const treasuryResults = results.slice(idx, idx + treasuryCount) as TreasuryContractsResult
  idx += treasuryCount

  const governanceResults = results.slice(idx, idx + governanceCount) as GovernanceContractsResult
  idx += governanceCount

  const stakingResults = results.slice(idx, idx + stakingCount) as StakingContractsResult
  idx += stakingCount

  const feeSplitterDynamicResults =
    feeSplitterDynamicCount > 0 ? results.slice(idx, idx + feeSplitterDynamicCount) : null

  // Calculate USD values for stats if pricing is available
  const tokenUsdPrice = pricing ? parseFloat(pricing.tokenUsd) : null
  const wethUsdPrice = pricing ? parseFloat(pricing.wethUsd) : null

  // Parse fee splitter dynamic data first (needed for staking stats)
  let feeSplitter = staticProject.feeSplitter
  let feeSplitterPendingFees: { token: bigint; weth: bigint | null } | undefined
  if (feeSplitterDynamicResults && staticProject.feeSplitter) {
    const feeSplitterDynamic = parseFeeSplitterDynamic(
      feeSplitterDynamicResults as any,
      wethAddress
    )
    feeSplitter = {
      ...staticProject.feeSplitter,
      ...feeSplitterDynamic,
    }

    // Extract pending fees to add to outstanding rewards
    // When using fee splitter, fees in LP locker should show as "pending" in outstanding rewards
    if (staticProject.feeSplitter.isActive && feeSplitterDynamic.pendingFees) {
      feeSplitterPendingFees = {
        token: feeSplitterDynamic.pendingFees.token,
        weth: feeSplitterDynamic.pendingFees.weth ?? null,
      }
    }
  }

  // Parse treasury and staking stats using individual parsers
  const treasuryStats = parseTreasuryStats(
    treasuryResults,
    staticProject.token.decimals,
    staticProject.token.totalSupply,
    tokenUsdPrice,
    wethUsdPrice
  )

  const stakingStats = parseStakingStats(
    stakingResults,
    staticProject.token.decimals,
    tokenUsdPrice,
    wethUsdPrice,
    blockTimestamp,
    pricing,
    feeSplitterPendingFees
  )

  const governanceStats = parseGovernanceData(governanceResults)

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
