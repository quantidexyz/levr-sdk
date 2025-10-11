'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address, TransactionReceipt } from 'viem'
import { parseUnits } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import type {
  ExecuteProposalConfig,
  FormattedProposalDetails,
  ProposeBoostConfig,
  ProposeTransferConfig,
} from '../../governance'
import { Governance } from '../../governance'
import type { Project } from '../../project'
import { useLevrContext } from '../levr-provider'
import { queryKeys } from '../query-keys'

export type UseGovernanceQueriesParams = {
  clankerToken: Address | null
  projectData: Project | null | undefined
  enabled?: boolean
}

/**
 * Internal: Creates global governance queries with all logic
 * Used by LevrProvider
 */
export function useGovernanceQueries({
  clankerToken,
  projectData,
  enabled: e = true,
}: UseGovernanceQueriesParams) {
  const wallet = useWalletClient()
  const publicClient = usePublicClient()

  // Create Governance instance
  const governance = useMemo(() => {
    if (!wallet.data || !publicClient || !projectData || !clankerToken) {
      return null
    }
    return new Governance({
      wallet: wallet.data,
      publicClient,
      governorAddress: projectData.governor,
      tokenDecimals: projectData.token.decimals,
      clankerToken,
    })
  }, [wallet.data, publicClient, projectData, clankerToken])

  const currentCycleId = useQuery({
    queryKey: queryKeys.governance.currentCycleId(projectData?.governor!),
    queryFn: async (): Promise<bigint> => {
      if (!governance) throw new Error('Governance not initialized')
      return await governance.getCurrentCycleId()
    },
    enabled: e && !!governance && !!projectData,
    retry: 1,
  })

  const addresses = useQuery({
    queryKey: queryKeys.governance.addresses(projectData?.governor!),
    queryFn: async () => {
      if (!governance) throw new Error('Governance not initialized')

      const [treasury, factory, stakedToken] = await Promise.all([
        governance.getTreasury(),
        governance.getFactory(),
        governance.getStakedToken(),
      ])

      return { treasury, factory, stakedToken }
    },
    enabled: e && !!governance && !!projectData,
    retry: 1,
  })

  const airdropStatus = useQuery({
    queryKey: queryKeys.governance.airdropStatus(projectData?.governor!, clankerToken!),
    queryFn: async () => {
      if (!governance) throw new Error('Governance not initialized')
      return await governance.getAirdropStatus()
    },
    enabled: e && !!governance && !!projectData && !!clankerToken,
    retry: 1,
    refetchInterval: 30000,
  })

  return {
    currentCycleId,
    addresses,
    airdropStatus,
  }
}

// ========================================
// PUBLIC HOOK (exported from index.ts)
// ========================================

export type UseGovernanceParams = {
  governorAddress: `0x${string}`
  clankerToken: `0x${string}`
  tokenDecimals?: number
  enabled?: boolean

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
 * Global queries from LevrProvider, dynamic queries created per-component
 */
export function useGovernance({
  governorAddress,
  clankerToken: _clankerToken,
  tokenDecimals = 18,
  enabled = true,
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
}: UseGovernanceParams) {
  const { governance: governanceQueries, refetch, clankerToken } = useLevrContext()
  const wallet = useWalletClient()
  const publicClient = usePublicClient()

  // Create governance instance for mutations
  const governance =
    wallet.data && publicClient && clankerToken
      ? new Governance({
          wallet: wallet.data,
          publicClient,
          governorAddress,
          tokenDecimals,
          clankerToken,
        })
      : null

  // Global queries from context
  const currentCycleId = governanceQueries.currentCycleId
  const addresses = governanceQueries.addresses
  const airdropStatus = governanceQueries.airdropStatus

  // Dynamic queries (component-specific)
  const proposal = useQuery({
    queryKey: queryKeys.governance.proposal(governorAddress, proposalId?.toString()),
    queryFn: async (): Promise<FormattedProposalDetails> => {
      if (!governance || !proposalId)
        throw new Error('Governance not initialized or no proposal ID')
      return await governance.getProposal(proposalId)
    },
    enabled: enabled && !!governance && proposalId !== undefined,
    retry: 1,
  })

  const proposalsForCycle = useQuery({
    queryKey: queryKeys.governance.proposalsForCycle(governorAddress, cycleId?.toString()),
    queryFn: async (): Promise<readonly bigint[]> => {
      if (!governance || cycleId === undefined)
        throw new Error('Governance not initialized or no cycle ID')
      return await governance.getProposalsForCycle(cycleId)
    },
    enabled: enabled && !!governance && cycleId !== undefined,
    retry: 1,
  })

  const winner = useQuery({
    queryKey: queryKeys.governance.winner(governorAddress, cycleId?.toString()),
    queryFn: async (): Promise<bigint> => {
      if (!governance || cycleId === undefined)
        throw new Error('Governance not initialized or no cycle ID')
      return await governance.getWinner(cycleId)
    },
    enabled: enabled && !!governance && cycleId !== undefined,
    retry: 1,
  })

  const voteReceipt = useQuery({
    queryKey: [
      'governance',
      'voteReceipt',
      governorAddress,
      proposalId?.toString(),
      userAddress || wallet.data?.account.address,
    ],
    queryFn: async () => {
      if (!governance || !proposalId)
        throw new Error('Governance not initialized or no proposal ID')
      return await governance.getVoteReceipt(proposalId, userAddress)
    },
    enabled: enabled && !!governance && proposalId !== undefined,
    retry: 1,
  })

  const votingPowerSnapshot = useQuery({
    queryKey: [
      'governance',
      'votingPowerSnapshot',
      governorAddress,
      proposalId?.toString(),
      userAddress || wallet.data?.account.address,
    ],
    queryFn: async (): Promise<bigint> => {
      if (!governance || !proposalId)
        throw new Error('Governance not initialized or no proposal ID')
      return await governance.getVotingPowerSnapshot(proposalId, userAddress)
    },
    enabled: enabled && !!governance && proposalId !== undefined,
    retry: 1,
  })

  const meetsQuorum = useQuery({
    queryKey: ['governance', 'meetsQuorum', governorAddress, proposalId?.toString()],
    queryFn: async (): Promise<boolean> => {
      if (!governance || !proposalId)
        throw new Error('Governance not initialized or no proposal ID')
      return await governance.meetsQuorum(proposalId)
    },
    enabled: enabled && !!governance && proposalId !== undefined,
    retry: 1,
  })

  const meetsApproval = useQuery({
    queryKey: ['governance', 'meetsApproval', governorAddress, proposalId?.toString()],
    queryFn: async (): Promise<boolean> => {
      if (!governance || !proposalId)
        throw new Error('Governance not initialized or no proposal ID')
      return await governance.meetsApproval(proposalId)
    },
    enabled: enabled && !!governance && proposalId !== undefined,
    retry: 1,
  })

  const proposalState = useQuery({
    queryKey: ['governance', 'proposalState', governorAddress, proposalId?.toString()],
    queryFn: async (): Promise<number> => {
      if (!governance || !proposalId)
        throw new Error('Governance not initialized or no proposal ID')
      return await governance.getProposalState(proposalId)
    },
    enabled: enabled && !!governance && proposalId !== undefined,
    retry: 1,
  })

  const activeProposalCount = useQuery({
    queryKey: ['governance', 'activeProposalCount', governorAddress],
    queryFn: async () => {
      if (!governance) throw new Error('Governance not initialized')
      const [boostCount, transferCount] = await Promise.all([
        governance.getActiveProposalCount(0),
        governance.getActiveProposalCount(1),
      ])
      return { boost: boostCount, transfer: transferCount }
    },
    enabled: enabled && !!governance,
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
      await refetch.afterGovernance()
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
      await refetch.afterGovernance()
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
      await refetch.afterGovernance()
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
      await refetch.afterGovernance()
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
      await refetch.afterGovernance()
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
      await refetch.afterGovernance()
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
      await refetch.afterGovernance()
    },
  })

  // Helpers
  const buildProposeTransferConfig = ({
    recipient,
    amount,
    amountDecimals = tokenDecimals,
    description,
  }: {
    recipient: `0x${string}`
    amount: number | string
    amountDecimals?: number
    description: string
  }): ProposeTransferConfig => ({
    recipient,
    amount: amount.toString(),
    amountDecimals,
    description,
  })

  const buildProposeBoostConfig = ({
    amount,
    amountDecimals = tokenDecimals,
  }: {
    amount: number | string
    amountDecimals?: number
  }): ProposeBoostConfig => ({
    amount: amount.toString(),
    amountDecimals,
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

    // Queries
    proposal,
    currentCycleId,
    addresses,
    airdropStatus,
    proposalsForCycle,
    winner,
    voteReceipt,
    votingPowerSnapshot,
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
    userVotingPower: votingPowerSnapshot.data,

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

    // Convenience accessors - airdrop
    airdropStatusData: airdropStatus.data,
    availableAirdropAmount: airdropStatus.data?.availableAmount,
    airdropAllocatedAmount: airdropStatus.data?.allocatedAmount,
    isAirdropAvailable: airdropStatus.data?.isAvailable ?? false,
    airdropError: airdropStatus.data?.error,

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
      airdropStatus.isLoading ||
      proposalsForCycle.isLoading ||
      winner.isLoading ||
      voteReceipt.isLoading ||
      votingPowerSnapshot.isLoading ||
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
