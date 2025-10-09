import type { Clanker } from 'clanker-sdk/v4'
import type { TransactionReceipt } from 'viem'

import { LevrFactory_v1, LevrForwarder_v1 } from './abis'
import { buildCalldatasV4 } from './build-calldatas-v4'
import { GET_FACTORY_ADDRESS, TREASURY_AIRDROP_AMOUNTS } from './constants'
import type { LevrClankerDeploymentSchemaType } from './schema'

export type DeployV4Params = {
  c: LevrClankerDeploymentSchemaType
  clanker: Clanker | undefined | null
  treasuryAirdropAmount?: number
}

export type DeployV4ReturnType = {
  receipt: TransactionReceipt
  address: `0x${string}`
}

export const deployV4 = async ({
  c,
  treasuryAirdropAmount = TREASURY_AIRDROP_AMOUNTS[0], // Use first amount as default
  clanker,
}: DeployV4Params): Promise<DeployV4ReturnType> => {
  if (!clanker) throw new Error('Clanker SDK not found')

  const wallet = clanker.wallet
  const publicClient = clanker.publicClient
  if (!publicClient) throw new Error('Public client not found')
  if (!wallet) throw new Error('Wallet not found')

  const chainId = publicClient.chain?.id
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)
  if (!factoryAddress) throw new Error('Factory address is required')

  const trustedForwarder = await publicClient.readContract({
    address: factoryAddress,
    abi: LevrFactory_v1,
    functionName: 'trustedForwarder',
  })

  const { callDatas, clankerTokenAddress, totalValue } = await buildCalldatasV4({
    c,
    clanker,
    publicClient,
    wallet,
    factoryAddress,
    forwarderAddress: trustedForwarder,
    treasuryAirdropAmount,
  })

  const txHash = await wallet.writeContract({
    address: trustedForwarder,
    abi: LevrForwarder_v1,
    functionName: 'executeMulticall',
    args: [callDatas],
    value: totalValue,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

  if (receipt.status === 'reverted') {
    throw new Error('Deployment transaction reverted')
  }

  return {
    receipt,
    address: clankerTokenAddress,
  }
}
