import type { PublicClient } from 'viem'
import { formatUnits, parseUnits } from 'viem'

import { V3QuoterV2 } from './abis'
import { GET_USD_STABLECOIN, UNISWAP_V3_QUOTER_V2, WETH } from './constants'
import { createPoolKey } from './pool-key'
import { quote } from './quote'
import { isWETH } from './util'

// =============================================================================
// Price Calculation from sqrtPriceX96
// =============================================================================

/**
 * Convert sqrtPriceX96 to a decimal price
 * Formula: price = (sqrtPriceX96 / 2^96)^2
 * Adjusted for token decimals
 *
 * Uses bigint arithmetic to maintain precision for large values.
 *
 * sqrtPriceX96² gives token1/token0 (how much token1 per 1 token0).
 *
 * @param sqrtPriceX96 - The sqrtPriceX96 value from Uniswap
 * @param decimals0 - Decimals of token0
 * @param decimals1 - Decimals of token1
 * @param isToken0 - Whether we're calculating price OF token0 (true) or token1 (false)
 * @returns Price of the specified token in terms of the other token
 */
export const computePriceFromSqrtPriceX96 = (
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number,
  isToken0: boolean
): number => {
  const Q96 = 2n ** 96n

  // Use fixed-point arithmetic with 18 decimal precision to avoid overflow
  // price = (sqrtPriceX96 / Q96)^2
  // price_scaled = (sqrtPriceX96^2 * SCALE) / Q96^2
  const SCALE = 10n ** 18n

  // Calculate: (sqrtPriceX96^2 * SCALE) / (Q96^2)
  const numerator = sqrtPriceX96 * sqrtPriceX96 * SCALE
  const denominator = Q96 * Q96
  const priceScaled = numerator / denominator

  // Convert to number (safe now since priceScaled is reasonable size)
  let price = Number(priceScaled) / 1e18

  // Adjust for decimal places
  // sqrtPriceX96 gives price as token1/token0 in raw units
  // We need to adjust for the difference in decimals
  if (decimals0 !== decimals1) {
    const decimalAdjustment = 10 ** (decimals0 - decimals1)
    price = price * decimalAdjustment
  }

  // sqrtPriceX96² gives token1/token0 = "price of token0 in terms of token1"
  // - If isToken0 = true: we want token0's price in token1, which is token1/token0 ✓ (no inversion)
  // - If isToken0 = false: we want token1's price in token0, which is token0/token1 (need to invert)
  if (!isToken0) {
    price = price > 0 ? 1 / price : 0
  }

  return price
}

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
 * Get V3 fee tiers for a given chain
 * - Uniswap V3 (Base): 3000, 500, 10000 (0.3%, 0.05%, 1%)
 * - PancakeSwap V3 (BNB): 100, 500, 2500, 10000 (0.01%, 0.05%, 0.25%, 1%)
 */
const getV3FeeTiers = (chainId: number): number[] => {
  if (chainId === 56) {
    // PancakeSwap V3 on BNB - order by liquidity
    return [100, 500, 2500, 10000]
  }
  // Uniswap V3 (Base, Anvil)
  return [3000, 500, 10000]
}

/**
 * @description Get the USD price of WETH from a WETH/USDC pool using V3 quoter
 *
 * @param params Parameters for WETH/USD price oracle
 * @returns WETH price in USD and raw quote data
 *
 * @remarks
 * This function uses the V3 quoter to simulate a swap and get accurate pricing.
 * It tries multiple fee tiers in order of liquidity preference.
 *
 * V3 is used instead of V4 because V3 has much deeper liquidity on most chains.
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
  const chainId = publicClient.chain?.id
  if (!chainId) {
    throw new Error('Chain ID not found on public client')
  }

  const wethData = WETH(chainId)
  if (!wethData) {
    throw new Error(`WETH address not found for chain ID ${chainId}`)
  }

  const usdStablecoin = GET_USD_STABLECOIN(chainId)
  if (!usdStablecoin) {
    throw new Error(`USD stablecoin address not found for chain ID ${chainId}`)
  }

  const quoterAddress = UNISWAP_V3_QUOTER_V2(chainId)
  if (!quoterAddress) {
    throw new Error(`V3 Quoter address not found for chain ID ${chainId}`)
  }

  const feeTiers = getV3FeeTiers(chainId)
  const oneWeth = parseUnits('1', wethData.decimals)

  // Try each fee tier until one works
  for (const fee of feeTiers) {
    try {
      const result = await publicClient.simulateContract({
        address: quoterAddress,
        abi: V3QuoterV2,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn: wethData.address,
            tokenOut: usdStablecoin.address,
            amountIn: oneWeth,
            fee,
            sqrtPriceLimitX96: 0n,
          },
        ],
      })

      const [amountOut] = result.result
      if (amountOut > 0n) {
        const priceUsd = formatUnits(amountOut, usdStablecoin.decimals)
        return {
          priceUsd,
          wethPerUsdc: amountOut,
          fee,
        }
      }
    } catch {
      // This fee tier doesn't work, try next
      continue
    }
  }

  throw new Error('No liquid WETH/USD V3 pool found')
}

/**
 * @description Parameters for getting paired token USD price
 */
export type GetPairedTokenUsdPriceParams = {
  /**
   * Public client for price oracle queries
   * For WETH/WBNB: should connect to a chain with reliable USDC liquidity
   */
  publicClient: PublicClient
  /**
   * Paired token address
   */
  pairedTokenAddress: `0x${string}`
}

/**
 * @description Get the USD price of a paired token
 *
 * @param params Parameters for paired token USD price oracle
 * @returns USD price as a formatted string
 *
 * @remarks
 * Handles two cases:
 * 1. WETH/WBNB (native wrapped tokens) -> use WETH/USDC V3 oracle
 * 2. All other tokens (stablecoins) -> return "1.00"
 *
 * @example
 * ```typescript
 * // Get price of USDC (stablecoin) - returns "1.00"
 * const priceUsd = await getPairedTokenUsdPrice({
 *   publicClient: baseClient,
 *   pairedTokenAddress: '0x833589...',
 * })
 *
 * // Get price of WETH - uses oracle
 * const wethPrice = await getPairedTokenUsdPrice({
 *   publicClient: baseClient,
 *   pairedTokenAddress: '0x4200...',
 * })
 * ```
 */
export const getPairedTokenUsdPrice = async ({
  publicClient,
  pairedTokenAddress,
}: GetPairedTokenUsdPriceParams): Promise<string> => {
  const chainId = publicClient.chain?.id
  if (!chainId) {
    throw new Error('Chain ID not found on public client')
  }

  // Case 1: WETH/WBNB (native wrapped tokens) - use oracle
  if (isWETH(pairedTokenAddress, chainId)) {
    const { priceUsd } = await getWethUsdPrice({ publicClient })
    return priceUsd
  }

  // Case 2: All other paired tokens are stablecoins - always $1.00
  // This includes USDC, USDT, DAI, and any other non-native paired token
  return '1.00'
}

/**
 * @description Parameters for getting USD price of a token
 */
export type GetUsdPriceParams = {
  /**
   * Public client for all price queries (WETH/USD oracle and token/paired quotes)
   * Uses the chain's WETH/USD V3 pool for price discovery
   */
  publicClient: PublicClient
  /**
   * Token address to get price for
   */
  tokenAddress: `0x${string}`
  /**
   * Token decimals (required for accurate pricing)
   */
  tokenDecimals: number
  /**
   * Optional paired token address (defaults to WETH if not provided)
   * Can be any ERC20, including stablecoins
   */
  pairedTokenAddress?: `0x${string}`
  /**
   * Optional paired token decimals (required if pairedTokenAddress is provided)
   */
  pairedTokenDecimals?: number
  /**
   * Optional fee tier for the token/paired token pool (in hundredths of a bip, e.g. 3000 = 0.3%)
   * If not provided, uses defaults from pool-key module (3000 = 0.3%)
   */
  quoteFee?: number
  /**
   * Optional tick spacing for the token/paired token pool
   * If not provided, uses defaults from pool-key module (60 for 0.3% fee tier)
   */
  quoteTickSpacing?: number
  /**
   * Optional hooks address for the token/paired token pool
   * If not provided, uses defaults from pool-key module (zero address = no hooks)
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
   * Raw price ratio of token to paired token
   */
  tokenPerPaired: bigint
}

/**
 * @description Get the USD price of a token paired with any ERC20
 *
 * @param params Parameters including token addresses and chain config
 * @returns USD price and intermediate price ratios
 *
 * @remarks
 * This function calculates the USD price of a token by:
 * 1. Auto-discovering paired token USD price (stablecoin or WETH via sqrtPriceX96)
 * 2. Getting the price of the token in the paired token via V4 quote
 * 3. Multiplying them together to get token price in USD
 *
 * Defaults to WETH as paired token if not provided.
 *
 * @example
 * ```typescript
 * // Get token price when paired with USDC (stablecoin)
 * const { priceUsd } = await getUsdPrice({
 *   publicClient: baseClient,
 *   tokenAddress: '0x123...',
 *   tokenDecimals: 18,
 *   pairedTokenAddress: '0x833589...',
 *   pairedTokenDecimals: 6,
 * })
 * console.log(`Token price: $${priceUsd}`)
 * ```
 */
export const getUsdPrice = async ({
  publicClient,
  tokenAddress,
  tokenDecimals,
  pairedTokenAddress,
  pairedTokenDecimals,
  quoteFee,
  quoteTickSpacing,
  quoteHooks,
}: GetUsdPriceParams): Promise<GetUsdPriceReturnType> => {
  const chainId = publicClient.chain?.id
  if (!chainId) {
    throw new Error('Chain ID not found on public client')
  }

  // Default to WETH if no paired token specified
  let pairedToken = pairedTokenAddress
  let pairedDecimals = pairedTokenDecimals ?? 18

  if (!pairedToken) {
    const wethData = WETH(chainId)
    if (!wethData) {
      throw new Error(`WETH address not found for chain ID ${chainId}`)
    }
    pairedToken = wethData.address
    pairedDecimals = wethData.decimals
  } else if (pairedTokenDecimals === undefined) {
    throw new Error('pairedTokenDecimals must be provided when pairedTokenAddress is specified')
  }

  // Get paired token USD price
  const pairedTokenPriceUsd = await getPairedTokenUsdPrice({
    publicClient,
    pairedTokenAddress: pairedToken,
  })

  // Create pool key for token/paired token
  const tokenPairedPoolKey = createPoolKey(
    tokenAddress,
    pairedToken,
    quoteFee,
    quoteTickSpacing,
    quoteHooks
  )

  // Determine trade direction based on sorted currencies
  const tokenIsToken0InTokenPairedPool = tokenAddress.toLowerCase() < pairedToken.toLowerCase()

  // Quote 1 token unit -> paired token to get token price in paired token
  const oneToken = parseUnits('1', tokenDecimals)
  const tokenPairedQuote = await quote.v4.read({
    publicClient,
    poolKey: tokenPairedPoolKey,
    zeroForOne: tokenIsToken0InTokenPairedPool,
    amountIn: oneToken,
  })

  // Format the paired token price
  const tokenPriceInPaired = formatUnits(tokenPairedQuote.amountOut, pairedDecimals)

  // Calculate USD price: (token/paired) * (paired/USD) = token/USD
  const tokenPriceInUsd = parseFloat(tokenPriceInPaired) * parseFloat(pairedTokenPriceUsd)

  // Use adaptive precision for very small values
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
    tokenPerPaired: tokenPairedQuote.amountOut,
  }
}
