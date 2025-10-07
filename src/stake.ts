import { erc20Abi, formatUnits, parseUnits } from 'viem'
import type { TransactionReceipt } from 'viem'

import { LevrStaking_v1 } from './abis'
import type { PopPublicClient, PopWalletClient } from './types'

export type StakeServiceConfig = {
  wallet: PopWalletClient
  publicClient: PopPublicClient
  stakingAddress: `0x${string}`
  tokenAddress: `0x${string}`
  tokenDecimals: number
}

export type UnstakeParams = {
  amount: number | string | bigint
  to?: `0x${string}`
}

export type ClaimParams = {
  tokens?: `0x${string}`[]
  to?: `0x${string}`
}

export class StakeService {
  private wallet: PopWalletClient
  private publicClient: PopPublicClient
  private stakingAddress: `0x${string}`
  private tokenAddress: `0x${string}`
  private tokenDecimals: number
  private userAddress: `0x${string}`

  constructor(config: StakeServiceConfig) {
    if (Object.values(config).some((value) => !value)) throw new Error('Invalid config')

    this.wallet = config.wallet
    this.publicClient = config.publicClient
    this.stakingAddress = config.stakingAddress
    this.tokenAddress = config.tokenAddress
    this.tokenDecimals = config.tokenDecimals
    this.userAddress = config.wallet.account.address
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
    const hash = await this.wallet.writeContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'claimRewards',
      args: [params?.tokens ?? [this.tokenAddress], params?.to ?? this.userAddress],
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
  async getAllowance(): Promise<{ raw: bigint; formatted: string }> {
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
  async getPoolData(): Promise<{
    totalStaked: { raw: bigint; formatted: string }
    escrowBalance: { raw: bigint; formatted: string }
    streamParams: {
      windowSeconds: number
      streamStart: bigint
      streamEnd: bigint
      isActive: boolean
    }
    rewardRatePerSecond: { raw: bigint; formatted: string }
  }> {
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
      results.map((r: any) => r.result!)

    return {
      totalStaked: {
        raw: totalStaked as bigint,
        formatted: formatUnits(totalStaked as bigint, this.tokenDecimals),
      },
      escrowBalance: {
        raw: escrowBalance as bigint,
        formatted: formatUnits(escrowBalance as bigint, this.tokenDecimals),
      },
      streamParams: {
        windowSeconds: windowSeconds as number,
        streamStart: streamStart as bigint,
        streamEnd: streamEnd as bigint,
        isActive: BigInt(Math.floor(Date.now() / 1000)) < (streamEnd as bigint),
      },
      rewardRatePerSecond: {
        raw: rewardRate as bigint,
        formatted: formatUnits(rewardRate as bigint, this.tokenDecimals),
      },
    }
  }

  /**
   * Get user data from staking contract
   */
  async getUserData(): Promise<{
    stakedBalance: { raw: bigint; formatted: string }
    aprBps: { raw: bigint; percentage: number }
  }> {
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
          args: [this.userAddress],
        },
      ],
    })

    const [stakedBalance, aprBps] = results.map((r: any) => r.result!)

    return {
      stakedBalance: {
        raw: stakedBalance as bigint,
        formatted: formatUnits(stakedBalance as bigint, this.tokenDecimals),
      },
      aprBps: {
        raw: aprBps as bigint,
        percentage: Number(aprBps as bigint) / 100, // Convert bps to percentage
      },
    }
  }

  /**
   * Get outstanding rewards for the token
   */
  async getOutstandingRewards(tokenAddress?: `0x${string}`): Promise<{
    available: { raw: bigint; formatted: string }
    pending: { raw: bigint; formatted: string }
  }> {
    const token = tokenAddress ?? this.tokenAddress
    const decimals = token === this.tokenAddress ? this.tokenDecimals : 18 // Assume 18 for other tokens

    const result = await this.publicClient.readContract({
      address: this.stakingAddress,
      abi: LevrStaking_v1,
      functionName: 'outstandingRewards',
      args: [token],
    })

    return {
      available: {
        raw: result[0],
        formatted: formatUnits(result[0], decimals),
      },
      pending: {
        raw: result[1],
        formatted: formatUnits(result[1], decimals),
      },
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
}
