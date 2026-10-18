// Constant-product bonding curve with virtual reserves (pump.fun style).
// Base asset = zkLTC on LitVM.
export const CURVE = {
  initVirtualBase: 30,
  initVirtualToken: 1_073_000_000,
  totalSupply: 1_000_000_000,
  curveSupply: 800_000_000, // tokens sold on the curve before graduation to DEX
  feeRate: 0.01,
  baseUsd: 85, // indicative zkLTC price in USD (until a price oracle is wired)
} as const;

export type Reserves = { virtualBase: number; virtualToken: number; tokensSold: number; realBase: number };

export const initialReserves = (): Reserves => ({
  virtualBase: CURVE.initVirtualBase,
  virtualToken: CURVE.initVirtualToken,
  tokensSold: 0,
  realBase: 0,
});

export const spotPrice = (r: Reserves) => r.virtualBase / r.virtualToken;
export const progress = (r: Reserves) => Math.min(100, (r.tokensSold / CURVE.curveSupply) * 100);
export const marketCapBase = (r: Reserves) => spotPrice(r) * CURVE.totalSupply;

export type Quote = { baseAmount: number; tokenAmount: number; fee: number; price: number; next: Reserves; priceImpact: number; capped: boolean };

/** Buy with `baseIn` zkLTC (fee included). Caps at remaining curve supply. */
export function quoteBuy(r: Reserves, baseIn: number): Quote {
  if (!(baseIn > 0)) throw new Error("Amount must be positive");
  const remaining = CURVE.curveSupply - r.tokensSold;
  if (remaining <= 0) throw new Error("Curve completed");
  const k = r.virtualBase * r.virtualToken;
  let net = baseIn * (1 - CURVE.feeRate);
  let tokensOut = r.virtualToken - k / (r.virtualBase + net);
  let capped = false;
  if (tokensOut > remaining) {
    tokensOut = remaining;
    net = k / (r.virtualToken - tokensOut) - r.virtualBase;
    capped = true;
  }
  const fee = capped ? net * CURVE.feeRate / (1 - CURVE.feeRate) : baseIn * CURVE.feeRate;
  const next: Reserves = {
    virtualBase: r.virtualBase + net,
    virtualToken: r.virtualToken - tokensOut,
    tokensSold: r.tokensSold + tokensOut,
    realBase: r.realBase + net,
  };
  const price = net / tokensOut;
  return { baseAmount: net + fee, tokenAmount: tokensOut, fee, price, next, priceImpact: (spotPrice(next) / spotPrice(r) - 1) * 100, capped };
}

/** Sell `tokensIn` tokens back to the curve. */
export function quoteSell(r: Reserves, tokensIn: number): Quote {
  if (!(tokensIn > 0)) throw new Error("Amount must be positive");
  if (tokensIn > r.tokensSold) throw new Error("Not enough liquidity on curve");
  const k = r.virtualBase * r.virtualToken;
  const gross = r.virtualBase - k / (r.virtualToken + tokensIn);
  const fee = gross * CURVE.feeRate;
  const next: Reserves = {
    virtualBase: r.virtualBase - gross,
    virtualToken: r.virtualToken + tokensIn,
    tokensSold: r.tokensSold - tokensIn,
    realBase: Math.max(0, r.realBase - gross),
  };
  return { baseAmount: gross - fee, tokenAmount: tokensIn, fee, price: gross / tokensIn, next, priceImpact: (spotPrice(next) / spotPrice(r) - 1) * 100, capped: false };
}
