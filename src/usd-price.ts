import type { PublicClient } from 'viem'
import { formatUnits, parseUnits } from 'viem'

import { WETH } from './constants'
import { createPoolKey } from './pool-key'
import { quoteV4 } from './quote-v4'
import { getWethUsdPrice } from './weth-usd'

/**
 * @description Parameters for getting USD price of a token
 */
export type GetUsdPriceParams = {
  /**
   * Public client for price oracle queries (WETH/USDC)
   * This should connect to a chain with reliable USDC liquidity (e.g., Base mainnet)
   */
  oraclePublicClient: PublicClient
  /**
   * Public client for token quote queries (Token/WETH)
   * This should connect to the chain where the token is deployed
   */
  quotePublicClient: PublicClient
  /**
   * Token address to get price for
   */
  tokenAddress: `0x${string}`
  /**
   * Optional fee tier for the token/WETH pool (in hundredths of a bip, e.g. 3000 = 0.3%)
   * If not provided, uses defaults from pool-key module (3000 = 0.3%)
   * Note: WETH/USDC pool is automatically discovered
   */
  quoteFee?: number
  /**
   * Optional tick spacing for the token/WETH pool
   * If not provided, uses defaults from pool-key module (60 for 0.3% fee tier)
   * Note: WETH/USDC pool is automatically discovered
   */
  quoteTickSpacing?: number
  /**
   * Optional hooks address for the token/WETH pool
   * If not provided, uses defaults from pool-key module (zero address = no hooks)
   * Note: WETH/USDC pool is automatically discovered
   */
  quoteHooks?: `0x${string}`
}

/**
 * @description Return type for USD price function
 */
export type GetUsdPriceReturnType = {
  /**
   * USD price of the token as a formatted string (e.g. "1234.56")
   */
  priceUsd: string
  /**
   * Raw price ratio of token to WETH
   */
  tokenPerWeth: bigint
  /**
   * Raw price ratio of WETH to USDC
   */
  wethPerUsdc: bigint
}

/**
 * @description Get the USD price of a token paired with WETH
 *
 * @param params Parameters including token addresses and chain config
 * @returns USD price and intermediate price ratios
 *
 * @remarks
 * This function calculates the USD price of a token by:
 * 1. Auto-discovering and querying a liquid WETH/USDC pool (oracle chain)
 * 2. Getting the price of the token in WETH (quote chain)
 * 3. Multiplying them together to get token price in USD
 *
 * The paired token must be WETH, otherwise an error is thrown.
 * USD pricing always uses USDC as the stable reference.
 *
 * This design allows you to:
 * - Use mainnet for accurate WETH/USDC prices (oracle auto-discovers pool)
 * - Quote tokens from any chain (testnet, L2, etc.)
 *
 * @example
 * ```typescript
 * // Get testnet token price using mainnet oracle
 * const { priceUsd } = await getUsdPrice({
 *   oraclePublicClient: mainnetClient,
 *   quotePublicClient: testnetClient,
 *   tokenAddress: '0x123...',
 * })
 * console.log(`Token price: $${priceUsd}`)
 * ```
 */
export const getUsdPrice = async ({
  oraclePublicClient,
  quotePublicClient,
  tokenAddress,
  quoteFee,
  quoteTickSpacing,
  quoteHooks,
}: GetUsdPriceParams): Promise<GetUsdPriceReturnType> => {
  // Get chain ID from quote client
  const quoteChainId = quotePublicClient.chain?.id
  if (!quoteChainId) {
    throw new Error('Chain ID not found on quote public client')
  }

  // Get WETH address for quote chain (token is always paired with WETH)
  const quoteWethData = WETH(quoteChainId)

  if (!quoteWethData) {
    throw new Error(`WETH address not found for quote chain ID ${quoteChainId}`)
  }

  // Get WETH/USD price from oracle (automatically discovers best pool)
  const wethUsdPriceData = await getWethUsdPrice({
    publicClient: oraclePublicClient,
  })

  // Create pool key for token/WETH
  const tokenWethPoolKey = createPoolKey(
    tokenAddress,
    quoteWethData.address,
    quoteFee,
    quoteTickSpacing,
    quoteHooks
  )

  // Determine trade direction based on sorted currencies
  const tokenIsToken0InTokenWethPool =
    tokenAddress.toLowerCase() < quoteWethData.address.toLowerCase()

  // Quote 1 token unit -> WETH to get token price in WETH (on quote chain)
  // Using token decimals (assume 18 if not available)
  const oneToken = parseUnits('1', 18)
  const tokenWethQuote = await quoteV4({
    publicClient: quotePublicClient,
    poolKey: tokenWethPoolKey,
    zeroForOne: tokenIsToken0InTokenWethPool,
    amountIn: oneToken,
  })

  // WETH has 18 decimals
  const tokenPriceInWeth = formatUnits(tokenWethQuote.amountOut, 18)

  // Calculate USD price: (token/WETH) * (WETH/USD) = token/USD
  const tokenPriceInUsd = parseFloat(tokenPriceInWeth) * parseFloat(wethUsdPriceData.priceUsd)

  return {
    priceUsd: tokenPriceInUsd.toFixed(6),
    tokenPerWeth: tokenWethQuote.amountOut,
    wethPerUsdc: wethUsdPriceData.wethPerUsdc,
  }
}
