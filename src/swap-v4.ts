import { encodeAbiParameters, encodePacked, erc20Abi } from 'viem'
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

// Universal Router Commands (top-level)
const Commands = {
  V4_SWAP: 0x10, // Execute V4 swap
} as const

// V4 Actions (nested within V4_SWAP command)
const V4Actions = {
  SWAP_EXACT_IN_SINGLE: 0x06,
  SETTLE_ALL: 0x0c,
  TAKE_ALL: 0x0f,
  WRAP: 0x15,
} as const

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
 * This function uses the Universal Router pattern:
 * - Uses execute(bytes commands, bytes[] inputs)
 * - Commands: V4_SWAP (0x10)
 * - Inputs contain encoded V4 actions: SWAP_EXACT_IN_SINGLE (0x06), SETTLE_ALL (0x0c), TAKE_ALL (0x0f)
 * - ERC20 approvals via Permit2 (required for V4)
 * - Native ETH not directly supported - must use WETH
 *
 * @note Encoding pattern (from article):
 * 1. commands = solidityPack(["uint8"], [0x10])
 * 2. actions = solidityPack(["uint8", "uint8", "uint8"], [0x06, 0x0c, 0x0f])
 * 3. params = [swapParams, settleParams, takeParams]
 * 4. inputs = [abi.encode(["bytes", "bytes[]"], [actions, params])]
 * 5. execute(commands, inputs)
 *
 * @note For Clanker hooks:
 * - Standard pools: hookData='0x' (default)
 * - Hooks with custom accounting may require specific hookData encoding
 * - Hooks with BEFORE_SWAP_RETURNS_DELTA or AFTER_SWAP_RETURNS_DELTA modify swap amounts
 *
 * @example
 * ```typescript
 * // Swap WETH for token (send native ETH)
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

  // Step 1 & 2: Batch all balance and allowance checks using multicall for efficiency
  if (!isInputNative) {
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

    // Step 1: Wrap ETH to WETH if needed
    if (isInputWETH && balance < amountIn) {
      const wethAbi = [
        {
          inputs: [],
          name: 'deposit',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
      ] as const

      const wrapTx = await wallet.writeContract({
        address: inputCurrency,
        abi: wethAbi,
        functionName: 'deposit',
        value: amountIn - balance,
        account: wallet.account,
        chain: wallet.chain,
      })
      await publicClient.waitForTransactionReceipt({ hash: wrapTx })
    }

    // Verify sufficient balance (after potential wrapping)
    const finalBalance = isInputWETH && balance < amountIn ? amountIn : balance
    if (finalBalance < amountIn) {
      throw new Error(`Insufficient token balance: have ${finalBalance}, need ${amountIn}`)
    }

    // Step 2a: Approve Permit2 to spend input token if needed
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

    // Step 2b: Approve Universal Router via Permit2 if needed
    const currentTime = BigInt(Math.floor(Date.now() / 1000))
    const MAX_UINT160 = 2n ** 160n - 1n
    const needsApproval = routerAllowance[0] < amountIn || routerAllowance[1] < currentTime

    if (needsApproval) {
      // Approve with 30 days expiration (uint48)
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

  // Step 3: Encode swap using Universal Router pattern
  // Build V4 actions: SWAP_EXACT_IN_SINGLE -> SETTLE_ALL -> TAKE_ALL
  const v4Actions = encodePacked(
    ['uint8', 'uint8', 'uint8'],
    [V4Actions.SWAP_EXACT_IN_SINGLE, V4Actions.SETTLE_ALL, V4Actions.TAKE_ALL]
  )

  // Encode parameters for each V4 action
  const v4Params: `0x${string}`[] = []

  // 1. SWAP_EXACT_IN_SINGLE params: ExactInputSingleParams
  const swapParams = encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          {
            type: 'tuple',
            name: 'poolKey',
            components: [
              { type: 'address', name: 'currency0' },
              { type: 'address', name: 'currency1' },
              { type: 'uint24', name: 'fee' },
              { type: 'int24', name: 'tickSpacing' },
              { type: 'address', name: 'hooks' },
            ],
          },
          { type: 'bool', name: 'zeroForOne' },
          { type: 'uint128', name: 'amountIn' },
          { type: 'uint128', name: 'amountOutMinimum' },
          { type: 'bytes', name: 'hookData' },
        ],
      },
    ],
    [
      {
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
      },
    ]
  )
  v4Params.push(swapParams)

  // 2. SETTLE_ALL params: (address currency, uint256 maxAmount) - NOTE: uint256, not uint128!
  const settleAllParams = encodeAbiParameters(
    [{ type: 'address' }, { type: 'uint256' }],
    [inputCurrency, amountIn]
  )
  v4Params.push(settleAllParams)

  // 3. TAKE_ALL params: (address currency, uint256 minAmount) - NOTE: uint256, not uint128!
  const takeAllParams = encodeAbiParameters(
    [{ type: 'address' }, { type: 'uint256' }],
    [outputCurrency, amountOutMinimum]
  )
  v4Params.push(takeAllParams)

  // Encode V4 swap data: abi.encode(["bytes", "bytes[]"], [actions, params])
  const v4SwapData = encodeAbiParameters(
    [{ type: 'bytes' }, { type: 'bytes[]' }],
    [v4Actions, v4Params]
  )

  // Encode Universal Router command: V4_SWAP (0x10)
  const commands = encodePacked(['uint8'], [Commands.V4_SWAP])

  // Universal Router inputs array
  const inputs: `0x${string}`[] = [v4SwapData]

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

  // Set deadline (20 minutes from now)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60)

  try {
    // First simulate to get better error messages
    // No msg.value needed since we're swapping ERC20 tokens (including wrapped WETH)
    await publicClient.simulateContract({
      address: routerAddress,
      abi: routerAbi,
      functionName: 'execute',
      args: [commands, inputs, deadline],
      value: isInputNative ? amountIn : 0n,
      account: wallet.account,
    })

    // If simulation passes, execute the swap
    const txHash = await wallet.writeContract({
      address: routerAddress,
      abi: routerAbi,
      functionName: 'execute',
      args: [commands, inputs, deadline],
      value: isInputNative ? amountIn : 0n,
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
