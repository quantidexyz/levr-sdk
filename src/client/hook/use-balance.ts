'use client'

import { useQuery } from '@tanstack/react-query'
import { erc20Abi, formatUnits } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

export type TokenConfig = {
  address: `0x${string}`
  decimals: number
  key?: string // Optional key for accessing the balance in the result
}

export type UseBalanceParams = {
  tokens?: TokenConfig[]
  enabled?: boolean
  refetchInterval?: number | false
}

export type BalanceResult = {
  raw: bigint
  formatted: string
}

/**
 * Flexible balance hook that fetches balances for multiple tokens in a single multicall
 * @param tokens - Array of token configurations to fetch balances for
 * @param enabled - Whether the query is enabled
 * @param refetchInterval - Refetch interval in milliseconds (default: 10_000)
 * @returns Query result with balances keyed by token address or custom key
 */
export function useBalance({
  tokens = [],
  enabled = true,
  refetchInterval = 10_000,
}: UseBalanceParams = {}) {
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const address = wallet.data?.account?.address

  const query = useQuery({
    queryKey: ['balance', tokens.map((t) => t.address).join(','), address],
    queryFn: async () => {
      if (!address || tokens.length === 0) return {}

      const results = await publicClient!.multicall({
        contracts: tokens.map((token) => ({
          address: token.address,
          abi: erc20Abi,
          functionName: 'balanceOf' as const,
          args: [address],
        })),
      })

      const balances: Record<string, BalanceResult> = {}

      tokens.forEach((token, index) => {
        const result = results[index].result
        const key = token.key || token.address
        balances[key] = {
          raw: (result as bigint) || 0n,
          formatted: formatUnits((result as bigint) || 0n, token.decimals),
        }
      })

      return balances
    },
    enabled: enabled && !!publicClient && !!address && tokens.length > 0,
    refetchInterval,
  })

  return query
}
