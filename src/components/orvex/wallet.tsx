import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getAddress, type Address } from "viem";
import { injected, ensureChain } from "@/lib/web3/client";
import { litvm } from "@/lib/web3/chain";

const KIND_KEY = "orvex-wallet-kind";

type Ctx = { address: Address | null; open: () => void; disconnect: () => void };
const WalletCtx = createContext<Ctx>({ address: null, open: () => {}, disconnect: () => {} });
export const useWallet = () => useContext(WalletCtx);

/** Real EIP-1193 browser wallet (MetaMask, Rabby, OKX, …) on LitVM LiteForge. */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);

  useEffect(() => {
    const eth = injected();
    if (!eth) return;
    if (localStorage.getItem(KIND_KEY) === "injected") {
      eth.request({ method: "eth_accounts" }).then((a) => {
        const acc = (a as string[])[0];
        if (acc) setAddress(getAddress(acc));
      }).catch(() => {});
    }
    const onAcc = (...args: unknown[]) => {
      if (localStorage.getItem(KIND_KEY) !== "injected") return;
      const acc = (args[0] as string[] | undefined)?.[0];
      setAddress(acc ? getAddress(acc) : null);
    };
    eth.on?.("accountsChanged", onAcc);
    return () => eth.removeListener?.("accountsChanged", onAcc);
  }, []);

  const open = async () => {
    const eth = injected();
    if (!eth) {
      toast.error("No browser wallet found", { description: "Install MetaMask, Rabby or OKX Wallet, then refresh." });
      return;
    }
    try {
      const [acc] = (await eth.request({ method: "eth_requestAccounts" })) as Address[];
      if (!acc) return;
      await ensureChain(eth).catch(() => toast.warning(`Switch your wallet to ${litvm.name} to trade`));
      localStorage.setItem(KIND_KEY, "injected");
      setAddress(getAddress(acc));
      toast.success("Wallet connected", { description: litvm.name });
    } catch {
      toast.error("Connection rejected");
    }
  };

  const disconnect = () => {
    localStorage.removeItem(KIND_KEY);
    setAddress(null);
    toast("Wallet disconnected");
  };

  return <WalletCtx.Provider value={{ address, open, disconnect }}>{children}</WalletCtx.Provider>;
}
