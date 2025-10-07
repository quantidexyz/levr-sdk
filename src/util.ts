import { parseUnits } from 'viem'

/**
 * Check if approval is needed for a given amount
 */
export function needsApproval(
  currentAllowance: string | number | bigint,
  requiredAmount: string | number | bigint,
  decimals?: number
): boolean {
  if (typeof currentAllowance !== 'bigint' || typeof requiredAmount !== 'bigint') {
    if (!decimals) {
      throw new Error('Decimals are required, when not using bigint')
    }
  }

  const parsedCurrentAllowance =
    typeof currentAllowance === 'bigint'
      ? currentAllowance
      : parseUnits(currentAllowance.toString(), decimals!)
  const parsedRequiredAmount =
    typeof requiredAmount === 'bigint'
      ? requiredAmount
      : parseUnits(requiredAmount.toString(), decimals!)

  return parsedCurrentAllowance < parsedRequiredAmount
}
