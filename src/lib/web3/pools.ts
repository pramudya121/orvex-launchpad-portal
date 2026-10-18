import { formatUnits, type Address } from "viem";
import { publicClient } from "./client";
import { dexFactoryAbi, launchTokenAbi, pairAbi } from "./abi";
import { CONTRACTS, DEX_TOKENS, type DexToken } from "./chain";
import { boundedMap } from "../bounded-map";
import { pageWindow, POOL_PAGE_SIZE } from "../pagination";
import { short } from "../tokens";

export async function poolPage(offset: number, account: Address | null) {
  const pc = publicClient();
  const total = Number(await pc.readContract({ address: CONTRACTS.dexFactory, abi: dexFactoryAbi, functionName: "allPairsLength" }));
  const known = new Map(DEX_TOKENS.filter((t) => t.address).map((t) => [t.address?.toLowerCase(), t]));
  async function metadata(address: Address): Promise<DexToken> {
    const existing = known.get(address.toLowerCase());
    if (existing) return existing;
    const decimals = Number(await pc.readContract({ address, abi: launchTokenAbi, functionName: "decimals" }));
    let symbol = short(address);
    try { symbol = await pc.readContract({ address, abi: launchTokenAbi, functionName: "symbol" }); } catch { /* address fallback */ }
    return { address, decimals, symbol, name: address, logo: null };
  }
  // Each worker issues one request at a time, including metadata, to keep six slots bounded.
  const pools = await boundedMap(pageWindow(offset, total, POOL_PAGE_SIZE), async (i) => {
    const pair = await pc.readContract({ address: CONTRACTS.dexFactory, abi: dexFactoryAbi, functionName: "allPairs", args: [BigInt(i)] });
    const t0 = await pc.readContract({ address: pair, abi: pairAbi, functionName: "token0" });
    const t1 = await pc.readContract({ address: pair, abi: pairAbi, functionName: "token1" });
    const res = await pc.readContract({ address: pair, abi: pairAbi, functionName: "getReserves" });
    const a = await metadata(t0), b = await metadata(t1);
    const lpBalance = account ? await pc.readContract({ address: pair, abi: launchTokenAbi, functionName: "balanceOf", args: [account] }) : 0n;
    return { pair, a, b, lpBalance, r0: Number(formatUnits(res[0], a.decimals)), r1: Number(formatUnits(res[1], b.decimals)) };
  });
  return { pools, total, next: offset + POOL_PAGE_SIZE < total ? offset + POOL_PAGE_SIZE : null };
}