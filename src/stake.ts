import { omit } from 'lodash'
import type { TransactionReceipt } from 'viem'
import { encodeFunctionData, erc20Abi, parseUnits } from 'viem'

import type { Project } from '.'
import { LevrFeeSplitter_v1, LevrForwarder_v1, LevrStaking_v1 } from './abis'
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
  private isFeeSplitterActive: boolean

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
    this.isFeeSplitterActive = config.project.feeSplitter?.isActive ?? false
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
    let parsedAmount: bigint

    if (typeof amount === 'bigint') {
      parsedAmount = amount
    } else {
      // Parse the amount
      parsedAmount = parseUnits(amount.toString(), this.tokenDecimals)
    }

    // Get current staked balance to prevent rounding errors on 100% unstake
    const currentStakedBalance = await this.publicClient.readContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'stakedBalanceOf',
      args: [this.userAddress],
    })

    // If trying to unstake an amount very close to the total (within 0.01%), use exact balance
    // This prevents "InsufficientStake" errors from floating-point rounding
    const diff =
      parsedAmount > currentStakedBalance
        ? parsedAmount - currentStakedBalance
        : currentStakedBalance - parsedAmount

    const tolerance = currentStakedBalance / 10000n // 0.01% tolerance

    if (diff <= tolerance && parsedAmount >= (currentStakedBalance * 99n) / 100n) {
      // User is trying to unstake ~100%, use exact balance to avoid rounding errors
      parsedAmount = currentStakedBalance
    }

    const simulateParams = {
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'unstake',
      args: [parsedAmount, to ?? this.userAddress],
      account: this.userAddress,
      chain: this.wallet.chain,
    } as const

    const { result: newVotingPower } = await this.publicClient.simulateContract(simulateParams)

    // writeContract doesn't accept 'account' - it uses wallet.account automatically
    const hash = await this.wallet.writeContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'unstake',
      args: [parsedAmount, to ?? this.userAddress],
      chain: this.wallet.chain,
    })

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
    const defaultTokens = [this.tokenAddress]
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
   * Accrue rewards by triggering manual accrual from balance delta detection
   *
   * NOTE: If fee splitter is configured, call distributeFromFeeSplitter() FIRST.
   * The fee splitter transfers tokens to staking, then accrueRewards() detects the balance increase.
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
   * Distribute fees from the fee splitter to all configured receivers (including staking)
   *
   * This should be called BEFORE accrueRewards() when fee splitter is configured.
   * The fee splitter claims fees from LP locker and distributes them according to configured splits.
   */
  async distributeFromFeeSplitter(params?: {
    tokens?: `0x${string}`[]
  }): Promise<TransactionReceipt> {
    // Get the deployed fee splitter for THIS specific token
    const { getFeeSplitter } = await import('./fee-splitter')
    const feeSplitterAddress = await getFeeSplitter({
      publicClient: this.publicClient,
      clankerToken: this.tokenAddress,
      chainId: this.chainId,
    })

    if (!feeSplitterAddress) {
      throw new Error('Fee splitter not deployed for this token. Deploy it first.')
    }

    // Default to clanker token + WETH if tokens not provided
    const wethAddress = WETH(this.chainId)?.address
    const defaultTokens = wethAddress ? [this.tokenAddress, wethAddress] : [this.tokenAddress]
    const tokens = params?.tokens ?? defaultTokens

    const hash = await this.wallet.writeContract({
      address: feeSplitterAddress, // Per-project splitter, not deployer!
      abi: LevrFeeSplitter_v1,
      functionName: 'distributeBatch',
      args: [tokens],
      chain: this.wallet.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('Distribute from fee splitter transaction reverted')
    }

    return receipt
  }

  /**
   * Accrue rewards for multiple tokens in a single transaction using forwarder multicall
   *
   * If fee splitter is configured and active, this will:
   * 1. Call distribute() on fee splitter for each token
   * 2. Fee splitter automatically calls accrueRewards() after distribution
   *
   * If fee splitter is NOT configured, this will:
   * 1. Directly call accrueRewards() for each token on staking contract
   *
   * @param params.tokens - Array of token addresses to accrue (defaults to [clankerToken, WETH])
   * @param params.useFeeSplitter - If true, uses fee splitter distribute (auto-detected if not provided)
   */
  async accrueAllRewards(params?: {
    tokens?: `0x${string}`[]
    useFeeSplitter?: boolean
  }): Promise<TransactionReceipt> {
    if (!this.trustedForwarder) {
      throw new Error('Trusted forwarder is required for multicall operations')
    }

    // Default tokens: clankerToken + WETH (if available)
    const defaultTokens = [this.tokenAddress]
    const wethAddress = WETH(this.chainId)?.address
    if (wethAddress) {
      defaultTokens.push(wethAddress)
    }
    const tokenAddresses = params?.tokens ?? defaultTokens

    // Detect if fee splitter should be used (can be overridden)
    const useFeeSplitter = params?.useFeeSplitter ?? this._shouldUseFeeSplitter()

    let calls: Array<{
      target: `0x${string}`
      allowFailure: boolean
      value: bigint
      callData: `0x${string}`
    }>

    if (useFeeSplitter) {
      // Fee splitter mode: Get the deployed splitter for this token, then call distribute()
      // The fee splitter will automatically call accrueRewards() after distributing
      const { getFeeSplitter } = await import('./fee-splitter')
      const feeSplitterAddress = await getFeeSplitter({
        publicClient: this.publicClient,
        clankerToken: this.tokenAddress,
        chainId: this.chainId,
      })

      if (!feeSplitterAddress) {
        throw new Error(
          'Fee splitter not deployed for this token. Deploy it first or use useFeeSplitter: false'
        )
      }

      // Call distribute() for each token (fee splitter's portion + auto-accrue)
      const distributeCalls = tokenAddresses.map((tokenAddress) => ({
        target: feeSplitterAddress, // Per-project splitter, not deployer!
        allowFailure: false,
        value: 0n,
        callData: encodeFunctionData({
          abi: LevrFeeSplitter_v1,
          functionName: 'distribute',
          args: [tokenAddress],
        }),
      }))

      // ALSO call accrueRewards() for each token (staking's direct portion from ClankerFeeLocker)
      // This handles hybrid setups where staking receives fees both via splitter AND directly
      const accrueCalls = tokenAddresses.map((tokenAddress) => ({
        target: this.stakingAddress,
        allowFailure: false,
        value: 0n,
        callData: encodeFunctionData({
          abi: LevrStaking_v1,
          functionName: 'accrueRewards',
          args: [tokenAddress],
        }),
      }))

      // Execute both sets of calls in a single multicall transaction
      calls = [...distributeCalls, ...accrueCalls]
    } else {
      // Direct mode: Call accrueRewards() on staking contract
      calls = tokenAddresses.map((tokenAddress) => ({
        target: this.stakingAddress,
        allowFailure: false,
        value: 0n,
        callData: encodeFunctionData({
          abi: LevrStaking_v1,
          functionName: 'accrueRewards',
          args: [tokenAddress],
        }),
      }))
    }

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
   * Helper to detect if fee splitter should be used
   * Returns true if fee splitter is configured and active for this project
   */
  private _shouldUseFeeSplitter(): boolean {
    return this.isFeeSplitterActive
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
