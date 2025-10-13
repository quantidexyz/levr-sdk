import { omit } from 'lodash'
import type { TransactionReceipt } from 'viem'
import { encodeFunctionData, erc20Abi, parseUnits } from 'viem'

import type { Project } from '.'
import { LevrForwarder_v1, LevrStaking_v1 } from './abis'
import { WETH } from './constants'
import type { BalanceResult, PopPublicClient, PopWalletClient } from './types'

export type StakeConfig = {
  wallet: PopWalletClient
  publicClient: PopPublicClient
  project: Project
}

export type UnstakeParams = {
  amount: number | string | bigint
  to?: `0x${string}`
}

export type ClaimParams = {
  tokens?: `0x${string}`[]
  to?: `0x${string}`
}

export type StakePoolData = {
  totalStaked: BalanceResult
  escrowBalance: BalanceResult
  streamParams: {
    windowSeconds: number
    streamStart: bigint
    streamEnd: bigint
    isActive: boolean
  }
  rewardRatePerSecond: BalanceResult
}

export type StakeUserData = {
  stakedBalance: BalanceResult
  aprBps: { raw: bigint; percentage: number }
}

export type StakeOutstandingRewards = {
  available: BalanceResult
  pending: BalanceResult
}

export type StakeClaimableRewards = {
  claimable: BalanceResult
}

export type VotingPowerResult = {
  tokenDays: bigint
  formatted: string
}

export class Stake {
  private wallet: PopWalletClient
  private publicClient: PopPublicClient
  private stakingAddress: `0x${string}`
  private tokenAddress: `0x${string}`
  private tokenDecimals: number
  private chainId: number
  private userAddress: `0x${string}`
  private trustedForwarder?: `0x${string}`

  constructor(config: StakeConfig) {
    // Validate required fields only (not optional fields like trustedForwarder, pricing)
    if (Object.values(omit(config, ['pricing'])).some((value) => !value))
      throw new Error('Invalid config')

    this.wallet = config.wallet
    this.publicClient = config.publicClient
    this.stakingAddress = config.project.staking
    this.tokenAddress = config.project.token.address
    this.tokenDecimals = config.project.token.decimals
    this.chainId = config.publicClient.chain?.id ?? 1 // Get chainId from publicClient
    this.userAddress = config.wallet.account.address
    this.trustedForwarder = config.project.forwarder
  }
  /**
   * Approve ERC20 tokens for spending by the staking contract
   */
  async approve(amount: number | string | bigint): Promise<TransactionReceipt> {
    const parsedAmount =
      typeof amount === 'bigint' ? amount : parseUnits(amount.toString(), this.tokenDecimals)

    const hash = await this.wallet.writeContract({
      address: this.tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [this.stakingAddress, parsedAmount],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Approve transaction reverted')
    }

    return receipt
  }

  /**
   * Stake tokens in the staking contract
   */
  async stake(amount: number | string | bigint): Promise<TransactionReceipt> {
    const parsedAmount =
      typeof amount === 'bigint' ? amount : parseUnits(amount.toString(), this.tokenDecimals)

    const hash = await this.wallet.writeContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'stake',
      args: [parsedAmount],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Stake transaction reverted')
    }

    return receipt
  }

  /**
   * Unstake tokens from the staking contract
   * @returns Transaction receipt with the new voting power after unstake
   */
  async unstake({ amount, to }: UnstakeParams): Promise<{
    receipt: TransactionReceipt
    newVotingPower: bigint
  }> {
    const parsedAmount =
      typeof amount === 'bigint' ? amount : parseUnits(amount.toString(), this.tokenDecimals)

    const params = {
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'unstake',
      args: [parsedAmount, to ?? this.userAddress],
      chain: this.wallet.chain,
    } as const

    const { result: newVotingPower } = await this.publicClient.simulateContract(params)
    const hash = await this.wallet.writeContract(params)

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Unstake transaction reverted')
    }

    return {
      receipt,
      newVotingPower,
    }
  }

  /**
   * Claim rewards from the staking contract
   */
  async claimRewards(params: ClaimParams | void): Promise<TransactionReceipt> {
    // Default to claiming both staking token and WETH
    let defaultTokens = [this.tokenAddress]
    const wethAddress = WETH(this.chainId)?.address
    if (wethAddress) {
      defaultTokens.push(wethAddress)
    }

    const hash = await this.wallet.writeContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'claimRewards',
      args: [params?.tokens ?? defaultTokens, params?.to ?? this.userAddress],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Claim transaction reverted')
    }

    return receipt
  }

  /**
   * Accrue rewards by triggering automatic collection from LP locker and claiming from ClankerFeeLocker
   */
  async accrueRewards(tokenAddress?: `0x${string}`): Promise<TransactionReceipt> {
    const hash = await this.wallet.writeContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'accrueRewards',
      args: [tokenAddress ?? this.tokenAddress],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Accrue rewards transaction reverted')
    }

    return receipt
  }

  /**
   * Accrue rewards for multiple tokens in a single transaction using forwarder multicall
   */
  async accrueAllRewards(tokenAddresses: `0x${string}`[]): Promise<TransactionReceipt> {
    if (!this.trustedForwarder) {
      throw new Error('Trusted forwarder is required for multicall operations')
    }

    // Use forwarder's executeMulticall for meta-transaction support
    const calls = tokenAddresses.map((tokenAddress) => ({
      target: this.stakingAddress,
      allowFailure: false,
      value: 0n,
      callData: encodeFunctionData({
        abi: LevrStaking_v1,
        functionName: 'accrueRewards',
        args: [tokenAddress],
      }),
    }))

    const hash = await this.wallet.writeContract({
      address: this.trustedForwarder,
      abi: LevrForwarder_v1,
      functionName: 'executeMulticall',
      args: [calls],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Accrue all rewards transaction reverted')
    }

    return receipt
  }

  /**
   * Simulate voting power after an unstake (without executing the transaction)
   * @param amount Amount to unstake
   * @returns Predicted voting power in token-days after the unstake
   */
  async votingPowerOnUnstake(
    amount: number | string | bigint,
    userAddress?: `0x${string}`
  ): Promise<VotingPowerResult> {
    const user = userAddress ?? this.userAddress
    const parsedAmount =
      typeof amount === 'bigint' ? amount : parseUnits(amount.toString(), this.tokenDecimals)

    // Use simulateContract to get the return value without executing
    const simulation = await this.publicClient.simulateContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'unstake',
      args: [parsedAmount, user],
      account: user,
    })

    const tokenDays = simulation.result as unknown as bigint

    return {
      tokenDays,
      formatted: tokenDays.toLocaleString(),
    }
  }
}
