import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MarketStatus } from "@/components/orvex/MarketStatus";
import { MarketError, MarketNotFound } from "@/components/orvex/RouteFeedback";
import { Trophy, Users, Coins, Rocket, Activity, Search, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { MarketHeading, MarketStats } from "@/components/orvex/MarketHeading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leaderboardQuery } from "@/lib/queries";
import { fmtNum, fmtUsd, short } from "@/lib/tokens";
import { explorerAddress } from "@/lib/web3/chain";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { CurveProgress } from "@/components/orvex/CurveProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(leaderboardQuery()),
  head: () => ({
    meta: [
      { title: "Leaderboard — ORVEX" },
      {
        name: "description",
        content: "Top traders, creators and tokens on the ORVEX bonding-curve launchpad on LitVM.",
      },
      { property: "og:title", content: "ORVEX Leaderboard" },
      {
        property: "og:description",
        content: "Top traders, creators and tokens on ORVEX, ranked from on-chain trades.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: MarketError,
  notFoundComponent: MarketNotFound,
  component: Leaderboard,
});

const Rank = ({ i }: { i: number }) => (
  <span
    className={cn(
      "grid size-7 place-items-center rounded-full font-mono text-xs font-bold",
      i === 0
        ? "bg-primary text-primary-foreground"
        : i < 3
          ? "bg-primary/25 text-primary-glow"
          : "bg-surface text-muted-foreground",
    )}
  >
    {i + 1}
  </span>
);
const Empty = ({ text }: { text: string }) => (
  <div className="p-10 text-center text-sm text-muted-foreground">{text}</div>
);
const Addr = ({ a }: { a: string }) => (
  <a
    href={explorerAddress(a)}
    target="_blank"
    rel="noreferrer"
    className="font-mono hover:text-primary-glow"
  >
    {short(a)}
  </a>
);

function Leaderboard() {
  const { data } = useSuspenseQuery(leaderboardQuery());
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  return (
    <div className="space-y-6">
      <MarketHeading label="The arena" title="Leaderboard" description="All-time · Indexed curve activity · LiteForge testnet" icon={<Trophy className="size-3.5" />} />
      <MarketStats items={[
        { label: "Ranked traders", value: data.traders.length, detail: "Top 50 by trading volume", icon: <Users className="size-4" /> },
        { label: "Ranked volume", value: fmtUsd(data.traders.reduce((sum, t) => sum + t.volumeUsd, 0)), detail: "Indexed trades · Ranked wallets", icon: <Activity className="size-4" /> },
        { label: "Ranked tokens", value: data.tokens.length, detail: "Top 50 by market cap", icon: <Coins className="size-4" /> },
        { label: "Ranked creators", value: data.creators.length, detail: "Top 50 by launch market cap", icon: <Rocket className="size-4" /> },
      ]} />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Leading trader", value: data.traders[0] ? short(data.traders[0].address) : "—", metric: data.traders[0] ? fmtUsd(data.traders[0].volumeUsd) + " volume" : "Awaiting activity", icon: <Trophy className="size-5" />, address: data.traders[0]?.address },
          { title: "Leading token", value: data.tokens[0]?.name ?? "—", metric: data.tokens[0] ? fmtUsd(data.tokens[0].marketCapUsd) + " market cap" : "Awaiting launch", icon: <Coins className="size-5" />, address: data.tokens[0]?.address },
          { title: "Leading creator", value: data.creators[0] ? short(data.creators[0].address) : "—", metric: data.creators[0] ? data.creators[0].launches + " launches" : "Awaiting launch", icon: <Rocket className="size-5" />, address: data.creators[0]?.address },
        ].map((item, i) => <article key={item.title} className="relative overflow-hidden rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between text-primary">{item.icon}<span className="font-mono text-xs text-muted-foreground">0{i + 1}</span></div>
          <p className="mt-5 text-[10px] uppercase text-muted-foreground">{item.title}</p>
          <div className="mt-2 truncate text-lg font-bold">{item.address ? <a href={explorerAddress(item.address)} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary">{item.value}<ExternalLink className="size-3 shrink-0" /></a> : item.value}</div>
          <p className="mt-2 font-mono text-xs text-success">{item.metric}</p>
        </article>)}
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search rankings" placeholder="Search wallet or token" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      <Tabs defaultValue="traders">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="traders">Top traders</TabsTrigger>
          <TabsTrigger value="tokens">Top tokens</TabsTrigger>
          <TabsTrigger value="creators">Top creators</TabsTrigger>
        </TabsList>

        <TabsContent value="traders" className="mt-4 overflow-x-auto border-y border-border">
          {data.traders.length === 0 ? (
            <Empty text="No trades yet — be the first trader on the board." />
          ) : (
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  {["#", "Trader", "Volume", "Trades", "Buys / Sells", "Net flow"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.traders.map((t, i) => !t.address.toLowerCase().includes(q) ? null : (
                  <tr key={t.address} className="transition-colors hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <Rank i={i} />
                    </td>
                    <td className="px-4 py-3">
                      <Addr a={t.address} />
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {fmtUsd(t.volumeUsd)}
                      <div className="text-[11px] text-muted-foreground">
                        {t.volume.toFixed(3)} zkLTC
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">{t.trades}</td>
                    <td className="px-4 py-3 font-mono">
                      <span className="text-success">{t.buys}</span> /{" "}
                      <span className="text-danger">{t.sells}</span>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 font-mono",
                        t.realizedUsd >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {t.realizedUsd >= 0 ? "+" : "−"}
                      {fmtUsd(Math.abs(t.realizedUsd))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="tokens" className="mt-4 overflow-x-auto border-y border-border">
          {data.tokens.length === 0 ? (
            <Empty text="No tokens launched yet." />
          ) : (
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  {["#", "Token", "Market cap", "Price", "Curve"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.tokens.map((t, i) => !`${t.name} ${t.symbol} ${t.address}`.toLowerCase().includes(q) ? null : (
                  <tr key={t.id} className="transition-colors hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <Rank i={i} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/token/$symbol"
                        params={{ symbol: t.symbol }}
                        className="flex items-center gap-3"
                      >
                        <TokenLogo symbol={t.symbol} url={t.logoUrl} size={28} />
                        <span>
                          {t.name}
                          <span className="block text-xs text-muted-foreground">${t.symbol}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono">{fmtUsd(t.marketCapUsd)}</td>
                    <td className="px-4 py-3 font-mono">{fmtUsd(t.priceUsd)}</td>
                    <td className="w-48 px-4 py-3">
                      <CurveProgress value={t.progress} graduated={t.graduated} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="creators" className="mt-4 overflow-x-auto border-y border-border">
          {data.creators.length === 0 ? (
            <Empty text="No creators yet — launch the first token." />
          ) : (
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  {["#", "Creator", "Launches", "Graduated", "Total market cap"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.creators.map((c, i) => !c.address.toLowerCase().includes(q) ? null : (
                  <tr key={c.address} className="transition-colors hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <Rank i={i} />
                    </td>
                    <td className="px-4 py-3">
                      <Addr a={c.address} />
                    </td>
                    <td className="px-4 py-3 font-mono">{fmtNum(c.launches, 0)}</td>
                    <td className="px-4 py-3 font-mono">{c.graduated}</td>
                    <td className="px-4 py-3 font-mono">{fmtUsd(c.marketCapUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>
      </Tabs>
      <p className="text-[10px] text-muted-foreground">Rankings cover up to 5,000 recent indexed trades and 500 launches. Net flow is sell proceeds minus buy spend, not accounting PNL.</p>
    </div>
  );
}
