import { anvil, base, baseSepolia } from 'viem/chains'

/**
 * Get the Uniswap V4 Permit2 address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Permit2 address
 */
export const UNISWAP_V4_PERMIT2 = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [base.id]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [baseSepolia.id]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  }[chainId] as `0x${string}` | undefined
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
    [baseSepolia.id]: '0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba',
  }[chainId] as `0x${string}` | undefined
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
    [baseSepolia.id]: '0x492e6456d9528771018deb9e87ef7750ef184104',
  }[chainId] as `0x${string}` | undefined
}

/**
 * Get the Uniswap V4 Pool Manager address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Pool Manager address
 */
export const UNISWAP_V4_POOL_MANAGER = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: '0x498581ff718922c3f8e6a244956af099b2652b2b',
    [base.id]: '0x498581ff718922c3f8e6a244956af099b2652b2b',
    [baseSepolia.id]: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408',
  }[chainId] as `0x${string}` | undefined
}

/**
 * Get the Uniswap V4 StateView address for a given chain ID
 * @param chainId - The chain ID
 * @returns The StateView address
 */
export const UNISWAP_V4_STATE_VIEW = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71',
    [base.id]: '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71',
    [baseSepolia.id]: '0x571291b572ed32ce6751a2cb2486ebee8defb9b4',
  }[chainId] as `0x${string}` | undefined
}

/**
 * Get the Uniswap V3 Quoter V2 address for a given chain ID
 * @param chainId - The chain ID
 * @returns The V3 Quoter V2 address
 */
export const UNISWAP_V3_QUOTER_V2 = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a', // V3 Quoter V2
    [base.id]: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    [baseSepolia.id]: '0xC5290058841028F1614F3A6F0F5816cAd0df5E27',
  }[chainId] as `0x${string}` | undefined
}
