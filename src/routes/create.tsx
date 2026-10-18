import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { Address } from "viem";
import { createToken, uploadLogo, indexTx } from "@/lib/launchpad.functions";
import { CURVE, initialReserves, quoteBuy, spotPrice } from "@/lib/curve";
import { fmtNum, fmtUsd } from "@/lib/tokens";
import { createOnchain, walletError } from "@/lib/web3/actions";
import { explorerTx } from "@/lib/web3/chain";
import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const STEPS = ["Basic info", "Launch", "Socials", "Preview"];

const readB64 = (file: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] ?? "");
  r.onerror = () => rej(r.error);
  r.readAsDataURL(file);
});
type LogoType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

function Create() {
  const { address, open, onchain } = useWallet();
  const navigate = useNavigate();
  const doCreate = useServerFn(createToken);
  const doUpload = useServerFn(uploadLogo);
  const doIndex = useServerFn(indexTx);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", symbol: "", description: "", devBuy: "0", twitter: "", telegram: "", website: "" });
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deploy, setDeploy] = useState<{ p: number; label: string } | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const devBuy = Math.max(0, Number(f.devBuy) || 0);
  const devQuote = devBuy > 0 ? quoteBuy(initialReserves(), devBuy) : null;
  const valid = step !== 0 || (f.name.trim() && /^[A-Z0-9]{1,10}$/.test(f.symbol.trim()));

  const run = async () => {
    setConfirm(false);
    if (!address) return;
    const symbol = f.symbol.trim().toUpperCase();
    const meta = { description: f.description, twitter: f.twitter || undefined, telegram: f.telegram || undefined, website: f.website || undefined };
    try {
      if (logoFile && logoFile.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
      setDeploy({ p: 15, label: "Uploading logo" });
      const logoBase64 = logoFile ? await readB64(logoFile) : undefined;
      const logoType = logoFile ? (logoFile.type as LogoType) : undefined;

      if (onchain) {
        let uri = "";
        if (logoBase64 && logoType) {
          const up = await doUpload({ data: { symbol, logoBase64, logoType } });
          if ("error" in up) { toast.error(up.error); return; }
          uri = up.url ?? "";
        }
        setDeploy({ p: 45, label: "Confirm in your wallet" });
        const hash = await createOnchain(address as Address, { name: f.name.trim(), symbol, uri, devBuy, expectedTokens: devQuote?.tokenAmount ?? 0 });
        setDeploy({ p: 80, label: "Indexing transaction" });
        const r = await doIndex({ data: { txHash: hash, meta } });
        if ("error" in r) { toast.error(r.error); return; }
        toast.success(`${symbol} is live on LitVM`, { action: { label: "View tx", onClick: () => window.open(explorerTx(hash), "_blank", "noopener") } });
      } else {
        setDeploy({ p: 50, label: "Creating bonding curve" });
        const r = await doCreate({ data: { name: f.name.trim(), symbol, ...meta, description: f.description, creator: address, logoBase64, logoType, devBuy } });
        if ("error" in r) { toast.error(r.error); return; }
        toast.success(`${symbol} launched`);
      }
      setDeploy({ p: 100, label: "Done" });
      navigate({ to: "/token/$symbol", params: { symbol } });
    } catch (e) {
      toast.error(onchain ? walletError(e) : "Launch failed, please try again");
    } finally {
      setDeploy(null);
    }
  };

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
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setLogo(URL.createObjectURL(file)); setLogoFile(file); } }} />
                </label>
              </Field>
            </>
          )}
          {step === 1 && (
            <div className="space-y-5">
              <Field label="Dev buy (zkLTC, optional)"><Input type="number" min="0" step="0.1" value={f.devBuy} onChange={(e) => set("devBuy")(e.target.value)} /></Field>
              {devQuote && <p className="text-sm text-muted-foreground">You'll receive ≈ <span className="font-mono text-foreground">{fmtNum(devQuote.tokenAmount)}</span> {f.symbol || "tokens"} ({((devQuote.tokenAmount / CURVE.totalSupply) * 100).toFixed(2)}% of supply).</p>}
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {[["Total supply", "1,000,000,000"], ["Sold on curve", "800,000,000"], ["Reserved for DEX", "200,000,000"], ["Trade fee", `${CURVE.feeRate * 100}%`]].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-surface/60 p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="mt-0.5 font-mono">{v}</div></div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Every token launches on the same fair bonding curve. When all 800M curve tokens are sold, the token graduates and liquidity moves to a DEX.</p>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="X / Twitter"><Input value={f.twitter} onChange={(e) => set("twitter")(e.target.value)} placeholder="@handle" maxLength={100} /></Field>
              <Field label="Telegram"><Input value={f.telegram} onChange={(e) => set("telegram")(e.target.value)} placeholder="t.me/…" maxLength={100} /></Field>
              <Field label="Website"><Input value={f.website} onChange={(e) => set("website")(e.target.value)} placeholder="https://" maxLength={200} /></Field>
            </div>
          )}
          {step === 3 && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[["Name", f.name], ["Symbol", f.symbol], ["Supply", "1,000,000,000"], ["Dev buy", devBuy ? `${devBuy} zkLTC` : "None"], ["Network", onchain ? "LitVM (on-chain)" : "Demo"], ["Fee", "1% per trade"]].map(([k, v]) => (
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
            {logo ? <img src={logo} alt="" className="size-12 rounded-full object-cover" /> : <TokenLogo symbol={f.symbol || "??"} size={48} />}
            <div><div className="font-semibold">{f.name || "Token name"}</div><div className="text-xs text-muted-foreground">${f.symbol || "SYMBOL"}</div></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{f.description || "Your description appears here."}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-surface/60 p-2">Supply<div className="font-mono">1B</div></div>
            <div className="rounded-lg bg-surface/60 p-2">Start price<div className="font-mono">{fmtUsd(spotPrice(initialReserves()) * CURVE.baseUsd)}</div></div>
          </div>
        </div>
      </aside>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Deploy {f.symbol}?</AlertDialogTitle>
            <AlertDialogDescription>{onchain ? `Your wallet will ask you to confirm the launch${devBuy ? ` and a ${devBuy} zkLTC dev buy` : ""} on LitVM.` : "Demo launch — no real funds are used."}</AlertDialogDescription>
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
