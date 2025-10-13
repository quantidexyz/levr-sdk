'use client'

import { useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient } from 'wagmi'

import type { Project } from '../..'
import { proposal, proposals } from '../../proposal'
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
 * Includes vote receipts if user is connected
 */
export function useProposalsQuery({ project, enabled: e = true }: UseProposalsQueryParams) {
  const publicClient = usePublicClient()
  const { address: userAddress } = useAccount()

  return useQuery({
    queryKey: queryKeys.proposals(
      project?.chainId,
      project?.governanceStats?.currentCycleId?.toString(),
      userAddress
    ),
    queryFn: async () => {
      return proposals({
        publicClient: publicClient!,
        governorAddress: project!.governor,
        tokenDecimals: project!.token.decimals,
        pricing: project!.pricing,
        cycleId: project!.governanceStats!.currentCycleId,
        pageSize: 50,
        userAddress, // Include vote receipts if user is connected
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
