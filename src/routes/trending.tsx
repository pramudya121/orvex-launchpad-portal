import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Flame, TrendingUp, TrendingDown, BarChart3, Users, Download } from "lucide-react";
import { MarketError, MarketNotFound } from "@/components/orvex/RouteFeedback";
import { tokensQuery } from "@/lib/queries";
import type { TokenView } from "@/lib/launchpad.functions";
import { windowChange, windowVolume } from "@/lib/market";
import { fmtUsd, fmtNum } from "@/lib/tokens";
import { LiveControls, RankCard, pct, type RankWindow } from "@/components/orvex/RankBoard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending — ORVEX" },
      {
        name: "description",
        content: "Top gainers, losers, volume leaders and most-held tokens on ORVEX, ranked live.",
      },
      { property: "og:title", content: "Trending — ORVEX" },
      {
        property: "og:description",
        content: "Live top movers and volume champions on the ORVEX bonding-curve launchpad.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tokensQuery()),
  errorComponent: MarketError,
  notFoundComponent: MarketNotFound,
  component: Trending,
});

type Board = "gainers" | "losers" | "volume" | "held";

function Trending() {
  const { data } = useSuspenseQuery(tokensQuery());
  const [win, setWin] = useState<RankWindow>("24h");
  const [focus, setFocus] = useState<Board | null>(null);
  const ch = (t: TokenView) => windowChange(t, win);
  const vol = (t: TokenView) => windowVolume(t, win);
  const held = (t: TokenView) => t.holders;

  const boards = useMemo(() => {
    const top = (f: (t: TokenView) => boolean, m: (t: TokenView) => number, asc = false) =>
      data
        .filter(f)
        .sort((a, b) => (asc ? m(a) - m(b) : m(b) - m(a)))
        .slice(0, 10);
    return {
      gainers: top((t) => ch(t) > 0, ch),
      losers: top((t) => ch(t) < 0, ch, true),
      volume: top((t) => vol(t) > 0, vol),
      held: top((t) => t.holders > 0, held),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, win]);

  const cfg = [
    { id: "gainers" as const, title: "Top Gainers", icon: <TrendingUp className="size-4" />, tone: "success" as const, metric: ch, format: pct },
    { id: "losers" as const, title: "Top Losers", icon: <TrendingDown className="size-4" />, tone: "danger" as const, metric: ch, format: pct },
    { id: "volume" as const, title: "Volume Leaders", icon: <BarChart3 className="size-4" />, tone: "primary" as const, metric: vol, format: fmtUsd },
    { id: "held" as const, title: "Most Held", icon: <Users className="size-4" />, tone: "success" as const, metric: held, format: (v: number) => fmtNum(v, 0) },
  ];
  const shown = focus ? cfg.filter((c) => c.id === focus) : cfg;

  const exportCsv = () => {
    const rows = [["board", "rank", "name", "symbol", "address", "value"]];
    cfg.forEach((c) =>
      boards[c.id].forEach((t, i) =>
        rows.push([c.title, String(i + 1), t.name, t.symbol, t.address, String(c.metric(t))]),
      ),
    );
    const blob = new Blob([rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orvex-trending-${win}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <Flame className="size-6 text-warning" /> Trending
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Top movers, volume champions and the most-held tokens on ORVEX — ranked live from the indexed trade tape.
          </p>
        </div>
        <LiveControls win={win} setWin={setWin} />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {cfg.map((c) => (
            <button
              key={c.id}
              aria-pressed={focus === c.id}
              onClick={() => setFocus(focus === c.id ? null : c.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                focus === c.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c.icon} {c.title}
              <span className="rounded bg-background/30 px-1.5 font-mono text-[10px]">{boards[c.id].length}</span>
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <Download className="size-3.5" /> Export CSV
        </button>
      </div>

      <div className={cn("grid gap-4", focus ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-4")}>
        {shown.map((c) => (
          <RankCard
            key={c.id}
            title={c.title}
            icon={c.icon}
            tone={c.tone}
            list={focus ? boards[c.id] : boards[c.id].slice(0, 5)}
            metric={c.metric}
            format={c.format}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        New indexed trades update these rankings automatically · {data.length} tokens · Window {win}
      </p>
    </div>
  );
}
