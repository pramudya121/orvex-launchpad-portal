export function liquidityDeposit(a: bigint, b: bigint, reserveA: bigint, reserveB: bigint) {
  if (a <= 0n || b <= 0n) throw new Error("Enter both token amounts");
  if (reserveA === 0n && reserveB === 0n) return [a, b] as const;
  if (reserveA <= 0n || reserveB <= 0n) throw new Error("Invalid pool reserves");
  const optimalB = a * reserveB / reserveA;
  const result = optimalB <= b ? [a, optimalB] as const : [b * reserveA / reserveB, b] as const;
  if (result[0] <= 0n || result[1] <= 0n) throw new Error("Deposit too small");
  return result;
}
export function liquidityWithdrawal(lp: bigint, supply: bigint, reserveA: bigint, reserveB: bigint) {
  if (lp <= 0n || supply <= 0n || lp > supply) throw new Error("Invalid LP amount");
  return [lp * reserveA / supply, lp * reserveB / supply] as const;
}
export function liquidityPercent(balance: bigint, percent: number) {
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) throw new Error("Invalid withdrawal percentage");
  return balance * BigInt(percent) / 100n;
}