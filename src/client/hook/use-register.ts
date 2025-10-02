'use client'

import { useMutation } from '@tanstack/react-query'
import { decodeFunctionResult } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { LevrFactory_v1 } from '../../abis'
import { GET_FACTORY_ADDRESS } from '../../constants'

export type RegisterResult = {
  hash: `0x${string}`
  project:
    | {
        treasury: `0x${string}`
        governor: `0x${string}`
        staking: `0x${string}`
        stakedToken: `0x${string}`
      }
    | undefined
}
/**
 * Registers a project with the Levr factory.
 * @param factoryAddress - The address of the Levr factory.
 * @param options - The options for the register mutation.
 * @returns The hash of the transaction.
 */
export function useRegister(options?: {
  onSuccess?: (params: RegisterResult) => void
  onError?: (error: unknown) => void
}) {
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)

  return useMutation({
    mutationFn: async (params: { clankerToken: `0x${string}` }) => {
      if (!wallet.data) throw new Error('Wallet is not connected')
      if (!factoryAddress) throw new Error('Factory address is required')

      const hash = await wallet.data.writeContract({
        address: factoryAddress,
        abi: LevrFactory_v1,
        functionName: 'register',
        args: [params.clankerToken],
      })

      const receipt = await publicClient?.waitForTransactionReceipt({ hash })
      const data = receipt?.logs[0].data

      let project: RegisterResult['project']

      if (data) {
        project = decodeFunctionResult({
          abi: LevrFactory_v1,
          functionName: 'register',
          data,
        })
      }

      return {
        hash,
        project,
      }
    },
    onSuccess: (params) => options?.onSuccess?.(params),
    onError: options?.onError,
  })
}
