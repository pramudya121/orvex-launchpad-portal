import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { buildCandles, TIMEFRAMES, type Timeframe } from "@/lib/tokens";
import type { TokenView, TradeView } from "@/lib/launchpad.functions";
import { CURVE } from "@/lib/curve";
import { cn } from "@/lib/utils";
import { Camera, Flame, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";

// lightweight-charts cannot parse oklch() strings — use fixed sRGB values matching the theme.
const COLORS = { up: "#34d399", down: "#f87171", text: "#94a3b8", grid: "rgba(148, 163, 184, 0.12)" };

type Metric = "price" | "mcap";
type Currency = "usd" | "base";

const TF_LABELS: Record<Timeframe, string> = {
  "1m": "1M",
  "5m": "5M",
  "15m": "15M",
  "1H": "1H",
  "4H": "4H",
  "1D": "1D",
  "1W": "1W",
};

export function PriceChart({ trades, token }: { trades: TradeView[]; token: TokenView }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<{ chart: IChartApi; c: ISeriesApi<"Candlestick">; v: ISeriesApi<"Histogram"> } | null>(null);
  const [tf, setTf] = useState<Timeframe>("15m");
  const [metric, setMetric] = useState<Metric>("price");
  const [currency, setCurrency] = useState<Currency>("usd");
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const { up, down, text: fg, grid } = COLORS;
    const chart = createChart(ref.current, {
      autoSize: true,
      localization: { locale: "en-US" },
      layout: { background: { color: "transparent" }, textColor: fg, fontFamily: "JetBrains Mono, monospace" },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, timeVisible: true },
    });
    const c = chart.addSeries(CandlestickSeries, {
      upColor: up,
      downColor: down,
      wickUpColor: up,
      wickDownColor: down,
      borderVisible: false,
      priceFormat: { type: "custom", minMove: 1e-12, formatter: (p: number) => "$" + p.toPrecision(4) },
    });
    const v = chart.addSeries(HistogramSeries, { priceScaleId: "", priceFormat: { type: "volume" } });
    v.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    api.current = { chart, c, v };
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      chart.remove();
      api.current = null;
    };
  }, []);

  // Price formatter follows the selected metric/currency.
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    a.c.applyOptions({
      priceFormat: {
        type: "custom",
        minMove: 1e-12,
        formatter: (p: number) =>
          currency === "usd"
            ? "$" + (metric === "mcap" ? p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p.toPrecision(4))
            : (metric === "mcap" ? p.toLocaleString("en-US", { maximumFractionDigits: 2 }) : p.toPrecision(6)) +
              " zkLTC",
      },
    });
  }, [metric, currency]);

  useEffect(() => {
    const a = api.current;
    if (!a) return;
    const start = [...trades].sort((x, y) => +new Date(x.createdAt) - +new Date(y.createdAt))[0]?.price ?? 0;
    const supply = metric === "mcap" ? token.reserves.totalSupply : 1;
    const usd = currency === "usd" ? CURVE.baseUsd : 1;
    const k = supply * usd;
    const candles = buildCandles(trades, tf, start).map((c) => ({
      ...c,
      open: c.open * k,
      high: c.high * k,
      low: c.low * k,
      close: c.close * k,
    }));
    a.c.setData(candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })));
    a.v.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? COLORS.up : COLORS.down,
      })),
    );
    a.chart.timeScale().fitContent();
  }, [trades, tf, metric, currency, token.reserves.totalSupply]);

  const snapshot = () => {
    const a = api.current;
    if (!a) return;
    const canvas = a.chart.takeScreenshot();
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${token.symbol}-chart.png`;
    link.click();
    toast("Chart snapshot saved");
  };

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrap.current?.requestFullscreen();
  };

  const pct = Math.min(100, token.progress);

  return (
    <div ref={wrap} className="glass rounded-2xl bg-background p-3">
      {/* Graduation progress lives inside the chart terminal */}
      <div className="mb-3 flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-glow">
          <Flame className="size-3.5" /> Graduation
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
          <div
            className={cn("h-full rounded-full transition-all", token.graduated ? "bg-success" : "bg-gradient-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1">
        <div className="flex rounded-md bg-surface p-0.5">
          {(["price", "mcap"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-xs capitalize transition",
                metric === m ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "price" ? "Price" : "MCap"}
            </button>
          ))}
        </div>
        <div className="flex rounded-md bg-surface p-0.5">
          {(["usd", "base"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-xs transition",
                currency === c ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c === "usd" ? "USD" : "zkLTC"}
            </button>
          ))}
        </div>
        <div className="mx-1 h-4 w-px bg-border" />
        {(Object.keys(TIMEFRAMES) as Timeframe[]).map((k) => (
          <button
            key={k}
            onClick={() => setTf(k)}
            className={cn(
              "rounded-md px-2.5 py-1 font-mono text-xs transition",
              tf === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground",
            )}
          >
            {TF_LABELS[k]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 flex items-center gap-1.5 text-xs text-success">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            Live
          </span>
          <button
            onClick={snapshot}
            aria-label="Save chart snapshot"
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-surface hover:text-foreground"
          >
            <Camera className="size-4" />
          </button>
          <button
            onClick={toggleFull}
            aria-label="Toggle fullscreen"
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-surface hover:text-foreground"
          >
            {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      <div className="relative">
        <div ref={ref} className={cn("w-full", full ? "h-[calc(100vh-120px)]" : "h-[420px]")} />
        {trades.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            No trades yet — be the first buyer.
          </div>
        )}
      </div>
    </div>
  );
}
