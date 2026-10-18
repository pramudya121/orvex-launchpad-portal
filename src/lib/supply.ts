/** Display allocations read from deployed curve constants, never transaction quotes. */
export function supplyAllocation(total: bigint, sale: bigint, lp: bigint) {
  if (total <= 0n || sale < 0n || lp < 0n || sale + lp > total)
    throw new Error("Invalid contract supply allocation");
  return {
    total,
    salePercent: Number(sale * 10_000n / total) / 100,
    lpPercent: Number(lp * 10_000n / total) / 100,
  };
}