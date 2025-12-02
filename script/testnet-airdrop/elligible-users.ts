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
import LevrGovernor_v1 from '../../src/abis/LevrGovernor_v1'
import LevrStakedToken_v1 from '../../src/abis/LevrStakedToken_v1'
import LevrStaking_v1 from '../../src/abis/LevrStaking_v1'
import { getDRPCTransport } from '../util'
import { writeLog } from '../write-log'
import type { DaoParticipant, EligibleUsers, ProjectDeployer, Staker, UserScore } from './types'
import { getProjectsAbi } from './types'

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

  // ============================================================
  // TIER 3: DAO PARTICIPATION (proposals created + votes cast)
  // ============================================================
  console.log('\n📊 Checking DAO participation...')

  const daoParticipants: DaoParticipant[] = []
  const daoParticipantsSet = new Set<string>()

  // Track proposals and votes per user
  const userProposals = new Map<string, Set<string>>() // user -> set of proposal keys
  const userVotes = new Map<string, Set<string>>() // user -> set of proposal keys

  // Step 1: Get currentCycleId for each governor
  const cycleIdCalls = allProjects.map(({ project }) => ({
    address: project.governor,
    abi: LevrGovernor_v1,
    functionName: 'currentCycleId' as const,
  }))

  console.log('   Fetching cycle IDs for all governors...')
  const cycleIdResults = await publicClient.multicall({ contracts: cycleIdCalls })

  // Step 2: For each project, get proposals for all cycles
  type ProposalRef = { projectIdx: number; cycleId: bigint; proposalId: bigint }
  const proposalRefs: ProposalRef[] = []

  for (let i = 0; i < allProjects.length; i++) {
    const { project } = allProjects[i]
    const currentCycleId = (cycleIdResults[i].result as bigint) ?? 0n

    // Get proposals for cycles 0 to currentCycleId
    for (let c = 0n; c <= currentCycleId; c++) {
      const proposalIds = await publicClient.readContract({
        address: project.governor,
        abi: LevrGovernor_v1,
        functionName: 'getProposalsForCycle',
        args: [c],
      })

      for (const proposalId of proposalIds) {
        proposalRefs.push({ projectIdx: i, cycleId: c, proposalId })
      }
    }
  }

  console.log(`   Found ${proposalRefs.length} proposals across all projects`)

  if (proposalRefs.length > 0) {
    // Step 3: Get proposal details to find proposers
    const proposalDetailsCalls = proposalRefs.map((ref) => ({
      address: allProjects[ref.projectIdx].project.governor,
      abi: LevrGovernor_v1,
      functionName: 'getProposal' as const,
      args: [ref.proposalId],
    }))

    console.log('   Fetching proposal details...')
    const proposalDetailsResults = await publicClient.multicall({ contracts: proposalDetailsCalls })

    // Track proposers
    for (let i = 0; i < proposalRefs.length; i++) {
      const ref = proposalRefs[i]
      const result = proposalDetailsResults[i]
      if (result.status === 'success' && result.result) {
        const proposal = result.result as {
          proposer: Address
          [key: string]: unknown
        }
        const proposer = proposal.proposer.toLowerCase()
        const proposalKey = `${allProjects[ref.projectIdx].clankerToken}-${ref.proposalId}`

        if (!userProposals.has(proposer)) {
          userProposals.set(proposer, new Set())
        }
        userProposals.get(proposer)!.add(proposalKey)
      }
    }

    // Step 4: Check vote receipts for all known users on all proposals
    const knownUsers = [...deployersSet]
    console.log(`   Checking vote receipts for ${knownUsers.length} users...`)

    const voteReceiptCalls = proposalRefs.flatMap((ref) =>
      knownUsers.map((user) => ({
        address: allProjects[ref.projectIdx].project.governor,
        abi: LevrGovernor_v1,
        functionName: 'getVoteReceipt' as const,
        args: [ref.proposalId, user as Address],
      }))
    )

    if (voteReceiptCalls.length > 0) {
      const voteReceiptResults = await publicClient.multicall({ contracts: voteReceiptCalls })

      // Process vote receipts
      let voteIdx = 0
      for (const ref of proposalRefs) {
        const { clankerToken } = allProjects[ref.projectIdx]
        const proposalKey = `${clankerToken}-${ref.proposalId}`

        for (const user of knownUsers) {
          const result = voteReceiptResults[voteIdx]
          if (result.status === 'success' && result.result) {
            const receipt = result.result as { hasVoted: boolean }
            if (receipt.hasVoted) {
              const userLower = user.toLowerCase()
              if (!userVotes.has(userLower)) {
                userVotes.set(userLower, new Set())
              }
              userVotes.get(userLower)!.add(proposalKey)
            }
          }
          voteIdx++
        }
      }
    }
  }

  // Build daoParticipants array
  const allDaoUsers = new Set([...userProposals.keys(), ...userVotes.keys()])
  for (const user of allDaoUsers) {
    const proposalsCreated = userProposals.get(user)?.size ?? 0
    const votesCast = userVotes.get(user)?.size ?? 0

    if (proposalsCreated > 0 || votesCast > 0) {
      daoParticipantsSet.add(user)
      // Find which token they're associated with (first deployment or first staking)
      const deployerEntry = deployers.find((d) => d.originalAdmin.toLowerCase() === user)
      const stakerEntry = stakers.find((s) => s.address.toLowerCase() === user)

      daoParticipants.push({
        address: user as Address,
        clankerToken: (deployerEntry?.clankerToken ?? stakerEntry?.clankerToken ?? '0x') as Address,
        tokenSymbol: deployerEntry?.tokenSymbol ?? stakerEntry?.tokenSymbol ?? 'N/A',
        proposalsCreated,
        votesCast,
      })

      console.log(`  ✅ ${user}: ${proposalsCreated} proposals, ${votesCast} votes`)
    }
  }

  // Format total staked for summary
  const totalStakedFormatted: Record<string, string> = {}
  for (const [token, amount] of Object.entries(totalStakedByToken)) {
    const tokenInfo = deployers.find((d) => d.clankerToken.toLowerCase() === token.toLowerCase())
    totalStakedFormatted[token] = `${formatUnits(amount, 18)} ${tokenInfo?.tokenSymbol ?? 'tokens'}`
  }

  // Calculate user scores based on participation
  // Each deployment, staking position, proposal, and vote counts as 1 participation point
  const userParticipation = new Map<
    string,
    { deployments: number; stakingPositions: number; proposalsCreated: number; votesCast: number }
  >()

  // Count deployments per user
  for (const d of deployers) {
    const addr = d.originalAdmin.toLowerCase()
    const current = userParticipation.get(addr) ?? {
      deployments: 0,
      stakingPositions: 0,
      proposalsCreated: 0,
      votesCast: 0,
    }
    current.deployments += 1
    userParticipation.set(addr, current)
  }

  // Count staking positions per user
  for (const s of stakers) {
    const addr = s.address.toLowerCase()
    const current = userParticipation.get(addr) ?? {
      deployments: 0,
      stakingPositions: 0,
      proposalsCreated: 0,
      votesCast: 0,
    }
    current.stakingPositions += 1
    userParticipation.set(addr, current)
  }

  // Count DAO participation per user
  for (const dao of daoParticipants) {
    const addr = dao.address.toLowerCase()
    const current = userParticipation.get(addr) ?? {
      deployments: 0,
      stakingPositions: 0,
      proposalsCreated: 0,
      votesCast: 0,
    }
    current.proposalsCreated += dao.proposalsCreated
    current.votesCast += dao.votesCast
    userParticipation.set(addr, current)
  }

  // Calculate total participation points
  let totalParticipationPoints = 0
  for (const [, p] of userParticipation) {
    totalParticipationPoints +=
      p.deployments + p.stakingPositions + p.proposalsCreated + p.votesCast
  }

  // Build user scores array sorted by score descending
  const userScores: UserScore[] = [...userParticipation.entries()]
    .map(([addr, p]) => {
      const total = p.deployments + p.stakingPositions + p.proposalsCreated + p.votesCast
      const percentage = totalParticipationPoints > 0 ? (total / totalParticipationPoints) * 100 : 0
      return {
        address: addr as Address,
        deploymentsCount: p.deployments,
        stakingPositionsCount: p.stakingPositions,
        proposalsCreatedCount: p.proposalsCreated,
        votesCastCount: p.votesCast,
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
    daoParticipants,
    summary: {
      totalProjects: allProjects.length,
      uniqueDeployers: deployersSet.size,
      uniqueStakers: new Set(stakers.map((s) => s.address.toLowerCase())).size,
      uniqueDaoParticipants: daoParticipantsSet.size,
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

  console.log(`\n--- TIER 3: DAO PARTICIPATION ---`)
  console.log(`Unique DAO Participants: ${results.summary.uniqueDaoParticipants}`)
  if (daoParticipants.length > 0) {
    console.log('\nDAO Participants:')
    daoParticipants
      .sort((a, b) => b.proposalsCreated + b.votesCast - (a.proposalsCreated + a.votesCast))
      .forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.address}`)
        console.log(`     Proposals: ${d.proposalsCreated} | Votes: ${d.votesCast}`)
      })
  }

  // Print user scores
  console.log(`\n--- USER SCORES (adds up to 100%) ---`)
  console.log(`Total Unique Users: ${results.summary.totalUniqueUsers}`)
  const totalPoints = userScores.reduce((sum, u) => sum + u.totalParticipation, 0)
  console.log(`Total Participation Points: ${totalPoints}`)
  console.log('\nRanking:')
  console.log(
    '  #   | Address                                    | Deploy | Stake | Props | Votes | Score'
  )
  console.log('  ' + '-'.repeat(96))
  userScores.forEach((u, i) => {
    const rank = String(i + 1).padStart(3, ' ')
    const deploys = String(u.deploymentsCount).padStart(6, ' ')
    const stakes = String(u.stakingPositionsCount).padStart(5, ' ')
    const props = String(u.proposalsCreatedCount).padStart(5, ' ')
    const votes = String(u.votesCastCount).padStart(5, ' ')
    const score = u.scorePercentage.padStart(7, ' ')
    const line = `  ${rank} | ${u.address} | ${deploys} | ${stakes} | ${props} | ${votes} | ${score}%`
    console.log(line)
  })

  // Verify scores add up to 100%
  const totalScore = userScores.reduce((sum, u) => sum + parseFloat(u.scorePercentage), 0)
  console.log('  ' + '-'.repeat(96))
  console.log(`  Total Score: ${totalScore.toFixed(4)}%`)

  console.log('\n' + '='.repeat(80))
  console.log('✅ Results saved to logs folder')
  console.log('='.repeat(80))
}

main().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error)
  process.exit(1)
})
