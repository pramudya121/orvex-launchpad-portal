// Server functions for the zkLTC faucet: per-user X (Twitter) connection,
// quest verification against the X API, and signature-gated quest admin.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient, type Address, createPublicClient, getAddress, http, isAddress, verifyMessage } from "viem";
import {
  appUserReconnectRequired,
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "@/integrations/lovable/appUserConnector";
import {
  deleteConnectionKeyForUser,
  getConnectionKeyForUser,
  saveConnectionKeyForUser,
} from "@/server/appUserConnections.server";
import { faucetAbi } from "@/lib/web3/abi";
import { CONTRACTS, litvm } from "@/lib/web3/chain";
import type { Database } from "@/integrations/supabase/types";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const X_CONNECTOR = "x";
export const X_SCOPES = ["users.read", "tweet.read", "offline.access", "follows.read", "like.read"];

function validWallet(input: unknown): string {
  if (typeof input !== "string" || !isAddress(input)) throw new Error("A valid wallet address is required");
  return input.toLowerCase();
}

function publicReadClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
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

export type FaucetQuest = {
  id: string;
  title: string;
  description: string | null;
  kind: "follow" | "like" | "retweet" | "visit";
  target: string;
  active: boolean;
  position: number;
};

// ---------------- Quests (public read) ----------------

export const listFaucetQuests = createServerFn({ method: "GET" })
  .inputValidator((input?: { wallet?: string }) => input ?? {})
  .handler(async ({ data }) => {
    const db = publicReadClient();
    const { data: quests, error } = await db
      .from("faucet_quests")
      .select("id, title, description, kind, target, active, position")
      .order("position", { ascending: true });
    if (error) throw error;
    let completed: string[] = [];
    if (data.wallet && isAddress(data.wallet)) {
      const { data: rows } = await db
        .from("faucet_quest_completions")
        .select("quest_id")
        .eq("wallet", data.wallet.toLowerCase());
      completed = (rows ?? []).map((r) => r.quest_id);
    }
    return { quests: (quests ?? []) as FaucetQuest[], completed };
  });

// ---------------- X connection ----------------

export const startXConnect = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string }) => input)
  .handler(async ({ data }) => {
    const wallet = validWallet(data.wallet);
    const clientKey = process.env["X_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    if (!clientKey) throw new Error("X connection is not configured yet");
    const request = getRequest();
    if (!request) throw new Error("X connect must start from an app request");
    const url = new URL(request.url);
    const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/api/oauth/x/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();
    const connectionAPIKey = await getConnectionKeyForUser(wallet, X_CONNECTOR);
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: X_CONNECTOR,
      appUserId: wallet,
      clientAPIKey: clientKey,
      returnUrl,
      connectionAPIKey: connectionAPIKey ?? undefined,
      credentialsConfiguration: { scopes: X_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeXConnection = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string; code: string }) => input)
  .handler(async ({ data }) => {
    const wallet = validWallet(data.wallet);
    if (!data.code || typeof data.code !== "string") throw new Error("Missing OAuth code");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, data.code);
    if (connectorId !== X_CONNECTOR) throw new Error("OAuth completion returned the wrong connector");
    await saveConnectionKeyForUser(wallet, connectorId, connectionAPIKey);
    return { ok: true };
  });

async function xApi(wallet: string, path: string) {
  const key = await getConnectionKeyForUser(wallet, X_CONNECTOR);
  if (!key) return { status: "disconnected" as const };
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey: key,
    connectorId: X_CONNECTOR,
    path,
    requiredScopes: X_SCOPES,
  });
  if (await appUserReconnectRequired(res)) return { status: "reconnect" as const };
  return { status: "ok" as const, res };
}

export const getXStatus = createServerFn({ method: "GET" })
  .inputValidator((input: { wallet: string }) => input)
  .handler(async ({ data }) => {
    const wallet = validWallet(data.wallet);
    const r = await xApi(wallet, "/users/me?user.fields=id,name,username,profile_image_url");
    if (r.status === "disconnected") return { connected: false as const };
    if (r.status === "reconnect") return { connected: false as const, reconnectRequired: true };
    if (!r.res.ok) throw new Error(`X profile lookup failed [${r.res.status}]: ${await r.res.text()}`);
    const body = (await r.res.json()) as { data?: { id: string; name: string; username: string; profile_image_url?: string } };
    return { connected: true as const, profile: body.data ?? null };
  });

export const disconnectX = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string }) => input)
  .handler(async ({ data }) => {
    const wallet = validWallet(data.wallet);
    const key = await getConnectionKeyForUser(wallet, X_CONNECTOR);
    if (key) {
      await disconnectAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: X_CONNECTOR });
      await deleteConnectionKeyForUser(wallet, X_CONNECTOR);
    }
    return { ok: true };
  });

// ---------------- Quest verification ----------------

async function xUserId(wallet: string) {
  const r = await xApi(wallet, "/users/me?user.fields=id,username");
  if (r.status !== "ok") return r;
  if (!r.res.ok) throw new Error(`X profile lookup failed [${r.res.status}]: ${await r.res.text()}`);
  const body = (await r.res.json()) as { data?: { id: string; username: string } };
  if (!body.data) throw new Error("X profile lookup returned no user");
  return { status: "ok" as const, user: body.data };
}

/** Verifies every active X quest for the wallet and records completions. */
export const verifyFaucetQuests = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string }) => input)
  .handler(async ({ data }) => {
    const wallet = validWallet(data.wallet);
    const db = publicReadClient();
    const { data: quests } = await db
      .from("faucet_quests")
      .select("id, title, kind, target, active")
      .eq("active", true);
    const active = (quests ?? []) as Pick<FaucetQuest, "id" | "title" | "kind" | "target">[];
    const { data: doneRows } = await db
      .from("faucet_quest_completions")
      .select("quest_id")
      .eq("wallet", wallet);
    const done = new Set((doneRows ?? []).map((r) => r.quest_id));
    const pending = active.filter((q) => !done.has(q.id));
    if (!pending.length) return { verified: [] as string[], failed: [] as string[], allDone: true };

    const me = await xUserId(wallet);
    if (me.status === "disconnected") throw new Error("Connect your X account first");
    if (me.status === "reconnect") throw new Error("Your X access needs to be renewed — reconnect X");

    const verified: string[] = [];
    const failed: string[] = [];
    for (const q of pending) {
      let ok = false;
      try {
        if (q.kind === "follow") {
          const target = await xApi(
            wallet,
            `/users/by/username/${encodeURIComponent(q.target)}?user.fields=id`,
          );
          if (target.status === "ok" && target.res.ok) {
            const t = (await target.res.json()) as { data?: { id: string } };
            if (t.data) {
              const following = await xApi(
                wallet,
                `/users/${me.user.id}/following?max_results=1000`,
              );
              if (following.status === "ok" && following.res.ok) {
                const f = (await following.res.json()) as { data?: { id: string }[] };
                ok = !!f.data?.some((u) => u.id === t.data!.id);
              }
            }
          }
        } else if (q.kind === "like") {
          const liked = await xApi(wallet, `/users/${me.user.id}/liked_tweets?max_results=100`);
          if (liked.status === "ok" && liked.res.ok) {
            const l = (await liked.res.json()) as { data?: { id: string }[] };
            ok = !!l.data?.some((t) => t.id === q.target);
          }
        } else if (q.kind === "retweet") {
          const rt = await xApi(wallet, `/tweets/${encodeURIComponent(q.target)}/retweeted_by?max_results=100`);
          if (rt.status === "ok" && rt.res.ok) {
            const r = (await rt.res.json()) as { data?: { id: string }[] };
            ok = !!r.data?.some((u) => u.id === me.user.id);
          }
        } else if (q.kind === "visit") {
          ok = true; // visit quests are confirmed by the user clicking through
        }
      } catch {
        ok = false;
      }
      if (ok) verified.push(q.id);
      else failed.push(q.id);
    }

    if (verified.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("faucet_quest_completions")
        .upsert(
          verified.map((quest_id) => ({ wallet, quest_id })),
          { onConflict: "wallet,quest_id" },
        );
      if (error) throw error;
    }
    const allDone = active.every((q) => done.has(q.id) || verified.includes(q.id));
    return { verified, failed, allDone };
  });

// ---------------- Quest admin (faucet-owner signature gated) ----------------

type QuestInput = {
  id?: string;
  title: string;
  description?: string;
  kind: "follow" | "like" | "retweet" | "visit";
  target: string;
  active?: boolean;
  position?: number;
};

async function requireFaucetOwner(address: string, signature: string, message: string) {
  if (!isAddress(address)) throw new Error("Invalid admin address");
  const ts = Number(message.split("\n").pop());
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60_000)
    throw new Error("Admin proof expired — sign again");
  const pc = createPublicClient({ chain: litvm, transport: http() });
  const owner = (await pc.readContract({
    address: CONTRACTS.faucet,
    abi: faucetAbi,
    functionName: "owner",
  })) as Address;
  if (getAddress(address) !== getAddress(owner)) throw new Error("Only the faucet owner can manage quests");
  const ok = await verifyMessage({
    address: getAddress(address),
    message,
    signature: signature as `0x${string}`,
  });
  if (!ok) throw new Error("Invalid admin signature");
}

export function adminMessage(action: string, payload: unknown, timestamp: number) {
  return `ORVEX Faucet Admin\n${action}\n${JSON.stringify(payload)}\n${timestamp}`;
}

export const adminSaveQuest = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { address: string; signature: string; message: string; quest: QuestInput }) => input,
  )
  .handler(async ({ data }) => {
    await requireFaucetOwner(data.address, data.signature, data.message);
    const q = data.quest;
    if (!q.title?.trim() || !q.target?.trim()) throw new Error("Quest title and target are required");
    if (!["follow", "like", "retweet", "visit"].includes(q.kind)) throw new Error("Invalid quest type");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      title: q.title.trim(),
      description: q.description?.trim() || null,
      kind: q.kind,
      target: q.target.trim().replace(/^@/, ""),
      active: q.active ?? true,
      position: q.position ?? 0,
    };
    const { error } = q.id
      ? await supabaseAdmin.from("faucet_quests").update(row).eq("id", q.id)
      : await supabaseAdmin.from("faucet_quests").insert(row);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteQuest = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string; signature: string; message: string; id: string }) => input)
  .handler(async ({ data }) => {
    await requireFaucetOwner(data.address, data.signature, data.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("faucet_quests").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
