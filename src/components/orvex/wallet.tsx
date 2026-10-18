import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Wallet } from "lucide-react";

const WALLETS = [
  { name: "MetaMask", hue: 35 }, { name: "Rabby", hue: 250 }, { name: "Trust Wallet", hue: 220 }, { name: "Coinbase Wallet", hue: 255 },
  { name: "Rainbow", hue: 300 }, { name: "OKX Wallet", hue: 0 }, { name: "Phantom", hue: 280 }, { name: "WalletConnect", hue: 240 },
];
const KEY = "orvex-demo-wallet";

type Ctx = { address: string | null; open: () => void; disconnect: () => void };
const WalletCtx = createContext<Ctx>({ address: null, open: () => {}, disconnect: () => {} });
export const useWallet = () => useContext(WalletCtx);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => { setAddress(localStorage.getItem(KEY)); }, []);

  const connect = (name: string) => {
    // Demo wallet: stable address per browser until real wallet integration (Reown AppKit) is wired.
    let a = localStorage.getItem(KEY + "-addr");
    if (!a) {
      a = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(KEY + "-addr", a);
    }
    localStorage.setItem(KEY, a);
    setAddress(a);
    setOpen(false);
    toast.success(`Connected with ${name}`, { description: "Demo wallet on LitVM testnet" });
  };

  return (
    <WalletCtx.Provider value={{ address, open: () => setOpen(true), disconnect: () => { localStorage.removeItem(KEY); setAddress(null); toast("Wallet disconnected"); } }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="size-5 text-primary-glow" /> Connect wallet</DialogTitle>
            <DialogDescription>Choose any EVM wallet to continue on LitVM.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {WALLETS.map((w) => (
              <button key={w.name} onClick={() => connect(w.name)} className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 p-3 text-left text-sm font-medium transition hover:border-primary-glow/50 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                <span className="grid size-8 place-items-center rounded-lg text-xs font-bold text-primary-foreground" style={{ background: `oklch(0.55 0.14 ${w.hue})` }}>{w.name[0]}</span>
                {w.name}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">Demo mode — no real funds are moved.</p>
        </DialogContent>
      </Dialog>
    </WalletCtx.Provider>
  );
}
