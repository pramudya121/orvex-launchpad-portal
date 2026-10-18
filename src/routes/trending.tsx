import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getTokens, fmtUsd, type Token } from "@/lib/tokens";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { Change } from "@/components/orvex/Change";
import { Chip } from "@/components/orvex/Chip";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending Memecoins — ORVEX" },
      { name: "description", content: "Top gainers, losers and highest volume tokens on ORVEX." },
      { property: "og:title", content: "Trending Memecoins — ORVEX" },
      { property: "og:description", content: "Top gainers, losers and highest volume tokens on ORVEX." },
    ],
  }),
  component: Trending,
});

const PERIODS = ["1h", "6h", "24h", "7d"];

function Trending() {
  const [period, setPeriod] = useState("24h");
  const mult = { "1h": 0.15, "6h": 0.45, "24h": 1, "7d": 2.3 }[period]!;
  const tokens = useMemo(() => getTokens().map((t) => ({ ...t, change24h: t.change24h * mult })), [mult]);
  const by = (fn: (a: Token, b: Token) => number) => [...tokens].sort(fn).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Trending</h1>
        <div className="flex gap-1.5">{PERIODS.map((p) => <Chip key={p} on={p === period} onClick={() => setPeriod(p)}>{p}</Chip>)}</div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Board title="Top gainers" list={by((a, b) => b.change24h - a.change24h)} metric={(t) => t.change24h} kind="change" />
        <Board title="Top losers" list={by((a, b) => a.change24h - b.change24h)} metric={(t) => t.change24h} kind="change" />
        <Board title="Highest volume" list={by((a, b) => b.volume24h - a.volume24h)} metric={(t) => t.volume24h} kind="usd" />
        <Board title="Most viewed" list={by((a, b) => b.views - a.views)} metric={(t) => t.views} kind="num" />
      </div>
    </div>
  );
}

function Board({ title, list, metric, kind }: { title: string; list: Token[]; metric: (t: Token) => number; kind: "change" | "usd" | "num" }) {
  const max = Math.max(...list.map((t) => Math.abs(metric(t))));
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="space-y-4">
        {list.map((t, i) => (
          <Link key={t.symbol} to="/token/$symbol" params={{ symbol: t.symbol }} className="block">
            <div className="flex items-center gap-3">
              <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
              <TokenLogo symbol={t.symbol} hue={t.hue} size={30} />
              <span className="flex-1 text-sm font-medium">{t.name}</span>
              {kind === "change" ? <Change v={metric(t)} /> : <span className="font-mono text-sm">{kind === "usd" ? fmtUsd(metric(t)) : metric(t).toLocaleString()}</span>}
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
