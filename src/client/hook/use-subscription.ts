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
}

/**
 * React hook for using GraphQL subscriptions with React Query caching
 *
 * Uses useSyncExternalStore for synchronous cache reads, providing:
 * - Instant cached data on navigation (no loading flash)
 * - Real-time updates via WebSocket subscription
 * - Cached data persists across navigations
 *
 * @param params - The parameters including fields and enabled flag
 * @returns Object with data, error, and isLoading states
 */
export const useGraphQLSubscription = <TSubscriptionArgs extends GraphQLSubscriptionArgs>({
  queryKey,
  fields,
  enabled = true,
}: UseGraphQLSubscriptionParams<TSubscriptionArgs>): UseGraphQLSubscriptionReturnType<TSubscriptionArgs> => {
  const queryClient = useQueryClient()
  const queryKeyStr = JSON.stringify(queryKey)

  const [subscriptionError, setSubscriptionError] = React.useState<string | null>(null)

  // Subscribe to cache changes synchronously via useSyncExternalStore
  // This ensures cached data is available immediately on first render
  const data = React.useSyncExternalStore(
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

  // Set up GraphQL subscription to update React Query cache
  React.useEffect(() => {
    if (!enabled) return undefined

    setSubscriptionError(null)

    try {
      const sub = subscription(fields)
      const callbackId = sub.addCallback((newData) => {
        queryClient.setQueryData<SubscriptionResult<TSubscriptionArgs>>(queryKey, newData)
      })

      return () => {
        sub.removeCallback(callbackId)
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error'
      console.error('Error subscribing to fields', errorMessage)
      setSubscriptionError(errorMessage)
      return undefined
    }
  }, [queryKeyStr, enabled, queryClient, fields])

  return {
    data,
    error: subscriptionError,
    isLoading: enabled && !data && !subscriptionError,
  }
}
