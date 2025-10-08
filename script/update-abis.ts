#!/usr/bin/env bun
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const contracts = [
  'LevrFactory_v1',
  'LevrGovernor_v1',
  'LevrStakedToken_v1',
  'LevrStaking_v1',
  'LevrTreasury_v1',
  'LevrForwarder_v1',
  'IClankerToken',
  'IClankerHookV2',
  'IClankerLPLocker',
  'IClankerLpLockerMultiple',
  'IClankerHook',
  'IClanker',
  'IClankerHookDynamicFee',
  'IClankerHookStaticFee',
] as const

const contractsOutDir = resolve(__dirname, '../contracts/out')
const abisOutDir = resolve(__dirname, '../src/abis')

// Ensure the output directory exists
mkdirSync(abisOutDir, { recursive: true })

for (const contractName of contracts) {
  try {
    // Read the JSON file from Foundry output
    const jsonPath = resolve(contractsOutDir, `${contractName}.sol`, `${contractName}.json`)

    console.log(`Reading ${jsonPath}...`)
    const contractJson = JSON.parse(readFileSync(jsonPath, 'utf-8'))

    // Extract ABI
    const abi = contractJson.abi

    if (!abi) {
      console.error(`❌ No ABI found in ${jsonPath}`)
      continue
    }

    // Format the output
    const output = `export default ${JSON.stringify(abi, null, 2)} as const;\n`

    // Write to destination
    const outputPath = resolve(abisOutDir, `${contractName}.ts`)
    writeFileSync(outputPath, output, 'utf-8')

    console.log(`✅ Generated ${outputPath}`)
  } catch (error) {
    console.error(`❌ Error processing ${contractName}:`, error)
  }
}

console.log('\n✨ ABI update complete!')
