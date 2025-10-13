'use client'

import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'

import type { Project } from '../..'
import { proposal, proposals } from '../../proposals'
import { useLevrContext } from '..'
import { queryKeys } from '../query-keys'

export type UseProposalsQueryParams = {
  project: Project | null | undefined
  enabled?: boolean
}

export type UseProposalParams = {
  proposalId?: bigint
  enabled?: boolean
}

/**
 * Internal: Creates proposals query with all logic
 * Used by LevrProvider
 * Gets all proposals for current cycle with enriched data in single multicall
 */
export function useProposalsQuery({ project, enabled: e = true }: UseProposalsQueryParams) {
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: queryKeys.proposals(project?.chainId, project?.currentCycleId?.toString()),
    queryFn: async () => {
      return proposals({
        publicClient: publicClient!,
        governorAddress: project!.governor,
        tokenDecimals: project!.token.decimals,
        pricing: project!.pricing,
        cycleId: project!.currentCycleId,
        pageSize: 50,
      })
    },
    enabled: e && !!publicClient && !!project!,
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
      project.data?.currentCycleId?.toString(),
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
