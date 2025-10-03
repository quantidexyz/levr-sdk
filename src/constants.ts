import { CLANKERS } from 'clanker-sdk'
import { anvil, base, baseSepolia } from 'viem/chains'

/**
 * Get the LP locker address for a given chain ID
 * @param chainId - The chain ID
 * @returns The LP locker address
 */
export const GET_LP_LOCKER_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  const chainMap = {
    // In our dev monorepo, we have a clanker_v4_anvil contract, but in the remote package, it's not defined
    [anvil.id]: (CLANKERS as any)?.clanker_v4_anvil?.related?.locker,
    [base.id]: CLANKERS.clanker_v4.related.locker,
    [baseSepolia.id]: CLANKERS.clanker_v4_sepolia.related.locker,
  } as Record<number, `0x${string}` | undefined>

  return chainMap?.[chainId]
}

/**
 * Get the factory address for a given chain ID
 * @param chainId - The chain ID
 * @returns The factory address
 */
export const GET_FACTORY_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: process.env.NEXT_PUBLIC_LEVR_FACTORY_V1_ANVIL,
  }[chainId] as `0x${string}` | undefined
}

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
 * Get the Uniswap V4 Universal Router address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Uniswap V4 Universal Router address
 */
export const UNISWAP_V4_UNIVERSAL_ROUTER = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: '0x6ff5693b99212da76ad316178a184ab56d299b43',
    [base.id]: '0x6ff5693b99212da76ad316178a184ab56d299b43',
  }[chainId] as `0x${string}` | undefined
}

/**
 * Get the Permit2 address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Permit2 address
 */
export const PERMIT2_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  // Permit2 has the same address across all chains
  return '0x000000000022D473030F116dDEE9F6B43aC78BA3'
}

/**
 * Get the Uniswap V4 Quoter address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Quoter address
 */
export const UNISWAP_V4_QUOTER = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: '0x0d5e0f971ed27fbff6c2837bf31316121532048d',
    [base.id]: '0x0d5e0f971ed27fbff6c2837bf31316121532048d',
  }[chainId] as `0x${string}` | undefined
}

/**
 * Uniswap v4 dynamic fee flag
 * If bit 23 is set (fee & 0x800000), the pool uses dynamic fees
 */
export const DYNAMIC_FEE_FLAG = 0x800000
