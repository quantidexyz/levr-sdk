'use client'

import { useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient } from 'wagmi'

import type { Project } from '../..'
import { proposal, proposals } from '../../proposal'
import { useLevrContext } from '..'
import { queryKeys } from '../query-keys'

export type UseProposalsQueryParams = {
  project: Project | null | undefined
  cycleId?: bigint
  enabled?: boolean
}

export type UseProposalParams = {
  proposalId?: bigint
  enabled?: boolean
}

/**
 * Internal: Creates proposals query with all logic
 * Used by LevrProvider
 * Gets proposals for specified cycle (or current cycle if not provided) with enriched data in single multicall
 * Includes vote receipts if user is connected
 */
export function useProposalsQuery({
  project,
  cycleId,
  enabled: e = true,
}: UseProposalsQueryParams) {
  const publicClient = usePublicClient()
  const { address: userAddress } = useAccount()

  // Use provided cycleId or fall back to current cycle
  const effectiveCycleId = cycleId ?? project?.governanceStats?.currentCycleId

  return useQuery({
    queryKey: queryKeys.proposals(project?.chainId, effectiveCycleId?.toString(), userAddress),
    queryFn: async () => {
      return proposals({
        publicClient: publicClient!,
        governorAddress: project!.governor,
        tokenDecimals: project!.token.decimals,
        pricing: project!.pricing,
        cycleId: effectiveCycleId,
        pageSize: 50,
        userAddress, // Include vote receipts if user is connected
      })
    },
    enabled: e && !!publicClient && !!project! && effectiveCycleId !== undefined,
    retry: 1,
    staleTime: 5000,
    refetchInterval: 30000,
  })
}

export function useProposal({ proposalId, enabled: e = true }: UseProposalParams) {
  const { project } = useLevrContext()
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: queryKeys.proposal(
      project.data?.chainId,
      project.data?.governanceStats?.currentCycleId?.toString(),
      proposalId?.toString()
    ),
    queryFn: async () => {
      return proposal(
        publicClient!,
        project.data!.governor,
        proposalId!,
        project.data!.token.decimals,
        project.data!.pricing
      )
    },
    enabled: e && !!publicClient && !!project.data && !!proposalId,
    retry: 1,
    staleTime: 5000,
    refetchInterval: 30000,
  })
}
