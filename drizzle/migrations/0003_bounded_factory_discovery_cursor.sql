ALTER TABLE public.chain_sync ADD COLUMN IF NOT EXISTS factory_cursor bigint NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.chain_sync.factory_cursor IS 'Durable rotating factory-entry discovery cursor; independent from trade block checkpoints.';
CREATE INDEX IF NOT EXISTS tokens_sync_queue_idx ON public.tokens (synced_block ASC, id ASC) WHERE onchain = true AND curve_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS tokens_public_cursor_idx ON public.tokens (created_at DESC, id DESC) WHERE onchain = true;