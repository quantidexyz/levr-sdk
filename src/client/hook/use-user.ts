'use client'

import { useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient } from 'wagmi'

import type { Project } from '../../project'
import type { User } from '../../user'
import { getUser } from '../../user'
import { queryKeys } from '../query-keys'

export type UseUserQueryParams = {
  project: Project | null | undefined
  enabled?: boolean
}

/**
 * Internal: Creates user query with all user-specific data
 * Used by LevrProvider
 * Composes balances, staking, and governance in one efficient multicall
 */
export function useUserQuery({ project: projectData, enabled: e = true }: UseUserQueryParams) {
  const publicClient = usePublicClient()
  const { address: userAddress } = useAccount()

  return useQuery({
    queryKey: queryKeys.user(
      userAddress!,
      projectData?.token.address!,
      projectData?.staking!,
      projectData?.treasury!
    ),
    queryFn: async (): Promise<User> =>
      getUser({
        publicClient: publicClient!,
        userAddress: userAddress!,
        project: projectData!,
      }),
    enabled: e && !!publicClient && !!userAddress && !!projectData,
    refetchInterval: 10_000, // Refetch every 10 seconds for live updates
    staleTime: 5_000,
  })
}
