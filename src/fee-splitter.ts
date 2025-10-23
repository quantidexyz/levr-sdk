import type { Address, PublicClient, WalletClient } from 'viem'

import LevrFeeSplitterDeployer_v1 from './abis/LevrFeeSplitterDeployer_v1'
import { GET_FEE_SPLITTER_DEPLOYER_ADDRESS } from './constants'

export interface DeployFeeSplitterParams {
  publicClient: PublicClient
  walletClient: WalletClient
  clankerToken: Address
}

export interface GetFeeSplitterParams {
  publicClient: PublicClient
  clankerToken: Address
  chainId: number
}

/**
 * Deploy a new fee splitter for a Clanker token
 * Only needs to be called once per token
 * Returns the deployed splitter address (either newly deployed or existing)
 */
export async function deployFeeSplitter(params: DeployFeeSplitterParams): Promise<Address> {
  const { publicClient, walletClient, clankerToken } = params
  const chainId = walletClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found')

  const deployerAddress = GET_FEE_SPLITTER_DEPLOYER_ADDRESS(chainId)
  if (!deployerAddress) throw new Error('Fee splitter deployer not found for this chain')

  // Check if already deployed
  const existing = await publicClient.readContract({
    address: deployerAddress,
    abi: LevrFeeSplitterDeployer_v1,
    functionName: 'getSplitter',
    args: [clankerToken],
  })

  if (existing && existing !== '0x0000000000000000000000000000000000000000') {
    return existing as Address
  }

  // Deploy new splitter
  const hash = await walletClient.writeContract({
    address: deployerAddress,
    abi: LevrFeeSplitterDeployer_v1,
    functionName: 'deploy',
    args: [clankerToken],
    chain: walletClient.chain,
    account: walletClient.account!,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status === 'reverted') {
    throw new Error('Fee splitter deployment failed')
  }

  // Get deployed address
  const splitterAddress = await publicClient.readContract({
    address: deployerAddress,
    abi: LevrFeeSplitterDeployer_v1,
    functionName: 'getSplitter',
    args: [clankerToken],
  })

  return splitterAddress as Address
}

/**
 * Get the fee splitter address for a token (if deployed)
 * Returns undefined if not deployed yet
 */
export async function getFeeSplitter(params: GetFeeSplitterParams): Promise<Address | undefined> {
  const { publicClient, clankerToken, chainId } = params

  const deployerAddress = GET_FEE_SPLITTER_DEPLOYER_ADDRESS(chainId)
  if (!deployerAddress) return undefined

  const splitterAddress = await publicClient.readContract({
    address: deployerAddress,
    abi: LevrFeeSplitterDeployer_v1,
    functionName: 'getSplitter',
    args: [clankerToken],
  })

  if (!splitterAddress || splitterAddress === '0x0000000000000000000000000000000000000000') {
    return undefined
  }

  return splitterAddress as Address
}
