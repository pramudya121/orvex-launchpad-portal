import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Address } from "viem";
import {
  ArrowDownUp,
  ChevronDown,
  ExternalLink,
  Loader2,
  Search,
  Droplets,
  RefreshCw,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWallet } from "@/components/orvex/wallet";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import {
  CONTRACTS,
  DEX_TOKENS,
  explorerAddress,
  explorerTx,
  type DexToken,
} from "@/lib/web3/chain";
import { quoteSwap, swap, tokenBalance, walletError } from "@/lib/web3/actions";
import { publicClient } from "@/lib/web3/client";
import { dexFactoryAbi, pairAbi } from "@/lib/web3/abi";
import { tokensQuery } from "@/lib/queries";
import { MarketStatus } from "@/components/orvex/MarketStatus";
import { fmtNum, short } from "@/lib/tokens";
import { assetKey, minimumOutput, transactionAmount } from "@/lib/web3/trade-safety";
import { launchTokenAbi } from "@/lib/web3/abi";

export const Route = createFileRoute("/dex")({
  head: () => ({
    meta: [
      { title: "ORVEX DEX — Swap on LitVM" },
      {
        name: "description",
        content:
          "Swap zkLTC, ORVX, TRX, XRP, ADA, ZEC and XMR on the ORVEX DEX on LitVM LiteForge.",
      },
      { property: "og:title", content: "ORVEX DEX — Swap on LitVM" },
      {
        property: "og:description",
        content: "Swap tokens on LitVM LiteForge with the ORVEX router.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dex,
});

const Logo = ({ t, size = 28 }: { t: DexToken; size?: number }) =>
  t.logo ? (
    <img
      src={t.logo}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-surface"
      style={{ width: size, height: size }}
    />
  ) : (
    <TokenLogo symbol={t.symbol} size={size} />
  );

function Dex() {
  const { address, open } = useWallet();
  const qc = useQueryClient();
  const [from, setFrom] = useState<DexToken>(
    DEX_TOKENS[0] ?? { symbol: "zkLTC", name: "zkLTC", address: null, logo: null, decimals: 18 },
  );
  const [to, setTo] = useState<DexToken>(
    DEX_TOKENS[2] ?? { symbol: "ORVX", name: "ORVEX", address: null, logo: null, decimals: 18 },
  );
  const [amt, setAmt] = useState("");
  const [slippage, setSlippage] = useState(1);
  const { data: launched = [] } = useQuery(tokensQuery());
  const selectable = [
    ...DEX_TOKENS,
    ...launched
      .filter(
        (t) =>
          t.graduated &&
          !DEX_TOKENS.some((x) => x.address?.toLowerCase() === t.address.toLowerCase()),
      )
      .map((t) => ({
        symbol: t.symbol,
        name: t.name,
        address: t.address as Address,
        logo: t.logoUrl,
        decimals: 18,
      })),
  ];
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [busy, setBusy] = useState(false);
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(amt), 350);
    return () => clearTimeout(id);
  }, [amt]);

  const amountIn = useMemo(() => {
    try {
      return Number(debounced) > 0 ? transactionAmount(debounced, from.decimals) : 0n;
    } catch {
      return 0n;
    }
  }, [debounced, from]);
  const isWrap =
    (!from.address && to.address === CONTRACTS.wzkltc) ||
    (from.address === CONTRACTS.wzkltc && !to.address);

  const {
    data: quote,
    isFetching,
    isError: quoteError,
  } = useQuery({
    queryKey: ["dexQuote", assetKey(from.address), assetKey(to.address), amountIn.toString()],
    queryFn: async () =>
      isWrap
        ? { path: [] as Address[], amountOut: amountIn }
        : quoteSwap(from.address, to.address, amountIn),
    enabled: amountIn > 0n && assetKey(from.address) !== assetKey(to.address),
    refetchInterval: 10_000,
  });
  const { data: bal } = useQuery({
    queryKey: ["dexBal", address, assetKey(from.address)],
    queryFn: () => {
      if (!address) throw new Error("Connect a wallet");
      return tokenBalance(address, from.address);
    },
    enabled: !!address,
    refetchInterval: 15_000,
  });

  const out = quote ? Number(formatUnits(quote.amountOut, to.decimals)) : 0;
  const balance = bal !== undefined ? Number(formatUnits(bal, from.decimals)) : null;
  const err = quoteError
    ? "Quote unavailable — network could not respond"
    : assetKey(from.address) === assetKey(to.address)
      ? "Pick two different tokens"
      : amountIn > 0n && !isFetching && quote === null
        ? "No liquidity for this pair yet"
        : bal !== undefined && amountIn > bal
          ? "Insufficient balance"
          : null;

  const flip = () => {
    setFrom(to);
    setTo(from);
    setAmt("");
  };
  const submit = async () => {
    if (!address || !quote || amt !== debounced || isFetching || busy) return;
    setBusy(true);
    try {
      const pc = publicClient();
      const [fromDecimals, toDecimals] = await Promise.all([
        from.address
          ? pc.readContract({
              address: from.address,
              abi: launchTokenAbi,
              functionName: "decimals",
            })
          : 18,
        to.address
          ? pc.readContract({ address: to.address, abi: launchTokenAbi, functionName: "decimals" })
          : 18,
      ]);
      if (Number(fromDecimals) !== from.decimals || Number(toDecimals) !== to.decimals)
        throw new Error(
          "Token precision differs from this listing; swap stopped for your protection",
        );
      const fresh = isWrap
        ? { path: [] as Address[], amountOut: amountIn }
        : await quoteSwap(from.address, to.address, amountIn);
      if (!fresh) throw new Error("No liquidity for this pair yet");
      const min = minimumOutput(quote.amountOut, Math.round(slippage * 100));
      if (fresh.amountOut < min)
        throw new Error("Price moved too much — review the refreshed quote");
      const hash = await swap(address, from.address, to.address, amountIn, min, fresh.path);
      toast.success(`Swapped ${amt} ${from.symbol} → ${fmtNum(out, 4)} ${to.symbol}`, {
        action: {
          label: "View tx",
          onClick: () => window.open(explorerTx(hash), "_blank", "noopener"),
        },
      });
      setAmt("");
      qc.invalidateQueries({ queryKey: ["dexBal"] });
      qc.invalidateQueries({ queryKey: ["pools"] });
    } catch (e) {
      toast.error(walletError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-5">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-widest text-primary">
            ORVEX Exchange · Testnet
          </div>
          <h1 className="text-3xl font-bold">DEX</h1>
          <p className="mt-2 text-xs text-muted-foreground">Live quotes · On-chain pool reserves</p>
        </div>
        <MarketStatus />
      </div>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="min-w-0 border border-border bg-card h-fit rounded-lg p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Swap</h2>
            <span className="flex items-center gap-1.5 text-[10px] text-success">
              <span className="size-1.5 rounded-full bg-success" /> Live quotes
            </span>
          </div>
          <Side
            label="You pay"
            t={from}
            onPick={() => setPicker("from")}
            right={
              balance !== null ? (
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() =>
                    setAmt(String(from.address ? balance : Math.max(0, balance - 0.002)))
                  }
                >
                  Balance: {fmtNum(balance, 4)}
                </Button>
              ) : null
            }
          >
            <Input
              type="number"
              min="0"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              placeholder="0.0"
              className="h-12 border-0 bg-transparent px-0 font-mono text-2xl shadow-none focus-visible:ring-0"
            />
          </Side>
          <div className="relative z-10 -my-3 flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={flip}
              aria-label="Flip tokens"
              className="grid size-9 place-items-center rounded-xl border border-border bg-card hover:text-primary-glow"
            >
              <ArrowDownUp className="size-4" />
            </Button>
          </div>
          <Side label="You receive (est.)" t={to} onPick={() => setPicker("to")}>
            <div className="flex h-12 items-center font-mono text-2xl">
              {isFetching ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                fmtNum(out, 6)
              )}
            </div>
          </Side>
          <div className="mt-3 space-y-1 px-1 font-mono text-[11px] text-muted-foreground">
            {quote && out > 0 && Number(debounced) > 0 && (
              <div className="flex justify-between">
                <span>Rate</span>
                <span>
                  1 {from.symbol} ≈ {fmtNum(out / Number(debounced), 6)} {to.symbol}
                </span>
              </div>
            )}
            {quote && quote.path.length > 2 && (
              <div className="flex justify-between">
                <span>Route</span>
                <span>
                  {from.symbol} → WzkLTC → {to.symbol}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Slippage tolerance</span>
              <select
                aria-label="Slippage tolerance"
                value={slippage}
                onChange={(e) => setSlippage(Number(e.target.value))}
                className="rounded border border-input bg-card px-1"
              >
                {[0.5, 1, 3, 5].map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>
            {err && <div className="text-danger">{err}</div>}
          </div>
          <Button
            className="mt-4 h-12 w-full bg-gradient-primary shadow-glow"
            disabled={
              !!address &&
              (busy || isFetching || amt !== debounced || !quote || !!err || amountIn === 0n)
            }
            onClick={() => (address ? submit() : open())}
          >
            {busy ? (
              <Loader2 className="animate-spin" />
            ) : !address ? (
              "Connect wallet"
            ) : isWrap ? (
              from.address ? (
                "Unwrap"
              ) : (
                "Wrap"
              )
            ) : (
              "Swap"
            )}
          </Button>
        </div>

        <Pools
          onSelect={(a, b) => {
            setFrom(a);
            setTo(b);
            setAmt("");
          }}
        />
      </div>

      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>Select a token</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {selectable.map((t) => (
              <Button
                variant="ghost"
                key={assetKey(t.address)}
                onClick={() => {
                  if (picker === "from") setFrom(t);
                  else setTo(t);
                  setPicker(null);
                  setAmt("");
                }}
                className="flex w-full items-center gap-3 h-auto rounded-md p-2.5 text-left hover:bg-accent"
              >
                <Logo t={t} size={32} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{t.symbol}</span>
                  <span className="block text-xs text-muted-foreground">{t.name}</span>
                </span>
                {t.address && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {short(t.address)}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Side({
  label,
  t,
  onPick,
  right,
  children,
}: {
  label: string;
  t: DexToken;
  onPick: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-surface/60 p-4">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {right}
      </div>
      <div className="mt-1 flex items-center gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        <Button
          variant="outline"
          onClick={onPick}
          className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3 text-sm font-semibold hover:border-primary-glow/50"
        >
          <Logo t={t} size={24} />
          {t.symbol}
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

/** Live pool list read straight from the DEX factory. */
function Pools({ onSelect }: { onSelect: (a: DexToken, b: DexToken) => void }) {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["pools"],
    queryFn: async () => {
      const pc = publicClient();
      const known = new Map(
        DEX_TOKENS.filter((t) => t.address).map((t) => [t.address?.toLowerCase() ?? "", t]),
      );
      const len = Number(
        await pc.readContract({
          address: CONTRACTS.dexFactory,
          abi: dexFactoryAbi,
          functionName: "allPairsLength",
        }),
      );
      const ids = Array.from({ length: Math.min(len, 50) }, (_, i) => BigInt(i));
      const pairs = await Promise.all(
        ids.map(
          (i) =>
            pc.readContract({
              address: CONTRACTS.dexFactory,
              abi: dexFactoryAbi,
              functionName: "allPairs",
              args: [i],
            }) as Promise<Address>,
        ),
      );
      return Promise.all(
        pairs.map(async (p) => {
          const [t0, t1, res] = await Promise.all([
            pc.readContract({ address: p, abi: pairAbi, functionName: "token0" }),
            pc.readContract({ address: p, abi: pairAbi, functionName: "token1" }),
            pc.readContract({ address: p, abi: pairAbi, functionName: "getReserves" }),
          ]);
          const a = known.get(t0.toLowerCase()),
            b = known.get(t1.toLowerCase());
          return {
            pair: p,
            a: a ?? { symbol: short(t0), name: t0, address: t0, logo: null, decimals: 18 },
            b: b ?? { symbol: short(t1), name: t1, address: t1, logo: null, decimals: 18 },
            r0: Number(formatUnits(res[0], 18)),
            r1: Number(formatUnits(res[1], 18)),
          };
        }),
      );
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const list = (data ?? []).filter((p) =>
    `${p.a.symbol} ${p.b.symbol} ${p.pair}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const active = (data ?? []).filter((p) => p.r0 > 0 && p.r1 > 0).length;
  return (
    <section className="min-w-0 space-y-5" aria-label="Liquidity pools">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase text-primary">
            <Droplets className="size-3" /> Liquidity markets
          </div>
          <h2 className="text-xl font-semibold">Pools</h2>
        </div>
        <Button
          variant="outline"
          size="icon"
          title="Refresh pools"
          aria-label="Refresh pools"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          <RefreshCw className={isFetching ? "animate-spin" : ""} />
        </Button>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border border-y border-border py-4">
        <div className="pr-3">
          <p className="text-[10px] uppercase text-muted-foreground">Indexed pools</p>
          <p className="mt-2 font-mono text-xl font-semibold">{data ? data.length : "—"}</p>
        </div>
        <div className="px-3">
          <p className="text-[10px] uppercase text-muted-foreground">With reserves</p>
          <p className="mt-2 font-mono text-xl font-semibold text-success">{data ? active : "—"}</p>
        </div>
        <div className="pl-3">
          <p className="text-[10px] uppercase text-muted-foreground">Network</p>
          <p className="mt-2 text-sm font-semibold">LiteForge</p>
          <p className="text-[10px] text-muted-foreground">Testnet</p>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search pools"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search token or pool address"
          className="pl-9"
        />
      </div>
      {isError ? (
        <div role="alert" className="border-y border-border py-10 text-center text-sm text-danger">
          Pool data unavailable.
          <Button variant="link" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div aria-label="Loading pools" className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      ) : !list.length ? (
        <div className="border-y border-border py-12 text-center">
          <Layers className="mx-auto size-7 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold">
            {search ? "No matching pools" : "No pools yet"}
          </h3>
          {search && (
            <Button variant="link" onClick={() => setSearch("")}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {list.map((p) => (
            <div key={p.pair} className="group py-4 transition-colors hover:bg-surface/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex shrink-0 -space-x-2">
                    <Logo t={p.a} size={32} />
                    <Logo t={p.b} size={32} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold">
                      {p.a.symbol} <span className="text-muted-foreground">/</span> {p.b.symbol}
                    </h3>
                    <a
                      href={explorerAddress(p.pair)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary"
                      aria-label={`Pool ${p.a.symbol} ${p.b.symbol} explorer`}
                    >
                      {short(p.pair)}
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      p.r0 > 0 && p.r1 > 0
                        ? "text-[10px] text-success"
                        : "text-[10px] text-muted-foreground"
                    }
                  >
                    {p.r0 > 0 && p.r1 > 0 ? "Active" : "No liquidity"}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={p.r0 <= 0 || p.r1 <= 0}
                    aria-label={`Swap ${p.a.symbol} ${p.b.symbol}`}
                    onClick={() => onSelect(p.a, p.b)}
                  >
                    Swap
                    <ArrowUpRight className="size-3" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">{p.a.symbol} reserve</p>
                  <p className="mt-1 break-words font-mono text-sm">{fmtNum(p.r0, 4)}</p>
                </div>
                <div className="min-w-0 border-l border-border pl-4">
                  <p className="text-[10px] text-muted-foreground">{p.b.symbol} reserve</p>
                  <p className="mt-1 break-words font-mono text-sm">{fmtNum(p.r1, 4)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        First 50 factory pools · Reserves refresh every 30 seconds · Test assets
      </p>
    </section>
  );
}
