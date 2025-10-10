import type { PublicClient } from 'viem'
import { encodeAbiParameters, keccak256 } from 'viem'

import { IClankerHookDynamicFee, IClankerHookStaticFee, V4Quoter } from './abis'
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
 *   chainId: base.id,
 *   poolKey,
 *   zeroForOne: true,
 *   amountIn: parseEther('1'),
 * })
 * console.log(`Output: ${formatEther(quote.amountOut)}`)
 * console.log(`Fees:`, quote.hookFees)
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

  // Always fetch hook fee information (in parallel with quote)
  const hookFeesPromise = getHookFees(publicClient, poolKey)

  // Call the quoter using simulateContract (static call simulation)
  // This is equivalent to ethers.js callStatic
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
    hookFeesPromise,
  ])

  // The quoter returns [amountOut: bigint, gasEstimate: bigint]
  const [amountOut, gasEstimate] = result

  return {
    amountOut,
    gasEstimate,
    hookFees,
  }
}
