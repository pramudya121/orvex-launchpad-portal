import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/sync-chain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const failure = await authenticateCronRequest(request);
        if (failure) return failure;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { syncChain } = await import("@/lib/chain.server");
          await syncChain(supabaseAdmin);
          return Response.json({ ok: true });
        } catch (error) {
          console.error("Scheduled chain synchronization failed", error);
          return Response.json({ error: "Synchronization unavailable" }, { status: 503 });
        }
      },
    },
  },
});