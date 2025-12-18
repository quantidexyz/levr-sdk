import type { PublicClient } from 'viem'
import { formatUnits, parseUnits } from 'viem'

import { GET_USD_STABLECOIN, UNISWAP_V3_QUOTER_V2, WETH } from './constants'
import { createPoolKey } from './pool-key'
import { quote } from './quote'
import { isWETH } from './util'

/**
 * @description Known stablecoin addresses that always have a price of 1.00 USD
 */
const KNOWN_STABLECOINS: Record<number, Set<string>> = {
  8453: new Set([
    '0x833589fcd6edb6e08f4c7c32d4f71b3566915e71'.toLowerCase(), // USDC
    '0x0b3bd41220dd2eef4e578b3a1f47b07c5e60e1e6'.toLowerCase(), // axlUSDC
  ]),
  1: new Set([
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'.toLowerCase(), // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7'.toLowerCase(), // USDT
    '0x6b175474e89094c44da98b954eedeac495271d0f'.toLowerCase(), // DAI
  ]),
  56: new Set([
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'.toLowerCase(), // USDC
    '0x55d398326f99059ff775485246999027b3197955'.toLowerCase(), // USDT
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3'.toLowerCase(), // DAI
  ]),
  42161: new Set([
    '0xff970a61a04b1ca14834a43f5de4533ebddb5f86'.toLowerCase(), // USDC (Arbitrum)
    '0xfd086bc7cd5c481dcc9c85ffe596854b4a38fb07'.toLowerCase(), // USDT
  ]),
}

/**
 * @description Check if a token is a known stablecoin
 */
export const isKnownStablecoin = (tokenAddress: `0x${string}`, chainId: number): boolean => {
  const stablecoins = KNOWN_STABLECOINS[chainId]
  if (!stablecoins) return false
  return stablecoins.has(tokenAddress.toLowerCase())
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
 * @description Parameters for getting paired token USD price
 */
export type GetPairedTokenUsdPriceParams = {
  /**
   * Public client for price oracle queries
   * For stablecoins: any client
   * For WETH: should connect to a chain with reliable USDC liquidity
   * For other tokens: should connect to a chain with V3 liquidity
   */
  publicClient: PublicClient
  /**
   * Paired token address
   */
  pairedTokenAddress: `0x${string}`
  /**
   * Paired token decimals
   */
  pairedTokenDecimals: number
}

/**
 * @description Get the USD price of a paired token
 *
 * @param params Parameters for paired token USD price oracle
 * @returns USD price as a formatted string
 *
 * @remarks
 * Handles three cases:
 * 1. Known stablecoins (USDC, USDT, DAI) -> return "1.00"
 * 2. WETH -> use WETH/USDC V3 oracle
 * 3. Other tokens -> quote against USDC via V3
 *
 * @example
 * ```typescript
 * // Get price of USDC (stablecoin)
 * const { priceUsd } = await getPairedTokenUsdPrice({
 *   publicClient: baseClient,
 *   pairedTokenAddress: '0x833589...',
 *   pairedTokenDecimals: 6,
 * })
 * console.log(`Paired token price: $${priceUsd}`) // "1.00"
 * ```
 */
export const getPairedTokenUsdPrice = async ({
  publicClient,
  pairedTokenAddress,
  pairedTokenDecimals,
}: GetPairedTokenUsdPriceParams): Promise<string> => {
  const chainId = publicClient.chain?.id
  if (!chainId) {
    throw new Error('Chain ID not found on public client')
  }

  // Case 1: Known stablecoins
  if (isKnownStablecoin(pairedTokenAddress, chainId)) {
    return '1.00'
  }

  // Case 2: WETH
  if (isWETH(pairedTokenAddress, chainId)) {
    const { priceUsd } = await getWethUsdPrice({ publicClient })
    return priceUsd
  }

  // Case 3: Other tokens - quote against USDC via V3
  const quoterAddress = UNISWAP_V3_QUOTER_V2(chainId)
  if (!quoterAddress) {
    throw new Error(`V3 Quoter address not found for chain ID ${chainId}`)
  }

  const usdcAddress = GET_USDC_ADDRESS(chainId)
  if (!usdcAddress) {
    throw new Error(`USDC address not found for chain ID ${chainId}`)
  }

  // V3 fee tiers (in order of preference for token/USDC)
  const V3_FEE_TIERS = [3000, 500, 10000] // 0.3%, 0.05%, 1%

  // Try each V3 fee tier
  for (const fee of V3_FEE_TIERS) {
    try {
      const oneToken = parseUnits('1', pairedTokenDecimals)

      const quoteResult = await quote.v3.read({
        publicClient,
        quoterAddress,
        tokenIn: pairedTokenAddress,
        tokenOut: usdcAddress,
        amountIn: oneToken,
        fee,
      })

      if (quoteResult.amountOut > 0n) {
        const priceUsd = formatUnits(quoteResult.amountOut, 6)
        return priceUsd
      }
    } catch (error) {
      // This fee tier doesn't work, try next
      continue
    }
  }

  throw new Error(`No liquid ${pairedTokenAddress}/USDC V3 pool found for pricing`)
}

/**
 * @description Parameters for getting USD price of a token
 */
export type GetUsdPriceParams = {
  /**
   * Public client for price oracle queries (WETH/USDC or paired token/USDC)
   * This should connect to a chain with reliable USDC liquidity (e.g., Base mainnet)
   */
  oraclePublicClient: PublicClient
  /**
   * Public client for token quote queries (Token/Paired Token)
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
 * 1. Auto-discovering paired token USD price (stablecoin, WETH, or V3 quote)
 * 2. Getting the price of the token in the paired token
 * 3. Multiplying them together to get token price in USD
 *
 * Defaults to WETH as paired token for backward compatibility if not provided.
 * USD pricing always uses USDC as the stable reference.
 *
 * This design allows you to:
 * - Use mainnet for accurate paired token/USDC prices
 * - Quote tokens from any chain (testnet, L2, etc.)
 * - Support any paired token (WETH, USDC, or other ERC20)
 *
 * @example
 * ```typescript
 * // Get token price when paired with USDC (stablecoin)
 * const { priceUsd } = await getUsdPrice({
 *   oraclePublicClient: baseClient,
 *   quotePublicClient: baseClient,
 *   tokenAddress: '0x123...',
 *   tokenDecimals: 18,
 *   pairedTokenAddress: '0x833589...',
 *   pairedTokenDecimals: 6,
 * })
 * console.log(`Token price: $${priceUsd}`)
 * ```
 */
export const getUsdPrice = async ({
  oraclePublicClient,
  quotePublicClient,
  tokenAddress,
  tokenDecimals,
  pairedTokenAddress,
  pairedTokenDecimals,
  quoteFee,
  quoteTickSpacing,
  quoteHooks,
}: GetUsdPriceParams): Promise<GetUsdPriceReturnType> => {
  // Get chain ID from quote client
  const quoteChainId = quotePublicClient.chain?.id
  if (!quoteChainId) {
    throw new Error('Chain ID not found on quote public client')
  }

  // Default to WETH if no paired token specified (backward compatibility)
  let pairedToken = pairedTokenAddress
  let pairedDecimals = pairedTokenDecimals ?? 18

  if (!pairedToken) {
    const wethData = WETH(quoteChainId)
    if (!wethData) {
      throw new Error(`WETH address not found for quote chain ID ${quoteChainId}`)
    }
    pairedToken = wethData.address
    pairedDecimals = wethData.decimals
  } else if (pairedTokenDecimals === undefined) {
    throw new Error('pairedTokenDecimals must be provided when pairedTokenAddress is specified')
  }

  // Get paired token USD price
  const pairedTokenPriceUsd = await getPairedTokenUsdPrice({
    publicClient: oraclePublicClient,
    pairedTokenAddress: pairedToken,
    pairedTokenDecimals: pairedDecimals,
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
    publicClient: quotePublicClient,
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
