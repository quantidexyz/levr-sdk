'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk'
import { Actions, V4Planner } from '@uniswap/v4-sdk'
import { erc20Abi, maxUint160, maxUint256, parseUnits } from 'viem'
import type { TransactionReceipt } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { Permit2 } from '../../abis'
import { PERMIT2_ADDRESS, UNISWAP_V4_UNIVERSAL_ROUTER, WETH } from '../../constants'
import { useBalance } from './use-balance'

export type PoolKey = {
  currency0: `0x${string}`
  currency1: `0x${string}`
  fee: number
  tickSpacing: number
  hooks: `0x${string}`
}

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

  onApproveERC20Success?: (receipt: TransactionReceipt) => void
  onApproveERC20Error?: (error: unknown) => void

  onApprovePermit2Success?: (receipt: TransactionReceipt) => void
  onApprovePermit2Error?: (error: unknown) => void

  onSwapSuccess?: (receipt: TransactionReceipt) => void
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
  const permit2Address = PERMIT2_ADDRESS(chainId)
  const wethAddress = WETH(chainId)?.address

  // Query: Token balances (token + WETH)
  const balances = useBalance({
    tokens: [
      tokenAddress && { address: tokenAddress, decimals: tokenDecimals, key: 'token' },
      wethAddress && { address: wethAddress, decimals: 18, key: 'weth' },
    ].filter(Boolean) as any,
    enabled: enabled && !!(tokenAddress || wethAddress),
  })

  // Query: ERC20 allowance for Permit2
  const erc20Allowance = useQuery({
    queryKey: ['swap', 'erc20-allowance', address, chainId],
    queryFn: async ({ queryKey }) => {
      const [, , , tokenAddress] = queryKey as [string, string, `0x${string}`, `0x${string}`]
      if (!tokenAddress || !permit2Address) return 0n

      const result = await publicClient!.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address!, permit2Address],
      })

      return result
    },
    enabled: enabled && !!publicClient && !!address && !!permit2Address,
  })

  // Query: Permit2 allowance for Universal Router
  const permit2Allowance = useQuery({
    queryKey: ['swap', 'permit2-allowance', address, chainId],
    queryFn: async ({ queryKey }) => {
      const [, , , tokenAddress] = queryKey as [string, string, `0x${string}`, `0x${string}`]
      if (!tokenAddress || !permit2Address || !universalRouterAddress) {
        return { amount: 0n, expiration: 0n }
      }

      const result = await publicClient!.readContract({
        address: permit2Address,
        abi: Permit2,
        functionName: 'allowance',
        args: [address!, tokenAddress, universalRouterAddress],
      })

      return {
        amount: result[0],
        expiration: result[1],
      }
    },
    enabled: enabled && !!publicClient && !!address && !!permit2Address && !!universalRouterAddress,
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
      if (!universalRouterAddress) throw new Error('Universal Router address not found')

      const v4Planner = new V4Planner()
      const routePlanner = new RoutePlanner()

      // Add swap actions
      v4Planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [config])

      // SETTLE_ALL and TAKE_ALL must respect swap direction
      // zeroForOne = true: swap currency0 -> currency1 (settle 0, take 1)
      // zeroForOne = false: swap currency1 -> currency0 (settle 1, take 0)
      if (config.zeroForOne) {
        v4Planner.addAction(Actions.SETTLE_ALL, [config.poolKey.currency0, config.amountIn])
        v4Planner.addAction(Actions.TAKE_ALL, [config.poolKey.currency1, config.amountOutMinimum])
      } else {
        v4Planner.addAction(Actions.SETTLE_ALL, [config.poolKey.currency1, config.amountIn])
        v4Planner.addAction(Actions.TAKE_ALL, [config.poolKey.currency0, config.amountOutMinimum])
      }

      const encodedActions = v4Planner.finalize()

      routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.actions, v4Planner.params])

      // Set deadline (1 hour from now)
      const deadline = Math.floor(Date.now() / 1000) + 3600

      // Check if we're swapping native ETH (input currency must be WETH)
      const weth = WETH(chainId)
      const inputCurrency = config.zeroForOne ? config.poolKey.currency0 : config.poolKey.currency1
      const isNativeETH =
        weth?.address && inputCurrency.toLowerCase() === weth.address.toLowerCase()

      const txOptions: any = {
        value: isNativeETH ? BigInt(config.amountIn) : 0n,
      }

      const hash = await wallet.data.writeContract({
        address: universalRouterAddress,
        abi: [
          {
            inputs: [
              { internalType: 'bytes', name: 'commands', type: 'bytes' },
              { internalType: 'bytes[]', name: 'inputs', type: 'bytes[]' },
              { internalType: 'uint256', name: 'deadline', type: 'uint256' },
            ],
            name: 'execute',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
          },
        ],
        functionName: 'execute',
        args: [routePlanner.commands, [encodedActions], BigInt(deadline)],
        ...txOptions,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'reverted') {
        throw new Error('Swap transaction reverted')
      }

      return receipt
    },
    onSuccess: onSwapSuccess,
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
    approveERC20,
    approvePermit2,
    swap,

    // Queries
    erc20Allowance,
    permit2Allowance,
    balances,

    // Convenience accessors for balances
    tokenBalance: balances.data?.token,
    wethBalance: balances.data?.weth,

    // Helpers
    needsERC20Approval,
    needsPermit2Approval,
    buildSwapConfig,
  }
}
