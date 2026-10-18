// Server-only LitVM reader/indexer. The chain is the source of truth; the database is an index
// used for lists, charts, leaderboard and token metadata (logo, description, socials).
import { createPublicClient, formatEther, http, parseEventLogs, type Address, type Hash } from "viem";
import { bondingCurveAbi, factoryAbi, launchTokenAbi } from "./web3/abi";
import { CONTRACTS, litvm } from "./web3/chain";

// The configured multicall address reverts on LiteForge; use direct RPC calls.
export const chainClient = () => createPublicClient({ chain: litvm, transport: http(undefined, { timeout: 15_000, retryCount: 1 }) });
type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];
const n = (v: bigint) => Number(formatEther(v));

/** Reads the live state of one bonding curve. */
export async function readCurve(curve: Address) {
  const c = chainClient();
  const r = (functionName: string) => c.readContract({ address: curve, abi: bondingCurveAbi, functionName: functionName as never }) as Promise<unknown>;
  const [res, sale, total, pFee, cFee, graduated, pair, maxBuy] = await Promise.all([
    r("getReserves"), r("TOKENS_FOR_SALE"), r("TOTAL_SUPPLY"), r("protocolFeeBps"), r("creatorFeeBps"), r("graduated"), r("pair"), r("maxBuyEth").catch(() => 0n),
  ]);
  const [vToken, vEth, rToken, rEth] = res as [bigint, bigint, bigint, bigint];
  const saleSupply = n(sale as bigint);
  return {
    virtual_token: n(vToken), virtual_base: n(vEth), real_base: n(rEth),
    tokens_sold: Math.min(saleSupply, Math.max(0, saleSupply - n(rToken))),
    sale_supply: saleSupply, total_supply: n(total as bigint),
    fee_bps: Number(pFee as bigint) + Number(cFee as bigint),
    graduated: graduated as boolean,
    pair_address: (pair as string) === "0x0000000000000000000000000000000000000000" ? null : (pair as string).toLowerCase(),
    max_buy: maxBuy ? n(maxBuy as bigint) : null,
  };
}

async function upsertToken(sb: Admin, token: Address, curve: Address, creator: Address, meta?: Record<string, string | undefined>) {
  const { data: existing } = await sb.from("tokens").select("id").ilike("address", token).maybeSingle();
  const state = await readCurve(curve);
  if (existing) {
    const { error } = await sb.from("tokens").update({ ...state, curve_address: curve.toLowerCase() }).eq("id", existing.id);
    if (error) throw new Error("Token state could not be saved");
    return existing.id;
  }
  const c = chainClient();
  const [name, symbol] = await Promise.all([
    c.readContract({ address: token, abi: launchTokenAbi, functionName: "name" }),
    c.readContract({ address: token, abi: launchTokenAbi, functionName: "symbol" }),
  ]);
  const { data: row, error } = await sb.from("tokens").insert({
    address: token.toLowerCase(), curve_address: curve.toLowerCase(), creator: creator.toLowerCase(),
    name: String(name).slice(0, 64), symbol: String(symbol).toUpperCase().slice(0, 16), onchain: true,
    description: meta?.["description"] ?? "", logo_url: meta?.["logo"] || null,
    twitter: meta?.["twitter"] || null, telegram: meta?.["telegram"] || null, website: meta?.["website"] || null, ...state,
  }).select("id").single();
  if (error) throw new Error("Token could not be indexed");
  return row?.id ?? null;
}

/** Stores Bought/Sold logs of one curve as trades (deduped by tx hash). */
async function storeTradeLogs(sb: Admin, tokenId: string, logs: Parameters<typeof parseEventLogs>[0]["logs"], times: Map<bigint, string>, vEthAfter: number, vTokenAfter: number) {
  const parsed = parseEventLogs({ abi: bondingCurveAbi, logs, eventName: ["Bought", "Sold"] });
  for (const l of parsed) {
    const isBuy = l.eventName === "Bought";
    const a = l.args as { buyer?: Address; seller?: Address; ethIn?: bigint; tokensOut?: bigint; tokensIn?: bigint; ethOut?: bigint };
    const base = n((isBuy ? a.ethIn : a.ethOut) ?? 0n), tok = n((isBuy ? a.tokensOut : a.tokensIn) ?? 0n);
    const { error } = await sb.from("token_trades").upsert({
      token_id: tokenId, side: isBuy ? "buy" : "sell", base_amount: base, token_amount: tok,
      price: tok > 0 ? base / tok : vEthAfter / vTokenAfter, trader: String(isBuy ? a.buyer : a.seller).toLowerCase(),
      tx_hash: l.transactionHash.toLowerCase(), log_index: l.logIndex, created_at: times.get(l.blockNumber) ?? new Date().toISOString(),
    }, { onConflict: "tx_hash,log_index", ignoreDuplicates: true });
    if (error) throw new Error("Trade event could not be saved");
  }
}

/** Indexes one confirmed transaction (token launch and/or trade). */
export async function indexTransaction(sb: Admin, hash: Hash, meta?: Record<string, string | undefined>) {
  const c = chainClient();
  const receipt = await c.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") return { error: "Transaction reverted" };
  let symbol: string | null = null;

  const launched = parseEventLogs({ abi: factoryAbi, logs: receipt.logs, eventName: "TokenLaunched" })
    .filter((l) => l.address.toLowerCase() === CONTRACTS.factory.toLowerCase());
  for (const l of launched) {
    const own = l.args.creator.toLowerCase() === receipt.from.toLowerCase() ? meta : undefined;
    await upsertToken(sb, l.args.token, l.args.curve, l.args.creator, own);
    symbol = String(l.args.symbol).toUpperCase();
  }

  const curves = [...new Set(receipt.logs.map((l) => l.address.toLowerCase()))];
  const block = await c.getBlock({ blockNumber: receipt.blockNumber });
  const times = new Map([[receipt.blockNumber, new Date(Number(block.timestamp) * 1000).toISOString()]]);
  for (const curve of curves) {
    const { data: t } = await sb.from("tokens").select("id, symbol").eq("curve_address", curve).maybeSingle();
    if (!t) continue;
    const state = await readCurve(curve as Address);
    await sb.from("tokens").update(state).eq("id", t.id);
    await storeTradeLogs(sb, t.id, receipt.logs.filter((l) => l.address.toLowerCase() === curve), times, state.virtual_base, state.virtual_token);
    symbol = t.symbol;
  }
  if (!symbol) return { error: "No ORVEX launch or curve trade found in this transaction" };
  return { ok: true as const, symbol };
}

const SYNC_EVERY_MS = 30_000;
const LOG_WINDOW = 9_000n;

/** Discovers factory tokens and pulls recent trades. Throttled; safe to call on every list request. */
export async function syncChain(sb: Admin, force = false) {
  const { data: s } = await sb.from("chain_sync").select("*").eq("id", "factory").maybeSingle();
  if (!force && s && Date.now() - +new Date(s.updated_at) < SYNC_EVERY_MS) return;
  const c = chainClient();
  const latest = await c.getBlockNumber();
  const len = Number(await c.readContract({ address: CONTRACTS.factory, abi: factoryAbi, functionName: "getAllTokensLength" }));
  const { data: known } = await sb.from("tokens").select("address").eq("onchain", true);
  const addresses = new Set((known ?? []).map((t) => t.address.toLowerCase()));
  for (let i = 0; i < len; i++) {
    const [token, curve, creator, createdAt] = (await c.readContract({ address: CONTRACTS.factory, abi: factoryAbi, functionName: "allTokens", args: [BigInt(i)] })) as readonly [Address, Address, Address, bigint];
    if (addresses.has(token.toLowerCase())) continue;
    const id = await upsertToken(sb, token, curve, creator);
    if (id) {
      const { error } = await sb.from("tokens").update({ created_at: new Date(Number(createdAt) * 1000).toISOString() }).eq("id", id);
      if (error) throw new Error("Launch timestamp could not be saved");
    }
  }

  const { data: tokens } = await sb.from("tokens").select("id, curve_address, synced_block, graduated").eq("onchain", true).not("curve_address", "is", null);
  for (const t of tokens ?? []) {
    const from = BigInt(t.synced_block);
    const end = from + LOG_WINDOW < latest ? from + LOG_WINDOW : latest;
    if (from > latest) continue;
    const curve = t.curve_address as Address;
    const logs = await c.getLogs({ address: curve, fromBlock: from, toBlock: end });
    const state = await readCurve(curve);
    if (logs.length) {
      const blocks = [...new Set(logs.flatMap((l) => l.blockNumber === null ? [] : [l.blockNumber]))];
      const times = new Map<bigint, string>();
      await Promise.all(blocks.map(async (b) => times.set(b, new Date(Number((await c.getBlock({ blockNumber: b })).timestamp) * 1000).toISOString())));
      await storeTradeLogs(sb, t.id, logs as never, times, state.virtual_base, state.virtual_token);
    }
    const { error } = await sb.from("tokens").update({ ...state, synced_block: Number(end) }).eq("id", t.id);
    if (error) throw new Error("Curve checkpoint could not be saved");
  }
  await sb.from("chain_sync").upsert({ id: "factory", last_block: Number(latest), updated_at: new Date().toISOString() });
}
