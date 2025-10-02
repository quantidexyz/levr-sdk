import { CLANKERS } from 'clanker-sdk'
import type { Clanker } from 'clanker-sdk/v4'
import { Schema } from 'effect'
import { decodeFunctionResult, encodeFunctionData } from 'viem'
import type { PublicClient, WalletClient } from 'viem'
import * as chains from 'viem/chains'

import { LevrFactory_v1 } from './abis'
import { buildClankerV4 } from './build-clanker-v4'
import { ClankerDeploymentSchema } from './schema'
import type { LevrClankerDeploymentSchemaType } from './schema'

export type CallData = { target: `0x${string}`; allowFailure: boolean; callData: `0x${string}` }

export type BuildCalldatasV4Params = {
  c: LevrClankerDeploymentSchemaType
  clanker: Clanker
  publicClient: PublicClient
  wallet: WalletClient
  factoryAddress: `0x${string}`
  treasuryAirdropAmount: number
}

export type BuildCalldatasV4ReturnType = {
  callDatas: CallData[]
  clankerTokenAddress: `0x${string}`
}

export const clankerV4Factory: Record<number, `0x${string}`> = {
  // In our dev monorepo, we have a clanker_v4_anvil contract, but in the remote package, it's not defined
  [chains.anvil.id]: (CLANKERS as any)?.clanker_v4_anvil?.address,
  [chains.base.id]: CLANKERS.clanker_v4.address,
  [chains.baseSepolia.id]: CLANKERS.clanker_v4_sepolia.address,
}

export const buildCalldatasV4 = async ({
  c,
  clanker,
  publicClient,
  wallet,
  factoryAddress,
  treasuryAirdropAmount,
}: BuildCalldatasV4Params): Promise<BuildCalldatasV4ReturnType> => {
  const deployer = wallet.account?.address

  if (!publicClient.chain?.id) throw new Error('Chain ID not found')
  const chainId = publicClient.chain.id
  const clankerFactory = clankerV4Factory?.[chainId]
  if (!clankerFactory) throw new Error('Clanker factory not found')

  if (!deployer) throw new Error('Deployer address not found')

  const prepareForDeploymentTransaction = encodeFunctionData({
    abi: LevrFactory_v1,
    functionName: 'prepareForDeployment',
    args: [],
  })

  const result = await publicClient.call({
    to: factoryAddress, // Your LevrFactory_v1 contract address
    data: prepareForDeploymentTransaction,
    account: wallet.account, // The sender address
  })

  if (!result.data) throw new Error('Prepare for deployment failed')

  // Then decode the result
  const [treasury, staking] = decodeFunctionResult({
    abi: LevrFactory_v1,
    functionName: 'prepareForDeployment',
    data: result.data,
  })

  const config = buildClankerV4({
    c,
    treasuryAddress: treasury,
    treasuryAirdropAmount,
    deployer,
    staking,
    chainId,
  })

  // Validate the config
  Schema.decode(ClankerDeploymentSchema)(config)

  const deployContractCall = await clanker.getDeployTransaction(config)
  const deployTransaction = encodeFunctionData({
    abi: deployContractCall.abi,
    functionName: deployContractCall.functionName,
    args: deployContractCall.args,
  })
  const { result: tokenAddress } = await publicClient.simulateContract(deployContractCall)

  const proxyDeployTransaction = encodeFunctionData({
    abi: LevrFactory_v1,
    functionName: 'executeTransaction',
    args: [clankerFactory, deployTransaction],
  })

  const callDatas = [
    {
      target: factoryAddress,
      allowFailure: false,
      callData: prepareForDeploymentTransaction,
    },
    {
      target: factoryAddress,
      allowFailure: false,
      callData: proxyDeployTransaction,
    },
    {
      target: factoryAddress,
      allowFailure: false,
      callData: encodeFunctionData({
        abi: LevrFactory_v1,
        functionName: 'register',
        args: [tokenAddress],
      }),
    },
  ]

  return { callDatas, clankerTokenAddress: tokenAddress }
}
