import { Schema } from 'effect'

import { TREASURY_AIRDROP_AMOUNTS } from '../constants'
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

/**
 * Maximum allowed sum of treasury funding and airdrop amounts (90% of 100B tokens)
 */
const MAX_TOTAL_ALLOCATION = 90_000_000_000 // 90B tokens

export const LevrClankerDeploymentSchema = Schema.Struct({
  ...ClankerDeploymentSchema.pick('name', 'symbol', 'image').fields,
  metadata: Schema.optional(LevrMetadata),
  devBuy: Schema.optional(LevrDevBuy),
  airdrop: Schema.optional(LevrAirdrop),
  treasuryFunding: Schema.optional(TreasuryFunding),
}).pipe(
  Schema.filter(
    (data) => {
      // Calculate total airdrop amount
      const airdropTotal = data.airdrop?.reduce((sum, entry) => sum + entry.amount, 0) ?? 0

      // Get treasury funding (default to 0 if not provided)
      const treasuryAmount = TREASURY_AIRDROP_AMOUNTS[data.treasuryFunding ?? '30B']

      // Check if the sum exceeds the maximum allocation
      const total = airdropTotal + treasuryAmount

      return total <= MAX_TOTAL_ALLOCATION
    },
    {
      message: () =>
        `Total allocation (airdrop + treasury funding) cannot exceed ${MAX_TOTAL_ALLOCATION.toLocaleString()} tokens (90% of 100B)`,
    }
  )
)

export type LevrClankerDeploymentSchemaType = typeof LevrClankerDeploymentSchema.Type
