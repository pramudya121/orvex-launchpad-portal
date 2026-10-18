CREATE INDEX IF NOT EXISTS token_trades_trader_time_idx ON public.token_trades (trader, created_at DESC);
CREATE INDEX IF NOT EXISTS tokens_creator_idx ON public.tokens (creator);
CREATE INDEX IF NOT EXISTS tokens_onchain_symbol_pattern_idx ON public.tokens (symbol text_pattern_ops) WHERE onchain = true;
CREATE OR REPLACE FUNCTION public.token_market_all_stats(token_ids uuid[])
RETURNS TABLE(token_id uuid, trades_all bigint, volume_all numeric, first_price_all numeric)
LANGUAGE sql STABLE SET search_path = public AS $function$
 SELECT requested.token_id, totals.trades, totals.volume, first_trade.price
 FROM (SELECT DISTINCT unnest(token_ids) AS token_id) requested
 CROSS JOIN LATERAL (
   SELECT count(*) AS trades, coalesce(sum(t.base_amount), 0) AS volume
   FROM public.token_trades t WHERE t.token_id = requested.token_id
 ) totals
 LEFT JOIN LATERAL (
   SELECT t.price FROM public.token_trades t WHERE t.token_id = requested.token_id
   ORDER BY t.created_at ASC, t.block_number ASC NULLS LAST, t.log_index ASC LIMIT 1
 ) first_trade ON true;
$function$;
GRANT EXECUTE ON FUNCTION public.token_market_all_stats(uuid[]) TO anon, authenticated, service_role;
COMMENT ON INDEX public.token_trades_trader_time_idx IS 'Supports bounded wallet history ordered by newest transaction.';