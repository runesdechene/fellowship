-- POURQUOI — la cloche affiche le nombre de notifications arrivées depuis sa dernière ouverture, et ce
-- chiffre s'efface dès qu'on l'ouvre (Uriel, 22/10/2026). Le point « du non-lu » restait allumé tant
-- qu'une seule ligne n'avait pas été cliquée. L'instant de la dernière ouverture vit sur la personne,
-- pas sur l'appareil : ouvrir la cloche sur le téléphone l'éteint aussi sur l'ordinateur.
-- `now()` par défaut : les comptes existants ne voient pas d'un coup tout leur historique compté.
-- Additif : la ligne de chacun se met à jour par users_update_self, déjà en place.

alter table public.users
  add column notifications_seen_at timestamptz not null default now();
