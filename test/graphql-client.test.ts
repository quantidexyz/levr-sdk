import { describe, expect, it } from 'bun:test'

import { Client, DEFAULT_GRAPHQL_URL } from '../src/graphql'
import { getIndexedProject, getStaticProject } from '../src/project'
import { getPublicClient } from './util'

/**
 * GraphQL Client Tests
 *
 * These tests validate that the GraphQL client works correctly in a
 * server/Bun environment (not just browser).
 *
 * The issue being tested: getStaticProject returns null in Bun/Node
 * environments even when the project exists in the indexer, because
 * the urql client with graphql-ws subscription exchange may behave
 * differently outside of browsers.
 *
 * Prerequisites:
 * - Network access to the indexer
 * - A known indexed project to test against
 */
describe('#GRAPHQL_CLIENT_TEST', () => {
  // Known indexed LEVR project on Base mainnet
  const KNOWN_CHAIN_ID = 8453
  const KNOWN_TOKEN_ADDRESS = '0x08d63756ab002615b1df99380bcf37714c5b9b07' as `0x${string}`

  it('should have correct default GraphQL URL', () => {
    expect(DEFAULT_GRAPHQL_URL).toBe('https://indexer.dev.hyperindex.xyz/80792c0/v1/graphql')
  })

  it('should initialize GraphQL client singleton', () => {
    const client = Client.get()
    expect(client).toBeDefined()
    expect(typeof client.query).toBe('function')
  })

  it('should fetch project from indexer using raw fetch', async () => {
    // First verify the data exists using raw fetch (bypassing urql)
    const compositeId = `${KNOWN_CHAIN_ID}-${KNOWN_TOKEN_ADDRESS.toLowerCase()}`

    const response = await fetch(DEFAULT_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { LevrProject_by_pk(id: "${compositeId}") { id clankerToken { address symbol } } }`,
      }),
    })

    expect(response.ok).toBe(true)

    const data = (await response.json()) as {
      data?: {
        LevrProject_by_pk?: { id: string; clankerToken?: { address: string; symbol: string } }
      }
      errors?: unknown[]
    }

    console.log('Raw fetch result:', JSON.stringify(data, null, 2))

    expect(data.errors).toBeUndefined()
    expect(data.data?.LevrProject_by_pk).toBeDefined()
    expect(data.data?.LevrProject_by_pk?.id).toBe(compositeId)
    expect(data.data?.LevrProject_by_pk?.clankerToken?.symbol).toBe('LEVR')
  })

  it('should fetch project using getIndexedProject', async () => {
    const project = await getIndexedProject(KNOWN_CHAIN_ID, KNOWN_TOKEN_ADDRESS)

    console.log('getIndexedProject result:', project ? 'Found' : 'NULL')

    // This is the failing test - getIndexedProject returns null in Bun
    expect(project).not.toBeNull()
    expect(project?.clankerToken?.symbol).toBe('LEVR')
  })

  it(
    'should fetch static project using getStaticProject',
    async () => {
      const publicClient = getPublicClient(60000, KNOWN_CHAIN_ID)

      const project = await getStaticProject({
        publicClient,
        clankerToken: KNOWN_TOKEN_ADDRESS,
      })

      console.log('getStaticProject result:', project ? `Found: ${project.token.symbol}` : 'NULL')

      // This is the main failing test
      expect(project).not.toBeNull()
      expect(project?.token.symbol).toBe('LEVR')
      expect(project?.pool).toBeDefined()
      expect(project?.pool?.poolKey).toBeDefined()
    },
    { timeout: 30000 }
  )
})
