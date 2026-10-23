/** "1.5" with 6 decimals → 1500000n. Returns null for anything that is not a positive decimal that fits. */
export function toBaseUnits(value: string, decimals: number): bigint | null {
  const match = /^(\d+)(?:\.(\d*))?$/.exec(value.trim())
  if (!match) return null
  const [, whole = '', fraction = ''] = match
  if (fraction.length > decimals) return null
  const units = BigInt(whole + fraction.padEnd(decimals, '0'))
  return units > 0n ? units : null
}

/** 1500000n with 6 decimals → "1.5". */
export function fromBaseUnits(units: bigint | string, decimals: number): string {
  const digits = BigInt(units)
    .toString()
    .padStart(decimals + 1, '0')
  const whole = digits.slice(0, digits.length - decimals)
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole
}
