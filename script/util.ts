import type { Account, Chain, HttpTransport, PublicClient, Transport, WalletClient } from 'viem'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import * as internalChains from 'viem/chains'

/**
 * Get a chain by its id
 */
export const getChainById = (chainId: number): Chain => {
  const chain = Object.values(internalChains).find((chain) => chain.id === chainId)
  if (!chain) throw new Error('Chain not found')
  return chain
}

/**
 * Get the RPC URL for a chain by its id
 */
export const getDRPCChainRpcUrl = (chainId: number) => {
  const apiKey = process.env.NEXT_PUBLIC_DRPC_API_KEY

  if (!apiKey) return undefined

  const chaimMap = {
    11155420: 'optimism-sepolia',
    8453: 'base',
    84532: 'base-sepolia',
  } as Record<number, string | undefined>

  const chain = chaimMap[chainId]

  if (!chain) throw new Error(`Chain with ID ${chainId} not found`)

  return `https://lb.drpc.org/${chain}/${apiKey}`
}

/**
 * Creates a DRPC transport for a specific chain
 */
export const getDRPCTransport = (chainId: number): HttpTransport | null => {
  const url = getDRPCChainRpcUrl(chainId)

  if (!url) return null

  return http(url, {
    timeout: 10000,
  })
}

const clientCache = new Map<number, PublicClient<Transport, Chain>>()

/**
 * Get a public client for a specific chain
 */
export const getPublicClient = async (chainId: number): Promise<PublicClient<Transport, Chain>> => {
  const cachedClient = clientCache.get(chainId)
  if (cachedClient) return cachedClient

  const chain = getChainById(chainId)

  if (!chain) throw new Error(`Chain with ID ${chainId} not found`)
  const transport = getDRPCTransport(chainId)
  if (!transport) throw new Error(`Transport not found for chain ID ${chainId}`)

  const publicClient = createPublicClient({
    chain,
    transport,
  }) as PublicClient<Transport, Chain>

  clientCache.set(chainId, publicClient)

  return publicClient
}

export const getWalletClient = async (
  chainId: number,
  privateKey: `0x${string}`
): Promise<WalletClient<Transport, Chain, Account>> => {
  const chain = getChainById(chainId)
  if (!chain) throw new Error(`Chain with ID ${chainId} not found`)
  const transport = getDRPCTransport(chainId)
  if (!transport) throw new Error(`Transport not found for chain ID ${chainId}`)

  const walletClient = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain,
    transport,
  })

  return walletClient
}
