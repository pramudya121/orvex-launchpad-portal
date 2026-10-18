import type { ReactNode } from "react";
import { MarketStatus } from "./MarketStatus";

export function MarketHeading({ label, title, description, icon, action }: { label: string; title: string; description: string; icon: ReactNode; action?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
    <div className="min-w-0">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase text-primary">{icon}{label}<span className="ml-1 h-px w-10 bg-primary/40" /></div>
      <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 text-xs text-muted-foreground">{description}</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">{action}<MarketStatus /></div>
  </div>;
}

export function MarketStats({ items }: { items: { label: string; value: ReactNode; detail?: string; icon: ReactNode }[] }) {
  return <div className="grid grid-cols-2 border-y border-border bg-card/40 lg:grid-cols-4">
    {items.map((item) => <div key={item.label} className="min-w-0 border-border p-4 odd:border-r lg:border-r lg:last:border-r-0 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2 text-[10px] font-medium uppercase text-muted-foreground">{item.label}<span className="text-primary">{item.icon}</span></div>
      <div className="truncate font-mono text-xl font-semibold sm:text-2xl">{item.value}</div>
      {item.detail && <div className="mt-2 text-[10px] text-muted-foreground">{item.detail}</div>}
    </div>)}
  </div>;
}