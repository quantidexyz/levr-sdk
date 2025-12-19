import type { PublicClient } from 'viem'
import { formatUnits, parseUnits } from 'viem'

import { GET_USD_STABLECOIN, UNISWAP_V3_QUOTER_V2, WETH } from './constants'
import { createPoolKey } from './pool-key'
import { quote } from './quote'

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
   * Fee tier of the V3 pool used (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
   */
  fee: number
}

/**
 * @description Get the USD price of WETH from a WETH/USDC pool using Uniswap V3
 *
 * @param params Parameters for WETH/USD price oracle
 * @returns WETH price in USD and raw quote data
 *
 * @remarks
 * This function queries Uniswap V3 WETH/USDC pools for accurate pricing.
 * V3 is used instead of V4 because V3 has much deeper liquidity on most chains.
 *
 * The function:
 * 1. Tries common V3 fee tiers (0.3%, 0.05%, 1%) in order of preference
 * 2. Quotes 1 WETH to get USDC output
 * 3. Returns the first successful quote
 *
 * This is commonly used as a price oracle for other token pricing calculations.
 *
 * @example
 * ```typescript
 * // Get current WETH price on Base mainnet
 * const { priceUsd, fee } = await getWethUsdPrice({
 *   publicClient: baseMainnetClient,
 * })
 * console.log(`WETH price: $${priceUsd} (from ${fee/10000}% pool)`)
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

  // Get V3 Quoter address
  const quoterAddress = UNISWAP_V3_QUOTER_V2(chainId)
  if (!quoterAddress) {
    throw new Error(`V3 Quoter address not found for chain ID ${chainId}`)
  }

  // Get WETH and USD stablecoin data
  const wethData = WETH(chainId)
  const usdStablecoin = GET_USD_STABLECOIN(chainId)

  if (!wethData) {
    throw new Error(`WETH address not found for chain ID ${chainId}`)
  }

  if (!usdStablecoin) {
    throw new Error(`USD stablecoin address not found for chain ID ${chainId}`)
  }

  // V3 fee tiers (in order of preference for WETH/USDC)
  const V3_FEE_TIERS = [3000, 500, 10000] // 0.3%, 0.05%, 1%

  // Try each V3 fee tier
  for (const fee of V3_FEE_TIERS) {
    try {
      const oneWeth = parseUnits('1', wethData.decimals)

      const quoteResult = await quote.v3.read({
        publicClient,
        quoterAddress,
        tokenIn: wethData.address,
        tokenOut: usdStablecoin.address,
        amountIn: oneWeth,
        fee,
      })

      if (quoteResult.amountOut > 0n) {
        // Use the stablecoin's actual decimals (6 for USDC, 18 for BSC USDT)
        const priceUsd = formatUnits(quoteResult.amountOut, usdStablecoin.decimals)

        return {
          priceUsd,
          wethPerUsdc: quoteResult.amountOut,
          fee,
        }
      }
    } catch (error) {
      // This fee tier doesn't work, try next
      continue
    }
  }

  throw new Error('No liquid WETH/USDC V3 pool found')
}

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
   * Token decimals (required for accurate pricing)
   */
  tokenDecimals: number
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
 *   tokenDecimals: 18,
 * })
 * console.log(`Token price: $${priceUsd}`)
 * ```
 */
export const getUsdPrice = async ({
  oraclePublicClient,
  quotePublicClient,
  tokenAddress,
  tokenDecimals,
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
  // Using the actual token decimals
  const oneToken = parseUnits('1', tokenDecimals)
  const tokenWethQuote = await quote.v4.read({
    publicClient: quotePublicClient,
    poolKey: tokenWethPoolKey,
    zeroForOne: tokenIsToken0InTokenWethPool,
    amountIn: oneToken,
  })

  // WETH has 18 decimals
  const tokenPriceInWeth = formatUnits(tokenWethQuote.amountOut, 18)

  // Calculate USD price: (token/WETH) * (WETH/USD) = token/USD
  const tokenPriceInUsd = parseFloat(tokenPriceInWeth) * parseFloat(wethUsdPriceData.priceUsd)

  // Use adaptive precision for very small values
  // For values < $0.01, use up to 10 decimals to capture micro-cap tokens
  // For values >= $0.01, use 6 decimals (standard for currency)
  let formattedPrice: string
  if (tokenPriceInUsd < 0.01) {
    // For very small values, use 10 decimals or scientific notation if needed
    if (tokenPriceInUsd < 0.0000000001) {
      formattedPrice = tokenPriceInUsd.toExponential(6)
    } else {
      formattedPrice = tokenPriceInUsd.toFixed(10)
    }
  } else {
    formattedPrice = tokenPriceInUsd.toFixed(6)
  }

  return {
    priceUsd: formattedPrice,
    tokenPerWeth: tokenWethQuote.amountOut,
    wethPerUsdc: wethUsdPriceData.wethPerUsdc,
  }
}
