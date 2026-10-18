export type Token = {
  address: string;
  name: string;
  symbol: string;
  description: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  holders: number;
  ageHours: number;
  creator: string;
  verified: boolean;
  hue: number;
  views: number;
  favorites: number;
};

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const NAMES: [string, string, string][] = [
  ["Silver Doge", "SDOGE", "The shiniest doge on LitVM."],
  ["Lite Pepe", "LPEPE", "Pepe, but faster and lighter."],
  ["Orvex Cat", "OCAT", "Official mascot energy of Orvex."],
  ["Moon Lite", "MLITE", "One-way ticket to the moon."],
  ["Charlie Coin", "CHARLIE", "Named after the legend himself."],
  ["Block Frog", "BFROG", "Hops between blocks."],
  ["Silver Bull", "SBULL", "Bullish on silver."],
  ["Satoshi Lite", "SLITE", "Digital silver for degens."],
  ["Hash Hamster", "HAMS", "Runs on scrypt wheels."],
  ["Lunar Shiba", "LSHIB", "Shiba under a silver moon."],
  ["Gigachad Lite", "GCL", "Built different."],
  ["Wojak Vault", "WOJ", "Feels good, man."],
  ["Mint Monkey", "MMONK", "Mints first, asks later."],
  ["Nyan Litvm", "NYAN", "Rainbow trails on chain."],
  ["Based Owl", "BOWL", "Wise and based."],
  ["Turbo Lite", "TURBO", "Zero to turbo in one block."],
];

let cache: Token[] | null = null;
export function getTokens(): Token[] {
  if (cache) return cache;
  const r = rng(42);
  cache = NAMES.map(([name, symbol, description], i) => {
    const price = +(r() * 0.05 + 0.00001).toFixed(6);
    const supply = 1_000_000_000;
    return {
      address: "0x" + Array.from({ length: 40 }, () => Math.floor(r() * 16).toString(16)).join(""),
      name,
      symbol,
      description,
      price,
      change24h: +((r() - 0.4) * 80).toFixed(2),
      marketCap: Math.round(price * supply * (0.2 + r())),
      volume24h: Math.round(r() * 900_000 + 5_000),
      liquidity: Math.round(r() * 400_000 + 10_000),
      holders: Math.round(r() * 8000 + 50),
      ageHours: Math.round(r() * 720 + 1),
      creator: "0x" + Array.from({ length: 40 }, () => Math.floor(r() * 16).toString(16)).join(""),
      verified: r() > 0.5,
      hue: (i * 37) % 360,
      views: Math.round(r() * 50_000),
      favorites: Math.round(r() * 3000),
    };
  });
  return cache;
}

export const getToken = (symbol: string) => getTokens().find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());

export function fmtUsd(n: number) {
  if (n < 0.01) return "$" + n.toPrecision(3);
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}
export const fmtAge = (h: number) => (h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`);
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export const TIMEFRAMES = { "1m": 60, "5m": 300, "15m": 900, "1H": 3600, "4H": 14400, "1D": 86400, "1W": 604800 } as const;
export type Timeframe = keyof typeof TIMEFRAMES;

export function genCandles(token: Token, tf: Timeframe, count = 150): Candle[] {
  const step = TIMEFRAMES[tf];
  const r = rng(token.hue + 7 + step);
  const now = Math.floor(Date.now() / 1000 / step) * step;
  let p = token.price;
  const out: Candle[] = [];
  for (let i = count; i > 0; i--) {
    const open = p;
    const close = Math.max(open * (1 + (r() - 0.49) * 0.06), 1e-8);
    const high = Math.max(open, close) * (1 + r() * 0.02);
    const low = Math.min(open, close) * (1 - r() * 0.02);
    out.push({ time: now - i * step, open, high, low, close, volume: Math.round(r() * 20000 + 500) });
    p = close;
  }
  return out;
}
