import { describe, it, expect } from "vitest";
import { activeHolders, filterMarket, windowChange, windowVolume } from "@/lib/market";
import type { TokenView } from "@/lib/launchpad.functions";
const token = (id: string, graduated = false): TokenView => ({
  id,
  address: `0x${id}`,
  curveAddress: null,
  pairAddress: null,
  name: id,
  symbol: id,
  description: "",
  logoUrl: null,
  creator: "0xcreator",
  createdAt: "2026-10-18T00:00:00Z",
  twitter: null,
  telegram: null,
  website: null,
  price: 1,
  priceUsd: 85,
  marketCapUsd: 100,
  progress: 20,
  realBase: 1,
  graduated,
  maxBuy: null,
  change24h: 0,
  change7d: 0,
  volume7dUsd: 0,
  trades7d: 0,
  volume24hUsd: 0,
  trades24h: 0,
  holders: 0,
  reserves: {
    virtualBase: 30,
    virtualToken: 1000,
    tokensSold: 0,
    realBase: 0,
    saleSupply: 800,
    totalSupply: 1000,
    feeBps: 100,
  },
});
describe("market controls", () => {
  it("All uses lifetime volume and change instead of 24H or 7D", () => {
    const t = { ...token("A"), volumeAllUsd: 850, volume24hUsd: 85, volume7dUsd: 170, changeAll: 40, change24h: 2, change7d: 8 };
    expect(windowVolume(t, "all")).toBe(850);
    expect(windowChange(t, "all")).toBe(40);
    expect(windowVolume(t, "24h")).toBe(85);
    expect(windowVolume(t, "7d")).toBe(170);
  });
  it("All volume sorting uses lifetime activity", () => {
    const a = { ...token("A"), volumeAllUsd: 850, volume24hUsd: 0 };
    const b = { ...token("B"), volumeAllUsd: 85, volume24hUsd: 85 };
    expect(filterMarket([b,a], "", "vol", "all", [], "all").map(t => t.id)).toEqual(["A", "B"]);
  });
  it("filters grid and table with the same curve state", () =>
    expect(
      filterMarket([token("A"), token("B", true)], "", "new", "curve").map((t) => t.id),
    ).toEqual(["A"]));
  it("watchlist returns only saved tokens", () =>
    expect(
      filterMarket([token("A"), token("B")], "", "new", "favorites", ["B"]).map((t) => t.id),
    ).toEqual(["B"]));
  it("search includes contract addresses", () =>
    expect(filterMarket([token("A"), token("B")], "0xb", "new", "all").map((t) => t.id)).toEqual([
      "B",
    ]));
  it("does not count a trader who sold the full balance as a holder", () =>
    expect(
      activeHolders([
        { trader: "0xA", side: "buy", tokenAmount: 100 },
        { trader: "0xa", side: "sell", tokenAmount: 100 },
        { trader: "0xb", side: "buy", tokenAmount: 1 },
      ]),
    ).toBe(1));
});
