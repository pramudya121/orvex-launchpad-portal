import { zeroAddress, parseEther, type Address, type Hash } from "viem";
import { dexFactoryAbi, launchTokenAbi, pairAbi, routerAbi } from "./abi";
import { CONTRACTS, type DexToken } from "./chain";
import { publicClient, walletClient } from "./client";
import { tokenBalance } from "./actions";
import { minimumOutput } from "./trade-safety";
import { liquidityDeposit, liquidityWithdrawal } from "./liquidity-math";

export type LiquidityStatus = { phase: "approval" | "wallet" | "pending" | "success" | "error"; label: string; hash?: Hash };
type Notify = (status: LiquidityStatus) => void;
const normalized = (t: DexToken) => t.address ?? CONTRACTS.wzkltc;
export async function liquidityPool(a: DexToken, b: DexToken, account?: Address | null) {
  const pc = publicClient();
  const aa = normalized(a), bb = normalized(b);
  if (aa.toLowerCase() === bb.toLowerCase()) throw new Error("Choose different pool assets");
  const pair = await pc.readContract({ address: CONTRACTS.dexFactory, abi: dexFactoryAbi, functionName: "getPair", args: [aa, bb] });
  if (pair === zeroAddress) return { pair: null, reserveA: 0n, reserveB: 0n, supply: 0n, lpBalance: 0n };
  const [t0, t1, reserves, supply, lpBalance] = await Promise.all([
    pc.readContract({ address: pair, abi: pairAbi, functionName: "token0" }),
    pc.readContract({ address: pair, abi: pairAbi, functionName: "token1" }),
    pc.readContract({ address: pair, abi: pairAbi, functionName: "getReserves" }),
    pc.readContract({ address: pair, abi: launchTokenAbi, functionName: "totalSupply" }),
    account ? tokenBalance(account, pair) : Promise.resolve(0n),
  ]);
  const forward = t0.toLowerCase() === aa.toLowerCase();
  if ((forward ? t1 : t0).toLowerCase() !== bb.toLowerCase()) throw new Error("Pool assets do not match");
  return { pair, reserveA: reserves[forward ? 0 : 1], reserveB: reserves[forward ? 1 : 0], supply, lpBalance };
}
async function precision(t: DexToken) {
  if (!t.address) return;
  const d = await publicClient().readContract({ address: t.address, abi: launchTokenAbi, functionName: "decimals" });
  if (Number(d) !== t.decimals) throw new Error("Token precision changed; refresh this listing");
}
async function receipt(hash: Hash, label: string, notify: Notify) {
  notify({ phase: "pending", label, hash });
  const r = await publicClient().waitForTransactionReceipt({ hash, timeout: 180_000 });
  if (r.status !== "success") throw new Error("Transaction reverted");
}
async function approve(account: Address, token: Address, amount: bigint, name: string, notify: Notify) {
  const pc = publicClient();
  const allowance = await pc.readContract({ address: token, abi: launchTokenAbi, functionName: "allowance", args: [account, CONTRACTS.router] });
  if (allowance >= amount) return;
  notify({ phase: "approval", label: `Approve ${name} in your wallet` });
  const w = await walletClient(account);
  const { request } = await pc.simulateContract({ account, address: token, abi: launchTokenAbi, functionName: "approve", args: [CONTRACTS.router, amount] });
  await receipt(await w.writeContract(request), `Confirming ${name} approval`, notify);
}
export async function transactLiquidity(account: Address, a: DexToken, b: DexToken, mode: "add" | "remove", amountA: bigint, amountB: bigint, reviewed: readonly [bigint, bigint], slippageBps: number, notify: Notify, onSubmitted: (hash: Hash) => void) {
  await walletClient(account);
  await Promise.all([precision(a), precision(b)]);
  const minA = minimumOutput(reviewed[0], slippageBps), minB = minimumOutput(reviewed[1], slippageBps);
  if (mode === "add") {
    if (a.address) await approve(account, a.address, amountA, a.symbol, notify);
    if (b.address) await approve(account, b.address, amountB, b.symbol, notify);
  } else {
    const state = await liquidityPool(a, b, account);
    if (!state.pair || amountA <= 0n || amountA > state.lpBalance) throw new Error("Insufficient LP balance");
    await approve(account, state.pair, amountA, "LP tokens", notify);
  }
  const state = await liquidityPool(a, b, account);
  const actual = mode === "add" ? liquidityDeposit(amountA, amountB, state.reserveA, state.reserveB) : liquidityWithdrawal(amountA, state.supply, state.reserveA, state.reserveB);
  if (actual[0] < minA || actual[1] < minB) throw new Error("Pool ratio changed — review a fresh quote");
  const [balA, balB, gasBalance] = await Promise.all([tokenBalance(account, a.address), tokenBalance(account, b.address), tokenBalance(account, null)]);
  if (mode === "add" && (balA < amountA || balB < amountB)) throw new Error("Insufficient token balance");
  if (mode === "remove" && (!state.pair || amountA > state.lpBalance)) throw new Error("LP balance changed");
  const nativeValue = mode === "add" ? (!a.address ? amountA : !b.address ? amountB : 0n) : 0n;
  if (gasBalance < nativeValue + parseEther("0.002")) throw new Error("Keep at least 0.002 zkLTC for network fees");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const pc = publicClient();
  notify({ phase: "wallet", label: `Confirm ${mode === "add" ? "add" : "remove"} liquidity in your wallet` });
  const w = await walletClient(account);
  let hash: Hash;
  if (!a.address || !b.address) {
    const token = a.address ?? b.address;
    if (!token) throw new Error("Choose a token paired with zkLTC");
    const tokenDesired = a.address ? amountA : amountB;
    const tokenMin = a.address ? minA : minB, nativeMin = a.address ? minB : minA;
    if (mode === "add") {
      const { request } = await pc.simulateContract({ account, address: CONTRACTS.router, abi: routerAbi, functionName: "addLiquidityETH", args: [token, tokenDesired, tokenMin, nativeMin, account, deadline], value: nativeValue });
      hash = await w.writeContract(request);
    } else {
      const { request } = await pc.simulateContract({ account, address: CONTRACTS.router, abi: routerAbi, functionName: "removeLiquidityETH", args: [token, amountA, tokenMin, nativeMin, account, deadline] });
      hash = await w.writeContract(request);
    }
  } else if (mode === "add") {
    const { request } = await pc.simulateContract({ account, address: CONTRACTS.router, abi: routerAbi, functionName: "addLiquidity", args: [a.address, b.address, amountA, amountB, minA, minB, account, deadline] });
    hash = await w.writeContract(request);
  } else {
    const { request } = await pc.simulateContract({ account, address: CONTRACTS.router, abi: routerAbi, functionName: "removeLiquidity", args: [a.address, b.address, amountA, minA, minB, account, deadline] });
    hash = await w.writeContract(request);
  }
  onSubmitted(hash);
  await receipt(hash, "Waiting for liquidity confirmation", notify);
  notify({ phase: "success", label: mode === "add" ? "Liquidity added" : "Liquidity removed", hash });
  return hash;
}