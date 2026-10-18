// Quote math for the on-chain BondingCurve contracts (virtual constant-product reserves).
// The contract is the source of truth; these quotes are only previews and every
// transaction carries a slippage-protected minimum output.
export const CURVE = {
  baseUsd: 85, // indicative zkLTC price in USD (until a price oracle is wired)
  slippage: 0.05,
} as const;

/** virtualBase = vEth, virtualToken = vToken, tokensSold = sold on curve, realBase = rEth (zkLTC raised). */
export type Reserves = { virtualBase: number; virtualToken: number; tokensSold: number; realBase: number; saleSupply: number; totalSupply: number; feeBps: number };

export const spotPrice = (r: Reserves) => (r.virtualToken > 0 ? r.virtualBase / r.virtualToken : 0);
export const progress = (r: Reserves) => (r.saleSupply > 0 ? Math.min(100, (r.tokensSold / r.saleSupply) * 100) : 0);
export const marketCapBase = (r: Reserves) => spotPrice(r) * r.totalSupply;

export type Quote = { baseAmount: number; tokenAmount: number; fee: number; price: number; priceImpact: number; capped: boolean };

/** Buy with `baseIn` zkLTC (fee included). Caps at the remaining curve supply. */
export function quoteBuy(r: Reserves, baseIn: number): Quote {
  if (!(baseIn > 0)) throw new Error("Amount must be positive");
  const remaining = r.saleSupply - r.tokensSold;
  if (remaining <= 0) throw new Error("Curve completed");
  const fee = (baseIn * r.feeBps) / 10_000;
  const net = baseIn - fee;
  let tokensOut = (net * r.virtualToken) / (r.virtualBase + net);
  const capped = tokensOut > remaining;
  if (capped) tokensOut = remaining;
  const nextPrice = (r.virtualBase + net) / (r.virtualToken - tokensOut);
  return { baseAmount: baseIn, tokenAmount: tokensOut, fee, price: net / tokensOut, priceImpact: (nextPrice / spotPrice(r) - 1) * 100, capped };
}

/** Sell `tokensIn` tokens back to the curve. */
export function quoteSell(r: Reserves, tokensIn: number): Quote {
  if (!(tokensIn > 0)) throw new Error("Amount must be positive");
  if (tokensIn > r.tokensSold) throw new Error("Not enough liquidity on curve");
  const gross = (tokensIn * r.virtualBase) / (r.virtualToken + tokensIn);
  const fee = (gross * r.feeBps) / 10_000;
  const nextPrice = (r.virtualBase - gross) / (r.virtualToken + tokensIn);
  return { baseAmount: gross - fee, tokenAmount: tokensIn, fee, price: gross / tokensIn, priceImpact: (nextPrice / spotPrice(r) - 1) * 100, capped: false };
}
