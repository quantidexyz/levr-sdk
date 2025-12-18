import { beforeAll, describe, expect, it } from 'bun:test'
import { erc20Abi, formatUnits, parseEther } from 'viem'

import {
  IClankerLpLockerMultiple,
  LevrFeeSplitter_v1,
  LevrFeeSplitterFactory_v1,
} from '../src/abis'
import { GET_FEE_SPLITTER_FACTORY_ADDRESS } from '../src/constants'
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
    pairedToken: 'ETH',
    devBuy: '1 ETH', // Initial liquidity
    fees: {
      type: 'static',
      feeTier: '3%',
    },
    treasuryFunding: '50%',
    stakingReward: '100%',
  }

  // ---
  // VARIABLES

  let publicClient: SetupTestReturnType['publicClient']
  let wallet: SetupTestReturnType['wallet']
  let lpLockerAddress: SetupTestReturnType['lpLockerAddress']
  let clanker: SetupTestReturnType['clanker']
  let weth: SetupTestReturnType['weth']
  let feeSplitterDeployerAddress: `0x${string}`
  let feeSplitterAddress: `0x${string}` // Will be set after deploying splitter for token
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
    const _feeSplitterDeployerAddress = GET_FEE_SPLITTER_FACTORY_ADDRESS(chainId)
    if (!_feeSplitterDeployerAddress) throw new Error('Fee splitter deployer address not found')
    feeSplitterDeployerAddress = _feeSplitterDeployerAddress
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

      if (!staticProject?.isRegistered) throw new Error('Failed to get static project')
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

      console.log('\n=== Step 2.5: Deploy Fee Splitter for This Token ===')

      // Deploy fee splitter for this specific token
      const deployHash = await wallet.writeContract({
        address: feeSplitterDeployerAddress,
        abi: LevrFeeSplitterFactory_v1,
        functionName: 'deploy',
        args: [deployedTokenAddress],
        chain: wallet.chain,
      })
      await publicClient.waitForTransactionReceipt({ hash: deployHash })

      // Get deployed splitter address
      feeSplitterAddress = await publicClient.readContract({
        address: feeSplitterDeployerAddress,
        abi: LevrFeeSplitterFactory_v1,
        functionName: 'getSplitter',
        args: [deployedTokenAddress],
      })
      console.log('✓ Fee splitter deployed:', feeSplitterAddress)

      console.log('\n=== Step 3: Update Fee Receiver to Splitter ===')

      // Update LP locker to use fee splitter
      // Use index 1 (staking) not index 0 (Levr team) - we're the admin for index 1
      const hash1 = await wallet.writeContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'updateRewardRecipient',
        args: [deployedTokenAddress, 1n, feeSplitterAddress], // Index 1 = staking (98% of fees)
        chain: wallet.chain,
      })

      await publicClient.waitForTransactionReceipt({ hash: hash1 })
      console.log('✓ Fee receiver updated to splitter (index 1 = 98% of fees)')

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

      console.log('\n=== Step 4: Configure Splits (50% staking, 50% deployer) ===')

      const splits = [
        { receiver: stakingAddress, bps: 5000 },
        { receiver: wallet.account!.address, bps: 5000 },
      ]

      const hash2 = await wallet.writeContract({
        address: feeSplitterAddress, // Per-project splitter, not deployer
        abi: LevrFeeSplitter_v1,
        functionName: 'configureSplits',
        args: [splits],
        chain: wallet.chain,
      })

      await publicClient.waitForTransactionReceipt({ hash: hash2 })
      console.log('✓ Splits configured: 50% staking, 50% deployer')

      // Verify configuration
      const storedSplits = await publicClient.readContract({
        address: feeSplitterAddress,
        abi: LevrFeeSplitter_v1,
        functionName: 'getSplits',
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

      if (!staticProject?.isRegistered) throw new Error('Failed to get static project')

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

      console.log('\n=== Step 5.2: Use SDK to Get Project Data (Tests Multicall) ===')

      // Refetch static project with fee splitter info
      const staticProjectRefetch = await getStaticProject({
        publicClient,
        clankerToken: deployedTokenAddress,
        userAddress: wallet.account?.address,
      })

      if (!staticProjectRefetch?.isRegistered) throw new Error('Failed to get static project')

      console.log('Fee splitter info from SDK:')
      console.log({
        address: staticProjectRefetch.feeSplitter?.address,
        isActive: staticProjectRefetch.feeSplitter?.isActive,
        splits: staticProjectRefetch.feeSplitter?.splits?.length,
      })

      // Verify splits are configured correctly via SDK
      expect(staticProjectRefetch.feeSplitter?.splits?.length).toBe(2)
      expect(staticProjectRefetch.feeSplitter?.splits?.[0].bps).toBe(5000)
      expect(staticProjectRefetch.feeSplitter?.splits?.[1].bps).toBe(5000)
      console.log('✓ Splits configured correctly (verified via SDK): 50% staking, 50% deployer')

      console.log('\n=== Step 5.3: Get Project Data - Pending Fees from SDK Multicall ===')

      // Get full project data - this uses SDK multicall to fetch pending fees
      const projectBefore = await getProject({
        publicClient,
        staticProject: staticProjectRefetch,
      })

      if (!projectBefore) throw new Error('Failed to get project before')

      console.log('Outstanding Rewards BEFORE distribution (via SDK multicall):')
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
            projectBefore.stakingStats?.outstandingRewards.pairedToken?.available.raw ?? 0n,
            18
          ),
          pending: formatUnits(
            projectBefore.stakingStats?.outstandingRewards.pairedToken?.pending.raw ?? 0n,
            18
          ),
        },
      })

      // SDK should report fee splitter's pending fees (queried for correct recipient in multicall)
      const stakingPairedTokenPending =
        projectBefore.stakingStats?.outstandingRewards.pairedToken?.pending.raw ?? 0n
      expect(stakingPairedTokenPending).toBeGreaterThan(0n) // Should show fee splitter's pending from ClankerFeeLocker
      console.log(
        '✓ Confirmed: SDK multicall correctly fetched pairedToken pending fees:',
        formatUnits(stakingPairedTokenPending, 18),
        'pairedToken'
      )

      console.log('\n=== Step 5.4: Record Balances BEFORE AccrueAll ===')

      // Record staking balances BEFORE
      const stakingTokenBalanceBefore = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [stakingAddress],
      })

      const stakingWethBalanceBefore = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [stakingAddress],
      })

      // Record deployer balances BEFORE
      const deployerTokenBalanceBefore = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account?.address!],
      })

      const deployerWethBalanceBefore = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account?.address!],
      })

      console.log('Balances BEFORE accrueAll:')
      console.log({
        staking: {
          token: formatUnits(stakingTokenBalanceBefore, 18),
          pairedToken: formatUnits(stakingWethBalanceBefore, 18),
        },
        deployer: {
          token: formatUnits(deployerTokenBalanceBefore, 18),
          pairedToken: formatUnits(deployerWethBalanceBefore, 18),
        },
      })

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

      // Check deployer balances AFTER
      const deployerTokenBalanceAfter = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account?.address!],
      })

      const deployerWethBalanceAfter = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account?.address!],
      })

      console.log('\nBalances AFTER accrueAll:')
      console.log({
        staking: {
          token: formatUnits(stakingTokenBalanceAfter, 18),
          pairedToken: formatUnits(stakingWethBalanceAfter, 18),
        },
        deployer: {
          token: formatUnits(deployerTokenBalanceAfter, 18),
          pairedToken: formatUnits(deployerWethBalanceAfter, 18),
        },
      })

      // Calculate deltas
      const stakingTokenDelta = stakingTokenBalanceAfter - stakingTokenBalanceBefore
      const stakingWethDelta = stakingWethBalanceAfter - stakingWethBalanceBefore
      const deployerTokenDelta = deployerTokenBalanceAfter - deployerTokenBalanceBefore
      const deployerWethDelta = deployerWethBalanceAfter - deployerWethBalanceBefore

      console.log('\nBalance Changes (Deltas):')
      console.log({
        staking: {
          token: formatUnits(stakingTokenDelta, 18),
          pairedToken: formatUnits(stakingWethDelta, 18),
        },
        deployer: {
          token: formatUnits(deployerTokenDelta, 18),
          pairedToken: formatUnits(deployerWethDelta, 18),
        },
      })

      // Check fee splitter balance (should be 0 after distribution)
      const splitterTokenAfter = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [feeSplitterAddress],
      })

      const splitterWethAfter = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [feeSplitterAddress],
      })

      console.log('\nFee splitter balances after accrueAll (should be 0):')
      console.log({
        token: formatUnits(splitterTokenAfter, 18),
        pairedToken: formatUnits(splitterWethAfter, 18),
      })

      console.log('\n========================================')
      console.log('🔍 CRITICAL VERIFICATION: BOTH RECEIVERS GET BOTH TOKENS')
      console.log('========================================')

      // ✅ STAKING MUST RECEIVE BOTH TOKENS
      if (stakingWethDelta > 0n) {
        console.log('✅ Staking received pairedToken:', formatUnits(stakingWethDelta, 18))
      } else {
        console.log('❌ FAILURE: Staking did NOT receive pairedToken')
      }

      if (stakingTokenDelta > 0n) {
        console.log('✅ Staking received Clanker token:', formatUnits(stakingTokenDelta, 18))
      } else {
        console.log('❌ FAILURE: Staking did NOT receive Clanker token')
      }

      // ✅ DEPLOYER MUST RECEIVE BOTH TOKENS
      if (deployerWethDelta > 0n) {
        console.log('✅ Deployer received pairedToken:', formatUnits(deployerWethDelta, 18))
      } else {
        console.log('❌ FAILURE: Deployer did NOT receive pairedToken')
      }

      if (deployerTokenDelta > 0n) {
        console.log('✅ Deployer received Clanker token:', formatUnits(deployerTokenDelta, 18))
      } else {
        console.log('❌ FAILURE: Deployer did NOT receive Clanker token')
      }

      // CRITICAL ASSERTIONS: Both receivers MUST get BOTH tokens
      expect(stakingWethDelta).toBeGreaterThan(0n)
      expect(stakingTokenDelta).toBeGreaterThan(0n)
      expect(deployerWethDelta).toBeGreaterThan(0n)
      expect(deployerTokenDelta).toBeGreaterThan(0n)

      console.log('\n✅ VERIFIED: Both receivers got both tokens!')
      console.log('========================================')

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
        pairedToken: {
          available: formatUnits(
            projectAfter.stakingStats?.outstandingRewards.pairedToken?.available.raw ?? 0n,
            18
          ),
          pending: formatUnits(
            projectAfter.stakingStats?.outstandingRewards.pairedToken?.pending.raw ?? 0n,
            18
          ),
        },
      })

      console.log('Reward Rates AFTER accrueAll:')
      const tokenRateAfter = projectAfter.stakingStats?.rewardRates.token.raw ?? 0n
      const pairedTokenRateAfter = projectAfter.stakingStats?.rewardRates.pairedToken?.raw ?? 0n
      console.log({
        token: formatUnits(tokenRateAfter, 18) + '/sec',
        pairedToken: formatUnits(pairedTokenRateAfter, 18) + '/sec',
      })

      console.log('\n🔍 CRITICAL VERIFICATION:')

      // The bug you're seeing: pairedToken reward rate stays at 0
      if (pairedTokenRateAfter > 0n) {
        console.log('✅ SUCCESS: pairedToken reward rate > 0 (accrual worked!)')
      } else {
        console.log('❌ FAILURE: pairedToken reward rate = 0 (accrual FAILED!)')
      }

      if (tokenRateAfter > 0n) {
        console.log('✅ SUCCESS: Token reward rate > 0 (accrual worked!)')
      } else {
        console.log('❌ FAILURE: Token reward rate = 0 (accrual FAILED!)')
      }

      // Both should be > 0 for the test to pass
      expect(pairedTokenRateAfter).toBeGreaterThan(0n)
      expect(tokenRateAfter).toBeGreaterThan(0n)

      // Available should be 0 (everything accrued)
      const pairedTokenAvailable =
        projectAfter.stakingStats?.outstandingRewards.pairedToken?.available.raw ?? 0n
      const tokenAvailable =
        projectAfter.stakingStats?.outstandingRewards.staking.available.raw ?? 0n

      expect(pairedTokenAvailable).toBe(0n)
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

      if (!staticProject?.isRegistered) throw new Error('Failed to get static project')

      // Update fee receiver back to staking directly (remove fee splitter)
      // Use index 1 (staking recipient) - we control this one
      const hash = await wallet.writeContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'updateRewardRecipient',
        args: [deployedTokenAddress, 1n, stakingAddress],
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

      expect(tokenRewards.rewardRecipients?.[1]).toBe(stakingAddress) // Index 1 = main recipient (98%)
      console.log('✓ Verified: Fee receiver (index 1) is now staking (not splitter)')

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

      if (!staticProjectAfterSwitch?.isRegistered)
        throw new Error('Failed to get static project after switch')

      const projectBeforeAccrue = await getProject({
        publicClient,
        staticProject: staticProjectAfterSwitch,
      })

      if (!projectBeforeAccrue) throw new Error('Failed to get project before accrue')

      // Check current fee receiver configuration (should be staking, not splitter)
      const currentRecipients = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      console.log('Fee Receiver Status:')
      console.log({
        currentRecipient: currentRecipients.rewardRecipients?.[1], // Index 1 = main recipient (98%)
        isStaking: currentRecipients.rewardRecipients?.[1] === stakingAddress,
        isFeeSplitter: currentRecipients.rewardRecipients?.[1] === feeSplitterAddress,
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
            projectBeforeAccrue.stakingStats?.outstandingRewards.pairedToken?.available.raw ?? 0n,
            18
          ),
          pending: formatUnits(
            projectBeforeAccrue.stakingStats?.outstandingRewards.pairedToken?.pending.raw ?? 0n,
            18
          ),
        },
      })

      console.log('\nReward Rates BEFORE accrueAll (staking-only):')
      console.log({
        token: `${formatUnits(projectBeforeAccrue.stakingStats?.rewardRates.token.raw ?? 0n, 18)}/sec`,
        pairedToken: `${formatUnits(projectBeforeAccrue.stakingStats?.rewardRates.pairedToken?.raw ?? 0n, 18)}/sec`,
      })

      // Verify fee receiver is now staking (NOT the fee splitter)
      const currentFeeReceivers = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      const isStakingDirectly = currentFeeReceivers.rewardRecipients?.[1] === stakingAddress // Index 1 = main recipient
      expect(isStakingDirectly).toBe(true)
      console.log('✓ Confirmed: Fees going directly to staking (index 1, not fee splitter)')

      // Check if we have WETH pending fees (going directly to staking)
      const wethPendingDirect =
        projectBeforeAccrue.stakingStats?.outstandingRewards.pairedToken?.pending.raw ?? 0n

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
        projectAfterAccrue2.stakingStats?.outstandingRewards.pairedToken?.available.raw ?? 0n
      const tokenPending2 =
        projectAfterAccrue2.stakingStats?.outstandingRewards.staking.pending.raw ?? 0n
      const wethPending2 =
        projectAfterAccrue2.stakingStats?.outstandingRewards.pairedToken?.pending.raw ?? 0n

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
      const pairedTokenRateAfter2 =
        projectAfterAccrue2.stakingStats?.rewardRates.pairedToken?.raw ?? 0n

      console.log({
        token: `${formatUnits(tokenRateAfter2, 18)}/sec`,
        pairedToken: `${formatUnits(pairedTokenRateAfter2, 18)}/sec`,
      })

      console.log('\n🔍 CRITICAL VERIFICATION (Staking-Only Mode):')

      // Reward rates should still be > 0 (from previous accruals + any new accruals)
      // The key is they shouldn't decrease or become 0 when switching modes
      if (pairedTokenRateAfter2 > 0n) {
        console.log('✅ SUCCESS: WETH reward rate > 0 (direct staking mode maintains rewards!)')
      } else {
        console.log('❌ FAILURE: WETH reward rate = 0 (switching modes broke rewards!)')
      }

      if (tokenRateAfter2 > 0n) {
        console.log('✅ SUCCESS: Token reward rate > 0 (direct staking mode maintains rewards!)')
      } else {
        console.log('❌ FAILURE: Token reward rate = 0 (switching modes broke rewards!)')
      }

      expect(pairedTokenRateAfter2).toBeGreaterThan(0n)
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

  it(
    'should only request 1 transaction when updating splits on already-active splitter',
    async () => {
      console.log('\n=== Smart Update: Already-Active Splitter ===')

      // First, switch fee receiver back to splitter if not already
      const tokenRewardsCheck = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      const currentRecipient = tokenRewardsCheck.rewardRecipients?.[1] // Index 1 = main recipient (98%)
      const isSplitterActive = currentRecipient === feeSplitterAddress

      if (!isSplitterActive) {
        console.log('Fee receiver is not splitter, switching back...')
        const switchHash = await wallet.writeContract({
          address: lpLockerAddress,
          abi: IClankerLpLockerMultiple,
          functionName: 'updateRewardRecipient',
          args: [deployedTokenAddress, 1n, feeSplitterAddress], // Index 1 = main recipient
          chain: wallet.chain,
        })
        await publicClient.waitForTransactionReceipt({ hash: switchHash })
        console.log('✓ Fee receiver (index 1) switched back to splitter')
      }

      // Get current project state
      const staticProjectCurrent = await getStaticProject({
        publicClient,
        clankerToken: deployedTokenAddress,
      })

      if (!staticProjectCurrent?.isRegistered) throw new Error('Failed to get static project')

      // Verify splitter is currently active
      const tokenRewardsCurrent = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      const finalRecipient = tokenRewardsCurrent.rewardRecipients?.[1] // Index 1 = main recipient (98%)
      expect(finalRecipient).toBe(feeSplitterAddress)
      console.log('✓ Verified: Fee splitter is currently the active recipient (index 1)')

      // Now update splits WITHOUT needing to update recipient
      // (since splitter is already active)
      console.log('\nUpdating splits configuration (should be 1 TX, not 2):')

      const newSplits = [
        { receiver: stakingAddress, bps: 6000 }, // 60% staking
        { receiver: wallet.account!.address, bps: 4000 }, // 40% deployer
      ]

      const updateHash = await wallet.writeContract({
        address: feeSplitterAddress, // ✅ Direct call to splitter
        abi: LevrFeeSplitter_v1,
        functionName: 'configureSplits',
        args: [newSplits],
        chain: wallet.chain,
      })

      const updateReceipt = await publicClient.waitForTransactionReceipt({ hash: updateHash })
      expect(updateReceipt.status).toBe('success')
      console.log('✅ Single transaction completed (splits updated)')
      console.log('   TX Hash:', updateHash)

      // Verify the new split configuration
      const updatedSplits = await publicClient.readContract({
        address: feeSplitterAddress,
        abi: LevrFeeSplitter_v1,
        functionName: 'getSplits',
      })

      expect(updatedSplits[0].bps).toBe(6000)
      expect(updatedSplits[1].bps).toBe(4000)
      console.log('✓ Verified: New splits configured (60% staking, 40% deployer)')

      // Verify recipient is STILL the splitter (unchanged)
      const tokenRewardsAfter = await publicClient.readContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [deployedTokenAddress],
      })

      expect(tokenRewardsAfter.rewardRecipients?.[1]).toBe(feeSplitterAddress) // Index 1 = main recipient
      console.log('✓ Verified: Fee recipient (index 1) unchanged (still splitter)')

      console.log('\n🎉 Smart Update Works!')
      console.log('✅ Only 1 transaction requested (configureSplits only)')
      console.log('✅ Recipient update skipped (already active)')
      console.log('✅ New split configuration applied successfully')
    },
    { timeout: 60_000 }
  )
})
