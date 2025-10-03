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
export const getLocalAnvilTransport = (): HttpTransport => {
  return http(`http://localhost:8545`, {
    timeout: 10000,
  })
}

export const getPublicClient = () => {
  return createPublicClient({
    chain: levrAnvil,
    transport: getLocalAnvilTransport(),
  })
}

export const getWallet = () => {
  const privateKey = process.env.TEST_PRIVATE_KEY as `0x${string}` | undefined
  if (!privateKey) throw new Error('TEST_PRIVATE_KEY is not set')

  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: levrAnvil,
    transport: getLocalAnvilTransport(),
  })
}
