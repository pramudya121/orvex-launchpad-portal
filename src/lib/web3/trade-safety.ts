import { parseUnits, type Address } from "viem";

/** Exact decimal inputs; never silently round a transaction amount. */
export function transactionAmount(value: number | string, decimals = 18): bigint {
  const text = String(value);
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error("Enter a plain positive decimal amount");
  const fraction = text.split(".")[1] ?? "";
  if (fraction.length > decimals) throw new Error(`Use at most ${decimals} decimal places`);
  const amount = parseUnits(text, decimals);
  if (amount <= 0n) throw new Error("Amount must be positive");
  return amount;
}

export function minimumOutput(amount: bigint, slippageBps: number): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps >= 10_000)
    throw new Error("Invalid slippage tolerance");
  const result = amount * BigInt(10_000 - slippageBps) / 10_000n;
  if (result <= 0n) throw new Error("Output is too small to protect this trade");
  return result;
}

export const assetKey = (address: Address | null) => address?.toLowerCase() ?? "native";

export function validateSwapPath(from: Address | null, to: Address | null, wrapped: Address, path: Address[]) {
  if (assetKey(from) === assetKey(to)) throw new Error("Pick two different tokens");
  if (path.length < 2 || path.length > 3 ||
      assetKey(path[0] ?? null) !== assetKey(from ?? wrapped) ||
      assetKey(path[path.length - 1] ?? null) !== assetKey(to ?? wrapped))
    throw new Error("Swap route changed; request a fresh quote");
}