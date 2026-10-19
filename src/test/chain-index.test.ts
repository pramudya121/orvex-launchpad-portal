import { describe, expect, it } from "vitest";
import { factoryDiscoveryPage, findLaunchBlock, scanWindow } from "../lib/chain-index";

describe("chain history checkpoints", () => {
  it("bounds factory discovery and resumes after the first page", () => {
    expect(factoryDiscoveryPage(0, 1000).indexes).toEqual(Array.from({ length: 12 }, (_, i) => i));
    expect(factoryDiscoveryPage(12, 1000).indexes[0]).toBe(12);
    expect(factoryDiscoveryPage(996, 1000)).toEqual({ indexes: [996, 997, 998, 999], next: 0 });
    expect(factoryDiscoveryPage(0, 0)).toEqual({ indexes: [], next: 0 });
  });
  it("starts at deployment rather than scanning millions of pre-launch blocks", () => {
    expect(scanWindow(0n, 62_000_000n, 62_020_000n)).toEqual({ from: 62_000_000n, end: 62_009_000n });
  });
  it("replays the checkpoint boundary for deduplicated retries", () => {
    expect(scanWindow(62_009_000n, 62_000_000n, 62_010_000n)).toEqual({ from: 62_009_000n, end: 62_010_000n });
  });
  it("does not query future ranges", () => {
    expect(scanWindow(100n, 80n, 99n)).toBeNull();
  });
  it("locates the earliest block with the factory timestamp", async () => {
    const timestamps = [0n, 10n, 20n, 20n, 30n];
    expect(await findLaunchBlock(20n, 4n, async (b) => timestamps[Number(b)] ?? 0n)).toBe(2n);
  });
});