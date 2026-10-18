import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RefreshCw, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketStatus() {
  const qc = useQueryClient();
  const fetching = useIsFetching();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
      <span className={online ? "flex items-center gap-1.5 text-success" : "text-danger"}>
        <Radio className="size-3.5" />
        {online ? "Auto-refresh" : "Offline"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Refresh market"
        title="Refresh market"
        disabled={fetching > 0}
        onClick={() => qc.invalidateQueries()}
      >
        <RefreshCw className={fetching ? "size-3.5 animate-spin" : "size-3.5"} />
      </Button>
    </div>
  );
}
