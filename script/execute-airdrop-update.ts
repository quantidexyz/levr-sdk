#!/usr/bin/env bun
/**
 * @description Combined verification and execution script for airdrop merkle root update
 * @usage MAINNET_PRIVATE_KEY=xxx bun run script/execute-airdrop-update.ts
 *
 * This script:
 * 1. Performs comprehensive verification (all checks from verify-airdrop-update.ts)
 * 2. Simulates complete flow using simulateCalls (update + claims)
 * 3. If all checks pass, asks for confirmation
 * 4. Executes the update using the EXACT SAME data that was verified
 */
import { createMerkleTree } from 'clanker-sdk'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { encodeFunctionData, getAddress } from 'viem'

import ClankerAirdropV2 from '../src/abis/ClankerAirdropV2'
import { GET_CLANKER_AIRDROP_ADDRESS } from '../src/constants'
import { getPublicClient, getWalletClient } from './util'

// Load .env file if exists
try {
  const envPath = resolve(__dirname, '../.env')
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2]
    }
  })
} catch {
  // .env file doesn't exist, that's fine
}

async function executeAirdropUpdate() {
  console.log('='.repeat(80))
  console.log('🔍 AIRDROP UPDATE - VERIFICATION & EXECUTION')
  console.log('='.repeat(80))

  // Configuration
  const CHAIN_ID = 8453 // Base mainnet
  const TOKEN_ADDRESS = '0x08d63756ab002615B1df99380BCf37714c5b9b07' as `0x${string}`
  const SAFE_MULTISIG = '0x4B7ddAc59cEeC3dE4706C460f34Bbce758a58bED'
  const AIRDROP_CONTRACT = GET_CLANKER_AIRDROP_ADDRESS(CHAIN_ID)

  if (!AIRDROP_CONTRACT) {
    console.error('❌ ERROR: No airdrop contract found')
    process.exit(1)
  }

  if (!process.env.NEXT_PUBLIC_DRPC_API_KEY) {
    console.error('❌ ERROR: NEXT_PUBLIC_DRPC_API_KEY not set')
    process.exit(1)
  }

  const issues: string[] = []

  console.log('\n📍 STEP 1: ADDRESS VALIDATION')
  console.log('-'.repeat(80))

  const addresses = {
    'Token Address': TOKEN_ADDRESS,
    'Safe Multisig': SAFE_MULTISIG,
    'Airdrop Contract': AIRDROP_CONTRACT,
    'Recipient 1': '0x83b4003eb22ede3e7fc60e8a5e58325ff61601dc' as `0x${string}`,
    'Recipient 2': '0xbc703b091045008e154237906c2ca724bf006adb' as `0x${string}`,
  }

  for (const [name, addr] of Object.entries(addresses)) {
    try {
      const checksummed = getAddress(addr)
      const isValid = checksummed.toLowerCase() === addr.toLowerCase()
      console.log(`  ${name.padEnd(20)}: ${addr} ${isValid ? '✅' : '❌ INVALID'}`)
    } catch (e) {
      console.log(`  ${name.padEnd(20)}: ${addr} ❌ INVALID`)
      issues.push(`${name} is not a valid Ethereum address`)
    }
  }

  console.log('\n📊 STEP 2: AMOUNT VALIDATION')
  console.log('-'.repeat(80))

  // Recipients with amounts (clanker-sdk expects NUMBER, will multiply by 10^18 internally)
  // NOTE: clanker-sdk's createMerkleTree lowercases addresses, so we use lowercase here
  const recipients = [
    {
      account: '0x83b4003eb22ede3e7fc60e8a5e58325ff61601dc' as `0x${string}`,
      amount: 33000000000 as any, // 33B tokens (as number, SDK adds 18 decimals)
      expectedBillions: 33,
    },
    {
      account: '0xbc703b091045008e154237906c2ca724bf006adb' as `0x${string}`,
      amount: 22000000000 as any, // 22B tokens (as number, SDK adds 18 decimals)
      expectedBillions: 22,
    },
    {
      account: SAFE_MULTISIG.toLowerCase() as `0x${string}`,
      amount: 20000000000 as any, // 20B tokens (as number, SDK adds 18 decimals)
      expectedBillions: 20,
    },
  ]

  let totalBillions = 0
  recipients.forEach((r, i) => {
    const billions = Number(r.amount) / 1e9
    totalBillions += billions
    const match = billions === r.expectedBillions
    console.log(
      `  Recipient ${i + 1}: ${billions.toFixed(1)}B tokens ${match ? '✅' : '❌ MISMATCH'}`
    )
    if (!match) {
      issues.push(
        `Recipient ${i + 1} amount mismatch: expected ${r.expectedBillions}B, got ${billions}B`
      )
    }
  })

  const totalMatch = totalBillions === 75
  console.log(
    `  Total:       ${totalBillions.toFixed(1)}B tokens ${totalMatch ? '✅' : '❌ SHOULD BE 75B'}`
  )
  if (!totalMatch) {
    issues.push(`Total amount mismatch: expected 75B, got ${totalBillions}B`)
  }

  console.log('\n🌳 STEP 3: MERKLE TREE GENERATION')
  console.log('-'.repeat(80))

  const { root: newMerkleRoot, tree } = createMerkleTree(recipients)
  console.log(`  Generated Root: ${newMerkleRoot}`)
  console.log(
    `  Root Length:    ${newMerkleRoot.length} chars ${newMerkleRoot.length === 66 ? '✅' : '❌'}`
  )
  console.log(
    `  Root Format:    ${newMerkleRoot.startsWith('0x') ? '✅ 0x-prefixed' : '❌ Missing 0x'}`
  )

  if (newMerkleRoot.length !== 66) {
    issues.push('Merkle root has invalid length (should be 66 chars including 0x)')
  }

  console.log('\n🔐 STEP 4: MERKLE PROOF GENERATION')
  console.log('-'.repeat(80))

  const treeDump = tree.dump()
  const recipientsWithProofs = recipients.map((r, i) => {
    const leafValue = treeDump.values[i].value
    const proof = tree.getProof(leafValue)
    console.log(`  Recipient ${i + 1}: ${r.account}`)
    console.log(`    Amount:        ${Number(r.amount).toLocaleString()} tokens`)
    console.log(`    Proof elements: ${proof.length}`)
    return {
      ...r,
      proof: proof as `0x${string}`[],
    }
  })

  console.log('\n  ✅ Proofs generated for all recipients')

  console.log('\n📡 STEP 5: BLOCKCHAIN STATE VERIFICATION')
  console.log('-'.repeat(80))

  const publicClient = await getPublicClient(CHAIN_ID)

  const airdropData = await publicClient.readContract({
    address: AIRDROP_CONTRACT,
    abi: ClankerAirdropV2,
    functionName: 'airdrops',
    args: [TOKEN_ADDRESS],
  })

  const [admin, currentMerkleRoot, totalSupply, totalClaimed, lockupEndTime, , , adminClaimed] =
    airdropData

  const actualBalance = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: [
      {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ] as const,
    functionName: 'balanceOf',
    args: [AIRDROP_CONTRACT],
  })

  console.log(`  Current Merkle Root: ${currentMerkleRoot}`)
  console.log(`  New Merkle Root:     ${newMerkleRoot}`)
  console.log(`  Admin:               ${admin}`)
  console.log(
    `  Total Claimed:       ${totalClaimed.toString()} ${totalClaimed === 0n ? '✅' : '❌ BLOCKER'}`
  )
  console.log(`  Total Supply:        ${totalSupply.toString()}`)
  console.log(
    `  Actual Balance:      ${actualBalance.toString()} ${actualBalance > 0n ? '✅' : '❌'}`
  )
  console.log(`  Admin Claimed:       ${adminClaimed} ${!adminClaimed ? '✅' : '❌ BLOCKER'}`)

  const now = Math.floor(Date.now() / 1000)
  const updateWindowOpens = Number(lockupEndTime) + 24 * 60 * 60
  const windowOpen = now >= updateWindowOpens

  console.log(`  Lockup End:          ${new Date(Number(lockupEndTime) * 1000).toISOString()}`)
  console.log(`  Update Window Opens: ${new Date(updateWindowOpens * 1000).toISOString()}`)
  console.log(`  Window Status:       ${windowOpen ? '✅ OPEN' : '❌ NOT YET OPEN'}`)

  if (totalClaimed > 0n) {
    issues.push('BLOCKER: totalClaimed > 0, contract will reject the update')
  }

  if (adminClaimed) {
    issues.push('BLOCKER: Admin has already claimed, cannot update')
  }

  if (
    !windowOpen &&
    currentMerkleRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000'
  ) {
    issues.push('BLOCKER: Update window not open yet and merkle root is not zero')
  }

  console.log('\n📋 STEP 6: SAFE MULTISIG VERIFICATION')
  console.log('-'.repeat(80))

  const safeInList = recipients.some((r) => r.account.toLowerCase() === SAFE_MULTISIG.toLowerCase())
  console.log(`  Safe multisig in recipients: ${safeInList ? '✅' : '❌ CRITICAL ERROR'}`)

  if (!safeInList) {
    issues.push('CRITICAL: Safe multisig is not in the recipient list!')
  }

  const safeRecipient = recipients.find(
    (r) => r.account.toLowerCase() === SAFE_MULTISIG.toLowerCase()
  )
  if (safeRecipient) {
    const safeAmount = Number(safeRecipient.amount) / 1e9
    const correctAmount = safeAmount === 20
    console.log(
      `  Safe multisig allocation:    ${safeAmount}B ${correctAmount ? '✅' : '❌ SHOULD BE 20B'}`
    )
    if (!correctAmount) {
      issues.push(`Safe multisig allocation incorrect: expected 20B, got ${safeAmount}B`)
    }
  }

  console.log('\n🧪 STEP 7: END-TO-END STATEFUL SIMULATION (simulateCalls)')
  console.log('-'.repeat(80))

  const adminAddress = airdropData[0]

  console.log(`  Admin Address: ${adminAddress}`)
  console.log(`  Current Root:  ${currentMerkleRoot}`)
  console.log(`  New Root:      ${newMerkleRoot}`)

  // Build the complete call sequence
  const calls: any[] = []

  // Call 1: updateMerkleRoot (from admin)
  calls.push({
    to: AIRDROP_CONTRACT,
    data: encodeFunctionData({
      abi: ClankerAirdropV2,
      functionName: 'updateMerkleRoot',
      args: [TOKEN_ADDRESS, newMerkleRoot as `0x${string}`],
    }),
  })

  // Calls 2-4: claim for each recipient
  for (const recipient of recipientsWithProofs) {
    const amountWithDecimals = BigInt(recipient.amount) * BigInt(10 ** 18)
    calls.push({
      to: AIRDROP_CONTRACT,
      data: encodeFunctionData({
        abi: ClankerAirdropV2,
        functionName: 'claim',
        args: [TOKEN_ADDRESS, recipient.account, amountWithDecimals, recipient.proof],
      }),
    })
  }

  console.log('\n  Simulating complete transaction flow:')
  console.log('    1. updateMerkleRoot()')
  console.log('    2-4. claim() for all 3 recipients')
  console.log('')

  let allClaimsSucceeded = false

  try {
    const { results } = await publicClient.simulateCalls({
      account: adminAddress,
      calls,
    })

    console.log('  ✅ SIMULATION SUCCESSFUL!\n')
    console.log('  📊 Transaction Results:')

    const updateResult = results[0]
    if (updateResult.status === 'success') {
      console.log('    ✅ Call 1: updateMerkleRoot()')
      console.log(`       Gas used: ${updateResult.gasUsed}`)
    } else {
      console.log('    ❌ Call 1: updateMerkleRoot() FAILED')
      console.log(`       Error: ${updateResult.error}`)
      issues.push('updateMerkleRoot simulation failed')
    }

    allClaimsSucceeded = true
    for (let i = 0; i < recipientsWithProofs.length; i++) {
      const claimResult = results[i + 1]
      const recipient = recipientsWithProofs[i]

      if (claimResult.status === 'success') {
        console.log(`    ✅ Call ${i + 2}: claim() for ${recipient.account}`)
        console.log(`       Gas used: ${claimResult.gasUsed}`)
        console.log(`       Logs: ${claimResult.logs?.length || 0} events emitted`)
      } else {
        let errorReason = 'Unknown'
        if (claimResult.error) {
          const error = claimResult.error as any
          const errorStr = JSON.stringify(error)

          if (errorStr.includes('0x09bde339') || error.data?.includes?.('0x09bde339')) {
            errorReason = 'InvalidProof (0x09bde339)'
          } else if (errorStr.includes('0x0af806e0') || error.data?.includes?.('0x0af806e0')) {
            errorReason = 'AirdropNotUnlocked (0x0af806e0)'
          }
        }

        console.log(`    ❌ Call ${i + 2}: claim() for ${recipient.account} FAILED`)
        console.log(`       Reason: ${errorReason}`)
        allClaimsSucceeded = false
      }
    }

    console.log('\n  🎯 Stateful Simulation Results:')
    console.log('      ✅ updateMerkleRoot transaction WILL SUCCEED')
    console.log(`      ✅ New merkle root: ${newMerkleRoot}`)

    if (allClaimsSucceeded) {
      console.log('')
      console.log('      ✅✅✅ ALL CLAIMS WILL SUCCEED AFTER UPDATE! ✅✅✅')
      console.log('      ✅ Complete end-to-end flow verified!')
    } else {
      console.log('      ⚠️  Some claims failed - review errors above')
      issues.push('Claim simulations failed')
    }
  } catch (error) {
    console.log('  ❌ SIMULATION FAILED')
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`      Error: ${errorMsg}`)
    issues.push('simulateCalls failed')
  }

  console.log('\n' + '='.repeat(80))
  console.log('📝 VERIFICATION SUMMARY')
  console.log('='.repeat(80))

  if (issues.length > 0) {
    console.log('\n❌ ISSUES FOUND:')
    issues.forEach((issue) => console.log(`  - ${issue}`))
    console.log('\n❌ ❌ ❌ VERIFICATION FAILED ❌ ❌ ❌')
    console.log('\nDO NOT proceed with the update until all issues are resolved!')
    process.exit(1)
  }

  console.log('\n✅ ✅ ✅ ALL CHECKS PASSED ✅ ✅ ✅')
  console.log('\nVerification complete! The update is ready to execute.')

  // ========================================================================
  // EXECUTION PHASE
  // ========================================================================

  console.log('\n' + '='.repeat(80))
  console.log('⚠️  READY TO EXECUTE ON-CHAIN UPDATE')
  console.log('='.repeat(80))

  console.log('\nVerified configuration:')
  console.log(`  Merkle Root: ${newMerkleRoot}`)
  console.log(`  Recipients:  ${recipients.length}`)
  console.log(`  Total:       75B tokens`)
  console.log('')
  console.log('Recipient allocations:')
  recipientsWithProofs.forEach((r, i) => {
    const isSafe = r.account.toLowerCase() === SAFE_MULTISIG.toLowerCase()
    const billions = Number(r.amount) / 1e9
    console.log(`  ${i + 1}. ${r.account}${isSafe ? ' 🔐 (SAFE)' : ''}`)
    console.log(`     ${billions}B tokens`)
  })

  console.log('\n⚠️  This will:')
  console.log('  1. Update the merkle root on the airdrop contract')
  console.log('  2. Make the transaction IRREVERSIBLE')
  console.log('  3. Allow recipients to claim their allocations')
  console.log('')

  // Check for private key
  let ADMIN_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY
  if (!ADMIN_PRIVATE_KEY) {
    console.error('❌ ERROR: MAINNET_PRIVATE_KEY not set')
    console.log('\nTo execute the update, set MAINNET_PRIVATE_KEY environment variable.')
    console.log('Example: MAINNET_PRIVATE_KEY=xxx bun run script/execute-airdrop-update.ts')
    process.exit(1)
  }

  // Clean private key
  ADMIN_PRIVATE_KEY = ADMIN_PRIVATE_KEY.trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^0x/, '')

  if (!/^[0-9a-fA-F]{64}$/.test(ADMIN_PRIVATE_KEY)) {
    console.error('❌ ERROR: Invalid private key format')
    process.exit(1)
  }

  const walletClient = await getWalletClient(CHAIN_ID, `0x${ADMIN_PRIVATE_KEY}` as `0x${string}`)

  console.log(`Admin wallet: ${walletClient.account.address}`)

  if (walletClient.account.address.toLowerCase() !== admin.toLowerCase()) {
    console.error('\n❌ ERROR: Wallet address does not match airdrop admin!')
    console.error(`  Expected: ${admin}`)
    console.error(`  Got:      ${walletClient.account.address}`)
    process.exit(1)
  }

  console.log('\n' + '⚠️ '.repeat(40))
  console.log('Type "yes" to proceed with the update (or anything else to cancel):')
  console.log('⚠️ '.repeat(40))
  console.log('')
  process.stdout.write('> ')

  // Read user input
  const response = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase())
    })
  })

  if (response !== 'yes') {
    console.log('\n❌ Update cancelled by user')
    process.exit(0)
  }

  console.log('\n✅ Confirmed! Executing update...\n')
  console.log('='.repeat(80))
  console.log('🚀 EXECUTING ON-CHAIN UPDATE')
  console.log('='.repeat(80))

  try {
    // STEP 1: Update Merkle Root
    console.log('\n📡 Step 1: Updating merkle root...')
    const updateHash = await walletClient.writeContract({
      address: AIRDROP_CONTRACT,
      abi: ClankerAirdropV2,
      functionName: 'updateMerkleRoot',
      args: [TOKEN_ADDRESS, newMerkleRoot as `0x${string}`],
    })

    console.log(`  Transaction hash: ${updateHash}`)
    console.log('  Waiting for confirmation...')

    const updateReceipt = await publicClient.waitForTransactionReceipt({ hash: updateHash })

    if (updateReceipt.status !== 'success') {
      console.log('\n❌ UPDATE TRANSACTION FAILED')
      console.log('Receipt:', updateReceipt)
      process.exit(1)
    }

    console.log('\n' + '✅ '.repeat(40))
    console.log('MERKLE ROOT UPDATED SUCCESSFULLY!')
    console.log('✅ '.repeat(40))
    console.log('\nUpdate Transaction Details:')
    console.log(`  Block:  ${updateReceipt.blockNumber}`)
    console.log(`  Gas:    ${updateReceipt.gasUsed.toString()}`)
    console.log(`  Hash:   ${updateHash}`)
    console.log('\n🎉 Treasury successfully changed to safe multisig!')
    console.log(`   ${SAFE_MULTISIG}`)

    // STEP 2: Execute Claims for All Recipients
    console.log('\n' + '='.repeat(80))
    console.log('🚀 EXECUTING CLAIMS FOR ALL RECIPIENTS')
    console.log('='.repeat(80))

    const claimResults: Array<{
      recipient: string
      amount: string
      hash: string
      gasUsed: bigint
      success: boolean
    }> = []

    for (let i = 0; i < recipientsWithProofs.length; i++) {
      const recipient = recipientsWithProofs[i]
      const amountWithDecimals = BigInt(recipient.amount) * BigInt(10 ** 18)
      const isSafe = recipient.account.toLowerCase() === SAFE_MULTISIG.toLowerCase()
      const billions = Number(recipient.amount) / 1e9

      console.log(`\n📡 Claim ${i + 1}/3: ${recipient.account}${isSafe ? ' 🔐 (SAFE)' : ''}`)
      console.log(`   Amount: ${billions}B tokens`)

      try {
        const claimHash = await walletClient.writeContract({
          address: AIRDROP_CONTRACT,
          abi: ClankerAirdropV2,
          functionName: 'claim',
          args: [TOKEN_ADDRESS, recipient.account, amountWithDecimals, recipient.proof],
        })

        console.log(`   Transaction: ${claimHash}`)
        console.log('   Waiting for confirmation...')

        const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimHash })

        if (claimReceipt.status === 'success') {
          console.log(`   ✅ SUCCESS! Gas used: ${claimReceipt.gasUsed}`)
          claimResults.push({
            recipient: recipient.account,
            amount: `${billions}B`,
            hash: claimHash,
            gasUsed: claimReceipt.gasUsed,
            success: true,
          })
        } else {
          console.log(`   ❌ FAILED! Receipt:`, claimReceipt)
          claimResults.push({
            recipient: recipient.account,
            amount: `${billions}B`,
            hash: claimHash,
            gasUsed: 0n,
            success: false,
          })
        }
      } catch (error) {
        console.log(`   ❌ ERROR:`, error)
        claimResults.push({
          recipient: recipient.account,
          amount: `${billions}B`,
          hash: 'failed',
          gasUsed: 0n,
          success: false,
        })
      }
    }

    // Final Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 EXECUTION SUMMARY')
    console.log('='.repeat(80))

    console.log('\n✅ Merkle Root Update:')
    console.log(`   Block: ${updateReceipt.blockNumber}`)
    console.log(`   Gas:   ${updateReceipt.gasUsed}`)
    console.log(`   Hash:  ${updateHash}`)

    console.log('\n📋 Claim Results:')
    const successfulClaims = claimResults.filter((r) => r.success)
    const failedClaims = claimResults.filter((r) => !r.success)

    successfulClaims.forEach((r) => {
      console.log(`   ✅ ${r.recipient}: ${r.amount} claimed (Gas: ${r.gasUsed})`)
    })

    if (failedClaims.length > 0) {
      console.log('\n⚠️  Failed Claims:')
      failedClaims.forEach((r) => {
        console.log(`   ❌ ${r.recipient}: ${r.amount} - ${r.hash}`)
      })
    }

    console.log('\n' + '='.repeat(80))
    if (successfulClaims.length === recipientsWithProofs.length) {
      console.log('✅✅✅ COMPLETE SUCCESS - ALL OPERATIONS EXECUTED! ✅✅✅')
      console.log('\n All 75B tokens have been distributed to recipients!')
    } else {
      console.log('⚠️  PARTIAL SUCCESS - Some claims failed')
      console.log(`\n ${successfulClaims.length}/${recipientsWithProofs.length} claims succeeded`)
      console.log('   Failed recipients can retry claiming manually with their proofs.')
    }
    console.log('='.repeat(80))
  } catch (error) {
    console.error('\n❌ EXECUTION ERROR:', error)
    process.exit(1)
  }
}

executeAirdropUpdate().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error)
  process.exit(1)
})
