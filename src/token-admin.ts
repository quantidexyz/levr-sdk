import type { PublicClient, TransactionReceipt, WalletClient } from 'viem'

import { IClankerToken } from './abis'

export type UpdateTokenMetadataParams = {
  walletClient: WalletClient
  publicClient: PublicClient
  clankerToken: `0x${string}`
  metadata: string
}

export type UpdateTokenImageParams = {
  walletClient: WalletClient
  publicClient: PublicClient
  clankerToken: `0x${string}`
  imageUrl: string
}

export type UpdateTokenAdminParams = {
  walletClient: WalletClient
  publicClient: PublicClient
  clankerToken: `0x${string}`
  newAdmin: `0x${string}`
}

/**
 * Update token metadata (requires current admin)
 */
export async function updateTokenMetadata({
  walletClient,
  publicClient,
  clankerToken,
  metadata,
}: UpdateTokenMetadataParams): Promise<TransactionReceipt> {
  if (!walletClient.account) {
    throw new Error('Wallet account not available')
  }

  const hash = await walletClient.writeContract({
    address: clankerToken,
    abi: IClankerToken,
    functionName: 'updateMetadata',
    args: [metadata],
    chain: walletClient.chain,
    account: walletClient.account,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  if (receipt.status === 'reverted') {
    throw new Error('Update metadata transaction reverted')
  }

  return receipt
}

/**
 * Update token image URL (requires current admin)
 */
export async function updateTokenImage({
  walletClient,
  publicClient,
  clankerToken,
  imageUrl,
}: UpdateTokenImageParams): Promise<TransactionReceipt> {
  if (!walletClient.account) {
    throw new Error('Wallet account not available')
  }

  const hash = await walletClient.writeContract({
    address: clankerToken,
    abi: IClankerToken,
    functionName: 'updateImage',
    args: [imageUrl],
    chain: walletClient.chain,
    account: walletClient.account,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  if (receipt.status === 'reverted') {
    throw new Error('Update image transaction reverted')
  }

  return receipt
}

/**
 * Transfer token admin to a new address (requires current admin)
 */
export async function updateTokenAdmin({
  walletClient,
  publicClient,
  clankerToken,
  newAdmin,
}: UpdateTokenAdminParams): Promise<TransactionReceipt> {
  if (!walletClient.account) {
    throw new Error('Wallet account not available')
  }

  const hash = await walletClient.writeContract({
    address: clankerToken,
    abi: IClankerToken,
    functionName: 'updateAdmin',
    args: [newAdmin],
    chain: walletClient.chain,
    account: walletClient.account,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  if (receipt.status === 'reverted') {
    throw new Error('Update admin transaction reverted')
  }

  return receipt
}

/**
 * Read token admin address
 */
export async function getTokenAdmin(
  publicClient: PublicClient,
  clankerToken: `0x${string}`
): Promise<`0x${string}`> {
  const admin = await publicClient.readContract({
    address: clankerToken,
    abi: IClankerToken,
    functionName: 'admin',
  })

  return admin as `0x${string}`
}

/**
 * Read original token admin address (immutable)
 */
export async function getOriginalTokenAdmin(
  publicClient: PublicClient,
  clankerToken: `0x${string}`
): Promise<`0x${string}`> {
  const originalAdmin = await publicClient.readContract({
    address: clankerToken,
    abi: IClankerToken,
    functionName: 'originalAdmin',
  })

  return originalAdmin as `0x${string}`
}
