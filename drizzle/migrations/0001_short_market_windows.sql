CREATE OR REPLACE FUNCTION public.token_market_short_stats(token_ids uuid[])
 RETURNS TABLE(token_id uuid, trades_1h bigint, volume_1h numeric, first_price_1h numeric, trades_6h bigint, volume_6h numeric, first_price_6h numeric)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  WITH s AS (SELECT t.token_id AS tid, t.id AS trade_id, t.created_at, t.base_amount, t.price, t.block_number, t.log_index
    FROM public.token_trades t WHERE t.token_id = ANY(token_ids) AND t.created_at >= now() - interval '6 hours')
  SELECT req.rid,
    count(s.trade_id) FILTER (WHERE s.created_at >= now() - interval '1 hour'),
    coalesce(sum(s.base_amount) FILTER (WHERE s.created_at >= now() - interval '1 hour'), 0),
    (array_agg(s.price ORDER BY s.created_at, s.block_number NULLS LAST, s.log_index) FILTER (WHERE s.created_at >= now() - interval '1 hour'))[1],
    count(s.trade_id), coalesce(sum(s.base_amount), 0),
    (array_agg(s.price ORDER BY s.created_at, s.block_number NULLS LAST, s.log_index) FILTER (WHERE s.trade_id IS NOT NULL))[1]
  FROM (SELECT DISTINCT unnest(token_ids) AS rid) req LEFT JOIN s ON s.tid = req.rid GROUP BY req.rid;
$$;
GRANT EXECUTE ON FUNCTION public.token_market_short_stats(uuid[]) TO anon, authenticated, service_role;