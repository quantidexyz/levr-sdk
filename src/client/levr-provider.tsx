'use client'

import type { UseQueryResult } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import React, { createContext, useContext, useEffect, useMemo } from 'react'
import type { Address } from 'viem'
import { base } from 'viem/chains'
import { useAccount, useChainId } from 'wagmi'

import type { PoolData } from '../pool'
import type { ProposalsResult } from '../proposals'
import type { Stake } from '../stake'
import type { UserData } from '../user'
import { getPublicClient } from '../util'
import { useClankerTokenQuery } from './hook/use-clanker'
import { useGovernanceQueries } from './hook/use-governance'
import { usePoolQuery } from './hook/use-pool'
import { useProjectQuery } from './hook/use-project'
import { useProposalsQuery } from './hook/use-proposals'
import { useStakingQueries } from './hook/use-stake'
import { useUserQuery } from './hook/use-user'

type Project = NonNullable<ReturnType<typeof useProjectQuery>['data']>

/**
 * Context value provided by LevrProvider
 * Provides dual access: hierarchical (user.balances) + flat (balances)
 */
export type LevrContextValue = {
  // Core data
  clankerToken: Address | null
  setClankerToken: (token: Address | null) => void
  chainId: number | undefined
  userAddress: Address | undefined

  // Hierarchical access (new structure)
  user: UseQueryResult<UserData | null>
  project: UseQueryResult<Project | null>
  pool: UseQueryResult<PoolData | null>
  proposals: UseQueryResult<ProposalsResult | null>
  governance: {
    currentCycleId: UseQueryResult<bigint>
    addresses: UseQueryResult<{
      treasury: Address
      factory: Address
      stakedToken: Address
    }>
  }
  tokenData: UseQueryResult<{
    originalAdmin: Address
    admin: Address
    image: string
    metadata: string
    context: string
  } | null>

  // Flat access (backward compatibility + convenience)
  // Note: These are derived from user query, so refetch user to update them
  balances: {
    data: UserData['balances'] | null
    isLoading: boolean
    error: Error | null
  }
  stakingData: {
    data: UserData['staking'] | null
    isLoading: boolean
    error: Error | null
  }
  governanceData: {
    data: UserData['governance'] | null
    isLoading: boolean
    error: Error | null
  }

  // Action-based refetch methods
  refetch: {
    // Core refetches
    all: () => Promise<void>
    user: () => Promise<void>
    project: () => Promise<void>
    pool: () => Promise<void>
    proposals: () => Promise<void>
    governance: () => Promise<void>

    // Action-based refetches
    afterTrade: () => Promise<void>
    afterStake: () => Promise<void>
    afterUnstake: () => Promise<void>
    afterClaim: () => Promise<void>
    afterAccrue: () => Promise<void>
    afterVote: () => Promise<void>
    afterProposal: () => Promise<void>
    afterExecute: () => Promise<void>
    afterAirdrop: () => Promise<void>
  }

  // Helper instances
  stakeService: Stake | null
}

const LevrContext = createContext<LevrContextValue | null>(null)

export type LevrProviderProps = {
  children: React.ReactNode
  /**
   * Enable/disable all queries
   * @default true
   */
  enabled?: boolean
  /**
   * Chain ID for price oracle (WETH/USDC)
   * @default 8453 (Base mainnet)
   */
  oracleChainId?: number
  /**
   * Optional RPC URL for oracle client
   * If not provided, uses public RPC endpoints
   */
  oracleRpcUrl?: string
}

/**
 * Centralized provider for all Levr blockchain queries
 * Eliminates query duplication and provides unified refetch management
 */
export function LevrProvider({
  children,
  enabled = true,
  oracleChainId = base.id,
  oracleRpcUrl,
}: LevrProviderProps) {
  const [clankerToken, setClankerToken] = React.useState<Address | null>(null)
  const queryClient = useQueryClient()
  const { address: userAddress } = useAccount()
  const chainId = useChainId()

  // Create oracle public client for WETH/USD pricing
  const oraclePublicClient = useMemo(() => {
    return getPublicClient(oracleChainId, oracleRpcUrl)
  }, [oracleChainId, oracleRpcUrl])

  // ========================================
  // USE INTERNAL QUERY HOOKS
  // ========================================

  const project = useProjectQuery({ clankerToken, oraclePublicClient, enabled })
  const tokenData = useClankerTokenQuery({ clankerToken, enabled })
  const userQuery = useUserQuery({ project: project.data, enabled })
  const poolQuery = usePoolQuery({ project: project.data, enabled })
  const proposalsQueryResult = useProposalsQuery({
    governorAddress: project.data?.governor,
    tokenDecimals: project.data?.token.decimals,
    enabled,
  })

  // Global governance queries (not user-specific)
  const governance = useGovernanceQueries({
    clankerToken,
    projectData: project.data,
    enabled,
  })

  // Keep staking service for backward compatibility in public hooks
  const staking = useStakingQueries({
    clankerToken,
    projectData: project.data,
    enabled,
  })

  // ========================================
  // REFETCH METHODS
  // ========================================

  const refetchMethods = useMemo(
    () => ({
      // Core refetches
      all: async () => {
        await queryClient.invalidateQueries({ refetchType: 'active' })
      },
      user: async () => {
        await userQuery.refetch()
      },
      project: async () => {
        await project.refetch()
      },
      pool: async () => {
        await poolQuery.refetch()
      },
      proposals: async () => {
        await proposalsQueryResult.refetch()
      },
      governance: async () => {
        await Promise.all([governance.currentCycleId.refetch(), governance.addresses.refetch()])
      },

      // Action-based refetches
      afterTrade: async () => {
        await Promise.all([
          userQuery.refetch(), // Balances changed
          poolQuery.refetch(), // Pool state changed (price impact)
        ])
      },
      afterStake: async () => {
        await Promise.all([
          userQuery.refetch(), // Balances, staking, voting power changed
          project.refetch(), // Treasury might have changed
        ])
      },
      afterUnstake: async () => {
        await Promise.all([
          userQuery.refetch(), // Balances, staking, voting power changed
          project.refetch(), // Treasury might have changed
        ])
      },
      afterClaim: async () => {
        await Promise.all([
          userQuery.refetch(), // Balances, claimable rewards changed
        ])
      },
      afterAccrue: async () => {
        await Promise.all([
          userQuery.refetch(), // Outstanding/claimable rewards changed
        ])
      },
      afterVote: async () => {
        await Promise.all([
          userQuery.refetch(), // User governance data (vote receipt)
          proposalsQueryResult.refetch(), // Proposal votes updated
        ])
      },
      afterProposal: async () => {
        await Promise.all([
          proposalsQueryResult.refetch(), // New proposal added
          governance.currentCycleId.refetch(), // Cycle might have changed
        ])
      },
      afterExecute: async () => {
        await Promise.all([
          project.refetch(), // Treasury changed (transfer) or staking (boost)
          proposalsQueryResult.refetch(), // Proposal executed
          userQuery.refetch(), // Staking rewards might have changed (if boost)
          governance.currentCycleId.refetch(), // New cycle might start
        ])
      },
      afterAirdrop: async () => {
        await Promise.all([
          userQuery.refetch(), // Balances, airdrop status changed
        ])
      },
    }),
    [queryClient, project, userQuery, poolQuery, proposalsQueryResult, governance]
  )

  // Auto-refetch on wallet/chain change
  useEffect(() => {
    if (enabled) {
      refetchMethods.all()
    }
  }, [userAddress, chainId])

  const contextValue: LevrContextValue = useMemo(
    () => ({
      clankerToken,
      setClankerToken,
      chainId,
      userAddress,

      // Hierarchical access
      user: userQuery,
      project,
      pool: poolQuery,
      proposals: proposalsQueryResult,
      governance: {
        currentCycleId: governance.currentCycleId,
        addresses: governance.addresses,
      },
      tokenData,

      // Flat access (backward compatibility + convenience)
      balances: {
        data: userQuery.data?.balances || null,
        isLoading: userQuery.isLoading,
        error: userQuery.error,
      },
      stakingData: {
        data: userQuery.data?.staking || null,
        isLoading: userQuery.isLoading,
        error: userQuery.error,
      },
      governanceData: {
        data: userQuery.data?.governance || null,
        isLoading: userQuery.isLoading,
        error: userQuery.error,
      },

      refetch: refetchMethods,
      stakeService: staking.stakeService,
    }),
    [
      clankerToken,
      setClankerToken,
      chainId,
      userAddress,
      userQuery,
      project,
      poolQuery,
      proposalsQueryResult,
      governance,
      tokenData,
      refetchMethods,
      staking.stakeService,
    ]
  )

  return <LevrContext.Provider value={contextValue}>{children}</LevrContext.Provider>
}

/**
 * Hook to access Levr context
 * @throws Error if used outside LevrProvider
 */
export function useLevrContext(): LevrContextValue {
  const context = useContext(LevrContext)
  if (!context) {
    throw new Error('Levr hooks must be used within a LevrProvider')
  }
  return context
}

/**
 * Hook to set the current clanker token
 * This allows components to update the global token context
 */
export const useSetClankerToken = () => useLevrContext().setClankerToken

/**
 * Hook to access refetch methods from LevrProvider
 */
export const useLevrRefetch = () => useLevrContext().refetch
