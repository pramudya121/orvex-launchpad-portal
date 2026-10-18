import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getAddress, type Address } from "viem";
import { ExternalLink, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { injected, ensureChain, setActiveProvider, type Eth } from "@/lib/web3/client";
import { litvm } from "@/lib/web3/chain";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const KIND_KEY = "orvex-wallet-kind";
const RDNS_KEY = "orvex-wallet-rdns";

type Ctx = { address: Address | null; walletName: string | null; open: () => void; disconnect: () => void };
const WalletCtx = createContext<Ctx>({ address: null, walletName: null, open: () => {}, disconnect: () => {} });
export const useWallet = () => useContext(WalletCtx);

type Detail = { info: { uuid: string; name: string; icon: string; rdns: string }; provider: Eth };

/** Supported EVM wallets; logos are each wallet's official GitHub organisation avatar. */
const KNOWN = [
  { rdns: "io.metamask", name: "MetaMask", icon: "https://avatars.githubusercontent.com/u/11744586?v=4", url: "https://metamask.io/download/" },
  { rdns: "io.rabby", name: "Rabby Wallet", icon: "https://avatars.githubusercontent.com/u/84845472?v=4", url: "https://rabby.io/" },
  { rdns: "app.phantom", name: "Phantom", icon: "https://avatars.githubusercontent.com/u/124594793?v=4", url: "https://phantom.com/download" },
  { rdns: "com.okex.wallet", name: "OKX Wallet", icon: "https://avatars.githubusercontent.com/u/120148534?v=4", url: "https://www.okx.com/web3" },
  { rdns: "com.coinbase.wallet", name: "Coinbase Wallet", icon: "https://avatars.githubusercontent.com/u/1885080?v=4", url: "https://www.coinbase.com/wallet/downloads" },
  { rdns: "com.trustwallet.app", name: "Trust Wallet", icon: "https://avatars.githubusercontent.com/u/32179889?v=4", url: "https://trustwallet.com/download" },
  { rdns: "com.bitget.web3", name: "Bitget Wallet", icon: "https://avatars.githubusercontent.com/u/117051857?v=4", url: "https://web3.bitget.com/" },
  { rdns: "io.zerion.wallet", name: "Zerion", icon: "https://avatars.githubusercontent.com/u/18306895?v=4", url: "https://zerion.io/download" },
  { rdns: "me.rainbow", name: "Rainbow", icon: "https://avatars.githubusercontent.com/u/48327834?v=4", url: "https://rainbow.me/download" },
];

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [found, setFound] = useState<Detail[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const restored = useRef(false);

  // EIP-6963 multi-wallet discovery
  useEffect(() => {
    const onAnnounce = (e: Event) => {
      const d = (e as CustomEvent<Detail>).detail;
      if (!d?.info?.rdns) return;
      setFound((list) => (list.some((x) => x.info.rdns === d.info.rdns) ? list : [...list, d]));
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  // Silent reconnect to the last used wallet
  useEffect(() => {
    if (restored.current || localStorage.getItem(KIND_KEY) !== "injected") return;
    const rdns = localStorage.getItem(RDNS_KEY);
    const d = found.find((x) => x.info.rdns === rdns);
    const eth = d?.provider ?? (rdns ? null : injected());
    if (!eth) return;
    restored.current = true;
    setActiveProvider(eth);
    setWalletName(d?.info.name ?? "Browser wallet");
    eth
      .request({ method: "eth_accounts" })
      .then((a) => {
        const acc = (a as string[])[0];
        if (acc) setAddress(getAddress(acc));
      })
      .catch(() => {});
  }, [found]);

  useEffect(() => {
    const eth = injected();
    if (!eth || !address) return;
    const onAcc = (...args: unknown[]) => {
      const acc = (args[0] as string[] | undefined)?.[0];
      setAddress(acc ? getAddress(acc) : null);
    };
    eth.on?.("accountsChanged", onAcc);
    return () => eth.removeListener?.("accountsChanged", onAcc);
  }, [address]);

  const connect = async (eth: Eth, name: string, rdns: string) => {
    setPending(rdns);
    try {
      setActiveProvider(eth);
      const [acc] = (await eth.request({ method: "eth_requestAccounts" })) as Address[];
      if (!acc) return;
      await ensureChain(eth);
      localStorage.setItem(KIND_KEY, "injected");
      localStorage.setItem(RDNS_KEY, rdns);
      setAddress(getAddress(acc));
      setWalletName(name);
      setDialog(false);
      toast.success(`${name} connected`, { description: litvm.name });
    } catch (e) {
      const code = (e as { code?: number }).code;
      toast.error(code === 4001 ? "Connection rejected" : "Could not connect", {
        description: code === 4001 ? undefined : (e as Error).message?.slice(0, 120),
      });
    } finally {
      setPending(null);
    }
  };

  const disconnect = () => {
    localStorage.removeItem(KIND_KEY);
    localStorage.removeItem(RDNS_KEY);
    setActiveProvider(null);
    setAddress(null);
    setWalletName(null);
    toast("Wallet disconnected");
  };

  const legacy = typeof window !== "undefined" && !found.length ? injected() : null;
  const installed = found.map((d) => ({
    key: d.info.rdns,
    name: d.info.name,
    icon: d.info.icon || KNOWN.find((k) => k.rdns === d.info.rdns)?.icon || "",
    run: () => connect(d.provider, d.info.name, d.info.rdns),
  }));
  if (legacy) installed.push({ key: "injected", name: "Browser wallet", icon: "", run: () => connect(legacy, "Browser wallet", "injected") });
  const more = KNOWN.filter((k) => !found.some((d) => d.info.rdns === k.rdns));

  return (
    <WalletCtx.Provider value={{ address, walletName, open: () => setDialog(true), disconnect }}>
      {children}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border p-5">
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-primary" /> Connect wallet
            </DialogTitle>
            <DialogDescription>Choose an EVM wallet to connect to {litvm.name}.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-5 overflow-y-auto p-5">
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Detected</p>
              {!installed.length ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No wallet extension detected in this browser.
                </p>
              ) : (
                <div className="space-y-2">
                  {installed.map((w) => (
                    <button
                      key={w.key}
                      disabled={!!pending}
                      onClick={w.run}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface/40 p-3 text-left transition-colors hover:border-primary/60 hover:bg-surface disabled:opacity-60"
                    >
                      <WalletIcon src={w.icon} name={w.name} />
                      <span className="flex-1 font-semibold">{w.name}</span>
                      {pending === w.key ? (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      ) : (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">Installed</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
            {!!more.length && (
              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Get a wallet</p>
                <div className="grid grid-cols-3 gap-2">
                  {more.map((w) => (
                    <a
                      key={w.rdns}
                      href={w.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex flex-col items-center gap-2 rounded-xl border border-border p-3 text-center transition-colors hover:border-primary/60"
                    >
                      <WalletIcon src={w.icon} name={w.name} />
                      <span className="flex items-center gap-1 text-[11px] font-medium">
                        {w.name} <ExternalLink className="size-2.5 text-muted-foreground" />
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
          <p className="flex items-center gap-2 border-t border-border bg-surface/40 px-5 py-3 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" /> ORVEX never asks for your seed phrase or private key.
          </p>
        </DialogContent>
      </Dialog>
    </WalletCtx.Provider>
  );
}

function WalletIcon({ src, name }: { src: string; name: string }) {
  const [err, setErr] = useState(false);
  return src && !err ? (
    <img src={src} alt={`${name} logo`} onError={() => setErr(true)} className="size-9 shrink-0 rounded-lg object-cover" />
  ) : (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary")}>
      <Wallet className="size-4" />
    </span>
  );
}
