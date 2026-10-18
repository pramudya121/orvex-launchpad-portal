import { describe, expect, it } from "vitest";
import { findLaunchBlock, scanWindow } from "../lib/chain-index";

describe("chain history checkpoints", () => {
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