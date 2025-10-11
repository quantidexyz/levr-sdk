'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import type { TransactionReceipt } from 'viem'
import { formatUnits, parseUnits } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { quoteV4 } from '../../quote-v4'
import { swapV4 } from '../../swap-v4'
import type { PoolKey } from '../../types'
import { useLevrContext } from '../levr-provider'
import { queryKeys } from '../query-keys'

export type SwapConfig = {
  poolKey: PoolKey
  zeroForOne: boolean
  amountIn: string
  amountOutMinimum: string
  hookData?: `0x${string}`
}

export type UseSwapParams = {
  enabled?: boolean
  tokenAddress?: `0x${string}`
  tokenDecimals?: number

  // Quote params (optional - for reactive quotes)
  // Pool key comes from context automatically
  quoteParams?: {
    zeroForOne: boolean
    amountIn: string
    amountInDecimals: number
    amountOutDecimals: number
    hookData?: `0x${string}`
  }

  onApproveERC20Success?: (receipt: TransactionReceipt) => void
  onApproveERC20Error?: (error: unknown) => void

  onApprovePermit2Success?: (receipt: TransactionReceipt) => void
  onApprovePermit2Error?: (error: unknown) => void

  onSwapSuccess?: (receipt: any) => void
  onSwapError?: (error: unknown) => void
}

/**
 * Hook for managing Uniswap v4 swaps
 * Balances are fetched from LevrProvider
 * @param params - Hook parameters
 * @returns Queries and mutations for swap operations
 */
export function useSwap({
  enabled = true,
  tokenAddress: _tokenAddress,
  tokenDecimals = 18,
  quoteParams,
  onApproveERC20Success,
  onApproveERC20Error,
  onApprovePermit2Success,
  onApprovePermit2Error,
  onSwapSuccess,
  onSwapError,
}: UseSwapParams = {}) {
  const { balances, refetch, project } = useLevrContext()
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id

  // Get pool key from project context
  const poolKey = project.data?.pool?.poolKey

  // Query: Get swap quote
  const quote = useQuery({
    queryKey: queryKeys.swap.quote(
      chainId,
      poolKey,
      quoteParams?.zeroForOne,
      quoteParams?.amountIn,
      quoteParams?.amountInDecimals
    ),
    queryFn: async () => {
      if (!poolKey) throw new Error('Pool key not available')

      const amountInBigInt = parseUnits(quoteParams!.amountIn, quoteParams!.amountInDecimals)

      const result = await quoteV4({
        publicClient: publicClient!,
        poolKey,
        zeroForOne: quoteParams!.zeroForOne,
        amountIn: amountInBigInt,
        hookData: quoteParams!.hookData,
      })

      return {
        ...result,
        amountOutFormatted: formatUnits(result.amountOut, quoteParams!.amountOutDecimals),
      }
    },
    enabled:
      enabled &&
      !!publicClient &&
      !!chainId &&
      !!poolKey &&
      !!quoteParams &&
      !!quoteParams.amountIn &&
      parseFloat(quoteParams.amountIn) > 0,
    retry: 1,
  })

  // Mutation: Execute swap
  const swap = useMutation({
    mutationFn: async (config: SwapConfig) => {
      if (!wallet.data) throw new Error('Wallet is not connected')
      if (!publicClient) throw new Error('Public client is not connected')
      if (!chainId) throw new Error('Chain ID not found')

      const receipt = await swapV4({
        publicClient,
        wallet: wallet.data,
        chainId,
        poolKey: config.poolKey,
        zeroForOne: config.zeroForOne,
        amountIn: BigInt(config.amountIn),
        amountOutMinimum: BigInt(config.amountOutMinimum),
        hookData: config.hookData,
        onApproveERC20Success,
        onApproveERC20Error,
        onApprovePermit2Success,
        onApprovePermit2Error,
      })

      return receipt
    },
    onSuccess: async (receipt) => {
      // Use centralized cross-domain refetch
      await refetch.afterSwap()
      onSwapSuccess?.(receipt)
    },
    onError: onSwapError,
  })

  // Helper: Build swap config from simple params
  // Uses pool key from context automatically
  const buildSwapConfig = ({
    zeroForOne,
    amountIn,
    amountInDecimals = 18,
    minAmountOut,
  }: {
    zeroForOne: boolean
    amountIn: number
    amountInDecimals?: number
    minAmountOut: string
  }): SwapConfig | null => {
    if (!poolKey) return null

    return {
      poolKey,
      zeroForOne,
      amountIn: parseUnits(amountIn.toString(), amountInDecimals).toString(),
      amountOutMinimum: minAmountOut,
      hookData: '0x00',
    }
  }

  return {
    // Mutations
    swap,

    // Queries
    balances,
    quote,

    // Pool info from context
    poolKey,

    // Convenience accessors for balances
    tokenBalance: balances.data?.token,
    wethBalance: balances.data?.weth,

    // Helpers
    buildSwapConfig,
  }
}
