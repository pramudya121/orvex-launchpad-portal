import type { TokenView } from "./launchpad.functions";

export const MARKET_SORTS = ["new", "mc", "vol", "prog", "change", "old"] as const;
export type MarketSort = (typeof MARKET_SORTS)[number];
export const MARKET_WINDOWS = ["24h", "7d"] as const;
export type MarketWindow = (typeof MARKET_WINDOWS)[number];
export const windowChange = (t: TokenView, w: MarketWindow) => (w === "7d" ? t.change7d : t.change24h);
export const windowVolume = (t: TokenView, w: MarketWindow) => (w === "7d" ? t.volume7dUsd : t.volume24hUsd);
export function filterMarket(
  tokens: TokenView[],
  search: string,
  sort: MarketSort,
  stage: string,
  favorites?: string[],
  win: MarketWindow = "24h",
) {
  const q = search.trim().toLowerCase();
  return tokens
    .filter(
      (t) =>
        (!q || `${t.name} ${t.symbol} ${t.address}`.toLowerCase().includes(q)) &&
        (stage !== "curve" || !t.graduated) &&
        (stage !== "graduated" || t.graduated) &&
        (stage !== "favorites" || favorites?.includes(t.id)),
    )
    .sort((a, b) => {
      if (sort === "mc") return b.marketCapUsd - a.marketCapUsd;
      if (sort === "vol") return windowVolume(b, win) - windowVolume(a, win);
      if (sort === "prog") return b.progress - a.progress;
      if (sort === "change") return windowChange(b, win) - windowChange(a, win);
      return (sort === "old" ? 1 : -1) * (+new Date(a.createdAt) - +new Date(b.createdAt));
    });
}

export function activeHolders(trades: { trader: string; side: string; tokenAmount: number }[]) {
  const balances = new Map<string, number>();
  for (const t of trades)
    balances.set(
      t.trader.toLowerCase(),
      (balances.get(t.trader.toLowerCase()) ?? 0) + (t.side === "buy" ? 1 : -1) * t.tokenAmount,
    );
  return [...balances.values()].filter((b) => b > 1e-6).length;
}
