import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { LayoutGrid, List, Search, X, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { tokensQuery } from "@/lib/queries";
import { filterMarket, MARKET_SORTS, MARKET_WINDOWS, type MarketSort, type MarketWindow } from "@/lib/market";
import { TokenCard, TokenCardSkeleton } from "@/components/orvex/TokenCard";
import { MarketTable } from "@/components/orvex/MarketTable";
import { MarketStatus } from "@/components/orvex/MarketStatus";
import { useWatchlist } from "@/components/orvex/Watchlist";
import { MarketError, MarketNotFound } from "@/components/orvex/RouteFeedback";

export const Route = createFileRoute("/explore")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { q?: string; sort?: MarketSort; stage?: string; view?: "grid" | "list"; win?: MarketWindow } => ({
    q: typeof s["q"] === "string" ? s["q"] : "",
    sort: MARKET_SORTS.includes(s["sort"] as MarketSort)
      ? (s["sort"] as MarketSort)
      : ("new" as MarketSort),
    stage: ["all", "curve", "graduated", "favorites"].includes(String(s["stage"]))
      ? String(s["stage"])
      : "all",
    view: s["view"] === "list" ? ("list" as const) : ("grid" as const),
    win: MARKET_WINDOWS.includes(s["win"] as MarketWindow) ? (s["win"] as MarketWindow) : ("24h" as MarketWindow),
  }),
  head: () => ({
    meta: [
      { title: "Explore Tokens — ORVEX" },
      {
        name: "description",
        content: "Live token markets, bonding curve progress and watchlists on ORVEX.",
      },
      { property: "og:title", content: "Explore Tokens — ORVEX" },
      { property: "og:description", content: "Discover token markets on LitVM LiteForge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tokensQuery()),
  pendingComponent: () => (
    <div className="token-grid">
      {Array.from({ length: 12 }, (_, i) => (
        <TokenCardSkeleton key={i} />
      ))}
    </div>
  ),
  errorComponent: MarketError,
  notFoundComponent: MarketNotFound,
  component: Explore,
});
const labels = {
  new: "Newest",
  mc: "Market cap",
  vol: "Volume",
  prog: "Curve progress",
  change: "Top gainers",
  old: "Oldest",
};
function Explore() {
  const { data } = useSuspenseQuery(tokensQuery());
  const search = Route.useSearch();
  const s = {
    q: search.q ?? "",
    sort: search.sort ?? "new",
    stage: search.stage ?? "all",
    view: search.view ?? "grid",
    win: search.win ?? "24h",
  };
  const navigate = Route.useNavigate();
  const { favorites } = useWatchlist();
  const update = (value: Partial<typeof s>) =>
    navigate({ search: (old) => ({ ...old, ...value }), replace: true });
  const list = useMemo(
    () => filterMarket(data, s.q, s.sort, s.stage, favorites, s.win),
    [data, s.q, s.sort, s.stage, favorites, s.win],
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            ORVEX MARKETS
          </div>
          <h1 className="text-3xl font-bold">Explore</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.length} tokens · LitVM LiteForge testnet
          </p>
        </div>
        <MarketStatus />
      </div>
      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
        {(
          [
            ["all", "All tokens"],
            ["curve", "Bonding curve"],
            ["graduated", "Graduated"],
            ["favorites", "Watchlist"],
          ] as const
        ).map(([k, l]) => (
          <Button
            key={k}
            variant={s.stage === k ? "secondary" : "ghost"}
            size="sm"
            onClick={() => update({ stage: k })}
          >
            {l}
            {k === "favorites" && (
              <span className="font-mono text-muted-foreground">{favorites.length}</span>
            )}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search tokens"
            value={s.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search name, symbol or address"
            className="pl-9 pr-9"
          />
          {s.q && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              aria-label="Clear search"
              onClick={() => update({ q: "" })}
            >
              <X />
            </Button>
          )}
        </div>
        <select
          aria-label="Sort tokens"
          value={s.sort}
          onChange={(e) => update({ sort: e.target.value as MarketSort })}
          className="h-9 rounded-md border border-input bg-card px-3 text-xs"
        >
          {MARKET_SORTS.map((k) => (
            <option key={k} value={k}>
              {labels[k]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 rounded-md border border-input bg-card p-0.5">
          {MARKET_WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => update({ win: w })}
              className={`rounded px-2.5 py-1 font-mono text-[11px] font-semibold uppercase transition ${
                s.win === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            variant={s.view === "grid" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Grid view"
            onClick={() => update({ view: "grid" })}
          >
            <LayoutGrid />
          </Button>
          <Button
            variant={s.view === "list" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Table view"
            onClick={() => update({ view: "list" })}
          >
            <List />
          </Button>
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{list.length} results</span>
        <span>USD estimates · zkLTC reference $85</span>
      </div>
      {!list.length ? (
        <div className="border-y border-border py-16 text-center">
          <Compass className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">
            {data.length ? "No tokens match" : "No launches yet"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.length
              ? "Adjust your filters to see more markets."
              : "Confirmed factory launches will appear here."}
          </p>
          <Button
            className="mt-5"
            variant="outline"
            onClick={() => update({ q: "", stage: "all", sort: "new" })}
          >
            Reset filters
          </Button>
        </div>
      ) : s.view === "grid" ? (
        <div className="token-grid">
          {list.map((t) => (
            <TokenCard key={t.id} t={t} win={s.win} />
          ))}
        </div>
      ) : (
        <MarketTable tokens={list} win={s.win} />
      )}
      <p className="text-[10px] text-muted-foreground">
        Raised is curve funding, not DEX liquidity. Holder counts reflect indexed curve trades, not
        token transfers.
      </p>
    </div>
  );
}
