import type { GraphQLSubscriptionArgs } from '..'
import type { SubscriptionResult } from '../gen'

// ============================================================================
// Field Definitions
// ============================================================================

/**
 * Fields for global Levr metrics (singleton entity)
 */
export const levrMetricsFields = {
  id: true,
  projectCount: true,
  totalStakers: true,
  totalStakedUsd: true,
  tvlUsd: true,
} as const satisfies GraphQLSubscriptionArgs['LevrMetrics']

// ============================================================================
// Query/Subscription Field Builders
// ============================================================================

/**
 * Get fields for querying global Levr metrics
 */
export const getLevrMetricsFields = () => {
  return {
    LevrMetrics: {
      __args: {
        where: { id: { _eq: '1' } },
        limit: 1,
      },
      ...levrMetricsFields,
    },
  }
}

// ============================================================================
// Types
// ============================================================================

type LevrMetricsFields = ReturnType<typeof getLevrMetricsFields>
export type LevrMetricsResult = SubscriptionResult<LevrMetricsFields>
export type LevrMetricsData = LevrMetricsResult['LevrMetrics'][number]

/** Adapted metrics for UI consumption */
export type GlobalMetrics = {
  projectCount: number
  totalStakers: number
  totalStakedUsd: string | null
  tvlUsd: string | null
}
