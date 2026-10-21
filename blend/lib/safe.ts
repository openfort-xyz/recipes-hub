import type { ActionPlan } from '@blend-money/node'
import { concat, encodeFunctionData, encodePacked, type Hex, pad, parseAbi, size, zeroAddress } from 'viem'

// Safe v1.4.1 MultiSend, the contract Blend's own executor batches withdrawals through.
export const MULTISEND = '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526'

const safeAbi = parseAbi([
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool)',
  'function multiSend(bytes transactions) payable',
])

/**
 * Turn one Blend action plan into calls for an Openfort sponsored transaction.
 *
 * - `direct` (deposit): the approve + deposit transactions, batched as-is from the owner EOA.
 * - `multisend` (withdraw): Blend's calls packed into a MultiSend, executed by the owner
 *   through `Safe.execTransaction`. Blend's SDK sends the same batch as an EntryPoint v0.7
 *   UserOperation; calling the Safe directly as its 1/1 owner reaches the same state with no
 *   bundler, so Openfort's fee sponsorship pays the gas.
 */
export function toInteractions(plan: ActionPlan, safeAddress: Hex, owner: Hex) {
  if (plan.deployType === 'direct') {
    return [...plan.requiredApprovals, ...plan.requiredTxns].map((t) => ({
      to: t.to,
      data: t.data,
      value: t.value.toString(),
    }))
  }
  const transactions = concat(
    plan.requiredTxns.map((t) =>
      encodePacked(
        ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
        [t.isDelegateCall ? 1 : 0, t.to, t.value, BigInt(size(t.data)), t.data]
      )
    )
  )
  // Pre-validated signature: r = owner, s = 0, v = 1. The Safe accepts it because msg.sender is that owner.
  const signatures = concat([pad(owner), pad('0x0'), '0x01'])
  const data = encodeFunctionData({
    abi: safeAbi,
    functionName: 'execTransaction',
    args: [
      MULTISEND,
      0n,
      encodeFunctionData({ abi: safeAbi, functionName: 'multiSend', args: [transactions] }),
      1, // delegatecall into MultiSend, so each inner call runs as the Safe
      0n,
      0n,
      0n,
      zeroAddress,
      zeroAddress,
      signatures,
    ],
  })
  return [{ to: safeAddress, data, value: '0' }]
}
