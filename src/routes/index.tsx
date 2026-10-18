import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTokens, fmtUsd } from "@/lib/tokens";
import { TokenCard } from "@/components/orvex/TokenCard";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { Change } from "@/components/orvex/Change";
import { useWallet } from "@/components/orvex/wallet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ORVEX — Launch Memecoins on LitVM" },
      { name: "description", content: "Fair-launch memecoins on LitVM in minutes. Discover trending tokens and trade live." },
      { property: "og:title", content: "ORVEX — Launch Memecoins on LitVM" },
      { property: "og:description", content: "Fair-launch memecoins on LitVM in minutes." },
    ],
  }),
  component: Index,
});

function Index() {
  const tokens = getTokens();
  const newest = [...tokens].sort((a, b) => a.ageHours - b.ageHours).slice(0, 6);
  const trending = [...tokens].sort((a, b) => b.change24h - a.change24h).slice(0, 5);
  const { address, open } = useWallet();
  const totalVol = tokens.reduce((s, t) => s + t.volume24h, 0);

  return (
    <div className="space-y-16">
      <section className="relative -mx-4 -mt-8 overflow-hidden px-4 pb-6 pt-20 text-center bg-hero">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary-glow" /> Now live on LitVM testnet
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          <span className="text-gradient">Digital silver</span> for your next memecoin.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">Launch a token in under a minute. Fair, fast and secured by Litecoin-grade infrastructure.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-primary shadow-glow"><Link to="/create"><Rocket /> Create Token</Link></Button>
          <Button asChild size="lg" variant="secondary"><Link to="/explore">Explore <ArrowRight /></Link></Button>
          {!address && <Button size="lg" variant="ghost" onClick={open}>Connect wallet</Button>}
        </div>
      </section>

      <section className="glass grid grid-cols-2 gap-px overflow-hidden rounded-2xl md:grid-cols-4">
        {[
          ["Tokens launched", tokens.length * 214 + ""],
          ["24h volume", fmtUsd(totalVol)],
          ["Traders", "48.2K"],
          ["Liquidity locked", fmtUsd(tokens.reduce((s, t) => s + t.liquidity, 0))],
        ].map(([l, v]) => (
          <div key={l} className="bg-card/40 p-5">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 font-mono text-2xl font-semibold">{v}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Heading title="Newest launches" to="/explore" />
          <div className="grid gap-4 sm:grid-cols-2">{newest.map((t) => <TokenCard key={t.symbol} t={t} />)}</div>
        </div>
        <div>
          <Heading title="Trending" to="/trending" />
          <div className="glass divide-y divide-border rounded-2xl">
            {trending.map((t, i) => (
              <Link key={t.symbol} to="/token/$symbol" params={{ symbol: t.symbol }} className="flex items-center gap-3 p-4 transition hover:bg-surface/50">
                <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <TokenLogo symbol={t.symbol} hue={t.hue} size={32} />
                <div className="flex-1"><div className="text-sm font-semibold">{t.symbol}</div><div className="text-xs text-muted-foreground">{fmtUsd(t.marketCap)}</div></div>
                <Change v={t.change24h} />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Heading({ title, to }: { title: string; to: "/explore" | "/trending" }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link to={to} className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
    </div>
  );
}
