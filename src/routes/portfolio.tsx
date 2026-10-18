import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/orvex/wallet";
import { fmtUsd, fmtNum, fmtAge } from "@/lib/tokens";
import { portfolioQuery } from "@/lib/queries";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { TokenCard } from "@/components/orvex/TokenCard";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — ORVEX" },
      { name: "description", content: "Track your memecoin holdings, launches and trade history on ORVEX." },
      { property: "og:title", content: "Portfolio — ORVEX" },
      { property: "og:description", content: "Track your memecoin holdings on ORVEX." },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { address, open } = useWallet();
  const { data, isLoading } = useQuery({ ...portfolioQuery(address ?? "0x0000000000000000000000000000000000000000"), enabled: !!address });

  if (!address) {
    return (
      <div className="glass mx-auto max-w-md rounded-3xl p-12 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/20"><Wallet className="size-6 text-primary-glow" /></div>
        <h1 className="mt-5 text-2xl font-bold">Your portfolio</h1>
        <p className="mt-2 text-sm text-muted-foreground">Connect a wallet to see holdings, PNL and your launches.</p>
        <Button onClick={open} className="mt-6 bg-gradient-primary shadow-glow">Connect wallet</Button>
      </div>
    );
  }
  if (isLoading || !data) return <div className="glass h-40 animate-pulse rounded-2xl" />;

  const total = data.holdings.reduce((s, h) => s + h.valueUsd, 0);
  const cost = data.holdings.reduce((s, h) => s + h.costUsd, 0);
  const pnl = total - cost;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="text-sm text-muted-foreground">Total value</div>
        <div className="mt-1 font-mono text-4xl font-bold">{fmtUsd(total)}</div>
        <div className={pnl >= 0 ? "mt-1 text-sm text-success" : "mt-1 text-sm text-danger"}>{pnl >= 0 ? "+" : "−"}{fmtUsd(Math.abs(pnl))} unrealized PNL</div>
      </div>

      <h2 className="text-lg font-semibold">Holdings</h2>
      {data.holdings.length ? (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>{["Token", "Balance", "Value", "PNL", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {data.holdings.map(({ token: t, balance, valueUsd, costUsd }) => (
                <tr key={t.id}>
                  <td className="px-4 py-3"><Link to="/token/$symbol" params={{ symbol: t.symbol }} className="flex items-center gap-3"><TokenLogo symbol={t.symbol} url={t.logoUrl} size={28} />{t.symbol}</Link></td>
                  <td className="px-4 py-3 font-mono">{fmtNum(balance)}</td>
                  <td className="px-4 py-3 font-mono">{fmtUsd(valueUsd)}</td>
                  <td className={valueUsd >= costUsd ? "px-4 py-3 font-mono text-success" : "px-4 py-3 font-mono text-danger"}>{fmtUsd(valueUsd - costUsd)}</td>
                  <td className="px-4 py-3 text-right"><Button asChild size="sm" variant="secondary"><Link to="/token/$symbol" params={{ symbol: t.symbol }}>Trade</Link></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">No holdings yet. <Link to="/explore" className="text-primary-glow">Find a token</Link>.</div>
      )}

      <h2 className="text-lg font-semibold">Your launches</h2>
      {data.created.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.created.map((t) => <TokenCard key={t.id} t={t} />)}</div>
      ) : (
        <div className="glass rounded-2xl p-10 text-center">
          <div className="font-semibold">No tokens created yet</div>
          <Button asChild className="mt-4 bg-gradient-primary"><Link to="/create">Create token</Link></Button>
        </div>
      )}

      {data.history.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <div className="glass divide-y divide-border rounded-2xl font-mono text-xs">
            {data.history.map((h) => (
              <div key={h.id} className="grid grid-cols-4 px-4 py-2.5">
                <span className={h.side === "buy" ? "text-success" : "text-danger"}>{h.side.toUpperCase()} {h.symbol}</span>
                <span>{fmtNum(h.tokenAmount)}</span>
                <span>{h.baseAmount.toFixed(4)} zkLTC</span>
                <span className="text-right text-muted-foreground">{fmtAge(h.createdAt)} ago</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
