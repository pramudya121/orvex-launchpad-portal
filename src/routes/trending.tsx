import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fmtUsd } from "@/lib/tokens";
import { tokensQuery } from "@/lib/queries";
import type { TokenView } from "@/lib/launchpad.functions";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { Change } from "@/components/orvex/Change";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending Memecoins — ORVEX" },
      { name: "description", content: "Top gainers, highest volume and tokens closest to graduation on ORVEX." },
      { property: "og:title", content: "Trending Memecoins — ORVEX" },
      { property: "og:description", content: "Top gainers, highest volume and tokens closest to graduation." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tokensQuery()),
  component: Trending,
});

function Trending() {
  const { data } = useSuspenseQuery(tokensQuery());
  const by = (fn: (a: TokenView, b: TokenView) => number) => [...data].sort(fn).slice(0, 5);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Trending · 24h</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Board title="Closest to graduation" list={by((a, b) => b.progress - a.progress)} metric={(t) => t.progress} kind="pct" />
        <Board title="Top gainers" list={by((a, b) => b.change24h - a.change24h)} metric={(t) => t.change24h} kind="change" />
        <Board title="Highest volume" list={by((a, b) => b.volume24hUsd - a.volume24hUsd)} metric={(t) => t.volume24hUsd} kind="usd" />
        <Board title="Most traded" list={by((a, b) => b.trades24h - a.trades24h)} metric={(t) => t.trades24h} kind="num" />
      </div>
    </div>
  );
}

function Board({ title, list, metric, kind }: { title: string; list: TokenView[]; metric: (t: TokenView) => number; kind: "change" | "usd" | "num" | "pct" }) {
  const max = Math.max(1e-9, ...list.map((t) => Math.abs(metric(t))));
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="space-y-4">
        {list.map((t, i) => (
          <Link key={t.id} to="/token/$symbol" params={{ symbol: t.symbol }} className="block">
            <div className="flex items-center gap-3">
              <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
              <TokenLogo symbol={t.symbol} url={t.logoUrl} size={30} />
              <span className="flex-1 text-sm font-medium">{t.name}</span>
              {kind === "change" ? <Change v={metric(t)} /> : <span className="font-mono text-sm">{kind === "usd" ? fmtUsd(metric(t)) : kind === "pct" ? metric(t).toFixed(1) + "%" : metric(t)}</span>}
            </div>
            <div className="ml-7 mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-gradient-primary transition-all duration-500" style={{ width: `${(Math.abs(metric(t)) / max) * 100}%` }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
