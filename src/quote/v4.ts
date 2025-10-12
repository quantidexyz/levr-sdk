import type { PublicClient } from 'viem'
import { encodeAbiParameters, encodeFunctionData, formatUnits, keccak256 } from 'viem'

import { IClankerHookDynamicFee, IClankerHookStaticFee, V4Quoter } from '../abis'
import { UNISWAP_V4_QUOTER } from '../constants'
import type { PoolKey, PricingResult } from '../types'

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
   * Optional pricing data for price impact calculation
   */
  pricing?: PricingResult
  /**
   * Decimals for currency0 (default: 18)
   */
  currency0Decimals?: number
  /**
   * Decimals for currency1 (default: 18)
   */
  currency1Decimals?: number
  /**
   * Project token address to determine which currency is token vs WETH
   */
  tokenAddress?: `0x${string}`
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
 * @description Try to get static fees from a Clanker hook using multicall
 */
const tryGetStaticFees = async (
  publicClient: PublicClient,
  hookAddress: `0x${string}`,
  poolId: `0x${string}`
): Promise<{ clankerFee: number; pairedFee: number } | undefined> => {
  try {
    const results = await publicClient.multicall({
      contracts: [
        {
          address: hookAddress,
          abi: IClankerHookStaticFee,
          functionName: 'clankerFee',
          args: [poolId],
        },
        {
          address: hookAddress,
          abi: IClankerHookStaticFee,
          functionName: 'pairedFee',
          args: [poolId],
        },
      ],
    })

    if (results[0].status === 'success' && results[1].status === 'success') {
      return {
        clankerFee: Number(results[0].result),
        pairedFee: Number(results[1].result),
      }
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * @description Try to get dynamic fee configuration from a Clanker hook
 */
const tryGetDynamicFees = async (
  publicClient: PublicClient,
  hookAddress: `0x${string}`,
  poolId: `0x${string}`
): Promise<{ baseFee: number; maxLpFee: number } | undefined> => {
  try {
    const config = await publicClient.readContract({
      address: hookAddress,
      abi: IClankerHookDynamicFee,
      functionName: 'poolConfigVars',
      args: [poolId],
    })
    return {
      baseFee: Number(config.baseFee),
      maxLpFee: Number(config.maxLpFee),
    }
  } catch {
    return undefined
  }
}

/**
 * @description Get hook fee information from Clanker hooks
 */
const getHookFees = async (
  publicClient: PublicClient,
  poolKey: PoolKey
): Promise<QuoteV4ReadReturnType['hookFees']> => {
  // Generate pool ID for hook queries (keccak256 of abi.encode(PoolKey))
  const poolId = keccak256(
    encodeAbiParameters(
      [
        {
          type: 'tuple',
          components: [
            { name: 'currency0', type: 'address' },
            { name: 'currency1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'hooks', type: 'address' },
          ],
        },
      ],
      [poolKey]
    )
  )

  // Try static fees first
  const staticFees = await tryGetStaticFees(publicClient, poolKey.hooks, poolId)
  if (staticFees) {
    return {
      type: 'static',
      clankerFee: staticFees.clankerFee,
      pairedFee: staticFees.pairedFee,
    }
  }

  // Try dynamic fees
  const dynamicFees = await tryGetDynamicFees(publicClient, poolKey.hooks, poolId)
  if (dynamicFees) {
    return {
      type: 'dynamic',
      baseFee: dynamicFees.baseFee,
      maxLpFee: dynamicFees.maxLpFee,
    }
  }

  return undefined
}

/**
 * @description Calculate price impact using USD pricing
 * Compares the execution price to the market spot price
 */
const calculatePriceImpact = (
  amountIn: bigint,
  amountOut: bigint,
  currency0: `0x${string}`,
  currency1: `0x${string}`,
  currency0Decimals: number,
  currency1Decimals: number,
  tokenAddress: `0x${string}`,
  pricing: PricingResult,
  zeroForOne: boolean
): number | undefined => {
  try {
    // Determine which currency is the token and which is WETH
    const currency0IsToken = currency0.toLowerCase() === tokenAddress.toLowerCase()

    // Format amounts to decimal strings
    const amountInFormatted = parseFloat(
      formatUnits(amountIn, zeroForOne ? currency0Decimals : currency1Decimals)
    )
    const amountOutFormatted = parseFloat(
      formatUnits(amountOut, zeroForOne ? currency1Decimals : currency0Decimals)
    )

    if (amountInFormatted === 0 || amountOutFormatted === 0) return undefined

    // Get market spot prices
    const wethPrice = parseFloat(pricing.wethUsd)
    const tokenPrice = parseFloat(pricing.tokenUsd)

    if (tokenPrice === 0 || wethPrice === 0) return undefined

    // Calculate execution rate (how many output per input)
    const executionRate = amountOutFormatted / amountInFormatted

    // Determine swap direction and calculate market rate
    const inputIsToken = zeroForOne ? currency0IsToken : !currency0IsToken

    // Calculate market spot rate (output per input at market prices)
    const marketRate = inputIsToken
      ? tokenPrice / wethPrice // Token → WETH
      : wethPrice / tokenPrice // WETH → Token

    // Getting better or equal rate than market - minimal impact
    if (executionRate >= marketRate) {
      return 0.1
    }

    // Getting worse rate than market - calculate actual slippage
    const impact = (1 - executionRate / marketRate) * 100

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
    pricing,
    currency0Decimals = 18,
    currency1Decimals = 18,
    tokenAddress,
  } = params

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found on public client')

  const quoterAddress = UNISWAP_V4_QUOTER(chainId)
  if (!quoterAddress) throw new Error(`V4 Quoter address not found for chain ID ${chainId}`)

  // Fetch hook fees and quote in parallel
  const [{ result }, hookFees] = await Promise.all([
    publicClient.simulateContract({
      address: quoterAddress,
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
    }),
    getHookFees(publicClient, poolKey),
  ])

  // The quoter returns [amountOut: bigint, gasEstimate: bigint]
  const [amountOut, gasEstimate] = result

  // Calculate price impact if pricing and token address are available
  const priceImpactBps =
    pricing && tokenAddress
      ? calculatePriceImpact(
          amountIn,
          amountOut,
          poolKey.currency0,
          poolKey.currency1,
          currency0Decimals,
          currency1Decimals,
          tokenAddress,
          pricing,
          zeroForOne
        )
      : undefined

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
