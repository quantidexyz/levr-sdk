import { erc20Abi, formatUnits, zeroAddress } from 'viem'

import type { PopPublicClient } from './types'

export type TokenConfig = {
  address: `0x${string}`
  decimals: number
  key?: string // Optional key for accessing the balance in the result
}

export type BalanceParams = {
  publicClient: PopPublicClient
  address: `0x${string}`
  tokens: TokenConfig[]
}

export type BalanceResult = {
  raw: bigint
  formatted: string
}

/**
 * Get balances for multiple tokens including native currency
 * @param publicClient - The public client to use for queries
 * @param address - The address to check balances for
 * @param tokens - Array of token configurations (use zeroAddress for native currency)
 * @returns Object with balances keyed by token address or custom key
 */
export async function balance({
  publicClient,
  address,
  tokens,
}: BalanceParams): Promise<Record<string, BalanceResult>> {
  if (!address || tokens.length === 0) return {}

  const balances: Record<string, BalanceResult> = {}

  // Separate native and ERC20 tokens
  const erc20Tokens = tokens.filter((token) => token.address !== zeroAddress)
  const nativeTokens = tokens.filter((token) => token.address === zeroAddress)

  // Handle native balance
  if (nativeTokens.length > 0) {
    try {
      const nativeBalance = await publicClient.getBalance({ address })

      nativeTokens.forEach((token) => {
        const key = token.key || token.address
        balances[key] = {
          raw: nativeBalance,
          formatted: formatUnits(nativeBalance, token.decimals),
        }
      })
    } catch (error) {
      // If native balance fetch fails, set to 0
      nativeTokens.forEach((token) => {
        const key = token.key || token.address
        balances[key] = {
          raw: 0n,
          formatted: '0',
        }
      })
    }
  }

  // Handle ERC20 balances using multicall
  if (erc20Tokens.length > 0) {
    try {
      const results = await publicClient.multicall({
        contracts: erc20Tokens.map((token) => ({
          address: token.address,
          abi: erc20Abi,
          functionName: 'balanceOf' as const,
          args: [address],
        })),
      })

      erc20Tokens.forEach((token, index) => {
        const result = results[index].result
        const key = token.key || token.address
        balances[key] = {
          raw: (result as bigint) || 0n,
          formatted: formatUnits((result as bigint) || 0n, token.decimals),
        }
      })
    } catch (error) {
      // If multicall fails, set all ERC20 balances to 0
      erc20Tokens.forEach((token) => {
        const key = token.key || token.address
        balances[key] = {
          raw: 0n,
          formatted: '0',
        }
      })
    }
  }

  return balances
}
