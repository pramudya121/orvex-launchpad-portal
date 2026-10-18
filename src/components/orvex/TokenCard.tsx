import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { fmtAge, fmtUsd, short } from "@/lib/tokens";
import type { TokenView } from "@/lib/launchpad.functions";
import { Change } from "./Change";
import { CurveProgress } from "./CurveProgress";
import { FavoriteButton } from "./Watchlist";
import { windowChange, type MarketWindow } from "@/lib/market";

export function TokenCard({ t, win = "24h" }: { t: TokenView; win?: MarketWindow }) {
  const [failed, setFailed] = useState(false);
  return (
    <article className="group min-w-0 overflow-hidden rounded-lg border border-border bg-card p-1.5 transition-colors hover:border-primary/50">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface">
        <Link
          to="/token/$symbol"
          params={{ symbol: t.symbol }}
          aria-label={`Open ${t.name}`}
          className="grid h-full place-items-center"
        >
          {t.logoUrl && !failed ? (
            <img
              src={t.logoUrl}
              alt={t.name}
              loading="lazy"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
            />
          ) : (
            <div className="token-art grid h-full w-full place-items-center">
              <span className="font-mono text-3xl font-bold text-primary">
                {t.symbol.slice(0, 2)}
              </span>
            </div>
          )}
        </Link>
        <span className="absolute left-1.5 top-1.5 rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
          zkLTC
        </span>
        <div className="absolute right-1.5 top-1.5">
          <FavoriteButton id={t.id} />
        </div>
      </div>
      <Link
        to="/token/$symbol"
        params={{ symbol: t.symbol }}
        className="block px-0.5 pb-0.5 pt-1.5"
      >
        <div className="flex items-baseline justify-between gap-1">
          <div className="truncate text-xs font-bold">{t.name}</div>
          <span className="shrink-0 text-[9px] text-muted-foreground">{fmtAge(t.createdAt)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-1">
          <div className="truncate font-mono text-xs font-bold">{fmtUsd(t.priceUsd)}</div>
          <Change v={windowChange(t, win)} />
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-1 font-mono text-[9px] text-muted-foreground">
          <span>{fmtUsd(t.marketCapUsd)} MC</span>
          <span className="truncate">${t.symbol}</span>
        </div>
        <CurveProgress value={t.progress} graduated={t.graduated} className="mt-1.5" />
        <div className="mt-1.5 flex justify-between gap-1 font-mono text-[9px] text-muted-foreground">
          <span>{short(t.address)}</span>
          <span className="truncate">by {short(t.creator)}</span>
        </div>
      </Link>
    </article>
  );
}

export function TokenCardSkeleton() {
  return <div className="aspect-[1/1.45] animate-pulse rounded-lg border border-border bg-card" />;
}
