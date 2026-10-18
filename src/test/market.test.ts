import { describe, it, expect } from "vitest";
import { activeHolders, filterMarket } from "@/lib/market";
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
