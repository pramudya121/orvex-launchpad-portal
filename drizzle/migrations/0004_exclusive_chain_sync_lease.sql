ALTER TABLE public.chain_sync ADD COLUMN lease_id uuid, ADD COLUMN lease_until timestamptz;
REVOKE SELECT ON public.chain_sync FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.acquire_chain_sync_lease(owner_id uuid, force_sync boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE acquired boolean := false;
BEGIN
 INSERT INTO public.chain_sync(id) VALUES ('factory') ON CONFLICT (id) DO NOTHING;
 UPDATE public.chain_sync SET lease_id = owner_id, lease_until = now() + interval '90 seconds'
 WHERE id = 'factory' AND (lease_until IS NULL OR lease_until <= now()) AND (force_sync OR updated_at <= now() - interval '30 seconds') RETURNING true INTO acquired;
 RETURN coalesce(acquired, false);
END; $$;
CREATE OR REPLACE FUNCTION public.release_chain_sync_lease(owner_id uuid, completed_block bigint DEFAULT NULL) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
 UPDATE public.chain_sync SET lease_id = NULL, lease_until = NULL, last_block = coalesce(completed_block, last_block), updated_at = CASE WHEN completed_block IS NULL THEN updated_at ELSE now() END WHERE id = 'factory' AND lease_id = owner_id;
$$;
REVOKE ALL ON FUNCTION public.acquire_chain_sync_lease(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_chain_sync_lease(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_chain_sync_lease(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_chain_sync_lease(uuid, bigint) TO service_role;
GRANT ALL ON public.chain_sync TO service_role;