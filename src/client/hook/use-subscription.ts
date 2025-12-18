'use client'

import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'

import type { GraphQLSubscriptionArgs } from '../../graphql'
import { subscription } from '../../graphql'
import type { SubscriptionResult } from '../../graphql/gen'

/**
 * Parameters for the useGraphQLSubscription hook
 */
export type UseGraphQLSubscriptionParams<TSubscriptionArgs extends GraphQLSubscriptionArgs> = {
  queryKey: readonly unknown[]
  fields: TSubscriptionArgs
  enabled?: boolean
}

/**
 * Return type of the useGraphQLSubscription hook
 */
export type UseGraphQLSubscriptionReturnType<TSubscriptionArgs extends GraphQLSubscriptionArgs> = {
  data: SubscriptionResult<TSubscriptionArgs> | null
  error: string | null
  isLoading: boolean
  isStale: boolean
}

/**
 * React hook for using GraphQL subscriptions with React Query caching
 *
 * Uses useSyncExternalStore for synchronous cache reads, providing:
 * - Instant cached data on navigation (no loading flash)
 * - Real-time updates via WebSocket subscription
 * - Cached data persists across navigations and reconnections
 * - Automatic reconnection with exponential backoff
 *
 * @param params - The parameters including fields and enabled flag
 * @returns Object with data, error, isLoading, and isStale states
 */
export const useGraphQLSubscription = <TSubscriptionArgs extends GraphQLSubscriptionArgs>({
  queryKey,
  fields,
  enabled = true,
}: UseGraphQLSubscriptionParams<TSubscriptionArgs>): UseGraphQLSubscriptionReturnType<TSubscriptionArgs> => {
  const queryClient = useQueryClient()
  const queryKeyStr = JSON.stringify(queryKey)

  // Stabilize fields reference using JSON serialization to prevent unnecessary re-subscriptions
  const fieldsStr = JSON.stringify(fields)
  const stableFields = React.useMemo(() => JSON.parse(fieldsStr) as TSubscriptionArgs, [fieldsStr])

  const [subscriptionError, setSubscriptionError] = React.useState<string | null>(null)

  // Track whether we've received data at least once for this subscription
  // This prevents permanent loading state on re-subscriptions
  const hasLoadedOnceRef = React.useRef(false)

  // Track the last received data timestamp to detect staleness
  const lastDataTimestampRef = React.useRef<number>(0)

  // Store the last known good data to preserve across reconnections
  const lastKnownDataRef = React.useRef<SubscriptionResult<TSubscriptionArgs> | null>(null)

  // Reset hasLoadedOnce when the query key changes (new subscription)
  // But preserve data in cache for smooth transitions
  React.useEffect(() => {
    hasLoadedOnceRef.current = false
    lastDataTimestampRef.current = 0
  }, [queryKeyStr])

  // Subscribe to cache changes synchronously via useSyncExternalStore
  // This ensures cached data is available immediately on first render
  const cachedData = React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) => {
        // Subscribe to query cache changes
        return queryClient.getQueryCache().subscribe((event) => {
          if (event.query.queryKey && JSON.stringify(event.query.queryKey) === queryKeyStr) {
            onStoreChange()
          }
        })
      },
      [queryClient, queryKeyStr]
    ),
    // getSnapshot - read current cache value
    React.useCallback(
      () => queryClient.getQueryData<SubscriptionResult<TSubscriptionArgs>>(queryKey) ?? null,
      [queryClient, queryKeyStr]
    ),
    // getServerSnapshot - return null for SSR
    React.useCallback(() => null, [])
  )

  // Use cached data, falling back to last known data if cache is empty
  // This preserves data during temporary disconnections
  const data = cachedData ?? lastKnownDataRef.current

  // Update refs when we receive new data
  React.useEffect(() => {
    if (cachedData !== null) {
      hasLoadedOnceRef.current = true
      lastDataTimestampRef.current = Date.now()
      lastKnownDataRef.current = cachedData
    }
  }, [cachedData])

  // Set up GraphQL subscription to update React Query cache
  React.useEffect(() => {
    if (!enabled) return undefined

    setSubscriptionError(null)

    try {
      const sub = subscription(stableFields)
      const callbackId = sub.addCallback((newData) => {
        // Update the cache with new data
        queryClient.setQueryData<SubscriptionResult<TSubscriptionArgs>>(queryKey, newData)
      })

      return () => {
        sub.removeCallback(callbackId)
        // Don't clear cache on unmount - preserve for next mount
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error'
      console.error('Error subscribing to fields', errorMessage)
      setSubscriptionError(errorMessage)
      return undefined
    }
  }, [queryKeyStr, fieldsStr, enabled, queryClient])

  // Only show loading if we have no data at all (not even cached/last known)
  const isLoading = enabled && !data && !subscriptionError && !hasLoadedOnceRef.current

  // Data is stale if we haven't received an update in over 60 seconds
  // This indicates potential connection issues
  const isStale =
    hasLoadedOnceRef.current &&
    lastDataTimestampRef.current > 0 &&
    Date.now() - lastDataTimestampRef.current > 60_000

  return {
    data,
    error: subscriptionError,
    isLoading,
    isStale,
  }
}
