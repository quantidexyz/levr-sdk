import { formatUnits, parseUnits } from 'viem'
import type { TransactionReceipt } from 'viem'

import { LevrGovernor_v1 } from './abis'
import type { PopPublicClient, PopWalletClient } from './types'

export type GovernanceConfig = {
  wallet: PopWalletClient
  publicClient: PopPublicClient
  governorAddress: `0x${string}`
  tokenDecimals: number
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
  private userAddress: `0x${string}`

  constructor(config: GovernanceConfig) {
    if (Object.values(config).some((value) => !value)) throw new Error('Invalid config')

    this.wallet = config.wallet
    this.publicClient = config.publicClient
    this.governorAddress = config.governorAddress
    this.tokenDecimals = config.tokenDecimals
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
}
