-- POURQUOI : une vente Shopify ou SumUp peut être facturée à un pro à la main dans Pennylane. Elle
-- relève alors de la facture électronique : la laisser dans le total B2C la déclarerait deux fois.
-- Le marquage vit ici plutôt qu'en tag Shopify : SumUp n'a pas de tags, et la clé Shopify reste en
-- lecture seule. Écrit par l'Edge Function reporting-vente-pro seule, qui contrôle le propriétaire.
create table public.reporting_ventes_pro (
  entity_actor_id uuid not null references public.reporting_entreprises(entity_actor_id) on delete restrict,
  source text not null check (source in ('shopify', 'sumup')),
  reference text not null, -- le nom de la commande Shopify, le code du paiement SumUp
  marquee_par uuid references public.users(actor_id) on delete set null,
  marquee_le timestamptz not null default now(),
  primary key (entity_actor_id, source, reference)
);

revoke all on public.reporting_ventes_pro from anon, authenticated;
alter table public.reporting_ventes_pro enable row level security;
