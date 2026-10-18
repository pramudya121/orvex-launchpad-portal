import { useMemo } from "react";
import { fmtAge, fmtNum, fmtUsd, short } from "@/lib/tokens";
import { CURVE } from "@/lib/curve";
import type { TokenView, TradeView } from "@/lib/launchpad.functions";
import { TokenLogo } from "./TokenLogo";
import { cn } from "@/lib/utils";

const WINDOWS = [
  ["30M", 30 * 60_000],
  ["1H", 3_600_000],
  ["4H", 4 * 3_600_000],
  ["24H", 86_400_000],
] as const;

/** Price change vs the last trade at or before the window start (else first trade inside it). */
function windowChangePct(trades: TradeView[], now: number, ms: number, current: number) {
  const sorted = [...trades].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  let base: number | null = null;
  for (const t of sorted) {
    if (+new Date(t.createdAt) <= now - ms) base = t.price;
    else {
      if (base === null) base = t.price;
      break;
    }
  }
  if (base === null || base <= 0) return 0;
  return (current / base - 1) * 100;
}

function SplitBar({ left, right, leftLabel, rightLabel }: { left: number; right: number; leftLabel: string; rightLabel: string }) {
  const total = left + right;
  const pct = total > 0 ? (left / total) * 100 : 50;
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-danger/70">
        <div className="h-full bg-success" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px]">
        <span className="text-success">{leftLabel}</span>
        <span className="text-danger">{rightLabel}</span>
      </div>
    </div>
  );
}

export function TokenInfoPanel({ t, trades }: { t: TokenView; trades: TradeView[] }) {
  const now = Date.now();
  const stats = useMemo(() => {
    const day = trades.filter((x) => +new Date(x.createdAt) >= now - 86_400_000);
    const buys = day.filter((x) => x.side === "buy");
    const sells = day.filter((x) => x.side === "sell");
    const buyVol = buys.reduce((s, x) => s + x.baseAmount, 0);
    const sellVol = sells.reduce((s, x) => s + x.baseAmount, 0);
    const buyers = new Set(buys.map((x) => x.trader.toLowerCase())).size;
    const sellers = new Set(sells.map((x) => x.trader.toLowerCase())).size;
    return {
      buys: buys.length,
      sells: sells.length,
      buyVol: buyVol * CURVE.baseUsd,
      sellVol: sellVol * CURVE.baseUsd,
      buyers,
      sellers,
      changes: WINDOWS.map(([label, ms]) => [label, windowChangePct(trades, now, ms, t.price)] as const),
    };
  }, [trades, now, t.price]);

  const fdv = t.reserves.totalSupply * t.priceUsd;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-semibold">Information</span>
        <span className="font-mono text-xs text-muted-foreground">${t.symbol}</span>
      </div>
      <div className="flex items-center gap-3">
        <TokenLogo symbol={t.symbol} url={t.logoUrl} size={44} />
        <div className="min-w-0">
          <div className="truncate font-bold">{t.name}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {short(t.address)} · {fmtAge(t.createdAt)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["PRICE USD", fmtUsd(t.priceUsd)],
          ["PRICE ZKLTC", t.price > 0 ? t.price.toPrecision(4) : "0"],
          ["FDV", fmtUsd(fdv)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-surface/60 p-2.5">
            <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className="mt-1 truncate font-mono text-xs font-bold">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {stats.changes.map(([label, v]) => (
          <div key={label} className="rounded-lg bg-surface/60 p-2 text-center">
            <div className="text-[9px] font-semibold text-muted-foreground">{label}</div>
            <div
              className={cn(
                "mt-0.5 font-mono text-[11px] font-bold",
                v > 0 ? "text-success" : v < 0 ? "text-danger" : "text-muted-foreground",
              )}
            >
              {v >= 0 ? "+" : ""}
              {v.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <div className="mb-1.5 flex justify-between">
            <span className="text-xs text-muted-foreground">
              TXNS <span className="font-mono font-bold text-foreground">{stats.buys + stats.sells}</span>
            </span>
          </div>
          <SplitBar
            left={stats.buys}
            right={stats.sells}
            leftLabel={`${stats.buys} buys`}
            rightLabel={`${stats.sells} sells`}
          />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between">
            <span className="text-xs text-muted-foreground">
              VOLUME{" "}
              <span className="font-mono font-bold text-foreground">{fmtUsd(stats.buyVol + stats.sellVol)}</span>
            </span>
          </div>
          <SplitBar
            left={stats.buyVol}
            right={stats.sellVol}
            leftLabel={fmtUsd(stats.buyVol)}
            rightLabel={fmtUsd(stats.sellVol)}
          />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between">
            <span className="text-xs text-muted-foreground">
              MAKERS{" "}
              <span className="font-mono font-bold text-foreground">{Math.max(stats.buyers, stats.sellers) ? stats.buyers + stats.sellers : 0}</span>
            </span>
          </div>
          <SplitBar
            left={stats.buyers}
            right={stats.sellers}
            leftLabel={`${stats.buyers} buyers`}
            rightLabel={`${stats.sellers} sellers`}
          />
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3 font-mono text-[10px] text-muted-foreground">
        Supply {fmtNum(t.reserves.totalSupply)} · {fmtNum(t.reserves.saleSupply)} on curve · {t.reserves.feeBps / 100}% fee
      </div>
    </div>
  );
}
