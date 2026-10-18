import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MarketStatus } from "@/components/orvex/MarketStatus";
import { MarketError, MarketNotFound } from "@/components/orvex/RouteFeedback";
import { Trophy } from "lucide-react";
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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-5">
        <div className="grid size-11 place-items-center rounded-xl bg-primary/20">
          <Trophy className="size-5 text-primary-glow" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            All-time rankings · Indexed curve trades · Testnet
          </p>
        </div>
        <div className="ml-auto">
          <MarketStatus />
        </div>
      </div>
      <Tabs defaultValue="traders">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="traders">Top traders</TabsTrigger>
          <TabsTrigger value="tokens">Top tokens</TabsTrigger>
          <TabsTrigger value="creators">Top creators</TabsTrigger>
        </TabsList>

        <TabsContent value="traders" className="glass overflow-x-auto rounded-2xl">
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
                {data.traders.map((t, i) => (
                  <tr key={t.address}>
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

        <TabsContent value="tokens" className="glass overflow-x-auto rounded-2xl">
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
                {data.tokens.map((t, i) => (
                  <tr key={t.id}>
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

        <TabsContent value="creators" className="glass overflow-x-auto rounded-2xl">
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
                {data.creators.map((c, i) => (
                  <tr key={c.address}>
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
    </div>
  );
}
