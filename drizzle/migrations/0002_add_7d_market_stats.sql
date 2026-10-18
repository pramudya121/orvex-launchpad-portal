DROP FUNCTION IF EXISTS public.token_market_stats(uuid[]);
CREATE FUNCTION public.token_market_stats(token_ids uuid[])
RETURNS TABLE(token_id uuid, holders bigint, trades_24h bigint, volume_24h numeric, first_price_24h numeric, trades_7d bigint, volume_7d numeric, first_price_7d numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH selected AS (
    SELECT t.* FROM public.token_trades t WHERE t.token_id = ANY(token_ids)
  ), balances AS (
    SELECT s.token_id, lower(s.trader) AS wallet,
      sum(CASE WHEN s.side = 'buy' THEN s.token_amount ELSE -s.token_amount END) AS balance
    FROM selected s GROUP BY s.token_id, lower(s.trader)
  ), holder_counts AS (
    SELECT b.token_id, count(*) AS holders FROM balances b WHERE b.balance > 0.000000001 GROUP BY b.token_id
  ), recent AS (
    SELECT s.token_id, count(*) AS trades, sum(s.base_amount) AS volume,
      (array_agg(s.price ORDER BY s.created_at ASC, s.block_number ASC NULLS LAST, s.log_index ASC))[1] AS first_price
    FROM selected s WHERE s.created_at >= now() - interval '24 hours' GROUP BY s.token_id
  ), week AS (
    SELECT s.token_id, count(*) AS trades, sum(s.base_amount) AS volume,
      (array_agg(s.price ORDER BY s.created_at ASC, s.block_number ASC NULLS LAST, s.log_index ASC))[1] AS first_price
    FROM selected s WHERE s.created_at >= now() - interval '7 days' GROUP BY s.token_id
  )
  SELECT id, coalesce(h.holders, 0), coalesce(r.trades, 0), coalesce(r.volume, 0), r.first_price,
    coalesce(w.trades, 0), coalesce(w.volume, 0), w.first_price
  FROM unnest(token_ids) id
  LEFT JOIN holder_counts h ON h.token_id = id
  LEFT JOIN recent r ON r.token_id = id
  LEFT JOIN week w ON w.token_id = id;
$$;
GRANT EXECUTE ON FUNCTION public.token_market_stats(uuid[]) TO anon, authenticated, service_role;