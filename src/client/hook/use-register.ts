'use client'

import { useMutation } from '@tanstack/react-query'
import { decodeEventLog, encodeFunctionData } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { LevrFactory_v1, LevrForwarder_v1 } from '../../abis'
import { GET_FACTORY_ADDRESS } from '../../constants'
import type { CallData } from '../../types'

export type UseRegisterParams = {
  onSuccess?: (params: RegisterResult) => void
  onError?: (error: unknown) => void
}

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
export function useRegister({ onSuccess, onError }: UseRegisterParams) {
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)

  return useMutation({
    mutationFn: async (params: { clankerToken: `0x${string}` }) => {
      if (!wallet.data) throw new Error('Wallet is not connected')
      if (!factoryAddress) throw new Error('Factory address is required')
      if (!publicClient) throw new Error('Public client is not connected')

      const prepareTransaction = encodeFunctionData({
        abi: LevrFactory_v1,
        functionName: 'prepareForDeployment',
        args: [],
      })

      const registerTransaction = encodeFunctionData({
        abi: LevrFactory_v1,
        functionName: 'register',
        args: [params.clankerToken],
      })

      const callDatas: CallData[] = [
        {
          target: factoryAddress,
          allowFailure: false,
          value: 0n,
          callData: prepareTransaction,
        },
        {
          target: factoryAddress,
          allowFailure: false,
          value: 0n,
          callData: registerTransaction,
        },
      ]

      const forwarderAddress = await publicClient.readContract({
        address: factoryAddress,
        abi: LevrFactory_v1,
        functionName: 'trustedForwarder',
      })

      const hash = await wallet.data.writeContract({
        address: forwarderAddress,
        abi: LevrForwarder_v1,
        functionName: 'executeMulticall',
        args: [callDatas],
      })

      const receipt = await publicClient?.waitForTransactionReceipt({ hash })

      let project: RegisterResult['project']

      // Find the Registered event (emitted by LevrFactory_v1.register)
      const registeredLog = receipt?.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: LevrFactory_v1,
            data: log.data,
            topics: log.topics,
          })
          return decoded.eventName === 'Registered'
        } catch {
          return false
        }
      })

      if (registeredLog) {
        const decoded = decodeEventLog({
          abi: LevrFactory_v1,
          data: registeredLog.data,
          topics: registeredLog.topics,
        })

        if (decoded.eventName === 'Registered') {
          // Event signature: Registered(address indexed clankerToken, address indexed treasury, address governor, address staking, address stakedToken)
          project = {
            treasury: decoded.args.treasury as `0x${string}`,
            governor: decoded.args.governor as `0x${string}`,
            staking: decoded.args.staking as `0x${string}`,
            stakedToken: decoded.args.stakedToken as `0x${string}`,
          }
        }
      }

      return {
        hash,
        project,
      }
    },
    onSuccess,
    onError,
  })
}
