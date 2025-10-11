import { createPublicClient, http, parseUnits } from 'viem'
import { base, baseSepolia } from 'viem/chains'

import type { PopPublicClient } from './types'

/**
 * Default public RPC URLs for common chains
 */
const DEFAULT_RPC_URLS: Record<number, string> = {
  [base.id]: 'https://mainnet.base.org',
  [baseSepolia.id]: 'https://sepolia.base.org',
}

/**
 * Get a configured public client for a given chain
 * @param chainId - The chain ID to connect to
 * @param rpcUrl - Optional custom RPC URL (falls back to public endpoints)
 * @returns Configured public client
 *
 * @example
 * ```typescript
 * // Use default public RPC
 * const client = getPublicClient(8453)
 *
 * // Use custom RPC
 * const client = getPublicClient(8453, 'https://my-rpc.com')
 * ```
 */
export function getPublicClient(chainId: number, rpcUrl?: string): PopPublicClient {
  const url = rpcUrl || DEFAULT_RPC_URLS[chainId]
  if (!url) {
    throw new Error(
      `No RPC URL available for chain ID ${chainId}. Please provide rpcUrl parameter.`
    )
  }

  // Get chain config
  let chain
  if (chainId === base.id) {
    chain = base
  } else if (chainId === baseSepolia.id) {
    chain = baseSepolia
  } else {
    throw new Error(`Unsupported chain ID ${chainId}`)
  }

  return createPublicClient({
    chain,
    transport: http(url),
  }) as PopPublicClient
}

/**
 * Check if approval is needed for a given amount
 */
export function needsApproval(
  currentAllowance: string | number | bigint,
  requiredAmount: string | number | bigint,
  decimals?: number
): boolean {
  if (typeof currentAllowance !== 'bigint' || typeof requiredAmount !== 'bigint') {
    if (!decimals) {
      throw new Error('Decimals are required, when not using bigint')
    }
  }

  const parsedCurrentAllowance =
    typeof currentAllowance === 'bigint'
      ? currentAllowance
      : parseUnits(currentAllowance.toString(), decimals!)
  const parsedRequiredAmount =
    typeof requiredAmount === 'bigint'
      ? requiredAmount
      : parseUnits(requiredAmount.toString(), decimals!)

  return parsedCurrentAllowance < parsedRequiredAmount
}
