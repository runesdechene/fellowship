-- POURQUOI — la pastille de « Ma communauté » compte les festivals ajoutés par les autres depuis la
-- dernière ouverture de la page, comme en V1 (Uriel, 05/11/2026 : « elle existait en V1 »). La V1
-- gardait l'instant dans le navigateur ; ici il vit sur la personne, comme notifications_seen_at :
-- ouvrir la page sur le téléphone éteint aussi la pastille sur l'ordinateur.
-- `now()` par défaut : les comptes existants ne voient pas d'un coup un an de festivals comptés.
-- Additif : la ligne de chacun se met à jour par users_update_self, déjà en place.

alter table public.users
  add column community_seen_at timestamptz not null default now();
