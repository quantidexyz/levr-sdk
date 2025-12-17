'use client'

import * as React from 'react'

import {
  getLevrMetricsFields,
  type GlobalMetrics,
  type LevrMetricsData,
} from '../../graphql/fields/metrics'
import { queryKeys } from '../query-keys'
import { useGraphQLSubscription } from './use-subscription'

// Re-export types for convenience
export type { GlobalMetrics }

export type UseMetricsParams = {
  enabled?: boolean
}

export type UseMetricsReturnType = {
  data: GlobalMetrics | null
  isLoading: boolean
  error: Error | null
}

/**
 * Adapts raw metrics data to GlobalMetrics for UI consumption
 */
function toGlobalMetrics(data: LevrMetricsData): GlobalMetrics {
  return {
    projectCount: Number(data.projectCount ?? 0),
    totalStakers: Number(data.totalStakers ?? 0),
    totalStakedUsd: data.totalStakedUsd ?? null,
    tvlUsd: data.tvlUsd ?? null,
  }
}

/**
 * Hook for fetching global Levr metrics with real-time updates via GraphQL subscription
 */
export function useMetrics({ enabled = true }: UseMetricsParams = {}): UseMetricsReturnType {
  const queryKey = React.useMemo(() => queryKeys.subscription.metrics(), [])
  const fields = React.useMemo(() => getLevrMetricsFields(), [])

  const {
    data: rawData,
    isLoading,
    error: rawError,
  } = useGraphQLSubscription({
    queryKey,
    fields,
    enabled,
  })

  const data = React.useMemo(() => {
    const metrics = rawData?.LevrMetrics?.[0]
    if (!metrics) return null
    return toGlobalMetrics(metrics)
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
