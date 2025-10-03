'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { erc20Abi, formatUnits, parseUnits } from 'viem'
import type { TransactionReceipt } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { LevrStaking_v1 } from '../../abis'
import { WETH } from '../../constants'
import { useProject } from './use-project'

export type UseStakeParams = {
  clankerToken?: `0x${string}`
  enabled?: boolean

  onApproveSuccess?: (receipt: TransactionReceipt) => void
  onApproveError?: (error: unknown) => void

  onStakeSuccess?: (receipt: TransactionReceipt) => void
  onStakeError?: (error: unknown) => void

  onUnstakeSuccess?: (receipt: TransactionReceipt) => void
  onUnstakeError?: (error: unknown) => void

  onClaimSuccess?: (receipt: TransactionReceipt) => void
  onClaimError?: (error: unknown) => void
}

export function useStake({
  clankerToken,
  enabled = true,

  onApproveSuccess,
  onApproveError,

  onStakeSuccess,
  onStakeError,

  onUnstakeSuccess,
  onUnstakeError,

  onClaimSuccess,
  onClaimError,
}: UseStakeParams) {
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id
  const address = wallet.data?.account?.address

  const project = useProject({ clankerToken })

  // Approve mutation
  const approve = useMutation({
    mutationFn: async (amount: number) => {
      if (!wallet.data) throw new Error('Wallet is not connected')
      if (!publicClient) throw new Error('Public client is not connected')
      if (!project.data) throw new Error('Project is not connected')

      const parsedAmount = parseUnits(amount.toString(), project.data.token.decimals)

      const hash = await wallet.data.writeContract({
        address: project.data.token.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [project.data.staking, parsedAmount],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'reverted') {
        throw new Error('Approve transaction reverted')
      }

      return receipt
    },
    onSuccess: onApproveSuccess,
    onError: onApproveError,
  })

  // Stake mutation
  const stake = useMutation({
    mutationFn: async (amount: number) => {
      if (!wallet.data) throw new Error('Wallet is not connected')
      if (!publicClient) throw new Error('Public client is not connected')
      if (!project.data) throw new Error('Project is not connected')

      const parsedAmount = parseUnits(amount.toString(), project.data.token.decimals)

      const hash = await wallet.data.writeContract({
        address: project.data.staking,
        abi: LevrStaking_v1,
        functionName: 'stake',
        args: [parsedAmount],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'reverted') {
        throw new Error('Stake transaction reverted')
      }

      return receipt
    },
    onSuccess: onStakeSuccess,
    onError: onStakeError,
  })

  // Unstake mutation
  const unstake = useMutation({
    mutationFn: async ({ amount, to }: { amount: number; to?: `0x${string}` }) => {
      if (!wallet.data) throw new Error('Wallet is not connected')
      if (!address) throw new Error('Address is not connected')
      if (!publicClient) throw new Error('Public client is not connected')
      if (!project.data) throw new Error('Project is not connected')

      const parsedAmount = parseUnits(amount.toString(), project.data.token.decimals)

      const hash = await wallet.data.writeContract({
        address: project.data.staking,
        abi: LevrStaking_v1,
        functionName: 'unstake',
        args: [parsedAmount, to ?? address],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'reverted') {
        throw new Error('Unstake transaction reverted')
      }

      return receipt
    },
    onSuccess: onUnstakeSuccess,
    onError: onUnstakeError,
  })

  // Claim mutation
  const claim = useMutation({
    mutationFn: async () => {
      const weth = WETH(chainId)
      if (!weth?.address) throw new Error('weth address is not found')
      if (!wallet.data) throw new Error('Wallet is not connected')
      if (!publicClient) throw new Error('Public client is not connected')
      if (!project.data) throw new Error('Project is not connected')
      if (!address) throw new Error('Address is not connected')

      const hash = await wallet.data.writeContract({
        address: project.data.staking,
        abi: LevrStaking_v1,
        functionName: 'claimRewards',
        args: [[project.data.token.address, weth.address], address],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'reverted') {
        throw new Error('Claim transaction reverted')
      }

      return receipt
    },
    onSuccess: onClaimSuccess,
    onError: onClaimError,
  })

  // Query: Allowance
  const allowance = useQuery({
    queryKey: ['staking', 'allowance', project.data?.token.address, project.data?.staking, address],
    queryFn: async () => {
      if (!publicClient || !project.data || !address) return 0n

      const result = await publicClient.readContract({
        address: project.data.token.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, project.data.staking],
      })

      return result
    },
    enabled: enabled && !!publicClient && !!project.data && !!address,
  })

  // Query: Pool-level data (multicall for efficiency)
  const poolData = useQuery({
    queryKey: ['staking', 'poolData', project.data?.staking, project.data?.token.address],
    queryFn: async () => {
      const results = await publicClient!.multicall({
        contracts: [
          {
            address: project.data!.staking,
            abi: LevrStaking_v1,
            functionName: 'totalStaked',
          },
          {
            address: project.data!.staking,
            abi: LevrStaking_v1,
            functionName: 'escrowBalance',
            args: [project.data!.token.address],
          },
          {
            address: project.data!.staking,
            abi: LevrStaking_v1,
            functionName: 'streamWindowSeconds',
          },
          {
            address: project.data!.staking,
            abi: LevrStaking_v1,
            functionName: 'streamStart',
          },
          {
            address: project.data!.staking,
            abi: LevrStaking_v1,
            functionName: 'streamEnd',
          },
          {
            address: project.data!.staking,
            abi: LevrStaking_v1,
            functionName: 'rewardRatePerSecond',
            args: [project.data!.token.address],
          },
        ],
      })

      const [totalStaked, escrowBalance, windowSeconds, streamStart, streamEnd, rewardRate] =
        results.map((r) => r.result!)

      return {
        totalStaked: {
          raw: totalStaked as bigint,
          formatted: formatUnits(totalStaked as bigint, project.data!.token.decimals),
        },
        escrowBalance: {
          raw: escrowBalance as bigint,
          formatted: formatUnits(escrowBalance as bigint, project.data!.token.decimals),
        },
        streamParams: {
          windowSeconds: windowSeconds as number,
          streamStart: streamStart as bigint,
          streamEnd: streamEnd as bigint,
          isActive: BigInt(Math.floor(Date.now() / 1000)) < (streamEnd as bigint),
        },
        rewardRatePerSecond: {
          raw: rewardRate as bigint,
          formatted: formatUnits(rewardRate as bigint, project.data!.token.decimals),
        },
      }
    },
    enabled: enabled && !!publicClient && !!project.data,
  })

  // Query: User-specific data (multicall for efficiency)
  const userData = useQuery({
    queryKey: ['staking', 'userData', project.data?.staking, address],
    queryFn: async () => {
      const results = await publicClient!.multicall({
        contracts: [
          {
            address: project.data!.staking,
            abi: LevrStaking_v1,
            functionName: 'stakedBalanceOf',
            args: [address!],
          },
          {
            address: project.data!.staking,
            abi: LevrStaking_v1,
            functionName: 'aprBps',
            args: [address!],
          },
        ],
      })

      const [stakedBalance, aprBps] = results.map((r) => r.result!)

      return {
        stakedBalance: {
          raw: stakedBalance as bigint,
          formatted: formatUnits(stakedBalance as bigint, project.data!.token.decimals),
        },
        aprBps: {
          raw: aprBps as bigint,
          percentage: Number(aprBps as bigint) / 100, // Convert bps to percentage (10000 bps = 100%)
        },
      }
    },
    enabled: enabled && !!publicClient && !!project.data && !!address,
  })

  // Helper to parse amount consistently
  const parseAmount = (amount: string | number): bigint => {
    if (!project.data) throw new Error('Project data not loaded')
    return parseUnits(amount.toString(), project.data.token.decimals)
  }

  // Helper to check if approval is needed for an amount
  const needsApproval = (amount: string | number): boolean => {
    if (!project.data || allowance.data === undefined) return false
    try {
      const parsedAmount = parseAmount(amount)
      return allowance.data < parsedAmount
    } catch {
      return false
    }
  }

  return {
    // Mutations
    approve,
    stake,
    unstake,
    claim,

    // Queries (grouped by multicall)
    allowance,
    poolData,
    userData,

    // Helpers
    parseAmount,
    needsApproval,

    // Convenience accessors for individual values
    stakedBalance: userData.data?.stakedBalance,
    totalStaked: poolData.data?.totalStaked,
    escrowBalance: poolData.data?.escrowBalance,
    streamParams: poolData.data?.streamParams,
    rewardRatePerSecond: poolData.data?.rewardRatePerSecond,
    aprBps: userData.data?.aprBps,

    // Loading states
    isLoadingPoolData: poolData.isLoading,
    isLoadingUserData: userData.isLoading,
  }
}
