import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk'
import { Actions, V4Planner } from '@uniswap/v4-sdk'
import type { PublicClient, TransactionReceipt, WalletClient } from 'viem'
import { erc20Abi } from 'viem'

import Permit2Abi from './abis/Permit2'
import {
  ADDRESS_THIS,
  CONTRACT_BALANCE,
  MSG_SENDER,
  UNISWAP_V4_PERMIT2,
  UNISWAP_V4_UNIVERSAL_ROUTER,
  WETH,
} from './constants'
import type { PoolKey } from './types'

export type SwapV4Params = {
  publicClient: PublicClient
  wallet: WalletClient
  chainId: number
  poolKey: PoolKey
  zeroForOne: boolean
  amountIn: bigint
  amountOutMinimum: bigint
  /**
   * Hook data to pass to the pool's hook contract
   * @remarks
   * - Standard pools: Use '0x' (default)
   * - Clanker pools with extensions: May require specific encoded data for pool extension
   * - Format depends on the specific hook implementation
   */
  hookData?: `0x${string}`

  // Approval callbacks
  onApproveERC20Success?: (receipt: TransactionReceipt) => void
  onApproveERC20Error?: (error: unknown) => void
  onApprovePermit2Success?: (receipt: TransactionReceipt) => void
  onApprovePermit2Error?: (error: unknown) => void
}

export type SwapV4ReturnType = TransactionReceipt

/**
 * @description Check if a currency is WETH
 * @param currency Currency address
 * @param chainId Chain ID to get WETH address
 * @returns True if WETH
 */
const isWETH = (currency: `0x${string}`, chainId: number): boolean => {
  const wethInfo = WETH(chainId)
  if (!wethInfo) return false
  return currency.toLowerCase() === wethInfo.address.toLowerCase()
}

/**
 * @description Execute a Uniswap V4 swap with automatic native ETH handling
 * @param params Swap parameters including pool key and amounts
 * @returns Transaction receipt
 *
 * @remarks
 * **Architecture:**
 * - Uses Universal Router with V4Planner for encoding swap actions
 * - Automatically handles native ETH ↔ WETH conversions (users never hold WETH)
 * - ERC20 approvals via Permit2 (only for non-WETH tokens)
 * - 20-minute deadline from current block timestamp
 *
 * **Execution Flow:**
 *
 * 1. **Approvals (ERC20 Tokens Only)**:
 *    - Checks token balance and existing allowances via multicall
 *    - Token → Permit2: Infinite approval if needed
 *    - Permit2 → Router: MAX_UINT160 approval with 30-day expiration
 *    - Native ETH swaps skip this step entirely
 *
 * 2. **Action Encoding**:
 *    - **RoutePlanner Commands**:
 *      - `WRAP_ETH` (if input is WETH): Wraps msg.value to router's WETH balance
 *      - `V4_SWAP`: Executes the V4Planner actions (see below)
 *      - `UNWRAP_WETH` (if output is WETH): Converts router's WETH to native ETH for user
 *
 *    - **V4Planner Actions** (nested in V4_SWAP):
 *      - `SWAP_EXACT_IN_SINGLE`: Execute the swap with specified pool and amounts
 *      - `SETTLE` or `SETTLE_ALL`: Pay for input tokens
 *        - `SETTLE(currency, amount, false)`: Router pays from its balance (for WETH input after WRAP_ETH)
 *        - `SETTLE_ALL(currency, amount)`: User pays from their token balance (for ERC20 input)
 *      - `TAKE` or `TAKE_ALL`: Receive output tokens
 *        - `TAKE(currency, routerAddress, 0)`: Router receives WETH (before UNWRAP_WETH)
 *        - `TAKE_ALL(currency, 0)`: User directly receives tokens
 *
 * 3. **Transaction Execution**:
 *    - Calls `execute(commands, inputs, deadline)` on Universal Router
 *    - Sends msg.value = amountIn for WETH input (native ETH)
 *    - Sends msg.value = 0 for ERC20 token input
 *    - Waits for receipt and validates success
 *
 * **Native ETH Flows:**
 * - **Buy tokens with ETH** (WETH → Token):
 *   - User sends ETH as msg.value
 *   - WRAP_ETH wraps it to router's WETH balance
 *   - SETTLE pays swap from router's WETH (payerIsUser=false)
 *   - TAKE_ALL sends tokens directly to user
 *
 * - **Sell tokens for ETH** (Token → WETH):
 *   - SETTLE_ALL pays swap from user's token balance (via Permit2)
 *   - TAKE sends WETH to router
 *   - UNWRAP_WETH converts router's WETH to native ETH
 *   - User receives native ETH (sent to MSG_SENDER)
 *
 * - **Token ↔ Token**: Standard ERC20 flow, no WRAP/UNWRAP needed
 *
 * @example
 * ```typescript
 * // Buy tokens with native ETH
 * const receipt = await swapV4({
 *   publicClient,
 *   wallet,
 *   chainId: base.id,
 *   poolKey,
 *   zeroForOne: true,  // WETH → Token
 *   amountIn: parseEther('0.01'),
 *   amountOutMinimum: parseUnits('100', tokenDecimals),
 *   hookData: '0x', // Optional: pool-specific hook data
 * })
 * ```
 */
export const swapV4 = async ({
  publicClient,
  wallet,
  chainId,
  poolKey,
  zeroForOne,
  amountIn,
  amountOutMinimum,
  hookData = '0x',
  onApproveERC20Success,
  onApproveERC20Error,
  onApprovePermit2Success,
  onApprovePermit2Error,
}: SwapV4Params): Promise<SwapV4ReturnType> => {
  if (!wallet.account) throw new Error('Wallet account not found')

  const routerAddress = UNISWAP_V4_UNIVERSAL_ROUTER(chainId)
  if (!routerAddress) throw new Error('V4 Router address not found for chain')

  const permit2Address = UNISWAP_V4_PERMIT2(chainId)
  if (!permit2Address) throw new Error('Permit2 address not found for chain')

  const inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1
  const outputCurrency = zeroForOne ? poolKey.currency1 : poolKey.currency0
  const isInputWETH = isWETH(inputCurrency, chainId)
  const isOutputWETH = isWETH(outputCurrency, chainId)
  // Get current block timestamp for deadline and approval checks
  const block = await publicClient.getBlock()
  const currentTime = block.timestamp

  // Step 1 & 2: Approvals required for ERC20 tokens (but NOT for native ETH)
  // Note: When swapping native ETH, we use WRAP_ETH command - no approvals needed
  // When swapping ERC20 tokens, we need Permit2 approvals for transferFrom

  // Only check balances and approvals for non-WETH tokens
  if (!isInputWETH) {
    // Use multicall to batch balance and allowance checks
    const multicallResults = await publicClient.multicall({
      contracts: [
        // 0: Token balance
        {
          address: inputCurrency,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [wallet.account.address],
        },
        // 1: Permit2 allowance
        {
          address: inputCurrency,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [wallet.account.address, permit2Address],
        },
        // 2: Router allowance via Permit2
        {
          address: permit2Address,
          abi: Permit2Abi,
          functionName: 'allowance',
          args: [wallet.account.address, inputCurrency, routerAddress],
        },
      ],
    })

    const balance = multicallResults[0].status === 'success' ? multicallResults[0].result : 0n
    const permit2Allowance =
      multicallResults[1].status === 'success' ? multicallResults[1].result : 0n
    const routerAllowance =
      multicallResults[2].status === 'success'
        ? multicallResults[2].result
        : ([0n, 0n, 0n] as const)

    // Verify sufficient token balance
    if (balance < amountIn) {
      throw new Error(`Insufficient token balance: have ${balance}, need ${amountIn}`)
    }

    // Step 1: Approve Permit2 to spend input token if needed
    const MAX_UINT256 = 2n ** 256n - 1n
    if (permit2Allowance < amountIn) {
      try {
        const approveTx = await wallet.writeContract({
          address: inputCurrency,
          abi: erc20Abi,
          functionName: 'approve',
          args: [permit2Address, MAX_UINT256],
          account: wallet.account,
          chain: wallet.chain,
        })
        const receipt = await publicClient.waitForTransactionReceipt({ hash: approveTx })
        onApproveERC20Success?.(receipt)
      } catch (error) {
        onApproveERC20Error?.(error)
        throw error
      }
    }

    // Step 2: Approve Universal Router via Permit2 if needed
    const MAX_UINT160 = 2n ** 160n - 1n
    // Check if allowance is sufficient and not expired
    // routerAllowance: [amount: uint160, expiration: uint48, nonce: uint48]
    const needsApproval = routerAllowance[0] < amountIn || routerAllowance[1] <= currentTime

    if (needsApproval) {
      try {
        // Approve with 30 days expiration (uint48) from current block time
        const expirationBigInt = currentTime + BigInt(30 * 24 * 60 * 60)
        const permit2ApproveTx = await wallet.writeContract({
          address: permit2Address,
          abi: Permit2Abi,
          functionName: 'approve',
          args: [inputCurrency, routerAddress, MAX_UINT160, Number(expirationBigInt)],
          account: wallet.account,
          chain: wallet.chain,
        })
        const receipt = await publicClient.waitForTransactionReceipt({ hash: permit2ApproveTx })
        onApprovePermit2Success?.(receipt)
      } catch (error) {
        onApprovePermit2Error?.(error)
        throw error
      }
    }
  }

  // Step 3: Encode swap using V4Planner and RoutePlanner
  const v4Planner = new V4Planner()
  const routePlanner = new RoutePlanner()

  // Step 3a: If input is native ETH, add WRAP_ETH command first
  if (isInputWETH) routePlanner.addCommand(CommandType.WRAP_ETH, [ADDRESS_THIS, CONTRACT_BALANCE])

  // Step 3b: Build V4 actions: SWAP_EXACT_IN_SINGLE -> SETTLE_ALL -> TAKE_ALL/TAKE
  const swapConfig = {
    poolKey: {
      currency0: poolKey.currency0,
      currency1: poolKey.currency1,
      fee: poolKey.fee,
      tickSpacing: poolKey.tickSpacing,
      hooks: poolKey.hooks,
    },
    zeroForOne,
    amountIn,
    amountOutMinimum,
    hookData,
  }

  v4Planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [swapConfig])

  // SETTLE: Choose between SETTLE_ALL (user pays) vs SETTLE (router pays)
  // - For native ETH input: Use SETTLE with payerIsUser=false (router pays from WRAP_ETH balance)
  // - For ERC20 tokens: Use SETTLE_ALL (user pays from their token balance)
  if (isInputWETH)
    // Router pays from its WETH balance (from WRAP_ETH)
    v4Planner.addAction(Actions.SETTLE, [inputCurrency, amountIn, false])
  else
    // User pays from their token balance
    v4Planner.addAction(Actions.SETTLE_ALL, [inputCurrency, amountIn])

  if (isOutputWETH)
    // Take WETH to router first, then UNWRAP_WETH will convert to native ETH for user (MSG_SENDER)
    v4Planner.addAction(Actions.TAKE, [outputCurrency, routerAddress, 0n])
  // For token output, TAKE_ALL directly to user
  else v4Planner.addAction(Actions.TAKE_ALL, [outputCurrency, 0n])

  // Step 3c: Finalize V4 planner to get encoded actions
  // finalize() returns the full encoded bytes that will be passed to the PoolManager
  const encodedV4Actions = v4Planner.finalize() as `0x${string}`

  // Add V4_SWAP command - note we only add it to get the command byte,
  // but we'll manually construct the inputs array
  routePlanner.addCommand(CommandType.V4_SWAP, [encodedV4Actions])

  // Step 3d: If output is WETH, unwrap to native ETH
  if (isOutputWETH) routePlanner.addCommand(CommandType.UNWRAP_WETH, [MSG_SENDER, 0n])

  // Get commands from RoutePlanner
  const commands = routePlanner.commands as `0x${string}`
  const inputs = routePlanner.inputs as `0x${string}`[]

  // Universal Router ABI (with deadline)
  const routerAbi = [
    {
      inputs: [
        { internalType: 'bytes', name: 'commands', type: 'bytes' },
        { internalType: 'bytes[]', name: 'inputs', type: 'bytes[]' },
        { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      ],
      name: 'execute',
      outputs: [],
      stateMutability: 'payable',
      type: 'function',
    },
  ] as const

  // Set deadline (20 minutes from current block time)
  const deadline = currentTime + BigInt(20 * 60)

  try {
    // First simulate to get better error messages
    // Note: Provide msg.value for native ETH or WETH inputs
    // - For native ETH: direct payment
    // - For WETH: router wraps the ETH sent as msg.value
    const txValue = isInputWETH ? amountIn : 0n

    // If simulation passes, execute the swap
    const txHash = await wallet.writeContract({
      address: routerAddress,
      abi: routerAbi,
      functionName: 'execute',
      args: [commands, inputs, deadline],
      value: txValue,
      account: wallet.account,
      chain: wallet.chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    if (receipt.status === 'reverted') {
      throw new Error('Swap transaction reverted')
    }

    return receipt
  } catch (error) {
    throw new Error(`Swap failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
