import { useQuery } from "@tanstack/react-query";
import { CONTRACTS } from "@/lib/web3/chain";
import { feeManagerAbi } from "@/lib/web3/abi";
import { publicClient } from "@/lib/web3/client";
import { isFeeManagerOwner } from "@/lib/owner-access";
import { useWallet } from "./wallet";

export function useOwnerAccess() {
  const { address } = useWallet();
  const query = useQuery({
    queryKey: ["feeManagerOwner", address],
    queryFn: () => publicClient().readContract({ address: CONTRACTS.feeManager, abi: feeManagerAbi, functionName: "owner" }),
    enabled: !!address,
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: 1,
  });
  return { ...query, isOwner: !!address && !query.isError && isFeeManagerOwner(address, query.data) };
}