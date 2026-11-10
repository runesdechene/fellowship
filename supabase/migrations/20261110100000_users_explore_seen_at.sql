-- POURQUOI — les pastilles de la navigation se partagent les nouvelles (Uriel, 10/11/2026) :
-- Explorer annonce les festivals à découvrir, Communauté l'actu des amis, la cloche ce qui nous
-- concerne. Les nouveaux festivals quittent donc la pastille de Communauté pour celle d'Explorer,
-- qui s'éteint quand on ouvre Explorer : il lui faut son propre instant, comme community_seen_at.
-- `now()` par défaut : les comptes existants ne voient pas d'un coup un an de festivals comptés.
-- Additif : la ligne de chacun se met à jour par users_update_self, déjà en place.

alter table public.users
  add column explore_seen_at timestamptz not null default now();
