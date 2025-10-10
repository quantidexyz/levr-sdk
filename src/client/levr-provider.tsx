'use client'

import type { UseQueryResult } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import React, { createContext, useContext, useEffect, useMemo } from 'react'
import type { Address } from 'viem'
import { useAccount, useChainId } from 'wagmi'

import type { BalanceResult } from '../balance'
import type { Stake } from '../stake'
import { useBalanceQuery } from './hook/use-balance'
import { useClankerTokenQuery } from './hook/use-clanker'
import { useFeeReceiversQuery } from './hook/use-fee-receivers'
import { useGovernanceQueries as useGovernanceQueriesInternal } from './hook/use-governance'
import { useProjectQuery } from './hook/use-project'
import { useProposalsQuery } from './hook/use-proposals'
import { useStakingQueries as useStakingQueriesInternal } from './hook/use-stake'

type Project = NonNullable<ReturnType<typeof useProjectQuery>['data']>

/**
 * Context value provided by LevrProvider
 */
export type LevrContextValue = {
  // Core data
  clankerToken: Address | null
  setClankerToken: (token: Address | null) => void
  chainId: number | undefined
  userAddress: Address | undefined

  // Query results
  project: UseQueryResult<Project | null>
  balances: UseQueryResult<Record<string, BalanceResult>>
  tokenData: UseQueryResult<{
    originalAdmin: Address
    admin: Address
    image: string
    metadata: string
    context: string
  } | null>

  staking: {
    allowance: UseQueryResult<{ raw: bigint; formatted: string }>
    poolData: UseQueryResult<any>
    userData: UseQueryResult<any>
    outstandingRewardsStaking: UseQueryResult<{
      available: { raw: bigint; formatted: string }
      pending: { raw: bigint; formatted: string }
    }>
    outstandingRewardsWeth: UseQueryResult<{
      available: { raw: bigint; formatted: string }
      pending: { raw: bigint; formatted: string }
    } | null>
    claimableRewardsStaking: UseQueryResult<any>
    claimableRewardsWeth: UseQueryResult<any>
  }

  governance: {
    currentCycleId: UseQueryResult<bigint>
    addresses: UseQueryResult<{
      treasury: Address
      factory: Address
      stakedToken: Address
    }>
    airdropStatus: UseQueryResult<any>
  }

  proposals: UseQueryResult<any>
  feeReceivers: UseQueryResult<any>

  // Refetch methods
  refetch: {
    all: () => Promise<void>
    project: () => Promise<void>
    balances: () => Promise<void>
    governance: () => Promise<void>
    staking: () => Promise<void>
    proposals: () => Promise<void>
    feeReceivers: () => Promise<void>
    afterStake: () => Promise<void>
    afterSwap: () => Promise<void>
    afterGovernance: () => Promise<void>
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
}

/**
 * Centralized provider for all Levr blockchain queries
 * Eliminates query duplication and provides unified refetch management
 */
export function LevrProvider({ children, enabled = true }: LevrProviderProps) {
  const [clankerToken, setClankerToken] = React.useState<Address | null>(null)
  const queryClient = useQueryClient()
  const { address: userAddress } = useAccount()
  const chainId = useChainId()

  // ========================================
  // USE INTERNAL QUERY HOOKS
  // ========================================

  const project = useProjectQuery({ clankerToken, enabled })
  const tokenData = useClankerTokenQuery({ clankerToken, enabled })
  const balancesQuery = useBalanceQuery({
    clankerToken,
    projectTokenDecimals: project.data?.token.decimals,
    enabled,
  })

  const staking = useStakingQueriesInternal({
    clankerToken,
    projectData: project.data,
    enabled,
  })

  const governance = useGovernanceQueriesInternal({
    clankerToken,
    projectData: project.data,
    enabled,
  })

  const proposalsQueryResult = useProposalsQuery({
    governorAddress: project.data?.governor,
    tokenDecimals: project.data?.token.decimals,
    enabled,
  })

  const feeReceiversQuery = useFeeReceiversQuery({
    clankerToken,
    enabled,
  })

  // ========================================
  // REFETCH METHODS
  // ========================================

  const refetchMethods = useMemo(
    () => ({
      all: async () => {
        await queryClient.invalidateQueries({ refetchType: 'active' })
      },
      project: async () => {
        await project.refetch()
      },
      balances: async () => {
        await balancesQuery.refetch()
      },
      governance: async () => {
        await Promise.all([
          governance.currentCycleId.refetch(),
          governance.addresses.refetch(),
          governance.airdropStatus.refetch(),
        ])
      },
      staking: async () => {
        await Promise.all([
          staking.allowance.refetch(),
          staking.poolData.refetch(),
          staking.userData.refetch(),
          staking.outstandingRewardsStaking.refetch(),
          staking.outstandingRewardsWeth.refetch(),
          staking.claimableRewardsStaking.refetch(),
          staking.claimableRewardsWeth.refetch(),
        ])
      },
      proposals: async () => {
        await proposalsQueryResult.refetch()
      },
      feeReceivers: async () => {
        await feeReceiversQuery.refetch()
      },
      // Smart cross-domain refetches
      afterStake: async () => {
        await Promise.all([
          balancesQuery.refetch(),
          staking.poolData.refetch(),
          staking.userData.refetch(),
          staking.allowance.refetch(),
          staking.outstandingRewardsStaking.refetch(),
          staking.outstandingRewardsWeth.refetch(),
          staking.claimableRewardsStaking.refetch(),
          staking.claimableRewardsWeth.refetch(),
          project.refetch(), // Treasury might have changed
        ])
      },
      afterSwap: async () => {
        await Promise.all([
          balancesQuery.refetch(),
          project.refetch(), // Pool data might have changed
        ])
      },
      afterGovernance: async () => {
        await Promise.all([
          governance.currentCycleId.refetch(),
          governance.addresses.refetch(),
          governance.airdropStatus.refetch(),
          proposalsQueryResult.refetch(),
          project.refetch(), // Treasury might have changed
          staking.userData.refetch(), // Voting power might have changed
        ])
      },
    }),
    [
      queryClient,
      project,
      balancesQuery,
      governance,
      staking,
      proposalsQueryResult,
      feeReceiversQuery,
    ]
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
      project,
      balances: balancesQuery,
      tokenData,
      staking: {
        allowance: staking.allowance,
        poolData: staking.poolData,
        userData: staking.userData,
        outstandingRewardsStaking: staking.outstandingRewardsStaking,
        outstandingRewardsWeth: staking.outstandingRewardsWeth,
        claimableRewardsStaking: staking.claimableRewardsStaking,
        claimableRewardsWeth: staking.claimableRewardsWeth,
      },
      governance: {
        currentCycleId: governance.currentCycleId,
        addresses: governance.addresses,
        airdropStatus: governance.airdropStatus,
      },
      proposals: proposalsQueryResult,
      feeReceivers: feeReceiversQuery,
      refetch: refetchMethods,
      stakeService: staking.stakeService,
    }),
    [
      clankerToken,
      setClankerToken,
      chainId,
      userAddress,
      project,
      balancesQuery,
      tokenData,
      staking,
      governance,
      proposalsQueryResult,
      feeReceiversQuery,
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
 * This allows components to update the global token context
 */
export const useSetClankerToken = () => useLevrContext().setClankerToken

/**
 * Hook to access refetch methods from LevrProvider
 */
export const useLevrRefetch = () => useLevrContext().refetch
