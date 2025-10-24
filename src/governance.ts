import type { TransactionReceipt } from 'viem'
import { decodeEventLog, parseUnits } from 'viem'

import type { Project } from '.'
import { IClankerAirdrop, LevrGovernor_v1 } from './abis'
import { GET_CLANKER_AIRDROP_ADDRESS } from './constants'
import type { BalanceResult, PopPublicClient, PopWalletClient } from './types'

export type GovernanceConfig = {
  wallet: PopWalletClient
  publicClient: PopPublicClient
  project: Project
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
  amount: BalanceResult
  recipient: `0x${string}`
  description: string
  createdAt: { timestamp: bigint; date: Date }
  votingStartsAt: { timestamp: bigint; date: Date }
  votingEndsAt: { timestamp: bigint; date: Date }
  yesVotes: BalanceResult
  noVotes: BalanceResult
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
  private project: Project

  constructor(config: GovernanceConfig) {
    if (Object.values(config).some((value) => !value)) throw new Error('Invalid config')

    this.wallet = config.wallet
    this.publicClient = config.publicClient
    this.project = config.project
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
      typeof amount === 'bigint'
        ? amount
        : parseUnits(amount.toString(), this.project.token.decimals)

    const hash = await this.wallet.writeContract({
      address: this.project.governor,
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
      typeof amount === 'bigint'
        ? amount
        : parseUnits(amount.toString(), this.project.token.decimals)

    const hash = await this.wallet.writeContract({
      address: this.project.governor,
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
      address: this.project.governor,
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
      address: this.project.governor,
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
   * Get vote receipt for a user on a proposal
   */
  async getVoteReceipt(
    proposalId: number | bigint,
    voter?: `0x${string}`
  ): Promise<{ hasVoted: boolean; support: boolean; votes: bigint }> {
    const parsedProposalId = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId)
    const voterAddress = voter ?? this.wallet.account.address

    return await this.publicClient.readContract({
      address: this.project.governor,
      abi: LevrGovernor_v1,
      functionName: 'getVoteReceipt',
      args: [parsedProposalId, voterAddress],
    })
  }

  async claimAirdrop(recipient: {
    address: `0x${string}`
    allocatedAmount: { raw: bigint }
    proof: `0x${string}`[]
    isAvailable: boolean
    error?: string
  }): Promise<TransactionReceipt> {
    const chainId = this.publicClient.chain?.id
    const airdropAddress = GET_CLANKER_AIRDROP_ADDRESS(chainId)

    if (!airdropAddress) {
      throw new Error(`No airdrop address found for chain ID ${chainId}`)
    }

    if (recipient.error) {
      throw new Error(recipient.error)
    }

    if (!recipient.isAvailable) {
      throw new Error('No airdrop available to claim')
    }

    const hash = await this.wallet.writeContract({
      address: airdropAddress,
      abi: IClankerAirdrop,
      functionName: 'claim',
      args: [
        this.project.token.address,
        recipient.address,
        recipient.allocatedAmount.raw,
        recipient.proof,
      ],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error(`Claim airdrop transaction reverted: ${hash}`)
    }

    return receipt
  }
}
