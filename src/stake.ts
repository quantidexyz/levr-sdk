import type { TransactionReceipt } from 'viem'
import { encodeFunctionData, erc20Abi, formatUnits, parseUnits } from 'viem'

import { LevrForwarder_v1, LevrStaking_v1 } from './abis'
import { WETH } from './constants'
import { quoteV4 } from './quote-v4'
import type {
  BalanceResult,
  PoolKey,
  PopPublicClient,
  PopWalletClient,
  PricingResult,
} from './types'

export type StakeConfig = {
  wallet: PopWalletClient
  publicClient: PopPublicClient
  stakingAddress: `0x${string}`
  tokenAddress: `0x${string}`
  tokenDecimals: number
  trustedForwarder?: `0x${string}`
  pricing?: PricingResult
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

export class Stake {
  private wallet: PopWalletClient
  private publicClient: PopPublicClient
  private stakingAddress: `0x${string}`
  private tokenAddress: `0x${string}`
  private tokenDecimals: number
  private chainId: number
  private userAddress: `0x${string}`
  private trustedForwarder?: `0x${string}`
  private pricing?: PricingResult

  constructor(config: StakeConfig) {
    if (Object.values(config).some((value) => !value)) throw new Error('Invalid config')

    this.wallet = config.wallet
    this.publicClient = config.publicClient
    this.stakingAddress = config.stakingAddress
    this.tokenAddress = config.tokenAddress
    this.tokenDecimals = config.tokenDecimals
    this.chainId = config.publicClient.chain?.id ?? 1 // Get chainId from publicClient
    this.userAddress = config.wallet.account.address
    this.trustedForwarder = config.trustedForwarder
    this.pricing = config.pricing
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
   */
  async unstake({ amount, to }: UnstakeParams): Promise<TransactionReceipt> {
    const parsedAmount =
      typeof amount === 'bigint' ? amount : parseUnits(amount.toString(), this.tokenDecimals)

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

    return receipt
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
   * Get allowance for a token and spender
   */
  async getAllowance(): Promise<BalanceResult> {
    const result = await this.publicClient.readContract({
      address: this.tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [this.userAddress, this.stakingAddress],
    })

    return {
      raw: result,
      formatted: formatUnits(result, 18), // Assuming 18 decimals, should be passed as param if needed
    }
  }

  /**
   * Get pool data from staking contract
   */
  async getPoolData(): Promise<StakePoolData> {
    // Get current block to use blockchain time
    const currentBlock = await this.publicClient.getBlock()
    const blockTime = currentBlock.timestamp

    const results = await this.publicClient.multicall({
      contracts: [
        {
          address: this.stakingAddress,
          abi: LevrStaking_v1,
          functionName: 'totalStaked',
        },
        {
          address: this.stakingAddress,
          abi: LevrStaking_v1,
          functionName: 'escrowBalance',
          args: [this.tokenAddress],
        },
        {
          address: this.stakingAddress,
          abi: LevrStaking_v1,
          functionName: 'streamWindowSeconds',
        },
        {
          address: this.stakingAddress,
          abi: LevrStaking_v1,
          functionName: 'streamStart',
        },
        {
          address: this.stakingAddress,
          abi: LevrStaking_v1,
          functionName: 'streamEnd',
        },
        {
          address: this.stakingAddress,
          abi: LevrStaking_v1,
          functionName: 'rewardRatePerSecond',
          args: [this.tokenAddress],
        },
      ],
    })

    const [totalStaked, escrowBalance, windowSeconds, streamStart, streamEnd, rewardRate] =
      results.map((r) => r.result!) as [bigint, bigint, number, bigint, bigint, bigint]

    const totalStakedFormatted = formatUnits(totalStaked, this.tokenDecimals)
    const escrowBalanceFormatted = formatUnits(escrowBalance, this.tokenDecimals)
    const rewardRateFormatted = formatUnits(rewardRate, this.tokenDecimals)

    // Calculate USD values if pricing is available
    const tokenPrice = this.pricing ? parseFloat(this.pricing.tokenUsd) : null

    return {
      totalStaked: {
        raw: totalStaked,
        formatted: totalStakedFormatted,
        usd: tokenPrice ? (parseFloat(totalStakedFormatted) * tokenPrice).toString() : undefined,
      },
      escrowBalance: {
        raw: escrowBalance,
        formatted: escrowBalanceFormatted,
        usd: tokenPrice ? (parseFloat(escrowBalanceFormatted) * tokenPrice).toString() : undefined,
      },
      streamParams: {
        windowSeconds: windowSeconds,
        streamStart: streamStart,
        streamEnd: streamEnd,
        isActive: blockTime < streamEnd,
      },
      rewardRatePerSecond: {
        raw: rewardRate as bigint,
        formatted: rewardRateFormatted,
        usd: tokenPrice ? (parseFloat(rewardRateFormatted) * tokenPrice).toString() : undefined,
      },
    }
  }

  /**
   * Get user data from staking contract
   */
  async getUserData(): Promise<StakeUserData> {
    const results = await this.publicClient.multicall({
      contracts: [
        {
          address: this.stakingAddress,
          abi: LevrStaking_v1,
          functionName: 'stakedBalanceOf',
          args: [this.userAddress],
        },
        {
          address: this.stakingAddress,
          abi: LevrStaking_v1,
          functionName: 'aprBps',
          args: [],
        },
      ],
    })

    const stakedBalance = results[0].result as bigint
    const aprBps = results[1].result as bigint

    const stakedBalanceFormatted = formatUnits(stakedBalance, this.tokenDecimals)
    const tokenPrice = this.pricing ? parseFloat(this.pricing.tokenUsd) : null

    return {
      stakedBalance: {
        raw: stakedBalance,
        formatted: stakedBalanceFormatted,
        usd: tokenPrice ? (parseFloat(stakedBalanceFormatted) * tokenPrice).toString() : undefined,
      },
      aprBps: {
        raw: aprBps,
        percentage: Number(aprBps) / 100,
      },
    }
  }

  /**
   * Get outstanding rewards for the token (for accrual purposes)
   */
  async getOutstandingRewards(tokenAddress?: `0x${string}`): Promise<StakeOutstandingRewards> {
    const token = tokenAddress ?? this.tokenAddress
    const decimals = token === this.tokenAddress ? this.tokenDecimals : 18 // Assume 18 for other tokens

    const result = await this.publicClient.readContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'outstandingRewards',
      args: [token],
    })

    const availableFormatted = formatUnits(result[0], decimals)
    const pendingFormatted = formatUnits(result[1], decimals)

    // Calculate USD values if pricing is available
    let availableUsd: string | undefined
    let pendingUsd: string | undefined

    if (this.pricing) {
      const isTokenReward = token === this.tokenAddress
      const wethAddress = WETH(this.chainId)?.address
      const isWethReward = wethAddress && token.toLowerCase() === wethAddress.toLowerCase()

      if (isTokenReward) {
        const price = parseFloat(this.pricing.tokenUsd)
        availableUsd = (parseFloat(availableFormatted) * price).toString()
        pendingUsd = (parseFloat(pendingFormatted) * price).toString()
      } else if (isWethReward) {
        const price = parseFloat(this.pricing.wethUsd)
        availableUsd = (parseFloat(availableFormatted) * price).toString()
        pendingUsd = (parseFloat(pendingFormatted) * price).toString()
      }
    }

    return {
      available: {
        raw: result[0],
        formatted: availableFormatted,
        usd: availableUsd,
      },
      pending: {
        raw: result[1],
        formatted: pendingFormatted,
        usd: pendingUsd,
      },
    }
  }

  /**
   * Get claimable rewards for the current user and token
   */
  async getClaimableRewards(tokenAddress?: `0x${string}`): Promise<StakeClaimableRewards> {
    const token = tokenAddress ?? this.tokenAddress
    const decimals = token === this.tokenAddress ? this.tokenDecimals : 18 // Assume 18 for other tokens

    const result = await this.publicClient.readContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'claimableRewards',
      args: [this.userAddress, token],
    })

    const formatted = formatUnits(result, decimals)

    // Calculate USD value if pricing is available
    let usd: string | undefined

    if (this.pricing) {
      const isTokenReward = token === this.tokenAddress
      const wethAddress = WETH(this.chainId)?.address
      const isWethReward = wethAddress && token.toLowerCase() === wethAddress.toLowerCase()

      if (isTokenReward) {
        const price = parseFloat(this.pricing.tokenUsd)
        usd = (parseFloat(formatted) * price).toString()
      } else if (isWethReward) {
        const price = parseFloat(this.pricing.wethUsd)
        usd = (parseFloat(formatted) * price).toString()
      }
    }

    return {
      claimable: {
        raw: result,
        formatted,
        usd,
      },
    }
  }

  /**
   * Get reward rate per second for a specific token
   */
  async getRewardRatePerSecond(tokenAddress?: `0x${string}`): Promise<BalanceResult> {
    const token = tokenAddress ?? this.tokenAddress
    const decimals = token === this.tokenAddress ? this.tokenDecimals : 18 // Assume 18 for other tokens

    const result = await this.publicClient.readContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'rewardRatePerSecond',
      args: [token],
    })

    const formatted = formatUnits(result, decimals)

    // Calculate USD value if pricing is available
    let usd: string | undefined
    if (this.pricing) {
      const isTokenReward = token.toLowerCase() === this.tokenAddress.toLowerCase()
      const isWethReward = !isTokenReward

      if (isTokenReward) {
        const price = parseFloat(this.pricing.tokenUsd)
        usd = (parseFloat(formatted) * price).toString()
      } else if (isWethReward) {
        const price = parseFloat(this.pricing.wethUsd)
        usd = (parseFloat(formatted) * price).toString()
      }
    }

    return {
      raw: result,
      formatted,
      usd,
    }
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
   * Calculate WETH APR using pool price and reward rates
   * Formula: (wethRewardRatePerSecond * secondsPerYear * wethPriceInUnderlying / totalStaked) * 10000
   *
   * @param poolKey - The Uniswap V4 pool key for price discovery
   * @returns WETH APR in basis points and percentage
   */
  async calculateWethApr(poolKey: PoolKey): Promise<{
    raw: bigint
    percentage: number
  }> {
    const wethAddress = WETH(this.chainId)?.address
    if (!wethAddress) {
      throw new Error('WETH address not found for this chain')
    }

    // Get pool data and WETH reward rate
    const [poolData, wethRewardRate] = await Promise.all([
      this.getPoolData(),
      this.getRewardRatePerSecond(wethAddress),
    ])

    const totalStaked = poolData.totalStaked.raw

    // If no stakers or no WETH rewards, APR is 0
    if (totalStaked === 0n || wethRewardRate.raw === 0n) {
      return { raw: 0n, percentage: 0 }
    }

    // Quote 1 WETH to determine price in underlying tokens
    // Determine swap direction: WETH -> underlying
    const wethIsCurrency0 = wethAddress.toLowerCase() < this.tokenAddress.toLowerCase()
    const zeroForOne = wethIsCurrency0 // Swap WETH for underlying

    // Quote 1 WETH (18 decimals)
    const oneWeth = parseUnits('1', 18)

    let wethPriceInUnderlying: bigint
    try {
      const quote = await quoteV4({
        publicClient: this.publicClient,
        poolKey,
        zeroForOne,
        amountIn: oneWeth,
      })

      // amountOut is how many underlying tokens we get for 1 WETH
      wethPriceInUnderlying = quote.amountOut
    } catch (error) {
      // If quote fails, return 0 APR
      console.error('Failed to quote WETH price:', error)
      return { raw: 0n, percentage: 0 }
    }

    // Calculate annual WETH rewards (rewards per second * seconds per year)
    const secondsPerYear = BigInt(365 * 24 * 60 * 60)
    const annualWethRewards = wethRewardRate.raw * secondsPerYear

    // Convert WETH rewards to underlying token equivalent
    // wethPriceInUnderlying is already in underlying token decimals from the quote
    // annualWethRewards is in WETH (18 decimals)
    // Both need to be normalized to underlying token decimals
    const annualRewardsInUnderlying = (annualWethRewards * wethPriceInUnderlying) / BigInt(1e18)

    // Calculate APR: (annualRewardsInUnderlying / totalStaked) * 10000
    const aprBps = (annualRewardsInUnderlying * 10000n) / totalStaked

    return {
      raw: aprBps,
      percentage: Number(aprBps) / 100, // Convert bps to percentage
    }
  }
}
