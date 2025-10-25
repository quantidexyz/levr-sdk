# Constants

Useful constants and address getters exported by the SDK.

## Usage

```typescript
import {
  UNISWAP_V3_QUOTER_V2,
  UNISWAP_V4_QUOTER,
  UNISWAP_V4_UNIVERSAL_ROUTER,
  UNISWAP_V4_PERMIT2,
  UNISWAP_V4_STATE_VIEW,
  WETH,
  GET_USDC_ADDRESS,
  GET_FACTORY_ADDRESS,
  GET_LP_LOCKER_ADDRESS,
  GET_FEE_SPLITTER_ADDRESS,
  GET_CLANKER_FACTORY_ADDRESS,
  GET_CLANKER_AIRDROP_ADDRESS,
} from 'levr-sdk'

// Get addresses by chain ID
const quoter = UNISWAP_V4_QUOTER(8453) // Base
const weth = WETH(8453)
const usdc = GET_USDC_ADDRESS(8453)
const factory = GET_FACTORY_ADDRESS(8453)
```

## Levr Contracts

### `GET_FACTORY_ADDRESS(chainId)`

Returns the Levr Factory V1 address for the given chain.

### `GET_LP_LOCKER_ADDRESS(chainId)`

Returns the Clanker LP Locker address for the given chain.

### `GET_FEE_SPLITTER_FACTORY_ADDRESS(chainId)`

Returns the Levr Fee Splitter Factory V1 address for the given chain. Used for deploying fee splitters to split trading fees among multiple recipients.

```typescript
const splitterFactory = GET_FEE_SPLITTER_FACTORY_ADDRESS(8453) // Base
// '0xa21a487C3234bc1A6254299B348DcC2364C85fd6' - Fee splitter factory address (Base Sepolia)
```

### `GET_VAULT_ADDRESS(chainId)`

Returns the Clanker Vault contract address for the given chain. Used for token vesting and lockup.

```typescript
const vault = GET_VAULT_ADDRESS(8453) // Base
// '0x...' - Vault contract address
```

## Clanker Contracts

### `GET_CLANKER_FACTORY_ADDRESS(chainId)`

Returns the Clanker Factory address for the given chain.

### `GET_CLANKER_AIRDROP_ADDRESS(chainId)`

Returns the Clanker Airdrop contract address for the given chain.

## Uniswap V4 Contracts

### `UNISWAP_V4_QUOTER(chainId)`

Returns the Uniswap V4 Quoter address for the given chain.

### `UNISWAP_V4_UNIVERSAL_ROUTER(chainId)`

Returns the Uniswap V4 Universal Router address for the given chain.

### `UNISWAP_V4_PERMIT2(chainId)`

Returns the Permit2 contract address for the given chain.

### `UNISWAP_V4_STATE_VIEW(chainId)`

Returns the StateView contract address for the given chain (for reading pool state).

### `UNISWAP_V4_POOL_MANAGER(chainId)`

Returns the Pool Manager contract address for the given chain.

## Uniswap V3 Contracts

### `UNISWAP_V3_QUOTER_V2(chainId)`

Returns the Uniswap V3 Quoter V2 address for the given chain.

## Token Addresses

### `WETH(chainId)`

Returns WETH token data (address, decimals, name, symbol) for the given chain.

```typescript
const weth = WETH(8453)
// {
//   address: '0x4200000000000000000000000000000000000006',
//   decimals: 18,
//   symbol: 'WETH',
//   name: 'Wrapped Ether'
// }
```

### `GET_USDC_ADDRESS(chainId)`

Returns the USDC token address for the given chain.

## Other Constants

### `TREASURY_AIRDROP_AMOUNTS`

Treasury airdrop amount presets:

```typescript
{
  '30%': 30_000_000_000,
  '40%': 40_000_000_000,
  '50%': 50_000_000_000,
  '60%': 60_000_000_000,
  '70%': 70_000_000_000,
  '80%': 80_000_000_000,
  '90%': 90_000_000_000,
}
```

### `STAKING_REWARDS`

Staking reward percentages in basis points:

```typescript
{
  '100%': 10_000,
  '90%': 9_000,
  '80%': 8_000,
  '70%': 7_000,
}
```

### `STATIC_FEE_TIERS`

Static fee tier presets in basis points:

```typescript
{
  '1%': 100,
  '2%': 200,
  '3%': 300,
}
```

### `VAULT_LOCKUP_PERIODS`

Vault lockup period options in days:

```typescript
{
  '30 days': 30,
  '90 days': 90,
  '180 days': 180,
}
```

### `VAULT_VESTING_PERIODS`

Vault vesting period options in days:

```typescript
{
  instant: 0,
  '30 days': 30,
  '180 days': 180,
}
```

### `VAULT_PERCENTAGES`

Vault allocation percentage options:

```typescript
{
  '5%': 5,
  '10%': 10,
  '15%': 15,
  '20%': 20,
  '25%': 25,
  '30%': 30,
}
```
