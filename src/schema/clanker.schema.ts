import { Schema } from 'effect'

import { EthereumAddress, NonEmptyString, UrlString } from './base.schema'

const SocialLink = Schema.Struct({
  platform: NonEmptyString('Platform is required'),
  url: UrlString,
})
  .annotations({ description: 'Social media link entry' })
  .pipe(Schema.mutable)

export const Metadata = Schema.Struct({
  description: Schema.optional(Schema.String),
  socialMediaUrls: Schema.optional(Schema.Array(SocialLink).pipe(Schema.mutable)),
  auditUrls: Schema.optional(Schema.Array(UrlString).pipe(Schema.mutable)),
}).annotations({ description: 'Token metadata (SDK-compatible)' })

const Context = Schema.Struct({
  interface: Schema.optional(Schema.String),
  platform: Schema.optional(Schema.String),
  messageId: Schema.optional(Schema.String),
  id: Schema.optional(Schema.String),
})
  .annotations({ description: 'Social provenance for the token' })
  .pipe(Schema.mutable)

const PoolPosition = Schema.Struct({
  tickLower: Schema.Number.annotations({
    description: 'Lower tick boundary',
  }),
  tickUpper: Schema.Number.annotations({
    description: 'Upper tick boundary',
  }),
  positionBps: Schema.Number.annotations({
    description: 'Position size in basis points',
  }),
})
  .annotations({ description: 'Pool position configuration' })
  .pipe(Schema.mutable)

const Pool = Schema.Struct({
  pairedToken: Schema.optional(Schema.Union(Schema.Literal('WETH'), EthereumAddress)),
  tickIfToken0IsClanker: Schema.optional(Schema.Number),
  tickSpacing: Schema.optional(Schema.Number),
  positions: Schema.Array(PoolPosition).pipe(Schema.mutable).annotations({
    description: 'Pool liquidity positions',
  }),
})
  .annotations({ description: 'Pool configuration' })
  .pipe(Schema.mutable)

const Locker = Schema.Struct({
  locker: Schema.Union(Schema.Literal('Locker'), EthereumAddress).annotations({
    description: "Locker contract address or 'Locker'",
  }),
  lockerData: Schema.optional(EthereumAddress),
})
  .annotations({ description: 'Token locker configuration' })
  .pipe(Schema.mutable)

const Vault = Schema.Struct({
  percentage: Schema.Number.annotations({
    description: 'Percentage of tokens to vault (0-100)',
  }),
  lockupDuration: Schema.Number.annotations({
    description: 'Lockup duration in seconds',
  }),
  vestingDuration: Schema.optional(Schema.Number),
  recipient: Schema.optional(EthereumAddress),
})
  .annotations({ description: 'Token vault configuration' })
  .pipe(Schema.mutable)

const Airdrop = Schema.Struct({
  admin: Schema.optional(EthereumAddress),
  merkleRoot: EthereumAddress.annotations({
    description: 'Merkle root for airdrop claims',
  }),
  lockupDuration: Schema.Number.annotations({
    description: 'Lockup duration in seconds',
  }),
  vestingDuration: Schema.optional(Schema.Number),
  amount: Schema.Number.annotations({
    description: 'Total airdrop amount',
  }),
})
  .annotations({ description: 'Token airdrop configuration' })
  .pipe(Schema.mutable)

const PoolKey = Schema.Struct({
  currency0: EthereumAddress,
  currency1: EthereumAddress,
  fee: Schema.Number.annotations({
    description: 'Pool fee in basis points',
  }),
  tickSpacing: Schema.Number.annotations({
    description: 'Tick spacing',
  }),
  hooks: EthereumAddress,
})
  .annotations({ description: 'Uniswap V4 pool key' })
  .pipe(Schema.mutable)

export const DevBuy = Schema.Struct({
  ethAmount: Schema.Number.annotations({
    description: 'ETH amount for dev buy',
  }),
  poolKey: Schema.optional(PoolKey),
  amountOutMin: Schema.optional(Schema.Number),
}).annotations({
  description: 'Developer token buy configuration',
})

const StaticFees = Schema.Struct({
  type: Schema.optional(Schema.Literal('static')),
  clankerFee: Schema.Number.annotations({
    description: 'Clanker token fee in basis points',
  }),
  pairedFee: Schema.Number.annotations({
    description: 'Paired token fee in basis points',
  }),
})
  .annotations({ description: 'Static fee configuration' })
  .pipe(Schema.mutable)

const DynamicFees = Schema.Struct({
  type: Schema.optional(Schema.Literal('dynamic')),
  baseFee: Schema.Number.annotations({
    description: 'Base fee in basis points',
  }),
  maxFee: Schema.Number.annotations({
    description: 'Maximum fee in basis points',
  }),
  referenceTickFilterPeriod: Schema.Number.annotations({
    description: 'Reference tick filter period',
  }),
  resetPeriod: Schema.Number.annotations({
    description: 'Reset period',
  }),
  resetTickFilter: Schema.Number.annotations({
    description: 'Reset tick filter',
  }),
  feeControlNumerator: Schema.Number.annotations({
    description: 'Fee control numerator',
  }),
  decayFilterBps: Schema.Number.annotations({
    description: 'Decay filter in basis points',
  }),
})
  .annotations({ description: 'Dynamic fee configuration' })
  .pipe(Schema.mutable)

const Fees = Schema.Union(StaticFees, DynamicFees)
  .annotations({
    description: 'Fee structure configuration',
  })
  .pipe(Schema.mutable)

const RewardRecipient = Schema.Struct({
  admin: EthereumAddress.annotations({
    description: 'Admin address for recipient',
  }),
  recipient: EthereumAddress.annotations({
    description: 'Recipient address',
  }),
  bps: Schema.Number.annotations({
    description: 'Reward share in basis points',
  }),
  token: Schema.Union(
    Schema.Literal('Both'),
    Schema.Literal('Paired'),
    Schema.Literal('Clanker')
  ).annotations({
    description: 'Token type for rewards',
  }),
})
  .annotations({ description: 'Reward recipient configuration' })
  .pipe(Schema.mutable)

const Rewards = Schema.Struct({
  recipients: Schema.Array(RewardRecipient).pipe(Schema.mutable).annotations({
    description: 'List of reward recipients',
  }),
})
  .annotations({ description: 'Rewards configuration' })
  .pipe(Schema.mutable)

// Full schema for complete deployment configuration
export const ClankerDeploymentSchema = Schema.Struct({
  name: NonEmptyString('Name is required').annotations({
    description: 'Token name',
  }),
  symbol: NonEmptyString('Symbol is required').annotations({
    description: 'Token symbol (ticker)',
  }),
  image: Schema.optional(Schema.String),
  chainId: Schema.optional(Schema.Number),
  tokenAdmin: EthereumAddress.annotations({
    description: 'Token admin address',
  }),
  vanity: Schema.optional(Schema.Boolean),
  metadata: Schema.optional(Metadata),
  context: Schema.optional(Context),
  pool: Schema.optional(Pool),
  locker: Schema.optional(Locker),
  vault: Schema.optional(Vault),
  airdrop: Schema.optional(Airdrop),
  devBuy: Schema.optional(DevBuy),
  fees: Schema.optional(Fees),
  rewards: Schema.optional(Rewards),
}).annotations({ description: 'Full Clanker v4 deploy config' })

export type ClankerDeploymentSchemaType = typeof ClankerDeploymentSchema.Type
