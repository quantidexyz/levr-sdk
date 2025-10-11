# Levr SDK

TypeScript SDK for interacting with Levr protocol - a decentralized governance, staking, and liquidity management system built on Uniswap v4.

## Features

- 🎯 **Type-Safe** - Full TypeScript support with comprehensive types
- 🔄 **Centralized Refetch** - 100% coverage with smart cross-domain awareness
- ⚡ **Zero Duplication** - Optimized query management via React Context
- 🪝 **React Hooks** - Easy integration with React applications
- 🔌 **Server & Client** - Works in both server and client environments
- 📦 **Tree-Shakeable** - Import only what you need
- 💰 **USD Pricing** - Integrated USD price calculations for tokens, balances, and APR
- 📊 **Price Impact** - Real-time price impact calculation for swaps
- ⚙️ **Hook Fees** - Automatic extraction of Clanker hook fees (static and dynamic)

## Installation

::: code-group

```bash [bun]
bun add levr-sdk
```

```bash [npm]
npm install levr-sdk
```

```bash [yarn]
yarn add levr-sdk
```

```bash [pnpm]
pnpm add levr-sdk
```

:::

## Quick Links

- [Getting Started](./getting-started.md) - Quick start guide for React and server-side usage
- [Client Hooks](./client-hooks.md) - Complete React hooks API reference
- [Server API](./server-api.md) - Server-side API reference
- [Architecture](./architecture.md) - Understanding the centralized provider pattern
- [Advanced Usage](./advanced-usage.md) - Advanced patterns and examples

## Overview

Levr SDK provides two main entry points:

### Client Entry (`levr-sdk/client`)

For React applications, includes hooks and providers:

```typescript
import {
  LevrProvider,
  useStake,
  useSwap,
  useGovernance,
  useProject,
  useSetClankerToken,
} from 'levr-sdk/client'
```

### Server Entry (`levr-sdk`)

For server-side operations and scripts:

```typescript
import { project, balance, Stake, Governance, quoteV4, swapV4 } from 'levr-sdk'
```

## What's Next?

- **New to Levr SDK?** Start with the [Getting Started](./getting-started.md) guide
- **Building a React app?** Check out the [Client Hooks](./client-hooks.md) documentation
- **Server-side integration?** See the [Server API](./server-api.md) reference
- **Want to understand the internals?** Read about the [Architecture](./architecture.md)
