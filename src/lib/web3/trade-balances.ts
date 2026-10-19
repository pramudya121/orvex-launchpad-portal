import { queryOptions } from "@tanstack/react-query";
import { formatUnits, type Address } from "viem";
import { tokenBalance } from "./actions";
import { assetKey, transactionAmount } from "./trade-safety";
import { litvm } from "./chain";

export function tradeBalanceQuery(account: Address | null, token: Address | null) {
  return queryOptions({
    queryKey: ["trade-balance", litvm.id, account?.toLowerCase() ?? null, assetKey(token)],
    queryFn: () => {
      if (!account) throw new Error("Connect wallet to read balance");
      return tokenBalance(account, token);
    },
    enabled: Boolean(account),
    staleTime: 0,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/** Launch tokens and native zkLTC use 18 decimals; percentages must never round up. */
export function sellBalancePreset(balance: bigint, percent: 25 | 50 | 100) {
  return formatUnits((balance * BigInt(percent)) / 100n, 18);
}

export function tradeBalanceError(amount: string, balance: bigint | undefined, symbol: string) {
  if (balance === undefined) return "Balance unavailable";
  try {
    return transactionAmount(amount) > balance ? `Insufficient ${symbol} balance` : null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid amount";
  }
}