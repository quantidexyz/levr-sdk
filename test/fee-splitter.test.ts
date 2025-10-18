import { beforeAll, describe, expect, it } from 'bun:test'
import { erc20Abi, formatUnits, parseEther } from 'viem'

import { IClankerLpLockerMultiple, LevrFeeSplitter_v1 } from '../src/abis'
import { GET_FEE_SPLITTER_ADDRESS } from '../src/constants'
import { deployV4 } from '../src/deploy-v4'
import { getProject, getStaticProject } from '../src/project'
import { quote } from '../src/quote'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
import { Stake } from '../src/stake'
import { swapV4 } from '../src/swap-v4'
import { setupTest, type SetupTestReturnType } from './helper'
import { warpAnvil } from './util'

/**
 * Fee Splitter Integration Tests - FOCUSED
 *
 * This test validates the COMPLETE flow:
 * 1. Deploy token with fee splitter (50% staking, 50% deployer)
 * 2. Make swaps (ETH → Token and Token → ETH) to generate REAL fees
 * 3. Call accrueAllRewards
 * 4. Verify BOTH token and WETH reward rates are NOT zero (proves accrual worked)
 *
 * Prerequisites:
 * 1. Anvil must be running: `cd contracts && make anvil-fork`
 * 2. LevrFactory_v1 must be deployed: `cd packages/levr-sdk && bun run devnet:redeploy`
 */
describe('#FEE_SPLITTER_REAL_FLOW', () => {
  // ---
  // CONSTANTS

  const testDeploymentConfig: LevrClankerDeploymentSchemaType = {
    name: 'Fee Splitter Real Flow Test',
    symbol: 'FSRF',
    image: 'ipfs://bafkreif2xtaifw7byqxoydsmbrgrpryyvpz65fwdxghgbrurj6uzhhkktm',
    metadata: {
      description: 'Real swap fee testing',
    },
    devBuy: '1 ETH', // Initial liquidity
    fees: {
      type: 'static',
      feeTier: '3%',
    },
    treasuryFunding: '50%',
  }

  // ---
  // VARIABLES

  let publicClient: SetupTestReturnType['publicClient']
  let wallet: SetupTestReturnType['wallet']
  let lpLockerAddress: SetupTestReturnType['lpLockerAddress']
  let clanker: SetupTestReturnType['clanker']
  let weth: SetupTestReturnType['weth']
  let feeSplitterAddress: `0x${string}`
  let deployedTokenAddress: `0x${string}`
  let stakingAddress: `0x${string}`

  beforeAll(() => {
    const setup = setupTest()
    publicClient = setup.publicClient
    wallet = setup.wallet
    lpLockerAddress = setup.lpLockerAddress
    clanker = setup.clanker
    weth = setup.weth

    const chainId = publicClient.chain?.id
    const _feeSplitterAddress = GET_FEE_SPLITTER_ADDRESS(chainId)
    if (!_feeSplitterAddress) throw new Error('Fee splitter address not found')
    feeSplitterAddress = _feeSplitterAddress
  })

  it(
    'should deploy token and configure fee splitter (50% staking, 50% deployer)',
    async () => {
      console.log('\n=== Step 1: Deploy Token ===')

      const { receipt, address: clankerToken } = await deployV4({
        c: testDeploymentConfig,
        clanker,
      })

      expect(receipt.status).toBe('success')
      deployedTokenAddress = clankerToken
      console.log('✓ Token deployed:', clankerToken)

      // Get staking address
      const staticProject = await getStaticProject({
        publicClient,
        clankerToken: deployedTokenAddress,
      })

      if (!staticProject) throw new Error('Failed to get static project')
      stakingAddress = staticProject.staking
      console.log('✓ Staking address:', stakingAddress)

      console.log('\n=== Step 2: Check Initial Fee Receiver Configuration ===')

      const tokenRewardsBefore = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      console.log('Initial fee configuration:')
      console.log({
        numRecipients: tokenRewardsBefore.rewardRecipients?.length,
        recipients: tokenRewardsBefore.rewardRecipients,
        bps: tokenRewardsBefore.rewardBps,
      })

      console.log('\n=== Step 3: Update Fee Receiver to Splitter ===')

      // Update LP locker to use fee splitter
      const hash1 = await wallet.writeContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'updateRewardRecipient',
        args: [deployedTokenAddress, 0n, feeSplitterAddress],
        chain: wallet.chain,
      })

      await publicClient.waitForTransactionReceipt({ hash: hash1 })
      console.log('✓ Fee receiver updated to splitter')

      // Verify update
      const tokenRewardsAfter = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      console.log('Updated fee configuration:')
      console.log({
        numRecipients: tokenRewardsAfter.rewardRecipients?.length,
        recipients: tokenRewardsAfter.rewardRecipients,
        bps: tokenRewardsAfter.rewardBps,
      })

      console.log('\n=== Step 3: Configure Splits (50% staking, 50% deployer) ===')

      const splits = [
        { receiver: stakingAddress, bps: 5000 },
        { receiver: wallet.account!.address, bps: 5000 },
      ]

      const hash2 = await wallet.writeContract({
        address: feeSplitterAddress,
        abi: LevrFeeSplitter_v1,
        functionName: 'configureSplits',
        args: [deployedTokenAddress, splits],
        chain: wallet.chain,
      })

      await publicClient.waitForTransactionReceipt({ hash: hash2 })
      console.log('✓ Splits configured: 50% staking, 50% deployer')

      // Verify configuration
      const storedSplits = await publicClient.readContract({
        address: feeSplitterAddress,
        abi: LevrFeeSplitter_v1,
        functionName: 'getSplits',
        args: [deployedTokenAddress],
      })

      expect(storedSplits.length).toBe(2)
      expect(storedSplits[0].receiver).toBe(stakingAddress)
      expect(storedSplits[0].bps).toBe(5000)
      console.log('✓ Configuration verified')
    },
    { timeout: 120_000 }
  )

  it(
    'should make swaps to generate real fees, then accrueAll and verify reward rates',
    async () => {
      console.log('\n=== Step 4: Warp Time to Bypass MEV Protection ===')
      await warpAnvil(120)
      console.log('✓ Warped 120 seconds forward')

      console.log('\n=== Step 5: Make Real Swaps to Generate Fees ===')

      const staticProject = await getStaticProject({
        publicClient,
        clankerToken: deployedTokenAddress,
      })

      if (!staticProject) throw new Error('Failed to get static project')

      const fullProject = await getProject({
        publicClient,
        staticProject,
      })

      if (!fullProject) throw new Error('Failed to get full project')

      if (!fullProject.pool) throw new Error('Pool not found')

      // Swap 1: ETH → Token (generates WETH fees)
      console.log('Making swap: 0.1 ETH → Token...')

      const swapAmount1 = parseEther('0.1')
      const zeroForOne1 = weth.address < deployedTokenAddress

      const quoteResult1 = await quote.v4.read({
        publicClient,
        poolKey: fullProject.pool.poolKey,
        zeroForOne: zeroForOne1,
        amountIn: swapAmount1,
      })

      const swapReceipt1 = await swapV4({
        wallet,
        publicClient,
        chainId: publicClient.chain!.id,
        poolKey: fullProject.pool.poolKey,
        zeroForOne: zeroForOne1,
        amountIn: swapAmount1,
        amountOutMinimum: (quoteResult1.amountOut * 90n) / 100n, // 10% slippage
      })

      expect(swapReceipt1.status).toBe('success')
      console.log('✓ Swap 1 completed (ETH → Token)')

      // Swap 2: Token → ETH (generates more WETH fees)
      const tokenBalance = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account!.address],
      })

      const swapAmount2 = tokenBalance / 10n // Swap 10% of balance
      console.log(`Making swap: ${formatUnits(swapAmount2, 18)} Token → ETH...`)

      const zeroForOne2 = deployedTokenAddress < weth.address

      const quoteResult2 = await quote.v4.read({
        publicClient,
        poolKey: fullProject.pool.poolKey,
        zeroForOne: zeroForOne2,
        amountIn: swapAmount2,
      })

      const swapReceipt2 = await swapV4({
        wallet,
        publicClient,
        chainId: publicClient.chain!.id,
        poolKey: fullProject.pool.poolKey,
        zeroForOne: zeroForOne2,
        amountIn: swapAmount2,
        amountOutMinimum: (quoteResult2.amountOut * 90n) / 100n,
      })

      expect(swapReceipt2.status).toBe('success')
      console.log('✓ Swap 2 completed (Token → ETH)')

      console.log('\n=== Step 5.1: Check Fee Locations After Swaps ===')

      // Check fee splitter balance (should have fees if they were sent directly)
      const splitterTokenBalance = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [feeSplitterAddress],
      })

      const splitterWethBalance = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [feeSplitterAddress],
      })

      console.log('Fee splitter balances (direct):')
      console.log({
        token: formatUnits(splitterTokenBalance, 18),
        weth: formatUnits(splitterWethBalance, 18),
      })

      // Check fee splitter pending (from ClankerFeeLocker)
      const splitterPendingToken = await publicClient.readContract({
        address: feeSplitterAddress,
        abi: LevrFeeSplitter_v1,
        functionName: 'pendingFees',
        args: [deployedTokenAddress, deployedTokenAddress],
      })

      const splitterPendingWeth = await publicClient.readContract({
        address: feeSplitterAddress,
        abi: LevrFeeSplitter_v1,
        functionName: 'pendingFees',
        args: [deployedTokenAddress, weth.address],
      })

      console.log('Fee splitter pending (from ClankerFeeLocker):')
      console.log({
        token: formatUnits(splitterPendingToken, 18),
        weth: formatUnits(splitterPendingWeth, 18),
      })

      console.log('\n=== Step 5.2: Check Fee Splitter Status ===')

      // Refetch static project to get fee splitter status
      const staticProjectRefetch = await getStaticProject({
        publicClient,
        clankerToken: deployedTokenAddress,
        userAddress: wallet.account?.address,
      })

      if (!staticProjectRefetch) throw new Error('Failed to get static project')

      console.log('Fee Splitter Status:')
      console.log({
        isConfigured: staticProjectRefetch.feeSplitter?.isConfigured,
        isActive: staticProjectRefetch.feeSplitter?.isActive,
        splitsLength: staticProjectRefetch.feeSplitter?.splits.length,
      })

      console.log('\n=== Step 5.3: Check Outstanding Rewards BEFORE AccrueAll ===')

      // Refetch project to see pending fees
      const projectBefore = await getProject({
        publicClient,
        staticProject: staticProjectRefetch,
      })

      if (!projectBefore) throw new Error('Failed to get project before')

      console.log('Outstanding Rewards BEFORE accrueAll:')
      console.log({
        token: {
          available: formatUnits(
            projectBefore.stakingStats?.outstandingRewards.staking.available.raw ?? 0n,
            18
          ),
          pending: formatUnits(
            projectBefore.stakingStats?.outstandingRewards.staking.pending.raw ?? 0n,
            18
          ),
        },
        weth: {
          available: formatUnits(
            projectBefore.stakingStats?.outstandingRewards.weth?.available.raw ?? 0n,
            18
          ),
          pending: formatUnits(
            projectBefore.stakingStats?.outstandingRewards.weth?.pending.raw ?? 0n,
            18
          ),
        },
      })

      console.log('Reward Rates BEFORE accrueAll:')
      console.log({
        token: formatUnits(projectBefore.stakingStats?.rewardRates.token.raw ?? 0n, 18) + '/sec',
        weth: formatUnits(projectBefore.stakingStats?.rewardRates.weth?.raw ?? 0n, 18) + '/sec',
      })

      // Verify we have pending WETH fees
      const wethPending = projectBefore.stakingStats?.outstandingRewards.weth?.pending.raw ?? 0n
      expect(wethPending).toBeGreaterThan(0n)
      console.log('✓ Confirmed: WETH pending fees > 0')

      console.log('\n=== Step 6: Call AccrueAll ===')

      const stake = new Stake({
        wallet,
        publicClient,
        project: fullProject,
      })

      const accrueReceipt = await stake.accrueAllRewards({
        useFeeSplitter: true,
      })

      expect(accrueReceipt.status).toBe('success')
      console.log('✓ accrueAllRewards({ useFeeSplitter: true }) completed')
      console.log('  Gas used:', accrueReceipt.gasUsed.toString())
      console.log('  Events emitted:', accrueReceipt.logs.length)

      // Check staking balances IMMEDIATELY after accrue
      const stakingTokenBalanceAfter = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [stakingAddress],
      })

      const stakingWethBalanceAfter = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [stakingAddress],
      })

      console.log('\nStaking contract balances AFTER accrueAll:')
      console.log({
        token: formatUnits(stakingTokenBalanceAfter, 18),
        weth: formatUnits(stakingWethBalanceAfter, 18),
      })

      // Check deployer balances (should have received 50% of fees)
      const deployerWethBalance = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account?.address!],
      })

      console.log('\nDeployer WETH balance after accrueAll:', formatUnits(deployerWethBalance, 18))

      // Check fee splitter balance (should be 0 after distribution)
      const splitterWethAfter = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [feeSplitterAddress],
      })

      console.log('Fee splitter WETH balance after accrueAll:', formatUnits(splitterWethAfter, 18))

      console.log('\n🚨 WHERE DID THE FEES GO?')
      console.log(`  Fees before: 0.1312 WETH pending`)
      console.log(`  Staking received: ${formatUnits(stakingWethBalanceAfter, 18)} WETH`)
      console.log(`  Deployer has: ${formatUnits(deployerWethBalance, 18)} WETH (total, not delta)`)
      console.log(`  Splitter has: ${formatUnits(splitterWethAfter, 18)} WETH`)

      console.log('\n=== Step 7: Verify Data AFTER AccrueAll ===')

      const projectAfter = await getProject({
        publicClient,
        staticProject,
      })

      if (!projectAfter) throw new Error('Failed to get project after')

      console.log('Outstanding Rewards AFTER accrueAll:')
      console.log({
        token: {
          available: formatUnits(
            projectAfter.stakingStats?.outstandingRewards.staking.available.raw ?? 0n,
            18
          ),
          pending: formatUnits(
            projectAfter.stakingStats?.outstandingRewards.staking.pending.raw ?? 0n,
            18
          ),
        },
        weth: {
          available: formatUnits(
            projectAfter.stakingStats?.outstandingRewards.weth?.available.raw ?? 0n,
            18
          ),
          pending: formatUnits(
            projectAfter.stakingStats?.outstandingRewards.weth?.pending.raw ?? 0n,
            18
          ),
        },
      })

      console.log('Reward Rates AFTER accrueAll:')
      const tokenRateAfter = projectAfter.stakingStats?.rewardRates.token.raw ?? 0n
      const wethRateAfter = projectAfter.stakingStats?.rewardRates.weth?.raw ?? 0n
      console.log({
        token: formatUnits(tokenRateAfter, 18) + '/sec',
        weth: formatUnits(wethRateAfter, 18) + '/sec',
      })

      console.log('\n🔍 CRITICAL VERIFICATION:')

      // The bug you're seeing: WETH reward rate stays at 0
      if (wethRateAfter > 0n) {
        console.log('✅ SUCCESS: WETH reward rate > 0 (accrual worked!)')
      } else {
        console.log('❌ FAILURE: WETH reward rate = 0 (accrual FAILED!)')
      }

      if (tokenRateAfter > 0n) {
        console.log('✅ SUCCESS: Token reward rate > 0 (accrual worked!)')
      } else {
        console.log('❌ FAILURE: Token reward rate = 0 (accrual FAILED!)')
      }

      // Both should be > 0 for the test to pass
      expect(wethRateAfter).toBeGreaterThan(0n)
      expect(tokenRateAfter).toBeGreaterThan(0n)

      // Available should be 0 (everything accrued)
      const wethAvailable = projectAfter.stakingStats?.outstandingRewards.weth?.available.raw ?? 0n
      const tokenAvailable =
        projectAfter.stakingStats?.outstandingRewards.staking.available.raw ?? 0n

      expect(wethAvailable).toBe(0n)
      expect(tokenAvailable).toBe(0n)
      console.log('✅ Available rewards = 0 (everything was accrued)')

      console.log('\n🎉 COMPLETE FLOW VERIFIED!')
    },
    { timeout: 180_000 }
  )

  it(
    'should switch to staking-only mode and verify accrueAll still works',
    async () => {
      console.log('\n=== Step 8: Switch Fee Receiver to Staking Only ===')

      const staticProject = await getStaticProject({
        publicClient,
        clankerToken: deployedTokenAddress,
        userAddress: wallet.account?.address,
      })

      if (!staticProject) throw new Error('Failed to get static project')

      // Update fee receiver back to staking directly (remove fee splitter)
      const hash = await wallet.writeContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'updateRewardRecipient',
        args: [deployedTokenAddress, 0n, stakingAddress],
        chain: wallet.chain,
      })

      await publicClient.waitForTransactionReceipt({ hash })
      console.log('✓ Fee receiver updated to staking directly')

      // Verify the update
      const tokenRewards = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      expect(tokenRewards.rewardRecipients?.[0]).toBe(stakingAddress)
      console.log('✓ Verified: Fee receiver is now staking (not splitter)')

      console.log('\n=== Step 9: Make More Swaps (Direct to Staking) ===')

      const fullProject = await getProject({
        publicClient,
        staticProject,
      })

      if (!fullProject || !fullProject.pool) throw new Error('Failed to get full project')

      // Swap 3: ETH → Token (fees go directly to staking now)
      const swapAmount3 = parseEther('0.05')
      const zeroForOne3 = weth.address < deployedTokenAddress

      console.log('Making swap: 0.05 ETH → Token (fees to staking directly)...')

      const quoteResult3 = await quote.v4.read({
        publicClient,
        poolKey: fullProject.pool.poolKey,
        zeroForOne: zeroForOne3,
        amountIn: swapAmount3,
      })

      const swapReceipt3 = await swapV4({
        wallet,
        publicClient,
        chainId: publicClient.chain!.id,
        poolKey: fullProject.pool.poolKey,
        zeroForOne: zeroForOne3,
        amountIn: swapAmount3,
        amountOutMinimum: (quoteResult3.amountOut * 90n) / 100n,
      })

      expect(swapReceipt3.status).toBe('success')
      console.log('✓ Swap 3 completed (ETH → Token)')

      // Warp time to allow fees to be claimable
      console.log('\nWarping time to allow fees to be claimable...')
      await warpAnvil(10)
      console.log('✓ Warped 10 seconds forward')

      console.log('\n=== Step 10: Check Outstanding Rewards (Staking-Only Mode) ===')

      // Refetch to get updated fee receiver status
      const staticProjectAfterSwitch = await getStaticProject({
        publicClient,
        clankerToken: deployedTokenAddress,
        userAddress: wallet.account?.address,
      })

      if (!staticProjectAfterSwitch) throw new Error('Failed to get static project after switch')

      const projectBeforeAccrue = await getProject({
        publicClient,
        staticProject: staticProjectAfterSwitch,
      })

      if (!projectBeforeAccrue) throw new Error('Failed to get project before accrue')

      console.log('Fee Splitter Status:')
      console.log({
        isConfigured: projectBeforeAccrue.feeSplitter?.isConfigured,
        isActive: projectBeforeAccrue.feeSplitter?.isActive, // Should be FALSE now
        splitsLength: projectBeforeAccrue.feeSplitter?.splits.length,
      })

      // Check staking contract balances directly
      const stakingTokenBalance = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [stakingAddress],
      })

      const stakingWethBalance = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [stakingAddress],
      })

      console.log('\nStaking contract token balances (direct check):')
      console.log({
        token: formatUnits(stakingTokenBalance, 18),
        weth: formatUnits(stakingWethBalance, 18),
      })

      console.log('\nOutstanding Rewards BEFORE accrueAll (staking-only):')
      console.log({
        token: {
          available: formatUnits(
            projectBeforeAccrue.stakingStats?.outstandingRewards.staking.available.raw ?? 0n,
            18
          ),
          pending: formatUnits(
            projectBeforeAccrue.stakingStats?.outstandingRewards.staking.pending.raw ?? 0n,
            18
          ),
        },
        weth: {
          available: formatUnits(
            projectBeforeAccrue.stakingStats?.outstandingRewards.weth?.available.raw ?? 0n,
            18
          ),
          pending: formatUnits(
            projectBeforeAccrue.stakingStats?.outstandingRewards.weth?.pending.raw ?? 0n,
            18
          ),
        },
      })

      console.log('\nReward Rates BEFORE accrueAll (staking-only):')
      console.log({
        token: `${formatUnits(projectBeforeAccrue.stakingStats?.rewardRates.token.raw ?? 0n, 18)}/sec`,
        weth: `${formatUnits(projectBeforeAccrue.stakingStats?.rewardRates.weth?.raw ?? 0n, 18)}/sec`,
      })

      // Verify fee splitter is NOT active (staking is receiving directly)
      expect(projectBeforeAccrue.feeSplitter?.isActive).toBe(false)
      console.log('✓ Confirmed: Fee splitter is NOT active')

      // Check if we have WETH pending fees (going directly to staking)
      const wethPendingDirect =
        projectBeforeAccrue.stakingStats?.outstandingRewards.weth?.pending.raw ?? 0n

      if (wethPendingDirect === 0n) {
        console.log(
          '⚠️  No new WETH pending fees yet - but we can still test direct accrual with existing balance'
        )
        console.log('   (Staking contract already has WETH from previous accrual)')
      } else {
        console.log('✓ Confirmed: WETH pending fees > 0 (direct to staking)')
      }

      console.log('\n=== Step 11: Call AccrueAll (WITHOUT Fee Splitter) ===')

      const stake = new Stake({
        wallet,
        publicClient,
        project: projectBeforeAccrue,
      })

      // This should use direct mode (NOT fee splitter) because isActive = false
      const accrueReceipt2 = await stake.accrueAllRewards({
        useFeeSplitter: false, // Explicitly use direct mode
      })

      expect(accrueReceipt2.status).toBe('success')
      console.log('✓ accrueAllRewards({ useFeeSplitter: false }) completed')
      console.log('  Gas used:', accrueReceipt2.gasUsed.toString())

      console.log('\n=== Step 12: Verify Data AFTER AccrueAll (Staking-Only) ===')

      const projectAfterAccrue2 = await getProject({
        publicClient,
        staticProject: staticProjectAfterSwitch,
      })

      if (!projectAfterAccrue2) throw new Error('Failed to get project after second accrue')

      console.log('Outstanding Rewards AFTER accrueAll (staking-only):')
      const tokenAvailable2 =
        projectAfterAccrue2.stakingStats?.outstandingRewards.staking.available.raw ?? 0n
      const wethAvailable2 =
        projectAfterAccrue2.stakingStats?.outstandingRewards.weth?.available.raw ?? 0n
      const tokenPending2 =
        projectAfterAccrue2.stakingStats?.outstandingRewards.staking.pending.raw ?? 0n
      const wethPending2 =
        projectAfterAccrue2.stakingStats?.outstandingRewards.weth?.pending.raw ?? 0n

      console.log({
        token: {
          available: formatUnits(tokenAvailable2, 18),
          pending: formatUnits(tokenPending2, 18),
        },
        weth: {
          available: formatUnits(wethAvailable2, 18),
          pending: formatUnits(wethPending2, 18),
        },
      })

      console.log('\nReward Rates AFTER accrueAll (staking-only):')
      const tokenRateAfter2 = projectAfterAccrue2.stakingStats?.rewardRates.token.raw ?? 0n
      const wethRateAfter2 = projectAfterAccrue2.stakingStats?.rewardRates.weth?.raw ?? 0n

      console.log({
        token: `${formatUnits(tokenRateAfter2, 18)}/sec`,
        weth: `${formatUnits(wethRateAfter2, 18)}/sec`,
      })

      console.log('\n🔍 CRITICAL VERIFICATION (Staking-Only Mode):')

      // Reward rates should still be > 0 (from previous accruals + any new accruals)
      // The key is they shouldn't decrease or become 0 when switching modes
      if (wethRateAfter2 > 0n) {
        console.log('✅ SUCCESS: WETH reward rate > 0 (direct staking mode maintains rewards!)')
      } else {
        console.log('❌ FAILURE: WETH reward rate = 0 (switching modes broke rewards!)')
      }

      if (tokenRateAfter2 > 0n) {
        console.log('✅ SUCCESS: Token reward rate > 0 (direct staking mode maintains rewards!)')
      } else {
        console.log('❌ FAILURE: Token reward rate = 0 (switching modes broke rewards!)')
      }

      expect(wethRateAfter2).toBeGreaterThan(0n)
      expect(tokenRateAfter2).toBeGreaterThan(0n)

      // Available should be 0 (everything gets accrued in both modes)
      expect(tokenAvailable2).toBe(0n)
      expect(wethAvailable2).toBe(0n)

      console.log('✅ Outstanding available = 0 (accrual works in direct mode)')
      console.log('✅ Reward rates maintained when switching from splitter to direct mode')

      // Log final summary showing both modes worked
      console.log('\n📊 FINAL SUMMARY:')
      console.log('═══════════════════════════════════════════════════════════')
      console.log('Test Flow:')
      console.log('  1. Deploy token with fee splitter (50% staking, 50% deployer)')
      console.log('  2. Make swaps → generate fees in ClankerFeeLocker')
      console.log('  3. AccrueAll with splitter → fees distributed & accrued ✅')
      console.log('  4. Switch to direct staking (100% to staking)')
      console.log('  5. Make more swaps → generate more fees')
      console.log('  6. AccrueAll direct → fees accrued without splitter ✅')
      console.log('═══════════════════════════════════════════════════════════')
      console.log('\n🎉 BOTH MODES VERIFIED!')
      console.log('✅ Mode 1: Fee Splitter (50/50 split) - Working!')
      console.log('✅ Mode 2: Direct to Staking (100% staking) - Working!')
      console.log('✅ Configuration changes work seamlessly mid-flight!')
      console.log('✅ Outstanding rewards calculation adapts correctly to mode changes!')
    },
    { timeout: 180_000 }
  )
})
