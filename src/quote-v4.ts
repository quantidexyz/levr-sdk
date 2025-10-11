import type { PublicClient } from 'viem'
import { encodeAbiParameters, formatUnits, keccak256 } from 'viem'

import { IClankerHookDynamicFee, IClankerHookStaticFee, V4Quoter } from './abis'
import { UNISWAP_V4_QUOTER } from './constants'
import type { PoolKey, PricingResult } from './types'

export type QuoteV4Params = {
  publicClient: PublicClient
  poolKey: PoolKey
  zeroForOne: boolean
  amountIn: bigint
  hookData?: `0x${string}`
  pricing?: PricingResult
  currency0Decimals?: number
  currency1Decimals?: number
  tokenAddress?: `0x${string}` // Project token address to determine which currency is token vs WETH
}

export type QuoteV4ReturnType = {
  amountOut: bigint
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

/**
 * @description Try to get static fees from a Clanker hook using multicall
 * @param publicClient Public client
 * @param hookAddress Hook address
 * @param poolId Pool ID
 * @returns Static fees or undefined
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
 * @param publicClient Public client
 * @param hookAddress Hook address
 * @param poolId Pool ID
 * @returns Dynamic fee config or undefined
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
 * @param publicClient Public client
 * @param poolKey Pool key containing hook address
 * @returns Hook fee information or undefined
 */
const getHookFees = async (
  publicClient: PublicClient,
  poolKey: PoolKey
): Promise<QuoteV4ReturnType['hookFees']> => {
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
 * @description Get a swap quote from Uniswap V4 Quoter
 * @param params Quote parameters including pool key and amount
 * @returns Quote result with output amount, gas estimate, and hook fees
 *
 * @remarks
 * The V4Quoter uses state-changing calls that are simulated via static call.
 * The quoter returns the expected output amount for the given input.
 *
 * This function works for both native ETH and ERC20 swaps:
 * - Native ETH → Token: Quote uses WETH address, swap router handles wrapping
 * - Token → Native ETH: Quote uses WETH address, swap router handles unwrapping
 *
 * @example
 * ```typescript
 * const quote = await quoteV4({
 *   publicClient,
 *   poolKey,
 *   zeroForOne: true,
 *   amountIn: parseEther('1'),
 * })
 * console.log(`Output: ${formatEther(quote.amountOut)}`)
 * console.log(`Fees:`, quote.hookFees)
 * ```
 */
/**
 * Calculate price impact using USD pricing
 * Compares the execution price to the market spot price
 * @param amountIn Input amount in token decimals
 * @param amountOut Output amount in token decimals
 * @param currency0 Currency0 address
 * @param currency1 Currency1 address
 * @param currency0Decimals Decimals for currency0
 * @param currency1Decimals Decimals for currency1
 * @param tokenAddress Project token address
 * @param pricing USD pricing for WETH and token
 * @param zeroForOne Swap direction
 * @returns Price impact as a percentage (e.g., 0.5 for 0.5%) or undefined if calculation fails
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
    // For zeroForOne: swapping currency0 → currency1
    // For !zeroForOne: swapping currency1 → currency0
    const inputIsToken = zeroForOne ? currency0IsToken : !currency0IsToken

    // Calculate market spot rate (output per input at market prices)
    const marketRate = inputIsToken
      ? tokenPrice / wethPrice // Token → WETH: ($/token) / ($/WETH) = WETH per token
      : wethPrice / tokenPrice // WETH → Token: ($/WETH) / ($/token) = tokens per WETH

    // Price impact = difference between execution and market rate
    // Only show impact when execution rate is WORSE than market rate
    // (getting less output than expected = actual price impact/slippage)

    // If executionRate > marketRate, you're getting a better deal than market (show small impact)
    // If executionRate < marketRate, you're getting worse (show actual impact)

    if (executionRate >= marketRate) {
      // Getting better or equal rate than market - minimal impact
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

export const quoteV4 = async ({
  publicClient,
  poolKey,
  zeroForOne,
  amountIn,
  hookData = '0x',
  pricing,
  currency0Decimals = 18,
  currency1Decimals = 18,
  tokenAddress,
}: QuoteV4Params): Promise<QuoteV4ReturnType> => {
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
