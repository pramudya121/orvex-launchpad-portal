import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TokenCardSkeleton } from "@/components/orvex/TokenCard";
import { MarketError, MarketNotFound } from "@/components/orvex/RouteFeedback";
import {
  Flame,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  Rocket,
  Activity,
  ArrowRight,
} from "lucide-react";
import { fmtUsd, fmtNum } from "@/lib/tokens";
import { tokensQuery } from "@/lib/queries";
import type { TokenView } from "@/lib/launchpad.functions";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { Change } from "@/components/orvex/Change";
import { MarketHeading, MarketStats } from "@/components/orvex/MarketHeading";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/orvex/Watchlist";
import { windowChange, windowVolume, type MarketWindow } from "@/lib/market";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Trending Memecoins — ORVEX" },
      {
        name: "description",
        content:
          "Discover market momentum, top gainers and upcoming bonding-curve graduations on ORVEX.",
      },
      { property: "og:title", content: "Trending Memecoins — ORVEX" },
      {
        property: "og:description",
        content: "Live indexed activity, top gainers and upcoming graduations on ORVEX.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tokensQuery()),
  errorComponent: MarketError,
  notFoundComponent: MarketNotFound,
  pendingComponent: () => (
    <div className="token-grid">
      {Array.from({ length: 8 }, (_, i) => (
        <TokenCardSkeleton key={i} />
      ))}
    </div>
  ),
  component: Trending,
});

function Trending() {
  const { data } = useSuspenseQuery(tokensQuery());
  const [win, setWin] = useState<MarketWindow>("24h");
  const change = (t: TokenView) => windowChange(t, win);
  const volume = (t: TokenView) => windowVolume(t, win);
  const trades = (t: TokenView) => (win === "7d" ? t.trades7d : t.trades24h);
  const by = (metric: (t: TokenView) => number) =>
    [...data].sort((a, b) => metric(b) - metric(a)).slice(0, 5);
  const leaders = [...data]
    .filter((t) => trades(t) > 0)
    .sort((a, b) => volume(b) - volume(a))
    .slice(0, 3);
  return (
    <div className="space-y-6">
      <MarketHeading
        label="Market pulse"
        title="Trending"
        description="Indexed curve trades · Live momentum · LiteForge testnet"
        icon={<Flame className="size-3.5" />}
        action={
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(["24h", "7d"] as const).map((w) => (
              <Button
                key={w}
                variant={win === w ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={win === w}
                onClick={() => setWin(w)}
              >
                {w.toUpperCase()}
              </Button>
            ))}
          </div>
        }
      />
      <MarketStats
        items={[
          {
            label: `${win.toUpperCase()} volume`,
            value: fmtUsd(data.reduce((s, t) => s + volume(t), 0)),
            detail: "Indexed bonding-curve volume",
            icon: <BarChart3 className="size-4" />,
          },
          {
            label: `${win.toUpperCase()} transactions`,
            value: fmtNum(
              data.reduce((s, t) => s + trades(t), 0),
              0,
            ),
            detail: "Confirmed buys & sells",
            icon: <Activity className="size-4" />,
          },
          {
            label: "Active markets",
            value: data.filter((t) => trades(t) > 0).length,
            detail: `With trades in the last ${win.toUpperCase()}`,
            icon: <Flame className="size-4" />,
          },
          {
            label: "On the curve",
            value: data.filter((t) => !t.graduated).length,
            detail: "Tokens awaiting graduation",
            icon: <Rocket className="size-4" />,
          },
        ]}
      />
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Flame className="size-4 text-danger" /> In the spotlight
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/explore">
              All markets <ArrowRight />
            </Link>
          </Button>
        </div>
        {leaders.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {leaders.map((t, i) => (
              <article
                key={t.id}
                className="relative min-w-0 overflow-hidden rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    HOT / 0{i + 1}
                  </span>
                  <FavoriteButton id={t.id} />
                </div>
                <Link
                  to="/token/$symbol"
                  params={{ symbol: t.symbol }}
                  className="mt-4 flex items-center gap-3"
                >
                  <TokenLogo symbol={t.symbol} url={t.logoUrl} size={48} />
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{t.name}</h3>
                    <span className="font-mono text-xs text-muted-foreground">${t.symbol}</span>
                  </div>
                  <ArrowUpRight className="ml-auto size-4 shrink-0 text-primary" />
                </Link>
                <div className="mt-6 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Price USD</p>
                    <p className="mt-1 font-mono text-xl font-semibold">{fmtUsd(t.priceUsd)}</p>
                  </div>
                  <Change v={change(t)} />
                </div>
                <div className="mt-5 flex justify-between border-t border-border pt-3 text-[10px] text-muted-foreground">
                  <span>
                    {win.toUpperCase()} VOL{" "}
                    <span className="ml-1 font-mono text-foreground">{fmtUsd(volume(t))}</span>
                  </span>
                  <span>
                    MC <span className="font-mono text-foreground">{fmtUsd(t.marketCapUsd)}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-8">
            <div>
              <h3 className="font-semibold">The next wave starts here</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                No indexed trading activity in this window yet.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/explore">
                Explore tokens <ArrowUpRight />
              </Link>
            </Button>
          </div>
        )}
      </section>
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        <Board
          title="Top gainers"
          label="01 / PRICE MOMENTUM"
          icon={<TrendingUp className="size-4" />}
          list={by(change).filter((t) => change(t) > 0)}
          metric={change}
          kind="change"
          tone="success"
        />
        <Board
          title="Highest volume"
          label="02 / MARKET ACTIVITY"
          icon={<BarChart3 className="size-4" />}
          list={by(volume).filter((t) => volume(t) > 0)}
          metric={volume}
          kind="usd"
          tone="primary"
        />
        <Board
          title="Next to graduate"
          label="03 / BONDING CURVE"
          icon={<Rocket className="size-4" />}
          list={[...data]
            .filter((t) => !t.graduated)
            .sort((a, b) => b.progress - a.progress)
            .slice(0, 5)}
          metric={(t) => t.progress}
          kind="pct"
          tone="primary"
        />
        <Board
          title="Most traded"
          label="04 / TRANSACTION FLOW"
          icon={<Activity className="size-4" />}
          list={by(trades).filter((t) => trades(t) > 0)}
          metric={trades}
          kind="num"
          tone="success"
        />
      </div>
    </div>
  );
}

function Board({
  title,
  label,
  icon,
  list,
  metric,
  kind,
  tone,
}: {
  title: string;
  label: string;
  icon: React.ReactNode;
  list: TokenView[];
  metric: (t: TokenView) => number;
  kind: "change" | "usd" | "num" | "pct";
  tone: "primary" | "success";
}) {
  const max = Math.max(1e-9, ...list.map((t) => Math.abs(metric(t))));
  return (
    <section className="min-w-0 border-t border-border pt-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="mb-2 font-mono text-[9px] text-muted-foreground">{label}</div>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <span className={tone === "success" ? "text-success" : "text-primary"}>{icon}</span>
      </div>
      {!list.length && (
        <div className="grid min-h-32 place-items-center border-b border-border text-xs text-muted-foreground">
          No market activity yet.
        </div>
      )}
      <div className="divide-y divide-border">
        {list.map((t, i) => (
          <Link
            key={t.id}
            to="/token/$symbol"
            params={{ symbol: t.symbol }}
            className="group block py-3 transition-colors hover:bg-surface/30"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <TokenLogo symbol={t.symbol} url={t.logoUrl} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{t.name}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">${t.symbol}</p>
              </div>
              {kind === "change" ? (
                <Change v={metric(t)} />
              ) : (
                <span className="shrink-0 font-mono text-xs font-semibold">
                  {kind === "usd"
                    ? fmtUsd(metric(t))
                    : kind === "pct"
                      ? metric(t).toFixed(1) + "%"
                      : fmtNum(metric(t), 0)}
                </span>
              )}
              <ArrowUpRight className="size-3 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="ml-8 mt-2 h-0.5 overflow-hidden bg-surface">
              <div
                className={cn("h-full", tone === "success" ? "bg-success" : "bg-primary")}
                style={{ width: `${Math.min(100, (Math.abs(metric(t)) / max) * 100)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
