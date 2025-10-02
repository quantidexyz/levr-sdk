import { Schema } from 'effect'

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

export const LevrClankerDeploymentSchema = Schema.Struct({
  ...ClankerDeploymentSchema.pick('name', 'symbol', 'image').fields,
  metadata: Schema.optional(LevrMetadata),
  devBuy: Schema.optional(LevrDevBuy),
  airdrop: Schema.optional(LevrAirdrop),
})

export type LevrClankerDeploymentSchemaType = typeof LevrClankerDeploymentSchema.Type
