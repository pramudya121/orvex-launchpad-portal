import { describe, expect, it, vi } from "vitest";
import { ensureChain } from "../lib/web3/client";
import { litvm } from "../lib/web3/chain";

describe("wallet chain verification", () => {
  it("rejects a wallet that reports switching but remains on another chain", async () => {
    const request = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce("0x1");
    await expect(ensureChain({ request, on: vi.fn(), removeListener: vi.fn() })).rejects.toThrow("Switch your wallet");
  });
  it("accepts only the configured LiteForge chain after switching", async () => {
    const request = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(`0x${litvm.id.toString(16)}`);
    await expect(ensureChain({ request, on: vi.fn(), removeListener: vi.fn() })).resolves.toBeUndefined();
  });
  it("does not accept a rejected network switch", async () => {
    const request = vi.fn().mockRejectedValueOnce({ code: 4001 });
    await expect(ensureChain({ request, on: vi.fn(), removeListener: vi.fn() })).rejects.toEqual({ code: 4001 });
  });
});