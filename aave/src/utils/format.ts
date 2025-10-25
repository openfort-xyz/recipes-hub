export function formatSupplyBalance(rawBalance: string | null | undefined): string {
  if (!rawBalance) {
    return "0.00";
  }

  const numeric = Number.parseFloat(rawBalance);
  if (Number.isNaN(numeric)) {
    return "0.00";
  }

  return numeric.toFixed(6);
}
