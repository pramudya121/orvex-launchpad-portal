import { describe, expect, it } from "vitest";
import {
  assetKey,
  minimumOutput,
  transactionAmount,
  validateSwapPath,
} from "../lib/web3/trade-safety";

describe("transaction bounds", () => {
  it("keeps 18-decimal amounts exact", () => {
    expect(transactionAmount("123456789.123456789123456789")).toBe(123456789123456789123456789n);
  });
  it("rejects zero, negative, scientific and excessive-precision amounts", () => {
    for (const amount of ["0", "-1", "1e21", "0.0000000000000000001"])
      expect(() => transactionAmount(amount)).toThrow();
  });
  it("protects 1 percent slippage with integer units", () => {
    expect(minimumOutput(1000000000000000001n, 100)).toBe(990000000000000000n);
    expect(() => minimumOutput(1n, 500)).toThrow();
  });
  it("identifies same-symbol assets by address and rejects mismatched routes", () => {
    const a = "0x0000000000000000000000000000000000000001";
    const b = "0x0000000000000000000000000000000000000002";
    expect(assetKey(a)).not.toBe(assetKey(b));
    expect(() => validateSwapPath(null, b, a, [a, b])).not.toThrow();
    expect(() => validateSwapPath(null, b, a, [b, a])).toThrow();
  });
});
