'use client'

import { useMutation } from '@tanstack/react-query'
import { decodeFunctionResult } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { GET_FACTORY_ADDRESS } from '../..'
import { LevrFactory_v1 } from '../../abis'

export type UsePrepareParams = {
  onSuccess?: (params: {
    hash: `0x${string}`
    treasury: `0x${string}` | undefined
    staking: `0x${string}` | undefined
  }) => void
  onError?: (error: unknown) => void
}

/**
 * Prepares a project for the Levr factory registration.
 * @param factoryAddress - The address of the Levr factory.
 * @param options - The options for the prepare mutation.
 * @returns The hash of the transaction.
 */
export function usePrepare({ onSuccess, onError }: UsePrepareParams) {
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id

  return useMutation({
    mutationFn: async () => {
      const factoryAddress = GET_FACTORY_ADDRESS(chainId)
      if (!factoryAddress) throw new Error('Factory address is not found')
      if (!wallet.data) throw new Error('Wallet is not connected')

      const hash = await wallet.data.writeContract({
        address: factoryAddress,
        abi: LevrFactory_v1,
        functionName: 'prepareForDeployment',
      })

      const receipt = await publicClient?.waitForTransactionReceipt({ hash })
      const data = receipt?.logs[0].data

      let treasury: `0x${string}` | undefined
      let staking: `0x${string}` | undefined

      if (data) {
        ;[treasury, staking] = decodeFunctionResult({
          abi: LevrFactory_v1,
          functionName: 'prepareForDeployment',
          data,
        })
      }

      return {
        hash,
        treasury,
        staking,
      }
    },
    onSuccess,
    onError,
  })
}
