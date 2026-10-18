import { Link, useRouter } from "@tanstack/react-router";
import { AlertCircle, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketError() {
  const router = useRouter();
  return <div role="alert" className="py-20 text-center"><AlertCircle className="mx-auto size-8 text-danger" /><h1 className="mt-4 text-xl font-semibold">Market unavailable</h1><p className="mt-2 text-sm text-muted-foreground">The network could not load the latest data.</p><Button className="mt-5" onClick={() => router.invalidate()}>Try again</Button></div>;
}
export function MarketNotFound() {
  return <div className="py-20 text-center"><SearchX className="mx-auto size-8 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Token not found</h1><Button asChild className="mt-5"><Link to="/explore">Explore tokens</Link></Button></div>;
}