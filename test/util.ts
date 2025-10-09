import { createPublicClient, createWalletClient, http } from 'viem'
import type { HttpTransport } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import * as internalChains from 'viem/chains'

export const levrAnvil = {
  ...internalChains.anvil,
  contracts: internalChains.base.contracts,
}

/**
 * Creates an HTTP transport for local anvil chain
 */
export const getLocalAnvilTransport = (timeout?: number): HttpTransport => {
  return http(`http://localhost:8545`, {
    timeout: timeout ?? 60000, // Increased from 10s to 60s for complex deployments
  })
}

export const getPublicClient = (timeout?: number) => {
  return createPublicClient({
    chain: levrAnvil,
    transport: getLocalAnvilTransport(timeout),
  })
}

export const getWallet = (timeout?: number) => {
  const privateKey = process.env.TEST_PRIVATE_KEY as `0x${string}` | undefined
  if (!privateKey) throw new Error('TEST_PRIVATE_KEY is not set')

  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: levrAnvil,
    transport: getLocalAnvilTransport(timeout),
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
