import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Clock, RotateCw } from "lucide-react";
import type { TokenView } from "@/lib/launchpad.functions";
import type { MarketWindow } from "@/lib/market";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { fmtUsd } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export type RankWindow = Exclude<MarketWindow, "all">;
export const RANK_WINDOWS: RankWindow[] = ["1h", "6h", "24h", "7d"];

export function Medal({ i, className }: { i: number; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold",
        i === 0 && "bg-warning text-background",
        i === 1 && "bg-muted-foreground/70 text-background",
        i === 2 && "bg-accent text-accent-foreground",
        i > 2 && "bg-surface text-muted-foreground",
        className,
      )}
    >
      {i + 1}
    </span>
  );
}

function useClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function LiveControls({
  win,
  setWin,
}: {
  win: RankWindow;
  setWin: (w: RankWindow) => void;
}) {
  const qc = useQueryClient();
  const now = useClock();
  const [spin, setSpin] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-[11px] font-bold text-success">
        <span className="size-1.5 animate-pulse rounded-full bg-success" /> LIVE
      </span>
      <span className="flex min-w-24 items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <Clock className="size-3.5" /> {now}
      </span>
      <div className="flex rounded-lg border border-border bg-card p-1">
        {RANK_WINDOWS.map((w) => (
          <button
            key={w}
            aria-pressed={win === w}
            onClick={() => setWin(w)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-bold transition-colors",
              win === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {w}
          </button>
        ))}
      </div>
      <button
        aria-label="Refresh rankings"
        onClick={async () => {
          setSpin(true);
          await qc.invalidateQueries();
          setSpin(false);
        }}
        className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
      >
        <RotateCw className={cn("size-3.5", spin && "animate-spin")} />
      </button>
    </div>
  );
}

const age = (iso: string) => {
  const m = Math.max(0, (Date.now() - +new Date(iso)) / 60000);
  if (m < 60) return `${Math.floor(m)}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
};

export function RankCard({
  title,
  icon,
  list,
  metric,
  format,
  tone = "success",
  empty = "No ranked tokens in this window yet — the board fills as soon as trades index.",
  className,
}: {
  title: ReactNode;
  icon: ReactNode;
  list: TokenView[];
  metric: (t: TokenView) => number;
  format: (v: number) => string;
  tone?: "success" | "danger" | "primary";
  empty?: string;
  className?: string;
}) {
  const max = Math.max(1e-12, ...list.map((t) => Math.abs(metric(t))));
  const toneText = { success: "text-success", danger: "text-danger", primary: "text-primary" }[tone];
  const toneBg = { success: "bg-success", danger: "bg-danger", primary: "bg-primary" }[tone];
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card/70 p-5 shadow-sm backdrop-blur",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <span className={toneText}>{icon}</span> {title}
        </h2>
        <span className="rounded-md bg-surface px-1.5 font-mono text-[10px] text-muted-foreground">
          {list.length}
        </span>
      </div>
      {!list.length ? (
        <p className="grid min-h-24 place-items-center text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ol className="space-y-3">
          {list.map((t, i) => (
            <li key={t.id}>
              <Link
                to="/token/$symbol"
                params={{ symbol: t.symbol }}
                className="group flex items-center gap-2.5"
              >
                <Medal i={i} />
                <TokenLogo symbol={t.symbol} url={t.logoUrl} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold group-hover:text-primary">{t.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {fmtUsd(t.priceUsd)} · {age(t.createdAt)}
                  </p>
                </div>
                <span className={cn("shrink-0 font-mono text-xs font-bold", toneText)}>
                  {format(metric(t))}
                </span>
              </Link>
              <div className="ml-8 mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                <div
                  className={cn("h-full rounded-full", toneBg)}
                  style={{ width: `${Math.max(3, (Math.abs(metric(t)) / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

/** Aggregate price change and volume across the 1h / 6h / 24h / 7d windows. */
export function WindowChart({
  tokens,
  win,
  setWin,
  change,
  volume,
}: {
  tokens: TokenView[];
  win: RankWindow;
  setWin: (w: RankWindow) => void;
  change: (t: TokenView, w: RankWindow) => number;
  volume: (t: TokenView, w: RankWindow) => number;
}) {
  const rows = RANK_WINDOWS.map((w) => {
    const vol = tokens.reduce((s, t) => s + volume(t, w), 0);
    const active = tokens.filter((t) => volume(t, w) > 0);
    const weighted = vol > 0 ? active.reduce((s, t) => s + change(t, w) * volume(t, w), 0) / vol : 0;
    return { w, vol, chg: weighted, active: active.length };
  });
  const maxVol = Math.max(1e-12, ...rows.map((r) => r.vol));
  const maxChg = Math.max(1, ...rows.map((r) => Math.abs(r.chg)));
  return (
    <section className="grid gap-4 rounded-xl border border-border bg-card/70 p-5 md:grid-cols-2">
      {(["vol", "chg"] as const).map((kind) => (
        <div key={kind}>
          <p className="mb-3 text-xs font-bold">
            {kind === "vol" ? "Volume by window" : "Volume-weighted price change"}
          </p>
          <div className="flex h-36 items-end gap-3">
            {rows.map((r) => {
              const v = kind === "vol" ? r.vol : r.chg;
              const h = kind === "vol" ? (r.vol / maxVol) * 100 : (Math.abs(r.chg) / maxChg) * 100;
              const tone = kind === "vol" ? "bg-primary" : r.chg >= 0 ? "bg-success" : "bg-danger";
              return (
                <button
                  key={r.w}
                  onClick={() => setWin(r.w)}
                  aria-pressed={win === r.w}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className={cn("font-mono text-[10px] font-bold", kind === "chg" && (r.chg >= 0 ? "text-success" : "text-danger"))}>
                    {kind === "vol" ? fmtUsd(v) : pct(v)}
                  </span>
                  <span
                    className={cn("w-full rounded-t-md transition-all", tone, win === r.w ? "opacity-100" : "opacity-40 group-hover:opacity-70")}
                    style={{ height: `${Math.max(3, h * 0.75)}%` }}
                  />
                  <span className={cn("text-[11px] font-bold", win === r.w ? "text-foreground" : "text-muted-foreground")}>
                    {r.w}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
