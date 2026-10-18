import { describe, expect, it } from "vitest";
import { decodeLogo, LOGO_MAX_BYTES, validateLogoSize } from "../lib/logo-upload";
import { pageWindow, POOL_PAGE_SIZE, TOKEN_PAGE_SIZE } from "../lib/pagination";
import { liquidityDeposit, liquidityWithdrawal, liquidityPercent } from "../lib/web3/liquidity-math";
describe("logo limits", () => {
  it("accepts exactly 2MiB and rejects larger/empty uploads", () => {
    expect(LOGO_MAX_BYTES).toBe(2097152);
    expect(() => validateLogoSize(2097152, "image/png")).not.toThrow();
    expect(() => validateLogoSize(2097153, "image/png")).toThrow();
    expect(() => validateLogoSize(0, "image/png")).toThrow();
  });
  it("checks decoded bytes and image signatures", () => {
    expect(() => decodeLogo(btoa("not an image"), "image/png")).toThrow();
    const bytes = new Uint8Array(LOGO_MAX_BYTES + 1); bytes.set([137,80,78,71,13,10,26,10]);
    const b64 = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
    expect(() => decodeLogo(b64, "image/png")).toThrow();
    expect(decodeLogo(btoa(String.fromCharCode(137,80,78,71,13,10,26,10)), "image/png").length).toBe(8);
  });
});
describe("incremental lists", () => {
  it("bounds pages and reaches items beyond the old 50-pool cap without overlap", () => {
    expect(TOKEN_PAGE_SIZE).toBe(24); expect(POOL_PAGE_SIZE).toBe(10);
    const ids = Array.from({length: 7}, (_,i) => pageWindow(i * 10, 63,10)).flat();
    expect(ids).toEqual(Array.from({length:63}, (_,i) => i));
    expect(pageWindow(70,63,10)).toEqual([]);
  });
});
describe("liquidity amounts", () => {
  it("uses reserve ratio rather than both desired amounts", () => {
    expect(liquidityDeposit(100n,500n,1000n,2000n)).toEqual([100n,200n]);
    expect(liquidityDeposit(100n,50n,1000n,2000n)).toEqual([25n,50n]);
    expect(liquidityDeposit(100n,500n,0n,0n)).toEqual([100n,500n]);
  });
  it("withdraws proportionally with integer LP units", () => {
    expect(liquidityWithdrawal(25n,100n,1000n,2000n)).toEqual([250n,500n]);
    expect(liquidityPercent(123n,100)).toBe(123n);
    expect(liquidityPercent(123n,25)).toBe(30n);
    expect(() => liquidityWithdrawal(101n,100n,1000n,2000n)).toThrow();
  });
});