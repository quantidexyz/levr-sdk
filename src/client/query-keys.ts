'use client'

import type { Address } from 'viem'

/**
 * Centralized query key factory for all Levr queries
 * Ensures consistent query keys across the application
 */
export const queryKeys = {
  /**
   * Static project query key (doesn't change frequently - includes feeSplitter config)
   */
  staticProject: (token: Address, chainId: number, userAddress?: Address | null) =>
    ['static-project', token, chainId, userAddress ?? null] as const,

  /**
   * Project query key (dynamic data - treasury stats, staking stats, etc.)
   */
  project: (token: Address, chainId: number) => ['project', token, chainId] as const,

  /**
   * User query keys (composable data group)
   */
  user: (userAddress: Address, token: Address, staking: Address, treasury: Address) =>
    ['user', userAddress, token, staking, treasury] as const,

  /**
   * Clanker SDK query keys
   */
  clanker: (chainId?: number, walletAddress?: Address) =>
    ['clanker', chainId, walletAddress] as const,

  clankerToken: (tokenAddress?: Address) => ['clanker-token', tokenAddress] as const,

  /**
   * Governance query keys (for dynamic per-component queries)
   */
  governance: {
    proposal: (governorAddress?: Address, proposalId?: string) =>
      ['governance', 'proposal', governorAddress, proposalId] as const,
    proposalsForCycle: (governorAddress?: Address, cycleId?: string) =>
      ['governance', 'proposalsForCycle', governorAddress, cycleId] as const,
    winner: (governorAddress?: Address, cycleId?: string) =>
      ['governance', 'winner', governorAddress, cycleId] as const,
    userVoteInCycle: (governorAddress?: Address, cycleId?: string, userAddress?: Address) =>
      ['governance', 'userVoteInCycle', governorAddress, cycleId, userAddress] as const,
  },

  /**
   * Proposals query keys
   */
  proposals: (chainId?: number, cycleId?: string, userAddress?: Address) =>
    ['proposals', chainId, cycleId, userAddress] as const,

  proposal: (chainId?: number, cycleId?: string, proposalId?: string) =>
    ['proposal', chainId, cycleId, proposalId] as const,

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
   * Factory config query keys (fetched from indexer)
   */
  factoryConfig: () => ['factory-config'] as const,

  /**
   * Vault query keys
   */
  vault: (token?: Address, chainId?: number) => ['vault', token, chainId] as const,

  /**
   * GraphQL subscription query keys
   */
  subscription: {
    metrics: () => ['sub:metrics'] as const,
    projects: (
      search?: string,
      offset?: number,
      limit?: number,
      sortBy?: string,
      sortDirection?: string
    ) =>
      [
        'sub:projects',
        search ?? '',
        offset ?? 0,
        limit ?? 0,
        sortBy ?? 'stakerCount',
        sortDirection ?? 'desc',
      ] as const,
  },
} as const
