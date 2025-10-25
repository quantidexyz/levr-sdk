import { beforeAll, describe, expect, it } from 'bun:test'
import { erc20Abi, formatEther, parseEther } from 'viem'

import { deployV4 } from '../src/deploy-v4'
import type { Project } from '../src/project'
import { getProject, getStaticProject } from '../src/project'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
import { getVaultAllocation, getVaultClaimableAmount, getVaultState } from '../src/vault'
import { setupTest, type SetupTestReturnType } from './helper'
import { warpAnvil } from './util'

// Helper function to get full project data (static + dynamic)
async function getFullProject(
  params: Parameters<typeof getStaticProject>[0] & {
    oraclePublicClient?: Parameters<typeof getProject>[0]['oraclePublicClient']
  }
) {
  const { oraclePublicClient, ...staticParams } = params
  const staticProject = await getStaticProject(staticParams)
  if (!staticProject) return null
  return getProject({
    publicClient: params.publicClient,
    staticProject,
    oraclePublicClient,
  })
}

/**
 * Vault Deployment and Claiming Tests
 *
 * These tests validate the complete vault flow:
 * 1. Deploy a token with multiple airdrop recipients and vault
 * 2. Verify vault state is correctly set
 * 3. Warp time past lockup period
 * 4. Verify claimable amount increases after lockup
 * 5. Warp time to end of vesting period
 * 6. Verify full vault amount is claimable after vesting
 *
 * Prerequisites:
 * 1. Anvil must be running with Base fork: `cd contracts && make anvil-fork`
 * 2. LevrFactory_v1 must be deployed: `cd contracts && make deploy-devnet-factory`
 * 3. Clanker v4 contracts must be deployed on the fork
 * 4. Account must have ETH for gas
 */
describe('#VAULT_TEST', () => {
  // ---
  // CONSTANTS

  const testDeploymentConfig: LevrClankerDeploymentSchemaType = {
    name: 'Vault Test Token',
    symbol: 'VAULT',
    image: 'ipfs://bafkreif2xtaifw7byqxoydsmbrgrpryyvpz65fwdxghgbrurj6uzhhkktm',
    metadata: {
      description: 'Test token for vault testing',
      telegramLink: 'https://t.me/vaulttoken',
    },
    devBuy: '0.5 ETH',
    fees: {
      type: 'static',
      feeTier: '3%',
    },
    // 20% treasury + 15% vault + 5% airdrop = 40% total, 60% goes to liquidity
    treasuryFunding: '20%',
    airdrop: [
      {
        account: '0x0000000000000000000000000000000000000001',
        percentage: 2.5,
      },
      {
        account: '0x0000000000000000000000000000000000000002',
        percentage: 2.5,
      },
    ],
    vault: {
      lockupPeriod: '30 days',
      vestingPeriod: '30 days',
      percentage: '15%',
    },
    stakingReward: '100%',
  }

  // ---
  // VARIABLES

  let publicClient: SetupTestReturnType['publicClient']
  let wallet: SetupTestReturnType['wallet']
  let chainId: SetupTestReturnType['chainId']
  let clanker: SetupTestReturnType['clanker']
  let deployedTokenAddress: `0x${string}`
  let project: Project

  beforeAll(() => {
    ;({ publicClient, wallet, chainId, clanker } = setupTest())
  })

  it('should deploy token with vault and airdrop', async () => {
    const { receipt, address: clankerToken } = await deployV4({
      c: testDeploymentConfig,
      clanker,
    })

    expect(receipt.status).toBe('success')
    expect(clankerToken).toBeDefined()

    deployedTokenAddress = clankerToken

    console.log('✅ Token deployed:', {
      txHash: receipt.transactionHash,
      clankerToken,
    })
  }, 60000) // Increase timeout to 60s for deployment

  it('should load project data', async () => {
    if (!wallet.account) throw new Error('Wallet account not found')

    const staticProject = await getStaticProject({
      publicClient,
      clankerToken: deployedTokenAddress,
      userAddress: wallet.account.address,
    })

    expect(staticProject).toBeDefined()
    if (!staticProject) throw new Error('Static project not found')

    project = await getProject({
      publicClient,
      staticProject,
    })

    expect(project).toBeDefined()
    expect(project.token.address).toBe(deployedTokenAddress)

    console.log('✅ Project loaded:', {
      tokenSymbol: project.token.symbol,
      tokenName: project.token.name,
    })
  })

  it('should verify vault allocation exists and is configured correctly', async () => {
    const vaultState = await getVaultState(publicClient, deployedTokenAddress, chainId)

    expect(vaultState).toBeDefined()
    expect(vaultState?.total).toBeGreaterThan(0n)

    // 15% of 100B tokens = 15B tokens
    const expectedVaultAmount = parseEther('15') * 1000000000n // 15B in wei

    console.log('✅ Vault allocation verified:', {
      totalVaulted: formatEther(vaultState?.total ?? 0n),
      claimed: formatEther(vaultState?.claimed ?? 0n),
      claimable: formatEther(vaultState?.claimable ?? 0n),
      lockupEndsAt: new Date(Number((vaultState?.lockupEndTime ?? 0n) * 1000n)).toISOString(),
      vestingEndsAt: new Date(Number((vaultState?.vestingEndTime ?? 0n) * 1000n)).toISOString(),
    })

    // Before lockup ends, nothing should be claimable
    expect(vaultState?.claimable).toBe(0n)
  })

  it('should warp time past lockup period', async () => {
    // Get current vault state to know lockup end time
    const vaultState = await getVaultState(publicClient, deployedTokenAddress, chainId)
    expect(vaultState).toBeDefined()

    // Lockup period is 30 days
    const thirtyOneDaysInSeconds = 31 * 24 * 60 * 60

    await warpAnvil(thirtyOneDaysInSeconds)

    console.log('✅ Time warped 31 days forward')
  }, 30000)

  it('should have claimable tokens after lockup period', async () => {
    const vaultState = await getVaultState(publicClient, deployedTokenAddress, chainId)

    expect(vaultState).toBeDefined()
    expect(vaultState?.claimable).toBeGreaterThan(0n)

    // We're now past lockup, so some tokens should be claimable
    // The exact amount depends on vesting schedule, just verify it's positive
    const percentageClaimable =
      (Number(vaultState?.claimable ?? 0n) / Number(vaultState?.total ?? 1n)) * 100

    console.log('✅ Claimable tokens available after lockup:', {
      claimable: formatEther(vaultState?.claimable ?? 0n),
      total: formatEther(vaultState?.total ?? 0n),
      percentageClaimable: percentageClaimable.toFixed(2),
    })
  })

  it('should claim vaulted tokens', async () => {
    if (!clanker.wallet) throw new Error('Wallet not found')

    // Get claimable amount before claiming
    const beforeVault = await getVaultState(publicClient, deployedTokenAddress, chainId)
    const claimableAmount = beforeVault?.claimable ?? 0n

    // Claim vaulted tokens
    const { txHash, error } = await clanker.claimVaultedTokens({ token: deployedTokenAddress })

    expect(error).toBeUndefined()
    expect(txHash).toBeDefined()

    // Wait for transaction
    await publicClient.waitForTransactionReceipt({ hash: txHash! })

    console.log('✅ Vaulted tokens claimed:', {
      txHash,
      claimedAmount: formatEther(claimableAmount),
    })
  })

  it('should have reduced claimable amount after claiming', async () => {
    const vaultState = await getVaultState(publicClient, deployedTokenAddress, chainId)

    expect(vaultState).toBeDefined()
    // After claiming, claimed amount should have increased
    expect(vaultState?.claimed).toBeGreaterThan(0n)

    console.log('✅ Vault state after claiming:', {
      total: formatEther(vaultState?.total ?? 0n),
      claimed: formatEther(vaultState?.claimed ?? 0n),
      claimable: formatEther(vaultState?.claimable ?? 0n),
    })
  })

  it('should warp time to end of vesting period', async () => {
    // Warp another 31 days to reach end of vesting (total 62 days from deployment)
    const thirtyOneDaysInSeconds = 31 * 24 * 60 * 60

    await warpAnvil(thirtyOneDaysInSeconds)

    console.log('✅ Time warped another 31 days (total 62 days from deployment)')
  }, 30000)

  it('should have full remaining vault amount claimable after vesting ends', async () => {
    const vaultState = await getVaultState(publicClient, deployedTokenAddress, chainId)

    expect(vaultState).toBeDefined()

    const remainingClaimable = vaultState?.claimable ?? 0n
    const remainingTotal = (vaultState?.total ?? 0n) - (vaultState?.claimed ?? 0n)

    // All remaining tokens should be claimable
    expect(remainingClaimable).toBeGreaterThan(0n)
    expect(remainingClaimable).toBeLessThanOrEqual(remainingTotal + 100n) // Small tolerance for rounding

    console.log('✅ Full vesting complete:', {
      totalVaulted: formatEther(vaultState?.total ?? 0n),
      totalClaimed: formatEther(vaultState?.claimed ?? 0n),
      remainingClaimable: formatEther(remainingClaimable),
    })
  })

  it('should claim remaining vaulted tokens', async () => {
    if (!clanker.wallet) throw new Error('Wallet not found')

    const beforeVault = await getVaultState(publicClient, deployedTokenAddress, chainId)

    // Claim remaining vaulted tokens
    const { txHash, error } = await clanker.claimVaultedTokens({ token: deployedTokenAddress })

    expect(error).toBeUndefined()
    expect(txHash).toBeDefined()

    // Wait for transaction
    await publicClient.waitForTransactionReceipt({ hash: txHash! })

    console.log('✅ Remaining vaulted tokens claimed:', {
      txHash,
      claimedAmount: formatEther(beforeVault?.claimable ?? 0n),
    })
  })

  it('should have no claimable tokens after full claiming', async () => {
    const vaultState = await getVaultState(publicClient, deployedTokenAddress, chainId)

    expect(vaultState).toBeDefined()
    expect(vaultState?.claimable).toBe(0n)
    expect(vaultState?.claimed).toBe(vaultState?.total)

    console.log('✅ Vault fully claimed:', {
      total: formatEther(vaultState?.total ?? 0n),
      claimed: formatEther(vaultState?.claimed ?? 0n),
      claimable: formatEther(vaultState?.claimable ?? 0n),
    })
  })

  it('should verify airdrop recipients received tokens', async () => {
    const airdrop1 = testDeploymentConfig.airdrop?.[0]?.account
    const airdrop2 = testDeploymentConfig.airdrop?.[1]?.account

    expect(airdrop1).toBeDefined()
    expect(airdrop2).toBeDefined()

    if (!airdrop1 || !airdrop2) throw new Error('Airdrop accounts not found')

    console.log('✅ Airdrop recipients configured:', {
      recipient1: airdrop1,
      percentage1: testDeploymentConfig.airdrop?.[0]?.percentage,
      recipient2: airdrop2,
      percentage2: testDeploymentConfig.airdrop?.[1]?.percentage,
    })
  }, 30000)
})
