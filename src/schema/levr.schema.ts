import { Schema } from 'effect'

import {
  LEVR_TEAM_LP_FEE_PERCENTAGE,
  STAKING_REWARDS,
  STATIC_FEE_TIERS,
  TREASURY_AIRDROP_AMOUNTS,
  VAULT_LOCKUP_PERIODS,
  VAULT_PERCENTAGES,
  VAULT_VESTING_PERIODS,
} from '../constants'
import { EthereumAddress, NonEmptyString } from './base.schema'
import { ClankerDeploymentSchema } from './clanker.schema'

const LevrMetadata = Schema.Struct({
  description: Schema.optional(Schema.String).annotations({
    description: 'Clanker token description',
  }),
  telegramLink: Schema.optional(Schema.String).annotations({
    description: 'Telegram link for the project',
  }),
  websiteLink: Schema.optional(Schema.String).annotations({
    description: 'Website link for the project',
  }),
  xLink: Schema.optional(Schema.String).annotations({
    description: 'X link for the project',
  }),
  farcasterLink: Schema.optional(Schema.String).annotations({
    description: 'Farcaster link for the project',
  }),
}).annotations({
  description: 'Clanker token metadata',
})

const TreasuryFunding = Schema.Literal(
  ...(Object.keys(TREASURY_AIRDROP_AMOUNTS) as [keyof typeof TREASURY_AIRDROP_AMOUNTS])
).annotations({
  description:
    'Percentage of total token supply (100B tokens) allocated to the treasury at deployment. Combined with custom airdrops, maximum 90% can be allocated (minimum 10% reserved for liquidity). Any remaining tokens are sent to liquidity.',
})

const LevrAirdrop = Schema.Array(
  Schema.Struct({
    percentage: Schema.Number.annotations({
      description:
        'Percentage of total token supply allocated to this recipient (0-100, e.g., 5 for 5%)',
    }),
    account: EthereumAddress.annotations({
      description: 'Account address to receive airdrop',
    }),
  })
).annotations({
  description:
    'Custom token airdrops at deployment. Each recipient receives a percentage of the total 100B supply. Combined with treasury funding, total cannot exceed 90% of supply (minimum 10% reserved for liquidity).',
})

/**
 * Dev buy amount as a string (e.g., '0.1 ETH', '0.5 BNB')
 * The actual options are controlled by the UI based on chain
 */
const LevrDevBuy = Schema.String.annotations({
  description: 'Amount of native currency to spend on dev buy (e.g., "0.1 ETH", "0.5 BNB")',
})

/**
 * Paired token as a string (e.g., 'ETH', 'USDC', 'BNB')
 * The actual options are controlled by the UI based on chain
 */
const LevrPairedToken = Schema.String.annotations({
  description:
    'Token to pair the clanker with. Native tokens use V4 pool (recommended), stablecoins use V3 pool for routing.',
})

const LevrStaticFeeTier = Schema.Literal(
  ...(Object.keys(STATIC_FEE_TIERS) as [keyof typeof STATIC_FEE_TIERS])
).annotations({
  description: 'Fee tier for the static fee',
})

const LevrStaticFee = Schema.Struct({
  type: Schema.Literal('static'),
  feeTier: LevrStaticFeeTier,
}).annotations({
  description: "Fees don't fluctuate",
})

const LevrDynamicFee = Schema.Struct({
  type: Schema.Literal('dynamic 3%'),
}).annotations({
  description: 'Fees fluctuate based on market conditions',
})

const LevrFees = Schema.Union(LevrStaticFee, LevrDynamicFee).annotations({
  description: 'Fees for the clanker token',
})

const LevrRewardRecipients = Schema.Array(
  Schema.Struct({
    admin: EthereumAddress.annotations({
      description: 'Admin address who can manage this reward recipient configuration',
    }),
    recipient: EthereumAddress.annotations({
      description: 'Address that will receive the allocated reward tokens',
    }),
    percentage: Schema.Number.annotations({
      description:
        'Percentage of total rewards allocated to this recipient (0-100, e.g., 5 for 5%)',
    }),
    token: Schema.Literal('Both', 'Paired', 'Clanker').annotations({
      description:
        'Type of tokens to distribute: Both (paired token + clanker token), Paired (only paired token), or Clanker (only clanker token)',
    }),
  })
).annotations({
  description:
    'Custom reward recipients who receive a portion of the trading fees. Combined with staking rewards, total must equal 100%.',
})

const LevrStakingReward = Schema.Literal(
  ...(Object.keys(STAKING_REWARDS) as [keyof typeof STAKING_REWARDS])
).annotations({
  description: `Percentage of trading fees distributed to token stakers as rewards. Note: ${LEVR_TEAM_LP_FEE_PERCENTAGE}% is automatically allocated to Levr Protocol (deducted from this amount). Combined with custom reward recipients, total must equal 100%.`,
})

/**
 * Maximum allowed sum of staking reward and rewards recipients (as percentages 0-100)
 */
const MAX_TOTAL_REWARDS_PERCENTAGE = 100

/**
 * Maximum percentage of the total supply that can be allocated outside liquidity
 */
const MAX_NON_LIQUIDITY_ALLOCATION_PERCENTAGE = 90

/**
 * Total token supply expressed as percentage for readability (100%)
 */
const TOTAL_SUPPLY_PERCENTAGE = 100

/**
 * Vault lockup period schema
 */
const VaultLockupPeriod = Schema.Literal(
  ...(Object.keys(VAULT_LOCKUP_PERIODS) as [keyof typeof VAULT_LOCKUP_PERIODS])
).annotations({
  description: 'Lockup period for vaulted tokens. Tokens cannot be claimed during this period.',
})

/**
 * Vault vesting period schema
 */
const VaultVestingPeriod = Schema.Literal(
  ...(Object.keys(VAULT_VESTING_PERIODS) as [keyof typeof VAULT_VESTING_PERIODS])
).annotations({
  description:
    'Vesting period after lockup ends. "instant" makes tokens available immediately after lockup. Linear vesting occurs between end of lockup and end of vesting period.',
})

/**
 * Vault percentage schema
 */
const VaultPercentage = Schema.Literal(
  ...(Object.keys(VAULT_PERCENTAGES) as [keyof typeof VAULT_PERCENTAGES])
).annotations({
  description: 'Percentage of total token supply (100B tokens) allocated to vault.',
})

/**
 * Vault configuration schema
 */
const LevrVault = Schema.Struct({
  lockupPeriod: VaultLockupPeriod.annotations({
    description: 'How long tokens are locked before vesting begins',
  }),
  vestingPeriod: VaultVestingPeriod.annotations({
    description: 'Vesting duration after lockup. "instant" = no vesting period',
  }),
  percentage: VaultPercentage.annotations({
    description: 'Percentage of total supply to allocate to vault',
  }),
}).annotations({
  description: 'Vault configuration with lockup and linear vesting schedule',
})

export const LevrClankerDeploymentSchema = Schema.Struct({
  ...ClankerDeploymentSchema.pick('name', 'symbol').fields,
  image: NonEmptyString('Image is required').annotations({
    description: 'Token image URL (IPFS or HTTP)',
  }),
  metadata: Schema.optional(LevrMetadata),
  pairedToken: LevrPairedToken.annotations({
    description:
      'Token to pair with. Native tokens use V4 pool (default), stablecoins use V3 pool.',
  }),
  devBuy: Schema.optional(LevrDevBuy),
  airdrop: Schema.optional(LevrAirdrop),
  vault: Schema.optional(LevrVault),
  treasuryFunding: TreasuryFunding,
  fees: LevrFees,
  stakingReward: LevrStakingReward,
  rewards: Schema.optional(LevrRewardRecipients),
}).pipe(
  Schema.filter(
    (data) => {
      const { totalAllocatedPercentage } = calculateAllocationBreakdown(data, {
        fallbackTreasuryPercentage: 30,
      })

      // Check if total allocation exceeds 90% (must leave minimum 10% for liquidity)
      return totalAllocatedPercentage <= MAX_NON_LIQUIDITY_ALLOCATION_PERCENTAGE
    },
    {
      message: () =>
        `Total allocation (airdrop + vault + treasury funding) cannot exceed ${MAX_NON_LIQUIDITY_ALLOCATION_PERCENTAGE}% (minimum 10% must be reserved for liquidity)`,
    }
  ),
  Schema.filter(
    (data) => {
      // Convert staking reward from percentage string (e.g., "100%") to number (e.g., 100)
      const stakingRewardPercentageStr = data.stakingReward // e.g., "100%"
      const stakingRewardPercentage = parseFloat(stakingRewardPercentageStr) // e.g., 100

      // Calculate total rewards recipients percentage (already in 0-100 format)
      const rewardRecipientsTotal =
        data.rewards?.reduce((sum, entry) => sum + entry.percentage, 0) ?? 0

      // Check if the sum equals 100%
      // Note: Team fee is deducted automatically from staking rewards on the backend
      const totalRewards = stakingRewardPercentage + rewardRecipientsTotal

      return totalRewards === MAX_TOTAL_REWARDS_PERCENTAGE
    },
    {
      message: () =>
        `Total rewards (staking reward + reward recipients) must equal 100%. Note: ${LEVR_TEAM_LP_FEE_PERCENTAGE}% Levr Protocol fee is automatically deducted from staking rewards.`,
    }
  )
)

export type LevrClankerDeploymentSchemaType = typeof LevrClankerDeploymentSchema.Type

// ---
// Fee Splitter Configuration Schema

const LevrSplitConfig = Schema.Struct({
  receiver: EthereumAddress.annotations({
    description: 'Receiver address for this split',
  }),
  percentage: Schema.Number.annotations({
    description: 'Percentage of fees (must total 100%)',
  }),
}).annotations({
  description: 'Fee split configuration',
})

export const LevrFeeSplitterConfigSchema = Schema.Struct({
  splits: Schema.Array(LevrSplitConfig).annotations({
    description:
      'Fee split recipients and percentages. By default, the first receiver is the staking allocation.',
  }),
}).pipe(
  Schema.filter(
    (data) => {
      const total = data.splits.reduce((sum, split) => sum + split.percentage, 0)
      return total === 100
    },
    {
      message: () => 'Total split percentages must equal 100%',
    }
  ),
  Schema.filter(
    (data) => {
      return data.splits.length > 0 && data.splits.length <= 10
    },
    {
      message: () => 'Must have 1-10 fee receivers',
    }
  )
)

export type LevrFeeSplitterConfigSchemaType = typeof LevrFeeSplitterConfigSchema.Type

export type SupplyAllocationInput = Partial<
  Pick<LevrClankerDeploymentSchemaType, 'airdrop' | 'vault' | 'treasuryFunding'>
>

export type SupplyAllocationBreakdown = {
  airdropPercentage: number
  treasuryPercentage: number
  vaultPercentage: number
  totalAllocatedPercentage: number
  liquidityPercentage: number
}

export type CalculateAllocationBreakdownOptions = {
  /**
   * Percentage used when treasury allocation is undefined (defaults to 0 to avoid inflating totals)
   */
  fallbackTreasuryPercentage?: number
}

/**
 * @description Calculates how the total token supply is allocated between treasury, vault, airdrop, and liquidity
 * @param {SupplyAllocationInput} data - Deployment configuration containing allocation fields
 * @param {CalculateAllocationBreakdownOptions} options - Optional overrides for calculation defaults
 * @returns {SupplyAllocationBreakdown} Breakdown of allocations including the implied liquidity percentage
 */
export function calculateAllocationBreakdown(
  data?: SupplyAllocationInput,
  options: CalculateAllocationBreakdownOptions = {}
): SupplyAllocationBreakdown {
  const fallbackTreasuryPercentage = options.fallbackTreasuryPercentage ?? 0

  const airdropPercentage =
    data?.airdrop?.reduce((sum, entry) => sum + (entry?.percentage ?? 0), 0) ?? 0

  const treasuryPercentage =
    data?.treasuryFunding !== undefined
      ? parseFloat(data.treasuryFunding)
      : fallbackTreasuryPercentage

  const vaultPercentage =
    data?.vault?.percentage !== undefined ? parseFloat(data.vault.percentage) : 0

  const totalAllocatedPercentage = airdropPercentage + treasuryPercentage + vaultPercentage

  const liquidityPercentage = Number(
    Math.max(0, TOTAL_SUPPLY_PERCENTAGE - totalAllocatedPercentage).toFixed(4)
  )

  return {
    airdropPercentage,
    treasuryPercentage,
    vaultPercentage,
    totalAllocatedPercentage,
    liquidityPercentage,
  }
}
