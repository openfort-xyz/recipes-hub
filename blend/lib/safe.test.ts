import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ActionPlan } from '@blend-money/node'
import { decodeFunctionData, parseAbi, size } from 'viem'
import { MULTISEND, toInteractions } from './safe.ts'

const owner = '0x1111111111111111111111111111111111111111'
const safe = '0x2222222222222222222222222222222222222222'
const vault = '0x3333333333333333333333333333333333333333'
const reset = '0x4444444444444444444444444444444444444444'
const abi = parseAbi([
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool)',
  'function multiSend(bytes transactions) payable',
])
const txn = (to: `0x${string}`, data: `0x${string}`, isDelegateCall?: boolean) =>
  ({ to, data, value: 0n, chainId: 8453, account: safe, isDelegateCall }) as const

test('direct plans pass approvals then txns through unchanged', () => {
  const plan: ActionPlan = {
    deployType: 'direct',
    chainId: 8453,
    requiredApprovals: [txn(vault, '0xaa')],
    requiredTxns: [txn(vault, '0xbbbb')],
  }
  assert.deepEqual(toInteractions(plan, safe, owner), [
    { to: vault, data: '0xaa', value: '0' },
    { to: vault, data: '0xbbbb', value: '0' },
  ])
})

test('multisend plans become one owner execTransaction delegatecalling MultiSend', () => {
  const plan: ActionPlan = {
    deployType: 'multisend',
    chainId: 8453,
    requiredApprovals: [],
    requiredTxns: [txn(reset, '0x01', true), txn(vault, '0xdeadbeef')],
  }
  const [call] = toInteractions(plan, safe, owner)
  assert.equal(call.to, safe)
  const { functionName, args } = decodeFunctionData({ abi, data: call.data })
  assert.equal(functionName, 'execTransaction')
  const [to, , inner, operation, , , , , , signatures] = args as readonly unknown[]
  assert.equal(to, MULTISEND)
  assert.equal(operation, 1)
  assert.equal(signatures, `0x${'0'.repeat(24)}${owner.slice(2)}${'0'.repeat(64)}01`)
  const packed = decodeFunctionData({ abi, data: inner as `0x${string}` }).args[0] as `0x${string}`
  // Each packed call: 1 (op) + 20 (to) + 32 (value) + 32 (length) + data bytes.
  assert.equal(size(packed), 85 + 1 + 85 + 4)
  assert.equal(packed.slice(2, 4), '01') // first call is the delegatecall
  assert.equal(packed.slice(174, 176), '00') // second call starts at byte 86
})
