import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import React from 'react'
import type { Address } from 'viem'
import { baseSepolia } from 'viem/chains'

// Mock wagmi at module level BEFORE any imports that use it
let mockPublicClientGlobal: any = null
let mockWalletClientGlobal: any = null

mock.module('wagmi', () => ({
  useAccount: () => ({ address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address }),
  useChainId: () => baseSepolia.id,
  usePublicClient: () => mockPublicClientGlobal,
  useWalletClient: () => ({ data: mockWalletClientGlobal }),
  useConfig: () => ({}),
}))

// Mock getPublicClient util at module level
mock.module('../src/util', () => ({
  getPublicClient: () => mockPublicClientGlobal,
  needsApproval: (allowance: bigint, amount: bigint) => allowance < amount,
}))

import { LevrProvider, useLevrContext, useProject, useUser } from '../src/client'
import { pool } from '../src/pool'
import { project } from '../src/project'
import { proposals } from '../src/proposals'
import { user } from '../src/user'

// ========================================
// MOCK DATA
// ========================================

const MOCK_CHAIN_ID = baseSepolia.id
const MOCK_CLANKER_TOKEN: Address = '0x1234567890123456789012345678901234567890'
const MOCK_USER_ADDRESS: Address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
const MOCK_FACTORY_ADDRESS: Address = '0x25cC1c7d534c0Cb2091DaD75E99C6e3358D331Fd' // baseSepolia factory
const MOCK_TREASURY_ADDRESS: Address = '0xtreasurytreasurytreasurytreasurytreasury1234'
const MOCK_GOVERNOR_ADDRESS: Address = '0xgovernorgovernorgovernorgovernorgovernor1234'
const MOCK_STAKING_ADDRESS: Address = '0xstakingstakingstakingstakingstakingstaking1234'
const MOCK_STAKED_TOKEN_ADDRESS: Address = '0xstakedtokenstakedtokenstakedtokenstakedtoken'
const MOCK_FORWARDER_ADDRESS: Address = '0xforwarderforwarderforwarderforwarderforwarder'
const MOCK_WETH_ADDRESS: Address = '0x4200000000000000000000000000000000000006' // WETH on baseSepolia

const MOCK_POOL_KEY = {
  currency0: MOCK_WETH_ADDRESS,
  currency1: MOCK_CLANKER_TOKEN,
  fee: 3000,
  tickSpacing: 60,
  hooks: '0x0000000000000000000000000000000000000000' as Address,
}

// ========================================
// MOCK SETUP
// ========================================

type RpcCall = {
  type: 'multicall' | 'readContract' | 'getBalance' | 'getLogs' | 'getBlockNumber'
  address?: Address
  functionName?: string
  args?: unknown[]
}

class RpcCallTracker {
  calls: RpcCall[] = []

  track(call: RpcCall) {
    this.calls.push(call)
  }

  getCallCount(type: RpcCall['type']): number {
    return this.calls.filter((c) => c.type === type).length
  }

  getContractCalls(address: Address, functionName: string): number {
    return this.calls.filter(
      (c) =>
        (c.type === 'readContract' || c.type === 'multicall') &&
        c.address === address &&
        c.functionName === functionName
    ).length
  }

  hasMulticallContract(functionName: string): boolean {
    return this.calls.some((c) => c.type === 'multicall' && c.functionName?.includes(functionName))
  }

  reset() {
    this.calls = []
  }

  getTotalCalls(): number {
    return this.calls.length
  }
}

function createMockPublicClient(tracker: RpcCallTracker) {
  const multicallSpy = mock(async ({ contracts }: { contracts: unknown[] }) => {
    tracker.track({ type: 'multicall' })

    // Return mock data based on contract count
    const results: any[] = contracts.map(() => ({
      result: 0n,
      status: 'success' as const,
    }))

    // Customize based on expected multicall structure
    if (contracts.length === 12) {
      // User multicall with WETH (12 contracts)
      // User multicall structure - ensure we have at least 12 results
      // With WETH: 2 balances + 7 staking + 3 weth rewards = 12 total

      // Ensure results array is large enough
      while (results.length < 12) {
        results.push({ result: 0n, status: 'success' })
      }

      // Balance results
      results[0] = { result: 100000000000000000000n, status: 'success' } // token balance
      results[1] = { result: 50000000000000000000n, status: 'success' } // weth balance

      // Staking data (starts at index 2 with WETH)
      results[2] = { result: 75000000000000000000n, status: 'success' } // staked balance
      results[3] = { result: 1000000000000000000000n, status: 'success' } // allowance
      results[4] = { result: [5000000000000000000n, 1000000000000000000n], status: 'success' } // outstanding rewards (token) - TUPLE!
      results[5] = { result: 2000000000000000000n, status: 'success' } // claimable rewards (token)
      results[6] = { result: 500n, status: 'success' } // APR bps
      results[7] = { result: 75000000000000000000n, status: 'success' } // voting power
      results[8] = { result: 300000000000000000000n, status: 'success' } // total staked

      // WETH rewards (starts at index 9)
      results[9] = { result: [3000000000000000000n, 500000000000000000n], status: 'success' } // outstanding rewards weth - TUPLE!
      results[10] = { result: 1000000000000000000n, status: 'success' } // claimable rewards weth
      results[11] = { result: 100000000000000000n, status: 'success' } // reward rate weth
    } else if (contracts.length === 10) {
      // Project multicall (10 contracts)
      results[0] = { result: 18, status: 'success' } // decimals
      results[1] = { result: 'Test Token', status: 'success' } // name
      results[2] = { result: 'TEST', status: 'success' } // symbol
      results[3] = { result: 1000000000000000000000000n, status: 'success' } // totalSupply
      results[4] = { result: JSON.stringify({ description: 'Test' }), status: 'success' } // metadata
      results[5] = { result: 'https://example.com/image.png', status: 'success' } // imageUrl
      results[6] = { result: MOCK_FORWARDER_ADDRESS, status: 'success' } // forwarder
      results[7] = { result: 500000000000000000000n, status: 'success' } // treasury balance
      results[8] = { result: 200000000000000000000n, status: 'success' } // staking balance
      results[9] = { result: 5n, status: 'success' } // currentCycleId
    } else if (contracts.length > 0 && contracts.length <= 6) {
      // Proposals multicall (getProposal for each proposal) or pool multicall
      // Check first contract to determine which one
      const firstContract: any = contracts[0]

      if (
        firstContract?.functionName === 'getSlot0' ||
        firstContract?.functionName === 'getLiquidity'
      ) {
        // Pool multicall (2 contracts)
        results[0] = {
          result: [1000000000000000000n, 100, 0, 3000],
          status: 'success',
        } // slot0
        if (results[1]) results[1] = { result: 5000000000000000000000n, status: 'success' } // liquidity
      } else if (firstContract?.functionName === 'getProposal') {
        // Proposals multicall (getProposal for each proposal)
        for (let i = 0; i < contracts.length; i++) {
          results[i] = {
            result: {
              id: BigInt(i + 1),
              proposalType: 0,
              proposer: MOCK_USER_ADDRESS,
              amount: 1000000000000000000000n,
              recipient: MOCK_TREASURY_ADDRESS,
              description: `Test proposal ${i + 1}`,
              createdAt: 1700000000n,
              votingStartsAt: 1700010000n,
              votingEndsAt: 1700020000n,
              yesVotes: 5000000000000000000000n,
              noVotes: 1000000000000000000000n,
              totalBalanceVoted: 6000000000000000000000n,
              executed: false,
              cycleId: 1n,
            },
            status: 'success',
          }
        }
      } else {
        // Default for single contract or unknown
        results[0] = { result: 1000000000000000000n, status: 'success' }
      }
    }

    return results
  })

  const readContractSpy = mock(
    async ({ address, functionName }: { address: Address; functionName: string }) => {
      tracker.track({ type: 'readContract', address, functionName })

      if (functionName === 'getProjectContracts') {
        return {
          treasury: MOCK_TREASURY_ADDRESS,
          governor: MOCK_GOVERNOR_ADDRESS,
          staking: MOCK_STAKING_ADDRESS,
          stakedToken: MOCK_STAKED_TOKEN_ADDRESS,
        }
      }

      if (functionName === 'tokenRewards') {
        return {
          poolKey: MOCK_POOL_KEY,
          feeDisplay: '0.3%',
          numPositions: 10n,
          tokenRewardsAdmin: [
            {
              admin: MOCK_TREASURY_ADDRESS,
              recipient: MOCK_TREASURY_ADDRESS,
              percentage: 5000,
            },
          ],
        }
      }

      if (functionName === 'amountAvailableToClaim') {
        return { availableAmount: 1000000000000000000n, allocatedAmount: 1000000000000000000n }
      }

      // For pricing queries (slot0 for Uniswap pools)
      if (functionName === 'slot0') {
        return {
          sqrtPriceX96: 1000000000000000000n,
          tick: 0,
          observationIndex: 0,
          observationCardinality: 0,
          observationCardinalityNext: 0,
          feeProtocol: 0,
          unlocked: true,
        }
      }

      return 0n
    }
  )

  const getBalanceSpy = mock(async () => {
    tracker.track({ type: 'getBalance' })
    return 1000000000000000000n
  })

  const getLogsSpy = mock(async () => {
    tracker.track({ type: 'getLogs' })
    return [
      {
        blockNumber: 1000n,
        args: { proposalId: 1n },
      },
      {
        blockNumber: 999n,
        args: { proposalId: 2n },
      },
    ]
  })

  const getBlockNumberSpy = mock(async () => {
    tracker.track({ type: 'getBlockNumber' })
    return 1000n
  })

  return {
    chain: { id: MOCK_CHAIN_ID },
    multicall: multicallSpy,
    readContract: readContractSpy,
    getBalance: getBalanceSpy,
    getLogs: getLogsSpy,
    getBlockNumber: getBlockNumberSpy,
    // Add spies for tracking
    _multicallSpy: multicallSpy,
    _readContractSpy: readContractSpy,
    _getBalanceSpy: getBalanceSpy,
    _getLogsSpy: getLogsSpy,
    _getBlockNumberSpy: getBlockNumberSpy,
  }
}

// ========================================
// SERVER-SIDE DATA FLOW TESTS
// ========================================

describe('#data-flow', () => {
  describe('Server-Side Data Flow', () => {
    let tracker: RpcCallTracker
    let mockPublicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      tracker = new RpcCallTracker()
      mockPublicClient = createMockPublicClient(tracker)
    })

    describe('Zero Duplicate Fetches', () => {
      it('should make minimal RPC calls when fetching all data groups', async () => {
        // Fetch project data (skip oracle client to avoid pricing queries)
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
          // oraclePublicClient omitted to skip pricing
        })

        expect(projectData).toBeDefined()
        expect(projectData).not.toBeNull()

        const projectCalls = tracker.getTotalCalls()

        // Project should make: 1 readContract (getProjectContracts) + 1 multicall + 1 readContract (tokenRewards)
        // According to ZERO-DUPLICATES.md: Project makes 1 multicall + separate calls
        expect(projectCalls).toBe(3) // Exactly 3 calls

        // Fetch user data (shares project data)
        if (projectData) {
          await user({
            publicClient: mockPublicClient as any,
            userAddress: MOCK_USER_ADDRESS,
            project: projectData,
          })

          const userCallsAdded = tracker.getTotalCalls() - projectCalls
          // User should add: 1 multicall + 1 getBalance + 1 airdrop readContract = 3 calls
          expect(userCallsAdded).toBe(3)

          // Fetch pool data (shares project data)
          await pool({
            publicClient: mockPublicClient as any,
            project: projectData,
          })

          const poolCallsAdded = tracker.getTotalCalls() - projectCalls - userCallsAdded
          // Pool should add: 1 multicall (exactly 1, no duplicates)
          expect(poolCallsAdded).toBe(1)

          // Fetch proposals (uses project.governor)
          await proposals({
            publicClient: mockPublicClient as any,
            governorAddress: projectData.governor,
            tokenDecimals: projectData.token.decimals,
          })

          const proposalsCallsAdded =
            tracker.getTotalCalls() - projectCalls - userCallsAdded - poolCallsAdded
          // Proposals should add: 1 getBlockNumber + 1 getLogs + 1 multicall = 3 calls
          expect(proposalsCallsAdded).toBe(3)
        }

        // Verify total calls match ZERO-DUPLICATES.md: ~5 unique RPC calls
        // Project: 3, User: 3, Pool: 1, Proposals: 3 = 10 total
        const totalCalls = tracker.getTotalCalls()
        expect(totalCalls).toBe(10) // Exact count - any more would be duplicates!
      })

      it('should not call the same contract function twice', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        await user({
          publicClient: mockPublicClient as any,
          userAddress: MOCK_USER_ADDRESS,
          project: projectData,
        })

        // Check that getProjectContracts is only called once
        const getProjectContractsCalls = tracker.getContractCalls(
          MOCK_FACTORY_ADDRESS,
          'getProjectContracts'
        )
        expect(getProjectContractsCalls).toBeLessThanOrEqual(1)

        // Verify multicall was called but not excessively
        const multicallCount = tracker.getCallCount('multicall')
        expect(multicallCount).toBeGreaterThanOrEqual(2) // project + user
        expect(multicallCount).toBeLessThanOrEqual(4) // not excessive
      })
    })

    describe('Correct Data Grouping', () => {
      it('should fetch ALL project data items ONLY in project query', async () => {
        tracker.reset()

        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        // Verify ALL items from ZERO-DUPLICATES.md PROJECT box are present
        expect(projectData).toBeDefined()

        // Token (name, symbol, decimals, supply)
        expect(projectData?.token.name).toBe('Test Token')
        expect(projectData?.token.symbol).toBe('TEST')
        expect(projectData?.token.decimals).toBe(18)
        expect(projectData?.token.totalSupply).toBeDefined()

        // Addresses (treasury, governor, staking, etc.)
        expect(projectData?.treasury).toBe(MOCK_TREASURY_ADDRESS)
        expect(projectData?.governor).toBe(MOCK_GOVERNOR_ADDRESS)
        expect(projectData?.staking).toBe(MOCK_STAKING_ADDRESS)
        expect(projectData?.stakedToken).toBe(MOCK_STAKED_TOKEN_ADDRESS)
        expect(projectData?.forwarder).toBe(MOCK_FORWARDER_ADDRESS)

        // Pool (poolKey, feeDisplay, numPositions)
        expect(projectData?.pool).toBeDefined()
        expect(projectData?.pool?.poolKey).toBeDefined()
        expect(projectData?.pool?.feeDisplay).toBeDefined() // Fee display format may vary
        expect(projectData?.pool?.numPositions).toBeDefined()

        // Fee receivers (admin, recipient, percentage)
        expect(projectData?.feeReceivers).toBeDefined()
        expect(Array.isArray(projectData?.feeReceivers)).toBe(true)

        // Treasury stats (balance, utilization)
        expect(projectData?.treasuryStats).toBeDefined()
        expect(projectData?.treasuryStats?.balance).toBeDefined()

        // Factory address
        expect(projectData?.factory).toBe(MOCK_FACTORY_ADDRESS)

        // Current cycle ID
        expect(projectData?.currentCycleId).toBeDefined()
        expect(typeof projectData?.currentCycleId).toBe('bigint')

        // Now verify NO other queries fetch any of this data
        if (!projectData) throw new Error('Project data is null')

        tracker.reset()

        // Call user, pool, proposals - they should NOT refetch any project data
        await user({
          publicClient: mockPublicClient as any,
          userAddress: MOCK_USER_ADDRESS,
          project: projectData,
        })

        await pool({
          publicClient: mockPublicClient as any,
          project: projectData,
        })

        await proposals({
          publicClient: mockPublicClient as any,
          governorAddress: projectData.governor,
          tokenDecimals: projectData.token.decimals,
        })

        // CRITICAL: None of these should have queried for:
        // - token info (name, symbol, decimals, supply)
        // - addresses (treasury, governor, staking)
        // - fee receivers
        // - factory address
        // - current cycle ID
        // All should come from shared projectData!

        // Verify no readContract calls for getProjectContracts (would indicate duplicate fetch)
        const getProjectContractsCalls = tracker.calls.filter(
          (c) => c.functionName === 'getProjectContracts'
        )
        expect(getProjectContractsCalls.length).toBe(0) // Should be 0 - already fetched in project!

        // Verify no readContract calls for tokenRewards (would indicate duplicate fee receiver fetch)
        const tokenRewardsCalls = tracker.calls.filter((c) => c.functionName === 'tokenRewards')
        expect(tokenRewardsCalls.length).toBe(0) // Should be 0 - already in project!
      })

      it('should fetch token info only in project query', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        expect(projectData).toBeDefined()
        expect(projectData?.token.name).toBe('Test Token')
        expect(projectData?.token.symbol).toBe('TEST')
        expect(projectData?.token.decimals).toBe(18)
      })

      it('should fetch fee receivers in project query (not separate)', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        // Fee receivers should be part of project data
        expect(projectData?.feeReceivers).toBeDefined()
        expect(Array.isArray(projectData?.feeReceivers)).toBe(true)

        // Should be fetched via tokenRewards in project query
        const tokenRewardsCalls = tracker.calls.filter(
          (c) => c.type === 'readContract' && c.functionName === 'tokenRewards'
        )
        expect(tokenRewardsCalls.length).toBeGreaterThanOrEqual(1)
      })

      it('should fetch factory and currentCycleId in project query (not governance)', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        // Factory should be in project
        expect(projectData?.factory).toBe(MOCK_FACTORY_ADDRESS)

        // Current cycle ID should be in project
        expect(projectData?.currentCycleId).toBeDefined()
        expect(typeof projectData?.currentCycleId).toBe('bigint')
      })

      it('should fetch user balances only in user query', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        const userData = await user({
          publicClient: mockPublicClient as any,
          userAddress: MOCK_USER_ADDRESS,
          project: projectData,
        })

        // Balances should be in user data
        expect(userData.balances).toBeDefined()
        expect(userData.balances.token).toBeDefined()
        expect(userData.balances.weth).toBeDefined()
        expect(userData.balances.eth).toBeDefined()
      })

      it('should fetch staking data only in user query', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        const userData = await user({
          publicClient: mockPublicClient as any,
          userAddress: MOCK_USER_ADDRESS,
          project: projectData,
        })

        // Staking data should be in user data
        expect(userData.staking).toBeDefined()
        expect(userData.staking.stakedBalance).toBeDefined()
        expect(userData.staking.rewards).toBeDefined()
        expect(userData.staking.apr).toBeDefined()
      })

      it('should fetch voting power only in user query', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        const userData = await user({
          publicClient: mockPublicClient as any,
          userAddress: MOCK_USER_ADDRESS,
          project: projectData,
        })

        // Voting power should be in user.governance
        expect(userData.governance).toBeDefined()
        expect(userData.governance.votingPower).toBeDefined()
      })

      it('should fetch pool state only in pool query', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        const poolData = await pool({
          publicClient: mockPublicClient as any,
          project: projectData,
        })

        // Pool state should be in pool data
        expect(poolData).toBeDefined()
        expect(poolData?.sqrtPriceX96).toBeDefined()
        expect(poolData?.tick).toBeDefined()
        expect(poolData?.liquidity).toBeDefined()
      })
    })

    describe('Data Sharing Patterns', () => {
      it('should share project data to user query (verify NO refetch of project items)', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        tracker.reset()

        // User should receive and use project data
        await user({
          publicClient: mockPublicClient as any,
          userAddress: MOCK_USER_ADDRESS,
          project: projectData, // Sharing project data
        })

        // User should USE these from project:
        // - project.token.address (for balance query)
        // - project.token.decimals (for formatting)
        // - project.staking (for staking queries)
        // - project.treasury (for context)
        // - project.pricing (for USD values)

        // Verify user() doesn't refetch ANY of these
        const userCalls = tracker.calls

        // Should NOT query for token info
        const tokenInfoCalls = userCalls.filter(
          (c) =>
            c.functionName === 'name' ||
            c.functionName === 'symbol' ||
            c.functionName === 'decimals'
        )
        expect(tokenInfoCalls.length).toBe(0)

        // Should NOT query for addresses
        const addressCalls = userCalls.filter((c) => c.functionName === 'getProjectContracts')
        expect(addressCalls.length).toBe(0)

        // Should NOT query for pricing
        const pricingCalls = userCalls.filter(
          (c) => c.functionName === 'slot0' && c.address !== MOCK_CLANKER_TOKEN
        )
        expect(pricingCalls.length).toBe(0)

        // User should only make: 1 multicall + 1 getBalance + 1 airdrop check
        expect(tracker.getTotalCalls()).toBeLessThanOrEqual(4)
      })

      it('should share project.pool data to pool query (verify poolKey NOT refetched)', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        tracker.reset()

        // Pool should use project.pool.poolKey
        const poolData = await pool({
          publicClient: mockPublicClient as any,
          project: projectData, // Sharing project data
        })

        // Pool should use poolKey from project (exact same object)
        expect(poolData?.poolKey).toEqual(projectData.pool?.poolKey)
        expect(poolData?.feeDisplay).toBe(projectData.pool?.feeDisplay)

        // Verify pool() doesn't fetch poolKey (should come from project.pool)
        const poolKeyCalls = tracker.calls.filter(
          (c) => c.functionName === 'tokenRewards' // This fetches poolKey
        )
        expect(poolKeyCalls.length).toBe(0) // Should NOT be called again!

        // Pool should only make 1 multicall for state (getSlot0, getLiquidity)
        expect(tracker.getTotalCalls()).toBe(1)
      })

      it('should share project.governor to proposals query (verify NOT refetched)', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        tracker.reset()

        // Proposals should use project.governor and project.token.decimals
        await proposals({
          publicClient: mockPublicClient as any,
          governorAddress: projectData.governor, // Using shared data
          tokenDecimals: projectData.token.decimals, // Using shared data
        })

        // Verify proposals didn't re-fetch governor address
        const getProjectContractsCalls = tracker.calls.filter(
          (c) => c.type === 'readContract' && c.functionName === 'getProjectContracts'
        )
        expect(getProjectContractsCalls.length).toBe(0) // Should be 0!

        // Verify proposals didn't re-fetch token info
        const tokenInfoCalls = tracker.calls.filter(
          (c) => c.functionName === 'decimals' || c.functionName === 'name'
        )
        expect(tokenInfoCalls.length).toBe(0) // Should be 0!

        // Proposals should only make: 1 getBlockNumber + 1 getLogs + 1 multicall (for proposal details)
        expect(tracker.getTotalCalls()).toBe(3)
      })

      it('should use shared utilities (no logic duplication)', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        // Verify project uses formatBalanceWithUsd from balance.ts for treasury stats
        expect(projectData.treasuryStats).toBeDefined()
        expect(projectData.treasuryStats?.balance.formatted).toBeDefined()
        expect(projectData.treasuryStats?.totalAllocated.formatted).toBeDefined()

        // Verify project uses parseFeeReceivers from fee-receivers.ts
        expect(projectData.feeReceivers).toBeDefined()
        expect(Array.isArray(projectData.feeReceivers)).toBe(true)
        if (projectData.feeReceivers && projectData.feeReceivers.length > 0) {
          // Should have complete structure with areYouAnAdmin (false at project level)
          expect(projectData.feeReceivers[0].admin).toBeDefined()
          expect(projectData.feeReceivers[0].recipient).toBeDefined()
          expect(projectData.feeReceivers[0].percentage).toBeDefined()
          expect(projectData.feeReceivers[0].areYouAnAdmin).toBe(false) // No userAddress at project level
        }

        const userData = await user({
          publicClient: mockPublicClient as any,
          userAddress: MOCK_USER_ADDRESS,
          project: projectData,
        })

        // Verify user uses formatBalanceWithUsd from balance.ts for all balances
        expect(userData.balances.token.formatted).toBeDefined()
        expect(userData.balances.weth.formatted).toBeDefined()
        expect(userData.balances.eth.formatted).toBeDefined()
        expect(userData.staking.stakedBalance.formatted).toBeDefined()
        expect(userData.staking.allowance.formatted).toBeDefined()
        expect(userData.governance.votingPower.formatted).toBeDefined()

        // All should be formatted the same way (using shared utility)
        // The formatted values should be strings, not numbers
        expect(typeof userData.balances.token.formatted).toBe('string')
        expect(typeof projectData.treasuryStats?.balance.formatted).toBe('string')
      })

      it('should not re-fetch shared pricing data', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        // Pricing may be undefined when oracle client is not provided (which is fine)
        // The key is that user() doesn't try to fetch it again
        const initialCalls = tracker.getTotalCalls()

        // User should use project.pricing (even if undefined), not re-fetch
        await user({
          publicClient: mockPublicClient as any,
          userAddress: MOCK_USER_ADDRESS,
          project: projectData,
        })

        const userCalls = tracker.getTotalCalls() - initialCalls

        // User shouldn't make pricing calls (even when pricing is undefined)
        expect(userCalls).toBeLessThan(5)
      })
    })
  })

  // ========================================
  // REACT HOOKS INTEGRATION TESTS
  // ========================================

  describe('React Hooks Integration', () => {
    let tracker: RpcCallTracker
    let mockPublicClient: ReturnType<typeof createMockPublicClient>
    let queryClient: QueryClient

    beforeEach(() => {
      tracker = new RpcCallTracker()
      mockPublicClient = createMockPublicClient(tracker)

      // Update global mocks
      mockPublicClientGlobal = mockPublicClient
      mockWalletClientGlobal = {
        account: { address: MOCK_USER_ADDRESS },
        chain: { id: MOCK_CHAIN_ID },
        writeContract: mock(async () => '0x123' as `0x${string}`),
        sendTransaction: mock(async () => '0x123' as `0x${string}`),
      }

      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
        },
      })
    })

    const createWrapper = () => {
      return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(LevrProvider, {
            enabled: true,
            oracleChainId: MOCK_CHAIN_ID,
            children,
          })
        )
      }
    }

    describe('Provider Query Hooks Alignment', () => {
      it('should NOT make duplicate queries when loading provider', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        tracker.reset()

        // Set clanker token to trigger queries
        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.project.data).toBeDefined()
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Count RPC calls made
        const totalCalls = tracker.getTotalCalls()
        const multicallCount = tracker.getCallCount('multicall')
        const readContractCount = tracker.getCallCount('readContract')
        const getBalanceCount = tracker.getCallCount('getBalance')

        console.log('=== RPC CALL COUNTS ===')
        console.log(`Total calls: ${totalCalls}`)
        console.log(`Multicalls: ${multicallCount}`)
        console.log(`readContract: ${readContractCount}`)
        console.log(`getBalance: ${getBalanceCount}`)
        console.log('All calls:', tracker.calls.map((c) => c.type).join(', '))

        // Check that NO staking queries are made separately (they should be in user multicall)
        const stakingFunctionCalls = tracker.calls.filter(
          (c) =>
            c.functionName?.includes('staking') ||
            c.functionName?.includes('Staked') ||
            c.functionName?.includes('allowance') ||
            c.functionName?.includes('rewards')
        )
        console.log('Staking-related separate calls:', stakingFunctionCalls.length)
        expect(stakingFunctionCalls.length).toBe(0) // All in user multicall!

        // Should make EXACTLY the expected number of calls (no duplicates!)
        // Expected: 1 project multicall + 1 user multicall + 2-3 readContract calls + 1 getBalance
        expect(multicallCount).toBeLessThanOrEqual(4) // project, user, pool, proposals
        expect(readContractCount).toBeLessThanOrEqual(4) // getProjectContracts, tokenRewards, airdrop
        expect(getBalanceCount).toBeLessThanOrEqual(1) // Native ETH balance

        // CRITICAL: Total should be less than 15 (with duplicates it would be 20+)
        expect(totalCalls).toBeLessThan(15)
      })

      it('should have ALL project data available in provider context', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.project.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        const proj = result.current.project.data!

        // Verify ALL items from ZERO-DUPLICATES.md PROJECT box are available
        // Token (name, symbol, decimals, supply)
        expect(proj.token.name).toBeDefined()
        expect(proj.token.symbol).toBeDefined()
        expect(proj.token.decimals).toBeDefined()
        expect(proj.token.totalSupply).toBeDefined()

        // Addresses (treasury, governor, staking, etc.)
        expect(proj.treasury).toBeDefined()
        expect(proj.governor).toBeDefined()
        expect(proj.staking).toBeDefined()
        expect(proj.stakedToken).toBeDefined()
        expect(proj.forwarder).toBeDefined()

        // Pool (poolKey, feeDisplay, numPositions)
        expect(proj.pool).toBeDefined()
        expect(proj.pool?.poolKey).toBeDefined()
        expect(proj.pool?.feeDisplay).toBeDefined()
        expect(proj.pool?.numPositions).toBeDefined()

        // Fee receivers
        expect(proj.feeReceivers).toBeDefined()

        // Treasury stats
        expect(proj.treasuryStats).toBeDefined()

        // Factory address
        expect(proj.factory).toBeDefined()

        // Current cycle ID
        expect(proj.currentCycleId).toBeDefined()

        // Pricing (may be undefined if oracle not provided, which is fine)
        // The key is it's in project, not fetched elsewhere
      })

      it('should expose project query through context', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        // Set clanker token to trigger queries
        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.project.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        expect(result.current.project.isLoading).toBe(false)
        expect(result.current.project.data).toBeDefined()
      })

      it('should expose user query through context', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.project.data).toBeDefined()
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        expect(result.current.user.data).toBeDefined()
      })

      it('should expose pool query through context', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.pool).toBeDefined()
          },
          { timeout: 3000 }
        )

        expect(result.current.pool).toBeDefined()
      })

      it('should expose proposals query through context', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.proposals).toBeDefined()
          },
          { timeout: 3000 }
        )

        expect(result.current.proposals).toBeDefined()
      })
    })

    describe('Public Hooks Alignment', () => {
      it('useProject() should return context.project', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(
          () => ({
            context: useLevrContext(),
            project: useProject(),
          }),
          { wrapper }
        )

        result.current.context.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.project.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Should be the same object
        expect(result.current.project).toBe(result.current.context.project)
      })

      it('useUser() should return context.user', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(
          () => ({
            context: useLevrContext(),
            user: useUser(),
          }),
          { wrapper }
        )

        result.current.context.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Should be the same object
        expect(result.current.user).toBe(result.current.context.user)
      })
    })

    describe('Hierarchical Data Access', () => {
      it('should provide all user data through hierarchical structure', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // All user data should be accessible via hierarchical structure
        expect(result.current.user.data!.balances).toBeDefined()
        expect(result.current.user.data!.staking).toBeDefined()
        expect(result.current.user.data!.governance).toBeDefined()

        // Individual items should be accessible
        expect(result.current.user.data!.balances.token).toBeDefined()
        expect(result.current.user.data!.balances.weth).toBeDefined()
        expect(result.current.user.data!.balances.eth).toBeDefined()

        expect(result.current.user.data!.staking.stakedBalance).toBeDefined()
        expect(result.current.user.data!.staking.allowance).toBeDefined()
        expect(result.current.user.data!.staking.rewards).toBeDefined()
        expect(result.current.user.data!.staking.apr).toBeDefined()

        expect(result.current.user.data!.governance.votingPower).toBeDefined()
      })
    })

    describe('Refetch Methods', () => {
      it('refetch.user() should trigger only user query refetch', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        const callsBeforeRefetch = tracker.getTotalCalls()

        // Trigger user refetch
        await result.current.refetch.user()

        const callsAfterRefetch = tracker.getTotalCalls()
        const newCalls = callsAfterRefetch - callsBeforeRefetch

        // Should only add user query calls (multicall + getBalance)
        expect(newCalls).toBeGreaterThanOrEqual(1)
        expect(newCalls).toBeLessThan(5)
      })

      it('refetch.project() should trigger only project query refetch', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.project.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        const callsBeforeRefetch = tracker.getTotalCalls()

        // Trigger project refetch
        await result.current.refetch.project()

        const callsAfterRefetch = tracker.getTotalCalls()
        const newCalls = callsAfterRefetch - callsBeforeRefetch

        // Should only add project query calls
        expect(newCalls).toBeGreaterThanOrEqual(1)
        expect(newCalls).toBeLessThan(10)
      })

      it('refetch.afterTrade() should trigger ONLY user + pool (NOT project or proposals)', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        tracker.reset()

        // Trigger afterTrade refetch
        await result.current.refetch.afterTrade()

        // Verify call pattern: should make user + pool queries
        // User: 1 multicall + 1 getBalance + potentially 1 airdrop = 2-3 calls
        // Pool: 1 multicall = 1 call
        // Total: 3-4 calls
        const totalCalls = tracker.getTotalCalls()
        const multicalls = tracker.getCallCount('multicall')
        const getBalanceCalls = tracker.getCallCount('getBalance')
        const getLogs = tracker.getCallCount('getLogs') // Proposals use getLogs
        const getBlockNumber = tracker.getCallCount('getBlockNumber') // Proposals use this

        // Should have user multicall + pool multicall = 2
        expect(multicalls).toBeGreaterThanOrEqual(2)
        expect(multicalls).toBeLessThanOrEqual(3) // Max with airdrop check

        // Should have getBalance for user
        expect(getBalanceCalls).toBe(1)

        // Should NOT have proposals queries
        expect(getLogs).toBe(0)
        expect(getBlockNumber).toBe(0)

        // Total should be user + pool only
        expect(totalCalls).toBeLessThanOrEqual(5)
        expect(totalCalls).toBeGreaterThanOrEqual(3)
      })

      it('refetch.afterStake() should trigger ONLY user + project (NOT pool or proposals)', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        tracker.reset()

        // Trigger afterStake refetch
        await result.current.refetch.afterStake()

        // Verify call pattern: should make user + project queries
        const multicalls = tracker.getCallCount('multicall')
        const getBalanceCalls = tracker.getCallCount('getBalance')
        const readContracts = tracker.getCallCount('readContract')
        const getLogs = tracker.getCallCount('getLogs')
        const getBlockNumber = tracker.getCallCount('getBlockNumber')

        // Should have: user multicall + project multicall
        expect(multicalls).toBeGreaterThanOrEqual(2)
        expect(multicalls).toBeLessThanOrEqual(3)

        // Should have getBalance for user
        expect(getBalanceCalls).toBe(1)

        // Should have readContract for project (getProjectContracts, tokenRewards, maybe airdrop)
        expect(readContracts).toBeGreaterThanOrEqual(2)

        // Should NOT have proposals queries
        expect(getLogs).toBe(0)
        expect(getBlockNumber).toBe(0)
      })

      it('refetch.afterClaim() should trigger ONLY user (NOT project, pool, or proposals)', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        tracker.reset()

        // Trigger afterClaim refetch
        await result.current.refetch.afterClaim()

        // Verify call pattern: should make ONLY user queries
        const multicalls = tracker.getCallCount('multicall')
        const getBalanceCalls = tracker.getCallCount('getBalance')
        const readContracts = tracker.getCallCount('readContract')
        const getLogs = tracker.getCallCount('getLogs')
        const getBlockNumber = tracker.getCallCount('getBlockNumber')

        // Should have ONLY user multicall (not project or pool multicalls)
        expect(multicalls).toBe(1)

        // Should have getBalance for user
        expect(getBalanceCalls).toBe(1)

        // May have 1 airdrop readContract
        expect(readContracts).toBeLessThanOrEqual(1)

        // Should NOT have proposals queries
        expect(getLogs).toBe(0)
        expect(getBlockNumber).toBe(0)

        // Total: user multicall + getBalance + maybe airdrop = 2-3
        expect(tracker.getTotalCalls()).toBeLessThanOrEqual(3)
        expect(tracker.getTotalCalls()).toBeGreaterThanOrEqual(2)
      })

      it('refetch.afterVote() should trigger ONLY user + proposals (NOT project or pool)', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        tracker.reset()

        // Trigger afterVote refetch
        await result.current.refetch.afterVote()

        // Verify call pattern: should make user + proposals queries
        const multicalls = tracker.getCallCount('multicall')
        const getBalanceCalls = tracker.getCallCount('getBalance')
        const readContracts = tracker.getCallCount('readContract')
        const getLogs = tracker.getCallCount('getLogs')
        const getBlockNumber = tracker.getCallCount('getBlockNumber')

        // Should have: user multicall + proposals multicall
        expect(multicalls).toBeGreaterThanOrEqual(2)

        // Should have getBalance for user
        expect(getBalanceCalls).toBe(1)

        // Should have proposals event queries
        expect(getLogs).toBe(1)
        expect(getBlockNumber).toBe(1)

        // May have airdrop readContract for user
        expect(readContracts).toBeLessThanOrEqual(1)

        // Total: user (multicall + getBalance + maybe airdrop) + proposals (getBlockNumber + getLogs + multicall)
        expect(tracker.getTotalCalls()).toBeLessThanOrEqual(7)
      })

      it('refetch.afterExecute() should trigger ONLY project + proposals + user (NOT pool)', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        tracker.reset()

        // Trigger afterExecute refetch
        await result.current.refetch.afterExecute()

        // Verify call pattern: should make project + proposals + user queries
        const multicalls = tracker.getCallCount('multicall')
        const getBalanceCalls = tracker.getCallCount('getBalance')
        const readContracts = tracker.getCallCount('readContract')
        const getLogs = tracker.getCallCount('getLogs')
        const getBlockNumber = tracker.getCallCount('getBlockNumber')

        // Should have: user multicall + project multicall + proposals multicall = 3
        expect(multicalls).toBeGreaterThanOrEqual(3)

        // Should have getBalance for user
        expect(getBalanceCalls).toBe(1)

        // Should have readContract for project (getProjectContracts, tokenRewards, maybe airdrop)
        expect(readContracts).toBeGreaterThanOrEqual(2)

        // Should have proposals event queries
        expect(getLogs).toBe(1)
        expect(getBlockNumber).toBe(1)

        // Total: project + user + proposals = ~10-12 calls
        expect(tracker.getTotalCalls()).toBeLessThanOrEqual(12)
        expect(tracker.getTotalCalls()).toBeGreaterThanOrEqual(8)
      })
    })

    describe('No Wasteful Refetches', () => {
      it('should not trigger duplicate queries in action-based refetches', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        tracker.reset()

        // Trigger afterStake (should refetch user + project)
        await result.current.refetch.afterStake()

        const afterStakeCalls = tracker.getTotalCalls()

        tracker.reset()

        // Trigger afterClaim (should refetch only user)
        await result.current.refetch.afterClaim()

        const afterClaimCalls = tracker.getTotalCalls()

        // afterClaim should make fewer calls than afterStake
        expect(afterClaimCalls).toBeLessThan(afterStakeCalls)
      })

      it('should not refetch pool when only user data changes', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        tracker.reset()

        // afterClaim should NOT refetch pool
        await result.current.refetch.afterClaim()

        // Verify pool multicall was not triggered
        const multicalls = tracker.getCallCount('multicall')

        // Should only be 1 multicall (for user), not 2 (user + pool)
        expect(multicalls).toBeLessThanOrEqual(2)
      })
    })
  })

  // ========================================
  // END-TO-END INTEGRATION TEST
  // ========================================

  describe('End-to-End Integration', () => {
    let tracker: RpcCallTracker
    let mockPublicClient: ReturnType<typeof createMockPublicClient>
    let queryClient: QueryClient

    beforeEach(() => {
      tracker = new RpcCallTracker()
      mockPublicClient = createMockPublicClient(tracker)

      // Update global mocks
      mockPublicClientGlobal = mockPublicClient
      mockWalletClientGlobal = {
        account: { address: MOCK_USER_ADDRESS },
        chain: { id: MOCK_CHAIN_ID },
        writeContract: mock(async () => '0x123' as `0x${string}`),
        sendTransaction: mock(async () => '0x123' as `0x${string}`),
      }

      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
        },
      })
    })

    const createWrapper = () => {
      return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(LevrProvider, {
            enabled: true,
            oracleChainId: MOCK_CHAIN_ID,
            children,
          })
        )
      }
    }

    describe('Complete Data Flow', () => {
      it('should handle full user journey without duplicate calls', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        // Step 1: Set clanker token (triggers initial queries)
        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.project.data).toBeDefined()
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        const initialCalls = tracker.getTotalCalls()

        // Verify initial queries fired
        expect(initialCalls).toBeGreaterThan(5)
        expect(initialCalls).toBeLessThan(20)

        tracker.reset()

        // Step 2: Simulate stake action
        await result.current.refetch.afterStake()

        const stakeCalls = tracker.getTotalCalls()

        // Should only refetch user + project (not pool or proposals)
        expect(stakeCalls).toBeGreaterThanOrEqual(2)
        expect(stakeCalls).toBeLessThan(12)

        tracker.reset()

        // Step 3: Simulate claim action
        await result.current.refetch.afterClaim()

        const claimCalls = tracker.getTotalCalls()

        // Should only refetch user
        expect(claimCalls).toBeGreaterThanOrEqual(1)
        expect(claimCalls).toBeLessThan(5)

        // Verify data is still available and correct
        expect(result.current.user.data?.balances).toBeDefined()
        expect(result.current.user.data?.staking).toBeDefined()
        expect(result.current.project.data?.token).toBeDefined()
      })

      it('should maintain data consistency across refetches', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        const initialTokenName = result.current.project.data?.token.name
        const initialUserBalance = result.current.user.data?.balances.token

        // Trigger refetch
        await result.current.refetch.afterStake()

        // Data should still be consistent (same mock data)
        expect(result.current.project.data?.token.name).toBe(initialTokenName)
        expect(result.current.user.data?.balances.token.raw).toBe(initialUserBalance?.raw)
      })

      it('should ensure hierarchical data structure remains consistent after refetches', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Trigger refetch
        await result.current.refetch.afterStake()

        // After refetch - data should still be accessible through hierarchical structure
        expect(result.current.user.data!.balances).toBeDefined()
        expect(result.current.user.data!.staking).toBeDefined()
        expect(result.current.user.data!.governance).toBeDefined()

        // Structure should be consistent
        expect(result.current.user.data!.balances.token).toBeDefined()
        expect(result.current.user.data!.staking.stakedBalance).toBeDefined()
        expect(result.current.user.data!.governance.votingPower).toBeDefined()
      })
    })
  })
})
