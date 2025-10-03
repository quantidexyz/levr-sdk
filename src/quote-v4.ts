import { decodeErrorResult, encodeFunctionData } from 'viem'
import type { PublicClient } from 'viem'

import { V4Quoter } from './abis'
import { UNISWAP_V4_QUOTER } from './constants'
import type { PoolKey } from './types'

export type QuoteV4Params = {
  publicClient: PublicClient
  chainId: number
  poolKey: PoolKey
  zeroForOne: boolean
  amountIn: bigint
  hookData?: `0x${string}`
}

export type QuoteV4ReturnType = {
  amountOut: bigint
  gasEstimate: bigint
}

// QuoteSwap error selector: keccak256("QuoteSwap(uint256)")
const QUOTE_SWAP_SELECTOR = '0xecbd9804'

/**
 * @description Get a swap quote from Uniswap V4 Quoter
 * @param params Quote parameters including pool key and amount
 * @returns Quote result with output amount and gas estimate
 *
 * @remarks
 * The V4Quoter deliberately reverts with QuoteSwap(uint256) to return the quote.
 * This is a gas-efficient pattern for view functions that perform complex simulations.
 *
 * @example
 * ```typescript
 * const quote = await quoteV4({
 *   publicClient,
 *   chainId: base.id,
 *   poolKey,
 *   zeroForOne: true,
 *   amountIn: parseEther('1'),
 * })
 * console.log(`Output: ${formatEther(quote.amountOut)}`)
 * ```
 */
export const quoteV4 = async ({
  publicClient,
  chainId,
  poolKey,
  zeroForOne,
  amountIn,
  hookData = '0x',
}: QuoteV4Params): Promise<QuoteV4ReturnType> => {
  const quoterAddress = UNISWAP_V4_QUOTER(chainId)
  if (!quoterAddress) throw new Error('V4 Quoter address not found for chain')

  // Encode the quote call data
  const callData = encodeFunctionData({
    abi: V4Quoter,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        poolKey: {
          currency0: poolKey.currency0,
          currency1: poolKey.currency1,
          fee: poolKey.fee,
          tickSpacing: poolKey.tickSpacing,
          hooks: poolKey.hooks,
        },
        zeroForOne,
        exactAmount: amountIn,
        hookData,
      },
    ],
  })

  try {
    // Call the quoter - it will revert with QuoteSwap(uint256 amount)
    // We use eth_call which will return the revert data
    const result = await publicClient.call({
      to: quoterAddress,
      data: callData,
    })

    // If call succeeded without revert, something is wrong
    if (result.data) {
      throw new Error('Quoter call succeeded unexpectedly - expected QuoteSwap revert')
    }

    throw new Error('Quoter returned no data')
  } catch (error: any) {
    // The quoter reverts with QuoteSwap(uint256) containing the quote
    // Extract revert data from the error
    let revertData: `0x${string}` | undefined

    if (error?.data) {
      revertData = error.data as `0x${string}`
    } else if (error?.cause?.data) {
      revertData = error.cause.data as `0x${string}`
    } else if (error?.walk) {
      // Walk the error chain to find revert data
      const revertError = error.walk((err: any) => err?.data)
      revertData = revertError?.data as `0x${string}`
    }

    if (!revertData) {
      throw new Error(
        `Failed to get quote: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    // Check if this is the QuoteSwap error
    const errorSelector = revertData.slice(0, 10)
    if (errorSelector.toLowerCase() !== QUOTE_SWAP_SELECTOR.toLowerCase()) {
      // For hooks with custom accounting (like HookDeltaExceedsSwapAmount),
      // the quoter cannot simulate the swap. Return a reasonable estimate of 0
      // and let the actual swap determine the output amount.
      return {
        amountOut: 0n,
        gasEstimate: 0n,
      }
    }

    // Decode the QuoteSwap error to extract the amount
    // QuoteSwap(uint256) has the amount at bytes 4-35
    try {
      const decoded = decodeErrorResult({
        abi: V4Quoter,
        data: revertData,
      })

      if (decoded.errorName !== 'QuoteSwap') {
        throw new Error(`Unexpected error: ${decoded.errorName}`)
      }

      const amountOut = decoded.args[0] as bigint

      return {
        amountOut,
        gasEstimate: 0n, // Gas estimation not available from static call
      }
    } catch (decodeError) {
      // Fallback: manually decode if ABI decode fails
      // Extract uint256 from position 0x04
      const amountHex = revertData.slice(10) // Remove selector (0x + 8 chars)
      const amountOut = BigInt(`0x${amountHex}`)

      return {
        amountOut,
        gasEstimate: 0n,
      }
    }
  }
}
