'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

  // Query params (optional - for reactive data)
  proposalId?: number | bigint
  cycleId?: number | bigint
  userAddress?: `0x${string}` // For checking specific user's votes/VP

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
 * @param params - Hook parameters
 * @returns Queries and mutations for governance operations
 */
export function useGovernance({
  governorAddress,
  clankerToken,
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
  const wallet = useWalletClient()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()

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

  /**
   * Invalidate relevant queries to refetch data
   */
  const invalidateGovernanceQueries = () => {
    // Invalidate all governance-related queries
    queryClient.invalidateQueries({ queryKey: ['governance'] })
    queryClient.invalidateQueries({ queryKey: ['proposals'] })
    // Invalidate project data (contains treasury balance, etc.)
    queryClient.invalidateQueries({ queryKey: ['project'] })
  }

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

  // Query: Get current cycle ID
  const currentCycleId = useQuery({
    queryKey: ['governance', 'currentCycleId', governorAddress],
    queryFn: async (): Promise<bigint> => {
      if (!governance) throw new Error('Governance not initialized')
      return await governance.getCurrentCycleId()
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

  // Query: Get proposals for cycle
  const proposalsForCycle = useQuery({
    queryKey: ['governance', 'proposalsForCycle', governorAddress, cycleId?.toString()],
    queryFn: async (): Promise<readonly bigint[]> => {
      if (!governance || cycleId === undefined)
        throw new Error('Governance not initialized or no cycle ID')
      return await governance.getProposalsForCycle(cycleId)
    },
    enabled: enabled && !!governance && cycleId !== undefined,
    retry: 1,
  })

  // Query: Get winner for cycle
  const winner = useQuery({
    queryKey: ['governance', 'winner', governorAddress, cycleId?.toString()],
    queryFn: async (): Promise<bigint> => {
      if (!governance || cycleId === undefined)
        throw new Error('Governance not initialized or no cycle ID')
      return await governance.getWinner(cycleId)
    },
    enabled: enabled && !!governance && cycleId !== undefined,
    retry: 1,
  })

  // Query: Get vote receipt for user on proposal
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

  // Query: Get voting power snapshot for proposal
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

  // Query: Check if proposal meets quorum
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

  // Query: Check if proposal meets approval
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

  // Query: Get proposal state
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

  // Query: Get active proposal count by type
  const activeProposalCount = useQuery({
    queryKey: ['governance', 'activeProposalCount', governorAddress],
    queryFn: async () => {
      if (!governance) throw new Error('Governance not initialized')
      const [boostCount, transferCount] = await Promise.all([
        governance.getActiveProposalCount(0), // BoostStakingPool
        governance.getActiveProposalCount(1), // TransferToAddress
      ])
      return { boost: boostCount, transfer: transferCount }
    },
    enabled: enabled && !!governance,
    retry: 1,
  })

  // Mutation: Vote on proposal
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
    onSuccess: (receipt) => {
      // Invalidate queries to refetch updated data
      invalidateGovernanceQueries()
      onVoteSuccess?.(receipt)
    },
    onError: onVoteError,
  })

  // Mutation: Propose transfer
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
    onSuccess: (result) => {
      // Invalidate queries to refetch updated data
      invalidateGovernanceQueries()
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
      // Invalidate queries to refetch updated data
      invalidateGovernanceQueries()
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
      // Invalidate queries to refetch updated data
      invalidateGovernanceQueries()
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
      // Invalidate queries to refetch updated data
      invalidateGovernanceQueries()
      onClaimAirdropSuccess?.(receipt)
    },
    onError: onClaimAirdropError,
  })

  // Helper: Build propose transfer config from simple params
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
        config.recipient,
        amountBigInt,
        config.description
      )

      return result
    },
    onSuccess: () => {
      // Invalidate queries to refetch updated data
      invalidateGovernanceQueries()
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
    onSuccess: () => {
      // Invalidate queries to refetch updated data
      invalidateGovernanceQueries()
    },
  })

  return {
    // Core mutations
    proposeTransfer,
    proposeBoost,
    vote,
    executeProposal,
    claimAirdrop,

    // Convenience mutations (for testing/development)
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
