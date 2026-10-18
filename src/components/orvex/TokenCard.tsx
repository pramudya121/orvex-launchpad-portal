import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { fmtAge, fmtUsd, short } from "@/lib/tokens";
import { CURVE } from "@/lib/curve";
import type { TokenView } from "@/lib/launchpad.functions";
import { Change } from "./Change";
import { CurveProgress } from "./CurveProgress";
import { FavoriteButton } from "./Watchlist";

export function TokenCard({ t }: { t: TokenView }) {
  const [failed, setFailed] = useState(false);
  return <article className="group min-w-0 overflow-hidden rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/50">
    <div className="relative aspect-square overflow-hidden rounded-md bg-surface">
      <Link to="/token/$symbol" params={{ symbol: t.symbol }} aria-label={`Open ${t.name}`} className="grid h-full place-items-center">
        {t.logoUrl && !failed ? <img src={t.logoUrl} alt={t.name} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" /> : <div className="token-art grid h-full w-full place-items-center"><span className="font-mono text-4xl font-bold text-primary">{t.symbol.slice(0, 2)}</span></div>}
      </Link>
      <span className="absolute left-2 top-2 rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">zkLTC</span>
      <div className="absolute right-2 top-2"><FavoriteButton id={t.id} /></div>
    </div>
    <Link to="/token/$symbol" params={{ symbol: t.symbol }} className="block px-0.5 pb-1 pt-2">
      <div className="truncate text-xs font-bold">{t.name}</div>
      <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground"><span className="truncate">${t.symbol}</span><span className="shrink-0">{fmtAge(t.createdAt)}</span></div>
      <div className="mt-2 flex items-center justify-between gap-1"><div className="truncate text-sm font-bold">{fmtUsd(t.marketCapUsd)} <span className="text-[9px] font-normal text-muted-foreground">MC</span></div><Change v={t.change24h} /></div>
      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{fmtUsd(t.priceUsd)}</div>
      <CurveProgress value={t.progress} graduated={t.graduated} className="mt-2" />
      <div className="mt-2 grid grid-cols-2 divide-x divide-border border-y border-border py-2 text-[9px]"><div><div className="text-muted-foreground">RAISED</div><div className="mt-0.5 font-mono text-[11px] font-semibold">{fmtUsd(t.realBase * CURVE.baseUsd)}</div></div><div className="pl-2"><div className="text-muted-foreground">VOL 24H</div><div className="mt-0.5 font-mono text-[11px] font-semibold">{fmtUsd(t.volume24hUsd)}</div></div></div>
      <div className="mt-2 flex justify-between gap-1 font-mono text-[9px] text-muted-foreground"><span>{short(t.address)}</span><span className="truncate">by {short(t.creator)}</span></div>
    </Link>
  </article>;
}
export function TokenCardSkeleton() { return <div className="aspect-[1/1.85] animate-pulse rounded-lg border border-border bg-card" />; }
