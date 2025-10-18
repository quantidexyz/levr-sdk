import { erc20Abi } from 'viem'

import { IClankerAirdrop } from './abis'
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
    const blocksToSearch = 100_000n
    const fromBlock = currentBlock > blocksToSearch ? currentBlock - blocksToSearch : 0n

    const logs = await publicClient.getLogs({
      address: airdropAddress,
      event: {
        type: 'event',
        name: 'AirdropCreated',
        inputs: [
          { name: 'token', type: 'address', indexed: true },
          { name: 'admin', type: 'address', indexed: true },
          { name: 'merkleRoot', type: 'bytes32', indexed: false },
          { name: 'supply', type: 'uint256', indexed: false },
          { name: 'lockupDuration', type: 'uint256', indexed: false },
          { name: 'vestingDuration', type: 'uint256', indexed: false },
        ],
      },
      args: {
        token: clankerToken,
      },
      fromBlock,
      toBlock: 'latest',
    })

    if (logs.length === 0) {
      return null
    }

    const latestLog = logs[logs.length - 1]
    const { supply, lockupDuration } = latestLog.args as { supply: bigint; lockupDuration: bigint }
    const allocatedAmount = supply
    const lockupDurationHours = Number(lockupDuration) / 3600 // Convert seconds to hours

    const [multicallResults, block] = await Promise.all([
      publicClient.multicall({
        contracts: [
          {
            address: airdropAddress,
            abi: IClankerAirdrop,
            functionName: 'amountAvailableToClaim',
            args: [clankerToken, treasury, allocatedAmount],
          },
          {
            address: clankerToken,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [treasury],
          },
        ],
        allowFailure: false,
      }),
      publicClient.getBlock({ blockNumber: latestLog.blockNumber }),
    ])

    const [availableAmount, treasuryBalance] = multicallResults as [bigint, bigint]
    const deploymentTimestamp = Number(block.timestamp) * 1000

    if (availableAmount === 0n) {
      const isAlreadyClaimed = treasuryBalance >= allocatedAmount

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
