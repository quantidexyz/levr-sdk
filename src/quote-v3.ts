import type { PublicClient } from 'viem'

import { V3QuoterV2 } from './abis'

/**
 * @description Parameters for quoting a V3 swap
 */
export type QuoteV3Params = {
  /**
   * Public client for V3 quoter queries
   */
  publicClient: PublicClient
  /**
   * V3 Quoter V2 address
   */
  quoterAddress: `0x${string}`
  /**
   * Input token address
   */
  tokenIn: `0x${string}`
  /**
   * Output token address
   */
  tokenOut: `0x${string}`
  /**
   * Amount of input token (in wei)
   */
  amountIn: bigint
  /**
   * Fee tier (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
   */
  fee: number
  /**
   * Optional sqrt price limit (0n = no limit)
   */
  sqrtPriceLimitX96?: bigint
}

/**
 * @description Return type for V3 quote
 */
export type QuoteV3ReturnType = {
  /**
   * Amount of output token (in wei)
   */
  amountOut: bigint
  /**
   * Fee tier used for the quote
   */
  fee: number
}

/**
 * @description Quote a swap on Uniswap V3
 *
 * @param params Parameters for V3 quote
 * @returns Output amount and fee tier
 *
 * @remarks
 * This function quotes a swap using Uniswap V3's QuoterV2 contract.
 * It simulates the swap without executing it, returning the expected output amount.
 *
 * @example
 * ```typescript
 * const quote = await quoteV3({
 *   publicClient,
 *   quoterAddress: '0x...',
 *   tokenIn: '0x123...',
 *   tokenOut: '0x456...',
 *   amountIn: parseUnits('1', 18),
 *   fee: 3000,
 * })
 * console.log(`Expected output: ${formatUnits(quote.amountOut, 6)}`)
 * ```
 */
export const quoteV3 = async ({
  publicClient,
  quoterAddress,
  tokenIn,
  tokenOut,
  amountIn,
  fee,
  sqrtPriceLimitX96 = 0n,
}: QuoteV3Params): Promise<QuoteV3ReturnType> => {
  const result = await publicClient.simulateContract({
    address: quoterAddress,
    abi: V3QuoterV2,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn,
        tokenOut,
        amountIn,
        fee,
        sqrtPriceLimitX96,
      },
    ],
  })

  const [amountOut] = result.result

  return {
    amountOut,
    fee,
  }
}
