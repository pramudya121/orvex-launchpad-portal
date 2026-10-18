import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { fmtAge, fmtUsd, short, type Token } from "@/lib/tokens";
import { TokenLogo } from "./TokenLogo";
import { Change } from "./Change";

export function TokenCard({ t }: { t: Token }) {
  return (
    <Link
      to="/token/$symbol"
      params={{ symbol: t.symbol }}
      className="glass group block rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-primary-glow/40 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="flex items-center gap-3">
        <TokenLogo symbol={t.symbol} hue={t.hue} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{t.name}</span>
            {t.verified && <BadgeCheck className="size-4 text-primary-glow" />}
          </div>
          <div className="text-xs text-muted-foreground">${t.symbol} · {fmtAge(t.ageHours)}</div>
        </div>
        <Change v={t.change24h} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Stat label="Price" value={fmtUsd(t.price)} />
        <Stat label="MCap" value={fmtUsd(t.marketCap)} />
        <Stat label="Vol 24h" value={fmtUsd(t.volume24h)} />
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">by <span className="font-mono">{short(t.creator)}</span></div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface/60 px-2.5 py-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono font-medium">{value}</div>
    </div>
  );
}
