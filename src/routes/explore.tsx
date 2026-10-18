import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LayoutGrid, List, Search, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getTokens, fmtUsd, fmtAge, type Token } from "@/lib/tokens";
import { TokenCard } from "@/components/orvex/TokenCard";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { Change } from "@/components/orvex/Change";
import { Chip } from "@/components/orvex/Chip";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Tokens — ORVEX" },
      { name: "description", content: "Browse and filter every memecoin launched on ORVEX." },
      { property: "og:title", content: "Explore Tokens — ORVEX" },
      { property: "og:description", content: "Browse and filter every memecoin launched on ORVEX." },
    ],
  }),
  component: Explore,
});

const SORTS: { k: string; label: string; fn: (a: Token, b: Token) => number }[] = [
  { k: "new", label: "Newest", fn: (a, b) => a.ageHours - b.ageHours },
  { k: "mc", label: "Market cap", fn: (a, b) => b.marketCap - a.marketCap },
  { k: "vol", label: "Volume", fn: (a, b) => b.volume24h - a.volume24h },
  { k: "liq", label: "Liquidity", fn: (a, b) => b.liquidity - a.liquidity },
  { k: "age", label: "Oldest", fn: (a, b) => b.ageHours - a.ageHours },
];

function Explore() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [verified, setVerified] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const list = useMemo(() => {
    const s = SORTS.find((x) => x.k === sort)!;
    return getTokens()
      .filter((t) => (!verified || t.verified) && (t.name + t.symbol).toLowerCase().includes(q.toLowerCase()))
      .sort(s.fn);
  }, [q, sort, verified]);

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
          <Chip on={verified} onClick={() => setVerified(!verified)}><BadgeCheck className="size-3.5" /> Verified</Chip>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map((t) => <TokenCard key={t.symbol} t={t} />)}</div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>{["Token", "Price", "24h", "MCap", "Volume", "Age"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((t) => (
                <tr key={t.symbol} className="transition hover:bg-surface/50">
                  <td className="px-4 py-3"><Link to="/token/$symbol" params={{ symbol: t.symbol }} className="flex items-center gap-3"><TokenLogo symbol={t.symbol} hue={t.hue} size={28} /><span className="font-medium">{t.name}</span><span className="text-muted-foreground">{t.symbol}</span></Link></td>
                  <td className="px-4 py-3 font-mono">{fmtUsd(t.price)}</td>
                  <td className="px-4 py-3"><Change v={t.change24h} /></td>
                  <td className="px-4 py-3 font-mono">{fmtUsd(t.marketCap)}</td>
                  <td className="px-4 py-3 font-mono">{fmtUsd(t.volume24h)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtAge(t.ageHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

