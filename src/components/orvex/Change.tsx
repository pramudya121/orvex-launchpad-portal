import { cn } from "@/lib/utils";

export function Change({ v, className }: { v: number; className?: string }) {
  const up = v >= 0;
  return (
    <span className={cn("rounded-md px-2 py-0.5 font-mono text-xs font-semibold", up ? "bg-success/10 text-success" : "bg-danger/10 text-danger", className)}>
      {up ? "+" : ""}{v.toFixed(2)}%
    </span>
  );
}
