import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, HistogramSeries, createChart, type UTCTimestamp } from "lightweight-charts";
import { genCandles, TIMEFRAMES, type Timeframe, type Token } from "@/lib/tokens";
import { cn } from "@/lib/utils";

function cssVar(name: string) {
  const el = document.createElement("div");
  el.style.color = `var(${name})`;
  document.body.appendChild(el);
  const c = getComputedStyle(el).color;
  el.remove();
  return c;
}

export function PriceChart({ token }: { token: Token }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tf, setTf] = useState<Timeframe>("15m");

  useEffect(() => {
    if (!ref.current) return;
    const up = cssVar("--success"), down = cssVar("--danger"), fg = cssVar("--muted-foreground"), grid = cssVar("--border");
    const chart = createChart(ref.current, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: fg, fontFamily: "JetBrains Mono, monospace" },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, timeVisible: true },
      crosshair: { mode: 1 },
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false,
      priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
    });
    const vol = chart.addSeries(HistogramSeries, { priceScaleId: "", priceFormat: { type: "volume" } });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const data = genCandles(token, tf);
    candles.setData(data.map((c) => ({ ...c, time: c.time as UTCTimestamp })));
    vol.setData(data.map((c) => ({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? up.replace(")", " / 0.4)") : down.replace(")", " / 0.4)") })));
    chart.timeScale().fitContent();

    // simulated live ticks
    let last = { ...data[data.length - 1] };
    const id = setInterval(() => {
      const close = Math.max(last.close * (1 + (Math.random() - 0.5) * 0.01), 1e-8);
      last = { ...last, close, high: Math.max(last.high, close), low: Math.min(last.low, close) };
      candles.update({ ...last, time: last.time as UTCTimestamp });
    }, 1500);

    return () => { clearInterval(id); chart.remove(); };
  }, [token, tf]);

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
      <div ref={ref} className="h-[420px] w-full" />
    </div>
  );
}
