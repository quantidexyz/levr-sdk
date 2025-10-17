import { IClankerLpLockerMultiple, LevrFeeSplitter_v1 } from './abis'
import { GET_LP_LOCKER_ADDRESS } from './constants'
import type { PopPublicClient, PopWalletClient } from './types'

export type FeeReceiversParams = {
  publicClient: PopPublicClient
  clankerToken: `0x${string}`
  userAddress?: `0x${string}`
}

export enum FeePreference {
  Both = 0,
  Paired = 1, // WETH only
  Clanker = 2, // Clanker token only
}

export type FeeReceiverAdmin = {
  areYouAnAdmin: boolean
  admin: `0x${string}`
  recipient: `0x${string}`
  percentage: number
  feePreference?: FeePreference // Which tokens this recipient receives
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
 * Get fee receiver contract calls for multicall
 * Returns contract call to fetch tokenRewards from LP locker
 */
export function getFeeReceiverContracts(clankerToken: `0x${string}`, chainId: number) {
  const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)
  if (!lpLockerAddress) {
    throw new Error('LP locker address not found for chain')
  }

  return [
    {
      address: lpLockerAddress,
      abi: IClankerLpLockerMultiple,
      functionName: 'tokenRewards' as const,
      args: [clankerToken],
    },
  ]
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
 * Note: feePreference is optional and should be added via a separate call to feePreferences()
 */
export function parseFeeReceivers(
  tokenRewardsResult: {
    rewardAdmins?: readonly `0x${string}`[]
    rewardRecipients?: readonly `0x${string}`[]
    rewardBps?: readonly number[]
    feePreferences?: readonly number[] // Optional: fee preferences for each receiver
  },
  userAddress?: `0x${string}`
): FeeReceiverAdmin[] {
  const admins = tokenRewardsResult.rewardAdmins || []
  const recipients = tokenRewardsResult.rewardRecipients || []
  const bps = tokenRewardsResult.rewardBps || []
  const feePrefs = tokenRewardsResult.feePreferences || []

  return admins.map((admin, index) => ({
    areYouAnAdmin: userAddress ? admin.toLowerCase() === userAddress.toLowerCase() : false,
    admin,
    recipient: recipients[index],
    percentage: bps[index] / 100, // Convert bps to percentage
    feePreference: feePrefs[index] !== undefined ? (feePrefs[index] as FeePreference) : undefined,
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

/**
 * UI-friendly split config with percentage (0-100)
 */
export type SplitConfigUI = {
  receiver: `0x${string}`
  percentage: number // 0-100
}

/**
 * Configure fee splitter splits (step 1)
 */
export type ConfigureSplitsParams = {
  walletClient: PopWalletClient
  clankerToken: `0x${string}`
  chainId: number
  splits: readonly SplitConfigUI[]
}

export async function configureSplits({
  walletClient,
  clankerToken,
  chainId,
  splits,
}: ConfigureSplitsParams): Promise<`0x${string}`> {
  if (Object.values({ walletClient, clankerToken, chainId }).some((value) => !value)) {
    throw new Error('Invalid configure splits params')
  }

  const { GET_FEE_SPLITTER_ADDRESS } = await import('./constants')
  const { LevrFeeSplitter_v1 } = await import('./abis')

  const splitterAddress = GET_FEE_SPLITTER_ADDRESS(chainId)
  if (!splitterAddress) throw new Error('Fee splitter not deployed on this chain')

  // Convert percentage to bps
  const splitsWithBps: SplitConfig[] = splits.map((s) => ({
    receiver: s.receiver,
    bps: Math.floor(s.percentage * 100), // percentage to basis points
  }))

  const hash = await walletClient.writeContract({
    address: splitterAddress,
    abi: LevrFeeSplitter_v1,
    functionName: 'configureSplits',
    args: [clankerToken, splitsWithBps],
  })

  return hash
}

/**
 * Update reward recipient to fee splitter (step 2)
 * Note: Must be called after configureSplits succeeds
 */
export type UpdateRecipientToSplitterParams = {
  walletClient: PopWalletClient
  clankerToken: `0x${string}`
  chainId: number
  rewardIndex: bigint | number
}

export async function updateRecipientToSplitter({
  walletClient,
  clankerToken,
  chainId,
  rewardIndex,
}: UpdateRecipientToSplitterParams): Promise<`0x${string}`> {
  const { GET_FEE_SPLITTER_ADDRESS } = await import('./constants')

  const splitterAddress = GET_FEE_SPLITTER_ADDRESS(chainId)
  if (!splitterAddress) throw new Error('Fee splitter not deployed on this chain')

  // Update to splitter address (direct call from token admin)
  return updateFeeReceiver({
    walletClient,
    clankerToken,
    chainId,
    rewardIndex,
    newRecipient: splitterAddress,
  })
}

/**
 * Check which tokens a specific address is set up to receive as a fee receiver
 * Returns array of tokens (clanker token address and/or WETH address) that this recipient can receive
 * Uses feePreference to determine which tokens: Both (0), Paired/WETH only (1), or Clanker only (2)
 */
export function getReceivableTokens(
  feeReceivers: FeeReceiverAdmin[] | undefined,
  recipientAddress: `0x${string}`,
  clankerToken: `0x${string}`,
  wethAddress?: `0x${string}`
): `0x${string}`[] {
  if (!feeReceivers || feeReceivers.length === 0) {
    return []
  }

  const receivableTokens: `0x${string}`[] = []

  // Check each fee receiver to see if the recipient address matches
  for (const receiver of feeReceivers) {
    if (receiver.recipient.toLowerCase() === recipientAddress.toLowerCase()) {
      // This recipient receives fees - check which tokens based on feePreference
      const pref = receiver.feePreference

      if (pref === undefined) {
        // If no preference is set, assume Both for backwards compatibility
        receivableTokens.push(clankerToken)
        if (wethAddress) receivableTokens.push(wethAddress)
      } else if (pref === FeePreference.Both) {
        // Receives both clanker token and WETH
        receivableTokens.push(clankerToken)
        if (wethAddress) receivableTokens.push(wethAddress)
      } else if (pref === FeePreference.Paired) {
        // Receives WETH only
        if (wethAddress) receivableTokens.push(wethAddress)
      } else if (pref === FeePreference.Clanker) {
        // Receives clanker token only
        receivableTokens.push(clankerToken)
      }
      break
    }
  }

  return receivableTokens
}

// ---
// Fee Splitter Types and Utilities

/**
 * Split configuration for fee splitter
 */
export type SplitConfig = {
  receiver: `0x${string}`
  bps: number // basis points (e.g., 5000 = 50%)
}

/**
 * Static fee splitter data (splits configuration)
 * Fetched in getStaticProject() via multicall
 */
export type FeeSplitterStatic = {
  isConfigured: boolean
  isActive: boolean // true if current fee receiver is the splitter
  splits: SplitConfig[]
  totalBps: number
}

/**
 * Dynamic fee splitter data (pending fees)
 * Fetched in getProject() via multicall
 */
export type FeeSplitterDynamic = {
  pendingFees: {
    token: bigint
    weth: bigint | null
  }
}

/**
 * Get static fee splitter contracts for multicall
 * Returns contracts for: isSplitsConfigured(), getSplits(), getTotalBps()
 */
export function getFeeSplitterStaticContracts(
  clankerToken: `0x${string}`,
  feeSplitterAddress: `0x${string}`
) {
  return [
    {
      address: feeSplitterAddress,
      abi: LevrFeeSplitter_v1,
      functionName: 'isSplitsConfigured' as const,
      args: [clankerToken],
    },
    {
      address: feeSplitterAddress,
      abi: LevrFeeSplitter_v1,
      functionName: 'getSplits' as const,
      args: [clankerToken],
    },
    {
      address: feeSplitterAddress,
      abi: LevrFeeSplitter_v1,
      functionName: 'getTotalBps' as const,
      args: [clankerToken],
    },
  ]
}

/**
 * Parse static fee splitter data from multicall results
 * Returns null if splits are not configured
 */
export function parseFeeSplitterStatic(
  results: [
    { result: boolean; status: 'success' | 'failure' }, // isSplitsConfigured
    { result: SplitConfig[]; status: 'success' | 'failure' }, // getSplits
    { result: bigint; status: 'success' | 'failure' }, // getTotalBps
  ],
  currentFeeRecipient?: `0x${string}`,
  feeSplitterAddress?: `0x${string}`
): FeeSplitterStatic | null {
  const [isConfiguredResult, splitsResult, totalBpsResult] = results

  // Check if all calls succeeded
  if (
    isConfiguredResult.status !== 'success' ||
    splitsResult.status !== 'success' ||
    totalBpsResult.status !== 'success'
  ) {
    return null
  }

  // Check if splits are configured
  if (!isConfiguredResult.result) {
    return null
  }

  // Determine if splitter is active by comparing current recipient to splitter address
  const isActive = !!(
    currentFeeRecipient &&
    feeSplitterAddress &&
    currentFeeRecipient.toLowerCase() === feeSplitterAddress.toLowerCase()
  )

  return {
    isConfigured: isConfiguredResult.result,
    isActive,
    splits: splitsResult.result,
    totalBps: Number(totalBpsResult.result),
  }
}

/**
 * Get dynamic fee splitter contracts for multicall
 * Returns contracts for: pendingFees() for each reward token
 */
export function getFeeSplitterDynamicContracts(
  clankerToken: `0x${string}`,
  feeSplitterAddress: `0x${string}`,
  rewardTokens: `0x${string}`[]
) {
  return rewardTokens.map((rewardToken) => ({
    address: feeSplitterAddress,
    abi: LevrFeeSplitter_v1,
    functionName: 'pendingFees' as const,
    args: [clankerToken, rewardToken],
  }))
}

/**
 * Parse dynamic fee splitter data from multicall results
 * Maps pending fees results to { token, weth } structure
 */
export function parseFeeSplitterDynamic(
  results: Array<{ result: bigint; status: 'success' | 'failure' }>,
  wethAddress?: `0x${string}`
): FeeSplitterDynamic {
  // First result is always the clanker token
  const tokenPending = results[0]?.status === 'success' ? results[0].result : 0n

  // Second result is WETH (if provided)
  const wethPending = wethAddress && results[1]?.status === 'success' ? results[1].result : null

  return {
    pendingFees: {
      token: tokenPending,
      weth: wethPending,
    },
  }
}
