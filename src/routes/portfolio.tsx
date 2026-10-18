import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, ExternalLink, Coins, Rocket, RefreshCw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/orvex/wallet";
import { explorerTx } from "@/lib/web3/chain";
import { fmtUsd, fmtNum, fmtAge, short } from "@/lib/tokens";
import { portfolioQuery } from "@/lib/queries";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { TokenCard } from "@/components/orvex/TokenCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ALLOC = ["bg-primary", "bg-success", "bg-warning", "bg-primary-glow", "bg-danger", "bg-accent"];

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Portfolio — ORVEX" },
      {
        name: "description",
        content: "Track your memecoin holdings, launches and trade history on ORVEX.",
      },
      { property: "og:title", content: "Portfolio — ORVEX" },
      { property: "og:description", content: "Track your memecoin holdings on ORVEX." },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { address, open } = useWallet();
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    ...portfolioQuery(address ?? "0x0000000000000000000000000000000000000000"),
    enabled: !!address,
  });

  if (!address) {
    return (
      <div className="mx-auto max-w-xl border-y border-border py-16 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/20">
          <Wallet className="size-6 text-primary-glow" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold">Your portfolio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect a wallet to see your holdings, launches and curve activity.
        </p>
        <Button onClick={open} className="mt-6 bg-gradient-primary shadow-glow">
          Connect wallet
        </Button>
      </div>
    );
  }
  if (isError)
    return (
      <div role="alert" className="py-16 text-center">
        <h1 className="text-xl font-bold">Portfolio unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Balances could not be read from the network.
        </p>
        <Button className="mt-5" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  if (isLoading || !data)
    return (
      <div className="space-y-6" aria-label="Loading portfolio">
        <div className="h-24 animate-pulse bg-card" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-card" />
          ))}
        </div>
      </div>
    );

  const total = data.holdings.reduce((s, h) => s + h.valueUsd, 0);
  const cost = data.holdings.reduce((s, h) => s + h.costUsd, 0);
  const pnl = total - cost;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary)_0%,transparent_60%)] opacity-20" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
              <Wallet className="size-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Portfolio value</p>
              <p className="font-mono text-3xl font-black md:text-4xl">{fmtUsd(total)}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{short(address)}</span>
                <span className={pnl >= 0 ? "text-success" : "text-danger"}>
                  {pnl >= 0 ? "+" : "−"}{fmtUsd(Math.abs(pnl))}{cost > 0 ? ` (${((pnl / cost) * 100).toFixed(2)}%)` : ""}
                </span>
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
            <RefreshCw className={isFetching ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
        {total > 0 && (
          <div className="relative mt-6">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface">
              {data.holdings.map((h, i) => (
                <div key={h.token.id} title={h.token.symbol} className={ALLOC[i % ALLOC.length]} style={{ width: `${(h.valueUsd / total) * 100}%` }} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              {data.holdings.slice(0, 6).map((h, i) => (
                <span key={h.token.id} className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${ALLOC[i % ALLOC.length]}`} />
                  {h.token.symbol} <span className="font-mono text-muted-foreground">{((h.valueUsd / total) * 100).toFixed(1)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
      {data.partial && (
        <p role="status" className="text-sm text-danger">
          This wallet exceeds the current history limit. Totals may be incomplete.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "Net spend", v: fmtUsd(cost), i: <Coins className="size-3.5" /> },
          { l: "Value − spend", v: `${pnl >= 0 ? "+" : "−"}${fmtUsd(Math.abs(pnl))}`, i: <ArrowUpRight className="size-3.5" />, c: pnl >= 0 ? "text-success" : "text-danger" },
          { l: "Assets held", v: String(data.holdings.length), i: <Wallet className="size-3.5" /> },
          { l: "Your launches", v: String(data.created.length), i: <Rocket className="size-3.5" /> },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border border-border bg-card/70 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">{x.i} {x.l}</p>
            <p className={`mt-2 font-mono text-xl font-bold ${x.c ?? ""}`}>{x.v}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        *Not an accounting PNL calculation. Transfers, DEX trades and gas costs are excluded. USD
        reference: $85 per zkLTC.
      </p>
      <Tabs defaultValue="holdings">
        <TabsList className="max-w-full">
          <TabsTrigger value="holdings">Holdings ({data.holdings.length})</TabsTrigger>
          <TabsTrigger value="launches">Launches ({data.created.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="holdings" className="mt-5">
          {data.holdings.length ? (
            <div className="overflow-x-auto rounded-xl border border-border bg-card/70">
              <table className="w-full min-w-[540px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    {["Token", "Balance", "Value", "Allocation", "Value − spend", ""].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.holdings.map(({ token: t, balance, valueUsd, costUsd }) => (
                    <tr key={t.id} className="transition-colors hover:bg-surface/50">
                      <td className="px-4 py-3">
                        <Link
                          to="/token/$symbol"
                          params={{ symbol: t.symbol }}
                          className="flex items-center gap-3"
                        >
                          <TokenLogo symbol={t.symbol} url={t.logoUrl} size={28} />
                          {t.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono">{fmtNum(balance)}</td>
                      <td className="px-4 py-3 font-mono">{fmtUsd(valueUsd)}</td>
                      <td className="w-36 px-4 py-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (valueUsd / total) * 100 : 0}%` }} />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">{total ? ((valueUsd / total) * 100).toFixed(1) : "0"}%</span>
                      </td>
                      <td
                        className={
                          valueUsd >= costUsd
                            ? "px-4 py-3 font-mono text-success"
                            : "px-4 py-3 font-mono text-danger"
                        }
                      >
                        {fmtUsd(valueUsd - costUsd)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="secondary">
                          <Link to="/token/$symbol" params={{ symbol: t.symbol }}>
                            Trade
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-y border-border py-14 text-center text-sm text-muted-foreground">
              No holdings yet.{" "}
              <Link to="/explore" className="text-primary-glow">
                Find a token
              </Link>
              .
            </div>
          )}
        </TabsContent>
        <TabsContent value="launches" className="mt-5">
          {data.created.length ? (
            <div className="token-grid">
              {data.created.map((t) => (
                <TokenCard key={t.id} t={t} />
              ))}
            </div>
          ) : (
            <div className="border-y border-border py-14 text-center">
              <div className="font-semibold">No tokens created yet</div>
              <Button asChild className="mt-4 bg-gradient-primary">
                <Link to="/create">Create token</Link>
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="activity" className="mt-5">
          {data.history.length === 0 && (
            <div className="border-y border-border py-16 text-center text-sm text-muted-foreground">
              No curve trades for this wallet yet.
            </div>
          )}
          {data.history.length > 0 && (
            <>
              <h2 className="text-lg font-semibold">Recent activity</h2>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/70 font-mono text-xs">
                {data.history.map((h) => (
                  <div key={h.id} className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4">
                    <span className={h.side === "buy" ? "text-success" : "text-danger"}>
                      {h.side.toUpperCase()} {h.symbol}
                    </span>
                    <span>{fmtNum(h.tokenAmount)}</span>
                    <span>{h.baseAmount.toFixed(4)} zkLTC</span>
                    <span className="text-right text-muted-foreground">
                      {h.txHash ? (
                        <a
                          href={explorerTx(h.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1"
                        >
                          {fmtAge(h.createdAt)}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        fmtAge(h.createdAt)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
