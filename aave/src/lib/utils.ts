export const formatUsdcBalance = (balance: bigint | undefined) => {
  if (!balance) return '0.000000';
  const decimals = 6;
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const remainder = balance % divisor;
  const fractional = remainder.toString().padStart(decimals, '0');
  return `${whole.toString()}.${fractional}`;
};