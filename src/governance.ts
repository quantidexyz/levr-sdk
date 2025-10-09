import { decodeEventLog, erc20Abi, formatUnits, parseUnits } from 'viem'
import type { TransactionReceipt } from 'viem'

import { LevrGovernor_v1 } from './abis'
import IClankerAirdrop from './abis/IClankerAirdrop'
import { GET_CLANKER_AIRDROP_ADDRESS, TREASURY_AIRDROP_AMOUNTS } from './constants'
import type { PopPublicClient, PopWalletClient } from './types'

export type GovernanceConfig = {
  wallet: PopWalletClient
  publicClient: PopPublicClient
  governorAddress: `0x${string}`
  tokenDecimals: number
  clankerToken: `0x${string}`
  trustedForwarder?: `0x${string}`
}

export type ProposalDetails = {
  id: bigint
  proposalType: number
  proposer: `0x${string}`
  amount: bigint
  recipient: `0x${string}`
  description: string
  createdAt: bigint
  votingStartsAt: bigint
  votingEndsAt: bigint
  yesVotes: bigint
  noVotes: bigint
  totalBalanceVoted: bigint
  executed: boolean
  cycleId: bigint
}

export type FormattedProposalDetails = {
  id: bigint
  proposalType: number
  proposer: `0x${string}`
  amount: { raw: bigint; formatted: string }
  recipient: `0x${string}`
  description: string
  createdAt: { timestamp: bigint; date: Date }
  votingStartsAt: { timestamp: bigint; date: Date }
  votingEndsAt: { timestamp: bigint; date: Date }
  yesVotes: { raw: bigint; formatted: string }
  noVotes: { raw: bigint; formatted: string }
  totalBalanceVoted: bigint
  executed: boolean
  cycleId: bigint
}

export type ProposeTransferConfig = {
  recipient: `0x${string}`
  amount: string
  amountDecimals: number
  description: string
}

export type ProposeBoostConfig = {
  amount: string
  amountDecimals: number
}

export type ExecuteProposalConfig = {
  proposalId: number | bigint
}

export class Governance {
  private wallet: PopWalletClient
  private publicClient: PopPublicClient
  private governorAddress: `0x${string}`
  private tokenDecimals: number
  private clankerToken: `0x${string}`
  private userAddress: `0x${string}`

  constructor(config: GovernanceConfig) {
    if (Object.values(config).some((value) => !value)) throw new Error('Invalid config')

    this.wallet = config.wallet
    this.publicClient = config.publicClient
    this.governorAddress = config.governorAddress
    this.tokenDecimals = config.tokenDecimals
    this.clankerToken = config.clankerToken
    this.userAddress = config.wallet.account.address
    // trustedForwarder reserved for future meta-transaction support
  }

  /**
   * Propose a transfer from treasury to recipient
   */
  async proposeTransfer(
    recipient: `0x${string}`,
    amount: number | string | bigint,
    description: string
  ): Promise<{ receipt: TransactionReceipt; proposalId: bigint }> {
    const parsedAmount =
      typeof amount === 'bigint' ? amount : parseUnits(amount.toString(), this.tokenDecimals)

    const hash = await this.wallet.writeContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'proposeTransfer',
      args: [recipient, parsedAmount, description],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Propose transfer transaction reverted')
    }

    // Extract proposal ID from ProposalCreated event
    const proposalCreatedLog = receipt.logs.find((log) => {
      try {
        const decoded = decodeEventLog({
          abi: LevrGovernor_v1,
          data: log.data,
          topics: log.topics,
        })
        return decoded.eventName === 'ProposalCreated'
      } catch {
        return false
      }
    })

    if (!proposalCreatedLog) {
      throw new Error('ProposalCreated event not found in receipt')
    }

    const decoded = decodeEventLog({
      abi: LevrGovernor_v1,
      data: proposalCreatedLog.data,
      topics: proposalCreatedLog.topics,
    })

    const proposalId = (decoded.args as { proposalId: bigint }).proposalId

    return { receipt, proposalId }
  }

  /**
   * Propose a boost from treasury to staking rewards
   */
  async proposeBoost(
    amount: number | string | bigint
  ): Promise<{ receipt: TransactionReceipt; proposalId: bigint }> {
    const parsedAmount =
      typeof amount === 'bigint' ? amount : parseUnits(amount.toString(), this.tokenDecimals)

    const hash = await this.wallet.writeContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'proposeBoost',
      args: [parsedAmount],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Propose boost transaction reverted')
    }

    // Extract proposal ID from ProposalCreated event
    const proposalCreatedLog = receipt.logs.find((log) => {
      try {
        const decoded = decodeEventLog({
          abi: LevrGovernor_v1,
          data: log.data,
          topics: log.topics,
        })
        return decoded.eventName === 'ProposalCreated'
      } catch {
        return false
      }
    })

    if (!proposalCreatedLog) {
      throw new Error('ProposalCreated event not found in receipt')
    }

    const decoded = decodeEventLog({
      abi: LevrGovernor_v1,
      data: proposalCreatedLog.data,
      topics: proposalCreatedLog.topics,
    })

    const proposalId = (decoded.args as { proposalId: bigint }).proposalId

    return { receipt, proposalId }
  }

  /**
   * Vote on a proposal
   */
  async vote(proposalId: number | bigint, support: boolean): Promise<TransactionReceipt> {
    const parsedProposalId = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId)

    const hash = await this.wallet.writeContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'vote',
      args: [parsedProposalId, support],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Vote transaction reverted')
    }

    return receipt
  }

  /**
   * Execute a proposal by ID
   * Note: Automatically starts a new cycle after successful execution
   */
  async executeProposal(proposalId: number | bigint): Promise<TransactionReceipt> {
    const parsedProposalId = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId)

    const hash = await this.wallet.writeContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'execute',
      args: [parsedProposalId],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Execute proposal transaction reverted')
    }

    return receipt
  }

  /**
   * Get proposal details by ID
   */
  async getProposal(proposalId: number | bigint): Promise<FormattedProposalDetails> {
    const parsedProposalId = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId)

    const result = (await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getProposal',
      args: [parsedProposalId],
    })) as ProposalDetails

    return {
      id: result.id,
      proposalType: result.proposalType,
      proposer: result.proposer,
      amount: {
        raw: result.amount,
        formatted: formatUnits(result.amount, this.tokenDecimals),
      },
      recipient: result.recipient,
      description: result.description,
      createdAt: {
        timestamp: result.createdAt,
        date: new Date(Number(result.createdAt) * 1000),
      },
      votingStartsAt: {
        timestamp: result.votingStartsAt,
        date: new Date(Number(result.votingStartsAt) * 1000),
      },
      votingEndsAt: {
        timestamp: result.votingEndsAt,
        date: new Date(Number(result.votingEndsAt) * 1000),
      },
      yesVotes: {
        raw: result.yesVotes,
        formatted: formatUnits(result.yesVotes, this.tokenDecimals),
      },
      noVotes: {
        raw: result.noVotes,
        formatted: formatUnits(result.noVotes, this.tokenDecimals),
      },
      totalBalanceVoted: result.totalBalanceVoted,
      executed: result.executed,
      cycleId: result.cycleId,
    }
  }

  /**
   * Get current cycle ID
   */
  async getCurrentCycleId(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'currentCycleId',
    })
  }

  /**
   * Get all proposal IDs for a specific cycle
   */
  async getProposalsForCycle(cycleId: number | bigint): Promise<readonly bigint[]> {
    const parsedCycleId = typeof cycleId === 'bigint' ? cycleId : BigInt(cycleId)

    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getProposalsForCycle',
      args: [parsedCycleId],
    })
  }

  /**
   * Get the winner proposal ID for a cycle
   */
  async getWinner(cycleId: number | bigint): Promise<bigint> {
    const parsedCycleId = typeof cycleId === 'bigint' ? cycleId : BigInt(cycleId)

    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getWinner',
      args: [parsedCycleId],
    })
  }

  /**
   * Get vote receipt for a user on a proposal
   */
  async getVoteReceipt(
    proposalId: number | bigint,
    voter?: `0x${string}`
  ): Promise<{ hasVoted: boolean; support: boolean; votes: bigint }> {
    const parsedProposalId = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId)
    const voterAddress = voter ?? this.userAddress

    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getVoteReceipt',
      args: [parsedProposalId, voterAddress],
    })
  }

  /**
   * Get voting power snapshot for a user at proposal creation
   */
  async getVotingPowerSnapshot(proposalId: number | bigint, user?: `0x${string}`): Promise<bigint> {
    const parsedProposalId = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId)
    const userAddress = user ?? this.userAddress

    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getVotingPowerSnapshot',
      args: [parsedProposalId, userAddress],
    })
  }

  /**
   * Check if proposal meets quorum
   */
  async meetsQuorum(proposalId: number | bigint): Promise<boolean> {
    const parsedProposalId = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId)

    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'meetsQuorum',
      args: [parsedProposalId],
    })
  }

  /**
   * Check if proposal meets approval threshold
   */
  async meetsApproval(proposalId: number | bigint): Promise<boolean> {
    const parsedProposalId = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId)

    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'meetsApproval',
      args: [parsedProposalId],
    })
  }

  /**
   * Get proposal state (Pending, Active, Defeated, Succeeded, Executed)
   */
  async getProposalState(proposalId: number | bigint): Promise<number> {
    const parsedProposalId = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId)

    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'state',
      args: [parsedProposalId],
    })
  }

  /**
   * Get active proposal count for a specific proposal type
   */
  async getActiveProposalCount(proposalType: number): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'activeProposalCount',
      args: [proposalType],
    })
  }

  /**
   * Get factory address
   */
  async getFactory(): Promise<`0x${string}`> {
    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'factory',
    })
  }

  /**
   * Get treasury address
   */
  async getTreasury(): Promise<`0x${string}`> {
    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'treasury',
    })
  }

  /**
   * Get staked token address
   */
  async getStakedToken(): Promise<`0x${string}`> {
    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'stakedToken',
    })
  }

  /**
   * Propose transfer and execute in sequence (for testing convenience)
   */
  async proposeAndExecuteTransfer(
    recipient: `0x${string}`,
    amount: number | string | bigint,
    description: string
  ): Promise<{
    proposeReceipt: TransactionReceipt
    executeReceipt: TransactionReceipt
    proposalId: bigint
  }> {
    const { receipt: proposeReceipt, proposalId } = await this.proposeTransfer(
      recipient,
      amount,
      description
    )
    const executeReceipt = await this.executeProposal(proposalId)

    return {
      proposeReceipt,
      executeReceipt,
      proposalId,
    }
  }

  /**
   * Propose boost and execute in sequence (for testing convenience)
   */
  async proposeAndExecuteBoost(amount: number | string | bigint): Promise<{
    proposeReceipt: TransactionReceipt
    executeReceipt: TransactionReceipt
    proposalId: bigint
  }> {
    const { receipt: proposeReceipt, proposalId } = await this.proposeBoost(amount)
    const executeReceipt = await this.executeProposal(proposalId)

    return {
      proposeReceipt,
      executeReceipt,
      proposalId,
    }
  }

  /**
   * Find treasury airdrop allocation by checking all known amounts using multicall
   */
  private async findTreasuryAllocation(): Promise<{
    amount: bigint
    available: bigint
    status: 'available' | 'locked' | 'claimed' | 'not_found'
    error?: string
  } | null> {
    const chainId = this.publicClient.chain?.id
    const airdropAddress = GET_CLANKER_AIRDROP_ADDRESS(chainId)
    const treasury = await this.getTreasury()

    if (!airdropAddress) return null

    // Prepare multicall for all possible treasury airdrop amounts + treasury balance check
    const amounts = Object.values(TREASURY_AIRDROP_AMOUNTS).map(
      (amountInTokens) => BigInt(amountInTokens) * 10n ** 18n
    )

    const results = await this.publicClient.multicall({
      contracts: [
        // First check treasury balance
        {
          address: this.clankerToken,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [treasury],
        },
        // Then check all airdrop amounts
        ...amounts.map((amount) => ({
          address: airdropAddress,
          abi: IClankerAirdrop,
          functionName: 'amountAvailableToClaim' as const,
          args: [this.clankerToken, treasury, amount],
        })),
      ] as any, // Mixed ABIs in multicall
      allowFailure: true,
    })

    // Extract treasury balance from first result
    const treasuryBalanceResult = results[0]
    const treasuryBalance =
      treasuryBalanceResult && treasuryBalanceResult.status === 'success'
        ? (treasuryBalanceResult.result as bigint)
        : 0n

    // Extract airdrop check results (skip first result which is balance)
    const airdropResults = results.slice(1)

    // Collect all valid results first
    const allResults: Array<{
      amount: bigint
      available: bigint
      status: 'available' | 'locked' | 'claimed' | 'not_found'
      error?: string
      priority: number // Lower is better
    }> = []

    for (let i = 0; i < airdropResults.length; i++) {
      const result = airdropResults[i]
      const amount = amounts[i]

      if (result.status === 'success' && result.result !== undefined) {
        const available = result.result as bigint

        if (available > 0n) {
          // Available - highest priority (1)
          allResults.push({ amount, available, status: 'available', priority: 1 })
        } else {
          // Available is 0 - check treasury balance to determine if claimed or locked
          // If treasury has >= this amount, it's likely already claimed
          // Otherwise it's still locked
          const isClaimed = treasuryBalance >= amount
          const priority = isClaimed ? 4 : 2
          const status = isClaimed ? 'claimed' : 'locked'
          const error = isClaimed ? 'Treasury airdrop already claimed' : 'Airdrop is still locked'

          allResults.push({ amount, available: 0n, status, priority, error })
        }
      } else if (result.status === 'failure') {
        const errorMessage = result.error?.message || ''

        // AirdropNotCreated means this amount wasn't configured - skip entirely
        if (errorMessage.includes('AirdropNotCreated')) {
          continue
        }

        // AirdropNotUnlocked means this amount exists but is locked (priority 2)
        if (errorMessage.includes('AirdropNotUnlocked')) {
          allResults.push({
            amount,
            available: 0n,
            status: 'locked',
            error: 'Airdrop is still locked',
            priority: 2,
          })
          continue
        }

        // Already claimed errors (priority 3)
        if (errorMessage.includes('UserMaxClaimed') || errorMessage.includes('TotalMaxClaimed')) {
          allResults.push({
            amount,
            available: 0n,
            status: 'claimed',
            error: 'Already claimed maximum amount',
            priority: 3,
          })
          continue
        }

        // Arithmetic underflow/overflow means a different (larger) amount was claimed
        // Skip this result entirely - the correct amount will be detected separately
        if (errorMessage.includes('underflow') || errorMessage.includes('overflow')) {
          continue
        }

        // Other errors - treat as locked (priority 2)
        allResults.push({
          amount,
          available: 0n,
          status: 'locked',
          error: errorMessage,
          priority: 2,
        })
      }
    }

    // If no results found, return null
    if (allResults.length === 0) {
      return null
    }

    // Sort by priority (lower is better), then by amount (higher is better for same priority)
    allResults.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // For same priority, prefer larger amounts
      return a.amount > b.amount ? -1 : 1
    })

    // Return the best result
    const best = allResults[0]

    return {
      amount: best.amount,
      available: best.available,
      status: best.status,
      error: best.error,
    }
  }

  /**
   * Get available airdrop amount for treasury using known amounts
   */
  async getAvailableAirdropAmount(): Promise<bigint> {
    const allocation = await this.findTreasuryAllocation()
    return allocation?.available || 0n
  }

  /**
   * Get airdrop status for treasury with detailed status information
   */
  async getAirdropStatus(): Promise<{
    availableAmount: { raw: bigint; formatted: string }
    allocatedAmount: { raw: bigint; formatted: string }
    isAvailable: boolean
    error?: string
  }> {
    const allocation = await this.findTreasuryAllocation()

    if (!allocation) {
      return {
        availableAmount: { raw: 0n, formatted: formatUnits(0n, this.tokenDecimals) },
        allocatedAmount: { raw: 0n, formatted: formatUnits(0n, this.tokenDecimals) },
        isAvailable: false,
        error: 'No treasury airdrop found',
      }
    }

    // Generate appropriate error message based on status
    let error: string | undefined
    switch (allocation.status) {
      case 'available':
        error = undefined
        break
      case 'locked':
        error = allocation.error || 'Airdrop is still locked (lockup period not passed)'
        break
      case 'claimed':
        error = 'Treasury airdrop already claimed'
        break
      case 'not_found':
        error = 'No treasury airdrop found'
        break
    }

    return {
      availableAmount: {
        raw: allocation.available,
        formatted: formatUnits(allocation.available, this.tokenDecimals),
      },
      allocatedAmount: {
        raw: allocation.amount,
        formatted: formatUnits(allocation.amount, this.tokenDecimals),
      },
      isAvailable: allocation.status === 'available' && allocation.available > 0n,
      error,
    }
  }

  /**
   * Claim airdrop for treasury
   */
  async claimAirdrop(): Promise<TransactionReceipt> {
    const allocation = await this.findTreasuryAllocation()

    if (!allocation) {
      throw new Error('No treasury airdrop found to claim')
    }

    if (allocation.status === 'claimed') {
      throw new Error('Treasury airdrop already claimed')
    }

    if (allocation.status === 'not_found') {
      throw new Error('No treasury airdrop configured for this token')
    }

    const chainId = this.publicClient.chain?.id
    const airdropAddress = GET_CLANKER_AIRDROP_ADDRESS(chainId)
    const treasury = await this.getTreasury()

    if (!airdropAddress) {
      throw new Error(`No airdrop address found for chain ID ${chainId}`)
    }

    const hash = await this.wallet.writeContract({
      address: airdropAddress,
      abi: IClankerAirdrop,
      functionName: 'claim',
      args: [this.clankerToken, treasury, allocation.amount, []], // Empty proof for single-leaf merkle tree
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Claim airdrop transaction reverted')
    }

    return receipt
  }
}
