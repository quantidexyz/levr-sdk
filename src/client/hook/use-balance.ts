'use client'

import { useQuery } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'

import { balance } from '../../balance'
import type { TokenConfig } from '../../balance'

export type UseBalanceParams = {
  tokens?: TokenConfig[]
  enabled?: boolean
  refetchInterval?: number | false
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

      return balance({
        publicClient: publicClient!,
        address,
        tokens,
      })
    },
    enabled: enabled && !!publicClient && !!address && tokens.length > 0,
    refetchInterval,
  })

  return query
}
