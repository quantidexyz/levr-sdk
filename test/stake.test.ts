import { beforeAll, describe, expect, it } from 'bun:test'
import { decodeEventLog, erc20Abi, formatEther, parseEther } from 'viem'

import { IClankerLPLocker, LevrFactory_v1, LevrStaking_v1 } from '../src/abis'
import { deployV4 } from '../src/deploy-v4'
import { quoteV4 } from '../src/quote-v4'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
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
  }

  // ---
  // VARIABLES (shared across tests)

  let publicClient: SetupTestReturnType['publicClient']
  let wallet: SetupTestReturnType['wallet']
  let chainId: SetupTestReturnType['chainId']
  let factoryAddress: SetupTestReturnType['factoryAddress']
  let lpLockerAddress: SetupTestReturnType['lpLockerAddress']
  let clanker: SetupTestReturnType['clanker']
  let weth: SetupTestReturnType['weth']
  let deployedTokenAddress: `0x${string}`

  beforeAll(() => {
    ;({ publicClient, wallet, chainId, factoryAddress, lpLockerAddress, clanker, weth } =
      setupTest())
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

      // Get token info
      const tokenName = await publicClient.readContract({
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'name',
      })

      const tokenSymbol = await publicClient.readContract({
        address: clankerToken,
        abi: erc20Abi,
        functionName: 'symbol',
      })

      console.log('Token info:', { name: tokenName, symbol: tokenSymbol })

      // Wait for MEV protection delay (120 seconds)
      console.log('\n⏰ Warping 120 seconds forward to bypass MEV protection...')
      await warpAnvil(120)
    },
    {
      timeout: 50000,
    }
  )

  it(
    'Should stake token',
    async () => {
      console.log('\n📋 Getting project contracts...')
      // Get the Levr project contracts
      const project = await publicClient.readContract({
        address: factoryAddress,
        abi: LevrFactory_v1,
        functionName: 'getProjectContracts',
        args: [deployedTokenAddress],
      })

      console.log('Project contracts:', {
        treasury: project.treasury,
        governor: project.governor,
        staking: project.staking,
        stakedToken: project.stakedToken,
      })

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

      // Approve staking contract
      const approveTxHash = await wallet.writeContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [project.staking, stakeAmount],
      })

      await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
      console.log('  Approved staking contract')

      // Stake tokens
      const stakeTxHash = await wallet.writeContract({
        address: project.staking,
        abi: LevrStaking_v1,
        functionName: 'stake',
        args: [stakeAmount],
      })

      const stakeReceipt = await publicClient.waitForTransactionReceipt({ hash: stakeTxHash })
      expect(stakeReceipt.status).toBe('success')

      console.log('  Staked successfully:', {
        txHash: stakeTxHash,
        gasUsed: stakeReceipt.gasUsed?.toString(),
      })

      // Verify staking balance
      const stakedBalance = await publicClient.readContract({
        address: project.staking,
        abi: LevrStaking_v1,
        functionName: 'stakedBalanceOf',
        args: [wallet.account!.address],
      })

      expect(stakedBalance).toBe(stakeAmount)
      console.log('\n✅ Staking verified:', `${formatEther(stakedBalance)} tokens`)

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
      expect(stakedBalance * 2n).toBeGreaterThanOrEqual(userBalance - 1n)
      expect(stakedBalance * 2n).toBeLessThanOrEqual(userBalance + 1n)
      console.log('✅ Staking math verified: Staked exactly 50% of total balance')
    },
    {
      timeout: 60000,
    }
  )

  it(
    'Should make a swap and run claim rewards of clanker token, and confirm staking rewards are received',
    async () => {
      console.log('\n📋 Getting project contracts...')
      const project = await publicClient.readContract({
        address: factoryAddress,
        abi: LevrFactory_v1,
        functionName: 'getProjectContracts',
        args: [deployedTokenAddress],
      })

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

      console.log('\n📊 Staking balances before collecting rewards:')
      console.log('  WETH:', `${formatEther(stakingWethBalanceBefore)} WETH`)
      console.log('  Token:', `${formatEther(stakingTokenBalanceBefore)} tokens`)

      // Collect rewards from LP locker
      console.log('\n💰 Collecting rewards from LP locker...')
      const collectTxHash = await wallet.writeContract({
        address: lpLockerAddress,
        abi: IClankerLPLocker,
        functionName: 'collectRewards',
        args: [deployedTokenAddress],
      })

      const collectReceipt = await publicClient.waitForTransactionReceipt({ hash: collectTxHash })
      expect(collectReceipt.status).toBe('success')

      console.log('  ✅ Rewards collected:', {
        txHash: collectTxHash,
        gasUsed: collectReceipt.gasUsed?.toString(),
      })

      // Decode the ClaimedRewards event to see what was actually collected
      const claimedRewardsEvent = collectReceipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: IClankerLPLocker,
            data: log.data,
            topics: log.topics,
          })
          return decoded.eventName === 'ClaimedRewards'
        } catch {
          return false
        }
      })

      if (claimedRewardsEvent) {
        const decoded = decodeEventLog({
          abi: IClankerLPLocker,
          data: claimedRewardsEvent.data,
          topics: claimedRewardsEvent.topics,
        })
        console.log('\n📋 ClaimedRewards event data:')
        console.log('  Token:', decoded.args.token)

        // Handle different event variants with type guards
        if ('amount0' in decoded.args) {
          console.log(
            '  Amount0 (total collected):',
            `${formatEther(decoded.args.amount0 || 0n)} WETH`
          )
          console.log(
            '  Amount1 (total collected):',
            `${formatEther(decoded.args.amount1 || 0n)} tokens`
          )
        }

        if ('rewards0' in decoded.args) {
          console.log(
            '  Rewards0 (distributed):',
            decoded.args.rewards0?.map((r: bigint) => r.toString())
          )
        }

        if ('rewards1' in decoded.args) {
          console.log(
            '  Rewards1 (distributed):',
            decoded.args.rewards1?.map((r: bigint) => r.toString())
          )
        }

        // Check all ERC20 Transfer events to see where the WETH actually went
        console.log('\n🔍 Analyzing Transfer events to find where WETH went...')
        const transferEvents = collectReceipt.logs.filter((log) => {
          // Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
          return (
            log.topics[0] ===
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
            log.address.toLowerCase() === weth.address.toLowerCase()
          )
        })

        for (const event of transferEvents) {
          const from = `0x${event.topics[1]?.slice(26)}` // Remove padding from indexed address
          const to = `0x${event.topics[2]?.slice(26)}` // Remove padding from indexed address
          const value = BigInt(event.data)
          console.log(`  Transfer: ${formatEther(value)} WETH from ${from} to ${to}`)

          // Identify what this address is
          if (to.toLowerCase() === project.staking.toLowerCase()) {
            console.log('    ✅ This IS the staking contract!')
          } else if (to.toLowerCase() === project.treasury.toLowerCase()) {
            console.log('    ⚠️  This is the TREASURY (not staking!)')
          } else if (to.toLowerCase() === wallet.account.address.toLowerCase()) {
            console.log('    ⚠️  This is the DEPLOYER/WALLET (not staking!)')
          } else if (to.toLowerCase() === lpLockerAddress.toLowerCase()) {
            console.log('    ➡️  This is the LP Locker')
          } else if (to.toLowerCase() === '0xf3622742b1e446d92e45e22923ef11c2fcd55d68') {
            console.log('    ⚠️  This is the ClankerFeeLocker - rewards go here first!')
            console.log('    ℹ️  ClankerFeeLocker should distribute to actual recipients')
          } else {
            console.log(`    ❌ This is UNKNOWN - Expected staking: ${project.staking}`)

            // Try to check if this unknown address is related to the staking contract
            const unknownCode = await publicClient.getCode({ address: to as `0x${string}` })
            if (unknownCode && unknownCode !== '0x') {
              console.log(`    🔍 Unknown address IS a contract`)
            } else {
              console.log(`    🔍 Unknown address is NOT a contract (EOA)`)
            }
          }
        }
      } else {
        console.log('\n❌ No ClaimedRewards event found in logs')
      }

      // Get staking contract balances after collecting rewards
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

      console.log('\n📊 Staking balances after collecting rewards:')
      console.log('  WETH:', `${formatEther(stakingWethBalanceAfter)} WETH`)
      console.log('  Token:', `${formatEther(stakingTokenBalanceAfter)} tokens`)

      const wethDelta = stakingWethBalanceAfter - stakingWethBalanceBefore
      const tokenDelta = stakingTokenBalanceAfter - stakingTokenBalanceBefore

      console.log('\n📈 Rewards deltas:')
      console.log('  WETH:', `${formatEther(wethDelta)} WETH`)
      console.log('  Token:', `${formatEther(tokenDelta)} tokens`)

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

        // First, check what rewards are outstanding
        console.log('\n📊 Checking outstanding rewards...')
        const outstandingRewards = await publicClient.readContract({
          address: project.staking,
          abi: LevrStaking_v1,
          functionName: 'outstandingRewards',
          args: [weth.address],
        })

        console.log('  Available rewards:', `${formatEther(outstandingRewards[0])} WETH`)
        console.log('  Pending rewards:', `${formatEther(outstandingRewards[1])} WETH`)

        const availableRewards = outstandingRewards[0]

        // Use accrueRewards with available amount or trigger with minimal amount
        console.log('\n🔧 Calling accrueRewards to trigger automatic ClankerFeeLocker claim...')

        try {
          // Simply call accrueRewards - it will automatically claim from ClankerFeeLocker and credit all available
          const accrueTxHash = await wallet.writeContract({
            address: project.staking,
            abi: LevrStaking_v1,
            functionName: 'accrueRewards',
            args: [weth.address],
          })

          const accrueReceipt = await publicClient.waitForTransactionReceipt({
            hash: accrueTxHash,
          })

          if (accrueReceipt.status === 'success') {
            console.log('  ✅ accrueRewards succeeded!')

            // Check rewards again after accrual
            const outstandingAfter = await publicClient.readContract({
              address: project.staking,
              abi: LevrStaking_v1,
              functionName: 'outstandingRewards',
              args: [weth.address],
            })

            console.log(
              '  📊 After accrual - Available:',
              `${formatEther(outstandingAfter[0])} WETH`
            )
            console.log('  📊 After accrual - Pending:', `${formatEther(outstandingAfter[1])} WETH`)

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

      // Claim rewards (WETH rewards, not Clanker token!)
      console.log('\n💎 Claiming WETH rewards...')
      const claimTxHash = await wallet.writeContract({
        address: project.staking,
        abi: LevrStaking_v1,
        functionName: 'claimRewards',
        args: [[weth.address], wallet.account.address], // Claim WETH, not Clanker token!
      })

      const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimTxHash })
      expect(claimReceipt.status).toBe('success')

      console.log('  ✅ Rewards claimed:', {
        txHash: claimTxHash,
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
