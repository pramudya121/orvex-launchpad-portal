ALTER TABLE public.tokens ADD COLUMN IF NOT EXISTS fee_bps integer NOT NULL DEFAULT 100;
ALTER TABLE public.tokens ADD COLUMN IF NOT EXISTS max_buy numeric;