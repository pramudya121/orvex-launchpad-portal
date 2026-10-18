import { describe, it, expect } from "vitest";
import { quoteBuy, quoteSell, spotPrice, progress, type Reserves } from "@/lib/curve";

const initialReserves = (): Reserves => ({
  virtualBase: 30, virtualToken: 1_073_000_000, tokensSold: 0,
  realBase: 0, saleSupply: 800_000_000, totalSupply: 1_000_000_000, feeBps: 100,
});

describe("bonding curve", () => {
  it("starts at 30 / 1.073B zkLTC per token", () => {
    expect(spotPrice(initialReserves())).toBeCloseTo(30 / 1_073_000_000, 15);
  });

  it("charges a 1% fee on buys", () => {
    expect(quoteBuy(initialReserves(), 1).fee).toBeCloseTo(0.01, 10);
  });

  it("price goes up after a buy", () => {
    const r = initialReserves();
    const q = quoteBuy(r, 5);
    expect(q.priceImpact).toBeGreaterThan(0);
  });

  it("buy then sell returns less than paid (fees, no free money)", () => {
    const r = initialReserves();
    const b = quoteBuy(r, 10);
    const afterBuy = { ...r, virtualBase: r.virtualBase + b.baseAmount - b.fee, virtualToken: r.virtualToken - b.tokenAmount, tokensSold: b.tokenAmount, realBase: b.baseAmount - b.fee };
    const s = quoteSell(afterBuy, b.tokenAmount);
    expect(s.baseAmount).toBeLessThan(10);
    expect(afterBuy.tokensSold - s.tokenAmount).toBeCloseTo(0, 3);
  });

  it("caps buys at the 800M curve supply and reaches 100% progress", () => {
    const q = quoteBuy(initialReserves(), 10_000);
    expect(q.capped).toBe(true);
    expect(q.tokenAmount).toBe(800_000_000);
    expect(progress({ ...initialReserves(), tokensSold: q.tokenAmount })).toBe(100);
  });

  it("rejects selling more than sold on the curve", () => {
    expect(() => quoteSell(initialReserves(), 1)).toThrow();
  });
});
