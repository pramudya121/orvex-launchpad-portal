import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatEther } from "viem";
import {
  CheckCircle2,
  Circle,
  Droplets,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet,
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/orvex/wallet";
import { CONTRACTS, explorerAddress, explorerTx } from "@/lib/web3/chain";
import { claimFaucet, faucetHasClaimed, faucetState, walletError } from "@/lib/web3/faucet";
import { walletError as _w } from "@/lib/web3/actions";
import { disconnectX, getXStatus, listFaucetQuests, verifyFaucetQuests } from "@/lib/faucet.functions";
import { connectX } from "@/lib/x-connect";
import { short } from "@/lib/tokens";
import { cn } from "@/lib/utils";

const LTC_LOGO = "https://s2.coinmarketcap.com/static/img/coins/128x128/2.png";

export const Route = createFileRoute("/faucet")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "zkLTC Faucet — ORVEX" },
      { name: "description", content: "Claim free zkLTC on LitVM LiteForge: connect your wallet and X account, complete the quests, and claim." },
      { property: "og:title", content: "zkLTC Faucet — ORVEX" },
      { property: "og:description", content: "Claim free zkLTC on LitVM LiteForge: connect your wallet and X account, complete the quests, and claim." },
    ],
  }),
  component: Faucet,
});

function Faucet() {
  const { address, open } = useWallet();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const state = useQuery({ queryKey: ["faucet"], queryFn: faucetState, refetchInterval: 20_000 });
  const claimed = useQuery({
    queryKey: ["faucetClaimed", address],
    queryFn: () => faucetHasClaimed(address!),
    enabled: !!address,
    refetchInterval: 20_000,
  });
  const xStatus = useQuery({
    queryKey: ["xStatus", address],
    queryFn: () => getXStatus({ data: { wallet: address! } }),
    enabled: !!address,
  });
  const quests = useQuery({
    queryKey: ["faucetQuests", address],
    queryFn: () => listFaucetQuests({ data: { wallet: address ?? undefined } }),
  });

  const refresh = () => {
    for (const key of ["faucet", "faucetClaimed", "xStatus", "faucetQuests"])
      qc.invalidateQueries({ queryKey: [key] });
  };

  const activeQuests = (quests.data?.quests ?? []).filter((q) => q.active);
  const done = new Set(quests.data?.completed ?? []);
  const allDone = activeQuests.length > 0 && activeQuests.every((q) => done.has(q.id));
  const xConnected = !!xStatus.data?.connected;
  const canClaim = !!address && xConnected && allDone && !claimed.data;

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(walletError(e));
    } finally {
      setBusy(null);
    }
  };

  const onConnectX = () =>
    run("x", async () => {
      await connectX(address!);
    }, "X account connected");

  const onDisconnectX = () =>
    run("x", () => disconnectX({ data: { wallet: address! } }), "X account disconnected");

  const onVerify = () =>
    run("verify", async () => {
      const r = await verifyFaucetQuests({ data: { wallet: address! } });
      if (!r.allDone && r.failed.length)
        throw new Error("Some quests are not done yet on X — complete them and verify again");
    }, "Quests verified");

  const onClaim = () =>
    run("claim", async () => {
      const hash = await claimFaucet(address!);
      toast.success("zkLTC claimed!", {
        description: (
          <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="underline">
            View transaction
          </a>
        ),
      });
    }, "Claimed");

  const claimAmount = state.data ? Number(formatEther(state.data.claimAmount)) : null;
  const balance = state.data ? Number(formatEther(state.data.balance)) : null;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface/40 p-8 text-center">
        <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <img src={LTC_LOGO} alt="Litecoin" className="mx-auto size-20 rounded-full shadow-glow" />
        <h1 className="mt-5 text-3xl font-black tracking-tight">zkLTC Faucet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Free zkLTC on {`LitVM LiteForge`}. Connect your wallet and X account, finish the quests,
          and claim — once per wallet.
        </p>
        <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">You receive</p>
            <p className="mt-1 text-2xl font-black text-primary-glow">
              {claimAmount ?? "…"} <span className="text-sm font-bold">zkLTC</span>
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Faucet balance</p>
            <p className="mt-1 text-2xl font-black">
              {balance ?? "…"} <span className="text-sm font-bold">zkLTC</span>
            </p>
          </div>
        </div>
        <a
          href={explorerAddress(CONTRACTS.faucet)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Faucet contract {short(CONTRACTS.faucet)} <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Steps */}
      <div className="mt-6 space-y-3">
        {/* 1. Wallet */}
        <Step
          n={1}
          title="Connect wallet"
          done={!!address}
          action={
            address ? (
              <span className="font-mono text-xs text-muted-foreground">{short(address)}</span>
            ) : (
              <Button size="sm" onClick={open} className="bg-gradient-primary shadow-glow">
                <Wallet className="size-4" /> Connect
              </Button>
            )
          }
        />

        {/* 2. X account */}
        <Step
          n={2}
          title="Connect your X account"
          done={xConnected}
          locked={!address}
          action={
            !address ? null : xConnected ? (
              <div className="flex items-center gap-2">
                {xStatus.data?.connected && xStatus.data.profile?.profile_image_url ? (
                  <img src={xStatus.data.profile.profile_image_url} alt="" className="size-6 rounded-full" />
                ) : null}
                <span className="text-xs font-semibold">
                  @{xStatus.data?.connected ? xStatus.data.profile?.username : ""}
                </span>
                <Button variant="ghost" size="sm" disabled={busy === "x"} onClick={onDisconnectX}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" disabled={busy === "x"} onClick={onConnectX}>
                {busy === "x" ? <Loader2 className="size-4 animate-spin" /> : <XIcon className="size-4" />}
                {xStatus.data && !xStatus.data.connected && "reconnectRequired" in xStatus.data
                  ? "Reconnect X"
                  : "Connect X"}
              </Button>
            )
          }
        />

        {/* 3. Quests */}
        <div
          className={cn(
            "rounded-2xl border border-border bg-surface/40 p-5",
            (!address || !xConnected) && "opacity-60",
          )}
        >
          <div className="flex items-center justify-between">
            <StepTitle n={3} title="Complete the quests" done={allDone} />
            <Button
              size="sm"
              variant="outline"
              disabled={!xConnected || busy === "verify" || allDone}
              onClick={onVerify}
            >
              {busy === "verify" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Verify
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {quests.isPending ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Loading quests…</p>
            ) : !activeQuests.length ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No quests yet — check back soon.</p>
            ) : (
              activeQuests.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3"
                >
                  {done.has(q.id) ? (
                    <CheckCircle2 className="size-5 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{q.title}</p>
                    {q.description ? (
                      <p className="truncate text-xs text-muted-foreground">{q.description}</p>
                    ) : null}
                  </div>
                  {!done.has(q.id) && (
                    <a
                      href={questUrl(q.kind, q.target)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold transition hover:border-primary/60 hover:text-primary-glow"
                    >
                      {q.kind === "follow" ? "Follow" : q.kind === "like" ? "Like" : q.kind === "retweet" ? "Repost" : "Open"}
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. Claim */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <StepTitle n={4} title="Claim your zkLTC" done={!!claimed.data} />
          {claimed.data ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" /> This wallet already claimed. Enjoy your zkLTC!
            </p>
          ) : (
            <>
              <Button
                className="mt-4 w-full bg-gradient-primary py-6 text-base font-black shadow-glow"
                disabled={!canClaim || busy === "claim"}
                onClick={onClaim}
              >
                {busy === "claim" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Droplets className="size-5" />
                )}
                Claim {claimAmount ?? ""} zkLTC
              </Button>
              {!canClaim && address && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  {!xConnected
                    ? "Connect your X account to unlock the claim."
                    : !allDone
                      ? "Finish every quest and press Verify to unlock the claim."
                      : null}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function questUrl(kind: string, target: string) {
  if (kind === "follow") return `https://x.com/${target}`;
  if (kind === "visit") return target;
  return `https://x.com/i/web/status/${target}`;
}

function Step({
  n,
  title,
  done,
  locked,
  action,
}: {
  n: number;
  title: string;
  done: boolean;
  locked?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/40 p-5",
        locked && "opacity-60",
      )}
    >
      <StepTitle n={n} title={title} done={done} />
      {action}
    </div>
  );
}

function StepTitle({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-xs font-black",
          done ? "bg-success/20 text-success" : "bg-primary/15 text-primary-glow",
        )}
      >
        {done ? <CheckCircle2 className="size-4" /> : n}
      </span>
      <h2 className="text-sm font-bold">{title}</h2>
    </div>
  );
}
