import type { ClankerTokenV4 } from 'clanker-sdk'
import { createMerkleTree, FEE_CONFIGS } from 'clanker-sdk'
import { omit } from 'lodash'

import { STAKING_REWARDS, STATIC_FEE_TIERS, TREASURY_AIRDROP_AMOUNTS } from './constants'
import type { ClankerDeploymentSchemaType, LevrClankerDeploymentSchemaType } from './schema'

type BuildClankerV4Params = {
  c: LevrClankerDeploymentSchemaType
  treasuryAddress: `0x${string}`
  deployer: `0x${string}`
  staking: `0x${string}`
  chainId: number
}

export const buildClankerV4 = ({
  c,
  treasuryAddress,
  deployer,
  staking,
  chainId,
}: BuildClankerV4Params): ClankerTokenV4 => {
  const airdrop = getAirdrop(c.airdrop, treasuryAddress, c.treasuryFunding)
  const devBuy = getDevBuy(c.devBuy)
  const metadata = getMetadata(c.metadata)
  const fees = getFees(c.fees)
  const rewards = getRewards(deployer, staking, c.stakingReward, c.rewards)

  const config: ClankerTokenV4 = {
    ...omit(c, 'treasuryFunding', 'stakingReward'),
    tokenAdmin: deployer,
    devBuy,
    airdrop,
    metadata,
    fees,
    rewards,
    chainId: chainId as ClankerTokenV4['chainId'],
    vanity: true,
  } as const

  return config
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
 * Builds the rewards for the Clanker token using the Levr rewards
 * @param rewards - Levr rewards
 * @returns Clanker rewards
 */
const getRewards = (
  admin: `0x${string}`,
  staking: `0x${string}`,
  stakingReward: keyof typeof STAKING_REWARDS = '100%',
  rewards: LevrClankerDeploymentSchemaType['rewards']
): NonNullable<ClankerDeploymentSchemaType['rewards']> => {
  const recipients = rewards
    ? rewards.map((r) => ({
        admin: r.admin,
        recipient: r.recipient,
        // Convert percentage to basis points
        bps: r.percentage * 100,
        token: r.token,
      }))
    : []

  recipients.push({
    admin,
    recipient: staking,
    bps: STAKING_REWARDS[stakingReward],
    token: 'Both' as const,
  })

  return { recipients }
}

/**
 * Builds the metadata for the Clanker token using the Levr metadata
 * @param metadata - Levr metadata
 * @returns Clanker metadata
 */
const getMetadata = (
  metadata: LevrClankerDeploymentSchemaType['metadata']
): ClankerDeploymentSchemaType['metadata'] => {
  if (!metadata) return undefined

  const { description, ...socials } = metadata

  const platformMap: Record<string, string> = {
    telegramLink: 'telegram',
    websiteLink: 'website',
    xLink: 'x',
    farcasterLink: 'farcaster',
  }

  const socialMediaUrls = Object.entries(socials).map(([key, value]) => ({
    platform: platformMap[key],
    url: value,
  }))

  return {
    description,
    socialMediaUrls,
  }
}

/**
 * Builds the dev buy for the Clanker token using the Levr dev buy
 * @param devBuy - Levr dev buy
 * @returns Clanker dev buy
 */
const getDevBuy = (
  devBuy: LevrClankerDeploymentSchemaType['devBuy']
): ClankerDeploymentSchemaType['devBuy'] => {
  if (!devBuy) return undefined

  return {
    ethAmount: Number(devBuy.replace(' ETH', '')),
  }
}

/**
 * Builds the airdrop for the Clanker token using the Levr airdrop
 * @param airdrop - Levr airdrop
 * @param treasuryAddress - Treasury address
 * @param treasuryAirdropAmount - Treasury airdrop amount
 * @returns Clanker airdrop
 */
const getAirdrop = (
  airdrop: LevrClankerDeploymentSchemaType['airdrop'],
  treasuryAddress: `0x${string}`,
  treasuryAirdrop: keyof typeof TREASURY_AIRDROP_AMOUNTS
): ClankerDeploymentSchemaType['airdrop'] => {
  // Always include treasury in airdrop, even if no other recipients specified
  const airdropData = airdrop
    ? airdrop.map((a) => ({
        account: a.account,
        amount: a.amount,
      }))
    : []

  // Always add treasury to airdrop
  airdropData.push({
    account: treasuryAddress,
    amount: TREASURY_AIRDROP_AMOUNTS[treasuryAirdrop],
  })

  const merkleTree = createMerkleTree(airdropData)
  return {
    amount: airdropData.reduce((acc, curr) => acc + curr.amount, 0),
    merkleRoot: merkleTree.root,
    lockupDuration: 86400, // 1 day minimum required by Clanker SDK
    vestingDuration: 0,
  }
}
