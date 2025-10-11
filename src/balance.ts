import { erc20Abi, formatUnits, zeroAddress } from 'viem'

import type { BalanceResult, PopPublicClient, PricingResult } from './types'

export type TokenConfig = {
  address: `0x${string}`
  decimals: number
  key?: string // Optional key for accessing the balance in the result
}

export type BalanceParams = {
  publicClient: PopPublicClient
  address: `0x${string}`
  tokens: TokenConfig[]
  pricing?: PricingResult
}

/**
 * Calculate USD value for a balance
 */
const calculateUsd = (formatted: string, usdPrice: string): string => {
  const amount = parseFloat(formatted)
  const price = parseFloat(usdPrice)
  return (amount * price).toString()
}

/**
 * Get balances for multiple tokens including native currency
 * @param publicClient - The public client to use for queries
 * @param address - The address to check balances for
 * @param tokens - Array of token configurations (use zeroAddress for native currency)
 * @param pricing - Optional pricing data for USD values
 * @returns Object with balances keyed by token address or custom key
 */
export async function balance({
  publicClient,
  address,
  tokens,
  pricing,
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
        const formatted = formatUnits(nativeBalance, token.decimals)
        balances[key] = {
          raw: nativeBalance,
          formatted,
          usd: pricing && key === 'eth' ? calculateUsd(formatted, pricing.wethUsd) : undefined,
        }
      })
    } catch (error) {
      // If native balance fetch fails, set to 0
      nativeTokens.forEach((token) => {
        const key = token.key || token.address
        balances[key] = {
          raw: 0n,
          formatted: '0',
          usd: pricing ? '0.00' : undefined,
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
        const raw = (result as bigint) || 0n
        const formatted = formatUnits(raw, token.decimals)

        // Calculate USD value based on token type
        let usd: string | undefined
        if (pricing) {
          if (key === 'token') {
            usd = calculateUsd(formatted, pricing.tokenUsd)
          } else if (key === 'weth') {
            usd = calculateUsd(formatted, pricing.wethUsd)
          }
        }

        balances[key] = {
          raw,
          formatted,
          usd,
        }
      })
    } catch (error) {
      // If multicall fails, set all ERC20 balances to 0
      erc20Tokens.forEach((token) => {
        const key = token.key || token.address
        balances[key] = {
          raw: 0n,
          formatted: '0',
          usd: pricing ? '0.00' : undefined,
        }
      })
    }
  }

  return balances
}
