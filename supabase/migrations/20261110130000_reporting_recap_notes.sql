-- POURQUOI : le récap mensuel de l'expert-comptable est calculé, donc exact ; mais un mois a parfois
-- besoin d'une précision écrite à la main (ex. novembre 2026 : « avant le 9, Shopify ne calculait pas la
-- TVA »). Une note par enseigne et par mois, ajoutée au texte de l'e-mail sous son introduction.
-- Lue et écrite par l'Edge Function reporting-recap seule, qui contrôle le membre et le propriétaire.
create table public.reporting_recap_notes (
  entity_actor_id uuid not null references public.reporting_entreprises(entity_actor_id) on delete restrict,
  mois date not null check (extract(day from mois) = 1), -- le premier du mois
  note text not null check (length(note) between 1 and 2000),
  modifiee_par uuid references public.users(actor_id) on delete set null,
  modifiee_le timestamptz not null default now(),
  primary key (entity_actor_id, mois)
);

revoke all on public.reporting_recap_notes from anon, authenticated;
alter table public.reporting_recap_notes enable row level security;
