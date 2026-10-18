import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtUsd } from "@/lib/tokens";
import { tokensQuery } from "@/lib/queries";
import { CURVE } from "@/lib/curve";
import { TokenCard, TokenCardSkeleton } from "@/components/orvex/TokenCard";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { CurveProgress } from "@/components/orvex/CurveProgress";
import { useWallet } from "@/components/orvex/wallet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ORVEX — Bonding Curve Memecoin Launchpad on LitVM" },
      { name: "description", content: "Fair-launch memecoins on a bonding curve on LitVM. No presale, no team allocation." },
      { property: "og:title", content: "ORVEX — Launch Memecoins on LitVM" },
      { property: "og:description", content: "Fair-launch memecoins on a bonding curve on LitVM." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tokensQuery()),
  pendingComponent: () => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <TokenCardSkeleton key={i} />)}</div>,
  component: Index,
});

function Index() {
  const { data: tokens } = useSuspenseQuery(tokensQuery());
  const newest = tokens.slice(0, 6);
  const koth = [...tokens].filter((t) => !t.graduated).sort((a, b) => b.progress - a.progress).slice(0, 5);
  const { address, open } = useWallet();

  return (
    <div className="space-y-16">
      <section className="relative -mx-4 -mt-8 overflow-hidden px-4 pb-6 pt-20 text-center bg-hero">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary-glow" /> Fair launch · bonding curve · LitVM
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          <span className="text-gradient">Digital silver</span> for your next memecoin.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Every token starts on the same bonding curve. When the curve sells out, liquidity graduates to the ORVEX DEX automatically.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-primary shadow-glow"><Link to="/create"><Rocket /> Create Token</Link></Button>
          <Button asChild size="lg" variant="secondary"><Link to="/explore">Explore <ArrowRight /></Link></Button>
          {!address && <Button size="lg" variant="ghost" onClick={open}>Connect wallet</Button>}
        </div>
      </section>

      <section className="glass grid grid-cols-2 gap-px overflow-hidden rounded-2xl md:grid-cols-4">
        {[
          ["Tokens launched", String(tokens.length)],
          ["24h volume", fmtUsd(tokens.reduce((s, t) => s + t.volume24hUsd, 0))],
          ["zkLTC on curves", tokens.reduce((s, t) => s + t.realBase, 0).toFixed(2)],
          ["Graduated", String(tokens.filter((t) => t.graduated).length)],
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
          {newest.length ? (
            <div className="grid gap-4 sm:grid-cols-2">{newest.map((t) => <TokenCard key={t.id} t={t} />)}</div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">No tokens yet. <Link to="/create" className="text-primary-glow">Launch the first one</Link>.</div>
          )}
        </div>
        <div>
          <Heading title="Closest to graduation" to="/trending" />
          <div className="glass divide-y divide-border rounded-2xl">
            {koth.map((t, i) => (
              <Link key={t.id} to="/token/$symbol" params={{ symbol: t.symbol }} className="block p-4 transition hover:bg-surface/50">
                <div className="flex items-center gap-3">
                  <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
                  <TokenLogo symbol={t.symbol} url={t.logoUrl} size={32} />
                  <div className="flex-1"><div className="text-sm font-semibold">{t.symbol}</div><div className="text-xs text-muted-foreground">{fmtUsd(t.marketCapUsd)}</div></div>
                </div>
                <CurveProgress value={t.progress} className="ml-7 mt-2" />
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
