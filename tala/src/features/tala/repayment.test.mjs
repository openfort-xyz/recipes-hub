// node --test: checks the on-chain repayment check without a chain.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { encodeAbiParameters, pad, toEventSelector } from 'viem'
import { repaidAmount } from './repayment.ts'

const token = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const from = '0x1111111111111111111111111111111111111111'
const to = '0x2222222222222222222222222222222222222222'
const topic = toEventSelector('Transfer(address,address,uint256)')

const transfer = (address, src, dst, value) => ({
  address,
  topics: [topic, pad(src), pad(dst)],
  data: encodeAbiParameters([{ type: 'uint256' }], [value]),
})

test('sums matching USDC transfers only', () => {
  const logs = [
    transfer(token, from, to, 5_000_000n),
    transfer(token, from, to, 250_000n),
    transfer(token, to, from, 1_000_000n), // wrong direction
    transfer('0x3333333333333333333333333333333333333333', from, to, 9_000_000n), // other token
  ]
  assert.equal(repaidAmount({ status: 'success', logs }, { token, from, to }), 5_250_000n)
})

test('a reverted transaction repays nothing', () => {
  const logs = [transfer(token, from, to, 5_000_000n)]
  assert.equal(repaidAmount({ status: 'reverted', logs }, { token, from, to }), 0n)
})
