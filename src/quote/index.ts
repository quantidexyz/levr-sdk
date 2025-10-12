/**
 * @description Unified quote API for Uniswap V3 and V4
 *
 * @remarks
 * This module provides quote functionality for both Uniswap V3 and V4 pools.
 * Each version offers two methods:
 * - `read`: Performs an async call to get the quote immediately
 * - `bytecode`: Returns encoded call data for use in multicalls or custom execution
 *
 * @example
 * ```typescript
 * // V3 Read (immediate result)
 * const v3Quote = await quote.v3.read({
 *   publicClient,
 *   quoterAddress: '0x...',
 *   tokenIn: '0x123...',
 *   tokenOut: '0x456...',
 *   amountIn: parseUnits('1', 18),
 *   fee: 3000,
 * })
 * console.log(`Output: ${formatUnits(v3Quote.amountOut, 6)}`)
 *
 * // V3 Bytecode (for multicall)
 * const v3Bytecode = quote.v3.bytecode({
 *   quoterAddress: '0x...',
 *   tokenIn: '0x123...',
 *   tokenOut: '0x456...',
 *   amountIn: parseUnits('1', 18),
 *   fee: 3000,
 * })
 * // Use v3Bytecode.address and v3Bytecode.data in multicall
 *
 * // V4 Read (immediate result with hook fees and price impact)
 * const v4Quote = await quote.v4.read({
 *   publicClient,
 *   poolKey,
 *   zeroForOne: true,
 *   amountIn: parseEther('1'),
 *   pricing,
 *   tokenAddress: '0x...',
 * })
 * console.log(`Output: ${formatEther(v4Quote.amountOut)}`)
 * console.log(`Price Impact: ${v4Quote.priceImpactBps}%`)
 * console.log(`Hook Fees:`, v4Quote.hookFees)
 *
 * // V4 Bytecode (for multicall)
 * const v4Bytecode = quote.v4.bytecode({
 *   publicClient, // Needed for chain ID
 *   poolKey,
 *   zeroForOne: true,
 *   amountIn: parseEther('1'),
 * })
 * // Use v4Bytecode.address and v4Bytecode.data in multicall
 * ```
 */

// Export types
export type {
  QuoteV3Params,
  QuoteV3ReadReturnType,
  QuoteV3BytecodeReturnType,
} from './v3'

export type {
  QuoteV4Params,
  QuoteV4ReadReturnType,
  QuoteV4BytecodeReturnType,
} from './v4'

// Import implementations
import { quoteV3Read, quoteV3Bytecode } from './v3'
import { quoteV4Read, quoteV4Bytecode } from './v4'

/**
 * @description Unified quote API for Uniswap V3 and V4
 */
export const quote = {
  /**
   * Uniswap V3 quote methods
   */
  v3: {
    /**
     * Get a V3 quote by reading from the quoter contract
     * @param params Quote parameters
     * @returns Quote result with output amount
     */
    read: quoteV3Read,
    /**
     * Get encoded bytecode for a V3 quote (for multicalls)
     * @param params Quote parameters
     * @returns Contract address and encoded call data
     */
    bytecode: quoteV3Bytecode,
  },
  /**
   * Uniswap V4 quote methods
   */
  v4: {
    /**
     * Get a V4 quote by reading from the quoter contract
     * @param params Quote parameters
     * @returns Quote result with output amount, gas estimate, price impact, and hook fees
     */
    read: quoteV4Read,
    /**
     * Get encoded bytecode for a V4 quote (for multicalls)
     * @param params Quote parameters
     * @returns Contract address and encoded call data
     */
    bytecode: quoteV4Bytecode,
  },
}

