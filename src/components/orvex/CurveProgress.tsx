import { cn } from "@/lib/utils";

export function CurveProgress({ value, graduated, className }: { value: number; graduated?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{graduated ? "Graduated to DEX" : "Bonding curve"}</span>
        <span className="font-mono">{value.toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className={cn("h-full rounded-full transition-all duration-700", graduated ? "bg-success" : "bg-gradient-primary")} style={{ width: `${Math.max(value, 1)}%` }} />
      </div>
    </div>
  );
}
