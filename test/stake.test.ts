import { beforeAll, describe, expect, it } from 'bun:test'
import { erc20Abi, formatEther, parseEther } from 'viem'

import { LevrFactory_v1 } from '../src/abis'
import { deployV4 } from '../src/deploy-v4'
import { quoteV4 } from '../src/quote-v4'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
import { Stake } from '../src/stake'
import { swapV4 } from '../src/swap-v4'
import { getTokenRewards, setupTest, type SetupTestReturnType } from './helper'
import { warpAnvil } from './util'

/**
 * Deploy, Quote, and Swap Tests
 *
 * These tests validate the complete trading flow:
 * 1. Deploy a Clanker token via Levr
 * 2. Quote and execute swap: Native ETH → Token
 * 3. Quote and execute swap: Token → Native ETH
 *
 * Prerequisites:
 * 1. Anvil must be running with Base fork: `cd contracts && make anvil-fork`
 * 2. LevrFactory_v1 must be deployed: `cd contracts && make deploy-devnet-factory`
 * 3. Clanker v4 contracts must be deployed on the fork
 * 4. Account must have ETH for gas and swap operations
 */
describe('#STAKE_TEST', () => {
  // ---
  // CONSTANTS

  const testDeploymentConfig: LevrClankerDeploymentSchemaType = {
    name: 'Swap Test Token',
    symbol: 'SWAP',
    image: 'ipfs://bafkreif2xtaifw7byqxoydsmbrgrpryyvpz65fwdxghgbrurj6uzhhkktm',
    metadata: {
      description: 'Test token for swap testing',
      telegramLink: 'https://t.me/swaptoken',
    },
    devBuy: '0.5 ETH', // Add initial liquidity
    fees: {
      type: 'static',
      feeTier: '3%',
    },
    treasuryFunding: '90%',
  }

  // ---
  // VARIABLES (shared across tests)

  let publicClient: SetupTestReturnType['publicClient']
  let wallet: SetupTestReturnType['wallet']
  let chainId: SetupTestReturnType['chainId']
  let factoryAddress: SetupTestReturnType['factoryAddress']
  let clanker: SetupTestReturnType['clanker']
  let weth: SetupTestReturnType['weth']
  let deployedTokenAddress: `0x${string}`
  let staking: Stake
  let project: {
    treasury: `0x${string}`
    governor: `0x${string}`
    staking: `0x${string}`
    stakedToken: `0x${string}`
  }

  beforeAll(() => {
    ;({ publicClient, wallet, chainId, factoryAddress, clanker, weth } = setupTest())
  })

  it(
    'should deploy token',
    async () => {
      const { receipt, address: clankerToken } = await deployV4({
        c: testDeploymentConfig,
        clanker,
      })

      expect(receipt.status).toBe('success')
      expect(clankerToken).toBeDefined()

      // Store deployed token address for subsequent tests
      deployedTokenAddress = clankerToken

      console.log('✅ Token deployed:', {
        txHash: receipt.transactionHash,
        clankerToken,
      })

      // Wait for MEV protection delay (120 seconds)
      console.log('\n⏰ Warping 120 seconds forward to bypass MEV protection...')
      await warpAnvil(120)

      console.log('\n📋 Getting project contracts...')
      project = await publicClient.readContract({
        address: factoryAddress,
        abi: LevrFactory_v1,
        functionName: 'getProjectContracts',
        args: [deployedTokenAddress],
      })
      console.log('Project contracts:', project)

      staking = new Stake({
        wallet,
        publicClient,
        stakingAddress: project.staking,
        tokenAddress: deployedTokenAddress,
        tokenDecimals: 18, // Assuming 18 decimals for Clanker tokens
      })
    },
    {
      timeout: 100000,
    }
  )

  it(
    'Should stake token',
    async () => {
      // Get user's token balance
      const userBalance = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      console.log('\n💰 User token balance:', `${formatEther(userBalance)} tokens`)

      // Stake 50% of balance
      const stakeAmount = userBalance / 2n

      console.log('\n✅ Staking', `${formatEther(stakeAmount)} tokens (50% of balance)...`)

      // Approve staking contract using StakeService
      await staking.approve(stakeAmount)
      console.log('  Approved staking contract')

      // Stake tokens using StakeService
      const stakeReceipt = await staking.stake(stakeAmount)
      expect(stakeReceipt.status).toBe('success')

      console.log('  Staked successfully:', {
        gasUsed: stakeReceipt.gasUsed?.toString(),
      })

      // Verify staking balance using StakeService
      const userData = await staking.getUserData()
      expect(userData.stakedBalance.raw).toBe(stakeAmount)
      console.log('\n✅ Staking verified:', `${userData.stakedBalance.formatted} tokens`)

      // Verify staked token balance
      const stakedTokenBalance = await publicClient.readContract({
        address: project.stakedToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      expect(stakedTokenBalance).toBe(stakeAmount)
      console.log(
        '✅ Staked token balance:',
        `${formatEther(stakedTokenBalance)} staked tokens (1:1 ratio)`
      )

      // Verify staking math: staked amount should be exactly 50% of original balance (within rounding tolerance)
      expect(userData.stakedBalance.raw * 2n).toBeGreaterThanOrEqual(userBalance - 1n)
      expect(userData.stakedBalance.raw * 2n).toBeLessThanOrEqual(userBalance + 1n)
      console.log('✅ Staking math verified: Staked exactly 50% of total balance')
    },
    {
      timeout: 60000,
    }
  )

  it(
    'Should make a swap and run claim rewards of clanker token, and confirm staking rewards are received',
    async () => {
      // Get pool information from LP locker
      console.log('\n📊 Getting pool key from LP locker...')
      const tokenRewards = await getTokenRewards(publicClient, deployedTokenAddress)

      const poolKey = tokenRewards.poolKey
      console.log('Pool key:', {
        currency0: poolKey.currency0,
        currency1: poolKey.currency1,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks,
      })

      // CRITICAL: Check who is actually receiving rewards
      console.log('\n🔍 Checking reward recipients...')
      console.log('Expected reward recipient (staking):', project.staking)
      console.log('Actual reward recipients:', tokenRewards.rewardRecipients)
      console.log('Reward admins:', tokenRewards.rewardAdmins)
      console.log('Reward BPS:', tokenRewards.rewardBps)

      //  VERIFY if they match
      const actualRecipient = tokenRewards.rewardRecipients[0]?.toLowerCase()
      const expectedRecipient = project.staking.toLowerCase()
      if (actualRecipient === expectedRecipient) {
        console.log('✅ Reward recipient matches staking contract')
      } else {
        console.log('❌ MISMATCH!')
        console.log('  Actual:', actualRecipient)
        console.log('  Expected:', expectedRecipient)

        // Try to identify what the actual recipient is
        if (actualRecipient === project.treasury.toLowerCase()) {
          console.log('  → Actual recipient is the TREASURY')
        } else if (actualRecipient === wallet.account.address.toLowerCase()) {
          console.log('  → Actual recipient is the DEPLOYER/WALLET')
        } else {
          console.log('  → Actual recipient is UNKNOWN')

          // Check if it's a contract
          const code = await publicClient.getCode({ address: actualRecipient as `0x${string}` })
          if (code && code !== '0x') {
            console.log('  → It IS a contract (has code)')
          } else {
            console.log('  → It is NOT a contract (EOA or not deployed)')
          }
        }
      }

      // Get WETH address and determine swap direction
      if (!weth.address) throw new Error('WETH address not found')

      // We want to swap WETH for Token (buy tokens with ETH)
      const isWETHCurrency0 = poolKey.currency0.toLowerCase() === weth.address.toLowerCase()
      const zeroForOne = isWETHCurrency0

      const amountIn = parseEther('1') // Swap 1 ETH to generate meaningful fees

      console.log('\n💱 Executing swap to generate fees...')
      console.log('  Amount in:', `${formatEther(amountIn)} ETH`)

      // Execute swap
      const quote = await quoteV4({
        publicClient,
        chainId,
        poolKey,
        zeroForOne,
        amountIn,
      })

      const amountOutMinimum = quote.amountOut === 0n ? 0n : (quote.amountOut * 9900n) / 10000n

      const swapReceipt = await swapV4({
        publicClient,
        wallet,
        chainId,
        poolKey,
        zeroForOne,
        amountIn,
        amountOutMinimum,
      })

      expect(swapReceipt.status).toBe('success')
      console.log('  ✅ Swap successful, fees generated')

      // Get staking contract WETH balance before collecting rewards
      // Note: Fees are collected in the token being sold (WETH in this case)
      const stakingWethBalanceBefore = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.staking],
      })

      // Also check clanker token balance
      const stakingTokenBalanceBefore = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.staking],
      })

      console.log('\n📊 Staking balances before accrual:')
      console.log('  WETH:', `${formatEther(stakingWethBalanceBefore)} WETH`)
      console.log('  Token:', `${formatEther(stakingTokenBalanceBefore)} tokens`)

      // Check ClankerFeeLocker balance to confirm rewards are there
      const feeLockerAddress = '0xf3622742b1e446d92e45e22923ef11c2fcd55d68'
      const feeLockerWethBalance = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [feeLockerAddress],
      })
      console.log(
        '\n💰 ClankerFeeLocker WETH balance:',
        `${formatEther(feeLockerWethBalance)} WETH`
      )

      if (feeLockerWethBalance > 0n) {
        console.log('✅ Rewards are in ClankerFeeLocker - need to trigger accrual!')

        // First, check what rewards are outstanding using StakeService
        console.log('\n📊 Checking outstanding rewards...')
        const outstandingRewards = await staking.getOutstandingRewards(weth.address)

        console.log('  Available rewards:', `${outstandingRewards.available.formatted} WETH`)
        console.log('  Pending rewards:', `${outstandingRewards.pending.formatted} WETH`)

        // Use accrueRewards with available amount or trigger with minimal amount
        console.log('\n🔧 Calling accrueRewards to trigger automatic ClankerFeeLocker claim...')

        try {
          // Simply call accrueRewards using StakeService - it will automatically claim from ClankerFeeLocker and credit all available
          const accrueReceipt = await staking.accrueRewards(weth.address)

          if (accrueReceipt.status === 'success') {
            console.log('  ✅ accrueRewards succeeded!')

            // Check rewards again after accrual using StakeService
            const outstandingAfter = await staking.getOutstandingRewards(weth.address)

            console.log(
              '  📊 After accrual - Available:',
              `${outstandingAfter.available.formatted} WETH`
            )
            console.log(
              '  📊 After accrual - Pending:',
              `${outstandingAfter.pending.formatted} WETH`
            )

            // Verify WETH was claimed and credited as rewards
            const stakingWethBalanceAfterAccrual = await publicClient.readContract({
              address: weth.address,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [project.staking],
            })

            console.log(
              '  📊 Staking WETH balance after accrual:',
              `${formatEther(stakingWethBalanceAfterAccrual)} WETH`
            )
            expect(stakingWethBalanceAfterAccrual).toBeGreaterThan(stakingWethBalanceBefore)
          } else {
            console.log('  ❌ accrueRewards failed')
            throw new Error('accrueRewards failed')
          }
        } catch (e) {
          console.log('  ⚠️  Could not accrue rewards:', (e as Error).message.slice(0, 100))
          throw e
        }
      } else {
        // Fallback: check if rewards went directly to staking (old expectation)
        console.log('\n📊 Checking staking balances...')
        const stakingWethBalanceAfter = await publicClient.readContract({
          address: weth.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [project.staking],
        })

        const stakingTokenBalanceAfter = await publicClient.readContract({
          address: deployedTokenAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [project.staking],
        })

        console.log('  WETH:', `${formatEther(stakingWethBalanceAfter)} WETH`)
        console.log('  Token:', `${formatEther(stakingTokenBalanceAfter)} tokens`)

        const wethDelta = stakingWethBalanceAfter - stakingWethBalanceBefore
        const tokenDelta = stakingTokenBalanceAfter - stakingTokenBalanceBefore

        console.log('\n📈 Rewards deltas:')
        console.log('  WETH:', `${formatEther(wethDelta)} WETH`)
        console.log('  Token:', `${formatEther(tokenDelta)} tokens`)

        const totalRewardsReceived = wethDelta + tokenDelta
        expect(totalRewardsReceived).toBeGreaterThan(0n)
      }

      // Get user's WETH balance before claiming (since rewards are in WETH)
      const userWethBalanceBefore = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      console.log(
        '\n💰 User WETH balance before claiming:',
        `${formatEther(userWethBalanceBefore)} WETH`
      )

      // Warp forward a bit to allow some streaming
      console.log('\n⏰ Warping 1 hour forward to allow reward streaming...')
      await warpAnvil(3600) // 1 hour

      // Claim rewards (WETH rewards, not Clanker token!) using StakeService
      console.log('\n💎 Claiming WETH rewards...')
      const claimReceipt = await staking.claimRewards({
        tokens: [weth.address], // Claim WETH, not Clanker token!
        to: wallet.account.address,
      })
      expect(claimReceipt.status).toBe('success')

      console.log('  ✅ Rewards claimed:', {
        gasUsed: claimReceipt.gasUsed?.toString(),
      })

      // Get user's WETH balance after claiming
      const userWethBalanceAfter = await publicClient.readContract({
        address: weth.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      console.log(
        '💰 User WETH balance after claiming:',
        `${formatEther(userWethBalanceAfter)} WETH`
      )
      const userWethRewardsDelta = userWethBalanceAfter - userWethBalanceBefore
      console.log('📈 User WETH rewards received:', `${formatEther(userWethRewardsDelta)} WETH`)

      // Expect user to have received WETH rewards
      expect(userWethBalanceAfter).toBeGreaterThan(userWethBalanceBefore)
      console.log('\n✅ Test complete: Rewards successfully collected and claimed!')
    },
    {
      timeout: 60000,
    }
  )
})
