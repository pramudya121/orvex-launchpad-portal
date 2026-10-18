import { isAddress } from "viem";

/** UI eligibility only; privileged writes are authorized by the deployed contract. */
export function isFeeManagerOwner(address?: string | null, owner?: string | null) {
  return (
    !!address &&
    !!owner &&
    isAddress(address, { strict: false }) &&
    isAddress(owner, { strict: false }) &&
    address.toLowerCase() === owner.toLowerCase()
  );
}
