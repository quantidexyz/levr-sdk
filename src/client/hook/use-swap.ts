'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { erc20Abi, formatUnits, maxUint160, maxUint256, parseUnits } from 'viem'
import type { TransactionReceipt } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { Permit2 } from '../../abis'
import { UNISWAP_V4_PERMIT2, UNISWAP_V4_UNIVERSAL_ROUTER, WETH } from '../../constants'
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
  const address = wallet.data?.account?.address

  const universalRouterAddress = UNISWAP_V4_UNIVERSAL_ROUTER(chainId)
  const permit2Address = UNISWAP_V4_PERMIT2(chainId)
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
      if (!publicClient || !chainId || !quoteParams) {
        return { amountOut: 0n, amountOutFormatted: '0', gasEstimate: 0n, hookFees: undefined }
      }

      if (!quoteParams.amountIn || parseFloat(quoteParams.amountIn) <= 0) {
        return { amountOut: 0n, amountOutFormatted: '0', gasEstimate: 0n, hookFees: undefined }
      }

      const amountInBigInt = parseUnits(quoteParams.amountIn, quoteParams.amountInDecimals)

      const result = await quoteV4({
        publicClient,
        chainId,
        poolKey: quoteParams.poolKey,
        zeroForOne: quoteParams.zeroForOne,
        amountIn: amountInBigInt,
        hookData: quoteParams.hookData,
      })

      return {
        ...result,
        amountOutFormatted: formatUnits(result.amountOut, quoteParams.amountOutDecimals),
      }
    },
    enabled:
      enabled &&
      !!publicClient &&
      !!chainId &&
      !!quoteParams &&
      !!quoteParams.amountIn &&
      parseFloat(quoteParams.amountIn) > 0,
    refetchInterval: 10_000, // Refetch every 10 seconds
    retry: 1,
  })

  // Query: ERC20 allowance for Permit2
  const erc20Allowance = useQuery({
    queryKey: ['swap', 'erc20-allowance', address, chainId, tokenAddress],
    queryFn: async () => {
      if (!tokenAddress || !permit2Address || !address) return 0n

      const result = await publicClient!.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, permit2Address],
      })

      return result
    },
    enabled: enabled && !!publicClient && !!address && !!permit2Address && !!tokenAddress,
  })

  // Query: Permit2 allowance for Universal Router
  const permit2Allowance = useQuery({
    queryKey: ['swap', 'permit2-allowance', address, chainId, tokenAddress],
    queryFn: async () => {
      if (!tokenAddress || !permit2Address || !universalRouterAddress || !address) {
        return { amount: 0n, expiration: 0n }
      }

      const result = await publicClient!.readContract({
        address: permit2Address,
        abi: Permit2,
        functionName: 'allowance',
        args: [address, tokenAddress, universalRouterAddress],
      })

      return {
        amount: result[0],
        expiration: result[1],
      }
    },
    enabled:
      enabled &&
      !!publicClient &&
      !!address &&
      !!permit2Address &&
      !!universalRouterAddress &&
      !!tokenAddress,
  })

  // Mutation: Approve ERC20 to Permit2
  const approveERC20 = useMutation({
    mutationFn: async (tokenAddress: `0x${string}`) => {
      if (!wallet.data) throw new Error('Wallet is not connected')
      if (!publicClient) throw new Error('Public client is not connected')
      if (!permit2Address) throw new Error('Permit2 address not found')

      const hash = await wallet.data.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [permit2Address, maxUint256],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'reverted') {
        throw new Error('ERC20 approve transaction reverted')
      }

      return receipt
    },
    onSuccess: (receipt) => {
      erc20Allowance.refetch()
      onApproveERC20Success?.(receipt)
    },
    onError: onApproveERC20Error,
  })

  // Mutation: Approve Permit2 to Universal Router
  const approvePermit2 = useMutation({
    mutationFn: async ({
      tokenAddress,
      expirationSeconds = 2_592_000, // 30 days default
    }: {
      tokenAddress: `0x${string}`
      expirationSeconds?: number
    }) => {
      if (!wallet.data) throw new Error('Wallet is not connected')
      if (!publicClient) throw new Error('Public client is not connected')
      if (!permit2Address) throw new Error('Permit2 address not found')
      if (!universalRouterAddress) throw new Error('Universal Router address not found')

      const deadline = Math.floor(Date.now() / 1000) + expirationSeconds

      const hash = await wallet.data.writeContract({
        address: permit2Address,
        abi: Permit2,
        functionName: 'approve',
        args: [tokenAddress, universalRouterAddress, maxUint160, deadline],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'reverted') {
        throw new Error('Permit2 approve transaction reverted')
      }

      return receipt
    },
    onSuccess: (receipt) => {
      permit2Allowance.refetch()
      onApprovePermit2Success?.(receipt)
    },
    onError: onApprovePermit2Error,
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
      })

      return receipt
    },
    onSuccess: (receipt) => {
      balances.refetch()
      erc20Allowance.refetch()
      permit2Allowance.refetch()
      onSwapSuccess?.(receipt)
    },
    onError: onSwapError,
  })

  // Helper: Check if ERC20 approval is needed
  const needsERC20Approval = (tokenAddress: `0x${string}`, amount: string): boolean => {
    if (!erc20Allowance.data) return false
    try {
      return erc20Allowance.data < BigInt(amount)
    } catch {
      return false
    }
  }

  // Helper: Check if Permit2 approval is needed
  const needsPermit2Approval = (tokenAddress: `0x${string}`, amount: string): boolean => {
    if (!permit2Allowance.data) return false
    try {
      const now = Math.floor(Date.now() / 1000)
      const isExpired = Number(permit2Allowance.data.expiration) < now
      const isInsufficient = permit2Allowance.data.amount < BigInt(amount)
      return isExpired || isInsufficient
    } catch {
      return false
    }
  }

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

  // Helper: Get swap quote
  const getQuote = async ({
    poolKey,
    zeroForOne,
    amountIn,
    hookData,
  }: {
    poolKey: PoolKey
    zeroForOne: boolean
    amountIn: bigint
    hookData?: `0x${string}`
  }) => {
    if (!publicClient || !chainId) {
      throw new Error('Client not initialized')
    }

    return await quoteV4({
      publicClient,
      chainId,
      poolKey,
      zeroForOne,
      amountIn,
      hookData,
    })
  }

  return {
    // Mutations
    approveERC20,
    approvePermit2,
    swap,

    // Queries
    erc20Allowance,
    permit2Allowance,
    balances,
    quote,

    // Convenience accessors for balances
    tokenBalance: balances.data?.token,
    wethBalance: balances.data?.weth,

    // Helpers
    needsERC20Approval,
    needsPermit2Approval,
    buildSwapConfig,
    getQuote,
  }
}
