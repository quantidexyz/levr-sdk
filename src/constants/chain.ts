import { anvil, base, baseSepolia, bsc } from 'viem/chains'

// =============================================================================
// Types
// =============================================================================

/**
 * Token info type for chain configuration
 */
export type TokenInfo = {
  address: `0x${string}`
  decimals: number
  symbol: string
  name?: string
}

/**
 * Chain-specific deployment configuration
 */
export type ChainDeployConfig = {
  /** Native wrapped token symbol for display (e.g., 'ETH', 'BNB') */
  nativeSymbol: string
  /** Available paired token options */
  pairedTokenOptions: readonly string[]
  /** Default paired token */
  defaultPairedToken: string
  /** Dev buy amount options */
  devBuyOptions: readonly string[]
}

/**
 * Complete chain configuration including all token info
 */
export type ChainConfig = {
  /** Chain ID */
  chainId: number
  /** Chain name */
  name: string
  /** Deployment configuration (paired tokens, dev buy options) */
  deploy: ChainDeployConfig
  /** Native wrapped token (WETH/WBNB) */
  wrappedNative: TokenInfo
  /** Available stablecoins on this chain */
  stablecoins: Record<string, TokenInfo>
  /** Initial liquidity amounts by token address (lowercase) */
  initialLiquidity: Record<string, number>
}

// =============================================================================
// Token Definitions
// =============================================================================

const TOKENS = {
  // Native wrapped tokens
  WETH: {
    address: '0x4200000000000000000000000000000000000006' as `0x${string}`,
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
  },
  WBNB: {
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`,
    decimals: 18,
    symbol: 'WBNB',
    name: 'Wrapped BNB',
  },

  // Stablecoins
  USDC_BASE: {
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as `0x${string}`,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  U_BSC: {
    address: '0xce24439f2d9c6a2289f741120fe202248b666666' as `0x${string}`,
    decimals: 18,
    symbol: 'U',
    name: 'U Stablecoin',
  },
} as const

// =============================================================================
// Chain Configurations
// =============================================================================

/**
 * Complete chain configurations
 * Single source of truth for all chain-specific settings
 */
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Anvil (local development)
  [anvil.id]: {
    chainId: anvil.id,
    name: 'Anvil',
    deploy: {
      nativeSymbol: 'ETH',
      pairedTokenOptions: ['ETH', 'USDC'],
      defaultPairedToken: 'ETH',
      devBuyOptions: ['0.1 ETH', '0.5 ETH', '1 ETH', '1.5 ETH'],
    },
    wrappedNative: TOKENS.WETH,
    stablecoins: {
      USDC: TOKENS.USDC_BASE,
    },
    initialLiquidity: {
      [TOKENS.WETH.address.toLowerCase()]: 10,
      [TOKENS.USDC_BASE.address.toLowerCase()]: 30_000,
    },
  },

  // Base mainnet
  [base.id]: {
    chainId: base.id,
    name: 'Base',
    deploy: {
      nativeSymbol: 'ETH',
      pairedTokenOptions: ['ETH'],
      defaultPairedToken: 'ETH',
      devBuyOptions: ['0.1 ETH', '0.5 ETH', '1 ETH', '1.5 ETH'],
    },
    wrappedNative: TOKENS.WETH,
    stablecoins: {
      USDC: TOKENS.USDC_BASE,
    },
    initialLiquidity: {
      [TOKENS.WETH.address.toLowerCase()]: 10,
    },
  },

  // Base Sepolia (testnet)
  [baseSepolia.id]: {
    chainId: baseSepolia.id,
    name: 'Base Sepolia',
    deploy: {
      nativeSymbol: 'ETH',
      pairedTokenOptions: ['ETH'],
      defaultPairedToken: 'ETH',
      devBuyOptions: ['0.1 ETH', '0.5 ETH', '1 ETH', '1.5 ETH'],
    },
    wrappedNative: TOKENS.WETH,
    stablecoins: {},
    initialLiquidity: {
      [TOKENS.WETH.address.toLowerCase()]: 10,
    },
  },

  // BSC mainnet
  [bsc.id]: {
    chainId: bsc.id,
    name: 'BNB Chain',
    deploy: {
      nativeSymbol: 'BNB',
      pairedTokenOptions: ['BNB', 'U'],
      defaultPairedToken: 'BNB',
      devBuyOptions: ['0.1 BNB', '0.5 BNB', '1 BNB', '1.5 BNB'],
    },
    wrappedNative: TOKENS.WBNB,
    stablecoins: {
      U: TOKENS.U_BSC,
    },
    initialLiquidity: {
      [TOKENS.WBNB.address.toLowerCase()]: 35,
      [TOKENS.U_BSC.address.toLowerCase()]: 30_000,
    },
  },
}

// Default to Base config
const DEFAULT_CHAIN_CONFIG = CHAIN_CONFIGS[base.id]

// =============================================================================
// Getters
// =============================================================================

/**
 * Get complete chain configuration
 * @param chainId - The chain ID
 * @returns Complete chain configuration, falls back to Base if not found
 */
export const getChainConfig = (chainId: number | undefined): ChainConfig => {
  if (!chainId) return DEFAULT_CHAIN_CONFIG
  return CHAIN_CONFIGS[chainId] ?? DEFAULT_CHAIN_CONFIG
}

/**
 * Get chain deployment configuration (paired tokens, dev buy options)
 * @param chainId - The chain ID
 * @returns Deployment configuration
 */
export const getChainDeployConfig = (chainId: number | undefined): ChainDeployConfig => {
  return getChainConfig(chainId).deploy
}

/**
 * Get wrapped native token info (WETH/WBNB)
 * @param chainId - The chain ID
 * @returns Token info or undefined if chain not configured
 */
export const getWrappedNative = (chainId: number | undefined): TokenInfo | undefined => {
  if (!chainId) return undefined
  return CHAIN_CONFIGS[chainId]?.wrappedNative
}

/**
 * Get stablecoin info by symbol
 * @param chainId - The chain ID
 * @param symbol - The stablecoin symbol (e.g., 'USDC', 'U')
 * @returns Token info or undefined if not found
 */
export const getStablecoin = (
  chainId: number | undefined,
  symbol: string
): TokenInfo | undefined => {
  if (!chainId) return undefined
  return CHAIN_CONFIGS[chainId]?.stablecoins[symbol]
}

/**
 * Get the primary USD stablecoin for a chain
 * @param chainId - The chain ID
 * @returns The first available stablecoin or undefined
 */
export const getUsdStablecoin = (chainId: number | undefined): TokenInfo | undefined => {
  if (!chainId) return undefined
  const stablecoins = CHAIN_CONFIGS[chainId]?.stablecoins
  if (!stablecoins) return undefined
  const symbols = Object.keys(stablecoins)
  return symbols.length > 0 ? stablecoins[symbols[0]] : undefined
}

/**
 * Get initial liquidity amount for a token address
 * @param chainId - The chain ID
 * @param tokenAddress - The token address
 * @returns Initial liquidity amount, defaults to 10
 */
export const getInitialLiquidity = (
  chainId: number | undefined,
  tokenAddress: string | undefined
): number => {
  if (!chainId || !tokenAddress) return 10
  const config = CHAIN_CONFIGS[chainId]
  if (!config) return 10
  return config.initialLiquidity[tokenAddress.toLowerCase()] ?? 10
}

/**
 * Get token info for a paired token symbol
 * Resolves symbol to actual token info based on chain
 * @param chainId - The chain ID
 * @param pairedToken - The paired token symbol (e.g., 'ETH', 'BNB', 'USDC', 'U')
 * @returns Token info or undefined if not found
 */
export const getPairedTokenInfo = (
  chainId: number | undefined,
  pairedToken: string
): TokenInfo | undefined => {
  if (!chainId) return undefined

  const config = CHAIN_CONFIGS[chainId]
  if (!config) return undefined

  // Check if it's the native token
  if (pairedToken === 'ETH' || pairedToken === 'BNB') {
    return config.wrappedNative
  }

  // Check stablecoins
  return config.stablecoins[pairedToken]
}

/**
 * Check if a paired token is a stablecoin (uses V3 routing for dev buy)
 * @param pairedToken - The paired token symbol
 * @returns True if it's a stablecoin
 */
export const isStablecoin = (pairedToken: string): boolean => {
  return !['ETH', 'BNB'].includes(pairedToken)
}

// =============================================================================
// Legacy Exports (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use getWrappedNative instead
 */
export const WETH = (chainId?: number) => getWrappedNative(chainId)

/**
 * @deprecated Use getUsdStablecoin instead
 */
export const GET_USD_STABLECOIN = (chainId?: number) => getUsdStablecoin(chainId)

/**
 * @deprecated Use getStablecoin(chainId, 'U') instead
 */
export const GET_U_STABLECOIN = (chainId?: number) => getStablecoin(chainId, 'U')

/**
 * @deprecated Use getInitialLiquidity instead
 */
export const getInitialLiquidityAmount = (address?: string): number => {
  // Search all chains for this address
  if (!address) return 10
  const normalizedAddress = address.toLowerCase()

  for (const config of Object.values(CHAIN_CONFIGS)) {
    const amount = config.initialLiquidity[normalizedAddress]
    if (amount !== undefined) return amount
  }

  return 10
}

/**
 * @deprecated Use getChainDeployConfig instead
 */
export const CHAIN_DEPLOY_CONFIG = Object.fromEntries(
  Object.entries(CHAIN_CONFIGS).map(([chainId, config]) => [chainId, config.deploy])
) as Record<number, ChainDeployConfig>
