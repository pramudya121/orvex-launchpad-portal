import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/components/orvex/wallet";
import { launchpadAbi } from "@/lib/web3/abi";
import { launchpadBytecode } from "@/lib/web3/bytecode";
import { LAUNCHPAD_ADDRESS, explorerAddress, litvm } from "@/lib/web3/chain";
import { publicClient, walletClient } from "@/lib/web3/client";
import { walletError } from "@/lib/web3/actions";

export const Route = createFileRoute("/deploy")({
  head: () => ({
    meta: [
      { title: "Deploy Launchpad Contract — ORVEX" },
      { name: "description", content: "One-time deployment of the ORVEX bonding-curve launchpad contract on LitVM." },
      { property: "og:title", content: "Deploy Launchpad Contract — ORVEX" },
      { property: "og:description", content: "Deploy the ORVEX bonding-curve launchpad on LitVM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Deploy,
});

function Deploy() {
  const { address, kind, open } = useWallet();
  const [fee, setFee] = useState("");
  const [migrator, setMigrator] = useState("");
  const [busy, setBusy] = useState(false);
  const [deployed, setDeployed] = useState<string | null>(null);

  const run = async () => {
    if (!address) return;
    const feeTo = (fee || address) as Address, mig = (migrator || address) as Address;
    if (!isAddress(feeTo) || !isAddress(mig)) { toast.error("Invalid address"); return; }
    setBusy(true);
    try {
      const w = await walletClient(address as Address);
      const hash = await w.deployContract({ abi: launchpadAbi, bytecode: launchpadBytecode, args: [getAddress(feeTo), getAddress(mig)] });
      const r = await publicClient().waitForTransactionReceipt({ hash });
      if (!r.contractAddress) throw new Error("Deployment failed");
      setDeployed(r.contractAddress);
      toast.success("Launchpad deployed");
    } catch (e) {
      toast.error(walletError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass mx-auto max-w-xl space-y-5 rounded-3xl p-8">
      <h1 className="text-2xl font-bold">Deploy launchpad contract</h1>
      <p className="text-sm text-muted-foreground">One-time setup on {litvm.name} (chain {litvm.id}). After deploying, give the contract address to your developer so the app switches from demo mode to on-chain mode.</p>
      {LAUNCHPAD_ADDRESS && <div className="rounded-xl bg-success/10 p-3 text-sm text-success">Already live: <a className="font-mono underline" href={explorerAddress(LAUNCHPAD_ADDRESS)} target="_blank" rel="noreferrer">{LAUNCHPAD_ADDRESS}</a></div>}
      <div className="space-y-2"><Label>Fee recipient (defaults to your wallet)</Label><Input value={fee} onChange={(e) => setFee(e.target.value)} placeholder={address ?? "0x…"} /></div>
      <div className="space-y-2"><Label>Graduation liquidity receiver (defaults to your wallet)</Label><Input value={migrator} onChange={(e) => setMigrator(e.target.value)} placeholder={address ?? "0x…"} /></div>
      {address && kind === "injected"
        ? <Button disabled={busy} onClick={run} className="w-full bg-gradient-primary shadow-glow">{busy ? <Loader2 className="animate-spin" /> : "Deploy OrvexLaunchpad"}</Button>
        : <Button onClick={open} className="w-full bg-gradient-primary">Connect a browser wallet</Button>}
      {deployed && <div className="break-all rounded-xl bg-surface p-3 font-mono text-xs">{deployed}</div>}
    </div>
  );
}
