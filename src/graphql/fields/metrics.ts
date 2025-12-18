import type { GraphQLSubscriptionArgs } from '..'
import type { SubscriptionResult } from '../gen'

// ============================================================================
// Field Definitions
// ============================================================================

/**
 * Fields for Levr metrics per chain
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
 * Get fields for querying Levr metrics from all chains
 * Each chain has its own metrics entity (id = chainId)
 */
export const getLevrMetricsFields = () => {
  return {
    LevrMetrics: {
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

/** Adapted metrics for UI consumption (aggregated across all chains) */
export type GlobalMetrics = {
  projectCount: number
  totalStakers: number
  totalStakedUsd: string | null
  tvlUsd: string | null
}
