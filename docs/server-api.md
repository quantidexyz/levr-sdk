# Server API

Complete reference for server-side APIs provided by Levr SDK.

## Query Functions

### `project()`

Get complete project data including token info, contracts, pool details, and optional USD pricing.

```typescript
import { project } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base, mainnet } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const oracleClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

const projectData = await project({
  publicClient,
  factoryAddress: '0x...',
  clankerToken: '0x...',
  oraclePublicClient: oracleClient, // Optional: for USD pricing
})

console.log('Token:', projectData.token.name)
console.log(
  'Treasury Balance:',
  projectData.treasuryStats.balance.formatted,
  projectData.token.symbol
)
console.log('Token Price:', projectData.pricing?.tokenUsd, 'USD')
```

**Parameters:**

- `publicClient` (required): Viem public client
- `factoryAddress` (required): Levr factory contract address
- `clankerToken` (required): Clanker token address
- `oraclePublicClient` (optional): Mainnet client for USD pricing

**Returns:**

```typescript
{
  token: {
    address: `0x${string}`
    name: string
    symbol: string
    decimals: number
  }
  weth: `0x${string}`
  staking: `0x${string}`
  governor: `0x${string}`
  treasury: `0x${string}`
  forwarder: `0x${string}`
  poolKey: {
    currency0: `0x${string}`
    currency1: `0x${string}`
    fee: number
    tickSpacing: number
    hooks: `0x${string}`
  }
  treasuryStats: {
    balance: {
      raw: bigint
      formatted: string
      usd?: string // If oraclePublicClient provided
    }
    totalAllocated: {
      raw: bigint
      formatted: string
      usd?: string
    }
  }
  pricing?: {
    wethUsd: string
    tokenUsd: string
  }
}
```

### `balance()`

Get token balances for an address.

```typescript
import { balance } from 'levr-sdk'
import { zeroAddress } from 'viem'

const balances = await balance({
  publicClient,
  address: '0x...', // User address
  tokens: [
    { address: '0x...', decimals: 18, key: 'token' },
    { address: '0x...', decimals: 18, key: 'weth' },
    { address: zeroAddress, decimals: 18, key: 'eth' }, // Native ETH
  ],
})

console.log('Token:', balances.token?.formatted)
console.log('WETH:', balances.weth?.formatted)
console.log('ETH:', balances.eth?.formatted)
```

**Parameters:**

- `publicClient` (required): Viem public client
- `address` (required): User address to check balance
- `tokens` (required): Array of token configs with `address`, `decimals`, and `key`

**Returns:**

```typescript
{
  [key: string]: {
    raw: bigint
    formatted: string
  } | undefined
}
```

### `proposals()`

Get all governance proposals.

```typescript
import { proposals } from 'levr-sdk'

const proposalsList = await proposals({
  publicClient,
  governorAddress: '0x...',
})

for (const proposal of proposalsList) {
  console.log(`Proposal #${proposal.id}:`, proposal.description)
  console.log('For:', proposal.forVotes, 'Against:', proposal.againstVotes)
  console.log('State:', proposal.state)
}
```

**Parameters:**

- `publicClient` (required): Viem public client
- `governorAddress` (required): Governor contract address

**Returns:**

```typescript
Array<{
  id: bigint
  proposer: `0x${string}`
  description: string
  startBlock: bigint
  endBlock: bigint
  forVotes: bigint
  againstVotes: bigint
  executed: boolean
  canceled: boolean
  state: string // 'Pending' | 'Active' | 'Defeated' | 'Succeeded' | 'Executed' | 'Canceled'
}>
```

## Class APIs

### `Stake` Class

Manage staking operations.

::: tip Protocol Fees
Staking and unstaking operations incur a variable protocol fee (set by Levr team) that is deducted from the amount.
:::

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

#### Methods

##### `getAllowance()`

Get the current token allowance for staking.

```typescript
const allowance = await stake.getAllowance()
console.log('Allowance:', formatUnits(allowance, 18))
```

##### `approve(amount)`

Approve tokens for staking.

```typescript
const receipt = await stake.approve(parseUnits('1000', 18))
console.log('Approved:', receipt.transactionHash)
```

##### `getPoolData()`

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

##### `getUserData()`

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

##### `getWethRewardRate(config)`

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

##### `stake(amount)`

Stake tokens. Protocol fee is deducted from the amount.

```typescript
const receipt = await stake.stake(parseUnits('100', 18))
console.log('Staked:', receipt.transactionHash)
```

##### `unstake(params)`

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

##### `claimRewards()`

Claim all pending rewards.

```typescript
const receipt = await stake.claimRewards()
console.log('Claimed rewards:', receipt.transactionHash)
```

##### `accrueRewards(tokenAddress)`

Manually accrue rewards for a specific token. Required before rewards can be claimed.

```typescript
const receipt = await stake.accrueRewards('0x...')
console.log('Accrued rewards:', receipt.transactionHash)
```

##### `accrueAllRewards()`

Manually accrue rewards for all tokens. Required before rewards can be claimed.

```typescript
const receipt = await stake.accrueAllRewards()
console.log('Accrued all rewards:', receipt.transactionHash)
```

::: tip Manual Accrual System
Levr uses explicit reward accrual for security and predictability. You must call `accrueRewards()` or `accrueAllRewards()` before claiming to update pending rewards from trading fees.
:::

### `Governance` Class

Manage governance operations.

```typescript
import { Governance } from 'levr-sdk'

const governance = new Governance({
  wallet: walletClient,
  publicClient,
  governorAddress: '0x...',
  tokenDecimals: 18,
  clankerToken: '0x...',
})
```

#### Methods

##### `getCurrentCycleId()`

Get the current governance cycle ID.

```typescript
const cycleId = await governance.getCurrentCycleId()
console.log('Current Cycle:', cycleId.toString())
```

##### `getTreasury()`

Get the treasury address.

```typescript
const treasury = await governance.getTreasury()
console.log('Treasury:', treasury)
```

##### `getAddresses(params?)`

Get all governance-related addresses with optional USD values.

```typescript
const addresses = await governance.getAddresses({
  pricing: { wethUsd: '2543.21', tokenUsd: '0.05' },
})

console.log('Treasury:', addresses.treasury.address)
console.log('Balance:', addresses.treasury.balance.formatted, 'Tokens')
console.log('USD Value:', addresses.treasury.balance.usd, 'USD')
```

**Parameters:**

- `pricing` (optional): USD pricing for balance calculations

**Returns:**

```typescript
{
  treasury: {
    address: `0x${string}`
    balance: {
      raw: bigint
      formatted: string
      usd?: string
    }
  }
  weth: `0x${string}`
}
```

##### `getAirdropStatus()`

Check if airdrop is available for the user.

```typescript
const status = await governance.getAirdropStatus()
console.log('Airdrop Available:', status.available)
console.log('Amount:', status.amount ? formatUnits(status.amount, 18) : '0')
```

**Returns:**

```typescript
{
  available: boolean
  amount?: bigint
}
```

##### `proposeTransfer(recipient, amount, description)`

Propose a treasury transfer.

```typescript
const { receipt, proposalId } = await governance.proposeTransfer(
  '0x...', // recipient
  parseUnits('1000', 18), // amount
  'Fund development team' // description
)

console.log('Proposal ID:', proposalId.toString())
console.log('Transaction:', receipt.transactionHash)
```

**Returns:**

```typescript
{
  receipt: TransactionReceipt
  proposalId: bigint
}
```

##### `proposeBoost(rewardIndex, amount, description)`

Propose a staking reward boost.

```typescript
const { receipt, proposalId } = await governance.proposeBoost(
  0, // rewardIndex (0 = WETH)
  parseUnits('500', 18), // amount
  'Boost WETH rewards' // description
)

console.log('Proposal ID:', proposalId.toString())
```

##### `vote(proposalId, support)`

Vote on a proposal.

```typescript
const receipt = await governance.vote(
  123n, // proposalId
  true // support (true = for, false = against)
)

console.log('Voted:', receipt.transactionHash)
```

##### `executeProposal(proposalId)`

Execute a passed proposal.

```typescript
const receipt = await governance.executeProposal(123n)
console.log('Executed:', receipt.transactionHash)
```

##### `claimAirdrop()`

Claim airdrop tokens.

```typescript
const receipt = await governance.claimAirdrop()
console.log('Claimed airdrop:', receipt.transactionHash)
```

## Swap Functions

### `quoteV4()`

Get a swap quote on Uniswap V4 with price impact and hook fees.

```typescript
import { quoteV4 } from 'levr-sdk'

const quote = await quoteV4({
  publicClient,
  poolKey: {
    currency0: '0x...',
    currency1: '0x...',
    fee: 500,
    tickSpacing: 10,
    hooks: '0x...',
  },
  zeroForOne: true, // true = token -> WETH, false = WETH -> token
  amountIn: parseUnits('100', 18),
  pricing: {
    // Optional: for price impact calculation
    wethUsd: '2543.21',
    tokenUsd: '0.05',
  },
  tokenAddress: '0x...',
  currency0Decimals: 18,
  currency1Decimals: 18,
})

console.log('Amount Out:', formatUnits(quote.amountOut, 18))
console.log('Price Impact:', quote.priceImpactBps, 'bps')
console.log('Hook Fees:', quote.hookFees)
console.log('Gas Estimate:', quote.gasEstimate.toString())
```

**Parameters:**

- `publicClient` (required): Viem public client
- `poolKey` (required): Uniswap V4 pool key
- `zeroForOne` (required): Swap direction
- `amountIn` (required): Amount to swap (as bigint)
- `pricing` (optional): USD pricing for price impact
- `tokenAddress` (optional): Token address for fee calculation
- `currency0Decimals` (optional): Currency 0 decimals (default: 18)
- `currency1Decimals` (optional): Currency 1 decimals (default: 18)

**Returns:**

```typescript
{
  amountOut: bigint
  priceImpactBps: number // e.g., 0.5 for 0.5%
  hookFees: {
    type: 'static' | 'dynamic'
    clankerFee: number // In basis points
    pairedFee: number
  } | null
  gasEstimate: bigint
}
```

### `swapV4()`

Execute a swap on Uniswap V4.

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

**Parameters:**

- `publicClient` (required): Viem public client
- `wallet` (required): Viem wallet client
- `poolKey` (required): Uniswap V4 pool key
- `zeroForOne` (required): Swap direction
- `amountIn` (required): Amount to swap
- `amountOutMinimum` (required): Minimum amount out (slippage protection)

### `quoteV3()`

Get a swap quote on Uniswap V3.

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

**Parameters:**

- `publicClient` (required): Viem public client
- `quoterAddress` (required): V3 Quoter V2 address
- `tokenIn` (required): Input token address
- `tokenOut` (required): Output token address
- `amountIn` (required): Amount to swap
- `fee` (required): Pool fee tier (500, 3000, or 10000)

**Returns:**

```typescript
{
  amountOut: bigint
  gasEstimate: bigint
}
```

## Price Functions

### `getUsdPrice()`

Get USD price for any token paired with WETH.

```typescript
import { getUsdPrice } from 'levr-sdk'

const { priceUsd, tokenPerWeth, wethPerUsdc } = await getUsdPrice({
  oraclePublicClient: mainnetClient, // For WETH/USDC
  quotePublicClient: baseClient, // For token/WETH
  tokenAddress: '0x...',
  quoteFee: 3000, // Optional: default 3000
})

console.log('Token Price:', priceUsd, 'USD')
console.log('Token per WETH:', tokenPerWeth)
console.log('WETH per USDC:', wethPerUsdc)
```

**Parameters:**

- `oraclePublicClient` (required): Mainnet client for WETH/USDC oracle
- `quotePublicClient` (required): Chain client for token/WETH quote
- `tokenAddress` (required): Token to price
- `quoteFee` (optional): Pool fee tier (default: 3000)

**Returns:**

```typescript
{
  priceUsd: string // e.g., "0.05"
  tokenPerWeth: string
  wethPerUsdc: string
}
```

## Constants

Useful constants exported by the SDK:

```typescript
import { UNISWAP_V3_QUOTER_V2, WETH, GET_USDC_ADDRESS, LEVR_FACTORY_V1 } from 'levr-sdk'

// Get addresses by chain ID
const quoter = UNISWAP_V3_QUOTER_V2(8453) // Base
const weth = WETH(8453)
const usdc = GET_USDC_ADDRESS(8453)
const factory = LEVR_FACTORY_V1(8453)
```
