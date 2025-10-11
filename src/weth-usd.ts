import type { PublicClient } from 'viem'
import { formatUnits, parseUnits } from 'viem'

import { V3QuoterV2 } from './abis'
import { GET_USDC_ADDRESS, UNISWAP_V3_QUOTER_V2, WETH } from './constants'

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

  // Get WETH and USDC addresses
  const wethData = WETH(chainId)
  const usdcAddress = GET_USDC_ADDRESS(chainId)

  if (!wethData) {
    throw new Error(`WETH address not found for chain ID ${chainId}`)
  }

  if (!usdcAddress) {
    throw new Error(`USDC address not found for chain ID ${chainId}`)
  }

  // V3 fee tiers (in order of preference for WETH/USDC)
  const V3_FEE_TIERS = [3000, 500, 10000] // 0.3%, 0.05%, 1%

  // Try each V3 fee tier
  for (const fee of V3_FEE_TIERS) {
    try {
      const oneWeth = parseUnits('1', wethData.decimals)

      // Quote using V3 Quoter V2
      const result = await publicClient.simulateContract({
        address: quoterAddress,
        abi: V3QuoterV2,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn: wethData.address,
            tokenOut: usdcAddress,
            amountIn: oneWeth,
            fee,
            sqrtPriceLimitX96: 0n, // No price limit
          },
        ],
      })

      const [amountOut] = result.result

      if (amountOut > 0n) {
        const priceUsd = formatUnits(amountOut, 6)

        return {
          priceUsd,
          wethPerUsdc: amountOut,
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
