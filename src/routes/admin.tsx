import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatEther, isAddress, type Address } from "viem";
import {
  Loader2,
  ShieldCheck,
  Pause,
  Play,
  Wallet,
  Percent,
  Users,
  Send,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/components/orvex/wallet";
import { CONTRACTS, explorerAddress, explorerTx } from "@/lib/web3/chain";
import {
  feeManagerState,
  feeManagerSetWallets,
  feeManagerSetShares,
  feeManagerSetCollector,
  feeManagerPause,
  feeManagerUnpause,
  feeManagerDistributeETH,
  feeManagerDistributeToken,
  feeManagerEmergencyETH,
  feeManagerEmergencyToken,
  walletError,
} from "@/lib/web3/actions";
import { short } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Admin — ORVEX" },
      { name: "description", content: "FeeManager administration for the ORVEX launchpad." },
      { property: "og:title", content: "Admin — ORVEX" },
      { property: "og:description", content: "FeeManager administration for the ORVEX launchpad." },
    ],
  }),
  component: Admin,
});

const stateQuery = () => ({
  queryKey: ["feeManager"],
  queryFn: feeManagerState,
  refetchInterval: 15_000,
});

function Admin() {
  const { address, open } = useWallet();
  const qc = useQueryClient();
  const { data: s, isLoading, isError, refetch } = useQuery(stateQuery());
  const [busy, setBusy] = useState<string | null>(null);

  const isOwner =
    !!address && !!s && address.toLowerCase() === s.owner.toLowerCase();

  const run = async (key: string, fn: () => Promise<`0x${string}`>) => {
    if (busy) return;
    setBusy(key);
    try {
      const hash = await fn();
      toast.success("Transaction confirmed", {
        action: { label: "View tx", onClick: () => window.open(explorerTx(hash), "_blank", "noopener") },
      });
      await qc.invalidateQueries({ queryKey: ["feeManager"] });
    } catch (e) {
      toast.error(walletError(e));
    } finally {
      setBusy(null);
    }
  };

  if (isLoading)
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  if (isError || !s)
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
        <p className="text-sm text-danger">Could not read the FeeManager contract.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          <RefreshCw className="size-4" /> Retry
        </Button>
      </div>
    );

  // On-chain shares are basis points (10000 = 100%).
  const totalShare = s.treasuryShare + s.teamShare + s.marketingShare;
  const pct = (bps: number) => bps / 100;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-widest text-primary">Owner console</div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <ShieldCheck className="size-7 text-primary-glow" /> FeeManager admin
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              s.paused ? "bg-danger/15 text-danger" : "bg-success/15 text-success",
            )}
          >
            {s.paused ? "Paused" : "Active"}
          </span>
          <a
            href={explorerAddress(CONTRACTS.feeManager)}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-surface px-2.5 py-1 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {short(CONTRACTS.feeManager)}
          </a>
        </div>
      </div>

      {!address && (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-muted-foreground">Connect the owner wallet to manage fees.</p>
          <Button className="mt-4 bg-gradient-primary" onClick={open}>
            Connect wallet
          </Button>
        </div>
      )}
      {address && !isOwner && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Connected wallet {short(address)} is not the FeeManager owner ({short(s.owner)}). Read-only
          mode.
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Contract balance", `${Number(formatEther(s.balance)).toFixed(4)} zkLTC`],
          ["Treasury share", `${pct(s.treasuryShare)}%`],
          ["Team share", `${pct(s.teamShare)}%`],
          ["Marketing share", `${pct(s.marketingShare)}%`],
        ].map(([k, v]) => (
          <div key={k} className="glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-1 font-mono font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wallets */}
        <Section icon={<Wallet className="size-4" />} title="Recipient wallets">
          <WalletForm
            disabled={!isOwner || !!busy}
            initial={{ treasury: s.treasury, team: s.team, marketing: s.marketing }}
            onSave={(w) =>
              run("wallets", () =>
                feeManagerSetWallets(address as Address, w.treasury, w.team, w.marketing),
              )
            }
          />
        </Section>

        {/* Shares */}
        <Section icon={<Percent className="size-4" />} title="Fee split (%)">
          <ShareForm
            disabled={!isOwner || !!busy}
            initial={{ treasury: pct(s.treasuryShare), team: pct(s.teamShare), marketing: pct(s.marketingShare) }}
            total={pct(totalShare)}
            onSave={(sh) =>
              run("shares", () =>
                feeManagerSetShares(
                  address as Address,
                  BigInt(sh.treasury * 100),
                  BigInt(sh.team * 100),
                  BigInt(sh.marketing * 100),
                ),
              )
            }
          />
        </Section>

        {/* Collectors */}
        <Section icon={<Users className="size-4" />} title="Authorized collectors">
          <CollectorForm
            disabled={!isOwner || !!busy}
            onSet={(collector, status) =>
              run("collector", () => feeManagerSetCollector(address as Address, collector, status))
            }
          />
        </Section>

        {/* Distribution & pause */}
        <Section icon={<Send className="size-4" />} title="Distribute & pause">
          <div className="space-y-3">
            <Button
              className="w-full bg-gradient-primary"
              disabled={!isOwner || !!busy || s.balance === 0n}
              onClick={() => run("distribute", () => feeManagerDistributeETH(address as Address))}
            >
              {busy === "distribute" ? <Loader2 className="animate-spin" /> : null}
              Distribute {Number(formatEther(s.balance)).toFixed(4)} zkLTC to wallets
            </Button>
            <TokenAction
              label="Distribute token balance"
              disabled={!isOwner || !!busy}
              busy={busy === "distributeToken"}
              onRun={(token) => run("distributeToken", () => feeManagerDistributeToken(address as Address, token))}
            />
            <div className="flex gap-2">
              {s.paused ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!isOwner || !!busy}
                  onClick={() => run("unpause", () => feeManagerUnpause(address as Address))}
                >
                  <Play className="size-4" /> Unpause
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!isOwner || !!busy}
                  onClick={() => run("pause", () => feeManagerPause(address as Address))}
                >
                  <Pause className="size-4" /> Pause
                </Button>
              )}
            </div>
          </div>
        </Section>
      </div>

      {/* Emergency */}
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle className="size-4" /> Emergency withdraw
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Sends the full balance to the owner. Use only if distribution is broken.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Button
            variant="destructive"
            disabled={!isOwner || !!busy || s.balance === 0n}
            onClick={() => run("emergency", () => feeManagerEmergencyETH(address as Address))}
          >
            {busy === "emergency" ? <Loader2 className="animate-spin" /> : null}
            Withdraw all zkLTC
          </Button>
          <TokenAction
            label="Withdraw token"
            destructive
            disabled={!isOwner || !!busy}
            busy={busy === "emergencyToken"}
            onRun={(token) => run("emergencyToken", () => feeManagerEmergencyToken(address as Address, token))}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary-glow">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function WalletForm({
  initial,
  disabled,
  onSave,
}: {
  initial: { treasury: Address; team: Address; marketing: Address };
  disabled: boolean;
  onSave: (w: { treasury: Address; team: Address; marketing: Address }) => void;
}) {
  const [f, setF] = useState(initial);
  const ok = isAddress(f.treasury) && isAddress(f.team) && isAddress(f.marketing);
  return (
    <div className="space-y-3">
      {(["treasury", "team", "marketing"] as const).map((k) => (
        <div key={k}>
          <Label className="text-xs capitalize">{k}</Label>
          <Input
            value={f[k]}
            onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value as Address }))}
            className="mt-1 font-mono text-xs"
            disabled={disabled}
          />
        </div>
      ))}
      <Button className="w-full" disabled={disabled || !ok} onClick={() => onSave(f)}>
        Save wallets
      </Button>
    </div>
  );
}

function ShareForm({
  initial,
  total,
  disabled,
  onSave,
}: {
  initial: { treasury: number; team: number; marketing: number };
  total: number;
  disabled: boolean;
  onSave: (s: { treasury: number; team: number; marketing: number }) => void;
}) {
  const [f, setF] = useState(initial);
  const sum = f.treasury + f.team + f.marketing;
  const ok = sum === 100 && Object.values(f).every((v) => Number.isInteger(v) && v >= 0);
  return (
    <div className="space-y-3">
      {(["treasury", "team", "marketing"] as const).map((k) => (
        <div key={k}>
          <Label className="text-xs capitalize">{k}</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={f[k]}
            onChange={(e) => setF((s) => ({ ...s, [k]: Number(e.target.value) }))}
            className="mt-1 font-mono"
            disabled={disabled}
          />
        </div>
      ))}
      <div className={cn("text-xs", ok ? "text-muted-foreground" : "text-danger")}>
        Total: {sum}% (must equal 100% · currently on-chain {total}%)
      </div>
      <Button className="w-full" disabled={disabled || !ok} onClick={() => onSave(f)}>
        Save split
      </Button>
    </div>
  );
}

function CollectorForm({
  disabled,
  onSet,
}: {
  disabled: boolean;
  onSet: (collector: Address, status: boolean) => void;
}) {
  const [addr, setAddr] = useState("");
  const ok = isAddress(addr);
  return (
    <div className="space-y-3">
      <Label className="text-xs">Collector address</Label>
      <Input
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        placeholder="0x…"
        className="font-mono text-xs"
        disabled={disabled}
      />
      <div className="flex gap-2">
        <Button className="flex-1" disabled={disabled || !ok} onClick={() => onSet(addr as Address, true)}>
          Authorize
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={disabled || !ok}
          onClick={() => onSet(addr as Address, false)}
        >
          Revoke
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Authorized collectors (curve contracts) can forward trading fees into the FeeManager.
      </p>
    </div>
  );
}

function TokenAction({
  label,
  disabled,
  busy,
  destructive,
  onRun,
}: {
  label: string;
  disabled: boolean;
  busy: boolean;
  destructive?: boolean;
  onRun: (token: Address) => void;
}) {
  const [token, setToken] = useState("");
  const ok = isAddress(token);
  return (
    <div className="flex gap-2">
      <Input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Token address 0x…"
        className="font-mono text-xs"
        disabled={disabled}
      />
      <Button
        variant={destructive ? "destructive" : "secondary"}
        disabled={disabled || !ok}
        onClick={() => onRun(token as Address)}
      >
        {busy ? <Loader2 className="animate-spin" /> : null}
        {label}
      </Button>
    </div>
  );
}
