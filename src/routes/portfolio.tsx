import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/orvex/wallet";
import { getTokens, fmtUsd } from "@/lib/tokens";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { Change } from "@/components/orvex/Change";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — ORVEX" },
      { name: "description", content: "Track your memecoin holdings, created tokens and watchlist." },
      { property: "og:title", content: "Portfolio — ORVEX" },
      { property: "og:description", content: "Track your memecoin holdings and watchlist." },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { address, open } = useWallet();
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
  const holdings = getTokens().slice(0, 5).map((t, i) => ({ t, amount: (i + 1) * 1_250_000 }));
  const total = holdings.reduce((s, h) => s + h.amount * h.t.price, 0);
  const pnl = holdings.reduce((s, h) => s + h.amount * h.t.price * (h.t.change24h / 100), 0);

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="text-sm text-muted-foreground">Total value</div>
        <div className="mt-1 font-mono text-4xl font-bold">{fmtUsd(total)}</div>
        <div className={pnl >= 0 ? "mt-1 text-sm text-success" : "mt-1 text-sm text-danger"}>{pnl >= 0 ? "+" : ""}{fmtUsd(Math.abs(pnl))} today</div>
      </div>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr>{["Token", "Balance", "Value", "24h", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {holdings.map(({ t, amount }) => (
              <tr key={t.symbol}>
                <td className="px-4 py-3"><Link to="/token/$symbol" params={{ symbol: t.symbol }} className="flex items-center gap-3"><TokenLogo symbol={t.symbol} hue={t.hue} size={28} />{t.symbol}</Link></td>
                <td className="px-4 py-3 font-mono">{amount.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono">{fmtUsd(amount * t.price)}</td>
                <td className="px-4 py-3"><Change v={t.change24h} /></td>
                <td className="px-4 py-3 text-right"><Button asChild size="sm" variant="secondary"><Link to="/token/$symbol" params={{ symbol: t.symbol }}>Trade</Link></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="glass rounded-2xl p-10 text-center">
        <div className="font-semibold">No tokens created yet</div>
        <p className="mt-1 text-sm text-muted-foreground">Your launches will appear here.</p>
        <Button asChild className="mt-4 bg-gradient-primary"><Link to="/create">Create token</Link></Button>
      </div>
    </div>
  );
}
