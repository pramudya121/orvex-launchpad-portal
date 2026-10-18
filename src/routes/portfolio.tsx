import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MarketStatus } from "@/components/orvex/MarketStatus";
import { Wallet, ExternalLink, Coins, Rocket, Activity, RefreshCw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/orvex/wallet";
import { explorerTx } from "@/lib/web3/chain";
import { fmtUsd, fmtNum, fmtAge, short } from "@/lib/tokens";
import { portfolioQuery } from "@/lib/queries";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { TokenCard } from "@/components/orvex/TokenCard";
import { MarketHeading, MarketStats } from "@/components/orvex/MarketHeading";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  if (isLoading || !data) return <div className="space-y-6" aria-label="Loading portfolio"><div className="h-24 animate-pulse bg-card" /><div className="grid grid-cols-2 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse bg-card" />)}</div></div>;

  const total = data.holdings.reduce((s, h) => s + h.valueUsd, 0);
  const cost = data.holdings.reduce((s, h) => s + h.costUsd, 0);
  const pnl = total - cost;

  return (
    <div className="space-y-6">
      <MarketHeading label="Your positions" title="Portfolio" description={`${short(address)} · Live on-chain balances · Indicative USD`} icon={<Wallet className="size-3.5" />} action={<Button variant="outline" size="icon" aria-label="Refresh portfolio" title="Refresh portfolio" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={isFetching ? "animate-spin" : ""} /></Button>} />
      {data.partial && (
        <p role="status" className="text-sm text-danger">
          This wallet exceeds the current history limit. Totals may be incomplete.
        </p>
      )}
      <MarketStats items={[
        { label: "Portfolio value", value: fmtUsd(total), detail: "Live balances × indicative price", icon: <Wallet className="size-4" /> },
        { label: "Value − net spend", value: <span className={pnl >= 0 ? "text-success" : "text-danger"}>{pnl >= 0 ? "+" : "−"}{fmtUsd(Math.abs(pnl))}</span>, detail: "Curve activity only · Not PNL", icon: <ArrowUpRight className="size-4" /> },
        { label: "Assets held", value: data.holdings.length, detail: "Nonzero on-chain token balances", icon: <Coins className="size-4" /> },
        { label: "Your launches", value: data.created.length, detail: "Tokens created by this wallet", icon: <Rocket className="size-4" /> },
      ]} />
      <p className="text-[10px] text-muted-foreground">
        *Not an accounting PNL calculation. Transfers, DEX trades and gas costs are excluded. USD
        reference: $85 per zkLTC.
      </p>
      <Tabs defaultValue="holdings">
      <TabsList className="max-w-full"><TabsTrigger value="holdings">Holdings ({data.holdings.length})</TabsTrigger><TabsTrigger value="launches">Launches ({data.created.length})</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList>
      <TabsContent value="holdings" className="mt-5">
      {data.holdings.length ? (
        <div className="overflow-x-auto border-y border-border">
          <table className="w-full min-w-[540px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                {["Token", "Balance", "Value", "Value − spend", ""].map((h) => (
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
      {data.history.length === 0 && <div className="border-y border-border py-16 text-center text-sm text-muted-foreground">No curve trades for this wallet yet.</div>}
      {data.history.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <div className="divide-y divide-border border-y border-border font-mono text-xs">
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
