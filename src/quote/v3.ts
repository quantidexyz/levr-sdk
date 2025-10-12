import type { PublicClient } from 'viem'
import { encodeFunctionData } from 'viem'

import { V3QuoterV2 } from '../abis'

// ============================================================================
// V3 Quote Types
// ============================================================================

/**
 * @description Parameters for quoting a V3 swap
 */
export type QuoteV3Params = {
  /**
   * Public client for V3 quoter queries (only required for read method)
   */
  publicClient?: PublicClient
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
 * @description Return type for V3 quote read method
 */
export type QuoteV3ReadReturnType = {
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
 * @description Return type for V3 quote bytecode method
 */
export type QuoteV3BytecodeReturnType = {
  /**
   * Target contract address
   */
  address: `0x${string}`
  /**
   * Encoded function call data
   */
  data: `0x${string}`
  /**
   * Contract ABI for multicall
   */
  abi: typeof V3QuoterV2
}

// ============================================================================
// V3 Implementation
// ============================================================================

/**
 * @description Quote a swap on Uniswap V3 by reading from the quoter contract
 * @param params Parameters for V3 quote
 * @returns Output amount and fee tier
 */
export const quoteV3Read = async (params: QuoteV3Params): Promise<QuoteV3ReadReturnType> => {
  if (!params.publicClient) {
    throw new Error('publicClient is required for read method')
  }

  const {
    publicClient,
    quoterAddress,
    tokenIn,
    tokenOut,
    amountIn,
    fee,
    sqrtPriceLimitX96 = 0n,
  } = params

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

/**
 * @description Get bytecode for a V3 quote that can be used in multicalls
 * @param params Parameters for V3 quote
 * @returns Contract address, encoded call data, and ABI
 */
export const quoteV3Bytecode = (params: QuoteV3Params): QuoteV3BytecodeReturnType => {
  const { quoterAddress, tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96 = 0n } = params

  const data = encodeFunctionData({
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

  return {
    address: quoterAddress,
    data,
    abi: V3QuoterV2,
  }
}
