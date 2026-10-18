import { cn } from "@/lib/utils";

export function Chip({ on, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return <button {...p} className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition", on ? "border-primary-glow/40 bg-primary/25 text-foreground" : "border-border text-muted-foreground hover:text-foreground", className)} />;
}
