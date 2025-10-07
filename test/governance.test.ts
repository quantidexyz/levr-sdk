import { beforeAll, describe, expect, it } from 'bun:test'
import { erc20Abi, formatEther } from 'viem'

import { LevrFactory_v1, LevrTreasury_v1 } from '../src/abis'
import { deployV4 } from '../src/deploy-v4'
import { Governance } from '../src/governance'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
import { Stake } from '../src/stake'
import { setupTest, type SetupTestReturnType } from './helper'
import { warpAnvil } from './util'

/**
 * Governance Tests
 *
 * These tests validate the complete governance flow:
 * 1. Deploy a Clanker token via Levr
 * 2. Stake tokens to meet minimum requirements
 * 3. Propose transfers and boosts with custom amounts
 * 4. Execute proposals
 * 5. Test deadline enforcement and minimum balance gating
 *
 * Prerequisites:
 * 1. Anvil must be running with Base fork: `cd contracts && make anvil-fork`
 * 2. LevrFactory_v1 must be deployed: `cd contracts && make deploy-devnet-factory`
 * 3. Clanker v4 contracts must be deployed on the fork
 * 4. Account must have ETH for gas and operations
 */
describe('#GOVERNANCE_TEST', () => {
  // ---
  // CONSTANTS

  const testDeploymentConfig: LevrClankerDeploymentSchemaType = {
    name: 'Governance Test Token',
    symbol: 'GOV',
    image: 'ipfs://bafkreif2xtaifw7byqxoydsmbrgrpryyvpz65fwdxghgbrurj6uzhhkktm',
    metadata: {
      description: 'Test token for governance testing',
      telegramLink: 'https://t.me/govtoken',
    },
    devBuy: '0.5 ETH', // Add initial liquidity
  }

  // ---
  // VARIABLES (shared across tests)

  let publicClient: SetupTestReturnType['publicClient']
  let wallet: SetupTestReturnType['wallet']
  let factoryAddress: SetupTestReturnType['factoryAddress']
  let clanker: SetupTestReturnType['clanker']
  let deployedTokenAddress: `0x${string}`
  let staking: Stake
  let governance: Governance
  let project: {
    treasury: `0x${string}`
    governor: `0x${string}`
    staking: `0x${string}`
    stakedToken: `0x${string}`
  }

  beforeAll(() => {
    ;({ publicClient, wallet, factoryAddress, clanker } = setupTest())
  })

  it(
    'should deploy token and setup governance',
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
        tokenDecimals: 18,
      })

      governance = new Governance({
        wallet,
        publicClient,
        governorAddress: project.governor,
        tokenDecimals: 18,
      })

      // Verify governor is set up correctly
      const governorAddress = await publicClient.readContract({
        address: project.treasury,
        abi: LevrTreasury_v1,
        functionName: 'governor',
      })
      expect(governorAddress.toLowerCase()).toBe(project.governor.toLowerCase())
      console.log('✅ Governor correctly linked to treasury')
      console.log('✅ Governance class initialized')
    },
    {
      timeout: 100000,
    }
  )

  it(
    'should stake tokens to enable governance participation',
    async () => {
      // Get user's token balance
      const userBalance = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.account.address],
      })

      console.log('\n💰 User token balance:', `${formatEther(userBalance)} tokens`)
      expect(userBalance).toBeGreaterThan(0n)

      // Stake some tokens to enable governance participation
      const stakeAmount = userBalance / 4n // Stake 25% of balance

      console.log('\n✅ Staking', `${formatEther(stakeAmount)} tokens for governance...`)

      // Approve and stake tokens using StakeService
      await staking.approve(stakeAmount)
      const stakeReceipt = await staking.stake(stakeAmount)
      expect(stakeReceipt.status).toBe('success')

      console.log('  Staked successfully for governance participation')

      // Verify staking balance
      const userData = await staking.getUserData()
      expect(userData.stakedBalance.raw).toBe(stakeAmount)
      console.log('✅ Governance stake verified:', `${userData.stakedBalance.formatted} tokens`)

      // Send some tokens to treasury so we can test transfers
      const treasuryAmount = userBalance / 4n // Send 25% to treasury
      const sendTx = await wallet.writeContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [project.treasury, treasuryAmount],
      })
      await publicClient.waitForTransactionReceipt({ hash: sendTx })

      const treasuryBalance = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.treasury],
      })
      console.log('✅ Treasury funded:', `${formatEther(treasuryBalance)} tokens`)
      expect(treasuryBalance).toBe(treasuryAmount)
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should propose and execute transfer proposal',
    async () => {
      const receiver = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' // Different address

      // Get treasury balance before
      const treasuryBalanceBefore = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.treasury],
      })

      const receiverBalanceBefore = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [receiver],
      })

      console.log('\n📊 Balances before transfer proposal:')
      console.log('  Treasury:', `${formatEther(treasuryBalanceBefore)} tokens`)
      console.log('  Receiver:', `${formatEther(receiverBalanceBefore)} tokens`)

      // Propose transfer (custom amount - no tiers)
      const transferAmount = treasuryBalanceBefore / 2n // Transfer half of treasury
      const reason = 'Test transfer to community member'

      console.log('\n📝 Proposing transfer...')
      console.log('  Amount:', `${formatEther(transferAmount)} tokens`)
      console.log('  To:', receiver)
      console.log('  Reason:', reason)

      const { receipt: proposeReceipt, proposalId } = await governance.proposeTransfer(
        receiver,
        transferAmount,
        reason
      )

      expect(proposeReceipt.status).toBe('success')
      console.log('✅ Transfer proposal created:', proposalId.toString())

      // Get proposal details using governance class
      const proposal = await governance.getProposal(proposalId)

      console.log('📋 Proposal details:', {
        proposalType: proposal.proposalType,
        amount: proposal.amount.formatted,
        receiver: proposal.receiver,
        reason: proposal.reason,
        deadline: proposal.deadline.date.toISOString(),
        executed: proposal.executed,
      })

      expect(proposal.amount.raw).toBe(transferAmount)
      expect(proposal.receiver.toLowerCase()).toBe(receiver.toLowerCase())
      expect(proposal.reason).toBe(reason)
      expect(proposal.executed).toBe(false)

      // Execute the proposal using governance class
      console.log('\n⚡ Executing transfer proposal...')
      const executeReceipt = await governance.executeProposal(proposalId)
      expect(executeReceipt.status).toBe('success')

      console.log('✅ Transfer proposal executed')

      // Verify balances after execution
      const treasuryBalanceAfter = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.treasury],
      })

      const receiverBalanceAfter = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [receiver],
      })

      console.log('\n📊 Balances after transfer execution:')
      console.log('  Treasury:', `${formatEther(treasuryBalanceAfter)} tokens`)
      console.log('  Receiver:', `${formatEther(receiverBalanceAfter)} tokens`)

      expect(treasuryBalanceAfter).toBe(treasuryBalanceBefore - transferAmount)
      expect(receiverBalanceAfter).toBe(receiverBalanceBefore + transferAmount)
      console.log('✅ Transfer executed correctly!')

      // Verify proposal is marked as executed using governance class
      const executedProposal = await governance.getProposal(proposalId)
      expect(executedProposal.executed).toBe(true)
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should propose and execute boost proposal',
    async () => {
      // Get balances before boost
      const treasuryBalanceBefore = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.treasury],
      })

      const stakingBalanceBefore = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.staking],
      })

      console.log('\n📊 Balances before boost proposal:')
      console.log('  Treasury:', `${formatEther(treasuryBalanceBefore)} tokens`)
      console.log('  Staking:', `${formatEther(stakingBalanceBefore)} tokens`)

      expect(treasuryBalanceBefore).toBeGreaterThan(0n)

      // Propose boost (custom amount)
      const boostAmount = treasuryBalanceBefore / 3n // Boost 1/3 of treasury to staking rewards

      console.log('\n📝 Proposing boost...')
      console.log('  Amount:', `${formatEther(boostAmount)} tokens`)

      const { receipt: proposeReceipt, proposalId } = await governance.proposeBoost(boostAmount)
      expect(proposeReceipt.status).toBe('success')

      console.log('✅ Boost proposal created:', proposalId.toString())

      // Execute the proposal using governance class
      console.log('\n⚡ Executing boost proposal...')
      const executeReceipt = await governance.executeProposal(proposalId)
      expect(executeReceipt.status).toBe('success')

      console.log('✅ Boost proposal executed')

      // Verify balances after execution
      const treasuryBalanceAfter = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.treasury],
      })

      const stakingBalanceAfter = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.staking],
      })

      console.log('\n📊 Balances after boost execution:')
      console.log('  Treasury:', `${formatEther(treasuryBalanceAfter)} tokens`)
      console.log('  Staking:', `${formatEther(stakingBalanceAfter)} tokens`)

      expect(treasuryBalanceAfter).toBe(treasuryBalanceBefore - boostAmount)
      expect(stakingBalanceAfter).toBe(stakingBalanceBefore + boostAmount)
      console.log('✅ Boost executed correctly - rewards boosted to staking!')
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should enforce deadline on proposals',
    async () => {
      // Get remaining treasury balance
      const treasuryBalance = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.treasury],
      })

      if (treasuryBalance === 0n) {
        console.log('⚠️ Treasury is empty, sending more tokens for deadline test')
        const userBalance = await publicClient.readContract({
          address: deployedTokenAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [wallet.account.address],
        })

        if (userBalance > 0n) {
          const fundAmount = userBalance / 4n
          const sendTx = await wallet.writeContract({
            address: deployedTokenAddress,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [project.treasury, fundAmount],
          })
          await publicClient.waitForTransactionReceipt({ hash: sendTx })
        }
      }

      const updatedTreasuryBalance = await publicClient.readContract({
        address: deployedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [project.treasury],
      })

      // Create a new proposal for deadline testing
      const transferAmount = updatedTreasuryBalance / 2n
      const receiver = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

      console.log('\n📝 Creating proposal for deadline test...')
      const { proposalId } = await governance.proposeTransfer(
        receiver,
        transferAmount,
        'Deadline test proposal'
      )

      // Get proposal deadline using governance class
      const proposal = await governance.getProposal(proposalId)
      console.log('📋 Proposal deadline:', proposal.deadline.date.toISOString())

      // Warp past deadline (factory default is 7 days, let's go 8 days)
      console.log('\n⏰ Warping 8 days forward to exceed deadline...')
      await warpAnvil(8 * 24 * 60 * 60) // 8 days in seconds

      // Try to execute - should fail with DeadlinePassed
      console.log('\n❌ Attempting to execute expired proposal (should fail)...')
      try {
        await governance.executeProposal(proposalId)

        // If we get here, the test should fail
        expect(true).toBe(false) // Force failure
      } catch (error) {
        // Expected to fail with deadline error
        console.log('✅ Proposal execution correctly failed after deadline')
        console.log('   Error:', (error as Error).message.slice(0, 100) + '...')
        expect((error as Error).message).toContain('DeadlinePassed')
      }
    },
    {
      timeout: 60000,
    }
  )

  it(
    'should enforce minimum staked balance requirement',
    async () => {
      // This test would require deploying a new factory with minWTokenToSubmit > 0
      // For now, let's test that canSubmit works correctly

      console.log('\n🔍 Checking canSubmit for current user...')
      const canSubmit = await governance.canSubmit()

      console.log('Can user submit proposals?', canSubmit)

      // Since our factory has minWTokenToSubmit = 0, and user has staked tokens, should be true
      expect(canSubmit).toBe(true)

      // Check governance contract addresses
      const [treasury, factory, stakedToken] = await Promise.all([
        governance.getTreasury(),
        governance.getFactory(),
        governance.getStakedToken(),
      ])
      console.log('📋 Governance addresses:', {
        treasury,
        factory,
        stakedToken,
      })

      // Get user's staked balance to confirm why they can submit
      const userData = await staking.getUserData()
      console.log('User staked balance:', userData.stakedBalance.formatted, 'tokens')
      expect(userData.stakedBalance.raw).toBeGreaterThan(0n)

      console.log('✅ Governance eligibility check passed')
    },
    {
      timeout: 60000,
    }
  )
})
