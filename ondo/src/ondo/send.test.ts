import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getBase58Decoder } from '@solana/kit'
import { toEd25519Signature } from './send.ts'

const b58 = (n: number) => getBase58Decoder().decode(new Uint8Array(n).fill(7))

test('toEd25519Signature keeps 64-byte signatures and trims a recovery byte', () => {
  assert.equal(toEd25519Signature(b58(64)).length, 64)
  assert.equal(toEd25519Signature(b58(65)).length, 64)
})

test('toEd25519Signature rejects other lengths', () => {
  assert.throws(() => toEd25519Signature(b58(32)), /32 bytes/)
})
