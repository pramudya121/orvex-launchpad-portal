CREATE TABLE public.tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL UNIQUE,
  name text NOT NULL,
  symbol text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  logo_url text,
  creator text NOT NULL,
  twitter text, telegram text, website text,
  virtual_base numeric NOT NULL DEFAULT 30,
  virtual_token numeric NOT NULL DEFAULT 1073000000,
  real_base numeric NOT NULL DEFAULT 0,
  tokens_sold numeric NOT NULL DEFAULT 0,
  graduated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tokens TO anon, authenticated;
GRANT ALL ON public.tokens TO service_role;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tokens are public" ON public.tokens FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.token_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  side text NOT NULL,
  base_amount numeric NOT NULL,
  token_amount numeric NOT NULL,
  price numeric NOT NULL,
  trader text NOT NULL,
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX token_trades_token_time ON public.token_trades(token_id, created_at);
CREATE INDEX token_trades_trader ON public.token_trades(trader);
GRANT SELECT ON public.token_trades TO anon, authenticated;
GRANT ALL ON public.token_trades TO service_role;
ALTER TABLE public.token_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trades are public" ON public.token_trades FOR SELECT TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.token_trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;

INSERT INTO public.tokens (address, name, symbol, description, creator, virtual_token, virtual_base, real_base, tokens_sold, created_at)
SELECT addr, n, s, d, '0x9f3a1c2b4d5e6f708192a3b4c5d6e7f8091a2b3c',
  1073000000 - sold, 30.0 * 1073000000 / (1073000000 - sold), 30.0 * 1073000000 / (1073000000 - sold) - 30, sold, now() - (h || ' hours')::interval
FROM (VALUES
 ('0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c01','Silver Doge','SDOGE','The shiniest doge on LitVM.',420000000,30),
 ('0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c02','Lite Pepe','LPEPE','Pepe, but faster and lighter.',150000000,12),
 ('0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c03','Orvex Cat','OCAT','Official mascot energy of Orvex.',610000000,70),
 ('0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c04','Moon Lite','MLITE','One-way ticket to the moon.',60000000,3),
 ('0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c05','Charlie Coin','CHARLIE','Named after the legend himself.',280000000,48),
 ('0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c06','Hash Hamster','HAMS','Runs on scrypt wheels.',20000000,1)
) AS v(addr,n,s,d,sold,h);