import type { PublicClient } from 'viem'
import { formatUnits, parseUnits } from 'viem'

import { GET_USDC_ADDRESS, WETH } from './constants'
import { discoverPool } from './pool-key'
import { quoteV4 } from './quote-v4'

/**
 * @description Parameters for getting WETH/USD price
 */
export type GetWethUsdPriceParams = {
  /**
   * Public client for WETH/USDC oracle queries
   * This should connect to a chain with reliable USDC liquidity (e.g., Base mainnet)
   */
  publicClient: PublicClient
}

/**
 * @description Return type for WETH/USD price function
 */
export type GetWethUsdPriceReturnType = {
  /**
   * WETH price in USD as a formatted string (e.g. "2543.21")
   */
  priceUsd: string
  /**
   * Raw amount of USDC received for 1 WETH (in USDC's 6 decimals)
   */
  wethPerUsdc: bigint
  /**
   * The pool key used for the quote
   */
  poolKey: {
    currency0: `0x${string}`
    currency1: `0x${string}`
    fee: number
    tickSpacing: number
    hooks: `0x${string}`
  }
}

/**
 * @description Get the USD price of WETH from a WETH/USDC pool
 *
 * @param params Parameters for WETH/USD price oracle
 * @returns WETH price in USD and raw quote data
 *
 * @remarks
 * This function automatically discovers and queries a WETH/USDC Uniswap V4 pool
 * to determine the current price of WETH in USD. It:
 * 1. Discovers the best liquid WETH/USDC pool (tries 0.05%, 0.3%, 1% fee tiers)
 * 2. Quotes 1 WETH to get the USDC output
 * 3. Returns the formatted USD price
 *
 * This is commonly used as a price oracle for other token pricing calculations.
 *
 * @example
 * ```typescript
 * // Get current WETH price on Base mainnet
 * const { priceUsd } = await getWethUsdPrice({
 *   publicClient: baseMainnetClient,
 * })
 * console.log(`WETH price: $${priceUsd}`)
 * ```
 */
export const getWethUsdPrice = async ({
  publicClient,
}: GetWethUsdPriceParams): Promise<GetWethUsdPriceReturnType> => {
  // Get chain ID from client
  const chainId = publicClient.chain?.id
  if (!chainId) {
    throw new Error('Chain ID not found on public client')
  }

  // Get WETH and USDC addresses
  const wethData = WETH(chainId)
  const usdcAddress = GET_USDC_ADDRESS(chainId)

  if (!wethData) {
    throw new Error(`WETH address not found for chain ID ${chainId}`)
  }

  if (!usdcAddress) {
    throw new Error(`USDC address not found for chain ID ${chainId}`)
  }

  // Discover WETH/USDC pool (tries common fee tiers)
  const pool = await discoverPool({
    publicClient,
    token0: wethData.address,
    token1: usdcAddress,
  })

  if (!pool) {
    throw new Error('No liquid WETH/USDC pool found')
  }

  const { poolKey } = pool

  // Determine trade direction based on sorted currencies
  const wethIsToken0 = wethData.address.toLowerCase() < usdcAddress.toLowerCase()

  // Quote 1 WETH -> USDC to get WETH price in USD
  const oneWeth = parseUnits('1', wethData.decimals)
  const quote = await quoteV4({
    publicClient,
    poolKey,
    zeroForOne: wethIsToken0,
    amountIn: oneWeth,
  })

  // USDC has 6 decimals
  const priceUsd = formatUnits(quote.amountOut, 6)

  return {
    priceUsd,
    wethPerUsdc: quote.amountOut,
    poolKey,
  }
}
