# Constants

Useful constants exported by the SDK.

## Usage

```typescript
import { UNISWAP_V3_QUOTER_V2, WETH, GET_USDC_ADDRESS, LEVR_FACTORY_V1 } from 'levr-sdk'

// Get addresses by chain ID
const quoter = UNISWAP_V3_QUOTER_V2(8453) // Base
const weth = WETH(8453)
const usdc = GET_USDC_ADDRESS(8453)
const factory = LEVR_FACTORY_V1(8453)
```

## Available Constants

### `UNISWAP_V3_QUOTER_V2(chainId)`

Returns the Uniswap V3 Quoter V2 address for the given chain.

### `WETH(chainId)`

Returns WETH token data (address, decimals, etc.) for the given chain.

### `GET_USDC_ADDRESS(chainId)`

Returns the USDC token address for the given chain.

### `LEVR_FACTORY_V1(chainId)`

Returns the Levr Factory V1 address for the given chain.
