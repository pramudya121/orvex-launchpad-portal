import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Context = createContext<{ favorites: string[]; toggle: (id: string) => void }>({
  favorites: [],
  toggle: () => {},
});
export const useWatchlist = () => useContext(Context);
export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem("orvex-watchlist") ?? "[]");
      if (Array.isArray(value))
        setFavorites(value.filter((v): v is string => typeof v === "string"));
    } catch {
      /* optional local preference */
    }
  }, []);
  const toggle = (id: string) =>
    setFavorites((old) => {
      const next = old.includes(id) ? old.filter((x) => x !== id) : [...old, id];
      try {
        localStorage.setItem("orvex-watchlist", JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  return <Context.Provider value={{ favorites, toggle }}>{children}</Context.Provider>;
}
export function FavoriteButton({ id }: { id: string }) {
  const { favorites, toggle } = useWatchlist();
  const selected = favorites.includes(id);
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-7 rounded-full bg-background/80"
      title={selected ? "Remove from watchlist" : "Add to watchlist"}
      aria-label={selected ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={selected}
      onClick={() => toggle(id)}
    >
      <Star className={cn("size-3.5", selected && "fill-primary text-primary")} />
    </Button>
  );
}
