import type { StandardMerkleTree } from '@openzeppelin/merkle-tree'
import type { ClankerTokenV4 } from 'clanker-sdk'
import { createMerkleTree, FEE_CONFIGS, getTickFromMarketCap, POOL_POSITIONS } from 'clanker-sdk'
import { omit } from 'lodash'

import {
  GET_USD_STABLECOIN,
  getInitialLiquidityAmount,
  LEVR_TEAM_LP_FEE_PERCENTAGE,
  LEVR_TEAM_WALLET,
  STAKING_REWARDS,
  STATIC_FEE_TIERS,
  TREASURY_AIRDROP_AMOUNTS,
  USDC_V3_POOL_FEE,
  VAULT_LOCKUP_PERIODS,
  VAULT_VESTING_PERIODS,
  WETH,
} from './constants'
import {
  calculateAllocationBreakdown,
  type ClankerDeploymentSchemaType,
  type LevrClankerDeploymentSchemaType,
} from './schema'

type BuildClankerV4Params = {
  c: LevrClankerDeploymentSchemaType
  treasuryAddress: `0x${string}`
  deployer: `0x${string}`
  staking: `0x${string}`
  chainId: number
}

export type BuildClankerV4ReturnType = {
  config: ClankerTokenV4
  merkleTree: StandardMerkleTree<[string, string]> | null
  liquidityPercentage: number
}

export const buildClankerV4 = ({
  c,
  treasuryAddress,
  deployer,
  staking,
  chainId,
}: BuildClankerV4Params): BuildClankerV4ReturnType => {
  const { airdrop, merkleTree } = getAirdrop(c.airdrop, treasuryAddress, c.treasuryFunding)
  const metadata = getMetadata(c.metadata)
  const fees = getFees(c.fees)
  const rewards = getRewards(deployer, staking, c.stakingReward, c.rewards)
  const vault = getVault(c.vault)
  const pool = getPool(c.pairedToken, chainId)
  const devBuy = getDevBuy(c.devBuy, c.pairedToken)
  const { liquidityPercentage } = calculateAllocationBreakdown(c, {
    fallbackTreasuryPercentage: 0,
  })

  const config: ClankerTokenV4 = {
    ...omit(c, 'treasuryFunding', 'stakingReward', 'devBuy', 'pairedToken'),
    tokenAdmin: deployer,
    devBuy,
    airdrop,
    vault,
    metadata,
    fees,
    rewards,
    pool,
    chainId: chainId as ClankerTokenV4['chainId'],
    vanity: true,
  } as const

  return {
    config,
    merkleTree,
    liquidityPercentage,
  }
}

/**
 * Builds the pool configuration for the Clanker token based on paired token and chain
 *
 * @param pairedToken - Levr paired token ('ETH' | 'USDC')
 * @param chainId - The chain ID to determine paired token address
 * @returns Clanker pool configuration with correct tick for initial liquidity
 *
 * @remarks
 * Initial liquidity is looked up by paired token address:
 * - WETH (Base/Anvil): 10 ETH
 * - WBNB (BSC): 35 BNB
 * - USDC/USDT: $30,000
 */
const getPool = (
  pairedToken: LevrClankerDeploymentSchemaType['pairedToken'],
  chainId: number
): NonNullable<ClankerDeploymentSchemaType['pool']> => {
  // Get paired token address based on selection
  const pairedTokenAddress =
    pairedToken === 'USDC' ? GET_USD_STABLECOIN(chainId)?.address : WETH(chainId)?.address

  if (!pairedTokenAddress) {
    throw new Error(`Paired token ${pairedToken} not configured for chain ${chainId}`)
  }

  // Lookup initial liquidity by address
  const initialLiquidity = getInitialLiquidityAmount(pairedTokenAddress)
  const { tickIfToken0IsClanker, tickSpacing } = getTickFromMarketCap(initialLiquidity)

  // Use standard position with tickLower at initial price
  const positions = POOL_POSITIONS.Standard.map((pos) => ({
    ...pos,
    tickLower: tickIfToken0IsClanker,
  }))

  return {
    pairedToken: pairedToken === 'USDC' ? pairedTokenAddress : 'WETH',
    tickIfToken0IsClanker,
    tickSpacing,
    positions,
  }
}

/**
 * Builds the fees for the Clanker token using the Levr fees
 * @param fees - Levr fees
 * @returns Clanker fees
 */
const getFees = (
  fees: LevrClankerDeploymentSchemaType['fees']
): ClankerDeploymentSchemaType['fees'] => {
  if (fees.type === 'static') {
    return {
      type: 'static',
      clankerFee: STATIC_FEE_TIERS[fees.feeTier],
      pairedFee: STATIC_FEE_TIERS[fees.feeTier],
    }
  }

  if (fees.type === 'dynamic 3%') {
    return FEE_CONFIGS.Dynamic3
  }

  return FEE_CONFIGS.Dynamic3
}

/**
 * Builds the vault for the Clanker token using the Levr vault
 * Converts day strings and percentage strings to numbers (seconds and percentages)
 * @param vault - Levr vault configuration
 * @returns Clanker vault with durations in seconds
 */
const getVault = (
  vault: LevrClankerDeploymentSchemaType['vault']
): ClankerDeploymentSchemaType['vault'] => {
  if (!vault) return undefined

  // Convert lockup period from days to seconds
  const lockupDurationSeconds = VAULT_LOCKUP_PERIODS[vault.lockupPeriod] * 24 * 60 * 60

  // Convert vesting period from days to seconds (0 for instant means no vesting)
  const vestingDurationSeconds =
    vault.vestingPeriod === 'instant'
      ? 0
      : VAULT_VESTING_PERIODS[vault.vestingPeriod] * 24 * 60 * 60

  // Convert percentage from string (e.g., "5%") to number (5)
  const percentageNumber = parseFloat(vault.percentage)

  return {
    percentage: percentageNumber,
    lockupDuration: lockupDurationSeconds,
    vestingDuration: vestingDurationSeconds,
  }
}

/**
 * Builds the rewards for the Clanker token using the Levr rewards
 * @param admin - Admin address
 * @param staking - Staking contract address
 * @param stakingReward - Staking reward percentage key (user-facing, before team fee)
 * @param rewards - Levr custom rewards
 * @returns Clanker rewards with team LP fee automatically included
 */
const getRewards = (
  admin: `0x${string}`,
  staking: `0x${string}`,
  stakingReward: keyof typeof STAKING_REWARDS,
  rewards: LevrClankerDeploymentSchemaType['rewards']
): NonNullable<ClankerDeploymentSchemaType['rewards']> => {
  const recipients = rewards
    ? rewards.map((r) => ({
        admin: r.admin,
        recipient: r.recipient,
        // Convert human percentage to basis points (e.g., 5 -> 500)
        bps: Math.round(r.percentage * 100),
        token: r.token,
      }))
    : []

  // Add Levr team LP fee (always included for UI deployments)
  recipients.push({
    admin: LEVR_TEAM_WALLET,
    recipient: LEVR_TEAM_WALLET,
    bps: LEVR_TEAM_LP_FEE_PERCENTAGE * 100, // Convert percentage to basis points
    token: 'Both' as const,
  })

  // Add staking rewards (subtract team fee from user-facing percentage)
  const stakingBps = STAKING_REWARDS[stakingReward] - LEVR_TEAM_LP_FEE_PERCENTAGE * 100
  recipients.push({
    admin,
    recipient: staking,
    bps: stakingBps,
    token: 'Both' as const,
  })

  return { recipients }
}

/**
 * Builds the metadata for the Clanker token using the Levr metadata
 * @param metadata - Levr metadata
 * @returns Clanker metadata with "Deployed on levr.world" appended to description
 */
const getMetadata = (
  metadata: LevrClankerDeploymentSchemaType['metadata']
): ClankerDeploymentSchemaType['metadata'] => {
  const description = metadata?.description
  const socials = metadata ? omit(metadata, 'description') : {}

  const platformMap: Record<string, string> = {
    telegramLink: 'telegram',
    websiteLink: 'website',
    xLink: 'x',
    farcasterLink: 'farcaster',
  }

  const socialMediaUrls = Object.entries(socials)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      platform: platformMap[key],
      url: value as string,
    }))

  // Append "Deployed on levr.world" to description
  const enhancedDescription = description
    ? `${description} Deployed on levr.world`
    : 'Deployed on levr.world'

  return {
    description: enhancedDescription,
    socialMediaUrls: socialMediaUrls.length > 0 ? socialMediaUrls : undefined,
  }
}

/**
 * Builds the dev buy for the Clanker token using the Levr dev buy amount and paired token
 * Maps Levr's pairedToken (ETH/USDC) to Clanker's poolType discriminator
 *
 * @param devBuyAmount - Levr dev buy amount (e.g., '0.5 ETH')
 * @param pairedToken - Levr paired token ('ETH' | 'USDC')
 * @returns Clanker dev buy with poolType discriminator (v4 for ETH, v3 for USDC)
 */
const getDevBuy = (
  devBuyAmount: LevrClankerDeploymentSchemaType['devBuy'],
  pairedToken: LevrClankerDeploymentSchemaType['pairedToken']
): ClankerDeploymentSchemaType['devBuy'] => {
  if (!devBuyAmount) return undefined

  const ethAmount = Number(devBuyAmount.replace(' ETH', ''))

  // USDC paired token uses V3 pool for ETH -> USDC routing
  if (pairedToken === 'USDC') {
    return {
      poolType: 'v3',
      ethAmount,
      v3PoolFee: USDC_V3_POOL_FEE,
    }
  }

  // ETH (default) uses V4 pool
  return {
    poolType: 'v4',
    ethAmount,
  }
}

/**
 * Builds the airdrop for the Clanker token using the Levr airdrop
 * @param airdrop - Levr airdrop (with percentages)
 * @param treasuryAddress - Treasury address
 * @param treasuryAirdropAmount - Treasury airdrop amount
 * @returns Clanker airdrop config and merkle tree
 */
const getAirdrop = (
  airdrop: LevrClankerDeploymentSchemaType['airdrop'],
  treasuryAddress: `0x${string}`,
  treasuryAirdrop: keyof typeof TREASURY_AIRDROP_AMOUNTS
): {
  airdrop: ClankerDeploymentSchemaType['airdrop']
  merkleTree: StandardMerkleTree<[string, string]> | null
} => {
  const TOTAL_SUPPLY = 100_000_000_000 // 100B tokens

  // Convert airdrop percentages to amounts
  const airdropData = airdrop
    ? airdrop.map((a) => ({
        account: a.account,
        // Convert percentage (0-100) to actual amount (e.g., 5% of 100B = 5B)
        amount: Math.round((a.percentage / 100) * TOTAL_SUPPLY),
      }))
    : []

  // Always add treasury to airdrop
  airdropData.push({
    account: treasuryAddress,
    amount: TREASURY_AIRDROP_AMOUNTS[treasuryAirdrop],
  })

  const merkleTreeResult = createMerkleTree(airdropData)

  return {
    airdrop: {
      amount: airdropData.reduce((acc, curr) => acc + curr.amount, 0),
      merkleRoot: merkleTreeResult.root,
      lockupDuration: 86400, // 1 day minimum required by Clanker SDK
      vestingDuration: 0,
    },
    merkleTree: merkleTreeResult.tree,
  }
}
