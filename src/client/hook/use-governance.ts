'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { parseUnits } from 'viem'
import type { TransactionReceipt } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { Governance } from '../../governance'
import type {
  ExecuteProposalConfig,
  FormattedProposalDetails,
  ProposeBoostConfig,
  ProposeTransferConfig,
} from '../../governance'

export type UseGovernanceParams = {
  governorAddress: `0x${string}`
  clankerToken: `0x${string}`
  tokenDecimals?: number
  enabled?: boolean

  // Proposal query params (optional - for reactive proposal data)
  proposalId?: number | bigint

  // Success/error callbacks
  onProposeTransferSuccess?: (receipt: TransactionReceipt, proposalId: bigint) => void
  onProposeTransferError?: (error: unknown) => void

  onProposeBoostSuccess?: (receipt: TransactionReceipt, proposalId: bigint) => void
  onProposeBoostError?: (error: unknown) => void

  onExecuteProposalSuccess?: (receipt: TransactionReceipt) => void
  onExecuteProposalError?: (error: unknown) => void

  onClaimAirdropSuccess?: (receipt: TransactionReceipt) => void
  onClaimAirdropError?: (error: unknown) => void
}

/**
 * Hook for managing governance operations
 * @param params - Hook parameters
 * @returns Queries and mutations for governance operations
 */
export function useGovernance({
  governorAddress,
  clankerToken,
  tokenDecimals = 18,
  enabled = true,
  proposalId,
  onProposeTransferSuccess,
  onProposeTransferError,
  onProposeBoostSuccess,
  onProposeBoostError,
  onExecuteProposalSuccess,
  onExecuteProposalError,
  onClaimAirdropSuccess,
  onClaimAirdropError,
}: UseGovernanceParams) {
  const wallet = useWalletClient()
  const publicClient = usePublicClient()

  // Create governance instance
  const governance =
    wallet.data && publicClient
      ? new Governance({
          wallet: wallet.data,
          publicClient,
          governorAddress,
          tokenDecimals,
          clankerToken,
        })
      : null

  // Query: Get proposal details
  const proposal = useQuery({
    queryKey: ['governance', 'proposal', governorAddress, proposalId?.toString()],
    queryFn: async (): Promise<FormattedProposalDetails> => {
      if (!governance || !proposalId)
        throw new Error('Governance not initialized or no proposal ID')
      return await governance.getProposal(proposalId)
    },
    enabled: enabled && !!governance && proposalId !== undefined,
    retry: 1,
  })

  // Query: Check if user can submit proposals
  const canSubmit = useQuery({
    queryKey: ['governance', 'canSubmit', governorAddress, wallet.data?.account?.address],
    queryFn: async (): Promise<boolean> => {
      if (!governance) throw new Error('Governance not initialized')
      return await governance.canSubmit()
    },
    enabled: enabled && !!governance && !!wallet.data?.account?.address,
    retry: 1,
  })

  // Query: Get next proposal ID
  const nextProposalId = useQuery({
    queryKey: ['governance', 'nextProposalId', governorAddress],
    select: (data) => data, // Return the BigInt directly
    queryFn: async (): Promise<bigint> => {
      if (!governance) throw new Error('Governance not initialized')
      return await governance.getNextProposalId()
    },
    enabled: enabled && !!governance,
    retry: 1,
  })

  // Query: Get governance contract addresses
  const addresses = useQuery({
    queryKey: ['governance', 'addresses', governorAddress],
    queryFn: async () => {
      if (!governance) throw new Error('Governance not initialized')

      const [treasury, factory, stakedToken] = await Promise.all([
        governance.getTreasury(),
        governance.getFactory(),
        governance.getStakedToken(),
      ])

      return { treasury, factory, stakedToken }
    },
    enabled: enabled && !!governance,
    retry: 1,
  })

  // Query: Get airdrop status
  const airdropStatus = useQuery({
    queryKey: ['governance', 'airdropStatus', governorAddress, clankerToken],
    queryFn: async () => {
      if (!governance) throw new Error('Governance not initialized')
      return await governance.getAirdropStatus()
    },
    enabled: enabled && !!governance,
    retry: 1,
    refetchInterval: 30000, // Refetch every 30 seconds to check if lockup has passed
  })

  // Mutation: Propose transfer
  const proposeTransfer = useMutation({
    mutationFn: async (config: ProposeTransferConfig) => {
      if (!governance) throw new Error('Governance not initialized')
      if (!wallet.data) throw new Error('Wallet is not connected')

      const amountBigInt = parseUnits(config.amount, config.amountDecimals)

      const result = await governance.proposeTransfer(config.receiver, amountBigInt, config.reason)

      return result
    },
    onSuccess: (result) => {
      // Refetch related queries
      nextProposalId.refetch()
      onProposeTransferSuccess?.(result.receipt, result.proposalId)
    },
    onError: onProposeTransferError,
  })

  // Mutation: Propose boost
  const proposeBoost = useMutation({
    mutationFn: async (config: ProposeBoostConfig) => {
      if (!governance) throw new Error('Governance not initialized')
      if (!wallet.data) throw new Error('Wallet is not connected')

      const amountBigInt = parseUnits(config.amount, config.amountDecimals)

      const result = await governance.proposeBoost(amountBigInt)

      return result
    },
    onSuccess: (result) => {
      // Refetch related queries
      nextProposalId.refetch()
      onProposeBoostSuccess?.(result.receipt, result.proposalId)
    },
    onError: onProposeBoostError,
  })

  // Mutation: Execute proposal
  const executeProposal = useMutation({
    mutationFn: async (config: ExecuteProposalConfig) => {
      if (!governance) throw new Error('Governance not initialized')
      if (!wallet.data) throw new Error('Wallet is not connected')

      const receipt = await governance.executeProposal(config.proposalId)

      return receipt
    },
    onSuccess: (receipt) => {
      // Refetch proposal data to show it's executed
      proposal.refetch()
      onExecuteProposalSuccess?.(receipt)
    },
    onError: onExecuteProposalError,
  })

  // Mutation: Claim airdrop
  const claimAirdrop = useMutation({
    mutationFn: async () => {
      if (!governance) throw new Error('Governance not initialized')
      if (!wallet.data) throw new Error('Wallet is not connected')

      return await governance.claimAirdrop()
    },
    onSuccess: (receipt) => {
      // Refetch airdrop status to show it's been claimed
      airdropStatus.refetch()
      // Also refetch project data to update treasury balance
      onClaimAirdropSuccess?.(receipt)
    },
    onError: onClaimAirdropError,
  })

  // Helper: Build propose transfer config from simple params
  const buildProposeTransferConfig = ({
    receiver,
    amount,
    amountDecimals = tokenDecimals,
    reason,
  }: {
    receiver: `0x${string}`
    amount: number | string
    amountDecimals?: number
    reason: string
  }): ProposeTransferConfig => ({
    receiver,
    amount: amount.toString(),
    amountDecimals,
    reason,
  })

  // Helper: Build propose boost config from simple params
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

  // Helper: Build execute proposal config from simple params
  const buildExecuteProposalConfig = ({
    proposalId,
  }: {
    proposalId: number | bigint
  }): ExecuteProposalConfig => ({
    proposalId,
  })

  // Helper: Propose and execute transfer in sequence (for testing/convenience)
  const proposeAndExecuteTransfer = useMutation({
    mutationFn: async (config: ProposeTransferConfig) => {
      if (!governance) throw new Error('Governance not initialized')

      const amountBigInt = parseUnits(config.amount, config.amountDecimals)

      const result = await governance.proposeAndExecuteTransfer(
        config.receiver,
        amountBigInt,
        config.reason
      )

      return result
    },
    onSuccess: (result) => {
      // Refetch related queries
      nextProposalId.refetch()
      proposal.refetch()
    },
  })

  // Helper: Propose and execute boost in sequence (for testing/convenience)
  const proposeAndExecuteBoost = useMutation({
    mutationFn: async (config: ProposeBoostConfig) => {
      if (!governance) throw new Error('Governance not initialized')

      const amountBigInt = parseUnits(config.amount, config.amountDecimals)

      const result = await governance.proposeAndExecuteBoost(amountBigInt)

      return result
    },
    onSuccess: (result) => {
      // Refetch related queries
      nextProposalId.refetch()
      proposal.refetch()
    },
  })

  return {
    // Core mutations
    proposeTransfer,
    proposeBoost,
    executeProposal,
    claimAirdrop,

    // Convenience mutations (for testing/development)
    proposeAndExecuteTransfer,
    proposeAndExecuteBoost,

    // Queries
    proposal,
    canSubmit,
    nextProposalId,
    addresses,
    airdropStatus,

    // Convenience accessors
    proposalData: proposal.data,
    canSubmitProposals: canSubmit.data,
    nextProposalIdValue: nextProposalId.data,
    treasuryAddress: addresses.data?.treasury,
    factoryAddress: addresses.data?.factory,
    stakedTokenAddress: addresses.data?.stakedToken,
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
      canSubmit.isLoading ||
      nextProposalId.isLoading ||
      addresses.isLoading ||
      airdropStatus.isLoading,
    isProposing: proposeTransfer.isPending || proposeBoost.isPending,
    isExecuting: executeProposal.isPending,
    isClaiming: claimAirdrop.isPending,
  }
}
