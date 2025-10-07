import { formatUnits, parseUnits } from 'viem'
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
  proposalType: number
  amount: bigint
  receiver: `0x${string}`
  reason: string
  deadline: number
  executed: boolean
  proposer: `0x${string}`
}

export type FormattedProposalDetails = {
  id: bigint
  proposalType: number
  amount: { raw: bigint; formatted: string }
  receiver: `0x${string}`
  reason: string
  deadline: { timestamp: number; date: Date }
  executed: boolean
  proposer: `0x${string}`
}

export type ProposeTransferConfig = {
  receiver: `0x${string}`
  amount: string
  amountDecimals: number
  reason: string
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
   * Propose a transfer from treasury to receiver
   */
  async proposeTransfer(
    receiver: `0x${string}`,
    amount: number | string | bigint,
    reason: string
  ): Promise<{ receipt: TransactionReceipt; proposalId: bigint }> {
    const parsedAmount =
      typeof amount === 'bigint' ? amount : parseUnits(amount.toString(), this.tokenDecimals)

    // Get the next proposal ID before submitting
    const proposalId = await this.getNextProposalId()

    const hash = await this.wallet.writeContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'proposeTransfer',
      args: [receiver, parsedAmount, reason],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Propose transfer transaction reverted')
    }

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

    // Get the next proposal ID before submitting
    const proposalId = await this.getNextProposalId()

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

    return { receipt, proposalId }
  }

  /**
   * Execute a proposal by ID
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

    const result = await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'getProposal',
      args: [parsedProposalId],
    })

    return {
      id: parsedProposalId,
      proposalType: result.proposalType,
      amount: {
        raw: result.amount,
        formatted: formatUnits(result.amount, this.tokenDecimals),
      },
      receiver: result.receiver,
      reason: result.reason,
      deadline: {
        timestamp: result.deadline,
        date: new Date(result.deadline * 1000),
      },
      executed: result.executed,
      proposer: result.proposer,
    }
  }

  /**
   * Check if a user can submit proposals
   */
  async canSubmit(user?: `0x${string}`): Promise<boolean> {
    const userToCheck = user ?? this.userAddress

    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'canSubmit',
      args: [userToCheck],
    })
  }

  /**
   * Get next proposal ID
   */
  async getNextProposalId(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.governorAddress,
      abi: LevrGovernor_v1,
      functionName: 'nextProposalId',
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
    receiver: `0x${string}`,
    amount: number | string | bigint,
    reason: string
  ): Promise<{
    proposeReceipt: TransactionReceipt
    executeReceipt: TransactionReceipt
    proposalId: bigint
  }> {
    const { receipt: proposeReceipt, proposalId } = await this.proposeTransfer(
      receiver,
      amount,
      reason
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
   * Find treasury airdrop allocation by trying known amounts
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

    // Try each known treasury airdrop amount
    for (const amountInTokens of TREASURY_AIRDROP_AMOUNTS) {
      const amount = BigInt(amountInTokens) * 10n ** 18n // Convert to wei

      try {
        const available = await this.publicClient.readContract({
          address: airdropAddress,
          abi: IClankerAirdrop,
          functionName: 'amountAvailableToClaim',
          args: [this.clankerToken, treasury, amount],
        })

        if (available > 0n) {
          return { amount, available, status: 'available' }
        } else {
          // Available is 0, but call succeeded - airdrop exists but was claimed
          return { amount, available: 0n, status: 'claimed' }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : ''

        if (errorMessage.includes('AirdropNotCreated')) {
          continue // Try next amount
        }

        if (errorMessage.includes('AirdropNotUnlocked')) {
          return { amount, available: 0n, status: 'locked', error: 'Airdrop is still locked' }
        }

        if (errorMessage.includes('UserMaxClaimed') || errorMessage.includes('TotalMaxClaimed')) {
          return {
            amount,
            available: 0n,
            status: 'claimed',
            error: 'Already claimed maximum amount',
          }
        }

        // Other errors but we found the right amount
        return { amount, available: 0n, status: 'locked', error: errorMessage }
      }
    }

    return null
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
