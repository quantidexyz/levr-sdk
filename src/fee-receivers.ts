import { encodeFunctionData } from 'viem'

import { IClankerLpLockerMultiple } from './abis'
import { GET_LP_LOCKER_ADDRESS } from './constants'
import type { PopPublicClient, PopWalletClient } from './types'

export type FeeReceiversParams = {
  publicClient: PopPublicClient
  clankerToken: `0x${string}`
  userAddress?: `0x${string}`
}

export type FeeReceiverAdmin = {
  areYouAnAdmin: boolean
  admin: `0x${string}`
  recipient: `0x${string}`
  percentage: number
}

export type UpdateFeeReceiverParams = {
  walletClient: PopWalletClient
  clankerToken: `0x${string}`
  chainId: number
  rewardIndex: bigint | number // usually 0 for primary recipient
  newRecipient: `0x${string}` // staking contract
}

export type TokenRewardsParams = {
  publicClient?: PopPublicClient
  clankerToken: `0x${string}`
  chainId?: number
}

export type TokenRewardsBytecodeReturnType = {
  address: `0x${string}`
  data: `0x${string}`
  abi: typeof IClankerLpLockerMultiple
}

/**
 * Get tokenRewards from LP locker by reading the contract
 * Returns pool info and fee receiver data
 */
export const tokenRewardsRead = async (params: TokenRewardsParams) => {
  if (!params.publicClient) {
    throw new Error('publicClient is required for read method')
  }

  const chainId = params.publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)
  if (!lpLockerAddress) {
    throw new Error('LP locker address not found for chain')
  }

  return await params.publicClient.readContract({
    address: lpLockerAddress,
    abi: IClankerLpLockerMultiple,
    functionName: 'tokenRewards',
    args: [params.clankerToken],
  })
}

/**
 * Get bytecode for tokenRewards that can be used in multicalls
 */
export const tokenRewardsBytecode = (
  params: TokenRewardsParams
): TokenRewardsBytecodeReturnType => {
  const chainId = params.chainId ?? params.publicClient?.chain?.id
  if (!chainId) throw new Error('Chain ID required for bytecode generation')

  const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)
  if (!lpLockerAddress) {
    throw new Error('LP locker address not found for chain')
  }

  const data = encodeFunctionData({
    abi: IClankerLpLockerMultiple,
    functionName: 'tokenRewards',
    args: [params.clankerToken],
  })

  return {
    address: lpLockerAddress,
    data,
    abi: IClankerLpLockerMultiple,
  }
}

/**
 * @deprecated Use tokenRewardsRead() instead
 * Get tokenRewards from LP locker (shared utility)
 * Returns pool info and fee receiver data
 */
export async function getTokenRewards(publicClient: PopPublicClient, clankerToken: `0x${string}`) {
  return tokenRewardsRead({ publicClient, clankerToken })
}

/**
 * Parse fee receivers from tokenRewards result
 * Shared utility to avoid logic duplication
 */
export function parseFeeReceivers(
  tokenRewardsResult: {
    rewardAdmins?: readonly `0x${string}`[]
    rewardRecipients?: readonly `0x${string}`[]
    rewardBps?: readonly number[]
  },
  userAddress?: `0x${string}`
): FeeReceiverAdmin[] {
  const admins = tokenRewardsResult.rewardAdmins || []
  const recipients = tokenRewardsResult.rewardRecipients || []
  const bps = tokenRewardsResult.rewardBps || []

  return admins.map((admin, index) => ({
    areYouAnAdmin: userAddress ? admin.toLowerCase() === userAddress.toLowerCase() : false,
    admin,
    recipient: recipients[index],
    percentage: bps[index] / 100, // Convert bps to percentage
  }))
}

/**
 * Get fee receivers for a clanker token
 */
export async function feeReceivers({
  publicClient,
  clankerToken,
  userAddress,
}: FeeReceiversParams): Promise<FeeReceiverAdmin[] | undefined> {
  if (Object.values({ publicClient, clankerToken }).some((value) => !value)) {
    throw new Error('Invalid fee receivers params')
  }

  const tokenRewards = await tokenRewardsRead({ publicClient, clankerToken })
  return parseFeeReceivers(tokenRewards, userAddress)
}

/**
 * Update fee receiver for a clanker token
 */
export async function updateFeeReceiver({
  walletClient,
  clankerToken,
  chainId,
  rewardIndex,
  newRecipient,
}: UpdateFeeReceiverParams): Promise<`0x${string}`> {
  if (
    Object.values({ walletClient, clankerToken, chainId, newRecipient }).some((value) => !value)
  ) {
    throw new Error('Invalid update fee receiver params')
  }

  const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)
  if (!lpLockerAddress) {
    throw new Error('LP locker address not found for chain')
  }

  const index = Number(rewardIndex)
  const hash = await walletClient.writeContract({
    address: lpLockerAddress,
    abi: IClankerLpLockerMultiple,
    functionName: 'updateRewardRecipient',
    args: [clankerToken, BigInt(index), newRecipient],
  })

  return hash
}
