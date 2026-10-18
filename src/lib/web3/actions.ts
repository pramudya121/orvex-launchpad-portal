// Browser-side contract calls. Each returns the confirmed tx hash; the caller then
// asks the server to index it (indexTx) so lists, charts and leaderboard update.
import { parseEventLogs, parseEther, parseUnits, zeroAddress, type Address, type Hash } from "viem";
import { antiBotAbi, bondingCurveAbi, factoryAbi, launchTokenAbi, referralAbi, routerAbi } from "./abi";
import { CONTRACTS } from "./chain";
import { publicClient, walletClient } from "./client";
import { CURVE } from "../curve";

const toWei = (n: number, decimals = 18) => parseUnits(n.toFixed(Math.min(decimals, 18)).replace(/\.?0+$/, "") || "0", decimals);
const minOut = (n: number, d = 18) => toWei(n * (1 - CURVE.slippage), d);

async function confirm(hash: Hash) {
  const r = await publicClient().waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("Transaction reverted");
  return hash;
}

async function ensureAllowance(account: Address, token: Address, spender: Address, amount: bigint) {
  const pc = publicClient();
  const cur = (await pc.readContract({ address: token, abi: launchTokenAbi, functionName: "allowance", args: [account, spender] })) as bigint;
  if (cur >= amount) return;
  const w = await walletClient(account);
  await confirm(await w.writeContract({ address: token, abi: launchTokenAbi, functionName: "approve", args: [spender, amount] }));
}

/** Anti-bot pre-check so users get a clear message instead of a reverted tx. */
export async function antiBotCheck(account: Address, baseIn: number) {
  try {
    return (await publicClient().readContract({ address: CONTRACTS.antiBot, abi: antiBotAbi, functionName: "check", args: [account, parseEther(String(baseIn))] })) as boolean;
  } catch {
    return true; // unreadable → let the curve contract decide
  }
}

export async function buyOnchain(account: Address, curve: Address, baseIn: number, expectedTokens: number) {
  const w = await walletClient(account);
  return confirm(await w.writeContract({ address: curve, abi: bondingCurveAbi, functionName: "buy", args: [minOut(expectedTokens)], value: toWei(baseIn) }));
}

export async function sellOnchain(account: Address, token: Address, curve: Address, tokensIn: number, expectedBase: number) {
  const amount = toWei(tokensIn);
  await ensureAllowance(account, token, curve, amount);
  const w = await walletClient(account);
  return confirm(await w.writeContract({ address: curve, abi: bondingCurveAbi, functionName: "sell", args: [amount, minOut(expectedBase)] }));
}

export async function creationFee() {
  return (await publicClient().readContract({ address: CONTRACTS.factory, abi: factoryAbi, functionName: "creationFee" })) as bigint;
}

/** Launches a token through LaunchpadFactory; returns the tx hash and the new token/curve addresses. */
export async function createOnchain(account: Address, p: { name: string; symbol: string }) {
  const fee = await creationFee();
  const pc = publicClient();
  await pc.simulateContract({ account, address: CONTRACTS.factory, abi: factoryAbi, functionName: "createToken", args: [p.name, p.symbol], value: fee });
  const w = await walletClient(account);
  const hash = await confirm(await w.writeContract({ address: CONTRACTS.factory, abi: factoryAbi, functionName: "createToken", args: [p.name, p.symbol], value: fee }));
  const receipt = await pc.getTransactionReceipt({ hash });
  const launch = parseEventLogs({ abi: factoryAbi, logs: receipt.logs, eventName: "TokenLaunched" }).find((l) => l.address.toLowerCase() === CONTRACTS.factory.toLowerCase());
  if (!launch) throw new Error("Launch confirmed but token event could not be found — check the transaction explorer");
  return { hash, token: launch.args.token, curve: launch.args.curve };
}

// ---------------- DEX (UniswapV2 router) ----------------

export const routePath = (from: Address | null, to: Address | null): Address[] => {
  const a = from ?? CONTRACTS.wzkltc, b = to ?? CONTRACTS.wzkltc;
  if (a === CONTRACTS.wzkltc || b === CONTRACTS.wzkltc) return [a, b];
  return [a, CONTRACTS.wzkltc, b];
};

export async function quoteSwap(from: Address | null, to: Address | null, amountIn: bigint) {
  const pc = publicClient();
  const direct = [from ?? CONTRACTS.wzkltc, to ?? CONTRACTS.wzkltc] as Address[];
  const tries = [direct, routePath(from, to)].filter((p, i, arr) => i === 0 || p.length !== arr[0]!.length);
  for (const path of tries) {
    try {
      const out = (await pc.readContract({ address: CONTRACTS.router, abi: routerAbi, functionName: "getAmountsOut", args: [amountIn, path] })) as bigint[];
      if (out[out.length - 1]! > 0n) return { path, amountOut: out[out.length - 1]! };
    } catch { /* no pool on this path */ }
  }
  return null;
}

export async function swap(account: Address, from: Address | null, to: Address | null, amountIn: bigint, amountOutMin: bigint, path: Address[]) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  const w = await walletClient(account);
  // Native zkLTC ↔ WzkLTC is a plain wrap/unwrap, no pool needed.
  if (!from && to === CONTRACTS.wzkltc) return confirm(await w.writeContract({ address: CONTRACTS.wzkltc, abi: [{ type: "function", name: "deposit", inputs: [], outputs: [], stateMutability: "payable" }] as const, functionName: "deposit", value: amountIn }));
  if (from === CONTRACTS.wzkltc && !to) return confirm(await w.writeContract({ address: CONTRACTS.wzkltc, abi: [{ type: "function", name: "withdraw", inputs: [{ name: "wad", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }] as const, functionName: "withdraw", args: [amountIn] }));
  if (!from) return confirm(await w.writeContract({ address: CONTRACTS.router, abi: routerAbi, functionName: "swapExactETHForTokens", args: [amountOutMin, path, account, deadline], value: amountIn }));
  await ensureAllowance(account, from, CONTRACTS.router, amountIn);
  if (!to) return confirm(await w.writeContract({ address: CONTRACTS.router, abi: routerAbi, functionName: "swapExactTokensForETH", args: [amountIn, amountOutMin, path, account, deadline] }));
  return confirm(await w.writeContract({ address: CONTRACTS.router, abi: routerAbi, functionName: "swapExactTokensForTokens", args: [amountIn, amountOutMin, path, account, deadline] }));
}

export async function tokenBalance(account: Address, token: Address | null) {
  const pc = publicClient();
  if (!token) return pc.getBalance({ address: account });
  return (await pc.readContract({ address: token, abi: launchTokenAbi, functionName: "balanceOf", args: [account] })) as bigint;
}

// ---------------- Referral ----------------

export async function referralInfo(user: Address) {
  const [referrer, earned, referred] = (await publicClient().readContract({ address: CONTRACTS.referral, abi: referralAbi, functionName: "getReferralInfo", args: [user] })) as readonly [Address, bigint, bigint];
  return { referrer: referrer === zeroAddress ? null : referrer, earned, referred: Number(referred) };
}

export async function registerReferral(account: Address, referrer: Address) {
  const w = await walletClient(account);
  return confirm(await w.writeContract({ address: CONTRACTS.referral, abi: referralAbi, functionName: "registerReferral", args: [referrer] }));
}

/** Short, user-readable message from a wallet/contract error. */
export function walletError(e: unknown) {
  const m = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "Transaction failed";
  if (/rejected|denied/i.test(m)) return "Transaction rejected in wallet";
  if (/insufficient funds/i.test(m)) return "Not enough zkLTC for this transaction";
  if (/slippage|min.*out|INSUFFICIENT_OUTPUT/i.test(m)) return "Price moved too much — try again";
  return m.length > 140 ? m.slice(0, 140) + "…" : m;
}
