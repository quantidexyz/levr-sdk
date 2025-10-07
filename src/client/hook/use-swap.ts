'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { formatUnits, parseUnits } from 'viem'
import type { TransactionReceipt } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { WETH } from '../../constants'
import { quoteV4 } from '../../quote-v4'
import { swapV4 } from '../../swap-v4'
import type { PoolKey } from '../../types'
import { useBalance } from './use-balance'

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
  quoteParams?: {
    poolKey: PoolKey
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
 * @param params - Hook parameters
 * @returns Queries and mutations for swap operations
 */
export function useSwap({
  enabled = true,
  tokenAddress,
  tokenDecimals = 18,
  quoteParams,
  onApproveERC20Success,
  onApproveERC20Error,
  onApprovePermit2Success,
  onApprovePermit2Error,
  onSwapSuccess,
  onSwapError,
}: UseSwapParams = {}) {
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id

  const wethAddress = WETH(chainId)?.address

  // Query: Token balances (token + WETH)
  const balances = useBalance({
    tokens: [
      tokenAddress && { address: tokenAddress, decimals: tokenDecimals, key: 'token' },
      wethAddress && { address: wethAddress, decimals: 18, key: 'weth' },
    ].filter(Boolean) as any,
    enabled: enabled && !!(tokenAddress || wethAddress),
  })

  // Query: Get swap quote
  const quote = useQuery({
    queryKey: [
      'swap',
      'quote',
      chainId,
      quoteParams?.poolKey,
      quoteParams?.zeroForOne,
      quoteParams?.amountIn,
      quoteParams?.amountInDecimals,
    ],
    queryFn: async () => {
      const amountInBigInt = parseUnits(quoteParams!.amountIn, quoteParams!.amountInDecimals)

      const result = await quoteV4({
        publicClient: publicClient!,
        chainId: chainId!,
        poolKey: quoteParams!.poolKey,
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
    onSuccess: (receipt) => {
      balances.refetch()
      onSwapSuccess?.(receipt)
    },
    onError: onSwapError,
  })

  // Helper: Build swap config from simple params
  const buildSwapConfig = ({
    tokenIn,
    tokenOut,
    amountIn,
    amountInDecimals = 18,
    minAmountOut,
    fee = 500,
    tickSpacing = 10,
    hooks = '0x0000000000000000000000000000000000000000',
  }: {
    tokenIn: `0x${string}`
    tokenOut: `0x${string}`
    amountIn: number
    amountInDecimals?: number
    minAmountOut: string
    fee?: number
    tickSpacing?: number
    hooks?: `0x${string}`
  }): SwapConfig => {
    // Use case-insensitive comparison to determine token ordering
    const zeroForOne = tokenIn.toLowerCase() < tokenOut.toLowerCase()

    return {
      poolKey: {
        currency0: zeroForOne ? tokenIn : tokenOut,
        currency1: zeroForOne ? tokenOut : tokenIn,
        fee,
        tickSpacing,
        hooks,
      },
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

    // Convenience accessors for balances
    tokenBalance: balances.data?.token,
    wethBalance: balances.data?.weth,

    // Helpers
    buildSwapConfig,
  }
}
