import { anvil, base, baseSepolia } from 'viem/chains'

/**
 * Get the factory address for a given chain ID
 * @param chainId - The chain ID
 * @returns The factory address
 */
export const GET_FACTORY_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: process.env.NEXT_PUBLIC_LEVR_FACTORY_V1_ANVIL,
    [base.id]: '0xB8fD8794F9a96A25Ed7C25dE76a3bbb64a4a5800',
    [baseSepolia.id]: '0x51742606fAf2356d5a3d78B80Aed0703E25dF1D5',
  }[chainId] as `0x${string}` | undefined
}

/**
 * Get the fee splitter factory address for a given chain ID
 * @param chainId - The chain ID
 * @returns The fee splitter factory address
 */
export const GET_FEE_SPLITTER_FACTORY_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: process.env.NEXT_PUBLIC_LEVR_FEE_SPLITTER_FACTORY_V1_ANVIL,
    [base.id]: '0x0069624A9783298A157d794Ad97FAfDD0D68371B',
    [baseSepolia.id]: '0xeBc3c6c3DC5d473D8B71479F005Aa37Ade4CBD0F',
  }[chainId] as `0x${string}` | undefined
}

/**
 * Levr team wallet address that receives LP fees from deployments
 */
export const LEVR_TEAM_WALLET = '0x4B7ddAc59cEeC3dE4706C460f34Bbce758a58bED' as const
