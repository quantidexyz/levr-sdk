#!/usr/bin/env bun
/**
 * @description Update airdrop Merkle root to replace compromised treasury with safe multisig
 * @usage MAINNET_PRIVATE_KEY=xxx bun run script/update-airdrop-treasury.ts
 */
import { createMerkleTree } from 'clanker-sdk'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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
  // .env file doesn't exist, that's fine - use environment variables
}

// ClankerAirdropV2 ABI (minimal for our needs)
const AIRDROP_ABI = [
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'newMerkleRoot', type: 'bytes32' },
    ],
    name: 'updateMerkleRoot',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

async function updateAirdropMerkleRoot() {
  // Configuration
  const CHAIN_ID = 8453 // Base mainnet
  const TOKEN_ADDRESS = '0x08d63756ab002615B1df99380BCf37714c5b9b07' as `0x${string}`
  const SAFE_MULTISIG = '0x4B7ddAc59cEeC3dE4706C460f34Bbce758a58bED'

  // Environment check
  if (!process.env.NEXT_PUBLIC_DRPC_API_KEY) {
    console.error('❌ ERROR: NEXT_PUBLIC_DRPC_API_KEY not set')
    process.exit(1)
  }

  let ADMIN_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY
  if (!ADMIN_PRIVATE_KEY) {
    console.error('❌ ERROR: MAINNET_PRIVATE_KEY not set')
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

  const AIRDROP_CONTRACT = GET_CLANKER_AIRDROP_ADDRESS(CHAIN_ID)
  if (!AIRDROP_CONTRACT) {
    console.error('❌ ERROR: No airdrop contract found')
    process.exit(1)
  }

  console.log('='.repeat(80))
  console.log('🔄 AIRDROP MERKLE ROOT UPDATE - FAST MODE')
  console.log('='.repeat(80))
  console.log('Chain:          Base')
  console.log('Airdrop:        ', AIRDROP_CONTRACT)
  console.log('Token:          ', TOKEN_ADDRESS)
  console.log('Safe Multisig:  ', SAFE_MULTISIG)
  console.log('='.repeat(80))

  // NEW recipients (with safe multisig)
  // IMPORTANT: Using the EXACT values from the original airdrop data (with 18 decimals)
  const recipients = [
    {
      account: '0x83b4003eb22ede3e7fc60e8a5e58325ff61601dc' as `0x${string}`,
      amount: '33000000000000000000000000000' as any, // 33B tokens with 18 decimals
    },
    {
      account: '0xbc703b091045008e154237906c2ca724bf006adb' as `0x${string}`,
      amount: '22000000000000000000000000000' as any, // 22B tokens with 18 decimals
    },
    {
      account: SAFE_MULTISIG as `0x${string}`, // CHANGED FROM COMPROMISED TREASURY
      amount: '20000000000000000000000000000' as any, // 20B tokens with 18 decimals
    },
  ]

  // Setup clients
  const publicClient = await getPublicClient(CHAIN_ID)
  const walletClient = await getWalletClient(CHAIN_ID, `0x${ADMIN_PRIVATE_KEY}` as `0x${string}`)

  console.log('\n📋 Admin:', walletClient.account.address)

  // Generate new Merkle tree
  console.log('\n🌳 Generating new Merkle tree...')
  const { root: newMerkleRoot, tree } = createMerkleTree(recipients)

  console.log('New Merkle Root:', newMerkleRoot)
  console.log('\n📝 New proofs (save these for claiming):')

  const treeDump = tree.dump()
  recipients.forEach((r, index) => {
    const leafValue = treeDump.values[index].value
    const proof = tree.getProof(leafValue)
    const isTreasury = r.account.toLowerCase() === SAFE_MULTISIG.toLowerCase()
    const tokensFormatted = (Number(r.amount) / 1e18).toLocaleString()
    console.log(`\n  ${r.account}${isTreasury ? ' 🔐 (SAFE MULTISIG)' : ''}`)
    console.log(`    Amount: ${tokensFormatted} tokens`)
    console.log(`    Proof: [${proof.map((p) => `"${p}"`).join(', ')}]`)
  })

  // Check update window timing and full airdrop state
  const airdropData = await publicClient.readContract({
    address: AIRDROP_CONTRACT,
    abi: [
      {
        inputs: [{ name: 'token', type: 'address' }],
        name: 'airdrops',
        outputs: [
          { name: 'admin', type: 'address' },
          { name: 'merkleRoot', type: 'bytes32' },
          { name: 'totalSupply', type: 'uint256' }, // Position 2
          { name: 'totalClaimed', type: 'uint256' }, // Position 3
          { name: 'lockupEndTime', type: 'uint256' },
          { name: 'vestingEndTime', type: 'uint256' },
          { name: 'adminClaimTime', type: 'uint256' },
          { name: 'adminClaimed', type: 'bool' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    ] as const,
    functionName: 'airdrops',
    args: [TOKEN_ADDRESS],
  })

  const [
    admin,
    merkleRoot,
    totalSupply, // Corrected: totalSupply comes BEFORE totalClaimed
    totalClaimed, // Corrected: totalClaimed comes AFTER totalSupply
    lockupEndTime,
    vestingEndTime,
    adminClaimTime,
    adminClaimed,
  ] = airdropData
  const updateWindowOpens = Number(lockupEndTime) + 24 * 60 * 60 // +1 day
  const now = Math.floor(Date.now() / 1000)

  // CRITICAL: Verify actual token balance in airdrop contract
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

  console.log('\n📊 AIRDROP STATE vs REALITY:')
  console.log('  Admin:                 ', admin)
  console.log('  Merkle Root:           ', merkleRoot)
  console.log('  Total Claimed (state): ', totalClaimed.toString())
  console.log('  Total Supply (state):  ', totalSupply.toString())
  console.log(
    '  🔍 ACTUAL Balance:     ',
    actualBalance.toString(),
    actualBalance > 0n ? '✅ TOKENS STILL IN CONTRACT!' : '❌'
  )
  console.log('  Admin Claimed:         ', adminClaimed)
  console.log('  Lockup End:            ', new Date(Number(lockupEndTime) * 1000).toISOString())
  console.log('  Vesting End:           ', new Date(Number(vestingEndTime) * 1000).toISOString())
  console.log('  Admin Claim Time:      ', new Date(Number(adminClaimTime) * 1000).toISOString())

  // Verify the data
  if (actualBalance > 0n && totalClaimed > 0n) {
    console.log('\n🚨 DATA CORRUPTION DETECTED:')
    console.log('   Contract state SAYS: totalClaimed =', totalClaimed.toString())
    console.log('   But REALITY shows:   ', actualBalance.toString(), 'tokens still in contract!')
    console.log('   This means: NO ONE HAS ACTUALLY CLAIMED YET ✅')
    console.log('')
    console.log('   The contract state is incorrect, but the ACTUAL logic check')
    console.log('   at line 114 will still block because totalClaimed > 0.')
    console.log('')
    console.log('   ⚠️  THIS IS A CONTRACT BUG - the rescue may be IMPOSSIBLE')
    console.log('       unless the state gets corrected somehow.')
  }

  console.log('\n⏰ TIMING CHECK:')
  console.log('  Current Time:        ', new Date(now * 1000).toISOString())
  console.log('  Lockup Ended:        ', new Date(Number(lockupEndTime) * 1000).toISOString())
  console.log('  Update Window Opens: ', new Date(updateWindowOpens * 1000).toISOString())
  console.log('  Time Until Window:   ', Math.max(0, updateWindowOpens - now), 'seconds')

  console.log('\n🔒 UPDATE REQUIREMENTS (from ClankerAirdropV2 contract):')
  console.log(
    '  1. Must be admin:                    ',
    admin.toLowerCase() === walletClient.account.address.toLowerCase() ? '✅ YES' : '❌ NO'
  )
  console.log('  2. Admin has not claimed:            ', !adminClaimed ? '✅ YES' : '❌ NO')
  console.log(
    '  3. No claims occurred:               ',
    totalClaimed === 0n ? '✅ YES' : `❌ NO (${totalClaimed.toString()} claimed)`
  )
  console.log('  4. Either:')
  console.log(
    '     - Merkle root is zero:            ',
    merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000'
      ? '✅ YES'
      : '❌ NO'
  )
  console.log(
    '     - OR 1 day after lockup passed:   ',
    now >= updateWindowOpens
      ? '✅ YES'
      : `❌ NO (${Math.ceil((updateWindowOpens - now) / 3600)}h remaining)`
  )

  if (totalClaimed > 0n) {
    console.log('\n🚨 CRITICAL BLOCKER:')
    console.log('   totalClaimed > 0, which means the contract will ALWAYS reject.')
    console.log(
      '   Contract line 114: if (airdrop.totalClaimed > 0) revert AirdropClaimsOccurred()'
    )
    console.log('')
    console.log('   However, totalSupply = 0 is suspicious (should be 75B)')
    console.log('   This suggests the airdrop may not have been properly initialized.')
  }

  if (now < updateWindowOpens && totalClaimed === 0n) {
    const hoursRemaining = Math.ceil((updateWindowOpens - now) / 3600)
    console.log('\n⚠️  YOU ARE TOO EARLY!')
    console.log(`   You must wait ${hoursRemaining} more hours until the update window opens.`)
    console.log('   The contract requires 1 day after lockup with zero claims.')
  }

  // Step 1: Simulate the update
  console.log('\n🧪 Simulating update...')
  try {
    await publicClient.simulateContract({
      account: walletClient.account,
      address: AIRDROP_CONTRACT,
      abi: AIRDROP_ABI,
      functionName: 'updateMerkleRoot',
      args: [TOKEN_ADDRESS, newMerkleRoot as `0x${string}`],
    })

    console.log('\n' + '✅ '.repeat(40))
    console.log('SIMULATION SUCCESSFUL!')
    console.log('✅ '.repeat(40))
    console.log('\n📊 Simulation Results:')
    console.log('  Status:           SUCCESS')
    console.log('  Contract:         ', AIRDROP_CONTRACT)
    console.log('  Function:         updateMerkleRoot')
    console.log('  From:             ', walletClient.account.address)
    console.log('  New Merkle Root:  ', newMerkleRoot)
    console.log('\n✅ The update is POSSIBLE and will succeed!')
    console.log('✅ Treasury will be changed from compromised to safe multisig')
  } catch (error) {
    console.error('\n' + '❌ '.repeat(40))
    console.error('SIMULATION FAILED!')
    console.error('❌ '.repeat(40))
    console.error('\n📊 Simulation Results:')
    console.error('  Status:           FAILED')
    if (error instanceof Error) {
      console.error('  Error:            ', error.message)
    } else {
      console.error('  Error:            ', error)
    }
    console.error('\nThe contract rejected the update. Possible reasons:')
    console.error('  - Claims have actually occurred')
    console.error('  - Not in the update window (need 1 day after lockup with zero claims)')
    console.error('  - Wrong admin address')
    console.error('  - Admin has claimed')
    console.error('  - Merkle root cannot be changed anymore')
    process.exit(1)
  }

  // Step 2: Ask for confirmation
  console.log('\n' + '⚠️ '.repeat(40))
  console.log('READY TO UPDATE MERKLE ROOT ON-CHAIN')
  console.log('⚠️ '.repeat(40))
  console.log('\nThis will:')
  console.log('  1. Change the Merkle root on the airdrop contract')
  console.log('  2. Replace compromised treasury with safe multisig in claim data')
  console.log('  3. Make the transaction irreversible')
  console.log('\nDo you want to proceed? (yes/no): ')

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

  console.log('\n✅ Confirmed! Proceeding with update...')

  // Step 3: Execute
  console.log('\n🚀 Executing update...')
  const hash = await walletClient.writeContract({
    address: AIRDROP_CONTRACT,
    abi: AIRDROP_ABI,
    functionName: 'updateMerkleRoot',
    args: [TOKEN_ADDRESS, newMerkleRoot as `0x${string}`],
  })

  console.log('Transaction hash:', hash)
  console.log('Waiting for confirmation...')

  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  if (receipt.status === 'success') {
    console.log('\n' + '✅ '.repeat(40))
    console.log('MERKLE ROOT UPDATED SUCCESSFULLY!')
    console.log('✅ '.repeat(40))
    console.log('\nDetails:')
    console.log('  Block:', receipt.blockNumber)
    console.log('  Gas:  ', receipt.gasUsed.toString())
    console.log('  Tx:   ', hash)
    console.log('\n🎉 Treasury successfully changed to safe multisig!')
    console.log(`   ${SAFE_MULTISIG}`)
    console.log('\n📋 Save the proofs above for claiming!')
  } else {
    console.log('\n❌ TRANSACTION FAILED')
    console.log('Receipt:', receipt)
    process.exit(1)
  }
}

updateAirdropMerkleRoot().catch((error) => {
  console.error('\n❌ ERROR:', error)
  process.exit(1)
})
