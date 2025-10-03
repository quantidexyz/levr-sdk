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
    onSuccess: (receipt) => {
      // Auto-refetch allowance after successful approval
      allowance.refetch()
      onApproveSuccess?.(receipt)
    },
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
    onSuccess: (receipt) => {
      // Auto-refetch after successful stake
      allowance.refetch()
      poolData.refetch()
      userData.refetch()
      onStakeSuccess?.(receipt)
    },
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
    onSuccess: (receipt) => {
      // Auto-refetch after successful unstake
      poolData.refetch()
      userData.refetch()
      onUnstakeSuccess?.(receipt)
    },
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
    onSuccess: (receipt) => {
      // Auto-refetch after successful claim
      poolData.refetch()
      userData.refetch()
      onClaimSuccess?.(receipt)
    },
    onError: onClaimError,
  })

  // Query: Allowance
  const allowance = useQuery({
    queryKey: ['staking', 'allowance', project.data?.token.address, project.data?.staking, address],
    queryFn: async () => {
      if (!publicClient || !project.data || !address) return { raw: 0n, formatted: '0' }

      const result = await publicClient.readContract({
        address: project.data.token.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, project.data.staking],
      })

      const data = {
        raw: result,
        formatted: formatUnits(result, project.data.token.decimals),
      }

      return data
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

  // Helper to check if approval is needed for an amount
  const needsApproval = (amount: string | number): boolean => {
    if (!project.data || allowance.data === undefined) return false
    try {
      return Number(allowance.data.formatted) < Number(amount)
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
