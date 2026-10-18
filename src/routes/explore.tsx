import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fmtUsd, fmtAge } from "@/lib/tokens";
import { tokensQuery } from "@/lib/queries";
import type { TokenView } from "@/lib/launchpad.functions";
import { TokenCard, TokenCardSkeleton } from "@/components/orvex/TokenCard";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { Change } from "@/components/orvex/Change";
import { Chip } from "@/components/orvex/Chip";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Tokens — ORVEX" },
      { name: "description", content: "Browse and filter every memecoin launched on the ORVEX bonding curve." },
      { property: "og:title", content: "Explore Tokens — ORVEX" },
      { property: "og:description", content: "Browse and filter every memecoin launched on ORVEX." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tokensQuery()),
  pendingComponent: () => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <TokenCardSkeleton key={i} />)}</div>,
  component: Explore,
});

const SORTS: { k: string; label: string; fn: (a: TokenView, b: TokenView) => number }[] = [
  { k: "new", label: "Newest", fn: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt) },
  { k: "mc", label: "Market cap", fn: (a, b) => b.marketCapUsd - a.marketCapUsd },
  { k: "vol", label: "Volume", fn: (a, b) => b.volume24hUsd - a.volume24hUsd },
  { k: "prog", label: "Curve progress", fn: (a, b) => b.progress - a.progress },
  { k: "old", label: "Oldest", fn: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt) },
];

function Explore() {
  const { data } = useSuspenseQuery(tokensQuery());
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [grad, setGrad] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const list = useMemo(() => {
    const s = SORTS.find((x) => x.k === sort)!;
    return data.filter((t) => (!grad || t.graduated) && (t.name + t.symbol).toLowerCase().includes(q.toLowerCase())).sort(s.fn);
  }, [data, q, sort, grad]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Explore</h1>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tokens" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SORTS.map((s) => <Chip key={s.k} on={sort === s.k} onClick={() => setSort(s.k)}>{s.label}</Chip>)}
          <Chip on={grad} onClick={() => setGrad(!grad)}>Graduated</Chip>
        </div>
        <div className="flex gap-1 md:ml-auto">
          <Chip on={view === "grid"} onClick={() => setView("grid")} aria-label="Grid view"><LayoutGrid className="size-4" /></Chip>
          <Chip on={view === "list"} onClick={() => setView("list")} aria-label="List view"><List className="size-4" /></Chip>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="text-lg font-semibold">No tokens match</div>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or clear the filters.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map((t) => <TokenCard key={t.id} t={t} />)}</div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>{["Token", "Price", "24h", "MCap", "Volume", "Curve", "Age"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((t) => (
                <tr key={t.id} className="transition hover:bg-surface/50">
                  <td className="px-4 py-3"><Link to="/token/$symbol" params={{ symbol: t.symbol }} className="flex items-center gap-3"><TokenLogo symbol={t.symbol} url={t.logoUrl} size={28} /><span className="font-medium">{t.name}</span><span className="text-muted-foreground">{t.symbol}</span></Link></td>
                  <td className="px-4 py-3 font-mono">{fmtUsd(t.priceUsd)}</td>
                  <td className="px-4 py-3"><Change v={t.change24h} /></td>
                  <td className="px-4 py-3 font-mono">{fmtUsd(t.marketCapUsd)}</td>
                  <td className="px-4 py-3 font-mono">{fmtUsd(t.volume24hUsd)}</td>
                  <td className="px-4 py-3 font-mono">{t.progress.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtAge(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
