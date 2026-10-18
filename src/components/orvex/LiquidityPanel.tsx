import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatUnits, type Hash } from "viem";
import { ChevronDown, Loader2, Plus, Minus, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEX_TOKENS, explorerTx, type DexToken } from "@/lib/web3/chain";
import { assetKey, transactionAmount, minimumOutput } from "@/lib/web3/trade-safety";
import { liquidityDeposit, liquidityWithdrawal, liquidityPercent } from "@/lib/web3/liquidity-math";
import { liquidityPool, transactLiquidity, type LiquidityStatus } from "@/lib/web3/liquidity";
import { tokenBalance, walletError } from "@/lib/web3/actions";
import { publicClient } from "@/lib/web3/client";
import { fmtNum } from "@/lib/tokens";
import { useWallet } from "./wallet";
import { DexLogo, DexTokenPicker } from "./DexTokenPicker";

export function LiquidityPanel({ selected }: { selected?: { a: DexToken; b: DexToken } | null }) {
  const { address, open } = useWallet();
  const qc = useQueryClient();
  const [a, setA] = useState<DexToken>(DEX_TOKENS[0] ?? { symbol: "zkLTC", name: "zkLTC", address: null, logo: null, decimals: 18 });
  const [b, setB] = useState<DexToken>(DEX_TOKENS[2] ?? { symbol: "ORVX", name: "ORVEX", address: null, logo: null, decimals: 18 });
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [percent, setPercent] = useState(25);
  const [slippage, setSlippage] = useState(1);
  const [picker, setPicker] = useState<"a" | "b" | null>(null);
  const [review, setReview] = useState<{ outputs: readonly [bigint, bigint]; amountA: bigint; amountB: bigint } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<LiquidityStatus | null>(null);
  const [pending, setPending] = useState<{ hash: Hash; account: string } | null>(null);
  useEffect(() => { if (selected) { setA(selected.a); setB(selected.b); setInputA(""); setInputB(""); setMode("remove"); } }, [selected]);
  useEffect(() => {
    try { const saved = JSON.parse(sessionStorage.getItem("orvex-pending-liquidity") ?? "null");
      if (saved && /^0x[0-9a-fA-F]{64}$/.test(saved.hash) && /^0x[0-9a-fA-F]{40}$/.test(saved.account)) setPending(saved);
    } catch { sessionStorage.removeItem("orvex-pending-liquidity"); }
  }, []);
  const pool = useQuery({ queryKey: ["liquidityPool", assetKey(a.address), assetKey(b.address), address], queryFn: () => liquidityPool(a, b, address), refetchInterval: 15_000 });
  const balances = useQuery({ queryKey: ["liquidityBalances", address, assetKey(a.address), assetKey(b.address)], enabled: !!address, queryFn: async () => {
    if (!address) return null;
    const [ba, bb] = await Promise.all([tokenBalance(address, a.address), tokenBalance(address, b.address)]);
    return [ba, bb] as const;
  }, refetchInterval: 15_000 });
  const invalidate = () => {
    for (const key of ["pools", "liquidityPool", "liquidityBalances", "dexBal", "dexPickerBalances", "portfolio"])
      qc.invalidateQueries({ queryKey: [key] });
  };
  const clearPending = () => { setPending(null); sessionStorage.removeItem("orvex-pending-liquidity"); };
  const checkPending = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const receipt = await publicClient().getTransactionReceipt({ hash: pending.hash });
      setStatus({ phase: receipt.status === "success" ? "success" : "error", label: receipt.status === "success" ? "Liquidity transaction confirmed" : "Liquidity transaction reverted", hash: pending.hash });
      clearPending(); invalidate();
    } catch { setStatus({ phase: "pending", label: "Transaction still pending — check again shortly", hash: pending.hash }); }
    finally { setBusy(false); }
  };
  let quote: { outputs: readonly [bigint, bigint]; amountA: bigint; amountB: bigint } | null = null;
  let error: string | null = null;
  try {
    if (pool.data) {
      if (mode === "add" && inputA && inputB) {
        const amountA = transactionAmount(inputA, a.decimals), amountB = transactionAmount(inputB, b.decimals);
        quote = { amountA, amountB, outputs: liquidityDeposit(amountA, amountB, pool.data.reserveA, pool.data.reserveB) };
        if (balances.data && (amountA > balances.data[0] || amountB > balances.data[1])) error = "Insufficient balance";
      } else if (mode === "remove" && pool.data.lpBalance > 0n) {
        const amountA = liquidityPercent(pool.data.lpBalance, percent);
        quote = { amountA, amountB: 0n, outputs: liquidityWithdrawal(amountA, pool.data.supply, pool.data.reserveA, pool.data.reserveB) };
      }
      if (quote) { minimumOutput(quote.outputs[0], slippage * 100); minimumOutput(quote.outputs[1], slippage * 100); }
    }
  } catch (e) { error = walletError(e); }
  const execute = async () => {
    if (!address || !review || busy || pending) return;
    setBusy(true); setReview(null); setStatus({ phase: "wallet", label: "Checking balances and pool reserves" });
    try {
      await transactLiquidity(address, a, b, mode, review.amountA, review.amountB, review.outputs, slippage * 100, setStatus, (hash) => {
        const value = { hash, account: address }; setPending(value);
        sessionStorage.setItem("orvex-pending-liquidity", JSON.stringify(value));
      });
      clearPending(); invalidate(); setInputA(""); setInputB("");
    } catch (e) { setStatus((old) => ({ phase: "error", label: walletError(e), ...(old?.hash ? { hash: old.hash } : {}) })); }
    finally { setBusy(false); }
  };
  return <section className="mx-auto max-w-md space-y-5 rounded-lg border border-border bg-card p-5" aria-label="Manage liquidity">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Manage liquidity</h2><span className="text-[10px] text-muted-foreground">LiteForge testnet</span></div>
    <Tabs value={mode} onValueChange={(v) => { setMode(v as "add" | "remove"); setStatus(null); }}><TabsList className="w-full"><TabsTrigger disabled={busy || !!pending} className="flex-1" value="add"><Plus className="mr-2 size-4" />Add</TabsTrigger><TabsTrigger disabled={busy || !!pending} className="flex-1" value="remove"><Minus className="mr-2 size-4" />Remove</TabsTrigger></TabsList></Tabs>
    {[a,b].map((t,i) => <div key={i} className="rounded-lg bg-surface/60 p-3"><div className="mb-2 flex justify-between gap-2 text-xs text-muted-foreground"><span>{mode === "add" ? "Deposit" : "Pool asset"}</span><span>Balance: {balances.data ? fmtNum(Number(formatUnits(balances.data[i] ?? 0n, t.decimals)), 6) : balances.isError ? "Unavailable" : address ? "…" : "—"}</span></div><div className="flex items-center gap-2"><div className="min-w-0 flex-1">{mode === "add" ? <Input aria-label={`${i === 0 ? "First" : "Second"} liquidity amount`} disabled={busy || !!pending} inputMode="decimal" placeholder="0.0" value={i === 0 ? inputA : inputB} onChange={(e) => i === 0 ? setInputA(e.target.value) : setInputB(e.target.value)} className="border-0 bg-transparent px-0 font-mono text-xl shadow-none" /> : <span className="font-mono text-lg">{pool.data ? fmtNum(Number(formatUnits(i === 0 ? pool.data.reserveA : pool.data.reserveB,t.decimals)),4) : "—"}</span>}</div><Button variant="outline" disabled={busy || !!pending} className="gap-2" onClick={() => setPicker(i === 0 ? "a" : "b")}><DexLogo t={t} size={24} />{t.symbol}<ChevronDown className="size-3" /></Button></div></div>)}
    {mode === "remove" && <div className="space-y-3"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Your LP tokens</span><span className="font-mono">{pool.data ? formatUnits(pool.data.lpBalance,18) : "—"}</span></div><div className="flex gap-2">{[25,50,75,100].map((p) => <Button key={p} className="flex-1" variant={p === percent ? "secondary" : "outline"} disabled={busy || !!pending} onClick={() => setPercent(p)}>{p}%</Button>)}</div>{address && pool.data?.lpBalance === 0n && <p className="text-xs text-muted-foreground">No withdrawable LP tokens for this pair.</p>}</div>}
    <div className="flex items-center justify-between text-xs text-muted-foreground"><label htmlFor="liquidity-slippage">Slippage tolerance</label><select id="liquidity-slippage" disabled={busy || !!pending} value={slippage} onChange={(e) => setSlippage(Number(e.target.value))} className="rounded border border-input bg-card px-2 py-1">{[0.5,1,3].map((s) => <option key={s} value={s}>{s}%</option>)}</select></div>
    {quote && <dl className="space-y-2 border-t border-border pt-3 text-xs"><dt className="text-muted-foreground">{mode === "add" ? "Estimated deposit" : "Estimated withdrawal"}</dt>{[a,b].map((t,i) => <dd key={i} className="flex justify-between"><span>{t.symbol}</span><span className="font-mono">{fmtNum(Number(formatUnits(quote.outputs[i] ?? 0n,t.decimals)),6)}</span></dd>)}{mode === "add" && pool.data?.supply === 0n && <dd className="text-warning">New pool — your deposit sets its initial price.</dd>}</dl>}
    {pool.isError && <p role="alert" className="text-xs text-danger">Pool unavailable. <Button variant="link" onClick={() => pool.refetch()}>Retry</Button></p>}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    <Button className="h-11 w-full" disabled={!!address && (busy || !!pending || !quote || !!error || pool.isFetching || !balances.data)} onClick={() => address ? setReview(quote) : open()}>{busy ? <Loader2 className="animate-spin" /> : !address ? "Connect wallet" : mode === "add" ? "Review add liquidity" : "Review withdrawal"}</Button>
    {(status || pending) && <div role="status" className="space-y-2 border-t border-border pt-3 text-sm"><div className={status?.phase === "error" ? "flex items-center gap-2 text-danger" : "flex items-center gap-2 text-muted-foreground"}>{status?.phase === "success" ? <CheckCircle2 className="size-4 text-success" /> : busy ? <Loader2 className="size-4 animate-spin" /> : null}{status?.label ?? "Liquidity transaction submitted"}</div>{(pending?.hash ?? status?.hash) && <Button variant="link" asChild className="h-auto p-0"><a href={explorerTx(pending?.hash ?? status?.hash ?? "")} target="_blank" rel="noreferrer">View transaction<ExternalLink className="ml-1 size-3" /></a></Button>}{pending && <Button variant="outline" size="sm" disabled={busy} onClick={checkPending}>Check confirmation</Button>}</div>}
    <DexTokenPicker open={!!picker} onClose={() => setPicker(null)} onSelect={(t) => { if (picker === "a") setA(t); else setB(t); setInputA(""); setInputB(""); setStatus(null); }} />
    <Dialog open={!!review} onOpenChange={(v) => !v && setReview(null)}><DialogContent className="max-w-sm bg-card"><DialogHeader><DialogTitle>{mode === "add" ? "Confirm add liquidity" : "Confirm withdrawal"}</DialogTitle></DialogHeader><dl className="space-y-3 text-sm">{[a,b].map((t,i) => <div key={i} className="flex justify-between"><dt>{t.symbol}</dt><dd className="font-mono">{review ? formatUnits(review.outputs[i] ?? 0n,t.decimals) : "—"}</dd></div>)}<div className="flex justify-between text-muted-foreground"><dt>Slippage</dt><dd>{slippage}%</dd></div><div className="flex justify-between text-muted-foreground"><dt>Recipient</dt><dd>{address ? `${address.slice(0,6)}…${address.slice(-4)}` : "—"}</dd></div></dl><p className="text-xs text-muted-foreground">Token approval may require a separate wallet confirmation. Network fees apply.</p><Button disabled={busy} onClick={execute}>Confirm {mode === "add" ? "deposit" : "withdrawal"}</Button></DialogContent></Dialog>
  </section>;
}