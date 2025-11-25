/**
 * Percentage of LP fees allocated to Levr team (0-100)
 * This is automatically included in all deployments via the UI
 */
export const LEVR_TEAM_LP_FEE_PERCENTAGE = 2 as const

/**
 * Staking rewards in basis points
 * User-facing percentages of LP fees allocated to staking (before team fee is subtracted)
 * Note: Team fee is automatically deducted in the deployment logic
 */
export const STAKING_REWARDS = {
  '100%': 10_000, // 100% of rewards to staking
  '90%': 9_000, // 90% of rewards to staking
  '80%': 8_000, // 80% of rewards to staking
  '70%': 7_000, // 70% of rewards to staking
  '60%': 6_000, // 60% of rewards to staking
  '50%': 5_000, // 50% of rewards to staking
  '40%': 4_000, // 40% of rewards to staking
} as const

export const STATIC_FEE_TIERS = {
  '1%': 100,
  '2%': 200,
  '3%': 300,
} as const

/**
 * Vault lockup period options (in days)
 * Tokens are locked for this period and cannot be claimed
 */
export const VAULT_LOCKUP_PERIODS = {
  '30 days': 30,
  '90 days': 90,
  '180 days': 180,
} as const

/**
 * Vault vesting period options (in days)
 * Linear vesting occurs between end of lockup and end of vesting period
 * 'instant' means tokens are claimable immediately once lockup ends (no vesting period)
 */
export const VAULT_VESTING_PERIODS = {
  instant: 0,
  '30 days': 30,
  '180 days': 180,
} as const

/**
 * Vault allocation percentage options
 * Percentage of total token supply (100B tokens) allocated to vault
 */
export const VAULT_PERCENTAGES = {
  '5%': 5,
  '10%': 10,
  '15%': 15,
  '20%': 20,
  '25%': 25,
  '30%': 30,
} as const

/**
 * Common treasury airdrop amounts in tokens (not wei)
 * First value is used as default in deployV4
 */
export const TREASURY_AIRDROP_AMOUNTS = {
  '10%': 10_000_000_000, // 10B tokens (10% of 100B)
  '20%': 20_000_000_000, // 20B tokens (20% of 100B)
  '30%': 30_000_000_000, // 30B tokens (30% of 100B)
  '40%': 40_000_000_000, // 40B tokens (40% of 100B)
  '50%': 50_000_000_000, // 50B tokens (50% of 100B)
  '60%': 60_000_000_000, // 60B tokens (60% of 100B)
  '70%': 70_000_000_000, // 70B tokens (70% of 100B)
  '80%': 80_000_000_000, // 80B tokens (80% of 100B)
  '90%': 90_000_000_000, // 90B tokens (90% of 100B)
} as const
