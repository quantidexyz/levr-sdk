import type { ClankerTokenV4 } from 'clanker-sdk'
import { createMerkleTree } from 'clanker-sdk'

import type { ClankerDeploymentSchemaType, LevrClankerDeploymentSchemaType } from './schema'

type BuildClankerV4Params = {
  c: LevrClankerDeploymentSchemaType
  treasuryAddress: `0x${string}`
  treasuryAirdropAmount: number
  deployer: `0x${string}`
  staking: `0x${string}`
  chainId: number
}

export const buildClankerV4 = ({
  c,
  treasuryAddress,
  treasuryAirdropAmount,
  deployer,
  staking,
  chainId,
}: BuildClankerV4Params): ClankerTokenV4 => {
  const airdrop = getAirdrop(c.airdrop, treasuryAddress, treasuryAirdropAmount)
  const devBuy = getDevBuy(c.devBuy)
  const metadata = getMetadata(c.metadata)

  const fees: ClankerDeploymentSchemaType['fees'] = {
    type: 'static',
    clankerFee: 500,
    pairedFee: 500,
  }

  const rewards: ClankerDeploymentSchemaType['rewards'] = {
    recipients: [
      {
        admin: deployer,
        recipient: staking,
        bps: 10000,
        token: 'Both',
      },
    ],
  }

  const config: ClankerTokenV4 = {
    ...c,
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
  treasuryAirdropAmount: number
): ClankerDeploymentSchemaType['airdrop'] => {
  if (!airdrop) return undefined
  const airdropData = airdrop.map((a) => ({
    account: a.account,
    amount: a.amount,
  }))
  airdropData.push({
    account: treasuryAddress,
    amount: treasuryAirdropAmount,
  })
  const merkleTree = createMerkleTree(airdropData)
  return {
    amount: airdropData.reduce((acc, curr) => acc + curr.amount, 0),
    merkleRoot: merkleTree.root,
    lockupDuration: 86400, // 1 day minimum required by Clanker SDK
    vestingDuration: 0,
  }
}
