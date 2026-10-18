import { describe, expect, it } from "vitest";
import { supplyAllocation } from "@/lib/supply";

describe("Contract supply allocations", () => {
  it("derives percentages from the contract instead of assuming fixed allocations", () => {
    expect(supplyAllocation(1000n, 750n, 250n)).toEqual({ total: 1000n, salePercent: 75, lpPercent: 25 });
  });
  it("rejects allocations exceeding total supply", () => {
    expect(() => supplyAllocation(1000n, 800n, 300n)).toThrow();
  });
});