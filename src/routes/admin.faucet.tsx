import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatEther, isAddress, type Address } from "viem";
import {
  ArrowLeft,
  Droplets,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/components/orvex/wallet";
import { explorerTx } from "@/lib/web3/chain";
import {
  faucetDeposit,
  faucetState,
  faucetTransferOwnership,
  faucetWithdraw,
  faucetWithdrawAmount,
  signAdminAction,
} from "@/lib/web3/faucet";
import { walletError } from "@/lib/web3/actions";
import {
  adminDeleteQuest,
  adminMessage,
  adminSaveQuest,
  listFaucetQuests,
  type FaucetQuest,
} from "@/lib/faucet.functions";
import { short } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/faucet")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
      { title: "Faucet Admin — ORVEX" },
      { name: "description", content: "Faucet and quest administration for the ORVEX zkLTC faucet." },
      { property: "og:title", content: "Faucet Admin — ORVEX" },
      { property: "og:description", content: "Faucet and quest administration for the ORVEX zkLTC faucet." },
    ],
  }),
  component: FaucetAdmin,
});

function FaucetAdmin() {
  const { address, open } = useWallet();
  const qc = useQueryClient();
  const state = useQuery({ queryKey: ["faucet"], queryFn: faucetState, refetchInterval: 15_000 });
  const quests = useQuery({
    queryKey: ["faucetQuests"],
    queryFn: () => listFaucetQuests({ data: {} }),
  });

  const isOwner =
    !!address && !!state.data && address.toLowerCase() === state.data.owner.toLowerCase();

  if (!address || (state.data && !isOwner))
    return (
      <div className="mx-auto max-w-md border-y border-border py-16 text-center">
        <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-5 text-2xl font-bold">Private access</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Only the connected faucet contract owner can access this page.
        </p>
        {!address ? (
          <Button className="mt-6" onClick={open}>
            <Wallet /> Connect owner wallet
          </Button>
        ) : state.isError ? (
          <Button variant="outline" className="mt-6" onClick={() => state.refetch()}>
            <RefreshCw /> Retry verification
          </Button>
        ) : null}
      </div>
    );
  if (!state.data) return <p className="py-16 text-center text-sm text-muted-foreground">Loading faucet…</p>;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["faucet"] });
    qc.invalidateQueries({ queryKey: ["faucetQuests"] });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" /> FeeManager admin
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black">
            <Droplets className="size-6 text-primary-glow" /> Faucet Admin
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Owner {short(state.data.owner)} · claim amount {Number(formatEther(state.data.claimAmount))} zkLTC
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>

      <FundsPanel address={address} balance={state.data.balance} onDone={refresh} />
      <OwnershipPanel address={address} onDone={refresh} />
      <QuestsPanel address={address} quests={quests.data?.quests ?? []} onDone={refresh} />
    </div>
  );
}

// ---------------- Funds ----------------

function FundsPanel({ address, balance, onDone }: { address: Address; balance: bigint; onDone: () => void }) {
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<string>, ok: string) => {
    setBusy(key);
    try {
      const hash = await fn();
      toast.success(ok, {
        description: (
          <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="underline">
            View transaction
          </a>
        ),
      });
      onDone();
    } catch (e) {
      toast.error(walletError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Droplets className="size-4 text-primary-glow" /> Faucet funds
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Balance: <span className="font-mono font-semibold text-foreground">{Number(formatEther(balance))} zkLTC</span>
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dep">Deposit zkLTC</Label>
          <div className="flex gap-2">
            <Input
              id="dep"
              type="number"
              min="0"
              step="any"
              placeholder="0.0"
              value={depositAmt}
              onChange={(e) => setDepositAmt(e.target.value)}
            />
            <Button
              disabled={busy !== null || !Number(depositAmt)}
              onClick={() => run("dep", () => faucetDeposit(address, depositAmt), "Deposit confirmed")}
            >
              {busy === "dep" ? <Loader2 className="size-4 animate-spin" /> : "Deposit"}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wd">Withdraw zkLTC</Label>
          <div className="flex gap-2">
            <Input
              id="wd"
              type="number"
              min="0"
              step="any"
              placeholder="0.0"
              value={withdrawAmt}
              onChange={(e) => setWithdrawAmt(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={busy !== null || !Number(withdrawAmt)}
              onClick={() => run("wd", () => faucetWithdrawAmount(address, withdrawAmt), "Withdrawal confirmed")}
            >
              {busy === "wd" ? <Loader2 className="size-4 animate-spin" /> : "Withdraw"}
            </Button>
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => run("wdall", () => faucetWithdraw(address), "Full withdrawal confirmed")}
            >
              {busy === "wdall" ? <Loader2 className="size-4 animate-spin" /> : "All"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------- Ownership ----------------

function OwnershipPanel({ address, onDone }: { address: Address; onDone: () => void }) {
  const [newOwner, setNewOwner] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <ShieldCheck className="size-4 text-primary-glow" /> Transfer faucet ownership
      </h2>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="0x… new owner address"
          value={newOwner}
          onChange={(e) => setNewOwner(e.target.value)}
          className="font-mono text-xs"
        />
        <Button
          variant="outline"
          disabled={busy || !isAddress(newOwner)}
          onClick={async () => {
            setBusy(true);
            try {
              const hash = await faucetTransferOwnership(address, newOwner as Address);
              toast.success("Ownership transferred", {
                description: (
                  <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="underline">
                    View transaction
                  </a>
                ),
              });
              setNewOwner("");
              onDone();
            } catch (e) {
              toast.error(walletError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Transfer"}
        </Button>
      </div>
    </section>
  );
}

// ---------------- Quests ----------------

const KINDS = [
  { value: "follow", label: "Follow X account", hint: "Username, e.g. litecoin" },
  { value: "like", label: "Like a post", hint: "Post ID from the X URL" },
  { value: "retweet", label: "Repost a post", hint: "Post ID from the X URL" },
  { value: "visit", label: "Visit a link", hint: "Full URL" },
] as const;

function QuestsPanel({
  address,
  quests,
  onDone,
}: {
  address: Address;
  quests: FaucetQuest[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("follow");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  /** Every quest change is proven with a fresh wallet signature from the faucet owner. */
  const signed = async <T,>(action: string, payload: T, fn: (sig: string, msg: string) => Promise<unknown>) => {
    const msg = adminMessage(action, payload, Date.now());
    const sig = await signAdminAction(address, msg);
    await fn(sig, msg);
  };

  const run = (key: string, fn: () => Promise<unknown>, ok: string) =>
    (async () => {
      setBusy(key);
      try {
        await fn();
        toast.success(ok);
        onDone();
      } catch (e) {
        toast.error(walletError(e));
      } finally {
        setBusy(null);
      }
    })();

  const create = () =>
    run("create", async () => {
      const quest = { title, description, kind, target, active: true, position: quests.length };
      await signed("saveQuest", quest, (signature, message) =>
        adminSaveQuest({ data: { address, signature, message, quest } }),
      );
      setTitle("");
      setDescription("");
      setTarget("");
    }, "Quest created");

  const toggle = (q: FaucetQuest) =>
    run(q.id, async () => {
      const quest = { ...q, description: q.description ?? undefined, active: !q.active };
      await signed("saveQuest", quest, (signature, message) =>
        adminSaveQuest({ data: { address, signature, message, quest } }),
      );
    }, q.active ? "Quest deactivated" : "Quest activated");

  const remove = (q: FaucetQuest) =>
    run(q.id, async () => {
      await signed("deleteQuest", { id: q.id }, (signature, message) =>
        adminDeleteQuest({ data: { address, signature, message, id: q.id } }),
      );
    }, "Quest deleted");

  const hint = KINDS.find((k) => k.value === kind)!.hint;

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <ListChecks className="size-4 text-primary-glow" /> Quests ({quests.length})
      </h2>

      <div className="mt-4 space-y-2">
        {!quests.length && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No quests yet — create the first one below.
          </p>
        )}
        {quests.map((q) => (
          <div key={q.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {q.title}{" "}
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase">{q.kind}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {q.target}
                {q.description ? ` · ${q.description}` : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" disabled={busy === q.id} onClick={() => toggle(q)}>
              {busy === q.id ? <Loader2 className="size-3.5 animate-spin" /> : q.active ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy === q.id}
              onClick={() => remove(q)}
              className="text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Plus className="size-3.5" /> New quest
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="qt">Title</Label>
            <Input id="qt" placeholder="Follow @litecoin on X" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qk">Type</Label>
            <select
              id="qk"
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qg">Target</Label>
            <Input id="qg" placeholder={hint} value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qd">Description (optional)</Label>
            <Input id="qd" placeholder="Short explanation" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <Button
          className={cn("mt-4 bg-gradient-primary shadow-glow")}
          disabled={busy !== null || !title.trim() || !target.trim()}
          onClick={create}
        >
          {busy === "create" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Create quest (signs with wallet)
        </Button>
      </div>
    </section>
  );
}
