// Browser-only helpers around the injected EIP-1193 wallet (MetaMask, Rabby, OKX, …).
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  numberToHex,
  type Address,
  type EIP1193Provider,
} from "viem";
import { litvm } from "./chain";

type Eth = EIP1193Provider & {
  on?: (e: string, f: (...a: unknown[]) => void) => void;
  removeListener?: (e: string, f: (...a: unknown[]) => void) => void;
};
export const injected = (): Eth | null =>
  typeof window === "undefined"
    ? null
    : ((window as unknown as { ethereum?: Eth }).ethereum ?? null);

export const publicClient = () => createPublicClient({ chain: litvm, transport: http() });

export async function walletClient(account: Address) {
  const eth = injected();
  if (!eth) throw new Error("No browser wallet found");
  await ensureChain(eth);
  return createWalletClient({ account, chain: litvm, transport: custom(eth) });
}

export async function ensureChain(eth: Eth) {
  const id = numberToHex(litvm.id);
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: id }] });
  } catch (e) {
    if ((e as { code?: number }).code !== 4902) throw e;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: id,
          chainName: litvm.name,
          nativeCurrency: litvm.nativeCurrency,
          rpcUrls: [...litvm.rpcUrls.default.http],
          blockExplorerUrls: [litvm.blockExplorers.default.url],
        },
      ],
    });
  }
}
