import { describe, expect, it } from 'bun:test'
import { Clanker } from 'clanker-sdk/v4'

import { GET_FACTORY_ADDRESS } from '../src/constants'
import { deployV4 } from '../src/deploy-v4'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
import { getPublicClient, getWallet, levrAnvil } from './util'

/**
 * Deployment Tests
 *
 * These tests validate the deployment flow using buildCalldatasV4 and the deployment utilities.
 *
 * Prerequisites:
 * 1. Anvil must be running with Base fork: `cd contracts && make anvil-fork`
 * 2. LevrFactory_v1 must be deployed: `cd contracts && make deploy-devnet-factory`
 * 3. Clanker v4 contracts must be deployed on the fork
 *
 * Features:
 * - Supports deployments with devBuy (ETH forwarding)
 * - executeMulticall and executeTransaction are payable
 * - Each SingleCall can specify a value amount for ETH forwarding
 */
describe('#DEPLOY_TEST', () => {
  // ---
  // CONSTANTS

  const testDeploymentConfig: LevrClankerDeploymentSchemaType = {
    name: 'Test Token',
    symbol: 'TEST',
    image: 'ipfs://bafkreif2xtaifw7byqxoydsmbrgrpryyvpz65fwdxghgbrurj6uzhhkktm',
    metadata: {
      description: 'Test token for deployment testing',
      telegramLink: 'https://t.me/testtoken',
      websiteLink: 'https://test.com',
      xLink: 'https://x.com/testtoken',
      farcasterLink: 'https://farcaster.xyz/testtoken',
    },
    devBuy: '0.1 ETH',
  }

  it(
    'should handle deployment with common fields',
    async () => {
      const publicClient = getPublicClient()
      const wallet = getWallet()
      const chainId = levrAnvil.id
      const factoryAddress = GET_FACTORY_ADDRESS(chainId)

      if (!factoryAddress) throw new Error('Factory address not found in environment')

      // Initialize Clanker SDK
      const clanker = new Clanker({ publicClient, wallet })

      const { receipt, address: clankerToken } = await deployV4({
        c: testDeploymentConfig,
        clanker,
      })
      const txHash = receipt.transactionHash
      expect(receipt.status).toBe('success')

      console.log('✅ Clanker token deployed and registered to Levr:', {
        txHash,
        clankerToken,
      })
    },
    {
      timeout: 30000,
    }
  )
})
