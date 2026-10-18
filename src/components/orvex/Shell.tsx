import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Compass, Flame, Home, Plus, Search, Wallet, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { getTokens, short } from "@/lib/tokens";
import { useWallet } from "./wallet";
import { TokenLogo } from "./TokenLogo";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/create", label: "Create", icon: Plus },
  { to: "/portfolio", label: "Portfolio", icon: PieChart },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { address, open, disconnect } = useWallet();
  const [search, setSearch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch((s) => !s); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">O</span>
            ORVEX
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.slice(1).map((n) => (
              <Link key={n.to} to={n.to} className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "text-foreground bg-surface" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <button onClick={() => setSearch(true)} className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 text-sm text-muted-foreground transition hover:text-foreground md:w-64">
            <Search className="size-4" /> <span className="hidden md:inline">Search tokens</span>
            <kbd className="ml-auto hidden rounded bg-muted px-1.5 font-mono text-[10px] md:inline">Ctrl K</kbd>
          </button>
          {address ? (
            <Button variant="secondary" size="sm" onClick={disconnect} className="font-mono">{short(address)}</Button>
          ) : (
            <Button size="sm" onClick={open} className="bg-gradient-primary shadow-glow"><Wallet className="size-4" /> <span className="hidden sm:inline">Connect</span></Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 animate-in fade-in duration-300">{children}</main>

      <footer className="mx-auto hidden max-w-7xl px-4 py-10 text-xs text-muted-foreground md:block">© 2026 ORVEX · Memecoin launchpad on LitVM</footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/90 backdrop-blur-xl md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground" activeProps={{ className: "text-primary-glow" }} activeOptions={{ exact: n.to === "/" }}>
            <n.icon className="size-5" />{n.label}
          </Link>
        ))}
      </nav>

      <CommandDialog open={search} onOpenChange={setSearch}>
        <CommandInput placeholder="Search name, symbol…" />
        <CommandList>
          <CommandEmpty>No tokens found.</CommandEmpty>
          <CommandGroup heading="Tokens">
            {getTokens().map((t) => (
              <CommandItem key={t.symbol} value={`${t.name} ${t.symbol}`} onSelect={() => { setSearch(false); navigate({ to: "/token/$symbol", params: { symbol: t.symbol } }); }}>
                <TokenLogo symbol={t.symbol} hue={t.hue} size={24} />
                {t.name} <span className="text-muted-foreground">${t.symbol}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
