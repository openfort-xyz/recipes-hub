import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isAuthorized, parseUsdcAmount } from './validate.ts'

test('parseUsdcAmount converts to 6-decimal units', () => {
  assert.equal(parseUsdcAmount('1'), '1000000')
  assert.equal(parseUsdcAmount('100.5'), '100500000')
  assert.equal(parseUsdcAmount('0.000001'), '1')
})

test('parseUsdcAmount rejects zero, negatives, extra decimals and non-strings', () => {
  for (const bad of ['0', '0.0', '-1', '1.0000001', '1e6', '', ' 1', 1]) {
    assert.equal(parseUsdcAmount(bad), null, String(bad))
  }
})

test('isAuthorized requires a configured token and an exact bearer match', () => {
  assert.equal(isAuthorized('Bearer secret', 'secret'), true)
  assert.equal(isAuthorized('Bearer secre', 'secret'), false)
  assert.equal(isAuthorized('secret', 'secret'), false)
  assert.equal(isAuthorized(null, 'secret'), false)
  assert.equal(isAuthorized('Bearer ', ''), false)
  assert.equal(isAuthorized('Bearer x', undefined), false)
})
