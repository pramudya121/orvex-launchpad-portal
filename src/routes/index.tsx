import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, Rocket, Activity, Coins, TrendingUp, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtUsd } from "@/lib/tokens";
import { tokensQuery } from "@/lib/queries";
import { TokenCard, TokenCardSkeleton } from "@/components/orvex/TokenCard";
import { TokenLogo } from "@/components/orvex/TokenLogo";
import { CurveProgress } from "@/components/orvex/CurveProgress";
import { MarketStatus } from "@/components/orvex/MarketStatus";
import { MarketError, MarketNotFound } from "@/components/orvex/RouteFeedback";

export const Route = createFileRoute("/")({
  head: () => ({meta:[{title:"ORVEX — Live Launchpad Markets"},{name:"description",content:"Discover launches, track bonding curves and trade tokens on LitVM LiteForge."},{property:"og:title",content:"ORVEX — Live Launchpad Markets"},{property:"og:description",content:"Live token markets and bonding curve launches on LitVM."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),
  loader: ({context}) => context.queryClient.ensureQueryData(tokensQuery()),
  errorComponent: MarketError, notFoundComponent: MarketNotFound,
  pendingComponent: () => <div className="token-grid">{Array.from({length:6},(_,i)=><TokenCardSkeleton key={i}/>)}</div>, component: Home,
});
function Home(){
  const {data:tokens}=useSuspenseQuery(tokensQuery());
  const close=[...tokens].filter((t)=>!t.graduated).sort((a,b)=>b.progress-a.progress).slice(0,5);
  const stats=[{label:'Tokens launched',value:tokens.length,icon:Coins},{label:'24h volume',value:fmtUsd(tokens.reduce((s,t)=>s+t.volume24hUsd,0)),icon:Activity},{label:'Curve funding',value:`${tokens.reduce((s,t)=>s+t.realBase,0).toFixed(2)} zkLTC`,icon:TrendingUp},{label:'Graduated',value:tokens.filter(t=>t.graduated).length,icon:Flag}];
  return <div className="space-y-8">
    <section className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-6"><div className="min-w-0"><div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-primary">LITVM LITEFORGE · TESTNET</div><h1 className="text-3xl font-extrabold sm:text-4xl">ORVEX <span className="font-normal text-muted-foreground">Markets</span></h1><p className="mt-2 text-sm text-muted-foreground">New launches. Open markets. On-chain momentum.</p></div><div className="flex flex-col items-end gap-3"><MarketStatus /><Button asChild><Link to="/create"><Rocket />Launch token</Link></Button></div></section>
    <section className="grid grid-cols-2 gap-y-5 border-b border-border pb-6 lg:grid-cols-4">{stats.map(s=><div key={s.label} className="min-w-0 border-l border-border px-4 first:border-l-0 first:pl-0"><div className="flex items-center gap-2 text-xs text-muted-foreground"><s.icon className="size-3.5"/>{s.label}</div><div className="mt-2 break-words font-mono text-xl font-semibold">{s.value}</div></div>)}</section>
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]"><section className="min-w-0"><Heading title="Latest launches" to="/explore"/>{tokens.length ? <div className="token-grid">{tokens.slice(0,8).map(t=><TokenCard key={t.id} t={t}/>)}</div> : <div className="border-y border-border py-16 text-center"><Coins className="mx-auto size-10 text-primary"/><h2 className="mt-4 text-lg font-semibold">The next launch starts here</h2><p className="mt-2 text-sm text-muted-foreground">No tokens have been launched through the connected factory yet.</p><Button asChild className="mt-5"><Link to="/create"><Rocket/>Create token</Link></Button></div>}</section><aside className="min-w-0"><Heading title="Near graduation" to="/trending"/><div className="divide-y divide-border border-y border-border">{close.length ? close.map((t,i)=><Link key={t.id} to="/token/$symbol" params={{symbol:t.symbol}} className="block py-4"><div className="flex min-w-0 items-center gap-2"><span className="font-mono text-xs text-muted-foreground">0{i+1}</span><TokenLogo symbol={t.symbol} url={t.logoUrl} size={30}/><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{t.name}</div><div className="font-mono text-[10px] text-muted-foreground">{fmtUsd(t.marketCapUsd)}</div></div></div><CurveProgress value={t.progress} className="mt-2"/></Link>) : <p className="py-8 text-sm text-muted-foreground">No active bonding curves.</p>}</div><div className="mt-6 border-l-2 border-primary pl-4"><div className="text-xs font-semibold">LiteForge testnet</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Test assets have no guaranteed monetary value. USD values use an indicative $85 zkLTC reference.</p></div></aside></div>
    <section className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-5"><div><h2 className="font-semibold">DEX markets</h2><p className="mt-1 text-xs text-muted-foreground">Swap assets and inspect live pool reserves.</p></div><Button asChild variant="outline"><Link to="/dex">Open DEX<ArrowUpRight/></Link></Button></section>
  </div>;
}
function Heading({title,to}:{title:string;to:'/explore'|'/trending'}){return <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{title}</h2><Link to={to} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">View all<ArrowUpRight className="size-3"/></Link></div>}
