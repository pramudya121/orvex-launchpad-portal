import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEX_TOKENS, type DexToken } from "@/lib/web3/chain";
import { tokenPagesQuery } from "@/lib/queries";
import { tokenBalance } from "@/lib/web3/actions";
import { assetKey } from "@/lib/web3/trade-safety";
import { boundedMap } from "@/lib/bounded-map";
import { fmtNum, short } from "@/lib/tokens";
import { useWallet } from "./wallet";
import { TokenLogo } from "./TokenLogo";

export function DexLogo({ t, size = 28 }: { t: DexToken; size?: number }) {
  return t.logo ? <img src={t.logo} alt="" width={size} height={size} className="shrink-0 rounded-full bg-surface object-cover" /> : <TokenLogo symbol={t.symbol} size={size} />;
}
export function DexTokenPicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (token: DexToken) => void }) {
  const { address } = useWallet();
  const [search, setSearch] = useState("");
  const pages = useInfiniteQuery({ ...tokenPagesQuery(search, "graduated"), enabled: open });
  const base = DEX_TOKENS.filter((t) => `${t.symbol} ${t.name} ${t.address ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const listed: DexToken[] = (pages.data?.pages.flatMap((p) => p.tokens) ?? []).map((t) => ({ name: t.name, symbol: t.symbol, address: t.address as `0x${string}`, decimals: 18, logo: t.logoUrl }));
  const tokens = [...new Map([...base, ...listed].map((t) => [assetKey(t.address), t])).values()];
  const [visible, setVisible] = useState(24);
  const shown = tokens.slice(0, visible);
  const balances = useQuery({
    queryKey: ["dexPickerBalances", address, shown.map((t) => assetKey(t.address))],
    enabled: open && !!address,
    queryFn: async () => {
      if (!address) return {};
      const result = await boundedMap(shown, async (t) => {
        try { return [assetKey(t.address), await tokenBalance(address, t.address)] as const; }
        catch { return [assetKey(t.address), null] as const; }
      });
      return Object.fromEntries(result);
    }, staleTime: 15_000,
  });
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-w-sm bg-card"><DialogHeader><DialogTitle>Select a token</DialogTitle></DialogHeader>
    <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search selectable tokens" className="pl-9" placeholder="Search token" value={search} onChange={(e) => { setSearch(e.target.value); setVisible(24); }} /></div>
    <div className="max-h-80 space-y-1 overflow-y-auto">{shown.map((t) => {
      const balance = balances.data?.[assetKey(t.address)];
      return <Button variant="ghost" key={assetKey(t.address)} onClick={() => { onSelect(t); onClose(); }} className="h-auto w-full gap-3 p-2.5 text-left"><DexLogo t={t} size={32} /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{t.symbol}</span><span className="block truncate text-xs text-muted-foreground">{t.address ? short(t.address) : t.name}</span></span><span className="text-right font-mono text-xs"><span className="block text-[10px] text-muted-foreground">Balance</span>{!address ? "—" : balance === undefined ? "…" : balance === null ? "Unavailable" : fmtNum(Number(formatUnits(balance, t.decimals)), 6)}</span></Button>;
    })}{!shown.length && !pages.isPending && <p className="py-6 text-center text-sm text-muted-foreground">No matching tokens</p>}
    {pages.isError && <Button variant="link" onClick={() => pages.refetch()}>Retry token list</Button>}
    {(tokens.length > visible || pages.hasNextPage) && <Button variant="outline" className="w-full" disabled={pages.isFetchingNextPage} onClick={async () => { if (tokens.length <= visible) await pages.fetchNextPage(); setVisible((v) => v + 24); }}>Load more tokens</Button>}</div>
  </DialogContent></Dialog>;
}