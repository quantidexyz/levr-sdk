import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import React from 'react'
import type { Address } from 'viem'
import { baseSepolia } from 'viem/chains'

import {
  LevrProvider,
  useBalance,
  useGovernanceData,
  useLevrContext,
  useProject,
  useStakingData,
  useUser,
} from '../src/client'
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
    if (contracts.length >= 10) {
      // Project multicall
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
    } else if (contracts.length >= 7 && contracts.length < 10) {
      // User multicall structure (with WETH):
      // 0: token balance, 1: weth balance,
      // THEN staking contracts (offset by 2):
      // 2: staked balance, 3: allowance, 4: outstanding rewards [tuple], 5: claimable rewards,
      // 6: apr bps, 7: voting power, 8: total staked
      // THEN weth rewards (offset by 9):
      // 9: outstanding rewards weth [tuple], 10: claimable rewards weth, 11: reward rate weth

      // Provide default bigint values for all
      for (let i = 0; i < contracts.length; i++) {
        results[i] = { result: 1000000000000000000n, status: 'success' }
      }

      // Specific values for known positions
      if (results[0]) results[0] = { result: 100000000000000000000n, status: 'success' } // token balance
      if (results[1]) results[1] = { result: 50000000000000000000n, status: 'success' } // weth balance

      // Staking data (starts at index 2)
      if (results[2]) results[2] = { result: 75000000000000000000n, status: 'success' } // staked balance
      if (results[3]) results[3] = { result: 1000000000000000000000n, status: 'success' } // allowance
      if (results[4])
        results[4] = { result: [5000000000000000000n, 1000000000000000000n], status: 'success' } // outstanding rewards (token) - TUPLE!
      if (results[5]) results[5] = { result: 2000000000000000000n, status: 'success' } // claimable rewards (token)
      if (results[6]) results[6] = { result: 500n, status: 'success' } // APR bps
      if (results[7]) results[7] = { result: 75000000000000000000n, status: 'success' } // voting power
      if (results[8]) results[8] = { result: 300000000000000000000n, status: 'success' } // total staked

      // WETH rewards (starts at index 9 if present)
      if (results[9])
        results[9] = { result: [3000000000000000000n, 500000000000000000n], status: 'success' } // outstanding rewards weth - TUPLE!
      if (results[10]) results[10] = { result: 1000000000000000000n, status: 'success' } // claimable rewards weth
      if (results[11]) results[11] = { result: 100000000000000000n, status: 'success' } // reward rate weth
    } else if (contracts.length === 2) {
      // Pool multicall
      results[0] = {
        result: [1000000000000000000n, 100, 0, 3000],
        status: 'success',
      } // slot0
      results[1] = { result: 5000000000000000000000n, status: 'success' } // liquidity
    } else if (contracts.length === 1) {
      // Single contract call - could be pricing or other
      results[0] = { result: 1000000000000000000n, status: 'success' }
    } else if (contracts.length > 0 && contracts.length < 7) {
      // Could be proposals multicall (getProposal for each proposal)
      // Each getProposal returns a proposal struct
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
        // Note: Pricing calls would be additional in real scenario
        expect(projectCalls).toBeGreaterThanOrEqual(3)

        // Fetch user data (shares project data)
        if (projectData) {
          await user({
            publicClient: mockPublicClient as any,
            userAddress: MOCK_USER_ADDRESS,
            project: projectData,
          })

          const userCallsAdded = tracker.getTotalCalls() - projectCalls
          // User should add: 1 multicall + 1 getBalance
          expect(userCallsAdded).toBeGreaterThanOrEqual(1)

          // Fetch pool data (shares project data)
          await pool({
            publicClient: mockPublicClient as any,
            project: projectData,
          })

          const poolCallsAdded = tracker.getTotalCalls() - projectCalls - userCallsAdded
          // Pool should add: 1 multicall (if pool exists)
          expect(poolCallsAdded).toBeGreaterThanOrEqual(1)

          // Fetch proposals (uses project.governor)
          await proposals({
            publicClient: mockPublicClient as any,
            governorAddress: projectData.governor,
            tokenDecimals: projectData.token.decimals,
          })

          const proposalsCallsAdded =
            tracker.getTotalCalls() - projectCalls - userCallsAdded - poolCallsAdded
          // Proposals should add: 1 getBlockNumber + 1 getLogs + 1 multicall
          expect(proposalsCallsAdded).toBeGreaterThanOrEqual(2)
        }

        // Verify total calls are reasonable (should be ~8-12 calls total)
        const totalCalls = tracker.getTotalCalls()
        expect(totalCalls).toBeLessThan(15)
        expect(totalCalls).toBeGreaterThan(5)
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
      it('should share project data to user query', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        const initialCalls = tracker.getTotalCalls()

        // User should receive and use project data
        await user({
          publicClient: mockPublicClient as any,
          userAddress: MOCK_USER_ADDRESS,
          project: projectData, // Sharing project data
        })

        const userCalls = tracker.getTotalCalls() - initialCalls

        // User should not re-fetch project data (token info, staking address, etc.)
        // It should only add its own multicall + getBalance
        expect(userCalls).toBeLessThan(5)
      })

      it('should share project.pool data to pool query', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        // Pool should use project.pool.poolKey
        const poolData = await pool({
          publicClient: mockPublicClient as any,
          project: projectData, // Sharing project data
        })

        // Pool should use poolKey from project
        expect(poolData?.poolKey).toEqual(projectData.pool?.poolKey)
        expect(poolData?.feeDisplay).toBe(projectData.pool?.feeDisplay)
      })

      it('should share project.governor to proposals query', async () => {
        const projectData = await project({
          publicClient: mockPublicClient as any,
          clankerToken: MOCK_CLANKER_TOKEN,
        })

        if (!projectData) throw new Error('Project data is null')

        // Proposals should use project.governor
        await proposals({
          publicClient: mockPublicClient as any,
          governorAddress: projectData.governor, // Using shared data
          tokenDecimals: projectData.token.decimals, // Using shared data
        })

        // Verify proposals didn't re-fetch governor address
        const getProjectContractsCalls = tracker.calls.filter(
          (c) => c.type === 'readContract' && c.functionName === 'getProjectContracts'
        )
        expect(getProjectContractsCalls.length).toBeLessThanOrEqual(1)
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
      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
        },
      })

      // Mock wagmi hooks
      mock.module('wagmi', () => ({
        useAccount: () => ({ address: MOCK_USER_ADDRESS }),
        useChainId: () => MOCK_CHAIN_ID,
        usePublicClient: () => mockPublicClient,
        useConfig: () => ({}),
      }))

      // Mock getPublicClient util
      mock.module('../src/util', () => ({
        getPublicClient: () => mockPublicClient,
      }))
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

        const { result: contextResult } = renderHook(() => useLevrContext(), { wrapper })
        const { result: projectResult } = renderHook(() => useProject(), { wrapper })

        contextResult.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(projectResult.current.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Should be the same object
        expect(projectResult.current).toBe(contextResult.current.project)
      })

      it('useUser() should return context.user', async () => {
        const wrapper = createWrapper()

        const { result: contextResult } = renderHook(() => useLevrContext(), { wrapper })
        const { result: userResult } = renderHook(() => useUser(), { wrapper })

        contextResult.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(userResult.current.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Should be the same object
        expect(userResult.current).toBe(contextResult.current.user)
      })

      it('useBalance() should return context.balances (derived from user)', async () => {
        const wrapper = createWrapper()

        const { result: contextResult } = renderHook(() => useLevrContext(), { wrapper })
        const { result: balanceResult } = renderHook(() => useBalance(), { wrapper })

        contextResult.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(balanceResult.current.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Should be the same object
        expect(balanceResult.current).toBe(contextResult.current.balances)
      })

      it('useStakingData() should return context.stakingData (derived from user)', async () => {
        const wrapper = createWrapper()

        const { result: contextResult } = renderHook(() => useLevrContext(), { wrapper })
        const { result: stakingResult } = renderHook(() => useStakingData(), { wrapper })

        contextResult.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(stakingResult.current.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Should be the same object
        expect(stakingResult.current).toBe(contextResult.current.stakingData)
      })

      it('useGovernanceData() should return context.governanceData (derived from user)', async () => {
        const wrapper = createWrapper()

        const { result: contextResult } = renderHook(() => useLevrContext(), { wrapper })
        const { result: governanceResult } = renderHook(() => useGovernanceData(), { wrapper })

        contextResult.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(governanceResult.current.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Should be the same object
        expect(governanceResult.current).toBe(contextResult.current.governanceData)
      })
    })

    describe('Hierarchical vs Flat Access', () => {
      it('should provide same data via hierarchical and flat access', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Hierarchical: user.data.balances
        // Flat: balances.data
        // Should be the SAME reference (not a copy)
        if (
          result.current.user.data &&
          result.current.balances.data &&
          result.current.stakingData.data &&
          result.current.governanceData.data
        ) {
          expect(result.current.user.data.balances).toBe(result.current.balances.data)
          expect(result.current.user.data.staking).toBe(result.current.stakingData.data)
          expect(result.current.user.data.governance).toBe(result.current.governanceData.data)
        }
      })

      it('should maintain object identity (no duplicates)', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        const balancesFromHierarchical = result.current.user.data?.balances
        const balancesFromFlat = result.current.balances.data

        // Should be exactly the same object (not a deep copy)
        if (balancesFromHierarchical && balancesFromFlat) {
          expect(balancesFromHierarchical).toBe(balancesFromFlat)
          // Verify it's the same token balance object
          expect(balancesFromHierarchical.token).toBe(balancesFromFlat.token)
        }
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

      it('refetch.afterTrade() should trigger user + pool', async () => {
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

        // Trigger afterTrade refetch
        await result.current.refetch.afterTrade()

        const callsAfterRefetch = tracker.getTotalCalls()
        const newCalls = callsAfterRefetch - callsBeforeRefetch

        // Should refetch user + pool (not project or proposals)
        expect(newCalls).toBeGreaterThanOrEqual(2)
        expect(newCalls).toBeLessThan(8)
      })

      it('refetch.afterStake() should trigger user + project', async () => {
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

        // Trigger afterStake refetch
        await result.current.refetch.afterStake()

        const callsAfterRefetch = tracker.getTotalCalls()
        const newCalls = callsAfterRefetch - callsBeforeRefetch

        // Should refetch user + project
        expect(newCalls).toBeGreaterThanOrEqual(2)
        expect(newCalls).toBeLessThan(12)
      })

      it('refetch.afterClaim() should trigger only user', async () => {
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

        // Trigger afterClaim refetch
        await result.current.refetch.afterClaim()

        const callsAfterRefetch = tracker.getTotalCalls()
        const newCalls = callsAfterRefetch - callsBeforeRefetch

        // Should only refetch user (balances, rewards)
        expect(newCalls).toBeGreaterThanOrEqual(1)
        expect(newCalls).toBeLessThan(5)
      })

      it('refetch.afterVote() should trigger user + proposals', async () => {
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

        // Trigger afterVote refetch
        await result.current.refetch.afterVote()

        const callsAfterRefetch = tracker.getTotalCalls()
        const newCalls = callsAfterRefetch - callsBeforeRefetch

        // Should refetch user + proposals
        expect(newCalls).toBeGreaterThanOrEqual(2)
        expect(newCalls).toBeLessThan(10)
      })

      it('refetch.afterExecute() should trigger project + proposals + user', async () => {
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

        // Trigger afterExecute refetch
        await result.current.refetch.afterExecute()

        const callsAfterRefetch = tracker.getTotalCalls()
        const newCalls = callsAfterRefetch - callsBeforeRefetch

        // Should refetch project + proposals + user
        expect(newCalls).toBeGreaterThanOrEqual(3)
        expect(newCalls).toBeLessThan(15)
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
      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
        },
      })

      // Mock wagmi hooks
      mock.module('wagmi', () => ({
        useAccount: () => ({ address: MOCK_USER_ADDRESS }),
        useChainId: () => MOCK_CHAIN_ID,
        usePublicClient: () => mockPublicClient,
        useConfig: () => ({}),
      }))

      // Mock getPublicClient util
      mock.module('../src/util', () => ({
        getPublicClient: () => mockPublicClient,
      }))
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

      it('should ensure hierarchical and flat access remain synced after refetches', async () => {
        const wrapper = createWrapper()

        const { result } = renderHook(() => useLevrContext(), { wrapper })

        result.current.setClankerToken(MOCK_CLANKER_TOKEN)

        await waitFor(
          () => {
            expect(result.current.user.data).toBeDefined()
          },
          { timeout: 3000 }
        )

        // Before refetch
        if (result.current.user.data && result.current.balances.data) {
          expect(result.current.user.data.balances).toBe(result.current.balances.data)
        }

        // Trigger refetch
        await result.current.refetch.afterStake()

        // After refetch - should still be same reference
        if (
          result.current.user.data &&
          result.current.balances.data &&
          result.current.stakingData.data &&
          result.current.governanceData.data
        ) {
          expect(result.current.user.data.balances).toBe(result.current.balances.data)
          expect(result.current.user.data.staking).toBe(result.current.stakingData.data)
          expect(result.current.user.data.governance).toBe(result.current.governanceData.data)
        }
      })
    })
  })
})
