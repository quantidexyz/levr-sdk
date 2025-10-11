# Stake Class

Manage staking operations.

::: tip Protocol Fees
Staking and unstaking operations incur a variable protocol fee (set by Levr team) that is deducted from the amount.
:::

## Constructor

```typescript
import { Stake } from 'levr-sdk'

const stake = new Stake({
  wallet: walletClient,
  publicClient,
  stakingAddress: '0x...',
  tokenAddress: '0x...',
  tokenDecimals: 18,
  trustedForwarder: '0x...',
})
```

## Methods

### `getAllowance()`

Get the current token allowance for staking.

```typescript
const allowance = await stake.getAllowance()
console.log('Allowance:', formatUnits(allowance, 18))
```

### `approve(amount)`

Approve tokens for staking.

```typescript
const receipt = await stake.approve(parseUnits('1000', 18))
console.log('Approved:', receipt.transactionHash)
```

### `getPoolData()`

Get pool-level staking data.

```typescript
const poolData = await stake.getPoolData()
console.log('Total Staked:', formatUnits(poolData.totalStaked, 18))
console.log('Total Supply:', formatUnits(poolData.totalSupply, 18))
```

**Returns:**

```typescript
{
  totalStaked: bigint
  totalSupply: bigint
}
```

### `getUserData()`

Get user-specific staking data.

```typescript
const userData = await stake.getUserData()
console.log('Staked:', formatUnits(userData.stakedBalance, 18))
console.log('Pending Rewards:', userData.pendingRewards)
```

**Returns:**

```typescript
{
  stakedBalance: bigint
  pendingRewards: { [tokenAddress: string]: bigint }
}
```

### `getWethRewardRate(config)`

Get WETH reward rate and APR.

```typescript
const poolData = await stake.getPoolData()

const rewardData = await stake.getWethRewardRate({
  totalStaked: poolData.totalStaked,
  pricing: { wethUsd: '2543.21', tokenUsd: '0.05' }, // Optional
})

console.log('APR:', (Number(rewardData.aprBps) / 100).toFixed(2), '%')
console.log('Reward Rate:', formatUnits(rewardData.rewardRate, 18), 'WETH/second')
```

**Parameters:**

- `totalStaked` (required): Total staked amount
- `pricing` (optional): USD pricing for APR calculation

**Returns:**

```typescript
{
  rewardRate: bigint
  aprBps: bigint // APR in basis points (e.g., 1500 = 15%)
}
```

### `stake(amount)`

Stake tokens. Protocol fee is deducted from the amount.

```typescript
const receipt = await stake.stake(parseUnits('100', 18))
console.log('Staked:', receipt.transactionHash)
```

### `unstake(params)`

Unstake tokens. Protocol fee is deducted from the amount.

```typescript
const receipt = await stake.unstake({
  amount: parseUnits('50', 18),
  to: '0x...', // Optional recipient
})
console.log('Unstaked:', receipt.transactionHash)
```

**Parameters:**

- `amount` (required): Amount to unstake
- `to` (optional): Recipient address (defaults to sender)

### `claimRewards()`

Claim all pending rewards.

```typescript
const receipt = await stake.claimRewards()
console.log('Claimed rewards:', receipt.transactionHash)
```

### `accrueRewards(tokenAddress)`

Manually accrue rewards for a specific token. Required before rewards can be claimed.

```typescript
const receipt = await stake.accrueRewards('0x...')
console.log('Accrued rewards:', receipt.transactionHash)
```

### `accrueAllRewards()`

Manually accrue rewards for all tokens. Required before rewards can be claimed.

```typescript
const receipt = await stake.accrueAllRewards()
console.log('Accrued all rewards:', receipt.transactionHash)
```

::: tip Manual Accrual System
Levr uses explicit reward accrual for security and predictability. You must call `accrueRewards()` or `accrueAllRewards()` before claiming to update pending rewards from trading fees.
:::
