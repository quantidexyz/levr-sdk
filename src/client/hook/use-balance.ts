'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { zeroAddress } from 'viem'
import { useAccount, useChainId, usePublicClient } from 'wagmi'

import type { PricingResult } from '../..'
import type { TokenConfig } from '../../balance'
import { balance } from '../../balance'
import { WETH } from '../../constants'
import { queryKeys } from '../query-keys'

export type UseBalanceParams = {
  tokens?: TokenConfig[]
  enabled?: boolean
  refetchInterval?: number | false
}

export type UseBalanceQueryParams = {
  clankerToken: Address | null
  projectTokenDecimals?: number
  pricing?: PricingResult
  enabled?: boolean
}

/**
 * Internal: Creates balance query with all logic
 * Used by LevrProvider
 */
export function useBalanceQuery({
  clankerToken,
  projectTokenDecimals = 18,
  pricing,
  enabled: e = true,
}: UseBalanceQueryParams) {
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { address: userAddress } = useAccount()
  const wethAddress = WETH(chainId)?.address

  const tokenAddresses = useMemo(() => {
    const addresses: Array<{ address: Address; decimals: number; key: string }> = []

    if (clankerToken) {
      addresses.push({
        address: clankerToken,
        decimals: projectTokenDecimals,
        key: 'token',
      })
    }

    if (wethAddress) {
      addresses.push({
        address: wethAddress,
        decimals: 18,
        key: 'weth',
      })
    }

    // Add native ETH balance
    addresses.push({
      address: zeroAddress,
      decimals: 18,
      key: 'eth',
    })

    return addresses
  }, [clankerToken, projectTokenDecimals, wethAddress])

  return useQuery({
    queryKey: queryKeys.balance(tokenAddresses.map((t) => t.address).join(','), userAddress!),
    queryFn: async () => {
      if (!userAddress || tokenAddresses.length === 0) return {}

      return balance({
        publicClient: publicClient!,
        address: userAddress,
        tokens: tokenAddresses,
        pricing,
      })
    },
    enabled: e && !!publicClient && !!userAddress && tokenAddresses.length > 0,
    refetchInterval: 10_000,
  })
}
