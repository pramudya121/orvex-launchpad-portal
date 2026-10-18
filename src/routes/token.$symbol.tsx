import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, Copy, Globe, Heart, Send, Share2, AtSign as Twitter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getToken, fmtUsd, fmtAge, short } from "@/lib/tokens";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { Change } from "@/components/orvex/Change";
import { PriceChart } from "@/components/orvex/PriceChart";
import { useWallet } from "@/components/orvex/wallet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/token/$symbol")({
  loader: ({ params }) => {
    const t = getToken(params.symbol);
    if (!t) throw notFound();
    return { symbol: t.symbol, name: t.name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} ($${loaderData.symbol}) — ORVEX` : "Token — ORVEX" },
      { name: "description", content: loaderData ? `Live chart and trading for ${loaderData.name} on LitVM.` : "Token on ORVEX" },
      { property: "og:title", content: loaderData ? `${loaderData.name} on ORVEX` : "Token — ORVEX" },
      { property: "og:description", content: "Live chart, stats and trading on ORVEX." },
    ],
  }),
  component: TokenPage,
});

function TokenPage() {
  const { symbol } = Route.useLoaderData();
  const t = getToken(symbol)!;
  const [fav, setFav] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <TokenLogo symbol={t.symbol} hue={t.hue} size={64} />
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold">{t.name} {t.verified && <BadgeCheck className="size-5 text-primary-glow" />}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            ${t.symbol}
            <button onClick={() => { navigator.clipboard.writeText(t.address); toast("Contract copied"); }} className="flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 font-mono text-xs hover:text-foreground">{short(t.address)} <Copy className="size-3" /></button>
            <Twitter className="size-4" /><Send className="size-4" /><Globe className="size-4" />
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="icon" aria-label="Favorite" onClick={() => { setFav(!fav); toast(fav ? "Removed from watchlist" : "Added to watchlist"); }}><Heart className={cn(fav && "fill-danger text-danger")} /></Button>
          <Button variant="secondary" size="icon" aria-label="Share" onClick={() => { navigator.clipboard.writeText(location.href); toast("Link copied"); }}><Share2 /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[["Price", fmtUsd(t.price)], ["Market cap", fmtUsd(t.marketCap)], ["FDV", fmtUsd(t.marketCap * 1.2)], ["Vol 24h", fmtUsd(t.volume24h)], ["Liquidity", fmtUsd(t.liquidity)], ["Holders", t.holders.toLocaleString()], ["Age", fmtAge(t.ageHours)]].map(([k, v]) => (
          <div key={k} className="glass rounded-xl p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="mt-0.5 font-mono font-semibold">{v}</div></div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <PriceChart token={t} />
          <Tabs defaultValue="trades">
            <TabsList><TabsTrigger value="trades">Trades</TabsTrigger><TabsTrigger value="holders">Holders</TabsTrigger><TabsTrigger value="info">Info</TabsTrigger></TabsList>
            <TabsContent value="trades" className="glass rounded-2xl">
              <div className="divide-y divide-border text-sm">
                {Array.from({ length: 8 }, (_, i) => {
                  const buy = (i * 7 + t.hue) % 3 !== 0;
                  return (
                    <div key={i} className="grid grid-cols-4 px-4 py-2.5 font-mono text-xs">
                      <span className={buy ? "text-success" : "text-danger"}>{buy ? "BUY" : "SELL"}</span>
                      <span>{fmtUsd(t.price * (1 + (i - 4) / 100))}</span>
                      <span>{((i + 3) * 12_345).toLocaleString()}</span>
                      <span className="text-right text-muted-foreground">{i + 1}m ago</span>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            <TabsContent value="holders" className="glass space-y-3 rounded-2xl p-4">
              {[18, 9, 6, 4.5, 3.2, 2.1].map((p, i) => (
                <div key={i} className="text-sm">
                  <div className="flex justify-between font-mono text-xs"><span>{i === 0 ? "Liquidity pool" : short(t.creator.slice(0, 2) + t.address.slice(i + 2))}</span><span>{p}%</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface"><div className="h-full rounded-full bg-gradient-primary" style={{ width: `${p * 4}%` }} /></div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="info" className="glass space-y-3 rounded-2xl p-4 text-sm">
              <p>{t.description}</p>
              <div className="text-muted-foreground">Creator: <span className="font-mono">{short(t.creator)}</span></div>
              <div className="text-muted-foreground">Supply: 1,000,000,000 · Tax 0% · ERC-20</div>
            </TabsContent>
          </Tabs>
        </div>
        <SwapPanel symbol={t.symbol} price={t.price} change={t.change24h} />
      </div>
    </div>
  );
}

function SwapPanel({ symbol, price, change }: { symbol: string; price: number; change: number }) {
  const { address, open } = useWallet();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amt, setAmt] = useState("");
  const [confirm, setConfirm] = useState(false);
  const ltcPrice = 85;
  const out = side === "buy" ? (Number(amt) * ltcPrice) / price : (Number(amt) * price) / ltcPrice;

  return (
    <div className="glass h-fit rounded-2xl p-5 lg:sticky lg:top-24">
      <div className="mb-4 flex items-center justify-between"><span className="font-semibold">Trade</span><Change v={change} /></div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button key={s} onClick={() => setSide(s)} className={cn("rounded-lg py-2 text-sm font-semibold capitalize transition", side === s ? (s === "buy" ? "bg-success/20 text-success" : "bg-danger/20 text-danger") : "text-muted-foreground")}>{s}</button>
        ))}
      </div>
      <label className="mt-4 block text-xs text-muted-foreground">You pay ({side === "buy" ? "zkLTC" : symbol})</label>
      <Input type="number" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.0" className="mt-1.5 h-12 font-mono text-lg" />
      <div className="mt-2 flex gap-1.5">{["0.1", "0.5", "1", "5"].map((v) => <button key={v} onClick={() => setAmt(v)} className="rounded-md bg-surface px-2 py-1 font-mono text-xs text-muted-foreground hover:text-foreground">{v}</button>)}</div>
      <div className="mt-4 rounded-xl bg-surface/60 p-3 text-sm">
        <div className="text-xs text-muted-foreground">You receive (est.)</div>
        <div className="font-mono text-lg">{amt ? out.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0"} {side === "buy" ? symbol : "zkLTC"}</div>
      </div>
      <Button className="mt-4 h-11 w-full bg-gradient-primary shadow-glow" disabled={!!address && !Number(amt)} onClick={() => (address ? setConfirm(true) : open())}>
        {address ? `${side === "buy" ? "Buy" : "Sell"} ${symbol}` : "Connect wallet"}
      </Button>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {side}</AlertDialogTitle>
            <AlertDialogDescription>{amt} {side === "buy" ? "zkLTC" : symbol} → ~{out.toLocaleString(undefined, { maximumFractionDigits: 4 })} {side === "buy" ? symbol : "zkLTC"}. Slippage 1%.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { toast.success("Transaction submitted", { description: "Demo trade" }); setAmt(""); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
