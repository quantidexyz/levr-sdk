import { Schema } from 'effect'

import { STAKING_REWARDS, STATIC_FEE_TIERS, TREASURY_AIRDROP_AMOUNTS } from '../constants'
import { EthereumAddress } from './base.schema'
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
  description: 'Amount to fund the treasury during deployment',
})

const LevrAirdrop = Schema.Array(
  Schema.Struct({
    amount: Schema.Number.annotations({
      description: 'Total airdrop amount',
    }),
    account: EthereumAddress.annotations({
      description: 'Account address',
    }),
  })
).annotations({
  description: 'Clanker token airdrop, bigger portian is reserved for the treasury',
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
      description: 'Admin address for recipient',
    }),
    recipient: EthereumAddress.annotations({
      description: 'Recipient address',
    }),
    percentage: Schema.Number.annotations({
      description: 'Percentage of rewards to recipient',
    }),
    token: Schema.Literal('Both', 'Paired', 'Clanker').annotations({
      description: 'Token type for rewards',
    }),
  })
).annotations({
  description: 'Reward recipient for the clanker token',
})

const LevrStakingReward = Schema.Literal(
  ...(Object.keys(STAKING_REWARDS) as [keyof typeof STAKING_REWARDS])
).annotations({
  description: 'The precentage that is distributed to the staking contract',
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
  ...ClankerDeploymentSchema.pick('name', 'symbol', 'image').fields,
  metadata: Schema.optional(LevrMetadata),
  devBuy: Schema.optional(LevrDevBuy),
  airdrop: Schema.optional(LevrAirdrop),
  treasuryFunding: TreasuryFunding,
  fees: LevrFees,
  stakingReward: Schema.optional(LevrStakingReward),
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
      // Get staking reward in basis points (default to 100% if not provided)
      const stakingRewardBps = STAKING_REWARDS[data.stakingReward ?? '100%']

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
