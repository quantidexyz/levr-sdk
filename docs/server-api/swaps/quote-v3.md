# quoteV3()

Get a swap quote on Uniswap V3.

## Usage

```typescript
import { quoteV3, UNISWAP_V3_QUOTER_V2, WETH, GET_USDC_ADDRESS } from 'levr-sdk'
import { base } from 'viem/chains'

const chainId = base.id
const quoterAddress = UNISWAP_V3_QUOTER_V2(chainId)
const wethData = WETH(chainId)
const usdcAddress = GET_USDC_ADDRESS(chainId)

const quote = await quoteV3({
  publicClient,
  quoterAddress,
  tokenIn: wethData.address,
  tokenOut: usdcAddress,
  amountIn: parseUnits('1', 18),
  fee: 3000, // 0.3%
})

console.log('Amount Out:', formatUnits(quote.amountOut, 6))
console.log('Gas Estimate:', quote.gasEstimate.toString())
```

## Parameters

- `publicClient` (required): Viem public client
- `quoterAddress` (required): V3 Quoter V2 address
- `tokenIn` (required): Input token address
- `tokenOut` (required): Output token address
- `amountIn` (required): Amount to swap
- `fee` (required): Pool fee tier (500, 3000, or 10000)

## Returns

```typescript
{
  amountOut: bigint
  gasEstimate: bigint
}
```
