import type { Chain, HttpTransport } from 'viem'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import * as internalChains from 'viem/chains'

import type { PopPublicClient, PopWalletClient } from '../src'

export const levrAnvil = {
  ...internalChains.anvil,
  contracts: internalChains.base.contracts,
}

const getChain = (chainId = levrAnvil.id as number): Chain => {
  const chain =
    chainId === levrAnvil.id
      ? levrAnvil
      : (Object.values(internalChains).find((c) => c.id === chainId) as Chain)
  if (!chain) throw new Error(`Chain ${chainId} not found`)
  return chain
}

/**
 * Creates an HTTP transport for local anvil chain
 */
export const getTransport = (timeout?: number, chainId?: number): HttpTransport => {
  if (chainId === levrAnvil.id)
    return http(`http://localhost:8545`, {
      timeout: timeout ?? 60000, // Increased from 10s to 60s for complex deployments
    })

  const chain = getChain(chainId)

  const chainMap: Record<number, string | undefined> = {
    11155420: 'optimism-sepolia',
    8453: 'base',
    84532: 'base-sepolia',
  }

  const networkName = chainMap[chain.id]
  const rpcUrl =
    process.env.DRPC_API_KEY && networkName
      ? `https://lb.drpc.org/ogrpc?network=${networkName}&dkey=${process.env.DRPC_API_KEY}`
      : chain.rpcUrls.default.http[0]

  return http(rpcUrl, {
    timeout: timeout ?? 60000, // Increased from 10s to 60s for complex deployments
  })
}

export const getPublicClient = (
  timeout?: number,
  chainId = levrAnvil.id as number
): PopPublicClient => {
  const chain: Chain = getChain(chainId)

  return createPublicClient({
    chain,
    transport: getTransport(timeout, chainId),
  })
}

export const getWallet = (timeout?: number, chainId?: number): PopWalletClient => {
  const privateKey = process.env.TEST_PRIVATE_KEY as `0x${string}` | undefined
  if (!privateKey) throw new Error('TEST_PRIVATE_KEY is not set')

  const chain: Chain = getChain(chainId)

  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain,
    transport: getTransport(timeout, chainId),
  })
}

/**
 * Get current blockchain timestamp
 * @returns Current block timestamp in seconds
 */
export const getBlockTimestamp = async (): Promise<number> => {
  const publicClient = getPublicClient()
  const block = await publicClient.getBlock()
  return Number(block.timestamp)
}

/**
 * Warp anvil forward in time
 * @param seconds Number of seconds to warp forward
 */
export const warpAnvil = async (seconds: number) => {
  const publicClient = getPublicClient()

  // Use evm_increaseTime to move forward in time
  await publicClient.transport.request({
    method: 'evm_increaseTime',
    params: [seconds],
  })

  // Mine a new block to apply the time change
  await publicClient.transport.request({
    method: 'evm_mine',
    params: [],
  })
}
