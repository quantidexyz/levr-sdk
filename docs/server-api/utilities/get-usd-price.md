# getUsdPrice()

Get USD price for any token paired with WETH.

## Usage

```typescript
import { getUsdPrice } from 'levr-sdk'

const { priceUsd, tokenPerWeth, wethPerUsdc } = await getUsdPrice({
  oraclePublicClient: mainnetClient, // For WETH/USDC
  quotePublicClient: baseClient, // For token/WETH
  tokenAddress: '0x...',
  tokenDecimals: 18, // Required: token decimals
  quoteFee: 3000, // Optional: default 3000
})

console.log('Token Price:', priceUsd, 'USD')
console.log('Token per WETH:', tokenPerWeth)
console.log('WETH per USDC:', wethPerUsdc)
```

## Parameters

- `oraclePublicClient` (required): Mainnet client for WETH/USDC oracle
- `quotePublicClient` (required): Chain client for token/WETH quote
- `tokenAddress` (required): Token to price
- `tokenDecimals` (required): Token decimals (e.g., 18 for most tokens, 6 for USDC)
- `quoteFee` (optional): Pool fee tier (default: 3000)

## Returns

```typescript
{
  priceUsd: string // e.g., "0.05"
  tokenPerWeth: string
  wethPerUsdc: string
}
```
