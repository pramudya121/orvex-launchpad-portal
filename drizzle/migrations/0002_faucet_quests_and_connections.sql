CREATE TABLE public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.faucet_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  kind text NOT NULL CHECK (kind IN ('follow', 'like', 'retweet', 'visit')),
  target text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faucet_quests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faucet_quests TO service_role;
ALTER TABLE public.faucet_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quests are publicly readable" ON public.faucet_quests FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.faucet_quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet text NOT NULL,
  quest_id uuid NOT NULL REFERENCES public.faucet_quests(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wallet, quest_id)
);
GRANT SELECT ON public.faucet_quest_completions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faucet_quest_completions TO service_role;
ALTER TABLE public.faucet_quest_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions are publicly readable" ON public.faucet_quest_completions FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.faucet_quests (title, description, kind, target, position) VALUES
  ('Follow @litecoin on X', 'Follow the official Litecoin account on X.', 'follow', 'litecoin', 0);