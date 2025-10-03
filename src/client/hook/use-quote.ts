'use client'

import { useQuery } from '@tanstack/react-query'
import { parseUnits } from 'viem'
import { usePublicClient } from 'wagmi'

import { QuoterV4 } from '../../abis'
import { UNISWAP_V4_QUOTER } from '../../constants'
import type { PoolKey } from './use-swap'

export type UseQuoteParams = {
  poolKey?: PoolKey
  zeroForOne?: boolean
  amountIn?: string // Human-readable amount (e.g., "1.5")
  amountInDecimals?: number
  amountOutDecimals?: number
  hookData?: `0x${string}`
  enabled?: boolean
}

export type QuoteResult = {
  amountOut: bigint
  amountOutFormatted: string
}

/**
 * Hook for getting swap quotes from Uniswap v4 Quoter contract
 * @param params - Quote parameters
 * @returns Query result with expected output amount
 * @see https://docs.uniswap.org/sdk/v4/guides/swaps/quoting
 */
export function useQuote({
  poolKey,
  zeroForOne,
  amountIn,
  amountInDecimals = 18,
  amountOutDecimals = 18,
  hookData = '0x00',
  enabled = true,
}: UseQuoteParams = {}) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id
  const quoterAddress = UNISWAP_V4_QUOTER(chainId)

  return useQuery<QuoteResult | null>({
    queryKey: [
      'quote',
      quoterAddress,
      poolKey?.currency0,
      poolKey?.currency1,
      poolKey?.fee,
      poolKey?.tickSpacing,
      poolKey?.hooks,
      zeroForOne,
      amountIn,
      amountInDecimals,
      amountOutDecimals,
      hookData,
      chainId,
    ],
    queryFn: async () => {
      if (!poolKey || !amountIn || zeroForOne === undefined) return null

      try {
        // Parse the input amount to wei/token units
        const exactAmount = parseUnits(amountIn, amountInDecimals)

        // Call the quoter contract
        // Note: The quoter uses state-changing calls that are designed to revert
        // viem's simulateContract will handle this by simulating the call
        const result = await publicClient!.simulateContract({
          address: quoterAddress!,
          abi: QuoterV4,
          functionName: 'quoteExactInputSingle',
          args: [
            {
              poolKey,
              zeroForOne,
              exactAmount,
              hookData,
            },
          ],
        })

        // Extract the output amount from deltaAmounts array
        // The output is at index 1 if zeroForOne is true, index 0 if false
        const deltaAmounts = result.result[0] as bigint[]
        const outputIndex = zeroForOne ? 1 : 0
        const deltaAmount = deltaAmounts[outputIndex]

        // Delta amounts are signed; output is negative (going out of pool)
        // We need to take the absolute value
        const amountOut = deltaAmount < 0n ? -deltaAmount : deltaAmount

        return {
          amountOut,
          amountOutFormatted: (Number(amountOut) / 10 ** amountOutDecimals).toString(),
        }
      } catch (error: any) {
        // Log detailed error for debugging
        console.error('Quote error:', {
          error,
          poolKey,
          zeroForOne,
          amountIn,
          amountInDecimals,
          errorMessage: error?.message,
          errorData: error?.data,
          errorSignature: error?.message?.match(/0x[a-fA-F0-9]+/)?.[0],
        })
        console.error('Pool Key Details:', {
          currency0: poolKey.currency0,
          currency1: poolKey.currency1,
          fee: poolKey.fee,
          feeHex: `0x${poolKey.fee.toString(16)}`,
          tickSpacing: poolKey.tickSpacing,
          hooks: poolKey.hooks,
          isDynamicFee: (poolKey.fee & 0x800000) !== 0,
        })

        // Check for specific error types
        if (
          error?.message?.includes('PoolNotInitialized') ||
          error?.data?.includes('0x6190b2b0') ||
          error?.message?.includes('0x6190b2b0')
        ) {
          throw new Error(
            `Pool not initialized on PoolManager. 

Possible causes:
1. The pool key parameters (fee, tickSpacing, hooks) don't match an initialized pool
2. The token was not deployed through Clanker properly
3. The hook's initializePool() was never called

Check the console for detailed pool key information and verify it matches your deployed token's pool.`
          )
        }

        if (error?.message?.includes('InvalidPool')) {
          throw new Error('Invalid pool configuration. Check fee tier and parameters.')
        }

        if (error?.message?.includes('Position') && error?.message?.includes('out of bounds')) {
          throw new Error(
            'Insufficient liquidity in the pool for this swap size. Try a smaller amount or swap in the opposite direction.'
          )
        }

        if (error?.message?.includes('liquidity') || error?.message?.includes('Liquidity')) {
          throw new Error('Insufficient liquidity in the pool. Try a smaller amount.')
        }

        // Re-throw with more context
        throw error
      }
    },
    enabled:
      enabled &&
      !!publicClient &&
      !!quoterAddress &&
      !!poolKey &&
      !!amountIn &&
      zeroForOne !== undefined &&
      parseFloat(amountIn) > 0,
    staleTime: 5_000, // Quotes are valid for 5 seconds
  })
}
