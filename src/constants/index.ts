import { BigNumber } from 'ethers'
import { anvil, base, baseSepolia } from 'viem/chains'

export * from './clanker'
export * from './config'
export * from './levr'
export * from './uniswap'

/**
 * Get the WETH address for a given chain ID
 * @param chainId - The chain ID
 * @returns The WETH address
 */
export const WETH = (
  chainId?: number
):
  | {
      address: `0x${string}`
      decimals: number
      symbol: string
      name: string
    }
  | undefined => {
  if (!chainId) return undefined

  const initial = {
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006',
  } as const

  return {
    [anvil.id]: initial,
    [base.id]: initial,
    [baseSepolia.id]: initial,
  }[chainId]
}

/**
 * Contract balance representation, for use in Universal Router
 */
export const CONTRACT_BALANCE = BigNumber.from(
  '0x8000000000000000000000000000000000000000000000000000000000000000'
)

/**
 * MSG_SENDER representation, for use in Universal Router
 */
export const MSG_SENDER = '0x0000000000000000000000000000000000000001'

/**
 * ADDRESS_THIS representation, for use in Universal Router
 */
export const ADDRESS_THIS = '0x0000000000000000000000000000000000000002'

/**
 * Get the USDC address for a given chain ID
 * @param chainId - The chain ID
 * @returns The USDC address
 */
export const GET_USDC_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    [base.id]: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  }[chainId] as `0x${string}` | undefined
}
