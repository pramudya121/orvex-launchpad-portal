import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getAddress, type Address } from "viem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Wallet } from "lucide-react";
import { injected, ensureChain } from "@/lib/web3/client";
import { ONCHAIN, litvm } from "@/lib/web3/chain";

const DEMO_WALLETS = [
  { name: "MetaMask", hue: 35 }, { name: "Rabby", hue: 250 }, { name: "Trust Wallet", hue: 220 }, { name: "Coinbase Wallet", hue: 255 },
  { name: "Rainbow", hue: 300 }, { name: "OKX Wallet", hue: 0 },
];
const KEY = "orvex-demo-wallet";
const KIND_KEY = "orvex-wallet-kind";

export type WalletKind = "injected" | "demo";
type Ctx = { address: string | null; kind: WalletKind | null; onchain: boolean; open: () => void; disconnect: () => void };
const WalletCtx = createContext<Ctx>({ address: null, kind: null, onchain: false, open: () => {}, disconnect: () => {} });
export const useWallet = () => useContext(WalletCtx);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [kind, setKind] = useState<WalletKind | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [hasInjected, setHasInjected] = useState(false);

  useEffect(() => {
    const eth = injected();
    setHasInjected(!!eth);
    const k = localStorage.getItem(KIND_KEY) as WalletKind | null;
    if (k === "injected" && eth) {
      eth.request({ method: "eth_accounts" }).then((a) => {
        const acc = (a as string[])[0];
        if (acc) { setAddress(getAddress(acc)); setKind("injected"); }
      }).catch(() => {});
    } else if (!ONCHAIN) {
      const a = localStorage.getItem(KEY);
      if (a) { setAddress(a); setKind("demo"); }
    }
    if (!eth?.on) return;
    const onAcc = (...args: unknown[]) => {
      const acc = (args[0] as string[] | undefined)?.[0];
      if (localStorage.getItem(KIND_KEY) !== "injected") return;
      setAddress(acc ? getAddress(acc) : null);
      if (!acc) setKind(null);
    };
    eth.on("accountsChanged", onAcc);
    return () => eth.removeListener?.("accountsChanged", onAcc);
  }, []);

  const connectInjected = async () => {
    const eth = injected();
    if (!eth) { toast.error("No browser wallet found", { description: "Install MetaMask, Rabby or OKX Wallet." }); return; }
    try {
      const [acc] = (await eth.request({ method: "eth_requestAccounts" })) as Address[];
      if (!acc) return;
      await ensureChain(eth).catch(() => toast.warning(`Switch your wallet to ${litvm.name} to trade`));
      localStorage.setItem(KIND_KEY, "injected");
      setAddress(getAddress(acc)); setKind("injected"); setOpen(false);
      toast.success("Wallet connected", { description: litvm.name });
    } catch {
      toast.error("Connection rejected");
    }
  };

  const connectDemo = (name: string) => {
    let a = localStorage.getItem(KEY + "-addr");
    if (!a) {
      a = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(KEY + "-addr", a);
    }
    localStorage.setItem(KEY, a);
    localStorage.setItem(KIND_KEY, "demo");
    setAddress(a); setKind("demo"); setOpen(false);
    toast.success(`Connected with ${name}`, { description: "Demo wallet — no real funds" });
  };

  const disconnect = () => {
    localStorage.removeItem(KEY); localStorage.removeItem(KIND_KEY);
    setAddress(null); setKind(null); toast("Wallet disconnected");
  };

  return (
    <WalletCtx.Provider value={{ address, kind, onchain: ONCHAIN && kind === "injected", open: () => setOpen(true), disconnect }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="size-5 text-primary-glow" /> Connect wallet</DialogTitle>
            <DialogDescription>Connect an EVM wallet on {litvm.name}.</DialogDescription>
          </DialogHeader>
          <button onClick={connectInjected} className="flex items-center gap-3 rounded-xl border border-primary-glow/40 bg-primary/10 p-4 text-left transition hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-ring">
            <span className="grid size-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground"><Wallet className="size-4" /></span>
            <span>
              <span className="block text-sm font-semibold">Browser wallet</span>
              <span className="block text-xs text-muted-foreground">{hasInjected ? "MetaMask, Rabby, OKX and other injected wallets" : "No wallet extension detected"}</span>
            </span>
          </button>
          {!ONCHAIN && (
            <>
              <div className="text-center text-xs text-muted-foreground">or try the demo (no real funds)</div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_WALLETS.map((w) => (
                  <button key={w.name} onClick={() => connectDemo(w.name)} className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 p-3 text-left text-sm font-medium transition hover:border-primary-glow/50 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                    <span className="grid size-8 place-items-center rounded-lg text-xs font-bold text-primary-foreground" style={{ background: `oklch(0.55 0.14 ${w.hue})` }}>{w.name[0]}</span>
                    {w.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </WalletCtx.Provider>
  );
}
