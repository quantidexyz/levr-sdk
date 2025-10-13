import type { ExtractAbiItem, Log } from 'viem'
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
  MulticallResult<string>, // metadata
  MulticallResult<string | undefined>, // imageUrl
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
  MulticallResult<bigint>, // staking balance
]

type GovernanceContractsResult = [
  MulticallResult<bigint>, // currentCycleId
]

type StakingContractsResult = [
  MulticallResult<bigint>, // totalStaked
  MulticallResult<bigint>, // aprBps
  MulticallResult<[bigint, bigint]>, // outstandingRewards (token)
  MulticallResult<bigint>, // rewardRatePerSecond (token)
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
      functionName: 'metadata' as const,
    },
    {
      address: clankerToken,
      abi: IClankerToken,
      functionName: 'imageUrl' as const,
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
  staking: `0x${string}`
) {
  return [
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
}

function getGovernanceContracts(governor: `0x${string}`) {
  return [
    {
      address: governor,
      abi: LevrGovernor_v1,
      functionName: 'currentCycleId' as const,
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
  const [decimals, name, symbol, totalSupply, metadata, imageUrl] = results

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
    address: clankerToken,
    decimals: decimals.result,
    name: name.result,
    symbol: symbol.result,
    totalSupply: totalSupply.result,
    metadata: parsedMetadata,
    imageUrl: imageUrl.result,
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
  tokenUsdPrice: number | null
): TreasuryStats {
  const [treasuryBalance, stakingBalance] = results

  const treasuryBalanceRaw = treasuryBalance.result
  const stakingBalanceRaw = stakingBalance.result

  // Total allocated = treasury + staking balances (protocol-controlled tokens)
  const totalAllocatedRaw = treasuryBalanceRaw + stakingBalanceRaw

  // Utilization = (total allocated / total supply) * 100
  const utilization =
    totalSupply > 0n
      ? Number((totalAllocatedRaw * 10000n) / totalSupply) / 100 // Convert to percentage
      : 0

  return {
    balance: formatBalanceWithUsd(treasuryBalanceRaw, tokenDecimals, tokenUsdPrice),
    totalAllocated: formatBalanceWithUsd(totalAllocatedRaw, tokenDecimals, tokenUsdPrice),
    utilization,
  }
}

function parseGovernanceData(results: GovernanceContractsResult): GovernanceData {
  const [currentCycleId] = results
  return {
    currentCycleId: currentCycleId.result,
  }
}

function parseStakingStats(
  results: StakingContractsResult,
  tokenDecimals: number,
  tokenUsdPrice: number | null,
  wethUsdPrice: number | null,
  pricing?: PricingResult
): StakingStats {
  const totalStakedRaw = results[0].result
  const aprBpsRaw = results[1].result
  const outstandingRewardsTokenRaw = results[2].result
  const tokenRewardRateRaw = results[3].result

  // Check if WETH data is present
  const hasWethData = results.length > 4
  const outstandingRewardsWethRaw = hasWethData && results[4] ? results[4].result : null
  const wethRewardRateRaw = hasWethData && results[5] ? results[5].result : null

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
        pending: formatBalanceWithUsd(outstandingRewardsTokenRaw[1], tokenDecimals, tokenUsdPrice),
      },
      weth: outstandingRewardsWethRaw
        ? {
            available: formatBalanceWithUsd(outstandingRewardsWethRaw[0], 18, wethUsdPrice),
            pending: formatBalanceWithUsd(outstandingRewardsWethRaw[1], 18, wethUsdPrice),
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
  }
}

// ---

export type ProjectsParams = {
  publicClient: PopPublicClient
  fromBlock?: bigint
  toBlock?: bigint | 'latest'
  pageSize?: number
}

export type ProjectsResult = {
  projects: Omit<Project, 'forwarder' | 'pool' | 'pricing' | 'stakingStats' | 'feeReceivers'>[]
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

/**
 * Get multiple projects data
 */
export async function getProjects({
  publicClient,
  fromBlock,
  toBlock = 'latest',
  pageSize = 100,
}: ProjectsParams): Promise<ProjectsResult> {
  if (Object.values({ publicClient }).some((value) => !value)) {
    throw new Error('Invalid projects params')
  }

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const factoryAddress = GET_FACTORY_ADDRESS(chainId)
  if (!factoryAddress) throw new Error('Factory address not found')

  // Determine block range
  const latestBlock = await publicClient.getBlockNumber()
  const from = fromBlock ?? latestBlock - latestBlock / 10n // Default to last 10% of blocks
  const to = toBlock === 'latest' ? latestBlock : toBlock

  // Get the Registered event
  const registeredEvent = LevrFactory_v1.find(
    (item) => item.type === 'event' && item.name === 'Registered'
  )

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

  // First pass: get factory contracts to check if projects exist
  const factoryContractsOnly = clankerTokens.map((token) => ({
    address: factoryAddress,
    abi: LevrFactory_v1,
    functionName: 'getProjectContracts' as const,
    args: [token],
  }))

  const factoryResults = await publicClient.multicall({ contracts: factoryContractsOnly })

  // Filter out unregistered projects and prepare valid tokens with their contracts
  const validTokensWithContracts = clankerTokens
    .map((token, index) => {
      const result = factoryResults[index].result as {
        treasury: `0x${string}`
        governor: `0x${string}`
        staking: `0x${string}`
        stakedToken: `0x${string}`
      }

      if (
        [result.treasury, result.governor, result.staking, result.stakedToken].some(
          (a) => a === zeroAddress
        )
      ) {
        return null
      }

      return { token, contracts: result }
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

  // Build contract calls for valid tokens only
  const validContracts = validTokensWithContracts.flatMap(({ token, contracts }) => [
    ...getTokenContracts(token),
    ...getTreasuryContracts(token, contracts.treasury, contracts.staking),
    ...getGovernanceContracts(contracts.governor),
  ])

  const results = await publicClient.multicall({ contracts: validContracts })

  // Parse results into Project objects
  const projects: Omit<
    Project,
    'forwarder' | 'pool' | 'pricing' | 'stakingStats' | 'feeReceivers'
  >[] = []
  const callsPerProject = 9 // 6 token + 2 treasury + 1 governance

  for (let i = 0; i < validTokensWithContracts.length; i++) {
    const { token, contracts: projectContracts } = validTokensWithContracts[i]
    const offset = i * callsPerProject

    // Extract results for this project
    const tokenResults = results.slice(offset, offset + 6) as TokenContractsResult
    const treasuryResults = results.slice(offset + 6, offset + 8) as TreasuryContractsResult
    const governanceResults = results.slice(offset + 8, offset + 9) as GovernanceContractsResult

    // Parse using our type-safe parsers
    const tokenData = parseTokenData(tokenResults, token)
    const governanceData = parseGovernanceData(governanceResults)
    const treasuryStats = parseTreasuryStats(
      treasuryResults,
      tokenData.decimals,
      tokenData.totalSupply,
      null // No pricing for list view
    )

    projects.push({
      chainId,
      treasury: projectContracts.treasury,
      governor: projectContracts.governor,
      staking: projectContracts.staking,
      stakedToken: projectContracts.stakedToken,
      factory: factoryAddress,
      currentCycleId: governanceData.currentCycleId,
      token: tokenData,
      treasuryStats,
    })
  }

  return {
    projects,
    fromBlock: from,
    toBlock: to,
  }
}

/**
 * Get project data for a clanker token
 */
export async function getProject({
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

  const wethAddress = WETH(chainId)?.address

  // Build contract calls using individual getters
  const contracts = [
    ...getTokenContracts(clankerToken),
    ...getFactoryContracts(factoryAddress, clankerToken),
  ]

  const multicallResults = await publicClient.multicall({ contracts })

  // Calculate slice indices for each data group
  const tokenCount = 6
  const factoryCount = 2

  let idx = 0
  const tokenResults = multicallResults.slice(idx, idx + tokenCount) as TokenContractsResult
  idx += tokenCount

  const factoryResults = multicallResults.slice(idx, idx + factoryCount) as FactoryContractsResult
  idx += factoryCount

  // Parse results using individual parsers
  const tokenData = parseTokenData(tokenResults, clankerToken)
  const factoryData = parseFactoryData(factoryResults)

  // Check if project exists
  const { treasury, governor, staking, stakedToken } = factoryData
  if ([treasury, governor, staking, stakedToken].some((a) => a === zeroAddress)) return null

  // Now fetch treasury, governance, and staking data
  const additionalContracts = [
    ...getTreasuryContracts(clankerToken, treasury, staking),
    ...getGovernanceContracts(governor),
    ...getStakingContracts(staking, clankerToken, wethAddress),
  ]

  const additionalResults = await publicClient.multicall({ contracts: additionalContracts })

  // Calculate slice indices for additional data
  const treasuryCount = 2
  const governanceCount = 1
  const stakingCount = wethAddress ? 6 : 4

  let idx2 = 0
  const treasuryResults = additionalResults.slice(
    idx2,
    idx2 + treasuryCount
  ) as TreasuryContractsResult
  idx2 += treasuryCount

  const governanceResults = additionalResults.slice(
    idx2,
    idx2 + governanceCount
  ) as GovernanceContractsResult
  idx2 += governanceCount

  const stakingResults = additionalResults.slice(
    idx2,
    idx2 + stakingCount
  ) as StakingContractsResult

  // Parse additional data
  const governanceData = parseGovernanceData(governanceResults)

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

  // Calculate USD values for stats if pricing is available
  const tokenUsdPrice = pricing ? parseFloat(pricing.tokenUsd) : null
  const wethUsdPrice = pricing ? parseFloat(pricing.wethUsd) : null

  // Parse treasury and staking stats using individual parsers
  const treasuryStats = parseTreasuryStats(
    treasuryResults,
    tokenData.decimals,
    tokenData.totalSupply,
    tokenUsdPrice
  )

  const stakingStats = parseStakingStats(
    stakingResults,
    tokenData.decimals,
    tokenUsdPrice,
    wethUsdPrice,
    pricing
  )

  return {
    chainId,
    treasury: factoryData.treasury,
    governor: factoryData.governor,
    staking: factoryData.staking,
    stakedToken: factoryData.stakedToken,
    forwarder: factoryData.forwarder,
    factory: factoryAddress,
    currentCycleId: governanceData.currentCycleId,
    token: tokenData,
    pool: poolInfo,
    treasuryStats,
    stakingStats,
    feeReceivers,
    pricing,
  }
}
