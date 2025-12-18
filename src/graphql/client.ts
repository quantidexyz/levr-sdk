import {
  cacheExchange,
  Client as UrqlClient,
  fetchExchange,
  subscriptionExchange,
} from '@urql/core'
import { type Client as WSClient, createClient as createWSClient } from 'graphql-ws'

import { DEFAULT_GRAPHQL_URL } from './constants'

export class Client {
  private static instance: UrqlClient | null = null
  private static wsClient: WSClient | null = null
  private static currentUrl: string = DEFAULT_GRAPHQL_URL
  private static prevUrl: string = DEFAULT_GRAPHQL_URL

  private constructor() {}

  private static createClient(url: string): UrqlClient {
    const websocketUrl = url.replace('https', 'wss')

    // Create WebSocket client with automatic reconnection
    this.wsClient = createWSClient({
      url: websocketUrl,
      // Reconnection settings
      retryAttempts: Infinity,
      shouldRetry: () => true,
      // Lazy connection - only connect when needed
      lazy: true,
      // Keep alive ping every 30 seconds
      keepAlive: 30_000,
      // Connection acknowledgement timeout
      connectionAckWaitTimeout: 10_000,
      // Retry with exponential backoff (1s, 2s, 4s, 8s, max 30s)
      retryWait: async (retries) => {
        const delay = Math.min(1000 * Math.pow(2, retries), 30_000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      },
    })

    return new UrqlClient({
      url: url,
      preferGetMethod: false,
      exchanges: [
        cacheExchange,
        fetchExchange,
        subscriptionExchange({
          forwardSubscription(request) {
            const input = { ...request, query: request.query || '' }
            return {
              subscribe(sink) {
                const unsubscribe = Client.wsClient!.subscribe(input, sink)
                return { unsubscribe }
              },
            }
          },
        }),
      ],
    })
  }

  public static get(): UrqlClient {
    if (!this.instance || this.currentUrl !== this.prevUrl) {
      this.instance = this.createClient(this.currentUrl)
      this.prevUrl = this.currentUrl
    }
    return this.instance
  }

  public static updateUrl(newUrl: string): UrqlClient {
    this.currentUrl = newUrl
    return this.get()
  }
}
