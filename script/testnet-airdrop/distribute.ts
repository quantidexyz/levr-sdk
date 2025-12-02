#!/usr/bin/env bun
/**
 * @description Airdrop distribution script
 * @usage PRIVATE_KEY=xxx bun run script/testnet-airdrop/distribute.ts
 *
 * This script:
 * 1. Lists log files sorted by date
 * 2. Asks user to choose one
 * 3. Asks for chain (base or baseSepolia)
 * 4. Asks for token address and total amount to distribute
 * 5. Simulates the airdrop transfers
 * 6. Logs results and asks to proceed
 * 7. If confirmed, executes the airdrop
 */
import fs from 'fs'
import path from 'path'
import { createInterface } from 'readline'
import {
  type Address,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  http,
  parseUnits,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, baseSepolia } from 'viem/chains'

import { getDRPCTransport } from '../util'
import { writeLog } from '../write-log'
import type {
  AirdropAllocation,
  AirdropExecutionResult,
  AirdropSimulationResult,
  EligibleUsers,
} from './types'

// Multicall3 contract (deployed on most chains)
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const
const multicall3Abi = [
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const

// Helper to create readline interface
function createPrompt() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

async function askQuestion(prompt: string): Promise<string> {
  const rl = createPrompt()
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function askChoice<T extends string>(prompt: string, choices: T[]): Promise<T> {
  console.log(prompt)
  choices.forEach((choice, i) => console.log(`  ${i + 1}. ${choice}`))
  const answer = await askQuestion('Enter number: ')
  const index = parseInt(answer) - 1
  if (index < 0 || index >= choices.length) {
    console.error('Invalid choice')
    process.exit(1)
  }
  return choices[index]
}

async function main() {
  console.log('='.repeat(80))
  console.log('🎁 AIRDROP DISTRIBUTION')
  console.log('='.repeat(80))

  // Step 1: Select wallet
  console.log('\n🔑 Select wallet to use:')
  const walletChoice = await askChoice('', ['TEST_PRIVATE_KEY', 'MAINNET_PRIVATE_KEY'])

  const privateKey = process.env[walletChoice]
  if (!privateKey) {
    console.error(`❌ ${walletChoice} environment variable not set`)
    process.exit(1)
  }

  const cleanedPrivateKey = privateKey
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^0x/, '')

  if (!/^[0-9a-fA-F]{64}$/.test(cleanedPrivateKey)) {
    console.error('❌ Invalid private key format')
    process.exit(1)
  }

  const account = privateKeyToAccount(`0x${cleanedPrivateKey}`)
  console.log(`\n✅ Wallet: ${walletChoice}`)
  console.log(`👤 Address: ${account.address}`)

  // Step 2: Get token address to distribute
  const tokenAddress = (await askQuestion('\nEnter token address to distribute: ')) as Address
  if (!tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
    console.error('❌ Invalid token address')
    process.exit(1)
  }

  // Step 3: List and select log file
  const logsDir = path.join(import.meta.dirname, '../../logs')
  if (!fs.existsSync(logsDir)) {
    console.error('❌ No logs directory found')
    process.exit(1)
  }

  const logFiles = fs
    .readdirSync(logsDir)
    .filter((f) => f.includes('testnet-airdrop-eligible-users') && f.endsWith('.json'))
    .map((f) => {
      const stats = fs.statSync(path.join(logsDir, f))
      return { name: f, mtime: stats.mtime }
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

  if (logFiles.length === 0) {
    console.error('❌ No eligible users log files found')
    process.exit(1)
  }

  console.log('\n📁 Available log files (sorted by date, newest first):')
  logFiles.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name} (${f.mtime.toLocaleString()})`)
  })

  const fileAnswer = await askQuestion('\nSelect file number: ')
  const fileIndex = parseInt(fileAnswer) - 1
  if (fileIndex < 0 || fileIndex >= logFiles.length) {
    console.error('Invalid selection')
    process.exit(1)
  }

  const selectedFile = logFiles[fileIndex]
  console.log(`\n✅ Selected: ${selectedFile.name}`)

  // Load the log file
  const logPath = path.join(logsDir, selectedFile.name)
  const logData: EligibleUsers = JSON.parse(fs.readFileSync(logPath, 'utf-8'))

  if (!logData.summary?.userScores || logData.summary.userScores.length === 0) {
    console.error('❌ No user scores found in log file')
    process.exit(1)
  }

  console.log(`   Found ${logData.summary.userScores.length} users to distribute to`)

  // Step 4: Select chain
  console.log('\n📡 Select chain:')
  const chainChoice = await askChoice('', ['base', 'baseSepolia'])
  const chain = chainChoice === 'base' ? base : baseSepolia
  const chainId = chain.id

  console.log(`\n✅ Chain: ${chain.name} (${chainId})`)

  // Step 5: Get total amount
  const totalAmountStr = await askQuestion('\nEnter total amount to distribute (human readable): ')
  const totalAmount = parseFloat(totalAmountStr)
  if (isNaN(totalAmount) || totalAmount <= 0) {
    console.error('❌ Invalid amount')
    process.exit(1)
  }

  // Step 6: Setup clients - create transport (try DRPC first, fallback to default)
  let transport = getDRPCTransport(chainId)
  if (!transport) {
    console.log('   Using default RPC transport')
    transport = http()
  }

  const publicClient = createPublicClient({
    chain,
    transport,
  })

  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  })

  // Step 7: Get token info
  console.log('\n📊 Fetching token info...')
  const [tokenSymbol, tokenDecimals, senderBalance] = await publicClient.multicall({
    contracts: [
      { address: tokenAddress, abi: erc20Abi, functionName: 'symbol' },
      { address: tokenAddress, abi: erc20Abi, functionName: 'decimals' },
      { address: tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] },
    ],
  })

  const symbol = (tokenSymbol.result as string) ?? 'TOKEN'
  const decimals = (tokenDecimals.result as number) ?? 18
  const balance = (senderBalance.result as bigint) ?? 0n

  console.log(`   Token: ${symbol}`)
  console.log(`   Decimals: ${decimals}`)
  console.log(`   Your balance: ${formatUnits(balance, decimals)} ${symbol}`)

  const totalAmountWei = parseUnits(totalAmountStr, decimals)

  if (balance < totalAmountWei) {
    console.error(
      `\n❌ Insufficient balance. Need ${totalAmountStr} ${symbol}, have ${formatUnits(balance, decimals)}`
    )
    process.exit(1)
  }

  // Step 8: Calculate allocations
  console.log('\n📐 Calculating allocations...')
  const allocations: AirdropAllocation[] = logData.summary.userScores.map((user) => {
    const percentage = parseFloat(user.scorePercentage)
    const amount = (totalAmountWei * BigInt(Math.floor(percentage * 10000))) / 1000000n
    return {
      recipient: user.address,
      amount,
      amountFormatted: formatUnits(amount, decimals),
      percentage: user.scorePercentage,
    }
  })

  // Filter out zero allocations
  const nonZeroAllocations = allocations.filter((a) => a.amount > 0n)
  const totalAllocated = nonZeroAllocations.reduce((sum, a) => sum + a.amount, 0n)

  console.log(`   ${nonZeroAllocations.length} recipients with non-zero allocations`)
  console.log(`   Total to distribute: ${formatUnits(totalAllocated, decimals)} ${symbol}`)

  // Step 9: Build multicall data for transfers
  console.log('\n🔧 Building multicall transaction...')
  const calls = nonZeroAllocations.map((allocation) => ({
    target: tokenAddress,
    allowFailure: false,
    callData: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [allocation.recipient, allocation.amount],
    }),
  }))

  // Step 10: Simulate the multicall
  console.log('\n🧪 Simulating airdrop...')
  const errors: string[] = []

  try {
    const { result } = await publicClient.simulateContract({
      address: MULTICALL3_ADDRESS,
      abi: multicall3Abi,
      functionName: 'aggregate3',
      args: [calls],
      account: account.address,
    })

    // Check results
    let allSuccess = true
    for (let i = 0; i < result.length; i++) {
      if (!result[i].success) {
        allSuccess = false
        errors.push(`Transfer to ${nonZeroAllocations[i].recipient} failed`)
      }
    }

    if (!allSuccess) {
      console.error('\n❌ Simulation failed for some transfers:')
      errors.forEach((e) => console.error(`   - ${e}`))
    } else {
      console.log('   ✅ All transfers simulated successfully!')
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    errors.push(`Simulation error: ${errorMsg}`)
    console.error(`\n❌ Simulation failed: ${errorMsg}`)
  }

  // Step 11: Prepare and log results
  const simulationResult: AirdropSimulationResult = {
    success: errors.length === 0,
    allocations: nonZeroAllocations,
    totalAmount: formatUnits(totalAllocated, decimals),
    tokenAddress,
    tokenSymbol: symbol,
    tokenDecimals: decimals,
    senderBalance: formatUnits(balance, decimals),
    senderBalanceAfter: formatUnits(balance - totalAllocated, decimals),
    errors,
  }

  // Save simulation results
  writeLog({
    content: simulationResult,
    label: `airdrop-simulation-${chainId}`,
    format: 'json',
  })

  // Print summary
  console.log('\n' + '='.repeat(80))
  console.log('📝 SIMULATION SUMMARY')
  console.log('='.repeat(80))
  console.log(`\nToken:              ${symbol} (${tokenAddress})`)
  console.log(`Chain:              ${chain.name}`)
  console.log(`Sender:             ${account.address}`)
  console.log(`Recipients:         ${nonZeroAllocations.length}`)
  console.log(`Total to send:      ${formatUnits(totalAllocated, decimals)} ${symbol}`)
  console.log(`Balance before:     ${formatUnits(balance, decimals)} ${symbol}`)
  console.log(`Balance after:      ${formatUnits(balance - totalAllocated, decimals)} ${symbol}`)
  console.log(`Simulation:         ${errors.length === 0 ? '✅ SUCCESS' : '❌ FAILED'}`)

  console.log('\n📋 Allocations:')
  console.log('  #   | Recipient                                  | Amount          | %')
  console.log('  ' + '-'.repeat(78))
  nonZeroAllocations.forEach((a, i) => {
    const rank = String(i + 1).padStart(3, ' ')
    const amount = a.amountFormatted.padStart(15, ' ')
    const pct = a.percentage.padStart(7, ' ')
    console.log(`  ${rank} | ${a.recipient} | ${amount} | ${pct}%`)
  })
  console.log('  ' + '-'.repeat(78))
  console.log(`  Total: ${formatUnits(totalAllocated, decimals)} ${symbol}`)

  if (errors.length > 0) {
    console.log('\n❌ Cannot proceed due to simulation errors')
    process.exit(1)
  }

  // Step 12: Ask for confirmation
  console.log('\n' + '⚠️ '.repeat(30))
  const confirm = await askQuestion('\nProceed with actual airdrop? (type "yes" to confirm): ')

  if (confirm.toLowerCase() !== 'yes') {
    console.log('\n❌ Airdrop cancelled')
    process.exit(0)
  }

  // Step 13: Execute the airdrop
  console.log('\n🚀 Executing airdrop...')

  try {
    const hash = await walletClient.writeContract({
      address: MULTICALL3_ADDRESS,
      abi: multicall3Abi,
      functionName: 'aggregate3',
      args: [calls],
    })

    console.log(`\n📡 Transaction submitted: ${hash}`)
    console.log('   Waiting for confirmation...')

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'success') {
      console.log('\n' + '✅ '.repeat(30))
      console.log('AIRDROP SUCCESSFUL!')
      console.log('✅ '.repeat(30))
      console.log(`\nTransaction: ${hash}`)
      console.log(`Block: ${receipt.blockNumber}`)
      console.log(`Gas used: ${receipt.gasUsed}`)

      // Save execution result
      const executionResult: AirdropExecutionResult = {
        ...simulationResult,
        transactionHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: 'success',
      }
      writeLog({
        content: executionResult,
        label: `airdrop-executed-${chainId}`,
        format: 'json',
      })
    } else {
      console.log('\n❌ Transaction reverted')
      console.log(`Transaction: ${hash}`)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`\n❌ Execution failed: ${errorMsg}`)
    process.exit(1)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ Airdrop complete!')
  console.log('='.repeat(80))
}

main().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error)
  process.exit(1)
})
