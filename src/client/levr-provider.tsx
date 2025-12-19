'use client'

import type { UseQueryResult } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import type { Address } from 'viem'
import { useAccount, useChainId } from 'wagmi'

import type { AirdropStatus } from '..'
import type { FactoryConfig } from '../factory'
import type { Project } from '../project'
import type { ProposalsResult } from '../proposal'
import type { User } from '../user'
import { useAirdropStatusQuery } from '.'
import { useFactoryConfigQuery } from './hook/use-factory'
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

  // Governance cycle management
  selectedCycleId: bigint | null
  setSelectedCycleId: (cycleId: bigint | null) => void

  // Data queries (hierarchical structure)
  user: UseQueryResult<User | null>
  project: UseQueryResult<Project | null>
  proposals: UseQueryResult<ProposalsResult | null>
  airdropStatus: UseQueryResult<AirdropStatus | null>
  factoryConfig: UseQueryResult<FactoryConfig | null>

  // Action-based refetch methods
  refetch: {
    // Core refetches
    all: () => Promise<void>
    user: () => Promise<void>
    project: () => Promise<void>
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
  ipfsSearchUrl,
  ipfsJsonUrl,
}: LevrProviderProps) {
  const [clankerToken, setClankerToken] = React.useState<Address | null>(null)
  const [selectedCycleId, setSelectedCycleId] = React.useState<bigint | null>(1n)
  const queryClient = useQueryClient()
  const { address: userAddress } = useAccount()
  const chainId = useChainId()

  // ========================================
  // USE INTERNAL QUERY HOOKS
  // ========================================

  const project = useProjectQuery({ clankerToken, enabled })
  const airdropStatus = useAirdropStatusQuery({
    project: project.data,
    enabled,
    ipfsSearchUrl,
    ipfsJsonUrl,
  })
  const userQuery = useUserQuery({ project: project.data, enabled })
  const proposalsQuery = useProposalsQuery({
    project: project.data,
    cycleId: selectedCycleId ?? undefined,
    enabled,
  })
  const factoryConfig = useFactoryConfigQuery({ enabled })

  const projectRefetch = project.refetch
  const userRefetch = userQuery.refetch
  const proposalsRefetch = proposalsQuery.refetch
  const airdropRefetch = airdropStatus.refetch

  const refetchAll = useCallback(async () => {
    await queryClient.invalidateQueries({ refetchType: 'active' })
  }, [queryClient])

  const runRefetchChain = useCallback(
    async (...refetchFns: Array<(() => Promise<unknown>) | undefined | null>) => {
      for (const refetchFn of refetchFns) {
        if (!refetchFn) continue
        await refetchFn()
      }
    },
    []
  )

  // ========================================
  // REFETCH METHODS
  // ========================================

  const refetchMethods = useMemo(
    () => ({
      // Core refetches
      all: refetchAll,
      user: () => runRefetchChain(userRefetch),
      project: () => runRefetchChain(projectRefetch),
      proposals: () => runRefetchChain(proposalsRefetch),

      // Action-based refetches
      afterTrade: () => runRefetchChain(userRefetch, projectRefetch),
      afterStake: () => runRefetchChain(userRefetch, projectRefetch),
      afterUnstake: () => runRefetchChain(userRefetch, projectRefetch),
      afterClaim: () => runRefetchChain(userRefetch, projectRefetch),
      afterAccrue: () => runRefetchChain(projectRefetch),
      afterVote: () => runRefetchChain(userRefetch, proposalsRefetch),
      afterProposal: () => runRefetchChain(proposalsRefetch, projectRefetch),
      afterExecute: () => runRefetchChain(projectRefetch, proposalsRefetch),
      afterAirdrop: () => runRefetchChain(projectRefetch, airdropRefetch),
    }),
    [refetchAll, runRefetchChain, userRefetch, projectRefetch, proposalsRefetch, airdropRefetch]
  )

  // Auto-refetch on wallet/chain change
  useEffect(() => {
    if (!enabled) return
    refetchAll()
  }, [enabled, refetchAll, userAddress, chainId])

  const contextValue: LevrContextValue = useMemo(
    () => ({
      clankerToken,
      setClankerToken,
      chainId,
      userAddress,

      // Governance cycle management
      selectedCycleId,
      setSelectedCycleId,

      // Data queries
      user: userQuery,
      project,
      proposals: proposalsQuery,
      airdropStatus,
      factoryConfig,

      // Refetch methods
      refetch: refetchMethods,
    }),
    [
      clankerToken,
      setClankerToken,
      chainId,
      userAddress,
      selectedCycleId,
      setSelectedCycleId,
      userQuery,
      project,
      proposalsQuery,
      airdropStatus,
      factoryConfig,
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
