'use client'

import { useMutation } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'

import { LevrFeeSplitter_v1 } from '../../abis'
import { GET_FEE_SPLITTER_ADDRESS } from '../../constants'

export type SplitConfig = {
  receiver: `0x${string}`
  percentage: number
}

export type UseConfigureSplitsParams = {
  onSuccess?: (hash: `0x${string}`) => void
  onError?: (error: unknown) => void
}

export function useConfigureSplits({ onSuccess, onError }: UseConfigureSplitsParams = {}) {
  const publicClient = usePublicClient()
  const wallet = useWalletClient()
  const chainId = publicClient?.chain?.id

  return useMutation({
    mutationFn: async (params: { clankerToken: `0x${string}`; splits: readonly SplitConfig[] }) => {
      const splitterAddress = GET_FEE_SPLITTER_ADDRESS(chainId!)
      if (!splitterAddress) throw new Error('Fee splitter not deployed on this chain')

      // Convert percentage to bps
      const splitsWithBps = params.splits.map((s) => ({
        receiver: s.receiver,
        bps: Math.floor(s.percentage * 100), // percentage to basis points
      }))

      const hash = await wallet.data!.writeContract({
        address: splitterAddress,
        abi: LevrFeeSplitter_v1,
        functionName: 'configureSplits',
        args: [params.clankerToken, splitsWithBps],
      })

      return hash
    },
    onSuccess: async (hash) => {
      onSuccess?.(hash)
    },
    onError: onError,
  })
}
