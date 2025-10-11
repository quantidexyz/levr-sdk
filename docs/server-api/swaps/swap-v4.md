# swapV4()

Execute a swap on Uniswap V4.

## Usage

```typescript
import { swapV4 } from 'levr-sdk'

const receipt = await swapV4({
  publicClient,
  wallet: walletClient,
  poolKey,
  zeroForOne: true,
  amountIn: parseUnits('100', 18),
  amountOutMinimum: parseUnits('95', 18), // With slippage
})

console.log('Swapped:', receipt.transactionHash)
```

## Parameters

- `publicClient` (required): Viem public client
- `wallet` (required): Viem wallet client
- `poolKey` (required): Uniswap V4 pool key
- `zeroForOne` (required): Swap direction
- `amountIn` (required): Amount to swap
- `amountOutMinimum` (required): Minimum amount out (slippage protection)
