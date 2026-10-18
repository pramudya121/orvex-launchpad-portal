import { defineChain, type Address } from "viem";

// LitVM LiteForge testnet. Values can be overridden with VITE_LITVM_* env vars
// once the official network details are confirmed.
const env = import.meta.env;
export const litvm = defineChain({
  id: Number(env["VITE_LITVM_CHAIN_ID"] ?? 4441),
  name: "LitVM LiteForge",
  nativeCurrency: { name: "zkLTC", symbol: "zkLTC", decimals: 18 },
  rpcUrls: { default: { http: [String(env["VITE_LITVM_RPC_URL"] ?? "https://liteforge.rpc.caldera.xyz/http")] } },
  blockExplorers: { default: { name: "LiteForge Explorer", url: String(env["VITE_LITVM_EXPLORER_URL"] ?? "https://liteforge.explorer.caldera.xyz") } },
  testnet: true,
});

/** Deployed OrvexLaunchpad address. Empty → the app runs in demo (off-chain) mode. */
export const LAUNCHPAD_ADDRESS = (env["VITE_ORVEX_LAUNCHPAD"] as Address | undefined) || null;
export const ONCHAIN = !!LAUNCHPAD_ADDRESS;

export const explorerTx = (hash: string) => `${litvm.blockExplorers.default.url}/tx/${hash}`;
export const explorerAddress = (a: string) => `${litvm.blockExplorers.default.url}/address/${a}`;
