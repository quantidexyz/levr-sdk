import ClankerAirdropV2 from './abis/ClankerAirdropV2'
import { formatBalanceWithUsd } from './balance'
import { GET_CLANKER_AIRDROP_ADDRESS } from './constants'
import type { BalanceResult, PopPublicClient } from './types'

export type AirdropStatus = {
  availableAmount: BalanceResult
  allocatedAmount: BalanceResult
  isAvailable: boolean
  proof: `0x${string}`[]
  deploymentTimestamp?: number
  lockupDurationHours?: number
  error?: string
}

export async function getTreasuryAirdropStatus(
  publicClient: PopPublicClient,
  clankerToken: `0x${string}`,
  treasury: `0x${string}`,
  tokenDecimals: number,
  tokenUsdPrice: number | null
): Promise<AirdropStatus | null> {
  const chainId = publicClient.chain?.id
  const airdropAddress = GET_CLANKER_AIRDROP_ADDRESS(chainId)

  if (!airdropAddress) {
    return null
  }

  try {
    const currentBlock = await publicClient.getBlockNumber()
    const blocksToSearch = 1_000_000n
    const fromBlock = currentBlock > blocksToSearch ? currentBlock - blocksToSearch : 0n

    // Find event definitions from ABI
    const airdropCreatedEvent = ClankerAirdropV2.find(
      (item) => item.type === 'event' && item.name === 'AirdropCreated'
    )
    const airdropClaimedEvent = ClankerAirdropV2.find(
      (item) => item.type === 'event' && item.name === 'AirdropClaimed'
    )

    if (!airdropCreatedEvent || !airdropClaimedEvent) {
      throw new Error('Required events not found in IClankerAirdrop ABI')
    }

    // First, fetch AirdropCreated events to find when the airdrop was deployed
    const createdLogs = await publicClient.getLogs({
      address: airdropAddress,
      event: airdropCreatedEvent,
      args: {
        token: clankerToken,
      },
      fromBlock,
      toBlock: 'latest',
    })

    if (createdLogs.length === 0) {
      return null
    }

    const latestLog = createdLogs[createdLogs.length - 1]
    const { supply, lockupDuration } = latestLog.args as { supply: bigint; lockupDuration: bigint }
    const allocatedAmount = supply
    const lockupDurationHours = Number(lockupDuration) / 3600 // Convert seconds to hours

    // Fetch claim logs, available amount, and deployment block in parallel
    const [allClaimLogs, multicallResults, block] = await Promise.all([
      publicClient.getLogs({
        address: airdropAddress,
        event: airdropClaimedEvent,
        args: {
          token: clankerToken,
          user: treasury, // Filter by treasury as the user
        },
        fromBlock: latestLog.blockNumber, // Search from airdrop creation
        toBlock: 'latest',
      }),
      publicClient.multicall({
        contracts: [
          {
            address: airdropAddress,
            abi: ClankerAirdropV2,
            functionName: 'amountAvailableToClaim',
            args: [clankerToken, treasury, allocatedAmount],
          },
        ],
        allowFailure: false,
      }),
      publicClient.getBlock({ blockNumber: latestLog.blockNumber }),
    ])

    const [availableAmount] = multicallResults as [bigint]
    const deploymentTimestamp = Number(block.timestamp) * 1000

    if (availableAmount === 0n) {
      // Check if there's a claim event for this treasury (already filtered by user in the query)
      const isAlreadyClaimed = allClaimLogs.length > 0

      return {
        availableAmount: formatBalanceWithUsd(0n, tokenDecimals, tokenUsdPrice),
        allocatedAmount: formatBalanceWithUsd(allocatedAmount, tokenDecimals, tokenUsdPrice),
        isAvailable: false,
        proof: [],
        deploymentTimestamp,
        lockupDurationHours,
        error: isAlreadyClaimed
          ? 'Treasury airdrop already claimed'
          : 'Airdrop is still locked (lockup period not passed)',
      }
    }

    return {
      availableAmount: formatBalanceWithUsd(availableAmount, tokenDecimals, tokenUsdPrice),
      allocatedAmount: formatBalanceWithUsd(allocatedAmount, tokenDecimals, tokenUsdPrice),
      isAvailable: true,
      proof: [],
      deploymentTimestamp,
      lockupDurationHours,
      error: undefined,
    }
  } catch (error) {
    console.error('Failed to fetch airdrop:', error)
    return null
  }
}
