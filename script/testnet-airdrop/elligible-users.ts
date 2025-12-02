#!/usr/bin/env bun
/**
 * @description Script to find eligible users for testnet airdrop
 * @usage NEXT_PUBLIC_DRPC_API_KEY=xxx bun run script/testnet-airdrop/elligible-users.ts
 *
 * This script:
 * 1. Asks for a factory address
 * 2. Gets all projects from the factory
 * 3. Finds two tiers of eligible users:
 *    - Tier 1: Project deployers (originalAdmin of clanker tokens)
 *    - Tier 2: Stakers (users who have staked tokens)
 * 4. Saves results to logs and prints a summary
 */
import { createInterface } from 'readline'
import { type Address, createPublicClient, erc20Abi, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'

import IClankerToken from '../../src/abis/IClankerToken'
import LevrStakedToken_v1 from '../../src/abis/LevrStakedToken_v1'
import LevrStaking_v1 from '../../src/abis/LevrStaking_v1'

// Inline ABI for getProjects - testnet version without verified boolean
const getProjectsAbi = [
  {
    type: 'function',
    name: 'getProjects',
    inputs: [
      { name: 'offset', type: 'uint256', internalType: 'uint256' },
      { name: 'limit', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      {
        name: 'projects',
        type: 'tuple[]',
        internalType: 'struct ILevrFactory_v1.ProjectInfo[]',
        components: [
          { name: 'clankerToken', type: 'address', internalType: 'address' },
          {
            name: 'project',
            type: 'tuple',
            internalType: 'struct ILevrFactory_v1.Project',
            components: [
              { name: 'treasury', type: 'address', internalType: 'address' },
              { name: 'governor', type: 'address', internalType: 'address' },
              { name: 'staking', type: 'address', internalType: 'address' },
              { name: 'stakedToken', type: 'address', internalType: 'address' },
            ],
          },
        ],
      },
      { name: 'total', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const
import { getDRPCTransport } from '../util'
import { writeLog } from '../write-log'

// Types
type ProjectDeployer = {
  clankerToken: Address
  tokenName: string
  tokenSymbol: string
  originalAdmin: Address
}

type Staker = {
  address: Address
  clankerToken: Address
  tokenName: string
  tokenSymbol: string
  stakedBalance: string
  stakedBalanceRaw: string // String for JSON serialization
  votingPower: string
}

type UserScore = {
  address: Address
  deploymentsCount: number
  stakingPositionsCount: number
  totalParticipation: number
  scorePercentage: string
}

type EligibleUsers = {
  chainId: number
  factoryAddress: Address
  timestamp: string
  deployers: ProjectDeployer[]
  stakers: Staker[]
  summary: {
    totalProjects: number
    uniqueDeployers: number
    uniqueStakers: number
    totalStakedBalanceByToken: Record<string, string>
    totalUniqueUsers: number
    userScores: UserScore[]
  }
}

// Chain ID for Base Sepolia
const CHAIN_ID = 84532

async function askForFactoryAddress(): Promise<Address> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('Enter factory address: ', (answer) => {
      rl.close()
      const trimmed = answer.trim()
      if (!trimmed.startsWith('0x') || trimmed.length !== 42) {
        console.error('❌ Invalid address format. Expected 0x followed by 40 hex characters.')
        process.exit(1)
      }
      resolve(trimmed as Address)
    })
  })
}

async function main() {
  console.log('='.repeat(80))
  console.log('🔍 TESTNET AIRDROP - ELIGIBLE USERS FINDER')
  console.log('='.repeat(80))
  console.log(`\nChain: Base Sepolia (${CHAIN_ID})`)

  // Check for DRPC API key
  if (!process.env.NEXT_PUBLIC_DRPC_API_KEY) {
    console.error('❌ ERROR: NEXT_PUBLIC_DRPC_API_KEY not set')
    process.exit(1)
  }

  // Get factory address from user
  const factoryAddress = await askForFactoryAddress()
  console.log(`\n📍 Factory Address: ${factoryAddress}`)

  // Create public client with DRPC transport
  const transport = getDRPCTransport(CHAIN_ID)
  if (!transport) {
    console.error('❌ ERROR: Could not create transport for Base Sepolia')
    process.exit(1)
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport,
  })

  console.log('\n📡 Fetching projects from factory...')

  // Fetch all projects from factory (paginated)
  let offset = 0
  const limit = 50
  const allProjects: Array<{
    clankerToken: Address
    project: {
      treasury: Address
      governor: Address
      staking: Address
      stakedToken: Address
    }
  }> = []

  while (true) {
    const [projects, total] = await publicClient.readContract({
      address: factoryAddress,
      abi: getProjectsAbi,
      functionName: 'getProjects',
      args: [BigInt(offset), BigInt(limit)],
    })

    allProjects.push(...projects)

    if (allProjects.length >= Number(total) || projects.length === 0) {
      console.log(`   Found ${allProjects.length} projects (total: ${Number(total)})`)
      break
    }

    offset += limit
  }

  if (allProjects.length === 0) {
    console.log('\n⚠️  No projects found in factory')
    process.exit(0)
  }

  // Initialize collections
  const deployers: ProjectDeployer[] = []
  const stakers: Staker[] = []
  const stakersSet = new Set<string>()
  const deployersSet = new Set<string>()
  const totalStakedByToken: Record<string, bigint> = {}

  console.log('\n📊 Processing projects...\n')

  // Batch process all projects using multicall for efficiency
  // First, collect all contract calls
  const projectCalls = allProjects.flatMap(({ clankerToken, project }) => [
    { address: clankerToken, abi: IClankerToken, functionName: 'allData' as const },
    { address: clankerToken, abi: erc20Abi, functionName: 'name' as const },
    { address: clankerToken, abi: erc20Abi, functionName: 'symbol' as const },
    { address: clankerToken, abi: erc20Abi, functionName: 'decimals' as const },
    { address: project.staking, abi: LevrStaking_v1, functionName: 'totalStaked' as const },
  ])

  console.log('   Fetching token metadata and staking info...')
  const projectResults = await publicClient.multicall({ contracts: projectCalls })

  // Process results and collect deployers

  for (let i = 0; i < allProjects.length; i++) {
    const { clankerToken } = allProjects[i]
    const baseIdx = i * 5

    const allData = projectResults[baseIdx]
    const tokenName = projectResults[baseIdx + 1]
    const tokenSymbol = projectResults[baseIdx + 2]
    const tokenDecimals = projectResults[baseIdx + 3]
    const totalStaked = projectResults[baseIdx + 4]

    const name = (tokenName.result as string) ?? 'Unknown'
    const symbol = (tokenSymbol.result as string) ?? '???'
    const decimals = (tokenDecimals.result as number) ?? 18
    const originalAdmin = (allData.result as [Address, Address, string, string, string])?.[0]
    const poolTotalStaked = (totalStaked.result as bigint) ?? 0n

    console.log(`  [${i + 1}/${allProjects.length}] ${symbol}: ${clankerToken}`)

    if (originalAdmin) {
      deployers.push({
        clankerToken,
        tokenName: name,
        tokenSymbol: symbol,
        originalAdmin,
      })
      deployersSet.add(originalAdmin.toLowerCase())
      console.log(`     ✅ Deployer: ${originalAdmin}`)
    }

    if (poolTotalStaked > 0n) {
      totalStakedByToken[clankerToken] = poolTotalStaked
      const stakedAmount = formatUnits(poolTotalStaked, decimals)
      console.log(`     📊 Total staked in pool: ${stakedAmount} ${symbol}`)
    }
  }

  // Now check if any known addresses (deployers) have staked in any project
  // Build a single multicall for ALL deployer x project combinations
  console.log('\n📊 Checking deployer staking status...')
  const uniqueDeployerAddresses = [...deployersSet] as Address[]

  // Build call index mapping: [projectIndex, deployerIndex]
  type CallMapping = { projectIdx: number; deployerIdx: number }
  const callMappings: CallMapping[] = []
  const stakerCalls: Array<{
    address: Address
    abi: typeof LevrStakedToken_v1 | typeof LevrStaking_v1
    functionName: 'balanceOf' | 'getVotingPower'
    args: [Address]
  }> = []

  for (let i = 0; i < allProjects.length; i++) {
    const { project } = allProjects[i]
    for (let j = 0; j < uniqueDeployerAddresses.length; j++) {
      const addr = uniqueDeployerAddresses[j]
      callMappings.push({ projectIdx: i, deployerIdx: j })
      stakerCalls.push(
        {
          address: project.stakedToken,
          abi: LevrStakedToken_v1,
          functionName: 'balanceOf' as const,
          args: [addr],
        },
        {
          address: project.staking,
          abi: LevrStaking_v1,
          functionName: 'getVotingPower' as const,
          args: [addr],
        }
      )
    }
  }

  console.log(`   Checking ${callMappings.length} deployer-project combinations...`)
  const stakerResults = await publicClient.multicall({ contracts: stakerCalls })

  // Process results
  console.log('')
  for (let k = 0; k < callMappings.length; k++) {
    const { projectIdx, deployerIdx } = callMappings[k]
    const { clankerToken } = allProjects[projectIdx]
    const stakerAddress = uniqueDeployerAddresses[deployerIdx]

    const deployerInfo = deployers.find(
      (d) => d.clankerToken.toLowerCase() === clankerToken.toLowerCase()
    )
    if (!deployerInfo) continue

    const balanceResult = stakerResults[k * 2]
    const votingPowerResult = stakerResults[k * 2 + 1]

    const stakedBalanceRaw = (balanceResult.result as bigint) ?? 0n
    const votingPower = (votingPowerResult.result as bigint) ?? 0n

    if (stakedBalanceRaw > 0n) {
      const stakedKey = `${stakerAddress.toLowerCase()}-${clankerToken.toLowerCase()}`
      if (!stakersSet.has(stakedKey)) {
        stakersSet.add(stakedKey)
        const stakedBalanceFormatted = formatUnits(stakedBalanceRaw, 18)
        stakers.push({
          address: stakerAddress,
          clankerToken,
          tokenName: deployerInfo.tokenName,
          tokenSymbol: deployerInfo.tokenSymbol,
          stakedBalance: stakedBalanceFormatted,
          stakedBalanceRaw: stakedBalanceRaw.toString(),
          votingPower: votingPower.toString(),
        })
        console.log(
          `  ✅ ${stakerAddress} staked ${stakedBalanceFormatted} ${deployerInfo.tokenSymbol}`
        )
      }
    }
  }

  // Format total staked for summary
  const totalStakedFormatted: Record<string, string> = {}
  for (const [token, amount] of Object.entries(totalStakedByToken)) {
    const tokenInfo = deployers.find((d) => d.clankerToken.toLowerCase() === token.toLowerCase())
    totalStakedFormatted[token] = `${formatUnits(amount, 18)} ${tokenInfo?.tokenSymbol ?? 'tokens'}`
  }

  // Calculate user scores based on participation
  // Each deployment and each staking position counts as 1 participation point
  const userParticipation = new Map<string, { deployments: number; stakingPositions: number }>()

  // Count deployments per user
  for (const d of deployers) {
    const addr = d.originalAdmin.toLowerCase()
    const current = userParticipation.get(addr) ?? { deployments: 0, stakingPositions: 0 }
    current.deployments += 1
    userParticipation.set(addr, current)
  }

  // Count staking positions per user
  for (const s of stakers) {
    const addr = s.address.toLowerCase()
    const current = userParticipation.get(addr) ?? { deployments: 0, stakingPositions: 0 }
    current.stakingPositions += 1
    userParticipation.set(addr, current)
  }

  // Calculate total participation points
  let totalParticipationPoints = 0
  for (const [, p] of userParticipation) {
    totalParticipationPoints += p.deployments + p.stakingPositions
  }

  // Build user scores array sorted by score descending
  const userScores: UserScore[] = [...userParticipation.entries()]
    .map(([addr, p]) => {
      const total = p.deployments + p.stakingPositions
      const percentage = totalParticipationPoints > 0 ? (total / totalParticipationPoints) * 100 : 0
      return {
        address: addr as Address,
        deploymentsCount: p.deployments,
        stakingPositionsCount: p.stakingPositions,
        totalParticipation: total,
        scorePercentage: percentage.toFixed(4),
      }
    })
    .sort((a, b) => b.totalParticipation - a.totalParticipation)

  // Prepare results
  const results: EligibleUsers = {
    chainId: CHAIN_ID,
    factoryAddress,
    timestamp: new Date().toISOString(),
    deployers,
    stakers,
    summary: {
      totalProjects: allProjects.length,
      uniqueDeployers: deployersSet.size,
      uniqueStakers: new Set(stakers.map((s) => s.address.toLowerCase())).size,
      totalStakedBalanceByToken: totalStakedFormatted,
      totalUniqueUsers: userParticipation.size,
      userScores,
    },
  }

  // Save results
  writeLog({
    content: results,
    label: `testnet-airdrop-eligible-users-${CHAIN_ID}`,
    format: 'json',
  })

  // Print summary
  console.log('\n' + '='.repeat(80))
  console.log('📝 SUMMARY')
  console.log('='.repeat(80))
  console.log(`\nChain ID:           ${CHAIN_ID}`)
  console.log(`Factory:            ${factoryAddress}`)
  console.log(`Total Projects:     ${results.summary.totalProjects}`)
  console.log(`\n--- TIER 1: PROJECT DEPLOYERS ---`)
  console.log(`Unique Deployers:   ${results.summary.uniqueDeployers}`)
  if (deployers.length > 0) {
    console.log('\nDeployers:')
    const uniqueDeployers = [
      ...new Map(deployers.map((d) => [d.originalAdmin.toLowerCase(), d])).values(),
    ]
    uniqueDeployers.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.originalAdmin}`)
      console.log(`     Token: ${d.tokenName} (${d.tokenSymbol})`)
    })
  }

  console.log(`\n--- TIER 2: STAKERS ---`)
  console.log(`Unique Stakers:     ${results.summary.uniqueStakers}`)
  if (stakers.length > 0) {
    console.log('\nStakers by token:')
    const stakersByToken = stakers.reduce(
      (acc, s) => {
        const key = `${s.tokenSymbol} (${s.clankerToken})`
        if (!acc[key]) acc[key] = []
        acc[key].push(s)
        return acc
      },
      {} as Record<string, Staker[]>
    )

    for (const [token, tokenStakers] of Object.entries(stakersByToken)) {
      console.log(`\n  ${token}:`)
      tokenStakers.forEach((s, i) => {
        console.log(`    ${i + 1}. ${s.address}`)
        console.log(`       Staked: ${s.stakedBalance} | Voting Power: ${s.votingPower}`)
      })
    }

    console.log('\nTotal staked by token:')
    for (const [token, amount] of Object.entries(results.summary.totalStakedBalanceByToken)) {
      const tokenInfo = deployers.find((d) => d.clankerToken.toLowerCase() === token.toLowerCase())
      console.log(`  ${tokenInfo?.tokenSymbol ?? 'Unknown'}: ${amount}`)
    }
  }

  // Print user scores
  console.log(`\n--- USER SCORES (adds up to 100%) ---`)
  console.log(`Total Unique Users: ${results.summary.totalUniqueUsers}`)
  const totalPoints = userScores.reduce((sum, u) => sum + u.totalParticipation, 0)
  console.log(`Total Participation Points: ${totalPoints}`)
  console.log('\nRanking:')
  console.log('  #   | Address                                    | Deploys | Stakes | Score')
  console.log('  ' + '-'.repeat(82))
  userScores.forEach((u, i) => {
    const rank = String(i + 1).padStart(3, ' ')
    const deploys = String(u.deploymentsCount).padStart(7, ' ')
    const stakes = String(u.stakingPositionsCount).padStart(6, ' ')
    const score = u.scorePercentage.padStart(7, ' ')
    console.log(`  ${rank} | ${u.address} | ${deploys} | ${stakes} | ${score}%`)
  })

  // Verify scores add up to 100%
  const totalScore = userScores.reduce((sum, u) => sum + parseFloat(u.scorePercentage), 0)
  console.log('  ' + '-'.repeat(82))
  console.log(`  Total Score: ${totalScore.toFixed(4)}%`)

  console.log('\n' + '='.repeat(80))
  console.log('✅ Results saved to logs folder')
  console.log('='.repeat(80))
}

main().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error)
  process.exit(1)
})
