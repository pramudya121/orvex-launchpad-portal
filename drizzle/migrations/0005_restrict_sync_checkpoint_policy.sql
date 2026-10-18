ALTER POLICY "Sync state is public" ON public.chain_sync TO service_role;
COMMENT ON TABLE public.chain_sync IS 'Private chain indexing checkpoints and expiring sync leases; service role only.';