import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { ArrowDownUp, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWallet } from "@/components/orvex/wallet";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { CONTRACTS, DEX_TOKENS, explorerAddress, explorerTx, type DexToken } from "@/lib/web3/chain";
import { quoteSwap, swap, tokenBalance, walletError } from "@/lib/web3/actions";
import { publicClient } from "@/lib/web3/client";
import { dexFactoryAbi, pairAbi } from "@/lib/web3/abi";
import { tokensQuery } from "@/lib/queries";
import { MarketStatus } from "@/components/orvex/MarketStatus";
import { CURVE } from "@/lib/curve";
import { fmtNum, short } from "@/lib/tokens";

export const Route = createFileRoute("/dex")({
  head: () => ({
    meta: [
      { title: "ORVEX DEX — Swap on LitVM" },
      { name: "description", content: "Swap zkLTC, ORVX, TRX, XRP, ADA, ZEC and XMR on the ORVEX DEX on LitVM LiteForge." },
      { property: "og:title", content: "ORVEX DEX — Swap on LitVM" },
      { property: "og:description", content: "Swap tokens on LitVM LiteForge with the ORVEX router." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dex,
});

const Logo = ({ t, size = 28 }: { t: DexToken; size?: number }) =>
  t.logo ? <img src={t.logo} alt="" width={size} height={size} className="shrink-0 rounded-full bg-surface" style={{ width: size, height: size }} /> : <TokenLogo symbol={t.symbol} size={size} />;

function Dex() {
  const { address, open } = useWallet();
  const qc = useQueryClient();
  const [from, setFrom] = useState<DexToken>(DEX_TOKENS[0] ?? {symbol:"zkLTC",name:"zkLTC",address:null,logo:null,decimals:18});
  const [to, setTo] = useState<DexToken>(DEX_TOKENS[2] ?? {symbol:"ORVX",name:"ORVEX",address:null,logo:null,decimals:18});
  const [amt, setAmt] = useState("");
  const [slippage, setSlippage] = useState(1);
  const { data: launched = [] } = useQuery(tokensQuery());
  const selectable = [...DEX_TOKENS, ...launched.filter(t => t.graduated && !DEX_TOKENS.some(x => x.address?.toLowerCase() === t.address.toLowerCase())).map(t => ({symbol:t.symbol,name:t.name,address:t.address as Address,logo:t.logoUrl,decimals:18}))];
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [busy, setBusy] = useState(false);
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const id = setTimeout(() => setDebounced(amt), 350); return () => clearTimeout(id); }, [amt]);

  const amountIn = useMemo(() => { try { return Number(debounced) > 0 ? parseUnits(debounced, from.decimals) : 0n; } catch { return 0n; } }, [debounced, from]);
  const isWrap = (!from.address && to.address === CONTRACTS.wzkltc) || (from.address === CONTRACTS.wzkltc && !to.address);

  const { data: quote, isFetching, isError: quoteError } = useQuery({
    queryKey: ["dexQuote", from.symbol, to.symbol, amountIn.toString()],
    queryFn: async () => (isWrap ? { path: [] as Address[], amountOut: amountIn } : quoteSwap(from.address, to.address, amountIn)),
    enabled: amountIn > 0n && from.symbol !== to.symbol, refetchInterval: 10_000,
  });
  const { data: bal } = useQuery({
    queryKey: ["dexBal", address, from.symbol],
    queryFn: () => { if (!address) throw new Error("Connect a wallet"); return tokenBalance(address, from.address); },
    enabled: !!address, refetchInterval: 15_000,
  });

  const out = quote ? Number(formatUnits(quote.amountOut, to.decimals)) : 0;
  const balance = bal !== undefined ? Number(formatUnits(bal, from.decimals)) : null;
  const err = quoteError ? "Quote unavailable — network could not respond" : from.symbol === to.symbol ? "Pick two different tokens"
    : amountIn > 0n && !isFetching && quote === null ? "No liquidity for this pair yet"
    : balance !== null && Number(amt) > balance ? "Insufficient balance" : null;

  const flip = () => { setFrom(to); setTo(from); setAmt(""); };
  const submit = async () => {
    if (!address || !quote || amt !== debounced || isFetching || busy) return;
    setBusy(true);
    try {
      const min = (quote.amountOut * BigInt(Math.round((1 - slippage / 100) * 10_000))) / 10_000n;
      const hash = await swap(address, from.address, to.address, amountIn, min, quote.path);
      toast.success(`Swapped ${amt} ${from.symbol} → ${fmtNum(out, 4)} ${to.symbol}`, { action: { label: "View tx", onClick: () => window.open(explorerTx(hash), "_blank", "noopener") } });
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
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-5"><div><div className="mb-2 text-[10px] uppercase tracking-widest text-primary">ORVEX Exchange · Testnet</div><h1 className="text-3xl font-bold">DEX</h1><p className="mt-2 text-xs text-muted-foreground">Live quotes · On-chain pool reserves</p></div><MarketStatus/></div>
      <div className="grid gap-8 xl:grid-cols-[400px_minmax(0,1fr)]">
      <div className="border border-border bg-card h-fit rounded-lg p-5">
        <h1 className="mb-4 text-xl font-bold">Swap</h1>
        <Side label="You pay" t={from} onPick={() => setPicker("from")} right={balance !== null ? <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setAmt(String(from.address ? balance : Math.max(0, balance - 0.002)))}>Balance: {fmtNum(balance, 4)}</Button> : null}>
          <Input type="number" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.0" className="h-12 border-0 bg-transparent px-0 font-mono text-2xl shadow-none focus-visible:ring-0" />
        </Side>
        <div className="relative z-10 -my-3 flex justify-center">
          <Button variant="outline" size="icon" onClick={flip} aria-label="Flip tokens" className="grid size-9 place-items-center rounded-xl border border-border bg-card hover:text-primary-glow"><ArrowDownUp className="size-4" /></Button>
        </div>
        <Side label="You receive (est.)" t={to} onPick={() => setPicker("to")}>
          <div className="flex h-12 items-center font-mono text-2xl">{isFetching ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : fmtNum(out, 6)}</div>
        </Side>
        <div className="mt-3 space-y-1 px-1 font-mono text-[11px] text-muted-foreground">
          {quote && out > 0 && Number(debounced) > 0 && <div className="flex justify-between"><span>Rate</span><span>1 {from.symbol} ≈ {fmtNum(out / Number(debounced), 6)} {to.symbol}</span></div>}
          {quote && quote.path.length > 2 && <div className="flex justify-between"><span>Route</span><span>{from.symbol} → WzkLTC → {to.symbol}</span></div>}
          <div className="flex justify-between"><span>Slippage tolerance</span><select aria-label="Slippage tolerance" value={slippage} onChange={e=>setSlippage(Number(e.target.value))} className="rounded border border-input bg-card px-1">{[0.5,1,3,5].map(v=><option key={v} value={v}>{v}%</option>)}</select></div>
          {err && <div className="text-danger">{err}</div>}
        </div>
        <Button className="mt-4 h-12 w-full bg-gradient-primary shadow-glow" disabled={!!address && (busy || isFetching || amt !== debounced || !quote || !!err || amountIn === 0n)} onClick={() => (address ? submit() : open())}>
          {busy ? <Loader2 className="animate-spin" /> : !address ? "Connect wallet" : isWrap ? (from.address ? "Unwrap" : "Wrap") : "Swap"}
        </Button>
      </div>

      <Pools />
      </div>

      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader><DialogTitle>Select a token</DialogTitle></DialogHeader>
          <div className="space-y-1">
            {selectable.map((t) => (
              <Button variant="ghost" key={t.symbol} onClick={() => { if (picker === "from") setFrom(t); else setTo(t); setPicker(null); setAmt(""); }} className="flex w-full items-center gap-3 h-auto rounded-md p-2.5 text-left hover:bg-accent">
                <Logo t={t} size={32} />
                <span className="flex-1"><span className="block text-sm font-semibold">{t.symbol}</span><span className="block text-xs text-muted-foreground">{t.name}</span></span>
                {t.address && <span className="font-mono text-[11px] text-muted-foreground">{short(t.address)}</span>}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Side({ label, t, onPick, right, children }: { label: string; t: DexToken; onPick: () => void; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface/60 p-4">
      <div className="flex justify-between text-xs text-muted-foreground"><span>{label}</span>{right}</div>
      <div className="mt-1 flex items-center gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        <Button variant="outline" onClick={onPick} className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3 text-sm font-semibold hover:border-primary-glow/50"><Logo t={t} size={24} />{t.symbol}<ChevronDown className="size-4 text-muted-foreground" /></Button>
      </div>
    </div>
  );
}

/** Live pool list read straight from the DEX factory. */
function Pools() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["pools"],
    queryFn: async () => {
      const pc = publicClient();
      const known = new Map(DEX_TOKENS.filter((t) => t.address).map((t) => [t.address?.toLowerCase() ?? "", t]));
      const len = Number(await pc.readContract({ address: CONTRACTS.dexFactory, abi: dexFactoryAbi, functionName: "allPairsLength" }));
      const ids = Array.from({ length: Math.min(len, 50) }, (_, i) => BigInt(i));
      const pairs = await Promise.all(ids.map((i) => pc.readContract({ address: CONTRACTS.dexFactory, abi: dexFactoryAbi, functionName: "allPairs", args: [i] }) as Promise<Address>));
      return Promise.all(pairs.map(async (p) => {
        const [t0, t1, res] = await Promise.all([
          pc.readContract({ address: p, abi: pairAbi, functionName: "token0" }),
          pc.readContract({ address: p, abi: pairAbi, functionName: "token1" }),
          pc.readContract({ address: p, abi: pairAbi, functionName: "getReserves" }),
        ]);
        const a = known.get(t0.toLowerCase()), b = known.get(t1.toLowerCase());
        return { pair: p, a: a ?? { symbol: short(t0), name: t0, address: t0, logo: null, decimals: 18 }, b: b ?? { symbol: short(t1), name: t1, address: t1, logo: null, decimals: 18 }, r0: Number(formatUnits(res[0], 18)), r1: Number(formatUnits(res[1], 18)) };
      }));
    },
    staleTime: 30_000, refetchInterval: 30_000,
  });
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Pools</h2>
      <div className="glass overflow-x-auto rounded-lg">
        {isError ? <div role="alert" className="p-8 text-center text-sm text-danger">Pool data unavailable.<Button variant="link" onClick={() => refetch()}>Retry</Button></div> : isLoading ? <div className="h-40 animate-pulse" /> : !data?.length ? <div className="p-10 text-center text-sm text-muted-foreground">No pools yet.</div> : (
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>{["Pool", "Reserves", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {data.map((p) => (
                <tr key={p.pair}>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex -space-x-2"><Logo t={p.a} size={24} /><Logo t={p.b} size={24} /></div><span className="font-semibold">{p.a.symbol} / {p.b.symbol}</span></div></td>
                  <td className="px-4 py-3 font-mono text-xs">{fmtNum(p.r0)} {p.a.symbol} · {fmtNum(p.r1)} {p.b.symbol}</td>
                  <td className="px-4 py-3 text-right"><a href={explorerAddress(p.pair)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Explorer <ExternalLink className="size-3" /></a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
