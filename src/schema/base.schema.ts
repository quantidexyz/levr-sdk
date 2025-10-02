import { Schema } from 'effect'

export const NonEmptyString = (message: string) =>
  Schema.String.pipe(Schema.nonEmptyString({ description: message })).annotations({
    description: 'Non-empty string value',
  })

export const UrlString = Schema.String.pipe(Schema.pattern(/^\w+:\/\/.+/)).annotations({
  description: 'URL string (http(s), ipfs, etc.)',
})

export const EthereumAddress = Schema.String.pipe(
  Schema.pattern(/^0x[a-fA-F0-9]{40}$/)
).annotations({
  description: 'Ethereum address (0x...)',
}) as Schema.Schema<`0x${string}`, `0x${string}`>
