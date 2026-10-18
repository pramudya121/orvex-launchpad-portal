import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, HistogramSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { buildCandles, TIMEFRAMES, type Timeframe } from "@/lib/tokens";
import type { TradeView } from "@/lib/launchpad.functions";
import { CURVE } from "@/lib/curve";
import { cn } from "@/lib/utils";

// lightweight-charts cannot parse oklch() strings — use fixed sRGB values matching the theme.
const COLORS = { up: "#34d399", down: "#f87171", text: "#94a3b8", grid: "rgba(148, 163, 184, 0.12)" };

export function PriceChart({ trades }: { trades: TradeView[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<{ chart: IChartApi; c: ISeriesApi<"Candlestick">; v: ISeriesApi<"Histogram"> } | null>(null);
  const [tf, setTf] = useState<Timeframe>("1m");

  useEffect(() => {
    if (!ref.current) return;
    const { up, down, text: fg, grid } = COLORS;
    const chart = createChart(ref.current, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: fg, fontFamily: "JetBrains Mono, monospace" },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, timeVisible: true },
    });
    const c = chart.addSeries(CandlestickSeries, {
      upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false,
      priceFormat: { type: "custom", minMove: 1e-12, formatter: (p: number) => "$" + p.toPrecision(4) },
    });
    const v = chart.addSeries(HistogramSeries, { priceScaleId: "", priceFormat: { type: "volume" } });
    v.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    api.current = { chart, c, v };
    return () => { chart.remove(); api.current = null; };
  }, []);

  useEffect(() => {
    const a = api.current;
    if (!a) return;
    const start = [...trades].sort((x, y) => +new Date(x.createdAt) - +new Date(y.createdAt))[0]?.price ?? 0;
    const candles = buildCandles(trades, tf, start).map((k) => ({ ...k, open: k.open * CURVE.baseUsd, high: k.high * CURVE.baseUsd, low: k.low * CURVE.baseUsd, close: k.close * CURVE.baseUsd }));
    a.c.setData(candles.map((k) => ({ ...k, time: k.time as UTCTimestamp })));
    a.v.setData(candles.map((k) => ({ time: k.time as UTCTimestamp, value: k.volume, color: k.close >= k.open ? COLORS.up : COLORS.down })));
    a.chart.timeScale().fitContent();
  }, [trades, tf]);

  return (
    <div className="glass rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-1 overflow-x-auto">
        {(Object.keys(TIMEFRAMES) as Timeframe[]).map((k) => (
          <button key={k} onClick={() => setTf(k)} className={cn("rounded-md px-2.5 py-1 font-mono text-xs transition", tf === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground")}>
            {k}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-success"><span className="size-1.5 animate-pulse rounded-full bg-success" />Live</span>
      </div>
      <div className="relative">
        <div ref={ref} className="h-[420px] w-full" />
        {trades.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">No trades yet — be the first buyer.</div>
        )}
      </div>
    </div>
  );
}
