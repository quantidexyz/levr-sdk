import { beforeAll, describe, expect, it } from 'bun:test'
import { parseEther } from 'viem'

import { setupTest, type SetupTestReturnType } from './helper'

describe('#WETH_TEST', () => {
  // ---
  // VARIABLES (shared across tests)

  let publicClient: SetupTestReturnType['publicClient']
  let wallet: SetupTestReturnType['wallet']
  let chainId: SetupTestReturnType['chainId']
  let weth: SetupTestReturnType['weth']

  beforeAll(() => {
    ;({ publicClient, wallet, chainId, weth } = setupTest())
  })

  it('should deposit and withdraw WETH', async () => {
    const balanceBefore = await publicClient.readContract({
      address: weth.address,
      abi: weth.abi,
      functionName: 'balanceOf',
      args: [wallet.account.address],
    })

    console.log('Balance before:', balanceBefore.toString())
    console.log('Depositing 1 ETH...')
    const amount = parseEther('1')

    const tx = await wallet.writeContract({
      address: weth.address,
      abi: weth.abi,
      functionName: 'deposit',
      args: [],
      value: amount,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })

    const balanceAfter = await publicClient.readContract({
      address: weth.address,
      abi: weth.abi,
      functionName: 'balanceOf',
      args: [wallet.account.address],
    })

    console.log('Balance after:', balanceAfter.toString())
    expect(balanceAfter).toBe(balanceBefore + amount)

    console.log('Withdrawing 1 WETH...')
    const withdrawTx = await wallet.writeContract({
      address: weth.address,
      abi: weth.abi,
      functionName: 'withdraw',
      args: [amount],
    })

    const withdrawReceipt = await publicClient.waitForTransactionReceipt({ hash: withdrawTx })
    expect(withdrawReceipt.status).toBe('success')

    const balanceAfterWithdraw = await publicClient.readContract({
      address: weth.address,
      abi: weth.abi,
      functionName: 'balanceOf',
      args: [wallet.account.address],
    })
    console.log('Balance after withdraw:', balanceAfterWithdraw.toString())
    expect(balanceAfterWithdraw).toBe(balanceBefore)
  })
})
