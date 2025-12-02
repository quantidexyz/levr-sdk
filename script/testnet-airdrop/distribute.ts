#!/usr/bin/env bun
/**
 * @description Airdrop distribution script using EIP-5792 batch calls
 * @usage bun run script/testnet-airdrop/distribute.ts
 *
 * This script:
 * 1. Asks which wallet to use (TEST_PRIVATE_KEY or MAINNET_PRIVATE_KEY)
 * 2. Asks for token address to distribute
 * 3. Lists log files sorted by date and asks user to choose one
 * 4. Asks for chain (base or baseSepolia)
 * 5. Asks for total amount to distribute
 * 6. Simulates the airdrop using simulateCalls
 * 7. Logs results and asks to proceed
 * 8. If confirmed, executes the airdrop using sendCalls
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
import type { AirdropAllocation, AirdropSimulationResult, EligibleUsers } from './types'

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

// Convert allocations to JSON-serializable format (BigInt -> string)
function serializeAllocations(
  allocations: AirdropAllocation[]
): Array<Omit<AirdropAllocation, 'amount'> & { amount: string }> {
  return allocations.map((a) => ({
    ...a,
    amount: a.amount.toString(),
  }))
}

async function main() {
  console.log('='.repeat(80))
  console.log('🎁 AIRDROP DISTRIBUTION (EIP-5792 Batch Calls)')
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
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account.address],
      },
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

  // Step 9: Build calls array for EIP-5792
  console.log('\n🔧 Building batch transfer calls...')
  const calls = nonZeroAllocations.map((allocation) => ({
    to: tokenAddress,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [allocation.recipient, allocation.amount],
    }),
  }))

  // Step 10: Simulate the batch calls
  console.log('\n🧪 Simulating airdrop with simulateCalls...')
  const errors: string[] = []

  try {
    const { results: simulationResults } = await publicClient.simulateCalls({
      account: account.address,
      calls,
    })

    // Check results
    let allSuccess = true
    for (let i = 0; i < simulationResults.length; i++) {
      const result = simulationResults[i]
      if (result.status === 'failure') {
        allSuccess = false
        const errorReason =
          'error' in result && result.error ? String(result.error) : 'Unknown error'
        errors.push(`Transfer to ${nonZeroAllocations[i].recipient} failed: ${errorReason}`)
      }
    }

    if (!allSuccess) {
      console.error(`\n❌ Simulation failed for ${errors.length} transfers:`)
      errors.slice(0, 5).forEach((e) => console.error(`   - ${e}`))
      if (errors.length > 5) {
        console.error(`   ... and ${errors.length - 5} more`)
      }
    } else {
      console.log(`   ✅ All ${nonZeroAllocations.length} transfers simulated successfully!`)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    errors.push(`Simulation error: ${errorMsg}`)
    console.error(`\n❌ Simulation failed: ${errorMsg}`)
  }

  // Step 11: Prepare and log results (serialize BigInt values)
  const simulationResult: Omit<AirdropSimulationResult, 'allocations'> & {
    allocations: Array<Omit<AirdropAllocation, 'amount'> & { amount: string }>
  } = {
    success: errors.length === 0,
    allocations: serializeAllocations(nonZeroAllocations),
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
    const amountStr = a.amountFormatted.padStart(15, ' ')
    const pct = a.percentage.padStart(7, ' ')
    console.log(`  ${rank} | ${a.recipient} | ${amountStr} | ${pct}%`)
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

  // Step 13: Execute the airdrop using sendCalls
  console.log('\n🚀 Executing airdrop with sendCalls...')

  try {
    // sendCalls returns a bundle ID that can be used to track the batch
    const { id: bundleId } = await walletClient.sendCalls({
      calls,
    })

    console.log(`\n📡 Batch submitted with ID: ${bundleId}`)
    console.log('   Waiting for confirmation...')

    // Wait for all calls to complete
    const result = await walletClient.waitForCallsStatus({
      id: bundleId,
    })

    if (result.status === 'success') {
      const receipts = result.receipts ?? []
      const successCount = receipts.filter((r) => r.status === 'success').length

      console.log('\n' + '✅ '.repeat(30))
      console.log('AIRDROP SUCCESSFUL!')
      console.log('✅ '.repeat(30))
      console.log(`\nBundle ID: ${bundleId}`)
      console.log(`Successful transfers: ${successCount}/${nonZeroAllocations.length}`)

      if (receipts.length > 0) {
        console.log(`First tx hash: ${receipts[0].transactionHash}`)
        console.log(`Total gas used: ${receipts.reduce((sum, r) => sum + BigInt(r.gasUsed), 0n)}`)
      }

      // Save execution result
      writeLog({
        content: {
          ...simulationResult,
          bundleId,
          status: 'success',
          receipts: receipts.map((r) => ({
            transactionHash: r.transactionHash,
            blockNumber: r.blockNumber.toString(),
            gasUsed: r.gasUsed.toString(),
            status: r.status,
          })),
        },
        label: `airdrop-executed-${chainId}`,
        format: 'json',
      })
    } else if (result.status === 'failure') {
      console.log(`\n❌ Batch failed`)
    } else {
      console.log(`\n⏳ Batch status: ${result.status}`)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)

    // If sendCalls is not supported, fall back to sequential transfers
    if (errorMsg.includes('not supported') || errorMsg.includes('wallet_sendCalls')) {
      console.log('\n⚠️  Wallet does not support EIP-5792 sendCalls')
      console.log('   Falling back to sequential transfers...\n')

      const successfulTransfers: Array<{ recipient: Address; amount: string; hash: string }> = []
      const failedTransfers: Array<{ recipient: Address; amount: string; error: string }> = []

      for (let i = 0; i < nonZeroAllocations.length; i++) {
        const allocation = nonZeroAllocations[i]
        const progress = `[${i + 1}/${nonZeroAllocations.length}]`

        try {
          process.stdout.write(
            `${progress} Sending ${allocation.amountFormatted} ${symbol} to ${allocation.recipient}...`
          )

          const hash = await walletClient.writeContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [allocation.recipient, allocation.amount],
          })

          const receipt = await publicClient.waitForTransactionReceipt({ hash })

          if (receipt.status === 'success') {
            successfulTransfers.push({
              recipient: allocation.recipient,
              amount: allocation.amountFormatted,
              hash,
            })
            console.log(` ✅ ${hash}`)
          } else {
            failedTransfers.push({
              recipient: allocation.recipient,
              amount: allocation.amountFormatted,
              error: 'Transaction reverted',
            })
            console.log(` ❌ Reverted`)
          }
        } catch (txError) {
          const txErrorMsg =
            txError instanceof Error ? txError.message.slice(0, 50) : 'Unknown error'
          failedTransfers.push({
            recipient: allocation.recipient,
            amount: allocation.amountFormatted,
            error: txErrorMsg,
          })
          console.log(` ❌ ${txErrorMsg}`)
        }
      }

      // Summary for sequential transfers
      console.log('\n' + '='.repeat(80))
      console.log('📊 EXECUTION SUMMARY')
      console.log('='.repeat(80))
      console.log(`\n✅ Successful: ${successfulTransfers.length}`)
      console.log(`❌ Failed: ${failedTransfers.length}`)

      writeLog({
        content: {
          ...simulationResult,
          method: 'sequential',
          successfulTransfers,
          failedTransfers,
        },
        label: `airdrop-executed-${chainId}`,
        format: 'json',
      })

      if (failedTransfers.length === 0) {
        console.log('\n' + '✅ '.repeat(30))
        console.log('AIRDROP COMPLETE!')
        console.log('✅ '.repeat(30))
      }
    } else {
      console.error(`\n❌ Execution failed: ${errorMsg}`)
      process.exit(1)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ Airdrop complete!')
  console.log('='.repeat(80))
}

main().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error)
  process.exit(1)
})
