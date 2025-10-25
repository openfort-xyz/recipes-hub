export const formatUsdcBalance = (balance: bigint | undefined) => {
  if (balance === undefined) return '...';

  const decimals = 6;
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = balance / divisor;
  const fraction = balance % divisor;
  const fractional = fraction.toString().padStart(decimals, '0');

  return `${whole.toString()}.${fractional}`;
};
