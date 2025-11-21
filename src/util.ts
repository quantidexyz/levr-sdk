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
      : parseUnits(normalizeDecimalInput(currentAllowance), decimals!)
  const parsedRequiredAmount =
    typeof requiredAmount === 'bigint'
      ? requiredAmount
      : parseUnits(normalizeDecimalInput(requiredAmount), decimals!)

  return parsedCurrentAllowance < parsedRequiredAmount
}

/**
 * Normalize decimal inputs to plain string representations (no scientific notation)
 */
export function normalizeDecimalInput(value: string | number): string {
  let inputString: string

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Invalid decimal number')
    }
    inputString = value.toString()
  } else {
    inputString = value.trim()
  }

  if (inputString.length === 0) {
    return '0'
  }

  if (!/[eE]/.test(inputString)) {
    return inputString
  }

  return expandScientific(inputString)
}

function expandScientific(input: string): string {
  const normalized = input.replace(/^\+/, '')
  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized
  const [mantissa, exponentPart] = unsigned.split(/[eE]/)
  const exponent = Number(exponentPart)
  if (!Number.isInteger(exponent)) {
    throw new Error('Invalid exponent in decimal input')
  }

  const [intPartRaw, fracPartRaw = ''] = mantissa.split('.')
  const intPart = intPartRaw || '0'
  const fracPart = fracPartRaw
  const rawDigitsUntrimmed = intPart + fracPart
  const digits = rawDigitsUntrimmed === '' ? '0' : rawDigitsUntrimmed
  const decimalIndex = intPart.length + exponent
  const sign = negative ? '-' : ''

  if (decimalIndex <= 0) {
    const zeros = Math.abs(decimalIndex)
    const normalizedDigits = digits.replace(/^0+(?=\d)/, '') || '0'
    return `${sign}0.${'0'.repeat(zeros)}${normalizedDigits}`
  }

  if (decimalIndex >= digits.length) {
    return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`
  }

  const whole = digits.slice(0, decimalIndex) || '0'
  const fraction = digits.slice(decimalIndex)
  return `${sign}${whole}.${fraction}`
}
