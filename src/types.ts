import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem'

export type PopWalletClient = WalletClient<Transport, Chain, Account>
export type PopPublicClient = PublicClient<Transport, Chain>

/**
 * @description Uniswap V4 Pool Key structure
 */
export type PoolKey = {
  currency0: `0x${string}`
  currency1: `0x${string}`
  fee: number
  tickSpacing: number
  hooks: `0x${string}`
}

export type CallData = {
  target: `0x${string}`
  allowFailure: boolean
  value: bigint
  callData: `0x${string}`
}
