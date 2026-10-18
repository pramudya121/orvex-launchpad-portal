ALTER TABLE public.tokens ADD COLUMN IF NOT EXISTS launch_block bigint;
ALTER TABLE public.token_trades ADD COLUMN IF NOT EXISTS block_number bigint;
ALTER TABLE public.token_trades ADD COLUMN IF NOT EXISTS block_hash text;
CREATE INDEX IF NOT EXISTS token_trades_token_block_idx ON public.token_trades (token_id, block_number, log_index);
CREATE INDEX IF NOT EXISTS tokens_onchain_created_idx ON public.tokens (created_at DESC) WHERE onchain = true;
COMMENT ON COLUMN public.tokens.launch_block IS 'Confirmed deployment block; first trade scan starts here instead of genesis.';
COMMENT ON COLUMN public.token_trades.block_number IS 'Canonical chain block containing the indexed trade event.';
COMMENT ON COLUMN public.token_trades.block_hash IS 'Block identity retained for chain event verification.';