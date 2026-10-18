import { Link } from "@tanstack/react-router";
import { fmtAge, fmtUsd, short } from "@/lib/tokens";
import type { TokenView } from "@/lib/launchpad.functions";
import { TokenLogo } from "./TokenLogo";
import { Change } from "./Change";
import { CurveProgress } from "./CurveProgress";

export function TokenCard({ t }: { t: TokenView }) {
  return (
    <Link
      to="/token/$symbol"
      params={{ symbol: t.symbol }}
      className="glass group block rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-primary-glow/40 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="flex items-center gap-3">
        <TokenLogo symbol={t.symbol} url={t.logoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{t.name}</div>
          <div className="text-xs text-muted-foreground">${t.symbol} · {fmtAge(t.createdAt)}</div>
        </div>
        <Change v={t.change24h} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Stat label="Price" value={fmtUsd(t.priceUsd)} />
        <Stat label="MCap" value={fmtUsd(t.marketCapUsd)} />
        <Stat label="Vol 24h" value={fmtUsd(t.volume24hUsd)} />
      </div>
      <CurveProgress value={t.progress} graduated={t.graduated} className="mt-4" />
      <div className="mt-3 text-[11px] text-muted-foreground">by <span className="font-mono">{short(t.creator)}</span></div>
    </Link>
  );
}

export function TokenCardSkeleton() {
  return <div className="glass h-[214px] animate-pulse rounded-2xl" />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface/60 px-2.5 py-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono font-medium">{value}</div>
    </div>
  );
}
