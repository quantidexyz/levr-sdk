'use client'

import * as React from 'react'

import type { GraphQLSubscriptionArgs } from '../../graphql'
import { subscription } from '../../graphql'
import type { SubscriptionResult } from '../../graphql/gen'

/**
 * Parameters for the useGraphQLSubscription hook
 */
export type UseGraphQLSubscriptionParams<TSubscriptionArgs extends GraphQLSubscriptionArgs> = {
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
 * React hook for using GraphQL subscriptions
 *
 * @param params - The parameters including fields and enabled flag
 * @returns Object with data, error, and isLoading states
 */
export const useGraphQLSubscription = <TSubscriptionArgs extends GraphQLSubscriptionArgs>({
  fields,
  enabled = true,
}: UseGraphQLSubscriptionParams<TSubscriptionArgs>): UseGraphQLSubscriptionReturnType<TSubscriptionArgs> => {
  const [data, setData] = React.useState<SubscriptionResult<TSubscriptionArgs> | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!enabled) {
      setData(null)
      setError(null)
      return () => {}
    }

    // Clear previous data/error when starting new subscription
    setData(null)
    setError(null)

    try {
      const sub = subscription(fields)
      let callbackId: string | null = null

      callbackId = sub.addCallback(setData)

      return () => {
        sub.removeCallback(callbackId)
      }
    } catch (err: any) {
      const errorMessage = err?.message ?? err?.cause ?? err

      console.error('Error subscribing to fields', errorMessage)
      setError(errorMessage)

      return () => {}
    }
  }, [JSON.stringify(fields), enabled])

  return { data, error, isLoading: enabled && !data && !error }
}
