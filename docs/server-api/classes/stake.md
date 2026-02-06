# Stake Class

Manage staking operations including stake, unstake, claim, and accrue.

::: tip Protocol Fees
Staking and unstaking operations incur a variable protocol fee (set by Levr team) that is deducted from the amount.
:::

## Constructor

```typescript
import { Stake, getStaticProject, getProject } from 'levr-sdk'

// First get project data
const staticProject = await getStaticProject({
  publicClient,
  clankerToken: '0x...',
})

if (!staticProject?.isRegistered) {
  throw new Error('Project not registered')
}

const projectData = await getProject({
  publicClient,
  staticProject,
})

// Then create stake instance
const stake = new Stake({
  wallet: walletClient,
  publicClient,
  project: projectData,
})
```

## Methods

### `approve(amount)`

Approve tokens for staking.

```typescript
import { parseUnits } from 'viem'

const receipt = await stake.approve(parseUnits('1000', 18))
console.log('Approved:', receipt.transactionHash)
```

**Parameters:**

- `amount` (required): Amount to approve (bigint, string, or number)

**Returns:** `TransactionReceipt`

### `stake(amount)`

Stake tokens. Protocol fee is deducted from the amount.

```typescript
const receipt = await stake.stake(parseUnits('100', 18))
console.log('Staked:', receipt.transactionHash)
```

**Parameters:**

- `amount` (required): Amount to stake (bigint, string, or number)

**Returns:** `TransactionReceipt`

### `unstake(params)`

Unstake tokens. Protocol fee is deducted from the amount. Returns the user's new voting power after the unstake for UI simulation.

```typescript
const { receipt, newVotingPower } = await stake.unstake({
  amount: parseUnits('50', 18),
  to: '0x...', // Optional recipient
})
console.log('Unstaked:', receipt.transactionHash)
console.log('New voting power:', newVotingPower.toString())
```

**Parameters:**

- `amount` (required): Amount to unstake
- `to` (optional): Recipient address (defaults to sender)

**Returns:**

- `receipt`: Transaction receipt
- `newVotingPower`: User's voting power after the unstake (useful for showing impact in UI)

**Note:** Partial unstakes reduce your voting power proportionally. If you unstake 30% of your tokens, your time accumulation is reduced by 30%.

### `claimRewards(params?)`

Claim pending rewards.

```typescript
// Claim all rewards (token + paired token)
const receipt = await stake.claimRewards()

// Or claim specific tokens
const receipt = await stake.claimRewards({
  tokens: ['0x...'], // Array of token addresses
  to: '0x...', // Optional recipient (defaults to sender)
})

console.log('Claimed rewards:', receipt.transactionHash)
```

**Parameters:**

- `params` (optional): Claim configuration
  - `tokens` (optional): Array of token addresses to claim (defaults to [token, pairedToken])
  - `to` (optional): Recipient address (defaults to sender)

**Returns:** `TransactionReceipt`

### `accrueRewards(tokenAddress?)`

Manually accrue rewards for a specific token. Required before rewards can be claimed.

```typescript
const receipt = await stake.accrueRewards('0x...')
console.log('Accrued rewards:', receipt.transactionHash)
```

### `accrueAllRewards(params?)`

Accrue rewards for multiple tokens in a single transaction using forwarder multicall. Handles the complete flow: LP locker fee collection, fee locker claim, optional fee splitter distribution, and staking accrual.

```typescript
// Accrue all reward tokens (auto-detected)
const receipt = await stake.accrueAllRewards()
console.log('Accrued all rewards:', receipt.transactionHash)

// Or specify tokens and fee splitter usage
const receipt = await stake.accrueAllRewards({
  tokens: [projectData.token.address, pairedTokenAddress],
  useFeeSplitter: true, // Auto-detected if not provided
})
```

**Parameters:**

- `params` (optional): Accrual configuration
  - `tokens` (optional): Array of token addresses to accrue rewards for (defaults to [underlyingToken, pairedToken])
  - `useFeeSplitter` (optional): Whether to route through fee splitter (auto-detected from project data if not provided)

**Returns:** `TransactionReceipt`

**Note:** Requires `trustedForwarder` in project data for multicall support.

### `distributeFromFeeSplitter(params?)`

Distribute fees from the fee splitter to all configured receivers (including staking). Call this before `accrueRewards()` when fee splitter is configured.

```typescript
const receipt = await stake.distributeFromFeeSplitter()
console.log('Distributed from fee splitter:', receipt.transactionHash)

// Or specify specific tokens
const receipt = await stake.distributeFromFeeSplitter({
  tokens: [projectData.token.address],
})
```

**Parameters:**

- `params` (optional): Distribution configuration
  - `tokens` (optional): Array of token addresses to distribute (defaults to [underlyingToken, pairedToken])

**Returns:** `TransactionReceipt`

### `votingPowerOnUnstake(amount, userAddress?)`

Simulate voting power after an unstake (without executing).

```typescript
const result = await stake.votingPowerOnUnstake(
  parseUnits('100', 18),
  '0x...' // Optional: defaults to wallet address
)

console.log('New voting power:', result.formatted)
console.log('Token-days:', result.tokenDays.toString())
```

**Parameters:**

- `amount` (required): Amount to unstake (bigint, string, or number)
- `userAddress` (optional): User address (defaults to wallet address)

**Returns:**

```typescript
{
  tokenDays: bigint
  formatted: string
}
```

::: tip Manual Accrual System
Levr uses explicit reward accrual for security and predictability. You must call `accrueRewards()` or `accrueAllRewards()` before claiming to collect fees from the LP locker and update claimable rewards.
:::
