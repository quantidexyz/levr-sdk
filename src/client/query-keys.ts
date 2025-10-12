'use client'

import type { Address } from 'viem'

/**
 * Centralized query key factory for all Levr queries
 * Ensures consistent query keys across the application
 */
export const queryKeys = {
  /**
   * Project query key
   */
  project: (token: Address, chainId: number) => ['project', token, chainId] as const,

  /**
   * User query keys (composable data group)
   */
  user: (userAddress: Address, token: Address, staking: Address, treasury: Address) =>
    ['user', userAddress, token, staking, treasury] as const,

  /**
   * Pool query keys
   */
  pool: (poolKey?: unknown) => ['pool', poolKey] as const,

  /**
   * Balance query keys (legacy - kept for backward compatibility)
   */
  balance: (tokens: string, userAddress: Address) => ['balance', tokens, userAddress] as const,

  /**
   * Clanker SDK query keys
   */
  clanker: (chainId?: number, walletAddress?: Address) =>
    ['clanker', chainId, walletAddress] as const,

  clankerToken: (tokenAddress?: Address) => ['clanker-token', tokenAddress] as const,

  /**
   * Staking query keys
   */
  staking: {
    allowance: (stakingAddress?: Address, tokenAddress?: Address, userAddress?: Address) =>
      ['staking', 'allowance', stakingAddress, tokenAddress, userAddress] as const,
    poolData: (stakingAddress?: Address, tokenAddress?: Address) =>
      ['staking', 'poolData', stakingAddress, tokenAddress] as const,
    userData: (stakingAddress?: Address, userAddress?: Address) =>
      ['staking', 'userData', stakingAddress, userAddress] as const,
    outstandingRewards: (stakingAddress?: Address, tokenAddress?: Address, userAddress?: Address) =>
      ['staking', 'outstandingRewards', stakingAddress, tokenAddress, userAddress] as const,
    claimableRewards: (stakingAddress?: Address, tokenAddress?: Address, userAddress?: Address) =>
      ['staking', 'claimableRewards', stakingAddress, tokenAddress, userAddress] as const,
  },

  /**
   * Governance query keys
   */
  governance: {
    proposal: (governorAddress: Address, proposalId?: string) =>
      ['governance', 'proposal', governorAddress, proposalId] as const,
    currentCycleId: (governorAddress: Address) =>
      ['governance', 'currentCycleId', governorAddress] as const,
    factory: (governorAddress: Address) => ['governance', 'factory', governorAddress] as const,
    addresses: (governorAddress: Address) => ['governance', 'addresses', governorAddress] as const,
    airdropStatus: (governorAddress: Address, clankerToken: Address) =>
      ['governance', 'airdropStatus', governorAddress, clankerToken] as const,
    proposalsForCycle: (governorAddress: Address, cycleId?: string) =>
      ['governance', 'proposalsForCycle', governorAddress, cycleId] as const,
    winner: (governorAddress: Address, cycleId?: string) =>
      ['governance', 'winner', governorAddress, cycleId] as const,
    userVoteInCycle: (governorAddress: Address, cycleId?: string, userAddress?: Address) =>
      ['governance', 'userVoteInCycle', governorAddress, cycleId, userAddress] as const,
  },

  /**
   * Proposals query keys
   */
  proposals: (
    governorAddress: Address,
    tokenDecimals: number,
    fromBlock?: string,
    toBlock?: string,
    pageSize?: number
  ) => ['proposals', governorAddress, tokenDecimals, fromBlock, toBlock, pageSize] as const,

  /**
   * Projects query keys
   */
  projects: (factoryAddress?: Address, chainId?: number) =>
    ['projects', factoryAddress, chainId] as const,

  /**
   * Swap query keys
   */
  swap: {
    quote: (
      chainId?: number,
      poolKey?: unknown,
      zeroForOne?: boolean,
      amountIn?: string,
      amountInDecimals?: number
    ) => ['swap', 'quote', chainId, poolKey, zeroForOne, amountIn, amountInDecimals] as const,
  },

  /**
   * Fee receivers query keys
   */
  feeReceivers: (clankerToken?: Address, userAddress?: Address, chainId?: number) =>
    ['fee-receivers', clankerToken, userAddress, chainId] as const,
} as const
