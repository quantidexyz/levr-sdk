'use client'

import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'

import { IClankerLpLockerMultiple } from '../../abis'
import { DYNAMIC_FEE_FLAG, GET_LP_LOCKER_ADDRESS } from '../../constants'
import type { PoolKey } from './use-swap'

export type PoolInfo = {
  poolKey: PoolKey
  token: `0x${string}`
  positionId: bigint
  numPositions: bigint
  isDynamicFee: boolean
  feeDisplay: string // Human-readable fee display
}

export type UsePoolInfoParams = {
  clankerToken?: `0x${string}`
  enabled?: boolean
}

/**
 * Hook for fetching pool information from the Clanker LP Locker
 * @param params - Hook parameters
 * @returns Query result with pool configuration
 */
export function usePoolInfo({ clankerToken, enabled = true }: UsePoolInfoParams = {}) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id
  const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)

  return useQuery<PoolInfo | null>({
    queryKey: ['pool-info', clankerToken, chainId],
    queryFn: async () => {
      if (!clankerToken || !lpLockerAddress) return null

      const result = await publicClient!.readContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [clankerToken],
      })

      const poolKey = {
        currency0: result.poolKey.currency0,
        currency1: result.poolKey.currency1,
        fee: result.poolKey.fee,
        tickSpacing: result.poolKey.tickSpacing,
        hooks: result.poolKey.hooks,
      }

      // Check if fee has dynamic flag set (bit 23)
      const isDynamicFee = (poolKey.fee & DYNAMIC_FEE_FLAG) !== 0
      const feeDisplay = isDynamicFee ? 'Dynamic' : `${(poolKey.fee / 10000).toFixed(2)}%`

      return {
        token: result.token,
        poolKey,
        positionId: result.positionId,
        numPositions: result.numPositions,
        isDynamicFee,
        feeDisplay,
      }
    },
    enabled: enabled && !!publicClient && !!lpLockerAddress && !!clankerToken,
    staleTime: 60_000, // Pool info doesn't change often
  })
}
