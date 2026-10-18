import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trophy, Activity, BarChart3, TrendingUp, TrendingDown, Users, Crown, Hammer } from "lucide-react";
import { MarketError, MarketNotFound } from "@/components/orvex/RouteFeedback";
import { leaderboardQuery, tokensQuery } from "@/lib/queries";
import type { TokenView } from "@/lib/launchpad.functions";
import { windowChange, windowVolume } from "@/lib/market";
import { fmtUsd, short } from "@/lib/tokens";
import { explorerAddress } from "@/lib/web3/chain";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { WindowChart, LiveControls, Medal, RankCard, pct, type RankWindow } from "@/components/orvex/RankBoard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(tokensQuery()),
      context.queryClient.ensureQueryData(leaderboardQuery()),
    ]),
  head: () => ({
    meta: [
      { title: "Hall of Legends — ORVEX Leaderboard" },
      {
        name: "description",
        content: "Podium of top movers, volume champions, busiest creators and traders on ORVEX.",
      },
      { property: "og:title", content: "ORVEX Hall of Legends" },
      {
        property: "og:description",
        content: "Top tokens, creators and traders on ORVEX, ranked live from on-chain trades.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: MarketError,
  notFoundComponent: MarketNotFound,
  component: Leaderboard,
});

function Leaderboard() {
  const { data: tokens } = useSuspenseQuery(tokensQuery());
  const { data: lb } = useSuspenseQuery(leaderboardQuery());
  const [win, setWin] = useState<RankWindow>("24h");
  const ch = (t: TokenView) => windowChange(t, win);
  const vol = (t: TokenView) => windowVolume(t, win);

  const m = useMemo(() => {
    const sort = (f: (t: TokenView) => boolean, k: (t: TokenView) => number, asc = false) =>
      tokens.filter(f).sort((a, b) => (asc ? k(a) - k(b) : k(b) - k(a)));
    const creators = new Map<string, { address: string; launches: number; volume: number }>();
    tokens.forEach((t) => {
      const c = creators.get(t.creator) ?? { address: t.creator, launches: 0, volume: 0 };
      c.launches++;
      c.volume += vol(t);
      creators.set(t.creator, c);
    });
    return {
      gainers: sort((t) => ch(t) > 0, ch),
      losers: sort((t) => ch(t) < 0, ch, true),
      volume: sort((t) => vol(t) > 0, vol),
      creators: [...creators.values()].sort((a, b) => b.volume - a.volume || b.launches - a.launches).slice(0, 10),
      totalVol: tokens.reduce((s, t) => s + vol(t), 0),
      ranked: tokens.filter((t) => vol(t) > 0).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, win]);

  const podium = m.gainers.slice(0, 3);
  const order = [1, 0, 2].filter((i) => podium[i]);
  const maxCreator = Math.max(1e-12, ...m.creators.map((c) => c.volume));
  const maxTrader = Math.max(1e-12, ...lb.traders.slice(0, 10).map((t) => t.volumeUsd));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-10 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--warning)_0%,transparent_55%)] opacity-15" />
        <span className="relative inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-[11px] font-bold text-warning">
          <Trophy className="size-3" /> Leaderboard
        </span>
        <h1 className="relative mt-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-4xl font-black text-transparent md:text-5xl">
          Hall of Legends <span className="text-warning">🏆</span>
        </h1>
        <p className="relative mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Top movers, volume champions and the busiest creators on ORVEX — ranked live from the indexed trade tape.
        </p>
        <div className="relative mt-5 flex justify-center">
          <LiveControls win={win} setWin={setWin} />
        </div>
      </section>

      <WindowChart tokens={tokens} win={win} setWin={setWin} change={windowChange} volume={windowVolume} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Tokens ranked", value: String(m.ranked), icon: <Activity className="size-3.5" />, cls: "text-primary" },
          { label: `Window volume · ${win}`, value: fmtUsd(m.totalVol), icon: <BarChart3 className="size-3.5" />, cls: "" },
          { label: "Top gainer", value: podium[0] ? pct(ch(podium[0])) : "—", icon: <TrendingUp className="size-3.5" />, cls: "text-success" },
          { label: "Creators", value: String(m.creators.length), icon: <Users className="size-3.5" />, cls: "" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card/70 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
              {s.icon} {s.label}
            </p>
            <p className={cn("mt-2 font-mono text-xl font-bold", s.cls)}>{s.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase">
          <Crown className="size-4 text-warning" /> Podium
          <span className="font-normal normal-case text-muted-foreground">
            The three strongest movers in the selected window · {win}
          </span>
        </h2>
        {!podium.length ? (
          <p className="rounded-xl border border-border bg-card/70 p-10 text-center text-sm text-muted-foreground">
            No positive movers in this window yet.
          </p>
        ) : (
          <div className="grid items-end gap-4 md:grid-cols-3">
            {order.map((i) => {
              const t = podium[i]!;
              return (
                <Link
                  key={t.id}
                  to="/token/$symbol"
                  params={{ symbol: t.symbol }}
                  className={cn(
                    "flex flex-col items-center rounded-2xl border bg-card/70 p-6 text-center transition-transform hover:-translate-y-1",
                    i === 0 ? "border-warning/50 py-10 shadow-[0_0_40px_-12px_var(--warning)]" : "border-border",
                  )}
                >
                  <Medal i={i} className="size-8 text-sm" />
                  <div className={cn("mt-3 rounded-full p-0.5", i === 0 ? "bg-warning" : "bg-border")}>
                    <TokenLogo symbol={t.symbol} url={t.logoUrl} size={i === 0 ? 64 : 52} />
                  </div>
                  <p className="mt-3 font-bold">{t.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">${t.symbol}</p>
                  <p className="mt-2 font-mono text-3xl font-black text-success">{pct(ch(t))}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {fmtUsd(vol(t))} · {win} vol · MC {fmtUsd(t.marketCapUsd)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankCard title={`Top Gainers ${win}`} icon={<TrendingUp className="size-4" />} tone="success" list={m.gainers.slice(0, 5)} metric={ch} format={pct} empty="No gainers in this window yet." />
        <RankCard title={`Top Losers ${win}`} icon={<TrendingDown className="size-4" />} tone="danger" list={m.losers.slice(0, 5)} metric={ch} format={pct} empty="Not enough indexed trades in this window to rank yet." />
        <RankCard title="Volume Champions" icon={<BarChart3 className="size-4" />} tone="primary" list={m.volume.slice(0, 5)} metric={vol} format={fmtUsd} empty="No volume in this window yet." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card/70 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Hammer className="size-4 text-warning" /> Busiest Creators
            <span className="text-[11px] font-normal text-muted-foreground">by launches and {win} volume</span>
          </h2>
          {!m.creators.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No creators yet.</p>
          ) : (
            <ol className="space-y-3">
              {m.creators.map((c, i) => (
                <li key={c.address}>
                  <div className="flex items-center gap-2.5">
                    <Medal i={i} />
                    <a href={explorerAddress(c.address)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:text-primary">
                      <p className="font-mono text-xs font-bold">{short(c.address)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.launches} tokens · window volume</p>
                    </a>
                    <span className="font-mono text-xs font-bold">{fmtUsd(c.volume)}</span>
                  </div>
                  <div className="ml-8 mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (c.volume / maxCreator) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card/70 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Users className="size-4 text-success" /> Top Traders
            <span className="text-[11px] font-normal text-muted-foreground">all-time volume</span>
          </h2>
          {!lb.traders.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No trades yet.</p>
          ) : (
            <ol className="space-y-3">
              {lb.traders.slice(0, 10).map((t, i) => (
                <li key={t.address}>
                  <div className="flex items-center gap-2.5">
                    <Medal i={i} />
                    <a href={explorerAddress(t.address)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:text-primary">
                      <p className="font-mono text-xs font-bold">{short(t.address)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.trades} trades · <span className="text-success">{t.buys}B</span> / <span className="text-danger">{t.sells}S</span>
                      </p>
                    </a>
                    <span className="font-mono text-xs font-bold">{fmtUsd(t.volumeUsd)}</span>
                  </div>
                  <div className="ml-8 mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-success" style={{ width: `${Math.max(3, (t.volumeUsd / maxTrader) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
