// Browser-side LitVMFaucet calls. Claim/deposit/withdraw write to the deployed
// contract; reads power the faucet and admin-faucet pages.
import { parseEther, type Address, type Hash } from "viem";
import { faucetAbi } from "./abi";
import { CONTRACTS } from "./chain";
import { publicClient, walletClient } from "./client";

async function confirm(hash: Hash) {
  const r = await publicClient().waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("Transaction reverted");
  return hash;
}

export type FaucetState = {
  owner: Address;
  claimAmount: bigint;
  balance: bigint;
};

export async function faucetState(): Promise<FaucetState> {
  const pc = publicClient();
  const [owner, claimAmount, balance] = await Promise.all([
    pc.readContract({ address: CONTRACTS.faucet, abi: faucetAbi, functionName: "owner" }),
    pc.readContract({ address: CONTRACTS.faucet, abi: faucetAbi, functionName: "CLAIM_AMOUNT" }),
    pc.readContract({ address: CONTRACTS.faucet, abi: faucetAbi, functionName: "getFaucetBalance" }),
  ]);
  return { owner: owner as Address, claimAmount: claimAmount as bigint, balance: balance as bigint };
}

export async function faucetHasClaimed(account: Address) {
  return (await publicClient().readContract({
    address: CONTRACTS.faucet,
    abi: faucetAbi,
    functionName: "hasClaimed",
    args: [account],
  })) as boolean;
}

export async function claimFaucet(account: Address) {
  const pc = publicClient();
  await pc.simulateContract({
    account,
    address: CONTRACTS.faucet,
    abi: faucetAbi,
    functionName: "claim",
  });
  const w = await walletClient(account);
  return confirm(
    await w.writeContract({
      address: CONTRACTS.faucet,
      abi: faucetAbi,
      functionName: "claim",
    }),
  );
}

export async function faucetDeposit(account: Address, amountZkltc: number | string) {
  const value = parseEther(String(amountZkltc));
  if (value <= 0n) throw new Error("Deposit amount must be positive");
  const w = await walletClient(account);
  return confirm(
    await w.writeContract({
      address: CONTRACTS.faucet,
      abi: faucetAbi,
      functionName: "deposit",
      value,
    }),
  );
}

export async function faucetWithdraw(account: Address) {
  const w = await walletClient(account);
  return confirm(
    await w.writeContract({ address: CONTRACTS.faucet, abi: faucetAbi, functionName: "withdraw" }),
  );
}

export async function faucetWithdrawAmount(account: Address, amountZkltc: number | string) {
  const amount = parseEther(String(amountZkltc));
  if (amount <= 0n) throw new Error("Withdraw amount must be positive");
  const w = await walletClient(account);
  return confirm(
    await w.writeContract({
      address: CONTRACTS.faucet,
      abi: faucetAbi,
      functionName: "withdrawAmount",
      args: [amount],
    }),
  );
}

export async function faucetTransferOwnership(account: Address, newOwner: Address) {
  const w = await walletClient(account);
  return confirm(
    await w.writeContract({
      address: CONTRACTS.faucet,
      abi: faucetAbi,
      functionName: "transferOwnership",
      args: [newOwner],
    }),
  );
}

/** Signs the admin action proof with the connected wallet (EIP-191 personal_sign). */
export async function signAdminAction(account: Address, message: string) {
  const w = await walletClient(account);
  return w.signMessage({ account, message });
}
