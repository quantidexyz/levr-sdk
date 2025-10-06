import { beforeAll, describe, expect, it } from 'bun:test'
import { erc20Abi, parseEther } from 'viem'

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
      timeout: 30000,
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

      console.log('\n💰 User token balance:', userBalance.toString())

      // Stake 50% of balance
      const stakeAmount = userBalance / 2n

      console.log('\n✅ Staking', stakeAmount.toString(), 'tokens...')

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
      console.log('\n✅ Staking verified:', stakedBalance.toString())

      // Verify staked token balance
      const stakedTokenBalance = await publicClient.readContract({
        address: project.stakedToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      expect(stakedTokenBalance).toBe(stakeAmount)
      console.log('✅ Staked token balance:', stakedTokenBalance.toString())
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

      // Get WETH address and determine swap direction
      const wethAddress = weth.address
      if (!wethAddress) throw new Error('WETH address not found')

      // We want to swap WETH for Token (buy tokens with ETH)
      const isWETHCurrency0 = poolKey.currency0.toLowerCase() === wethAddress.toLowerCase()
      const zeroForOne = isWETHCurrency0

      const amountIn = parseEther('0.01') // Swap 0.01 ETH

      console.log('\n💱 Executing swap to generate fees...')
      console.log('  Amount in:', amountIn.toString(), 'ETH')

      // Execute swap
      const quote = await quoteV4({
        publicClient,
        chainId,
        poolKey,
        zeroForOne,
        amountIn,
      })

      const amountOutMinimum = quote.amountOut === 0n ? 0n : (quote.amountOut * 9900n) / 10000n

      const { receipt: swapReceipt } = await swapV4({
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

      // Get staking contract balance before collecting rewards
      const stakingBalanceBefore = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.staking],
      })

      console.log(
        '\n📊 Staking balance before collecting rewards:',
        stakingBalanceBefore.toString()
      )

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

      // Get staking contract balance after collecting rewards
      const stakingBalanceAfter = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.staking],
      })

      console.log('📊 Staking balance after collecting rewards:', stakingBalanceAfter.toString())
      const rewardsDelta = stakingBalanceAfter - stakingBalanceBefore
      console.log('📈 Rewards delta:', rewardsDelta.toString())

      // Expect rewards to have been sent to staking
      expect(stakingBalanceAfter).toBeGreaterThan(stakingBalanceBefore)

      // Get user's reward balance before claiming
      const userBalanceBefore = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      console.log('\n💰 User balance before claiming:', userBalanceBefore.toString())

      // Warp forward a bit to allow some streaming
      console.log('\n⏰ Warping 1 hour forward to allow reward streaming...')
      await warpAnvil(3600) // 1 hour

      // Claim rewards
      console.log('\n💎 Claiming rewards...')
      const claimTxHash = await wallet.writeContract({
        address: project.staking,
        abi: LevrStaking_v1,
        functionName: 'claimRewards',
        args: [[deployedTokenAddress], wallet.account.address],
      })

      const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimTxHash })
      expect(claimReceipt.status).toBe('success')

      console.log('  ✅ Rewards claimed:', {
        txHash: claimTxHash,
        gasUsed: claimReceipt.gasUsed?.toString(),
      })

      // Get user's balance after claiming
      const userBalanceAfter = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      console.log('💰 User balance after claiming:', userBalanceAfter.toString())
      const userRewardsDelta = userBalanceAfter - userBalanceBefore
      console.log('📈 User rewards received:', userRewardsDelta.toString())

      // Expect user to have received rewards
      expect(userBalanceAfter).toBeGreaterThan(userBalanceBefore)
      console.log('\n✅ Test complete: Rewards successfully collected and claimed!')
    },
    {
      timeout: 60000,
    }
  )
})
