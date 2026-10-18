// Browser-side contract calls. Each returns the confirmed tx hash; the caller then
// asks the server to index it (indexTx) so the UI/DB mirrors the chain.
import { parseEther, type Address, type Hash } from "viem";
import { launchpadAbi } from "./abi";
import { LAUNCHPAD_ADDRESS } from "./chain";
import { publicClient, walletClient } from "./client";

export const SLIPPAGE = 0.02;
const pad = () => {
  if (!LAUNCHPAD_ADDRESS) throw new Error("Launchpad contract not configured");
  return LAUNCHPAD_ADDRESS;
};
const toWei = (n: number) => parseEther(n.toFixed(18).replace(/\.?0+$/, "") || "0");

async function confirm(hash: Hash) {
  const r = await publicClient().waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("Transaction reverted");
  return hash;
}

export async function buyOnchain(account: Address, token: Address, baseIn: number, expectedTokens: number) {
  const w = await walletClient(account);
  const hash = await w.writeContract({
    address: pad(), abi: launchpadAbi, functionName: "buy",
    args: [token, toWei(Math.floor(expectedTokens * (1 - SLIPPAGE)))], value: toWei(baseIn),
  });
  return confirm(hash);
}

export async function sellOnchain(account: Address, token: Address, tokensIn: number, expectedBase: number) {
  const w = await walletClient(account);
  const hash = await w.writeContract({
    address: pad(), abi: launchpadAbi, functionName: "sell",
    args: [token, toWei(tokensIn), toWei(expectedBase * (1 - SLIPPAGE))],
  });
  return confirm(hash);
}

export async function createOnchain(account: Address, p: { name: string; symbol: string; uri: string; devBuy: number; expectedTokens: number }) {
  const w = await walletClient(account);
  const fee = (await publicClient().readContract({ address: pad(), abi: launchpadAbi, functionName: "createFee" })) as bigint;
  const hash = await w.writeContract({
    address: pad(), abi: launchpadAbi, functionName: "createToken",
    args: [p.name, p.symbol, p.uri, toWei(Math.floor(p.expectedTokens * (1 - SLIPPAGE)))],
    value: fee + toWei(p.devBuy),
  });
  return confirm(hash);
}

/** Short, user-readable message from a wallet/contract error. */
export function walletError(e: unknown) {
  const m = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "Transaction failed";
  if (/rejected|denied/i.test(m)) return "Transaction rejected in wallet";
  if (/insufficient funds/i.test(m)) return "Not enough zkLTC for this transaction";
  if (/slippage/i.test(m)) return "Price moved more than 2% — try again";
  return m.length > 120 ? m.slice(0, 120) + "…" : m;
}
