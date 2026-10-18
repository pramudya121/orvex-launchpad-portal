import { describe, expect, it } from "vitest";
import { launchpadAbi } from "@/lib/web3/abi";
import { CURVE } from "@/lib/curve";
import { readFileSync } from "node:fs";

describe("contract ↔ curve parity", () => {
  const sol = readFileSync("contracts/OrvexLaunchpad.sol", "utf8");
  it("uses the same curve constants as curve.ts", () => {
    expect(sol).toContain(`INIT_VIRTUAL_BASE = ${CURVE.initVirtualBase} ether`);
    expect(sol).toContain("INIT_VIRTUAL_TOKEN = 1_073_000_000 ether");
    expect(sol).toContain("CURVE_SUPPLY = 800_000_000 ether");
    expect(sol).toContain(`FEE_BPS = ${CURVE.feeRate * 10_000}`);
  });
  it("ABI exposes trading entry points", () => {
    const names = launchpadAbi.map((x) => ("name" in x ? x.name : ""));
    for (const n of ["createToken", "buy", "sell", "TokenCreated", "Trade", "Graduated"]) expect(names).toContain(n);
  });
});
