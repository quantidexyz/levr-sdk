'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { TransactionReceipt } from 'viem'
import { parseUnits } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import type {
  ExecuteProposalConfig,
  ProposeBoostConfig,
  ProposeTransferConfig,
} from '../../governance'
import { Governance } from '../../governance'
import { useLevrContext } from '../levr-provider'

// ========================================
// PUBLIC HOOK (exported from index.ts)
// ========================================

export type UseGovernanceParams = {
  // Query params (optional - for reactive data)
  proposalId?: number | bigint
  cycleId?: number | bigint
  userAddress?: `0x${string}`

  // Success/error callbacks
  onProposeTransferSuccess?: (receipt: TransactionReceipt, proposalId: bigint) => void
  onProposeTransferError?: (error: unknown) => void

  onProposeBoostSuccess?: (receipt: TransactionReceipt, proposalId: bigint) => void
  onProposeBoostError?: (error: unknown) => void

  onVoteSuccess?: (receipt: TransactionReceipt) => void
  onVoteError?: (error: unknown) => void

  onExecuteProposalSuccess?: (receipt: TransactionReceipt) => void
  onExecuteProposalError?: (error: unknown) => void

  onClaimAirdropSuccess?: (receipt: TransactionReceipt) => void
  onClaimAirdropError?: (error: unknown) => void
}

/**
 * Hook for managing governance operations
 * All data comes from context (user, project)
 */
export function useGovernance({
  proposalId,
  cycleId,
  userAddress,
  onProposeTransferSuccess,
  onProposeTransferError,
  onProposeBoostSuccess,
  onProposeBoostError,
  onVoteSuccess,
  onVoteError,
  onExecuteProposalSuccess,
  onExecuteProposalError,
  onClaimAirdropSuccess,
  onClaimAirdropError,
}: UseGovernanceParams = {}) {
  const { project, refetch } = useLevrContext()
  const wallet = useWalletClient()
  const publicClient = usePublicClient()

  // Create Governance instance (all params from project context)
  const governance = useMemo(() => {
    if (!wallet.data || !publicClient || !project.data) {
      return null
    }
    return new Governance({
      wallet: wallet.data,
      publicClient,
      project: project.data,
    })
  }, [wallet.data, publicClient, project.data])

  const voteReceipt = useQuery({
    queryKey: [
      'governance',
      'voteReceipt',
      project.data?.governor,
      proposalId?.toString(),
      userAddress || wallet.data?.account.address,
    ],
    queryFn: async () => {
      return await governance!.getVoteReceipt(proposalId!, userAddress!)
    },
    enabled: !!governance && proposalId !== undefined,
    retry: 1,
  })

  const activeProposalCount = useQuery({
    queryKey: ['governance', 'activeProposalCount', project.data?.governor],
    queryFn: async () => {
      const [boostCount, transferCount] = await Promise.all([
        governance!.getActiveProposalCount(0),
        governance!.getActiveProposalCount(1),
      ])
      return { boost: boostCount, transfer: transferCount }
    },
    enabled: !!governance,
    retry: 1,
  })

  // Mutations
  const vote = useMutation({
    mutationFn: async ({
      proposalId,
      support,
    }: {
      proposalId: number | bigint
      support: boolean
    }) => {
      if (!governance) throw new Error('Governance not initialized')
      if (!wallet.data) throw new Error('Wallet is not connected')
      return await governance.vote(proposalId, support)
    },
    onSuccess: async (receipt) => {
      await refetch.afterVote()
      onVoteSuccess?.(receipt)
    },
    onError: onVoteError,
  })

  const proposeTransfer = useMutation({
    mutationFn: async (config: ProposeTransferConfig) => {
      if (!governance) throw new Error('Governance not initialized')
      if (!wallet.data) throw new Error('Wallet is not connected')

      const amountBigInt = parseUnits(config.amount, config.amountDecimals)

      const result = await governance.proposeTransfer(
        config.recipient,
        amountBigInt,
        config.description
      )

      return result
    },
    onSuccess: async (result) => {
      await refetch.afterProposal()
      onProposeTransferSuccess?.(result.receipt, result.proposalId)
    },
    onError: onProposeTransferError,
  })

  const proposeBoost = useMutation({
    mutationFn: async (config: ProposeBoostConfig) => {
      if (!governance) throw new Error('Governance not initialized')
      if (!wallet.data) throw new Error('Wallet is not connected')

      const amountBigInt = parseUnits(config.amount, config.amountDecimals)

      const result = await governance.proposeBoost(amountBigInt)

      return result
    },
    onSuccess: async (result) => {
      await refetch.afterProposal()
      onProposeBoostSuccess?.(result.receipt, result.proposalId)
    },
    onError: onProposeBoostError,
  })

  const executeProposal = useMutation({
    mutationFn: async (config: ExecuteProposalConfig) => {
      if (!governance) throw new Error('Governance not initialized')
      if (!wallet.data) throw new Error('Wallet is not connected')

      const receipt = await governance.executeProposal(config.proposalId)

      return receipt
    },
    onSuccess: async (receipt) => {
      await refetch.afterExecute()
      onExecuteProposalSuccess?.(receipt)
    },
    onError: onExecuteProposalError,
  })

  const claimAirdrop = useMutation({
    mutationFn: async () => {
      if (!governance) throw new Error('Governance not initialized')
      if (!wallet.data) throw new Error('Wallet is not connected')

      return await governance.claimAirdrop()
    },
    onSuccess: async (receipt) => {
      await refetch.afterAirdrop()
      onClaimAirdropSuccess?.(receipt)
    },
    onError: onClaimAirdropError,
  })

  // Helpers
  const buildProposeTransferConfig = ({
    recipient,
    amount,
    amountDecimals,
    description,
  }: {
    recipient: `0x${string}`
    amount: number | string
    amountDecimals?: number
    description: string
  }): ProposeTransferConfig => ({
    recipient,
    amount: amount.toString(),
    amountDecimals: amountDecimals ?? project.data?.token.decimals ?? 18,
    description,
  })

  const buildProposeBoostConfig = ({
    amount,
    amountDecimals,
  }: {
    amount: number | string
    amountDecimals?: number
  }): ProposeBoostConfig => ({
    amount: amount.toString(),
    amountDecimals: amountDecimals ?? project.data?.token.decimals ?? 18,
  })

  const buildExecuteProposalConfig = ({
    proposalId,
  }: {
    proposalId: number | bigint
  }): ExecuteProposalConfig => ({
    proposalId,
  })

  return {
    // Mutations
    proposeTransfer,
    proposeBoost,
    vote,
    executeProposal,
    claimAirdrop,

    // Dynamic queries (using proposals.ts functions)
    voteReceipt,
    activeProposalCount,

    // Helpers
    buildProposeTransferConfig,
    buildProposeBoostConfig,
    buildExecuteProposalConfig,

    // Loading states
    isReady: !!governance && !!wallet.data,
    isLoading: voteReceipt.isLoading || activeProposalCount.isLoading,
    isProposing: proposeTransfer.isPending || proposeBoost.isPending,
    isVoting: vote.isPending,
    isExecuting: executeProposal.isPending,
    isClaiming: claimAirdrop.isPending,
  }
}
