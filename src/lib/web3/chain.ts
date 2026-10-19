import { defineChain, type Address } from "viem";
import orvxLogo from "@/assets/orvx-token-logo.jpg.asset.json";

export const litvm = defineChain({
  id: 4441,
  name: "LitVM LiteForge",
  nativeCurrency: { name: "zkLTC", symbol: "zkLTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://liteforge.rpc.caldera.xyz/http"] } },
  blockExplorers: { default: { name: "LiteForge Explorer", url: "https://liteforge.explorer.caldera.xyz" } },
  contracts: { multicall3: { address: "0x25E7345084F79efC1b296d0c4a1B664191544bC4" } },
  testnet: true,
});

/** Deployed ORVEX contracts on LitVM LiteForge. */
export const CONTRACTS = {
  factory: "0xE3931c20519C036587aa084f91059c17B6d33102",
  feeManager: "0x96A80cFC94fE1D3b43205Cc50473241Fe053981b",
  antiBot: "0xA150e41512AF869df01CFB9e321273cD557daA38",
  referral: "0xDC71647Bcca2074862Fe3359cE2397fF1C2EdE12",
  lpLocker: "0x14Dc0697770749d8b19cA78B0CE5676c545c3B1d",
  dexFactory: "0x42e4E19020aa23947e1BE3260b7e4CCFDd246128",
  router: "0x03D2D542100fa926de135a08B609c8538E45F6ee",
  wzkltc: "0x3A153e8BcDe02F4Cf6C5eeECD9c83bC0296FFbD3",
  multicall: "0x25E7345084F79efC1b296d0c4a1B664191544bC4",
  faucet: "0x883A2bEd62d383D1b070dD506D8feC45135a9313",
} as const satisfies Record<string, Address>;

const cmc = (id: number) => `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`;

/** Tokens listed on the DEX page. `address: null` = native zkLTC. */
export type DexToken = { symbol: string; name: string; address: Address | null; logo: string | null; decimals: number };
export const DEX_TOKENS: DexToken[] = [
  { symbol: "zkLTC", name: "zkLTC", address: null, logo: cmc(2), decimals: 18 },
  { symbol: "WzkLTC", name: "Wrapped zkLTC", address: CONTRACTS.wzkltc, logo: cmc(2), decimals: 18 },
  { symbol: "ORVX", name: "ORVEX", address: "0x7216EAb89cDbb52D3D8A0e2F305F9Afb5cE122a3", logo: orvxLogo.url, decimals: 18 },
  { symbol: "TRX", name: "TRON", address: "0x8705875084c72C0cDC01c1Ac36A807808c8E5850", logo: cmc(1958), decimals: 18 },
  { symbol: "XRP", name: "XRP", address: "0xA860Fc63d7C3d5cAf5295dE72AEeb4260D7819D4", logo: cmc(52), decimals: 18 },
  { symbol: "ADA", name: "Cardano", address: "0x7b277d0387ccDFC395Eae0EFe2321765afAb37c8", logo: cmc(2010), decimals: 18 },
  { symbol: "ZEC", name: "Zcash", address: "0x0177E73214265D1d6f29a273155803Af5Bf47cFa", logo: cmc(1437), decimals: 18 },
  { symbol: "XMR", name: "Monero", address: "0x05466944d61662225ad19916725975230bb5b2B7", logo: cmc(328), decimals: 18 },
];

export const explorerTx = (hash: string) => `${litvm.blockExplorers.default.url}/tx/${hash}`;
export const explorerAddress = (a: string) => `${litvm.blockExplorers.default.url}/address/${a}`;
