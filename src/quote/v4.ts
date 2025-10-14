import type { PublicClient } from 'viem'
import { encodeFunctionData, formatUnits } from 'viem'

import { IClankerHookDynamicFee, IClankerHookStaticFee, StateView, V4Quoter } from '../abis'
import { UNISWAP_V4_QUOTER, UNISWAP_V4_STATE_VIEW } from '../constants'
import { getPoolId } from '../pool-key'
import type { PoolKey } from '../types'

// ============================================================================
// V4 Quote Types
// ============================================================================

export type QuoteV4Params = {
  /**
   * Public client for V4 quoter queries (only required for read method)
   */
  publicClient?: PublicClient
  /**
   * Pool key containing currency pair and fee info
   */
  poolKey: PoolKey
  /**
   * Swap direction (true = currency0 to currency1, false = currency1 to currency0)
   */
  zeroForOne: boolean
  /**
   * Amount of input token (in wei)
   */
  amountIn: bigint
  /**
   * Optional hook data
   */
  hookData?: `0x${string}`
  /**
   * Decimals for currency0 (default: 18)
   */
  currency0Decimals?: number
  /**
   * Decimals for currency1 (default: 18)
   */
  currency1Decimals?: number
  /**
   * Whether to calculate price impact (requires fetching pool state)
   * @default true
   */
  calculatePriceImpact?: boolean
}

export type QuoteV4ReadReturnType = {
  /**
   * Amount of output token (in wei)
   */
  amountOut: bigint
  /**
   * Estimated gas for the swap
   */
  gasEstimate: bigint
  /**
   * Price impact percentage (e.g., 0.5 for 0.5%)
   * Only calculated if pricing data is provided
   */
  priceImpactBps?: number
  /**
   * Fee information from Clanker hooks (if available)
   * - Static fees: clankerFee and pairedFee in basis points
   * - Dynamic fees: baseFee and maxLpFee in basis points
   */
  hookFees?: {
    type: 'static' | 'dynamic'
    clankerFee?: number
    pairedFee?: number
    baseFee?: number
    maxLpFee?: number
  }
}

export type QuoteV4BytecodeReturnType = {
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
  abi: typeof V4Quoter
}

// ============================================================================
// V4 Helper Functions
// ============================================================================

/**
 * @description Convert sqrtPriceX96 to a decimal price (token1/token0)
 * Uses the standard Uniswap formula: price = (sqrtPriceX96 / 2^96)^2
 * Adjusted for token decimals
 */
const sqrtPriceX96ToPrice = (
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number
): number => {
  // Convert sqrtPriceX96 to a decimal number
  // price = (sqrtPriceX96 / 2^96)^2
  const Q96 = 2n ** 96n
  const numerator = sqrtPriceX96 * sqrtPriceX96
  const denominator = Q96 * Q96

  // Get the price as a float
  let price = Number(numerator) / Number(denominator)

  // Adjust for token decimals: price represents token1/token0
  // If token0 has more decimals, we need to scale up the price
  if (decimals0 !== decimals1) {
    const decimalAdjustment = 10 ** (decimals0 - decimals1)
    price = price * decimalAdjustment
  }

  return price
}

/**
 * @description Calculate price impact using the actual pool state
 * Compares the execution price from the quote to the spot price before the swap
 *
 * This is the standard AMM price impact calculation:
 * - Spot price (before swap): derived from sqrtPriceX96
 * - Execution price: actual rate from quote (amountOut / amountIn)
 * - Price impact: % difference between spot and execution price
 *
 * The execution price inherently accounts for price movement during the swap,
 * as it represents the average price across the entire trade.
 */
const calculatePriceImpact = (
  sqrtPriceX96: bigint,
  amountIn: bigint,
  amountOut: bigint,
  currency0Decimals: number,
  currency1Decimals: number,
  zeroForOne: boolean
): number | undefined => {
  try {
    // Get spot price from sqrtPriceX96 (token1/token0)
    const spotPrice = sqrtPriceX96ToPrice(sqrtPriceX96, currency0Decimals, currency1Decimals)

    if (spotPrice === 0) return undefined

    // Calculate execution price from the quote
    // Format amounts to decimals
    const amountInFloat = parseFloat(
      formatUnits(amountIn, zeroForOne ? currency0Decimals : currency1Decimals)
    )
    const amountOutFloat = parseFloat(
      formatUnits(amountOut, zeroForOne ? currency1Decimals : currency0Decimals)
    )

    if (amountInFloat === 0 || amountOutFloat === 0) return undefined

    // Execution price depends on swap direction
    let executionPrice: number
    if (zeroForOne) {
      // Swapping token0 -> token1
      // Execution price = token1 received / token0 given = token1/token0
      executionPrice = amountOutFloat / amountInFloat
    } else {
      // Swapping token1 -> token0
      // Execution price = token0 received / token1 given = token0/token1
      // Convert to token1/token0 to compare with spot price
      executionPrice = 1 / (amountOutFloat / amountInFloat)
    }

    // Calculate price impact: |spotPrice - executionPrice| / spotPrice * 100
    // For zeroForOne: we're buying token1, so price moves up -> execution > spot
    // For oneForZero: we're buying token0, so price (token1/token0) moves down -> execution < spot
    const impact = Math.abs((spotPrice - executionPrice) / spotPrice) * 100

    // Return impact in basis points-like format (as percentage)
    return impact
  } catch (error) {
    console.warn('Price impact calculation failed:', error)
    return undefined
  }
}

// ============================================================================
// V4 Implementation
// ============================================================================

/**
 * @description Quote a swap on Uniswap V4 by reading from the quoter contract
 * Uses a single multicall for optimal performance when fetching quote, pool state, and hook fees
 * @param params Quote parameters including pool key and amount
 * @returns Quote result with output amount, gas estimate, price impact, and hook fees
 */
export const quoteV4Read = async (params: QuoteV4Params): Promise<QuoteV4ReadReturnType> => {
  if (!params.publicClient) {
    throw new Error('publicClient is required for read method')
  }

  const {
    publicClient,
    poolKey,
    zeroForOne,
    amountIn,
    hookData = '0x',
    currency0Decimals = 18,
    currency1Decimals = 18,
    calculatePriceImpact: shouldCalculatePriceImpact = true,
  } = params

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const quoterAddress = UNISWAP_V4_QUOTER(chainId)
  if (!quoterAddress) throw new Error(`V4 Quoter address not found for chain ID ${chainId}`)

  const stateViewAddress = UNISWAP_V4_STATE_VIEW(chainId)
  if (!stateViewAddress) throw new Error(`V4 StateView address not found for chain ID ${chainId}`)

  // Prepare pool ID for pool state and hook fee queries
  const poolId = getPoolId(poolKey)

  // Build multicall contracts array
  const contracts = [
    // Contract 0: Quote
    {
      address: quoterAddress,
      abi: V4Quoter,
      functionName: 'quoteExactInputSingle' as const,
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
    },
    // Contract 1: Pool state (sqrtPriceX96) - only if calculating price impact
    ...(shouldCalculatePriceImpact
      ? [
          {
            address: stateViewAddress,
            abi: StateView,
            functionName: 'getSlot0' as const,
            args: [poolId],
          },
        ]
      : []),
    // Contracts 2-3: Static hook fees
    {
      address: poolKey.hooks,
      abi: IClankerHookStaticFee,
      functionName: 'clankerFee' as const,
      args: [poolId],
    },
    {
      address: poolKey.hooks,
      abi: IClankerHookStaticFee,
      functionName: 'pairedFee' as const,
      args: [poolId],
    },
    // Contract 4: Dynamic hook fees
    {
      address: poolKey.hooks,
      abi: IClankerHookDynamicFee,
      functionName: 'poolConfigVars' as const,
      args: [poolId],
    },
  ]

  // Execute single multicall
  const results = await publicClient.multicall({ contracts })

  // Parse quote result (always at index 0)
  const quoteResult = results[0]
  if (quoteResult.status !== 'success') {
    throw new Error('Quote failed')
  }
  const [amountOut, gasEstimate] = quoteResult.result as [bigint, bigint]

  // Parse pool state result (at index 1 if price impact calculation is enabled)
  let priceImpactBps: number | undefined
  const poolStateIndex = shouldCalculatePriceImpact ? 1 : -1
  if (shouldCalculatePriceImpact && results[poolStateIndex]?.status === 'success') {
    const poolState = results[poolStateIndex].result as [bigint, number, number, number]
    priceImpactBps = calculatePriceImpact(
      poolState[0], // sqrtPriceX96
      amountIn,
      amountOut,
      currency0Decimals,
      currency1Decimals,
      zeroForOne
    )
  }

  // Parse hook fees (indices adjust based on whether pool state was fetched)
  const hookFeeBaseIndex = shouldCalculatePriceImpact ? 2 : 1
  const staticFeeResults = [
    results[hookFeeBaseIndex], // clankerFee
    results[hookFeeBaseIndex + 1], // pairedFee
  ]
  const dynamicFeeResult = results[hookFeeBaseIndex + 2] // poolConfigVars

  let hookFees: QuoteV4ReadReturnType['hookFees']

  // Try static fees first
  if (staticFeeResults[0]?.status === 'success' && staticFeeResults[1]?.status === 'success') {
    hookFees = {
      type: 'static',
      clankerFee: Number(staticFeeResults[0].result),
      pairedFee: Number(staticFeeResults[1].result),
    }
  }
  // Try dynamic fees
  else if (dynamicFeeResult?.status === 'success') {
    const config = dynamicFeeResult.result as unknown as {
      baseFee: number
      maxLpFee: number
      referenceTickFilterPeriod: bigint
      resetPeriod: bigint
      resetTickFilter: number
      feeControlNumerator: bigint
      decayFilterBps: number
    }
    hookFees = {
      type: 'dynamic',
      baseFee: Number(config.baseFee),
      maxLpFee: Number(config.maxLpFee),
    }
  }

  return {
    amountOut,
    gasEstimate,
    priceImpactBps,
    hookFees,
  }
}

/**
 * @description Get bytecode for a V4 quote that can be used in multicalls
 * @param params Quote parameters including pool key and amount
 * @returns Contract address, encoded call data, and ABI
 */
export const quoteV4Bytecode = (params: QuoteV4Params): QuoteV4BytecodeReturnType => {
  const { poolKey, zeroForOne, amountIn, hookData = '0x', publicClient } = params

  const chainId = publicClient?.chain?.id
  if (!chainId) throw new Error('Chain ID required for bytecode generation')

  const quoterAddress = UNISWAP_V4_QUOTER(chainId)
  if (!quoterAddress) throw new Error(`V4 Quoter address not found for chain ID ${chainId}`)

  const data = encodeFunctionData({
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

  return {
    address: quoterAddress,
    data,
    abi: V4Quoter,
  }
}
