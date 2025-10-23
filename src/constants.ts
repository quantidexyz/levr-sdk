import { CLANKERS } from 'clanker-sdk'
import { BigNumber } from 'ethers'
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
    [baseSepolia.id]: '0x84B505Fc0386699BF8A16df17A91bB415b49691f',
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
    [baseSepolia.id]: process.env.NEXT_PUBLIC_LEVR_FEE_SPLITTER_FACTORY_V1_BASE_SEPOLIA,
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

/**
 * Get the Clanker Factory address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Clanker Factory address (same on Base mainnet and Base Sepolia)
 */
export const GET_CLANKER_FACTORY_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  const chainMap = {
    // In our dev monorepo, we have a clanker_v4_anvil contract, but in the remote package, it's not defined
    [anvil.id]: (CLANKERS as any)?.clanker_v4_anvil?.factoryAddress,
    // Same address on both Base mainnet (8453) and Base Sepolia (84532)
    [base.id]: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9',
    [baseSepolia.id]: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9',
  } as Record<number, `0x${string}` | undefined>

  return chainMap?.[chainId]
}

/**
 * Get the Clanker Airdrop address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Clanker Airdrop address
 */
export const GET_CLANKER_AIRDROP_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  const chainMap = {
    // In our dev monorepo, we have a clanker_v4_anvil contract, but in the remote package, it's not defined
    [anvil.id]: (CLANKERS as any)?.clanker_v4_anvil?.related?.airdrop,
    [base.id]: CLANKERS.clanker_v4.related.airdrop,
    [baseSepolia.id]: CLANKERS.clanker_v4_sepolia.related.airdrop,
  } as Record<number, `0x${string}` | undefined>

  return chainMap?.[chainId]
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
 * Common treasury airdrop amounts in tokens (not wei)
 * First value is used as default in deployV4
 */
export const TREASURY_AIRDROP_AMOUNTS = {
  '10%': 10_000_000_000, // 10B tokens (10% of 100B)
  '20%': 20_000_000_000, // 20B tokens (20% of 100B)
  '30%': 30_000_000_000, // 30B tokens (30% of 100B)
  '40%': 40_000_000_000, // 40B tokens (40% of 100B)
  '50%': 50_000_000_000, // 50B tokens (50% of 100B)
  '60%': 60_000_000_000, // 60B tokens (60% of 100B)
  '70%': 70_000_000_000, // 70B tokens (70% of 100B)
  '80%': 80_000_000_000, // 80B tokens (80% of 100B)
  '90%': 90_000_000_000, // 90B tokens (90% of 100B)
} as const

/**
 * Staking rewards in basis points
 * The amount of rewards that are distributed to the staking contract
 */
export const STAKING_REWARDS = {
  '100%': 10_000, // 100% of rewards are distributed to the staking contract
  '90%': 9_000, // 90% of rewards are distributed to the staking contract
  '80%': 8_000, // 80% of rewards are distributed to the staking contract
  '70%': 7_000, // 70% of rewards are distributed to the staking contract
  '60%': 6_000, // 60% of rewards are distributed to the staking contract
  '50%': 5_000, // 50% of rewards are distributed to the staking contract
  '40%': 4_000, // 40% of rewards are distributed to the staking contract
} as const

export const STATIC_FEE_TIERS = {
  '1%': 100,
  '2%': 200,
  '3%': 300,
} as const

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
