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
 * Aggregates metrics from all chains into a single GlobalMetrics object
 */
function aggregateMetrics(metricsArray: LevrMetricsData[]): GlobalMetrics {
  let projectCount = 0
  let totalStakers = 0
  let totalStakedUsd = 0
  let tvlUsd = 0
  let hasStakedUsd = false
  let hasTvlUsd = false

  for (const metrics of metricsArray) {
    projectCount += Number(metrics.projectCount ?? 0)
    totalStakers += Number(metrics.totalStakers ?? 0)

    if (metrics.totalStakedUsd) {
      hasStakedUsd = true
      totalStakedUsd += parseFloat(metrics.totalStakedUsd)
    }

    if (metrics.tvlUsd) {
      hasTvlUsd = true
      tvlUsd += parseFloat(metrics.tvlUsd)
    }
  }

  return {
    projectCount,
    totalStakers,
    totalStakedUsd: hasStakedUsd ? totalStakedUsd.toFixed(2) : null,
    tvlUsd: hasTvlUsd ? tvlUsd.toFixed(2) : null,
  }
}

/**
 * Hook for fetching global Levr metrics with real-time updates via GraphQL subscription
 * Aggregates metrics from all chains
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
    const metricsArray = rawData?.LevrMetrics
    if (!metricsArray || metricsArray.length === 0) return null
    return aggregateMetrics(metricsArray)
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
