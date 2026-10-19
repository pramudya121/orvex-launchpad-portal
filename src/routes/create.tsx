import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { Address } from "viem";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { uploadLogo, indexTx } from "@/lib/launchpad.functions";
import { quoteBuy, type Reserves } from "@/lib/curve";
import { MarketStatus } from "@/components/orvex/MarketStatus";
import { buyOnchain, createOnchain, creationFee, walletError } from "@/lib/web3/actions";
import { CONTRACTS, explorerTx } from "@/lib/web3/chain";
import { publicClient } from "@/lib/web3/client";
import { bondingCurveAbi } from "@/lib/web3/abi";
import { useState, useId, useEffect, useRef } from "react";
import { createSubmissionLock } from "@/lib/submission-lock";
import { transactionAmount } from "@/lib/web3/trade-safety";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { useWallet } from "@/components/orvex/wallet";
import { cn } from "@/lib/utils";
import { tokensQuery } from "@/lib/queries";
import { supplyAllocation } from "@/lib/supply";
import { validateLogoSize } from "@/lib/logo-upload";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Create a Token — ORVEX" },
      {
        name: "description",
        content: "Launch your own ERC-20 memecoin on LitVM in four simple steps.",
      },
      { property: "og:title", content: "Create a Token — ORVEX" },
      {
        property: "og:description",
        content: "Launch your own memecoin on LitVM in four simple steps.",
      },
    ],
  }),
  component: Create,
});

const STEPS = ["Basic info", "Launch", "Socials", "Preview"];

const readB64 = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
type LogoType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

function Create() {
  const { address, open } = useWallet();
  const navigate = useNavigate();
  const doUpload = useServerFn(uploadLogo);
  const doIndex = useServerFn(indexTx);
  const submissionLock = useRef(createSubmissionLock());
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    name: "",
    symbol: "",
    description: "",
    devBuy: "0",
    twitter: "",
    telegram: "",
    website: "",
  });
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  useEffect(() => () => { if (logo) URL.revokeObjectURL(logo); }, [logo]);
  const [confirm, setConfirm] = useState(false);
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [pendingMeta, setPendingMeta] = useState<Record<string, string | undefined> | undefined>();
  const [receiptStatus, setReceiptStatus] = useState<"pending" | "success" | "reverted" | null>(null);
  useEffect(() => {
    if (!pendingHash) { setReceiptStatus(null); return; }
    let cancelled = false;
    const check = async () => {
      try {
        const receipt = await publicClient().getTransactionReceipt({ hash: pendingHash as `0x${string}` });
        if (!cancelled) setReceiptStatus(receipt.status);
      } catch {
        if (!cancelled) setReceiptStatus("pending");
      }
    };
    void check();
    const timer = setInterval(() => { void check(); }, 10_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [pendingHash]);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("orvex-pending-launch");
      if (!saved) return;
      const value = JSON.parse(saved);
      if (/^0x[0-9a-fA-F]{64}$/.test(value.hash)) {
        setPendingHash(value.hash);
        setPendingMeta(value.meta);
        if (value.form && typeof value.form.name === "string" && typeof value.form.symbol === "string") {
          setF((old) => ({ ...old, name: value.form.name, symbol: value.form.symbol }));
        }
        setStep(3);
      }
    } catch {
      sessionStorage.removeItem("orvex-pending-launch");
    }
  }, []);
  const clearPending = () => {
    setPendingHash(null);
    setPendingMeta(undefined);
    sessionStorage.removeItem("orvex-pending-launch");
  };
  const [deploy, setDeploy] = useState<{ p: number; label: string } | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const {
    data: fee,
    isError: feeError,
    refetch: retryFee,
  } = useQuery({
    queryKey: ["creationFee"],
    queryFn: async () => Number(formatEther(await creationFee())),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: markets = [] } = useQuery(tokensQuery());
  const referenceCurve = markets.find((t) => t.curveAddress)?.curveAddress as Address | undefined;
  const { data: allocation, isError: supplyError } = useQuery({
    queryKey: ["launchSupply", referenceCurve],
    enabled: !!referenceCurve,
    staleTime: 300_000,
    queryFn: async () => {
      if (!referenceCurve) throw new Error("No deployed curve available");
      const pc = publicClient();
      const [total, sale, lp] = await Promise.all([
        pc.readContract({ address: referenceCurve, abi: bondingCurveAbi, functionName: "TOTAL_SUPPLY" }),
        pc.readContract({ address: referenceCurve, abi: bondingCurveAbi, functionName: "TOKENS_FOR_SALE" }),
        pc.readContract({ address: referenceCurve, abi: bondingCurveAbi, functionName: "TOKENS_FOR_LP" }),
      ]);
      return supplyAllocation(total, sale, lp);
    },
  });

  const devBuy = Number(f.devBuy);
  const devBuyValid = Number.isFinite(devBuy) && devBuy >= 0;
  const valid =
    (step !== 0 || (f.name.trim() && /^[A-Z0-9]{1,10}$/.test(f.symbol.trim()))) &&
    (step !== 1 || devBuyValid);

  const run = async () => {
    setConfirm(false);
    if (!address || fee === undefined || !devBuyValid || deploy || pendingHash) return;
    if (!submissionLock.current.acquire()) return;
    const symbol = f.symbol.trim().toUpperCase();
    try {
      const pc = publicClient();
      const [freshFee, funds] = await Promise.all([creationFee(), pc.getBalance({ address })]);
      const initialBuy = devBuy > 0 ? transactionAmount(f.devBuy) : 0n;
      if (funds <= freshFee + initialBuy) throw new Error("Not enough zkLTC for the launch, initial buy and network fees");
      if (logoFile) validateLogoSize(logoFile.size, logoFile.type);
      let logoUrl: string | undefined;
      if (logoFile) {
        setDeploy({ p: 10, label: "Uploading logo" });
        const up = await doUpload({
          data: {
            symbol,
            logoBase64: await readB64(logoFile),
            logoType: logoFile.type as LogoType,
          },
        });
        if ("error" in up) {
          toast.error(up.error);
          return;
        }
        logoUrl = up.url ?? undefined;
      }
      const meta = {
        description: f.description,
        twitter: f.twitter || undefined,
        telegram: f.telegram || undefined,
        website: f.website || undefined,
        logo: logoUrl,
      };
      setDeploy({ p: 35, label: "Confirm the launch in your wallet" });
      const { hash, curve } = await createOnchain(
        address,
        { name: f.name.trim(), symbol },
        (hash) => {
          setPendingHash(hash);
          setPendingMeta(meta);
          sessionStorage.setItem("orvex-pending-launch", JSON.stringify({ hash, meta, form: { name: f.name, symbol } }));
        },
      );
      setDeploy({ p: 65, label: "Indexing your token" });
      setPendingHash(hash);
      const r = await doIndex({
        data: {
          txHash: hash,
          meta,
        },
      });
      if ("error" in r) {
        toast.warning("Launch confirmed; market indexing needs retry", { description: r.error });
        return;
      }
      clearPending();
      toast.success(`${symbol} is live on LitVM`, {
        action: {
          label: "View tx",
          onClick: () => window.open(explorerTx(hash), "_blank", "noopener"),
        },
      });

      if (devBuy > 0) {
        setDeploy({ p: 80, label: "Confirm your initial buy (transaction 2 of 2)" });
        try {
          const pc = publicClient();
          const [reserves, sale, total, protocolFee, creatorFee] = await Promise.all([
            pc.readContract({ address: curve, abi: bondingCurveAbi, functionName: "getReserves" }),
            pc.readContract({
              address: curve,
              abi: bondingCurveAbi,
              functionName: "TOKENS_FOR_SALE",
            }),
            pc.readContract({ address: curve, abi: bondingCurveAbi, functionName: "TOTAL_SUPPLY" }),
            pc.readContract({
              address: curve,
              abi: bondingCurveAbi,
              functionName: "protocolFeeBps",
            }),
            pc.readContract({
              address: curve,
              abi: bondingCurveAbi,
              functionName: "creatorFeeBps",
            }),
          ]);
          const [vToken, vEth, rToken, rEth] = reserves;
          const r: Reserves = {
            virtualToken: Number(formatEther(vToken)),
            virtualBase: Number(formatEther(vEth)),
            realBase: Number(formatEther(rEth)),
            tokensSold: Number(formatEther(sale - rToken)),
            saleSupply: Number(formatEther(sale)),
            totalSupply: Number(formatEther(total)),
            feeBps: Number(protocolFee + creatorFee),
          };
          const bh = await buyOnchain(address, curve, f.devBuy, quoteBuy(r, devBuy).tokenAmount);
          await doIndex({ data: { txHash: bh } });
          toast.success(`Initial buy of ${devBuy} zkLTC done`);
        } catch (e) {
          toast.error(`Initial buy failed: ${walletError(e)}`);
        }
      }
      setDeploy({ p: 100, label: "Done" });
      navigate({ to: "/token/$symbol", params: { symbol } });
    } catch (e) {
      toast.error(walletError(e));
    } finally {
      submissionLock.current.release();
      setDeploy(null);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-widest text-primary">
              Launch studio · Testnet
            </div>
            <h1 className="text-3xl font-bold">Create token</h1>
          </div>
          <MarketStatus />
        </div>
        <ol className="mt-6 flex gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <div
                className={cn(
                  "h-1 rounded-full transition",
                  i <= step ? "bg-gradient-primary" : "bg-surface",
                )}
              />
              <div
                className={cn(
                  "mt-2 text-xs",
                  i === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {i + 1}. {s}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 space-y-5 border-t border-border py-6">
          {step === 0 && (
            <>
              <Field label="Logo">
                <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-border p-4 transition hover:border-primary-glow/50">
                  {logo ? (
                    <img src={logo} alt="" className="size-12 rounded-full object-cover" />
                  ) : (
                    <div className="grid size-12 place-items-center rounded-full bg-surface">
                      <Upload className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm text-muted-foreground">PNG or JPG, up to 2MB</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try { validateLogoSize(file.size, file.type); } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Invalid logo");
                          e.target.value = "";
                          return;
                        }
                        if (logo) URL.revokeObjectURL(logo);
                        setLogo(URL.createObjectURL(file));
                        setLogoFile(file);
                      }
                    }}
                  />
                </label>
              </Field>
              <Field label="Token name">
                <Input
                  value={f.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="Silver Doge"
                  maxLength={32}
                />
              </Field>
              <Field label="Symbol">
                <Input
                  value={f.symbol}
                  onChange={(e) => set("symbol")(e.target.value.toUpperCase())}
                  placeholder="SDOGE"
                  maxLength={10}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={f.description}
                  onChange={(e) => set("description")(e.target.value)}
                  placeholder="What makes it special?"
                  maxLength={280}
                />
              </Field>

            </>
          )}
          {step === 1 && (
            <div className="space-y-5">
              {feeError && (
                <div role="alert" className="text-sm text-danger">
                  Launch fee unavailable.{" "}
                  <Button variant="link" onClick={() => retryFee()}>
                    Retry
                  </Button>
                </div>
              )}
              <dl className="grid gap-4 border-y border-border py-4 sm:grid-cols-3" aria-label="Token supply allocation">
                {[
                  ["Total supply", allocation ? Number(formatEther(allocation.total)).toLocaleString("en-US") : "—"],
                  ["Bonding curve sale", allocation ? `${allocation.salePercent}%` : "—"],
                  ["Graduation liquidity", allocation ? `${allocation.lpPercent}%` : "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-2 font-mono text-lg font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              {supplyError && <p role="alert" className="text-xs text-danger">Contract supply unavailable.</p>}
              <p className="text-xs text-muted-foreground">Graduation occurs at 100% of the curve sale allocation; the liquidity allocation moves to the DEX.</p>
              <Field label="Initial buy (zkLTC, optional)">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={f.devBuy}
                  onChange={(e) => set("devBuy")(e.target.value)}
                />
              </Field>
              {!devBuyValid && (
                <p role="alert" className="text-xs text-danger">
                  Enter a valid non-negative amount.
                </p>
              )}
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Launch fee", fee === undefined ? "…" : `${fee} zkLTC`],
                  ["Factory", `${CONTRACTS.factory.slice(0, 8)}…`],
                  ["Fees go to", "FeeManager (treasury · team · marketing)"],
                  ["After the curve", "Liquidity moves to the ORVEX DEX"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-surface/60 p-3">
                    <div className="text-xs text-muted-foreground">{k}</div>
                    <div className="mt-0.5 font-mono text-xs">{v}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Every token launches on its own fair bonding-curve contract. When the curve sells
                out, the token graduates and liquidity moves to the DEX. With an initial buy, your
                wallet asks for two confirmations in a row: the first deploys the token, the second
                makes your opening buy at the best price.
              </p>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="X / Twitter">
                <Input
                  value={f.twitter}
                  onChange={(e) => set("twitter")(e.target.value)}
                  placeholder="@handle"
                  maxLength={100}
                />
              </Field>
              <Field label="Telegram">
                <Input
                  value={f.telegram}
                  onChange={(e) => set("telegram")(e.target.value)}
                  placeholder="t.me/…"
                  maxLength={100}
                />
              </Field>
              <Field label="Website">
                <Input
                  value={f.website}
                  onChange={(e) => set("website")(e.target.value)}
                  placeholder="https://"
                  maxLength={200}
                />
              </Field>
            </div>
          )}
          {step === 3 && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Name", f.name],
                ["Symbol", f.symbol],
                ["Initial buy", devBuy ? `${devBuy} zkLTC (2nd confirmation)` : "None"],
                ["Network", "LitVM LiteForge"],
                ["Launch fee", fee === undefined ? "…" : `${fee} zkLTC`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface/60 p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          )}

          {pendingHash && !deploy && (
            <div role="status" className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm">
                {receiptStatus === "reverted" ? "Launch transaction reverted. No token was deployed." : receiptStatus === "success" ? "Launch confirmed. Retry adding your token to the market; do not deploy again." : "Launch submitted, waiting for network confirmation. Do not deploy again."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={receiptStatus !== "success"}
                  onClick={async () => {
                    if (!submissionLock.current.acquire()) return;
                    setDeploy({ p: 65, label: "Retrying market indexing" });
                    try {
                      const result = await doIndex({
                        data: { txHash: pendingHash, meta: pendingMeta },
                      });
                      if ("error" in result) toast.error(result.error);
                      else {
                        clearPending();
                        navigate({ to: "/token/$symbol", params: { symbol: result.symbol } });
                      }
                    } catch (e) {
                      toast.error(walletError(e));
                    } finally {
                      submissionLock.current.release();
                      setDeploy(null);
                    }
                  }}
                >
                  Retry indexing
                </Button>
                {receiptStatus === "reverted" && <Button variant="outline" onClick={clearPending}>Dismiss failed launch</Button>}
                <Button variant="link" asChild>
                  <a href={explorerTx(pendingHash)} target="_blank" rel="noreferrer">
                    View transaction
                  </a>
                </Button>
              </div>
            </div>
          )}
          {deploy && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> {deploy.label}…
              </div>
              <Progress value={deploy.p} />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              disabled={step === 0 || !!deploy}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button
                disabled={!valid}
                onClick={() => setStep(step + 1)}
                className="bg-gradient-primary"
              >
                Continue
              </Button>
            ) : (
              <Button
                disabled={!!deploy || !!pendingHash || fee === undefined || !devBuyValid}
                onClick={() => (address ? setConfirm(true) : open())}
                className="bg-gradient-primary shadow-glow"
              >
                {address ? "Deploy token" : "Connect wallet to deploy"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Live preview</div>
        <div className="glass mt-3 rounded-lg p-5">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="" className="size-12 rounded-full object-cover" />
            ) : (
              <TokenLogo symbol={f.symbol || "??"} size={48} />
            )}
            <div className="min-w-0">
              <div className="break-words font-semibold">{f.name || "Token name"}</div>
              <div className="text-xs text-muted-foreground">${f.symbol || "SYMBOL"}</div>
            </div>
          </div>
          <p className="mt-4 break-words text-sm text-muted-foreground">
            {f.description || "Your description appears here."}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-surface/60 p-2">
              Network<div className="font-mono">LiteForge</div>
            </div>
            <div className="rounded-lg bg-surface/60 p-2">
              Launch fee<div className="font-mono">{fee ?? "…"} zkLTC</div>
            </div>
          </div>
        </div>
      </aside>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Deploy {f.symbol}?</AlertDialogTitle>
            <AlertDialogDescription>{`Your wallet will ask you to confirm the launch (${fee ?? "…"} zkLTC fee)${devBuy ? `, then a separate ${devBuy} zkLTC dev buy` : ""}.`}</AlertDialogDescription>
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
  const id = useId();
  return (
    <div className="space-y-2">
      <Label id={id}>{label}</Label>
      <div aria-labelledby={id}>{children}</div>
    </div>
  );
}
