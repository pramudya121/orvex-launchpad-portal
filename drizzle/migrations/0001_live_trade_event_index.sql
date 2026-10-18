ALTER TABLE public.token_trades ADD COLUMN IF NOT EXISTS log_index integer NOT NULL DEFAULT 0;
DROP INDEX IF EXISTS public.token_trades_tx_hash_key;
CREATE UNIQUE INDEX IF NOT EXISTS token_trades_tx_event_key ON public.token_trades (tx_hash, log_index);
CREATE INDEX IF NOT EXISTS token_trades_tx_hash_idx ON public.token_trades (tx_hash);
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tokens') THEN
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'token_trades') THEN
ALTER PUBLICATION supabase_realtime ADD TABLE public.token_trades;
END IF;
END $$;