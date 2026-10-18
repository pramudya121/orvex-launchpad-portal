CREATE OR REPLACE FUNCTION public.token_market_all_stats(token_ids uuid[])
RETURNS TABLE(token_id uuid, trades_all bigint, volume_all numeric, first_price_all numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
 SELECT requested.token_id, count(t.id), coalesce(sum(t.base_amount),0),
 (array_agg(t.price ORDER BY t.created_at ASC, t.block_number ASC NULLS LAST, t.log_index ASC) FILTER (WHERE t.id IS NOT NULL))[1]
 FROM unnest(token_ids) AS requested(token_id) LEFT JOIN public.token_trades t ON t.token_id=requested.token_id GROUP BY requested.token_id;
$$;
REVOKE ALL ON FUNCTION public.token_market_all_stats(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.token_market_all_stats(uuid[]) TO anon, authenticated, service_role;