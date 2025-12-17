'use client'

import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import type { Address } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import type { Project, RegisteredStaticProject, StaticProject } from '../..'
import { getLevrProjectsFields, type LevrProjectData } from '../../graphql/fields/project'
import { getProject, getStaticProject } from '../../project'
import type { PopPublicClient } from '../../types'
import { queryKeys } from '../query-keys'
import { useGraphQLSubscription } from './use-subscription'

/** Indexed stats available from GraphQL subscription */
export type IndexedStats = {
  verified: boolean
  totalStaked: bigint
  totalProposals: bigint
  stakerCount: bigint
  currentCycleId: bigint
  activeBoostProposals: bigint
  activeTransferProposals: bigint
  createdAt: Date
  updatedAt: Date
}

/** Project data from indexer, adapted for UI consumption */
export type IndexedProject = Omit<
  Project,
  | 'forwarder'
  | 'pool'
  | 'pricing'
  | 'treasuryStats'
  | 'stakingStats'
  | 'governanceStats'
  | 'feeReceivers'
  | 'feeSplitter'
  | 'blockTimestamp'
> & {
  indexedStats: IndexedStats
}

export type UseStaticProjectQueryParams = {
  clankerToken: Address | null
  enabled?: boolean
}

/**
 * Internal: Fetches static project data that doesn't change frequently
 * Only refetches when the token address changes
 */
export function useStaticProjectQuery({
  clankerToken,
  enabled: e = true,
}: UseStaticProjectQueryParams) {
  const publicClient = usePublicClient()
  const { address: userAddress } = useAccount()
  const chainId = publicClient?.chain?.id

  const enabled = !!publicClient && !!clankerToken && !!chainId && e

  return useQuery<StaticProject | null>({
    queryKey: queryKeys.staticProject(clankerToken!, chainId!, userAddress ?? null),
    enabled,
    queryFn: () =>
      getStaticProject({
        publicClient: publicClient!,
        clankerToken: clankerToken!,
        userAddress, // Pass userAddress so areYouAnAdmin works out of the box
      }),
    staleTime: Infinity, // Static data never goes stale automatically
  })
}

export type UseProjectQueryParams = {
  clankerToken: Address | null
  oraclePublicClient: PopPublicClient
  enabled?: boolean
}

/**
 * Internal: Creates project query with all logic
 * Used by LevrProvider
 * Fetches dynamic stats (treasury, staking, governance, pricing) using static data from useStaticProjectQuery
 */
export function useProjectQuery({
  clankerToken,
  oraclePublicClient,
  enabled: e = true,
}: UseProjectQueryParams) {
  const publicClient = usePublicClient()
  const chainId = publicClient?.chain?.id

  // Fetch static data (only refetches when token changes)
  const { data: staticProject, refetch: refetchStatic } = useStaticProjectQuery({
    clankerToken,
    enabled: e,
  })

  const registeredStaticProject = staticProject?.isRegistered
    ? (staticProject as RegisteredStaticProject)
    : null

  const enabled = !!publicClient && !!clankerToken && !!chainId && !!registeredStaticProject && e

  const query = useQuery({
    queryKey: queryKeys.project(clankerToken!, chainId!),
    enabled,
    queryFn: () =>
      getProject({
        publicClient: publicClient!,
        staticProject: registeredStaticProject!,
        oraclePublicClient: oraclePublicClient,
      }),
    staleTime: 30_000, // 30 seconds cache for dynamic data
  })

  return {
    ...query,
    refetchStatic,
  }
}

export type UseProjectsParams = {
  search?: string
  offset?: number
  limit?: number
  enabled?: boolean
}

export type UseProjectsReturnType = {
  data: { projects: IndexedProject[] } | null
  isLoading: boolean
  error: Error | null
}

/**
 * Adapts indexed project data to the Project shape expected by UI components
 */
function adaptIndexedProject(data: LevrProjectData): IndexedProject | null {
  const token = data.clankerToken
  if (!token) return null

  // Parse metadata JSON if present
  let metadata: Project['token']['metadata'] = null
  if (token.metadata && typeof token.metadata === 'string') {
    try {
      metadata = JSON.parse(token.metadata)
    } catch {
      // Leave as null if parsing fails
    }
  }

  return {
    chainId: Number(data.chainId),
    treasury: data.treasury_id as `0x${string}`,
    governor: data.governor_id as `0x${string}`,
    staking: data.staking_id as `0x${string}`,
    stakedToken: data.stakedToken_id as `0x${string}`,
    factory: '' as `0x${string}`,
    token: {
      address: token.address as `0x${string}`,
      decimals: token.decimals ?? 18,
      name: token.name ?? '',
      symbol: token.symbol ?? '',
      totalSupply: token.totalSupply ? BigInt(token.totalSupply) : 0n,
      metadata,
      imageUrl: token.imageUrl ?? undefined,
      originalAdmin: (token.originalAdmin ?? '') as `0x${string}`,
      admin: (token.admin ?? '') as `0x${string}`,
      context: token.context ?? '',
    },
    indexedStats: {
      verified: data.verified ?? false,
      totalStaked: data.totalStaked ? BigInt(data.totalStaked) : 0n,
      totalProposals: data.totalProposals ? BigInt(data.totalProposals) : 0n,
      stakerCount: data.stakerCount ? BigInt(data.stakerCount) : 0n,
      currentCycleId: data.currentCycleId ? BigInt(data.currentCycleId) : 1n,
      activeBoostProposals: data.activeBoostProposals ? BigInt(data.activeBoostProposals) : 0n,
      activeTransferProposals: data.activeTransferProposals
        ? BigInt(data.activeTransferProposals)
        : 0n,
      createdAt: new Date(Number(data.createdAt ?? 0) * 1000),
      updatedAt: new Date(Number(data.updatedAt ?? 0) * 1000),
    },
  }
}

/**
 * Hook for fetching projects with real-time updates via GraphQL subscription
 * Supports search, pagination, and orders by last updated first
 */
export function useProjects({
  search,
  offset,
  limit,
  enabled: e = true,
}: UseProjectsParams = {}): UseProjectsReturnType {
  const fields = React.useMemo(
    () => getLevrProjectsFields({ search, offset, limit }),
    [search, offset, limit]
  )

  const {
    data: rawData,
    isLoading,
    error: rawError,
  } = useGraphQLSubscription({
    fields,
    enabled: e,
  })

  const data = React.useMemo(() => {
    if (!rawData?.LevrProject) return null
    const projects = rawData.LevrProject.map(adaptIndexedProject).filter(
      (p): p is IndexedProject => p !== null
    )
    return { projects }
  }, [rawData])

  const error = React.useMemo(() => {
    if (!rawError) return null
    return new Error(rawError)
  }, [rawError])

  return {
    data,
    isLoading,
    error,
  }
}
