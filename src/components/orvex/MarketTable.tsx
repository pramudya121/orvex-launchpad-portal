import { Link } from "@tanstack/react-router";
import { ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtAge, fmtUsd, short } from "@/lib/tokens";
import { CURVE } from "@/lib/curve";
import type { TokenView } from "@/lib/launchpad.functions";
import { TokenLogo } from "./TokenLogo";
import { Change } from "./Change";
import { FavoriteButton } from "./Watchlist";
import { CurveProgress } from "./CurveProgress";
import { windowChange, windowVolume, type MarketWindow } from "@/lib/market";

export function MarketTable({ tokens, win = "24h" }: { tokens: TokenView[]; win?: MarketWindow }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[980px] text-xs">
        <thead className="border-b border-border bg-surface/40 text-left text-[10px] uppercase text-muted-foreground">
          <tr>
            {[
              "#",
              "Token",
              "Price",
              "24h %",
              "MCap / Curve",
              "Raised",
              "Vol 24h",
              "Holders*",
              "Age",
              "Trade",
            ].map((h) => (
              <th className="px-3 py-4 font-medium" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tokens.map((t, i) => (
            <tr key={t.id} className="transition-colors hover:bg-surface/40">
              <td className="px-3 py-4 font-mono text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-4">
                <Link
                  to="/token/$symbol"
                  params={{ symbol: t.symbol }}
                  className="flex items-center gap-2.5"
                >
                  <TokenLogo symbol={t.symbol} url={t.logoUrl} size={34} />
                  <div className="min-w-0 max-w-40">
                    <div className="truncate text-sm font-semibold">{t.name}</div>
                    <div className="mt-1 truncate text-[10px] text-muted-foreground">
                      ${t.symbol} · by {short(t.creator)}
                    </div>
                  </div>
                </Link>
              </td>
              <td className="px-3 py-4 font-mono">{fmtUsd(t.priceUsd)}</td>
              <td className="px-3 py-4">
                <Change v={t.change24h} />
              </td>
              <td className="w-40 px-3 py-4">
                <div className="mb-1 font-mono font-semibold">{fmtUsd(t.marketCapUsd)}</div>
                <CurveProgress value={t.progress} graduated={t.graduated} />
              </td>
              <td className="px-3 py-4 font-mono" title={`${t.realBase.toFixed(5)} zkLTC raised`}>
                {fmtUsd(t.realBase * CURVE.baseUsd)}
              </td>
              <td className="px-3 py-4 font-mono">{fmtUsd(t.volume24hUsd)}</td>
              <td className="px-3 py-4 font-mono">{t.holders}</td>
              <td className="px-3 py-4 text-muted-foreground">{fmtAge(t.createdAt)}</td>
              <td className="px-3 py-4">
                <div className="flex items-center gap-1">
                  <FavoriteButton id={t.id} />
                  <Button
                    asChild
                    size="sm"
                    className="h-7 bg-success text-background hover:bg-success/80"
                  >
                    <Link
                      to="/token/$symbol"
                      params={{ symbol: t.symbol }}
                      search={{ side: "buy" }}
                    >
                      <Zap className="size-3" />
                      Buy
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-7 px-2">
                    <Link
                      to="/token/$symbol"
                      params={{ symbol: t.symbol }}
                      search={{ side: "sell" }}
                    >
                      Sell
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" className="size-7" title="Open token">
                    <Link
                      to="/token/$symbol"
                      params={{ symbol: t.symbol }}
                      aria-label={`Open ${t.symbol}`}
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
