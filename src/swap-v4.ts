import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk'
import { Actions, V4Planner } from '@uniswap/v4-sdk'
import { erc20Abi } from 'viem'
import type { PublicClient, WalletClient } from 'viem'

import Permit2Abi from './abis/Permit2'
import { UNISWAP_V4_PERMIT2, UNISWAP_V4_UNIVERSAL_ROUTER, WETH } from './constants'
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
}

export type SwapV4ReturnType = {
  txHash: `0x${string}`
  receipt: any
}

/**
 * @description Check if a currency is native ETH (address(0))
 * @param currency Currency address
 * @returns True if native ETH
 */
const isNativeETH = (currency: `0x${string}`): boolean => {
  return currency.toLowerCase() === '0x0000000000000000000000000000000000000000'
}

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
 * @description Execute a swap on Uniswap Universal Router
 * @param params Swap parameters including pool key and amounts
 * @returns Transaction hash and receipt
 *
 * @remarks
 * This function uses the Universal Router pattern with Uniswap SDK:
 * - Uses V4Planner to encode V4 actions (SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL)
 * - Uses RoutePlanner to encode Universal Router commands (V4_SWAP)
 * - ERC20 approvals via Permit2 (required for non-WETH tokens)
 * - WETH wrapping/unwrapping handled automatically by router when tx value is provided
 * - Deadline based on blockchain timestamp (from PublicClient.getBlock())
 *
 * @note Encoding pattern using SDK:
 * 1. Create V4Planner and add actions: SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL
 * 2. Finalize v4Planner to get encoded actions
 * 3. Create RoutePlanner and add V4_SWAP command
 * 4. Execute with routePlanner.commands and encoded actions
 *
 * @note For WETH swaps:
 * - Router automatically wraps ETH → WETH when value is provided in transaction
 * - Router automatically unwraps WETH → ETH when taking output
 * - No need to manually wrap/unwrap WETH
 *
 * @note For Clanker hooks:
 * - Standard pools: hookData='0x' (default)
 * - Hooks with custom accounting may require specific hookData encoding
 * - Hooks with BEFORE_SWAP_RETURNS_DELTA or AFTER_SWAP_RETURNS_DELTA modify swap amounts
 *
 * @example
 * ```typescript
 * // Swap native ETH for token (router wraps to WETH automatically)
 * const { txHash } = await swapV4({
 *   publicClient,
 *   wallet,
 *   chainId: base.id,
 *   poolKey,
 *   zeroForOne: true,  // currency0 (WETH) → currency1 (token)
 *   amountIn: parseEther('0.01'),
 *   amountOutMinimum: 0n,
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
}: SwapV4Params): Promise<SwapV4ReturnType> => {
  if (!wallet.account) throw new Error('Wallet account not found')

  const routerAddress = UNISWAP_V4_UNIVERSAL_ROUTER(chainId)
  if (!routerAddress) throw new Error('V4 Router address not found for chain')

  const permit2Address = UNISWAP_V4_PERMIT2(chainId)
  if (!permit2Address) throw new Error('Permit2 address not found for chain')

  const inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1
  const outputCurrency = zeroForOne ? poolKey.currency1 : poolKey.currency0
  const isInputNative = isNativeETH(inputCurrency)
  const isInputWETH = isWETH(inputCurrency, chainId)

  // Get current block timestamp for deadline and approval checks
  const block = await publicClient.getBlock()
  const currentTime = block.timestamp

  // Step 1 & 2: Batch all balance and allowance checks using multicall for efficiency
  // Note: For WETH, router handles wrapping automatically when value is provided
  if (!isInputNative && !isInputWETH) {
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
      const approveTx = await wallet.writeContract({
        address: inputCurrency,
        abi: erc20Abi,
        functionName: 'approve',
        args: [permit2Address, MAX_UINT256],
        account: wallet.account,
        chain: wallet.chain,
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })
    }

    // Step 2: Approve Universal Router via Permit2 if needed
    const MAX_UINT160 = 2n ** 160n - 1n
    const needsApproval = routerAllowance[0] < amountIn || routerAllowance[1] < currentTime

    if (needsApproval) {
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
      await publicClient.waitForTransactionReceipt({ hash: permit2ApproveTx })
    }
  }

  // Step 3: Encode swap using V4Planner and RoutePlanner
  // Note: For WETH input, router automatically wraps ETH when we provide value in the transaction
  const v4Planner = new V4Planner()
  const routePlanner = new RoutePlanner()

  // Build V4 actions: SWAP_EXACT_IN_SINGLE -> SETTLE_ALL -> TAKE_ALL
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
  v4Planner.addAction(Actions.SETTLE_ALL, [inputCurrency, amountIn])
  v4Planner.addAction(Actions.TAKE_ALL, [outputCurrency, amountOutMinimum])

  const encodedActions = v4Planner.finalize()

  // Add V4_SWAP command to route planner
  routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.actions, v4Planner.params])

  const commands = routePlanner.commands as `0x${string}`
  const inputs: `0x${string}`[] = [encodedActions as `0x${string}`]

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
    // Note: Provide msg.value for native ETH or WETH (router handles wrapping)
    const txValue = isInputNative || isInputWETH ? amountIn : 0n

    await publicClient.simulateContract({
      address: routerAddress,
      abi: routerAbi,
      functionName: 'execute',
      args: [commands, inputs, deadline],
      value: txValue,
      account: wallet.account,
    })

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

    return {
      txHash,
      receipt,
    }
  } catch (error) {
    throw new Error(`Swap failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
