import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Copy, Heart, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fmtUsd, fmtNum, fmtAge, short } from "@/lib/tokens";
import { tokenQuery, portfolioQuery } from "@/lib/queries";
import { indexTx, type TokenView } from "@/lib/launchpad.functions";
import type { Address } from "viem";
import { antiBotCheck, buyOnchain, sellOnchain, walletError } from "@/lib/web3/actions";
import { explorerTx, explorerAddress } from "@/lib/web3/chain";
import { CURVE, quoteBuy, quoteSell } from "@/lib/curve";
import { supabase } from "@/integrations/supabase/client";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { Change } from "@/components/orvex/Change";
import { PriceChart } from "@/components/orvex/PriceChart";
import { TokenInfoPanel } from "@/components/orvex/TokenInfoPanel";
import { useWallet } from "@/components/orvex/wallet";
import { FavoriteButton } from "@/components/orvex/Watchlist";
import { MarketError, MarketNotFound } from "@/components/orvex/RouteFeedback";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/token/$symbol")({
  validateSearch: (s: Record<string, unknown>): { side?: "buy" | "sell" } => ({
    side: s["side"] === "sell" ? ("sell" as const) : ("buy" as const),
  }),
  errorComponent: MarketError,
  notFoundComponent: MarketNotFound,
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(tokenQuery(params.symbol));
    if (!d) throw notFound();
    return { name: d.token.name, symbol: d.token.symbol };
  },
  head: ({ loaderData }) => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        title: loaderData ? `${loaderData.name} ($${loaderData.symbol}) — ORVEX` : "Token — ORVEX",
      },
      {
        name: "description",
        content: loaderData
          ? `Live bonding-curve chart and trading for ${loaderData.name} on LitVM.`
          : "Token on ORVEX",
      },
      {
        property: "og:title",
        content: loaderData ? `${loaderData.name} on ORVEX` : "Token — ORVEX",
      },
      { property: "og:description", content: "Live chart, curve progress and trading on ORVEX." },
    ],
  }),
  component: TokenPage,
});

function TokenPage() {
  const { symbol } = Route.useParams();
  const { data } = useSuspenseQuery(tokenQuery(symbol));
  const qc = useQueryClient();
  if (!data) throw notFound();
  const t = data.token;
  const trades = data.trades;

  // Realtime: refresh on every new trade for this token.
  useEffect(() => {
    const ch = supabase
      .channel(`trades-${t.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "token_trades", filter: `token_id=eq.${t.id}` },
        () => {
          qc.invalidateQueries({ queryKey: tokenQuery(symbol).queryKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [t.id, symbol, qc]);

  const holders = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of trades)
      m.set(x.trader, (m.get(x.trader) ?? 0) + (x.side === "buy" ? 1 : -1) * x.tokenAmount);
    return [...m.entries()]
      .filter(([, v]) => v > 1e-6)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [trades]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <TokenLogo symbol={t.symbol} url={t.logoUrl} size={64} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            ${t.symbol}
            <button
              onClick={() => {
                navigator.clipboard.writeText(t.address);
                toast("Contract copied");
              }}
              className="flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 font-mono text-xs hover:text-foreground"
            >
              {short(t.address)} <Copy className="size-3" />
            </button>
            <a
              href={explorerAddress(t.address)}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-success/15 px-2 py-0.5 text-xs text-success hover:underline"
            >
              Explorer
            </a>
            {t.website && (
              <a
                href={t.website}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                Website
              </a>
            )}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <FavoriteButton id={t.id} />
          <Button
            variant="secondary"
            size="icon"
            aria-label="Share"
            onClick={() => {
              navigator.clipboard.writeText(location.href);
              toast("Link copied");
            }}
          >
            <Share2 />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Price", fmtUsd(t.priceUsd)],
          ["Market cap", fmtUsd(t.marketCapUsd)],
          ["24h", `${t.change24h.toFixed(2)}%`],
          ["Vol 24h", fmtUsd(t.volume24hUsd)],
          ["Raised", `${t.realBase.toFixed(3)} zkLTC`],
          ["Holders", String(t.holders)],
          ["Age", fmtAge(t.createdAt)],
        ].map(([k, v]) => (
          <div key={k} className="glass rounded-xl p-3">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-0.5 font-mono font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <PriceChart trades={trades} token={t} />
          <Tabs defaultValue="trades">
            <TabsList>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="holders">Holders</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>
            <TabsContent value="trades" className="glass rounded-2xl">
              {trades.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No trades yet.</div>
              ) : (
                <div className="max-h-96 divide-y divide-border overflow-y-auto text-sm">
                  {trades.slice(0, 50).map((x) => (
                    <div
                      key={x.id}
                      className="grid grid-cols-5 px-4 py-2.5 font-mono text-xs animate-in fade-in"
                    >
                      <span className={x.side === "buy" ? "text-success" : "text-danger"}>
                        {x.side.toUpperCase()}
                      </span>
                      <span>{x.baseAmount.toFixed(4)} zkLTC</span>
                      <span>{fmtNum(x.tokenAmount)}</span>
                      <span className="text-muted-foreground">{short(x.trader)}</span>
                      <span className="text-right text-muted-foreground">
                        {fmtAge(x.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="holders" className="glass space-y-3 rounded-2xl p-4">
              <Holder
                label="Bonding curve"
                pct={
                  ((t.reserves.totalSupply - t.reserves.tokensSold) / t.reserves.totalSupply) * 100
                }
              />
              {holders.map(([a, v]) => (
                <Holder
                  key={a}
                  label={short(a) + (a === t.creator ? " (dev)" : "")}
                  pct={(v / t.reserves.totalSupply) * 100}
                />
              ))}
            </TabsContent>
            <TabsContent value="info" className="glass space-y-3 rounded-2xl p-4 text-sm">
              <p>{t.description || "No description."}</p>
              <div className="text-muted-foreground">
                Creator: <span className="font-mono">{short(t.creator)}</span>
              </div>
              <div className="text-muted-foreground">
                Supply {fmtNum(t.reserves.totalSupply)} · {fmtNum(t.reserves.saleSupply)} on curve ·{" "}
                {fmtNum(t.reserves.totalSupply - t.reserves.saleSupply)} for DEX liquidity ·{" "}
                {t.reserves.feeBps / 100}% trade fee
              </div>
              {t.curveAddress && (
                <div className="text-muted-foreground">
                  Bonding curve:{" "}
                  <a
                    className="font-mono hover:text-foreground"
                    href={explorerAddress(t.curveAddress)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {short(t.curveAddress)}
                  </a>
                </div>
              )}
              {t.pairAddress && (
                <div className="text-muted-foreground">
                  DEX pair:{" "}
                  <a
                    className="font-mono hover:text-foreground"
                    href={explorerAddress(t.pairAddress)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {short(t.pairAddress)}
                  </a>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <SwapPanel t={t} />
          <TokenInfoPanel t={t} trades={trades} />
        </div>
      </div>
    </div>
  );
}

function Holder({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="text-sm">
      <div className="flex justify-between font-mono text-xs">
        <span>{label}</span>
        <span>{pct.toFixed(2)}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-gradient-primary"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function SwapPanel({ t }: { t: TokenView }) {
  const { address, open } = useWallet();
  const qc = useQueryClient();
  const doIndex = useServerFn(indexTx);
  const side = Route.useSearch().side ?? "buy";
  const navigate = Route.useNavigate();
  const [amt, setAmt] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: pf } = useQuery({
    ...portfolioQuery(address ?? "0x0000000000000000000000000000000000000000"),
    enabled: !!address,
  });
  const balance = pf?.holdings.find((h) => h.token.id === t.id)?.balance ?? 0;

  const n = Number(amt);
  const quote = useMemo(() => {
    if (!(n > 0)) return null;
    try {
      return side === "buy" ? quoteBuy(t.reserves, n) : quoteSell(t.reserves, n);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [n, side, t.reserves]);
  const err =
    quote && "error" in quote
      ? quote.error
      : side === "sell" && n > balance + 1e-9
        ? "Insufficient balance"
        : side === "buy" && t.maxBuy && n > t.maxBuy
          ? `Max buy is ${t.maxBuy} zkLTC per transaction`
          : !t.curveAddress
            ? "Curve not indexed yet"
            : null;
  const q = quote && !("error" in quote) ? quote : null;

  const submit = async () => {
    if (!address || !q || !t.curveAddress || busy) return;
    setBusy(true);
    try {
      if (side === "buy" && !(await antiBotCheck(address, n))) {
        toast.error("Blocked by anti-bot protection", {
          description:
            "Cooldown, max transaction size or blacklist — wait a moment and try a smaller amount.",
        });
        return;
      }
      const hash =
        side === "buy"
          ? await buyOnchain(address, t.curveAddress as Address, amt, q.tokenAmount)
          : await sellOnchain(
              address,
              t.address as Address,
              t.curveAddress as Address,
              amt,
              q.baseAmount,
            );
      const r = await doIndex({ data: { txHash: hash } });
      toast.success(
        side === "buy"
          ? `Bought ~${fmtNum(q.tokenAmount)} ${t.symbol}`
          : `Sold for ~${q.baseAmount.toFixed(4)} zkLTC`,
        {
          description: "error" in r ? r.error : undefined,
          action: {
            label: "View tx",
            onClick: () => window.open(explorerTx(hash), "_blank", "noopener"),
          },
        },
      );
      setAmt("");
      qc.invalidateQueries({ queryKey: ["token"] });
      qc.invalidateQueries({ queryKey: ["tokens"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) {
      toast.error(walletError(e));
    } finally {
      setBusy(false);
    }
  };

  const inUnit = side === "buy" ? "zkLTC" : t.symbol;
  const outUnit = side === "buy" ? t.symbol : "zkLTC";
  const out = q ? (side === "buy" ? q.tokenAmount : q.baseAmount) : 0;
  const presets =
    side === "buy"
      ? ["0.1", "0.5", "1", "5"]
      : [0.25, 0.5, 1].map((p) => String(+(balance * p).toFixed(2)));

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-semibold">Trade</span>
        <Change v={t.change24h} />
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              navigate({ search: { side: s }, replace: true });
              setAmt("");
            }}
            className={cn(
              "rounded-lg py-2 text-sm font-semibold capitalize transition",
              side === s
                ? s === "buy"
                  ? "bg-success/20 text-success"
                  : "bg-danger/20 text-danger"
                : "text-muted-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-between text-xs text-muted-foreground">
        <span>You pay ({inUnit})</span>
        {side === "sell" && <span>Balance: {fmtNum(balance)}</span>}
      </div>
      <Input
        type="number"
        min="0"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
        placeholder="0.0"
        className="mt-1.5 h-12 font-mono text-lg"
        disabled={t.graduated}
      />
      <div className="mt-2 flex gap-1.5">
        {presets.map((v, i) => (
          <button
            key={i}
            onClick={() => setAmt(v)}
            className="rounded-md bg-surface px-2 py-1 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {side === "buy" ? v : ["25%", "50%", "Max"][i]}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-1.5 rounded-xl bg-surface/60 p-3 text-sm">
        <div className="text-xs text-muted-foreground">You receive (est.)</div>
        <div className="font-mono text-lg">
          {fmtNum(out, 4)} {outUnit}
        </div>
        {q && (
          <div className="space-y-0.5 pt-1 font-mono text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Fee ({t.reserves.feeBps / 100}%)</span>
              <span>{q.fee.toFixed(5)} zkLTC</span>
            </div>
            <div className="flex justify-between">
              <span>Price impact</span>
              <span className={Math.abs(q.priceImpact) > 5 ? "text-danger" : ""}>
                {q.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Slippage tolerance</span>
              <span>{CURVE.slippage * 100}%</span>
            </div>
            {q.capped && (
              <div className="text-primary-glow">
                Capped at remaining curve supply — this buy graduates the token.
              </div>
            )}
          </div>
        )}
        {err && <div className="text-xs text-danger">{err}</div>}
      </div>
      <Button
        className="mt-4 h-11 w-full bg-gradient-primary shadow-glow"
        disabled={t.graduated || busy || (!!address && (!q || !!err))}
        onClick={() => (address ? setConfirm(true) : open())}
      >
        {busy ? (
          <Loader2 className="animate-spin" />
        ) : t.graduated ? (
          "Trading moved to DEX"
        ) : address ? (
          `${side === "buy" ? "Buy" : "Sell"} ${t.symbol}`
        ) : (
          "Connect wallet"
        )}
      </Button>
      {t.graduated && (
        <Button asChild variant="outline" className="mt-2 w-full">
          <Link to="/dex">Open DEX</Link>
        </Button>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {side}</AlertDialogTitle>
            <AlertDialogDescription>
              {amt} {inUnit} → ~{fmtNum(out, 4)} {outUnit}. Fee {q?.fee.toFixed(5)} zkLTC, price
              impact {q?.priceImpact.toFixed(2)}%.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submit}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
