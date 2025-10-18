import { Schema } from 'effect'

import { STAKING_REWARDS, STATIC_FEE_TIERS, TREASURY_AIRDROP_AMOUNTS } from '../constants'
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
    amount: Schema.Number.annotations({
      description: 'Total airdrop amount in tokens',
    }),
    account: EthereumAddress.annotations({
      description: 'Account address to receive airdrop',
    }),
  })
).annotations({
  description:
    'Custom token airdrops at deployment. Combined with treasury funding, total cannot exceed 90% of supply (minimum 10% reserved for liquidity).',
})

const LevrDevBuy = Schema.Literal('0.1 ETH', '0.5 ETH', '1 ETH').annotations({
  description: 'Amount to buy during deployment',
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
      description: 'Percentage of total rewards allocated to this recipient (in basis points)',
    }),
    token: Schema.Literal('Both', 'Paired', 'Clanker').annotations({
      description:
        'Type of tokens to distribute: Both (paired token + clanker token), Paired (only paired token), or Clanker (only clanker token)',
    }),
  })
).annotations({
  description:
    'Custom reward recipients who receive a portion of the trading fees. Combined with staking rewards, total allocation cannot exceed 100%.',
})

const LevrStakingReward = Schema.Literal(
  ...(Object.keys(STAKING_REWARDS) as [keyof typeof STAKING_REWARDS])
).annotations({
  description:
    'Percentage of trading fees distributed to token stakers as rewards. Combined with custom reward recipients, total cannot exceed 100%.',
})

/**
 * Maximum allowed sum of treasury funding and airdrop amounts (90% of 100B tokens)
 */
const MAX_TOTAL_ALLOCATION = 90_000_000_000 // 90B tokens

/**
 * Maximum allowed sum of staking reward and rewards recipients
 */
const MAX_TOTAL_REWARDS = 10_000 // 100% of rewards are distributed to the staking contract

export const LevrClankerDeploymentSchema = Schema.Struct({
  ...ClankerDeploymentSchema.pick('name', 'symbol').fields,
  image: NonEmptyString('Image is required').annotations({
    description: 'Token image URL (IPFS or HTTP)',
  }),
  metadata: Schema.optional(LevrMetadata),
  devBuy: Schema.optional(LevrDevBuy),
  airdrop: Schema.optional(LevrAirdrop),
  treasuryFunding: TreasuryFunding,
  fees: LevrFees,
  stakingReward: LevrStakingReward,
  rewards: Schema.optional(LevrRewardRecipients),
}).pipe(
  Schema.filter(
    (data) => {
      // Calculate total airdrop amount
      const airdropTotal = data.airdrop?.reduce((sum, entry) => sum + entry.amount, 0) ?? 0

      // Get treasury funding (default to 0 if not provided)
      const treasuryAmount = TREASURY_AIRDROP_AMOUNTS[data.treasuryFunding ?? '30%']

      // Check if the sum exceeds the maximum allocation
      const total = airdropTotal + treasuryAmount

      return total <= MAX_TOTAL_ALLOCATION
    },
    {
      message: () =>
        `Total allocation (airdrop + treasury funding) cannot exceed ${MAX_TOTAL_ALLOCATION.toLocaleString()} tokens (90% of 100B)`,
    }
  ),
  Schema.filter(
    (data) => {
      // Get staking reward in basis points
      const stakingRewardBps = STAKING_REWARDS[data.stakingReward]

      // Calculate total rewards recipients percentage
      const rewardRecipientsTotal =
        data.rewards?.reduce((sum, entry) => sum + entry.percentage, 0) ?? 0

      // Check if the sum exceeds 100% (10,000 basis points)
      const totalRewards = stakingRewardBps + rewardRecipientsTotal

      return totalRewards <= MAX_TOTAL_REWARDS
    },
    {
      message: () =>
        `Total rewards (staking reward + reward recipients) cannot exceed 100% (${MAX_TOTAL_REWARDS.toLocaleString()} basis points)`,
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
