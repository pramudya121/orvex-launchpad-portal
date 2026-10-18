import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ExternalLink, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { useWallet } from "@/components/orvex/wallet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a Token — ORVEX" },
      { name: "description", content: "Launch your own ERC-20 memecoin on LitVM in four simple steps." },
      { property: "og:title", content: "Create a Token — ORVEX" },
      { property: "og:description", content: "Launch your own memecoin on LitVM in four simple steps." },
    ],
  }),
  component: Create,
});

const STEPS = ["Basic info", "Tokenomics", "Advanced", "Preview"];

function Create() {
  const { address, open } = useWallet();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", symbol: "", description: "", supply: "1000000000", decimals: "18", tax: "0", maxWallet: "2", antiBot: true, lock: true, vesting: false, twitter: "", telegram: "", website: "" });
  const [logo, setLogo] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deploy, setDeploy] = useState<{ p: number; label: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  const valid = step !== 0 || (f.name.trim() && f.symbol.trim());

  const run = async () => {
    setConfirm(false);
    const stages = ["Uploading logo", "Deploying contract", "Adding liquidity", "Saving metadata"];
    for (let i = 0; i < stages.length; i++) {
      setDeploy({ p: (i / stages.length) * 100, label: stages[i] });
      await new Promise((r) => setTimeout(r, 900));
    }
    setDeploy({ p: 100, label: "Done" });
    setDone("0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(""));
    toast.success(`${f.symbol.toUpperCase()} deployed`);
  };

  if (done) {
    return (
      <div className="glass mx-auto max-w-lg rounded-3xl p-10 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-success/15 text-success"><Check className="size-7" /></div>
        <h1 className="mt-5 text-2xl font-bold">{f.name} is live</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your token was deployed on LitVM testnet (demo).</p>
        <div className="mt-6 break-all rounded-xl bg-surface p-3 font-mono text-xs">{done}</div>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(done); toast("Address copied"); }}>Copy address</Button>
          <Button asChild className="bg-gradient-primary"><a href="#" onClick={(e) => e.preventDefault()}>Explorer <ExternalLink /></a></Button>
        </div>
        <Link to="/explore" className="mt-6 block text-sm text-muted-foreground hover:text-foreground">Back to explore</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create token</h1>
        <ol className="mt-6 flex gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <div className={cn("h-1 rounded-full transition", i <= step ? "bg-gradient-primary" : "bg-surface")} />
              <div className={cn("mt-2 text-xs", i === step ? "text-foreground" : "text-muted-foreground")}>{i + 1}. {s}</div>
            </li>
          ))}
        </ol>

        <div className="glass mt-6 space-y-5 rounded-2xl p-6">
          {step === 0 && (
            <>
              <Field label="Token name"><Input value={f.name} onChange={(e) => set("name")(e.target.value)} placeholder="Silver Doge" maxLength={32} /></Field>
              <Field label="Symbol"><Input value={f.symbol} onChange={(e) => set("symbol")(e.target.value.toUpperCase())} placeholder="SDOGE" maxLength={10} /></Field>
              <Field label="Description"><Textarea value={f.description} onChange={(e) => set("description")(e.target.value)} placeholder="What makes it special?" maxLength={280} /></Field>
              <Field label="Logo">
                <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-border p-4 transition hover:border-primary-glow/50">
                  {logo ? <img src={logo} alt="" className="size-12 rounded-full object-cover" /> : <div className="grid size-12 place-items-center rounded-full bg-surface"><Upload className="size-5 text-muted-foreground" /></div>}
                  <span className="text-sm text-muted-foreground">PNG or JPG, up to 2MB</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) setLogo(URL.createObjectURL(file)); }} />
                </label>
              </Field>
            </>
          )}
          {step === 1 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Total supply"><Input type="number" value={f.supply} onChange={(e) => set("supply")(e.target.value)} /></Field>
              <Field label="Decimals"><Input type="number" value={f.decimals} onChange={(e) => set("decimals")(e.target.value)} /></Field>
              <Field label="Buy/Sell tax (%)"><Input type="number" value={f.tax} onChange={(e) => set("tax")(e.target.value)} /></Field>
              <Field label="Max wallet (% of supply)"><Input type="number" value={f.maxWallet} onChange={(e) => set("maxWallet")(e.target.value)} /></Field>
            </div>
          )}
          {step === 2 && (
            <>
              <Toggle label="Anti-bot protection" hint="Blocks snipers in the first blocks" on={f.antiBot} set={set("antiBot")} />
              <Toggle label="Lock liquidity (180 days)" hint="Builds trust with buyers" on={f.lock} set={set("lock")} />
              <Toggle label="Team vesting" hint="Linear unlock over 12 months" on={f.vesting} set={set("vesting")} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="X / Twitter"><Input value={f.twitter} onChange={(e) => set("twitter")(e.target.value)} placeholder="@handle" /></Field>
                <Field label="Telegram"><Input value={f.telegram} onChange={(e) => set("telegram")(e.target.value)} placeholder="t.me/…" /></Field>
                <Field label="Website"><Input value={f.website} onChange={(e) => set("website")(e.target.value)} placeholder="https://" /></Field>
              </div>
            </>
          )}
          {step === 3 && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[["Name", f.name], ["Symbol", f.symbol], ["Supply", Number(f.supply).toLocaleString()], ["Decimals", f.decimals], ["Tax", f.tax + "%"], ["Max wallet", f.maxWallet + "%"], ["Anti-bot", f.antiBot ? "On" : "Off"], ["Liquidity lock", f.lock ? "180 days" : "Off"]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface/60 p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v || "—"}</dd></div>
              ))}
            </dl>
          )}

          {deploy && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> {deploy.label}…</div>
              <Progress value={deploy.p} />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" disabled={step === 0 || !!deploy} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 3 ? (
              <Button disabled={!valid} onClick={() => setStep(step + 1)} className="bg-gradient-primary">Continue</Button>
            ) : (
              <Button disabled={!!deploy} onClick={() => (address ? setConfirm(true) : open())} className="bg-gradient-primary shadow-glow">{address ? "Deploy token" : "Connect wallet to deploy"}</Button>
            )}
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Live preview</div>
        <div className="glass mt-3 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            {logo ? <img src={logo} alt="" className="size-12 rounded-full object-cover" /> : <TokenLogo symbol={f.symbol || "??"} hue={(f.symbol.charCodeAt(0) || 210) * 7} size={48} />}
            <div><div className="font-semibold">{f.name || "Token name"}</div><div className="text-xs text-muted-foreground">${f.symbol || "SYMBOL"}</div></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{f.description || "Your description appears here."}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-surface/60 p-2">Supply<div className="font-mono">{Number(f.supply || 0).toLocaleString()}</div></div>
            <div className="rounded-lg bg-surface/60 p-2">Tax<div className="font-mono">{f.tax}%</div></div>
          </div>
        </div>
      </aside>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Deploy {f.symbol}?</AlertDialogTitle>
            <AlertDialogDescription>This will deploy an ERC-20 contract on LitVM. Estimated fee: ~0.002 zkLTC.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Confirm & deploy</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
function Toggle({ label, hint, on, set }: { label: string; hint: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface/50 p-4">
      <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">{hint}</div></div>
      <Switch checked={on} onCheckedChange={set} />
    </div>
  );
}
