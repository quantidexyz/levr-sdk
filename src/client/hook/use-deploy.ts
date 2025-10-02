import { useMutation } from '@tanstack/react-query'

import { LevrFactory_v1, LevrForwarder_v1 } from '../../abis'
import { buildCalldatasV4 } from '../../build-calldatas-v4'
import { GET_FACTORY_ADDRESS } from '../../constants'
import type { LevrClankerDeploymentSchemaType } from '../../schema'
import { useClanker } from './use-clanker'

/**
 * Deploys a Clanker token and registers it with the Levr factory.
 * Returns tx hash and deployed address.
 */
export function useDeploy({
  treasuryAirdropAmount = 100_000_000,
  onSuccess,
  onError,
}: {
  treasuryAirdropAmount?: number
  onSuccess?: (params: { txHash: `0x${string}`; address: `0x${string}` }) => void
  onError?: (error: unknown) => void
}) {
  const { clanker } = useClanker()
  const chainId = clanker.data?.publicClient?.chain?.id
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)

  return useMutation({
    mutationFn: async (c: LevrClankerDeploymentSchemaType) => {
      if (!factoryAddress) throw new Error('Factory address is required')
      if (!clanker.data) throw new Error('Clanker SDK not found')

      const wallet = clanker.data.wallet
      const publicClient = clanker.data.publicClient

      if (!wallet || !publicClient) throw new Error('Wallet or public client not found')
      if (!chainId) throw new Error('Chain ID not found')

      const { callDatas, clankerTokenAddress } = await buildCalldatasV4({
        c,
        clanker: clanker.data,
        publicClient,
        wallet,
        factoryAddress,
        treasuryAirdropAmount,
      })

      const trustedForwarder = await publicClient.readContract({
        address: factoryAddress,
        abi: LevrFactory_v1,
        functionName: 'trustedForwarder',
      })

      const txHash = await wallet.writeContract({
        address: trustedForwarder,
        abi: LevrForwarder_v1,
        functionName: 'executeMulticall',
        args: [callDatas],
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      return {
        txHash,
        address: clankerTokenAddress,
      }
    },
    onSuccess,
    onError,
  })
}
