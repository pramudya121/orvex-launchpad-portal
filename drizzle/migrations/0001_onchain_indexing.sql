CREATE UNIQUE INDEX IF NOT EXISTS token_trades_tx_hash_key ON public.token_trades (tx_hash);
CREATE UNIQUE INDEX IF NOT EXISTS tokens_address_lower_key ON public.tokens (lower(address));
CREATE UNIQUE INDEX IF NOT EXISTS tokens_symbol_upper_key ON public.tokens (upper(symbol));
ALTER TABLE public.tokens ADD COLUMN IF NOT EXISTS onchain boolean NOT NULL DEFAULT false;