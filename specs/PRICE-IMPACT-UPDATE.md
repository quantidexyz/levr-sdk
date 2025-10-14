# V4 Quote Price Impact Calculation Update

## Summary

Updated the V4 quote price impact calculation to use the standard AMM methodology that properly accounts for price movement during swaps. Additionally optimized the quote function to use a single multicall for all operations.

## Changes Made

### 1. **Improved Price Impact Calculation**

The price impact calculation now:

- **Uses pool state directly**: Fetches `sqrtPriceX96` from the pool's current state via StateView contract
- **Compares spot vs execution price**:
  - **Spot price**: Derived from `sqrtPriceX96` before the swap
  - **Execution price**: Calculated from `amountOut / amountIn` (the actual rate you get)
- **Accounts for price movement**: The execution price inherently represents the average price across the entire trade, capturing the impact of the swap on the pool

#### Formula Used

```typescript
// Convert sqrtPriceX96 to decimal price
price = (sqrtPriceX96 / 2^96)^2 * (10^(decimals0 - decimals1))

// Calculate execution price from quote
executionPrice = amountOut / amountIn (adjusted for swap direction)

// Price impact
impact = |spotPrice - executionPrice| / spotPrice * 100
```

This is the standard approach used by Uniswap interfaces and other DEX aggregators.

### 2. **Single Multicall Optimization**

The `quoteV4Read` function now makes a **single multicall** that fetches:

1. Quote (amountOut, gasEstimate)
2. Pool state (sqrtPriceX96) - if `calculatePriceImpact` is enabled
3. Hook fees (tries both static and dynamic fee queries)

**Before**: 3+ separate RPC calls
**After**: 1 multicall with all operations

This significantly improves performance and reduces RPC usage.

### 3. **API Changes**

#### Removed Parameters

- `pricing?: PricingResult` - No longer needed
- `tokenAddress?: string` - No longer needed

#### New Parameter

- `calculatePriceImpact?: boolean` (default: `true`) - Controls whether to fetch pool state for price impact calculation

#### Example Usage

```typescript
const quote = await quoteV4Read({
  publicClient,
  poolKey,
  zeroForOne: true,
  amountIn: parseEther('1'),
  currency0Decimals: 18,
  currency1Decimals: 18,
  // calculatePriceImpact: true, // optional, defaults to true
})

console.log('Amount out:', quote.amountOut)
console.log('Price impact:', quote.priceImpactBps, '%')
console.log('Hook fees:', quote.hookFees)
```

## Benefits

1. **More Accurate**: Uses actual pool state and execution prices rather than external USD pricing
2. **More Reliable**: Doesn't depend on external price feeds
3. **Simpler API**: Removed unnecessary parameters
4. **Better Performance**: Single multicall instead of multiple separate calls
5. **Standard Approach**: Follows the same methodology used by Uniswap and other major DEXs

## Technical Details

### Price Impact Calculation

The calculation properly handles both swap directions:

**For zeroForOne (token0 → token1):**

- Spot price is token1/token0
- Execution price is token1_out / token0_in
- Price moves up (execution > spot) as you're buying token1

**For oneForZero (token1 → token0):**

- Spot price is token1/token0
- Execution price is converted to token1/token0 for comparison
- Price moves down (execution < spot) as you're buying token0

### Decimal Adjustment

The `sqrtPriceX96ToPrice` function properly adjusts for token decimals:

```typescript
price = (sqrtPriceX96 / 2) ^ 96 ^ (2 * 10) ^ (decimals0 - decimals1)
```

This ensures prices are correctly normalized regardless of token decimal differences.

## Migration Guide

If you were passing `pricing` and `tokenAddress` to `quoteV4Read`, simply remove them:

**Before:**

```typescript
await quoteV4Read({
  publicClient,
  poolKey,
  zeroForOne: true,
  amountIn,
  pricing: project.data?.pricing,
  tokenAddress: project.data?.token.address,
  currency0Decimals,
  currency1Decimals,
})
```

**After:**

```typescript
await quoteV4Read({
  publicClient,
  poolKey,
  zeroForOne: true,
  amountIn,
  currency0Decimals,
  currency1Decimals,
})
```

The price impact will now be calculated automatically using pool state.
