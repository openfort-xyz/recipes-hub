import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fromBaseUnits, toBaseUnits } from './amounts.ts'

test('toBaseUnits parses decimals exactly', () => {
  assert.equal(toBaseUnits('1', 6), 1_000_000n)
  assert.equal(toBaseUnits('1.5', 6), 1_500_000n)
  assert.equal(toBaseUnits('0.000000001', 9), 1n)
  assert.equal(toBaseUnits(' 2. ', 6), 2_000_000n)
})

test('toBaseUnits rejects zero, negatives, junk and excess precision', () => {
  for (const bad of ['', '0', '0.0', '-1', '1e3', 'abc', '1.2.3', '0.0000001']) {
    assert.equal(toBaseUnits(bad, 6), null, bad)
  }
})

test('fromBaseUnits formats without float rounding', () => {
  assert.equal(fromBaseUnits(4_617_144n, 9), '0.004617144')
  assert.equal(fromBaseUnits('1500000', 6), '1.5')
  assert.equal(fromBaseUnits(0n, 6), '0')
  assert.equal(fromBaseUnits(123_000_000_000n, 9), '123')
})
