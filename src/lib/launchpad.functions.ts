import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { CURVE, marketCapBase, progress, spotPrice, type Reserves } from "./curve";
import { activeHolders } from "./market";

type TokenRow = Database["public"]["Tables"]["tokens"]["Row"];
type TradeRow = Database["public"]["Tables"]["token_trades"]["Row"];
type MarketStats = Database["public"]["Functions"]["token_market_stats"]["Returns"][number];

export type TokenView = {
  id: string;
  address: string;
  curveAddress: string | null;
  pairAddress: string | null;
  name: string;
  symbol: string;
  description: string;
  logoUrl: string | null;
  creator: string;
  createdAt: string;
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  price: number;
  priceUsd: number;
  marketCapUsd: number;
  progress: number;
  realBase: number;
  graduated: boolean;
  maxBuy: number | null;
  change24h: number;
  volume24hUsd: number;
  trades24h: number;
  change7d: number;
  volume7dUsd: number;
  trades7d: number;
  holders: number;
  reserves: Reserves;
};
export type TradeView = {
  id: string;
  side: "buy" | "sell";
  baseAmount: number;
  tokenAmount: number;
  price: number;
  trader: string;
  createdAt: string;
  txHash: string | null;
};

function publicClient() {
  const url = process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["SUPABASE_ANON_KEY"] ??
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend connection is not configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Pulls fresh on-chain state (throttled). Failures never block reads. */
async function sync(force = false) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncChain } = await import("./chain.server");
    await syncChain(supabaseAdmin, force);
  } catch (e) {
    console.error("chain sync failed", e);
  }
}

const reservesOf = (t: TokenRow): Reserves => ({
  virtualBase: Number(t.virtual_base),
  virtualToken: Number(t.virtual_token),
  tokensSold: Number(t.tokens_sold),
  realBase: Number(t.real_base),
  saleSupply: Number(t.sale_supply),
  totalSupply: Number(t.total_supply),
  feeBps: t.fee_bps,
});
const toTrade = (r: TradeRow): TradeView => ({
  id: r.id,
  side: r.side as "buy" | "sell",
  baseAmount: Number(r.base_amount),
  tokenAmount: Number(r.token_amount),
  price: Number(r.price),
  trader: r.trader,
  createdAt: r.created_at,
  txHash: r.tx_hash,
});

async function loadStats(sb: ReturnType<typeof publicClient>, ids: string[]) {
  if (!ids.length) return new Map<string, MarketStats>();
  const { data, error } = await sb.rpc("token_market_stats", { token_ids: ids });
  if (error) throw new Error("Market statistics could not be loaded");
  return new Map((data ?? []).map((s) => [s.token_id, s]));
}

function toView(t: TokenRow, trades: TradeView[], stats?: MarketStats): TokenView {
  const r = reservesOf(t);
  const price = spotPrice(r);
  const since = Date.now() - 86_400_000;
  const recent = trades.filter((x) => +new Date(x.createdAt) >= since);
  const first = stats?.first_price_24h ?? recent[recent.length - 1]?.price ?? price;
  const first7 = stats?.first_price_7d ?? null;
  return {
    id: t.id,
    address: t.address,
    curveAddress: t.curve_address,
    pairAddress: t.pair_address,
    name: t.name,
    symbol: t.symbol,
    description: t.description,
    logoUrl: t.logo_url,
    creator: t.creator,
    createdAt: t.created_at,
    twitter: t.twitter,
    telegram: t.telegram,
    website: t.website,
    price,
    priceUsd: price * CURVE.baseUsd,
    marketCapUsd: marketCapBase(r) * CURVE.baseUsd,
    progress: t.graduated ? 100 : progress(r),
    realBase: r.realBase,
    graduated: t.graduated,
    maxBuy: t.max_buy === null ? null : Number(t.max_buy),
    change24h: first ? (price / first - 1) * 100 : 0,
    volume24hUsd: (stats ? Number(stats.volume_24h) : recent.reduce((s, x) => s + x.baseAmount, 0)) * CURVE.baseUsd,
    trades24h: stats ? Number(stats.trades_24h) : recent.length,
    change7d: first7 ? (price / first7 - 1) * 100 : 0,
    volume7dUsd: (stats ? Number(stats.volume_7d) : 0) * CURVE.baseUsd,
    trades7d: stats ? Number(stats.trades_7d) : 0,
    holders: stats ? Number(stats.holders) : activeHolders(trades),
    reserves: r,
  };
}

export const listTokens = createServerFn({ method: "GET" }).handler(
  async (): Promise<TokenView[]> => {
    await sync();
    const sb = publicClient();
    const { data: tokens, error } = await sb
      .from("tokens")
      .select("*")
      .eq("onchain", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Could not load tokens");
    const stats = await loadStats(sb, (tokens ?? []).map((t) => t.id));
    return (tokens ?? []).map((t) => toView(t, [], stats.get(t.id)));
  },
);

export const getTokenDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { symbol: string }) =>
    z.object({ symbol: z.string().min(1).max(16) }).parse(d),
  )
  .handler(async ({ data }) => {
    await sync();
    const sb = publicClient();
    const { data: t, error: tokenError } = await sb
      .from("tokens")
      .select("*")
      .eq("onchain", true)
      .ilike("symbol", data.symbol)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (tokenError) throw new Error("Token could not be loaded");
    if (!t) return null;
    const { data: trades, error: tradesError } = await sb
      .from("token_trades")
      .select("*")
      .eq("token_id", t.id)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (tradesError) throw new Error("Trade history could not be loaded");
    const stats = await loadStats(sb, [t.id]);
    const tv = (trades ?? []).map(toTrade);
    return { token: toView(t, tv, stats.get(t.id)), trades: tv };
  });

const addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid wallet address");

/** Uploads a token logo before launch; the returned URL is attached when the launch is indexed. */
export const uploadLogo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        symbol: z
          .string()
          .trim()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9]+$/),
        logoBase64: z.string().max(3_000_000),
        logoType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Uint8Array.from(atob(data.logoBase64), (c) => c.charCodeAt(0));
    const path = `${data.symbol.toUpperCase()}-${Date.now()}.${data.logoType.split("/")[1]}`;
    const up = await supabaseAdmin.storage
      .from("token-logos")
      .upload(path, bytes, { contentType: data.logoType });
    if (up.error) return { error: "Logo upload failed" };
    const signed = await supabaseAdmin.storage
      .from("token-logos")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signed.error || !signed.data?.signedUrl) return { error: "Logo link could not be created" };
    return { url: signed.data?.signedUrl ?? null };
  });

/** Indexes a confirmed transaction. Event data from the chain is authoritative; the caller only supplies the hash. */
export const indexTx = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
        meta: z
          .object({
            description: z.string().max(280).optional(),
            twitter: z.string().max(100).optional(),
            telegram: z.string().max(100).optional(),
            website: z.string().max(200).optional(),
            logo: z.string().url().max(2000).optional(),
          })
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { indexTransaction } = await import("./chain.server");
    try {
      return await indexTransaction(supabaseAdmin, data.txHash as `0x${string}`, data.meta);
    } catch (e) {
      console.error("indexTx failed", e);
      return { error: "Could not read the transaction from LitVM yet — it will appear shortly" };
    }
  });

/** Holdings are read live from the chain (balanceOf); history and launches come from the index. */
export const getPortfolio = createServerFn({ method: "GET" })
  .inputValidator((d: { address: string }) => z.object({ address: addr }).parse(d))
  .handler(async ({ data }) => {
    await sync();
    const sb = publicClient();
    const a = data.address.toLowerCase();
    const { data: tokens, error: tokensError } = await sb.from("tokens").select("*").eq("onchain", true).limit(500);
    if (tokensError) throw new Error("Portfolio tokens could not be loaded");
    const { data: trades, error: tradesError } = await sb
      .from("token_trades")
      .select("*")
      .eq("trader", a)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (tradesError) throw new Error("Portfolio history could not be loaded");
    const { chainClient } = await import("./chain.server");
    const { launchTokenAbi } = await import("./web3/abi");
    const { formatEther } = await import("viem");
    const c = chainClient();
    const list = tokens ?? [];
    const bals = await Promise.all(
      list.map((t) =>
        c.readContract({
          address: t.address as `0x${string}`,
          abi: launchTokenAbi,
          functionName: "balanceOf",
          args: [data.address as `0x${string}`],
        }),
      ),
    );
    const holdings = list
      .map((t, i) => {
        const balance = Number(formatEther(bals[i] as bigint));
        const mine = (trades ?? []).filter((x) => x.token_id === t.id);
        const cost = mine.reduce(
          (s, x) => s + (x.side === "buy" ? 1 : -1) * Number(x.base_amount),
          0,
        );
        const v = toView(t, []);
        return {
          token: v,
          balance,
          valueUsd: balance * v.priceUsd,
          costUsd: Math.max(0, cost) * CURVE.baseUsd,
        };
      })
      .filter((h) => h.balance > 1e-9);
    return {
      partial: list.length >= 500 || (trades?.length ?? 0) >= 1000,
      holdings,
      created: list.filter((t) => t.creator === a).map((t) => toView(t, [])),
      history: (trades ?? [])
        .slice(0, 20)
        .map((x) => ({
          ...toTrade(x),
          symbol: list.find((h) => h.id === x.token_id)?.symbol ?? "?",
        })),
    };
  });

/** Leaderboard computed from indexed on-chain trades. */
export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  await sync();
  const sb = publicClient();
  const { data: tokens, error: tokensError } = await sb.from("tokens").select("*").eq("onchain", true).limit(500);
  if (tokensError) throw new Error("Leaderboard tokens could not be loaded");
  const { data: trades, error: tradesError } = await sb
    .from("token_trades")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (tradesError) throw new Error("Leaderboard trades could not be loaded");
  const sym = new Map((tokens ?? []).map((t) => [t.id, t.symbol]));
  const traders = new Map<
    string,
    { address: string; volume: number; trades: number; buys: number; sells: number; net: number }
  >();
  for (const t of trades ?? []) {
    if (!sym.has(t.token_id)) continue;
    const e = traders.get(t.trader) ?? {
      address: t.trader,
      volume: 0,
      trades: 0,
      buys: 0,
      sells: 0,
      net: 0,
    };
    const v = Number(t.base_amount);
    e.volume += v;
    e.trades++;
    if (t.side === "buy") {
      e.buys++;
      e.net -= v;
    } else {
      e.sells++;
      e.net += v;
    }
    traders.set(t.trader, e);
  }
  const creators = new Map<
    string,
    { address: string; launches: number; graduated: number; marketCapUsd: number }
  >();
  for (const t of tokens ?? []) {
    const e = creators.get(t.creator) ?? {
      address: t.creator,
      launches: 0,
      graduated: 0,
      marketCapUsd: 0,
    };
    e.launches++;
    if (t.graduated) e.graduated++;
    e.marketCapUsd += marketCapBase(reservesOf(t)) * CURVE.baseUsd;
    creators.set(t.creator, e);
  }
  const usd = (x: number) => x * CURVE.baseUsd;
  return {
    traders: [...traders.values()]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 50)
      .map((x) => ({ ...x, volumeUsd: usd(x.volume), realizedUsd: usd(x.net) })),
    creators: [...creators.values()].sort((a, b) => b.marketCapUsd - a.marketCapUsd).slice(0, 50),
    tokens: (tokens ?? [])
      .map((t) => toView(t, []))
      .sort((a, b) => b.marketCapUsd - a.marketCapUsd)
      .slice(0, 50),
  };
});
