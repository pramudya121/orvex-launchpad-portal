import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { CURVE, marketCapBase, progress, quoteBuy, quoteSell, spotPrice, type Reserves } from "./curve";

type TokenRow = Database["public"]["Tables"]["tokens"]["Row"];
type TradeRow = Database["public"]["Tables"]["token_trades"]["Row"];

export type TokenView = {
  id: string; address: string; name: string; symbol: string; description: string; logoUrl: string | null;
  creator: string; createdAt: string; twitter: string | null; telegram: string | null; website: string | null;
  price: number; priceUsd: number; marketCapUsd: number; progress: number; realBase: number; graduated: boolean; onchain: boolean;
  change24h: number; volume24hUsd: number; trades24h: number; holders: number;
  reserves: Reserves;
};
export type TradeView = { id: string; side: "buy" | "sell"; baseAmount: number; tokenAmount: number; price: number; trader: string; createdAt: string };

function publicClient() {
  const url = process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend connection is not configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const reservesOf = (t: TokenRow): Reserves => ({
  virtualBase: Number(t.virtual_base), virtualToken: Number(t.virtual_token), tokensSold: Number(t.tokens_sold), realBase: Number(t.real_base),
});
const toTrade = (r: TradeRow): TradeView => ({
  id: r.id, side: r.side as "buy" | "sell", baseAmount: Number(r.base_amount), tokenAmount: Number(r.token_amount), price: Number(r.price), trader: r.trader, createdAt: r.created_at,
});

function toView(t: TokenRow, trades: TradeView[]): TokenView {
  const r = reservesOf(t);
  const price = spotPrice(r);
  const since = Date.now() - 86_400_000;
  const recent = trades.filter((x) => +new Date(x.createdAt) >= since);
  const first = recent.length ? recent[recent.length - 1]!.price : price;
  return {
    id: t.id, address: t.address, name: t.name, symbol: t.symbol, description: t.description, logoUrl: t.logo_url,
    creator: t.creator, createdAt: t.created_at, twitter: t.twitter, telegram: t.telegram, website: t.website,
    price, priceUsd: price * CURVE.baseUsd, marketCapUsd: marketCapBase(r) * CURVE.baseUsd, progress: progress(r),
    realBase: r.realBase, graduated: t.graduated, onchain: t.onchain,
    change24h: first ? (price / first - 1) * 100 : 0,
    volume24hUsd: recent.reduce((s, x) => s + x.baseAmount, 0) * CURVE.baseUsd,
    trades24h: recent.length,
    holders: new Set(trades.map((x) => x.trader)).size,
    reserves: r,
  };
}

export const listTokens = createServerFn({ method: "GET" }).handler(async (): Promise<TokenView[]> => {
  const sb = publicClient();
  const { data: tokens, error } = await sb.from("tokens").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error("Could not load tokens");
  const { data: trades } = await sb.from("token_trades").select("*").order("created_at", { ascending: false }).limit(1000);
  const byToken = new Map<string, TradeView[]>();
  for (const tr of trades ?? []) {
    const arr = byToken.get(tr.token_id) ?? [];
    arr.push(toTrade(tr));
    byToken.set(tr.token_id, arr);
  }
  return (tokens ?? []).map((t) => toView(t, byToken.get(t.id) ?? []));
});

export const getTokenDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { symbol: string }) => z.object({ symbol: z.string().min(1).max(12) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: t } = await sb.from("tokens").select("*").ilike("symbol", data.symbol).maybeSingle();
    if (!t) return null;
    const { data: trades } = await sb.from("token_trades").select("*").eq("token_id", t.id).order("created_at", { ascending: false }).limit(1000);
    const tv = (trades ?? []).map(toTrade);
    return { token: toView(t, tv), trades: tv };
  });

const addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid wallet address");

export const createToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().trim().min(1).max(32),
      symbol: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
      description: z.string().max(280).default(""),
      creator: addr,
      twitter: z.string().max(100).optional(), telegram: z.string().max(100).optional(), website: z.string().max(200).optional(),
      logoBase64: z.string().max(3_000_000).optional(),
      logoType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]).optional(),
      devBuy: z.number().min(0).max(100).default(0),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const symbol = data.symbol.toUpperCase();
    const { data: exists } = await supabaseAdmin.from("tokens").select("id").eq("symbol", symbol).maybeSingle();
    if (exists) return { error: `$${symbol} already exists` };

    let logo_url: string | null = null;
    if (data.logoBase64 && data.logoType) {
      const bytes = Uint8Array.from(atob(data.logoBase64), (c) => c.charCodeAt(0));
      const path = `${symbol}-${Date.now()}.${data.logoType.split("/")[1]}`;
      const up = await supabaseAdmin.storage.from("token-logos").upload(path, bytes, { contentType: data.logoType });
      if (up.error) return { error: "Logo upload failed" };
      const signed = await supabaseAdmin.storage.from("token-logos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      logo_url = signed.data?.signedUrl ?? null;
    }

    const address = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, "0")).join("");
    const { data: row, error } = await supabaseAdmin.from("tokens").insert({
      address, name: data.name, symbol, description: data.description, creator: data.creator.toLowerCase(), logo_url,
      twitter: data.twitter || null, telegram: data.telegram || null, website: data.website || null,
    }).select("*").single();
    if (error || !row) return { error: "Could not create token" };

    if (data.devBuy > 0) await executeTrade(row.id, "buy", data.devBuy, data.creator.toLowerCase());
    return { symbol, address };
  });

async function executeTrade(tokenId: string, side: "buy" | "sell", amount: number, trader: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: t } = await supabaseAdmin.from("tokens").select("*").eq("id", tokenId).single();
    if (!t) return { error: "Token not found" };
    if (t.graduated) return { error: "Token graduated — trade on the DEX" };
    const r = reservesOf(t);

    if (side === "sell") {
      const { data: mine } = await supabaseAdmin.from("token_trades").select("side, token_amount").eq("token_id", tokenId).eq("trader", trader);
      const bal = (mine ?? []).reduce((s, x) => s + (x.side === "buy" ? 1 : -1) * Number(x.token_amount), 0);
      if (amount > bal + 1e-6) return { error: "Insufficient token balance" };
    }

    let q;
    try { q = side === "buy" ? quoteBuy(r, amount) : quoteSell(r, amount); } catch (e) { return { error: (e as Error).message }; }

    // Optimistic concurrency: only apply if reserves unchanged since read.
    const { data: upd } = await supabaseAdmin.from("tokens").update({
      virtual_base: q.next.virtualBase, virtual_token: q.next.virtualToken, tokens_sold: q.next.tokensSold, real_base: q.next.realBase,
      graduated: q.next.tokensSold >= CURVE.curveSupply,
    }).eq("id", tokenId).eq("tokens_sold", t.tokens_sold).select("id");
    if (!upd?.length) continue;

    await supabaseAdmin.from("token_trades").insert({
      token_id: tokenId, side, base_amount: q.baseAmount, token_amount: q.tokenAmount, price: spotPrice(q.next), trader,
      tx_hash: "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join(""),
    });
    return { ok: true as const, baseAmount: q.baseAmount, tokenAmount: q.tokenAmount, graduated: q.next.tokensSold >= CURVE.curveSupply };
  }
  return { error: "Price moved, please retry" };
}

export const trade = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ tokenId: z.string().uuid(), side: z.enum(["buy", "sell"]), amount: z.number().positive().max(1e12), trader: addr }).parse(d))
  .handler(async ({ data }) => executeTrade(data.tokenId, data.side, data.amount, data.trader.toLowerCase()));

export const getPortfolio = createServerFn({ method: "GET" })
  .inputValidator((d: { address: string }) => z.object({ address: addr }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const a = data.address.toLowerCase();
    const { data: trades } = await sb.from("token_trades").select("*").eq("trader", a).order("created_at", { ascending: false }).limit(1000);
    const { data: created } = await sb.from("tokens").select("*").eq("creator", a);
    const ids = [...new Set((trades ?? []).map((t) => t.token_id))];
    const { data: held } = ids.length ? await sb.from("tokens").select("*").in("id", ids) : { data: [] as TokenRow[] };
    const holdings = (held ?? []).map((t) => {
      const mine = (trades ?? []).filter((x) => x.token_id === t.id);
      const balance = mine.reduce((s, x) => s + (x.side === "buy" ? 1 : -1) * Number(x.token_amount), 0);
      const cost = mine.reduce((s, x) => s + (x.side === "buy" ? 1 : -1) * Number(x.base_amount), 0);
      const v = toView(t, []);
      return { token: v, balance, valueUsd: balance * v.priceUsd, costUsd: cost * CURVE.baseUsd };
    }).filter((h) => h.balance > 1e-6);
    return {
      holdings,
      created: (created ?? []).map((t) => toView(t, [])),
      history: (trades ?? []).slice(0, 20).map((x) => ({ ...toTrade(x), symbol: held?.find((h) => h.id === x.token_id)?.symbol ?? "?" })),
    };
  });

// ---------------- on-chain mode ----------------

/** Uploads a logo before the on-chain createToken call; the returned URL is stored as the token's metadata URI. */
export const uploadLogo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    symbol: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9]+$/),
    logoBase64: z.string().max(3_000_000),
    logoType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Uint8Array.from(atob(data.logoBase64), (c) => c.charCodeAt(0));
    const path = `${data.symbol.toUpperCase()}-${Date.now()}.${data.logoType.split("/")[1]}`;
    const up = await supabaseAdmin.storage.from("token-logos").upload(path, bytes, { contentType: data.logoType });
    if (up.error) return { error: "Logo upload failed" };
    const signed = await supabaseAdmin.storage.from("token-logos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    return { url: signed.data?.signedUrl ?? null };
  });

/**
 * Indexes a confirmed launchpad transaction: reads the receipt from LitVM, decodes
 * TokenCreated / Trade events emitted by the configured launchpad, and mirrors them
 * into the database. Event data is the source of truth; the caller only supplies the hash.
 */
export const indexTx = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    meta: z.object({
      description: z.string().max(280).optional(), twitter: z.string().max(100).optional(),
      telegram: z.string().max(100).optional(), website: z.string().max(200).optional(),
    }).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { createPublicClient, http, parseEventLogs, formatEther } = await import("viem");
    const { litvm, LAUNCHPAD_ADDRESS } = await import("./web3/chain");
    const { launchpadAbi } = await import("./web3/abi");
    if (!LAUNCHPAD_ADDRESS) return { error: "Launchpad contract not configured" };
    const client = createPublicClient({ chain: litvm, transport: http() });
    const receipt = await client.waitForTransactionReceipt({ hash: data.txHash as `0x${string}`, timeout: 60_000 });
    if (receipt.status !== "success") return { error: "Transaction reverted" };
    const logs = parseEventLogs({ abi: launchpadAbi, logs: receipt.logs })
      .filter((l) => l.address.toLowerCase() === LAUNCHPAD_ADDRESS.toLowerCase());
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let symbol: string | null = null;

    for (const l of logs) {
      if (l.eventName === "TokenCreated") {
        const a = l.args;
        symbol = a.symbol.toUpperCase();
        const own = data.meta && a.creator.toLowerCase() === receipt.from.toLowerCase() ? data.meta : {};
        await supabaseAdmin.from("tokens").insert({
          address: a.token.toLowerCase(), name: a.name, symbol, creator: a.creator.toLowerCase(),
          logo_url: a.uri || null, description: own.description ?? "", twitter: own.twitter || null,
          telegram: own.telegram || null, website: own.website || null, onchain: true,
        }); // duplicate (already indexed) is rejected by the unique index and safely ignored
      }
    }
    for (const l of logs) {
      if (l.eventName !== "Trade") continue;
      const a = l.args;
      const { data: t } = await supabaseAdmin.from("tokens").select("id, symbol").ilike("address", a.token).maybeSingle();
      if (!t) continue;
      symbol = t.symbol;
      const vB = Number(formatEther(a.virtualBase)), vT = Number(formatEther(a.virtualToken));
      const sold = Number(formatEther(a.tokensSold));
      await supabaseAdmin.from("tokens").update({
        virtual_base: vB, virtual_token: vT, tokens_sold: sold, real_base: Number(formatEther(a.realBase)),
        graduated: sold >= CURVE.curveSupply,
      }).eq("id", t.id);
      await supabaseAdmin.from("token_trades").upsert({
        token_id: t.id, side: a.isBuy ? "buy" : "sell", base_amount: Number(formatEther(a.baseAmount)),
        token_amount: Number(formatEther(a.tokenAmount)), price: vB / vT, trader: a.trader.toLowerCase(), tx_hash: data.txHash.toLowerCase(),
      }, { onConflict: "tx_hash", ignoreDuplicates: true });
    }
    return { ok: true as const, symbol };
  });
