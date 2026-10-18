import { cn } from "@/lib/utils";

export function TokenLogo({ symbol, hue, size = 40, className }: { symbol: string; hue: number; size?: number; className?: string }) {
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full font-bold text-primary-foreground ring-1 ring-border", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, oklch(0.55 0.13 ${hue}), oklch(0.35 0.08 ${(hue + 60) % 360}))`,
      }}
      aria-hidden
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
