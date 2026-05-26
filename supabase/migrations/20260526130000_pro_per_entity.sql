-- Pro par entité : le forfait appartient à la structure, plus à la personne.
ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS plan public.user_plan NOT NULL DEFAULT 'free';

-- Backfill : une entité dont le·la propriétaire (owner) est actuellement Pro devient Pro.
UPDATE public.entities e SET plan = 'pro'
WHERE e.actor_id IN (
  SELECT m.entity_actor_id FROM public.memberships m
  JOIN public.users u ON u.actor_id = m.user_actor_id
  WHERE u.plan = 'pro' AND m.role = 'owner'
);

-- Le plan personne disparaît (le code ne le lit plus à ce stade).
ALTER TABLE public.users DROP COLUMN IF EXISTS plan;
