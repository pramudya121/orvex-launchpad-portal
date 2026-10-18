import type { TradeView } from "./launchpad.functions";

export function fmtUsd(n: number) {
  if (!isFinite(n)) return "$0";
  if (n > 0 && n < 0.01) return "$" + n.toPrecision(3);
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}
export const fmtNum = (n: number, d = 2) =>
  n >= 1e9 ? (n / 1e9).toFixed(d) + "B" : n >= 1e6 ? (n / 1e6).toFixed(d) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : n.toFixed(d);
export function fmtAge(iso: string) {
  const m = Math.max(0, (Date.now() - +new Date(iso)) / 60000);
  if (m < 60) return `${Math.floor(m)}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const hueOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export const TIMEFRAMES = { "1m": 60, "5m": 300, "15m": 900, "1H": 3600, "4H": 14400, "1D": 86400, "1W": 604800 } as const;
export type Timeframe = keyof typeof TIMEFRAMES;

/** Aggregate trades (any order) into OHLCV candles. Each candle opens at the previous close. */
export function buildCandles(trades: TradeView[], tf: Timeframe, startPrice: number): Candle[] {
  const step = TIMEFRAMES[tf];
  const sorted = [...trades].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const out: Candle[] = [];
  let prev = startPrice;
  for (const t of sorted) {
    const time = Math.floor(+new Date(t.createdAt) / 1000 / step) * step;
    let c = out[out.length - 1];
    if (!c || c.time !== time) {
      c = { time, open: prev, high: prev, low: prev, close: prev, volume: 0 };
      out.push(c);
    }
    c.close = t.price;
    c.high = Math.max(c.high, t.price);
    c.low = Math.min(c.low, t.price);
    c.volume += t.baseAmount;
    prev = t.price;
  }
  return out;
}
