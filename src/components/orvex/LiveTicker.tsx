import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";
import { liveTradesQuery } from "@/lib/queries";
import { fmtAge, fmtUsd } from "@/lib/tokens";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { cn } from "@/lib/utils";

export function LiveTicker() {
  const { data } = useQuery(liveTradesQuery());
  if (!data?.length) return null;
  const items = [...data, ...data];
  return (
    <div className="flex h-10 items-center overflow-hidden border-b border-border bg-card/60">
      <span className="z-10 flex h-full shrink-0 items-center gap-2 bg-background px-4 text-[11px] font-black tracking-wider text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-success" /> LIVE TRADES
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex w-max animate-ticker gap-8 pl-4">
          {items.map((t, i) => {
            const buy = t.side === "buy";
            return (
              <Link
                key={`${t.id}-${i}`}
                to="/token/$symbol"
                params={{ symbol: t.symbol }}
                className="flex shrink-0 items-center gap-2.5 text-xs hover:opacity-80"
              >
                <TokenLogo symbol={t.symbol} url={t.logoUrl} size={22} />
                <span className="font-bold">${t.symbol}</span>
                <span className={cn("flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black", buy ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
                  {buy ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {buy ? "BUY" : "SELL"}
                </span>
                <span className={cn("font-mono font-semibold", buy ? "text-success" : "text-danger")}>{fmtUsd(t.priceUsd)}</span>
                <span className="font-mono text-muted-foreground">◈ {fmtUsd(t.valueUsd)}</span>
                <span className="text-muted-foreground">{fmtAge(t.createdAt)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
