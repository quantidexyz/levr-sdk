import { BigNumber } from 'ethers'
import { anvil, base, baseSepolia, bsc } from 'viem/chains'

export * from './clanker'
export * from './config'
export * from './levr'
export * from './uniswap'

/**
 * Initial liquidity amount provided by Clanker protocol per chain (in native token units)
 * - ETH-based chains: 10 ETH
 * - BNB chain: 35 BNB
 */
export const INITIAL_LIQUIDITY_AMOUNT: Record<number, number> = {
  [anvil.id]: 10,
  [base.id]: 10,
  [baseSepolia.id]: 10,
  [bsc.id]: 35,
}

/**
 * Get the initial liquidity amount for a given chain ID
 * @param chainId - The chain ID
 * @returns The initial liquidity amount in native token units (ETH/BNB), defaults to 10
 */
export const getInitialLiquidityAmount = (chainId?: number): number => {
  if (!chainId) return 10
  return INITIAL_LIQUIDITY_AMOUNT[chainId] ?? 10
}

/**
 * Get the wrapped native token address for a given chain ID (WETH/WBNB)
 * @param chainId - The chain ID
 * @returns The wrapped native token info
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

  const weth = {
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006',
  } as const

  const wbnb = {
    decimals: 18,
    symbol: 'WBNB',
    name: 'Wrapped BNB',
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  } as const

  return {
    [anvil.id]: weth,
    [base.id]: weth,
    [baseSepolia.id]: weth,
    [bsc.id]: wbnb,
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
 * Get the USD stablecoin info for a given chain ID (USDC/USDT)
 * @param chainId - The chain ID
 * @returns The stablecoin address and decimals
 */
export const GET_USD_STABLECOIN = (
  chainId?: number
):
  | {
      address: `0x${string}`
      decimals: number
      symbol: string
    }
  | undefined => {
  if (!chainId) return undefined

  const usdc6 = {
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as `0x${string}`,
    decimals: 6,
    symbol: 'USDC',
  }

  // BSC uses USDT which has 18 decimals
  const usdtBsc = {
    address: '0x55d398326f99059fF775485246999027B3197955' as `0x${string}`,
    decimals: 18,
    symbol: 'USDT',
  }

  return {
    [anvil.id]: usdc6,
    [base.id]: usdc6,
    [bsc.id]: usdtBsc,
  }[chainId]
}

/**
 * Get the USDC address for a given chain ID
 * @deprecated Use GET_USD_STABLECOIN instead for proper decimal handling
 * @param chainId - The chain ID
 * @returns The USDC address
 */
export const GET_USDC_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  return GET_USD_STABLECOIN(chainId)?.address
}
