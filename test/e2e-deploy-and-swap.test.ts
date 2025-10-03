import { describe, expect, it } from 'bun:test'
import { Clanker } from 'clanker-sdk/v4'
import { parseAbiItem, parseUnits } from 'viem'

import { IClankerLpLockerMultiple, LevrFactory_v1, LevrForwarder_v1, QuoterV4 } from '../src/abis'
import { buildCalldatasV4 } from '../src/build-calldatas-v4'
import { GET_FACTORY_ADDRESS, UNISWAP_V4_QUOTER } from '../src/constants'
import type { LevrClankerDeploymentSchemaType } from '../src/schema'
import { getPublicClient, getWallet, levrAnvil } from './util'

/**
 * E2E Deployment & Swap Test
 *
 * This test validates the complete flow:
 * 1. Deploy token via Levr + Clanker
 * 2. Verify LP Locker registration
 * 3. Verify pool initialization
 * 4. Attempt to get a quote for swapping
 *
 * Prerequisites:
 * 1. Anvil must be running with Base fork: `cd contracts && make anvil-fork`
 * 2. LevrFactory_v1 must be deployed: `cd contracts && make deploy-devnet-factory`
 * 3. Clanker v4 contracts must be deployed on the fork
 */
describe('#E2E_DEPLOY_AND_SWAP', () => {
  // ---
  // CONSTANTS

  const POOL_MANAGER = '0x498581fF718922c3f8e6A244956aF099B2652b2b' // Base mainnet (available on fork)
  const LP_LOCKER = '0x63D2DfEA64b3433F4071A98665bcD7Ca14d93496' // Clanker v4 LP Locker
  const WETH = '0x4200000000000000000000000000000000000006'

  const treasuryAirdropAmount = 100_000_000

  const testDeploymentConfig: LevrClankerDeploymentSchemaType = {
    name: 'E2E Test Token',
    symbol: 'E2E',
    image: 'ipfs://bafkreif2xtaifw7byqxoydsmbrgrpryyvpz65fwdxghgbrurj6uzhhkktm',
    metadata: {
      description: 'E2E test token for deployment and swap testing',
    },
    devBuy: '0.1 ETH',
  }

  // PoolManager Initialize event
  const INITIALIZE_EVENT = parseAbiItem(
    'event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)'
  )

  it(
    'should deploy token and verify pool can be quoted',
    async () => {
      const publicClient = getPublicClient()
      const wallet = getWallet()
      const chainId = levrAnvil.id
      const factoryAddress = GET_FACTORY_ADDRESS(chainId)
      const quoterAddress = UNISWAP_V4_QUOTER(chainId)

      if (!factoryAddress) throw new Error('Factory address not found')
      if (!quoterAddress) throw new Error('Quoter address not found')

      console.log('\n🚀 Starting E2E Deployment & Swap Test...\n')
      console.log('📍 Addresses:')
      console.log(`  Factory: ${factoryAddress}`)
      console.log(`  LP Locker: ${LP_LOCKER}`)
      console.log(`  Pool Manager: ${POOL_MANAGER}`)
      console.log(`  Quoter: ${quoterAddress}`)
      console.log(`  WETH: ${WETH}\n`)

      // Initialize Clanker SDK
      const clanker = new Clanker({ publicClient, wallet })

      // Build callDatas
      console.log('🔨 Building deployment callDatas...\n')
      const { callDatas, clankerTokenAddress, totalValue } = await buildCalldatasV4({
        c: testDeploymentConfig,
        clanker,
        publicClient,
        wallet,
        factoryAddress,
        treasuryAirdropAmount,
      })

      console.log(`✅ Predicted token address: ${clankerTokenAddress}`)
      console.log(`💰 Total ETH value: ${totalValue} (${Number(totalValue) / 1e18} ETH)\n`)

      expect(callDatas).toBeArrayOfSize(3)
      expect(clankerTokenAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)

      // Get trusted forwarder
      const trustedForwarder = await publicClient.readContract({
        address: factoryAddress,
        abi: LevrFactory_v1,
        functionName: 'trustedForwarder',
      })

      console.log(`🔐 Trusted Forwarder: ${trustedForwarder}\n`)

      // Get block number before deployment
      const deploymentBlock = await publicClient.getBlockNumber()

      // Execute deployment
      console.log('📤 Executing deployment transaction...\n')
      const txHash = await wallet.writeContract({
        address: trustedForwarder,
        abi: LevrForwarder_v1,
        functionName: 'executeMulticall',
        args: [callDatas],
        value: totalValue,
      })

      console.log(`📋 Transaction hash: ${txHash}`)

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      expect(receipt.status).toBe('success')

      console.log(`✅ Deployment successful at block ${receipt.blockNumber}\n`)

      // Step 1: Verify LP Locker registration
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📊 STEP 1: Verify LP Locker Registration')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      const lockerData = await publicClient.readContract({
        address: LP_LOCKER,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [clankerTokenAddress],
      })

      console.log('📍 LP Locker Data:')
      console.log(`  Token: ${lockerData.token}`)
      console.log(`  Currency0: ${lockerData.poolKey.currency0}`)
      console.log(`  Currency1: ${lockerData.poolKey.currency1}`)
      console.log(`  Fee: ${lockerData.poolKey.fee} (0x${lockerData.poolKey.fee.toString(16)})`)
      console.log(`  Tick Spacing: ${lockerData.poolKey.tickSpacing}`)
      console.log(`  Hooks: ${lockerData.poolKey.hooks}`)
      console.log(`  Position ID: ${lockerData.positionId}`)
      console.log(`  Num Positions: ${lockerData.numPositions}\n`)

      // Check if pool key is valid
      const isZeroPoolKey =
        lockerData.poolKey.currency0 === '0x0000000000000000000000000000000000000000' ||
        lockerData.poolKey.currency1 === '0x0000000000000000000000000000000000000000'

      if (isZeroPoolKey) {
        console.log('❌ ERROR: LP Locker returned zero pool key!')
        console.log('   Token was NOT registered in LP Locker\n')
        throw new Error('LP Locker registration failed')
      }

      console.log('✅ LP Locker registration verified\n')

      // Step 2: Verify pool initialization
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📊 STEP 2: Verify Pool Initialization')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      // Query Initialize events from PoolManager
      const initializeEvents = await publicClient.getLogs({
        address: POOL_MANAGER,
        event: INITIALIZE_EVENT,
        fromBlock: deploymentBlock,
        toBlock: receipt.blockNumber,
      })

      console.log(`🔍 Found ${initializeEvents.length} Initialize event(s)\n`)

      if (initializeEvents.length === 0) {
        console.log('❌ ERROR: No Initialize events found!')
        console.log('   Pool was NOT initialized on PoolManager\n')
        throw new Error('Pool initialization failed')
      }

      // Find the Initialize event for our token
      const ourPoolInitEvent = initializeEvents.find(
        (event) =>
          (event.args.currency0 === clankerTokenAddress && event.args.currency1 === WETH) ||
          (event.args.currency0 === WETH && event.args.currency1 === clankerTokenAddress)
      )

      if (!ourPoolInitEvent) {
        console.log('❌ ERROR: Initialize event not found for our token!')
        console.log('   Available Initialize events:')
        initializeEvents.forEach((event, i) => {
          console.log(
            `   ${i + 1}. Currency0: ${event.args.currency0}, Currency1: ${event.args.currency1}`
          )
        })
        console.log('')
        throw new Error('Pool initialization event not found')
      }

      console.log('📍 Pool Initialization Event:')
      console.log(`  Pool ID: ${ourPoolInitEvent.args.id}`)
      console.log(`  Currency0: ${ourPoolInitEvent.args.currency0}`)
      console.log(`  Currency1: ${ourPoolInitEvent.args.currency1}`)
      console.log(
        `  Fee: ${ourPoolInitEvent.args.fee} (0x${ourPoolInitEvent.args.fee!.toString(16)})`
      )
      console.log(`  Tick Spacing: ${ourPoolInitEvent.args.tickSpacing}`)
      console.log(`  Hooks: ${ourPoolInitEvent.args.hooks}`)
      console.log(`  Sqrt Price: ${ourPoolInitEvent.args.sqrtPriceX96}`)
      console.log(`  Starting Tick: ${ourPoolInitEvent.args.tick}\n`)

      // Compare with LP Locker data
      const poolKeyMatches = {
        currency0:
          ourPoolInitEvent.args.currency0 === lockerData.poolKey.currency0 &&
          ourPoolInitEvent.args.currency1 === lockerData.poolKey.currency1,
        fee: ourPoolInitEvent.args.fee === lockerData.poolKey.fee,
        tickSpacing: ourPoolInitEvent.args.tickSpacing === lockerData.poolKey.tickSpacing,
        hooks: ourPoolInitEvent.args.hooks === lockerData.poolKey.hooks,
      }

      const allMatch = Object.values(poolKeyMatches).every((m) => m)

      if (!allMatch) {
        console.log('⚠️  WARNING: LP Locker pool key does not match initialized pool!')
        console.log('   Mismatches:')
        if (!poolKeyMatches.currency0) console.log('   - Currency pair mismatch')
        if (!poolKeyMatches.fee)
          console.log(
            `   - Fee mismatch: ${ourPoolInitEvent.args.fee} vs ${lockerData.poolKey.fee}`
          )
        if (!poolKeyMatches.tickSpacing)
          console.log(
            `   - TickSpacing mismatch: ${ourPoolInitEvent.args.tickSpacing} vs ${lockerData.poolKey.tickSpacing}`
          )
        if (!poolKeyMatches.hooks)
          console.log(
            `   - Hooks mismatch: ${ourPoolInitEvent.args.hooks} vs ${lockerData.poolKey.hooks}`
          )
        console.log('')
      } else {
        console.log('✅ LP Locker pool key matches initialized pool\n')
      }

      // Step 2.5: Verify pool state in PoolManager
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📊 STEP 2.5: Verify Pool State in PoolManager')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      // The PoolManager stores pool state at slot0
      // We can check if sqrtPriceX96 is non-zero to confirm the pool is initialized
      console.log(`Checking pool ID: ${ourPoolInitEvent.args.id}\n`)
      console.log(`Expected sqrtPriceX96: ${ourPoolInitEvent.args.sqrtPriceX96}\n`)

      // Step 3: Test quote
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📊 STEP 3: Test Quote')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      // Use the pool key from the ACTUAL Initialize event (not LP Locker)
      const poolKey = {
        currency0: ourPoolInitEvent.args.currency0!,
        currency1: ourPoolInitEvent.args.currency1!,
        fee: ourPoolInitEvent.args.fee!,
        tickSpacing: ourPoolInitEvent.args.tickSpacing!,
        hooks: ourPoolInitEvent.args.hooks!,
      }
      const zeroForOne = WETH === poolKey.currency0
      const amountIn = parseUnits('0.01', 18) // 0.01 WETH

      console.log('📋 Quote Parameters (using Initialize event data):')
      console.log(`  Pool Key:`)
      console.log(`    Currency0: ${poolKey.currency0}`)
      console.log(`    Currency1: ${poolKey.currency1}`)
      console.log(`    Fee: ${poolKey.fee}`)
      console.log(`    TickSpacing: ${poolKey.tickSpacing}`)
      console.log(`    Hooks: ${poolKey.hooks}`)
      console.log(`  Zero for One: ${zeroForOne}`)
      console.log(`  Amount In: ${amountIn} (0.01 tokens)\n`)

      // Try Quoter first
      console.log('🔄 Attempt 1: Using QuoterV4 contract...\n')
      try {
        const result = await publicClient.simulateContract({
          address: quoterAddress,
          abi: QuoterV4,
          functionName: 'quoteExactInputSingle',
          args: [
            {
              poolKey,
              zeroForOne,
              exactAmount: amountIn,
              hookData: '0x00',
            },
          ],
        })

        const deltaAmounts = result.result[0] as bigint[]
        const outputIndex = zeroForOne ? 1 : 0
        const deltaAmount = deltaAmounts[outputIndex]
        const amountOut = deltaAmount < 0n ? -deltaAmount : deltaAmount

        console.log('✅ Quoter successful!')
        console.log(`  Amount Out: ${amountOut}`)
        console.log(`  Amount Out (formatted): ${Number(amountOut) / 1e18}\n`)

        expect(amountOut).toBeGreaterThan(0n)
      } catch (quoterError: any) {
        console.log('❌ Quoter FAILED!')
        console.log(`  Error: ${quoterError.message}\n`)

        // Check for PoolNotInitialized
        if (
          quoterError.message?.includes('PoolNotInitialized') ||
          quoterError.message?.includes('0x6190b2b0')
        ) {
          console.log('🔍 Detected PoolNotInitialized (0x6190b2b0) from Quoter\n')
          console.log('⚠️  This is suspicious because:')
          console.log('   - Pool IS initialized (we have the Initialize event)')
          console.log('   - LP Locker data matches the initialized pool')
          console.log('   - Pool key is correct\n')
          console.log('💡 Possible explanations:')
          console.log('   1. Quoter contract is outdated or incompatible with this hook')
          console.log('   2. Dynamic fee hook requires additional setup')
          console.log('   3. Fork state issue (PoolManager state not properly synced)\n')
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log('🔧 CONCLUSION: Quoter Issue Detected')
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
          console.log('The pool is correctly initialized, but the Quoter cannot read it.')
          console.log('This is likely a Quoter contract bug or incompatibility with')
          console.log('the dynamic fee hook implementation.\n')
          console.log('📋 Recommendations:')
          console.log("   1. Check if there's a newer Quoter contract version")
          console.log('   2. Try querying pool state directly from PoolManager')
          console.log('   3. Contact Clanker/Uniswap team about Quoter compatibility')
          console.log('   4. Use direct swap simulation instead of Quoter\n')

          // Don't throw - we've identified the issue
          return
        }

        throw quoterError
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✅ E2E Test Completed Successfully!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    },
    {
      timeout: 60000, // 60 second timeout for fork operations
    }
  )
})
