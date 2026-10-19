import { describe, expect, it, vi } from "vitest";
import { parseEther } from "viem";

vi.mock("../lib/web3/actions", () => ({ tokenBalance: vi.fn() }));
import { tokenBalance } from "../lib/web3/actions";
import { tradeBalanceQuery, sellBalancePreset, tradeBalanceError } from "../lib/web3/trade-balances";

const account = "0x0000000000000000000000000000000000000001";
const token = "0x0000000000000000000000000000000000000002";

describe("token trade balances", () => {
  it("reads native zkLTC directly for Buy", async () => {
    vi.mocked(tokenBalance).mockResolvedValueOnce(parseEther("1.25"));
    const query = tradeBalanceQuery(account, null);
    expect(await query.queryFn()).toBe(parseEther("1.25"));
    expect(tokenBalance).toHaveBeenLastCalledWith(account, null);
  });
  it("reads the selected ERC20 directly for Sell", async () => {
    vi.mocked(tokenBalance).mockResolvedValueOnce(parseEther("123.456"));
    expect(await tradeBalanceQuery(account, token).queryFn()).toBe(parseEther("123.456"));
    expect(tokenBalance).toHaveBeenLastCalledWith(account, token);
  });
  it("isolates wallet accounts and assets and disables disconnected reads", () => {
    expect(tradeBalanceQuery(account, null).queryKey).not.toEqual(tradeBalanceQuery(account, token).queryKey);
    expect(tradeBalanceQuery(account, token).queryKey).not.toEqual(tradeBalanceQuery(token, token).queryKey);
    expect(tradeBalanceQuery(null, token).enabled).toBe(false);
  });
  it("preserves all units for Max and floors fractional sell presets", () => {
    const balance = parseEther("0.123456789123456789");
    expect(sellBalancePreset(balance, 100)).toBe("0.123456789123456789");
    expect(sellBalancePreset(balance, 25)).toBe("0.030864197280864197");
    expect(sellBalancePreset(balance, 50)).toBe("0.061728394561728394");
  });
  it("rejects overspending by one unit and does not treat missing balance as zero", () => {
    expect(tradeBalanceError("1.000000000000000001", parseEther("1"), "zkLTC")).toBe("Insufficient zkLTC balance");
    expect(tradeBalanceError("1", parseEther("1"), "ITACHI")).toBeNull();
    expect(tradeBalanceError("1", undefined, "ITACHI")).toBe("Balance unavailable");
  });
});