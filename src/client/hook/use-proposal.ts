'use client'

import { useQuery } from '@tanstack/react-query'
import { useConnection, usePublicClient } from 'wagmi'

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
 * Gets proposals for specified cycle (or current cycle if not provided) with enriched data
 * Includes vote receipts if user is connected
 */
export function useProposalsQuery({
  project,
  cycleId,
  enabled: e = true,
}: UseProposalsQueryParams) {
  const publicClient = usePublicClient()
  const { address: userAddress } = useConnection()

  // Use provided cycleId or fall back to current cycle
  const userFacingCycleId = cycleId ?? project?.governanceStats?.currentCycleId
  // Only subtract 1 if we're at cycle 1 and the contract's actual cycle is 0
  const contractCycleId =
    userFacingCycleId === 1n && project?.governanceStats?.currentCycleId === 0n
      ? 0n
      : userFacingCycleId

  return useQuery({
    queryKey: queryKeys.proposals(project?.chainId, userFacingCycleId?.toString(), userAddress),
    queryFn: async () => {
      return proposals({
        publicClient: publicClient!,
        governorAddress: project!.governor,
        projectId: `${project!.chainId}-${project!.token.address.toLowerCase()}`,
        cycleId: contractCycleId,
        tokenDecimals: project!.token.decimals,
        pricing: project!.pricing,
        pageSize: 50,
        userAddress,
      })
    },
    enabled: e && !!publicClient && !!project && contractCycleId !== undefined,
    retry: 1,
    staleTime: 5000,
    refetchInterval: 30000,
  })
}

export function useProposal({ proposalId, enabled: e = true }: UseProposalParams) {
  const publicClient = usePublicClient()
  const { project } = useLevrContext()

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
        `${project.data!.chainId}-${project.data!.token.address.toLowerCase()}`,
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
