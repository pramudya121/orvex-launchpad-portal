import { describe, it, expect } from "vitest";
import { CURVE, initialReserves, quoteBuy, quoteSell, spotPrice, progress } from "@/lib/curve";

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
    expect(spotPrice(q.next)).toBeGreaterThan(spotPrice(r));
  });

  it("buy then sell returns less than paid (fees, no free money)", () => {
    const b = quoteBuy(initialReserves(), 10);
    const s = quoteSell(b.next, b.tokenAmount);
    expect(s.baseAmount).toBeLessThan(10);
    expect(s.next.tokensSold).toBeCloseTo(0, 3);
  });

  it("caps buys at the 800M curve supply and reaches 100% progress", () => {
    const q = quoteBuy(initialReserves(), 10_000);
    expect(q.capped).toBe(true);
    expect(q.next.tokensSold).toBe(CURVE.curveSupply);
    expect(progress(q.next)).toBe(100);
  });

  it("rejects selling more than sold on the curve", () => {
    expect(() => quoteSell(initialReserves(), 1)).toThrow();
  });
});
