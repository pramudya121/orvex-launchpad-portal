import { cn } from "@/lib/utils";
import { hueOf } from "@/lib/tokens";

export function TokenLogo({ symbol, url, size = 40, className }: { symbol: string; url?: string | null; size?: number; className?: string }) {
  if (url) return <img src={url} alt="" width={size} height={size} className={cn("shrink-0 rounded-full object-cover ring-1 ring-border", className)} style={{ width: size, height: size }} />;
  const hue = hueOf(symbol);
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full font-bold text-primary-foreground ring-1 ring-border", className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, oklch(0.55 0.13 ${hue}), oklch(0.35 0.08 ${(hue + 60) % 360}))` }}
      aria-hidden
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
