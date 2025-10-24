'use client'

import type { UseQueryResult } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import React, { createContext, useContext, useEffect, useMemo } from 'react'
import type { Address } from 'viem'
import { base } from 'viem/chains'
import { useAccount, useChainId } from 'wagmi'

import type { AirdropStatus } from '..'
import type { PoolData } from '../pool'
import type { Project } from '../project'
import type { ProposalsResult } from '../proposal'
import type { User } from '../user'
import { getPublicClient } from '../util'
import { useAirdropStatusQuery } from '.'
import { usePoolQuery } from './hook/use-pool'
import { useProjectQuery } from './hook/use-project'
import { useProposalsQuery } from './hook/use-proposal'
import { useUserQuery } from './hook/use-user'

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

  // Data queries (hierarchical structure)
  user: UseQueryResult<User | null>
  project: UseQueryResult<Project | null>
  pool: UseQueryResult<PoolData | null>
  proposals: UseQueryResult<ProposalsResult | null>
  airdropStatus: UseQueryResult<AirdropStatus | null>

  // Action-based refetch methods
  refetch: {
    // Core refetches
    all: () => Promise<void>
    user: () => Promise<void>
    project: () => Promise<void>
    pool: () => Promise<void>
    proposals: () => Promise<void>

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
  /**
   * Full URL to /api/ipfs-search endpoint
   * Required for multi-recipient airdrop proof generation
   */
  ipfsSearchUrl?: string
  /**
   * Full URL to /api/ipfs-json endpoint
   * Required for multi-recipient airdrop proof generation
   */
  ipfsJsonUrl?: string
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
  ipfsSearchUrl,
  ipfsJsonUrl,
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
  const airdropStatus = useAirdropStatusQuery({
    project: project.data,
    enabled,
    ipfsSearchUrl,
    ipfsJsonUrl,
  })
  const userQuery = useUserQuery({ project: project.data, enabled })
  const poolQuery = usePoolQuery({ project: project.data, enabled })
  const proposalsQuery = useProposalsQuery({
    project: project.data,
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
        await proposalsQuery.refetch()
      },

      // Action-based refetches
      afterTrade: async () => {
        await Promise.all([
          userQuery.refetch(), // Balances changed
          poolQuery.refetch(), // Pool state changed (price impact)
          project.refetch(), // Staking stats might have changed
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
        await userQuery.refetch() // Balances, claimable rewards changed
      },
      afterAccrue: async () => {
        await Promise.all([
          project.refetch(), // Outstanding rewards changed (pool-level)
        ])
      },
      afterVote: async () => {
        await Promise.all([
          userQuery.refetch(), // User governance data (vote receipt)
          proposalsQuery.refetch(), // Proposal votes updated
        ])
      },
      afterProposal: async () => {
        await Promise.all([
          proposalsQuery.refetch(), // New proposal added
          project.refetch(), // currentCycleId might have changed
        ])
      },
      afterExecute: async () => {
        await Promise.all([
          project.refetch(), // Treasury changed + currentCycleId (new cycle starts)
          proposalsQuery.refetch(), // Proposal executed
        ])
      },
      afterAirdrop: async () => {
        await Promise.all([
          project.refetch(), // Treasury changed
          airdropStatus.refetch(), // Treasury balance, airdrop status changed
        ])
      },
    }),
    [queryClient, project, userQuery, poolQuery, proposalsQuery, airdropStatus]
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

      // Data queries
      user: userQuery,
      project,
      pool: poolQuery,
      proposals: proposalsQuery,
      airdropStatus,

      // Refetch methods
      refetch: refetchMethods,
    }),
    [
      clankerToken,
      setClankerToken,
      chainId,
      userAddress,
      userQuery,
      project,
      poolQuery,
      proposalsQuery,
      airdropStatus,
      refetchMethods,
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
 * Automatically updates when the token address changes
 * @param clankerToken - Token address to set (null to clear)
 */
export const useSetClankerToken = (clankerToken?: Address | null) => {
  const { setClankerToken } = useLevrContext()

  React.useEffect(() => {
    setClankerToken(clankerToken ?? null)
  }, [clankerToken, setClankerToken])
}

/**
 * Hook to access refetch methods from LevrProvider
 */
export const useLevrRefetch = () => useLevrContext().refetch
