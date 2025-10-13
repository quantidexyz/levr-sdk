'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { TransactionReceipt } from 'viem'
import { parseUnits } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import type {
  ExecuteProposalConfig,
  FormattedProposalDetails,
  ProposeBoostConfig,
  ProposeTransferConfig,
} from '../../governance'
import { Governance } from '../../governance'
import { useLevrContext } from '../levr-provider'
import { queryKeys } from '../query-keys'

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
  const { user, project, refetch } = useLevrContext()
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
      governorAddress: project.data.governor,
      tokenDecimals: project.data.token.decimals,
      clankerToken: project.data.token.address,
      pricing: project.data.pricing,
    })
  }, [wallet.data, publicClient, project.data])

  // All global governance data comes from project (no separate queries)
  const currentCycleId = useMemo(
    () => ({
      data: project.data?.currentCycleId,
      isLoading: project.isLoading,
      error: project.error,
    }),
    [project]
  )

  const addresses = useMemo(
    () => ({
      data: project.data
        ? {
            treasury: project.data.treasury,
            factory: project.data.factory,
            stakedToken: project.data.stakedToken,
          }
        : undefined,
      isLoading: project.isLoading,
      error: project.error,
    }),
    [project]
  )

  // Dynamic queries (component-specific)
  const proposal = useQuery({
    queryKey: queryKeys.governance.proposal(project.data?.governor, proposalId?.toString()),
    queryFn: async (): Promise<FormattedProposalDetails> => {
      return await governance!.getProposal(proposalId!)
    },
    enabled: !!governance && proposalId !== undefined,
    retry: 1,
  })

  const proposalsForCycle = useQuery({
    queryKey: queryKeys.governance.proposalsForCycle(project.data?.governor, cycleId?.toString()),
    queryFn: async (): Promise<readonly bigint[]> => {
      return await governance!.getProposalsForCycle(cycleId!)
    },
    enabled: !!governance && cycleId !== undefined,
    retry: 1,
  })

  const winner = useQuery({
    queryKey: queryKeys.governance.winner(project.data?.governor, cycleId?.toString()),
    queryFn: async (): Promise<bigint> => {
      return await governance!.getWinner(cycleId!)
    },
    enabled: !!governance && cycleId !== undefined,
    retry: 1,
  })

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

  const meetsQuorum = useQuery({
    queryKey: ['governance', 'meetsQuorum', project.data?.governor, proposalId?.toString()],
    queryFn: async (): Promise<boolean> => {
      return await governance!.meetsQuorum(proposalId!)
    },
    enabled: !!governance && proposalId !== undefined,
    retry: 1,
  })

  const meetsApproval = useQuery({
    queryKey: ['governance', 'meetsApproval', project.data?.governor, proposalId?.toString()],
    queryFn: async (): Promise<boolean> => {
      return await governance!.meetsApproval(proposalId!)
    },
    enabled: !!governance && proposalId !== undefined,
    retry: 1,
  })

  const proposalState = useQuery({
    queryKey: ['governance', 'proposalState', project.data?.governor, proposalId?.toString()],
    queryFn: async (): Promise<number> => {
      return await governance!.getProposalState(proposalId!)
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

  const proposeAndExecuteTransfer = useMutation({
    mutationFn: async (config: ProposeTransferConfig) => {
      if (!governance) throw new Error('Governance not initialized')

      const amountBigInt = parseUnits(config.amount, config.amountDecimals)

      const result = await governance.proposeAndExecuteTransfer(
        config.recipient,
        amountBigInt,
        config.description
      )

      return result
    },
    onSuccess: async () => {
      await refetch.afterExecute()
    },
  })

  const proposeAndExecuteBoost = useMutation({
    mutationFn: async (config: ProposeBoostConfig) => {
      if (!governance) throw new Error('Governance not initialized')

      const amountBigInt = parseUnits(config.amount, config.amountDecimals)

      const result = await governance.proposeAndExecuteBoost(amountBigInt)

      return result
    },
    onSuccess: async () => {
      await refetch.afterExecute()
    },
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
    // Core mutations
    proposeTransfer,
    proposeBoost,
    vote,
    executeProposal,
    claimAirdrop,

    // Convenience mutations
    proposeAndExecuteTransfer,
    proposeAndExecuteBoost,

    // Queries from context
    user,
    project,
    currentCycleId,
    addresses,

    // Dynamic queries
    proposal,
    proposalsForCycle,
    winner,
    voteReceipt,
    meetsQuorum,
    meetsApproval,
    proposalState,
    activeProposalCount,

    // Convenience accessors - proposal data
    proposalData: proposal.data,
    proposalDescription: proposal.data?.description,

    // Convenience accessors - cycle data
    currentCycleIdValue: currentCycleId.data,
    cycleProposals: proposalsForCycle.data,
    winnerProposalId: winner.data,

    // Convenience accessors - vote data
    hasVoted: voteReceipt.data?.hasVoted ?? false,
    voteSupport: voteReceipt.data?.support,
    votesUsed: voteReceipt.data?.votes,
    userVotingPower: user.data?.governance.votingPower,

    // Convenience accessors - proposal status
    proposalMeetsQuorum: meetsQuorum.data ?? false,
    proposalMeetsApproval: meetsApproval.data ?? false,
    proposalStateValue: proposalState.data,

    // Convenience accessors - active counts
    activeBoostProposals: activeProposalCount.data?.boost,
    activeTransferProposals: activeProposalCount.data?.transfer,

    // Convenience accessors - addresses
    treasuryAddress: addresses.data?.treasury,
    factoryAddress: addresses.data?.factory,
    stakedTokenAddress: addresses.data?.stakedToken,

    // Convenience accessors - airdrop (now from user.governance)
    airdropStatusData: user.data?.governance.airdrop,
    availableAirdropAmount: user.data?.governance.airdrop?.availableAmount,
    airdropAllocatedAmount: user.data?.governance.airdrop?.allocatedAmount,
    isAirdropAvailable: user.data?.governance.airdrop?.isAvailable ?? false,
    airdropError: user.data?.governance.airdrop?.error,

    // Helpers
    buildProposeTransferConfig,
    buildProposeBoostConfig,
    buildExecuteProposalConfig,

    // Status flags
    isReady: !!governance && !!wallet.data,
    isLoading:
      proposal.isLoading ||
      currentCycleId.isLoading ||
      addresses.isLoading ||
      user.isLoading ||
      proposalsForCycle.isLoading ||
      winner.isLoading ||
      voteReceipt.isLoading ||
      meetsQuorum.isLoading ||
      meetsApproval.isLoading ||
      proposalState.isLoading ||
      activeProposalCount.isLoading,
    isProposing: proposeTransfer.isPending || proposeBoost.isPending,
    isVoting: vote.isPending,
    isExecuting: executeProposal.isPending,
    isClaiming: claimAirdrop.isPending,
  }
}
