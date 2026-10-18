import { isAddress } from "viem";

/** UI eligibility only; privileged writes are authorized by the deployed contract. */
export function isFeeManagerOwner(address?: string | null, owner?: string | null) {
  return !!address && !!owner && isAddress(address) && isAddress(owner) && address.toLowerCase() === owner.toLowerCase();
}