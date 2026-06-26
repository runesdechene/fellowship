-- Empêcher qu'un acteur se suive lui-même (self-follow).
-- Origine : une ligne self-follow s'est glissée via un chemin UI sans garde
-- (toggleFollow / suggestions), produisant des notifs « X suit désormais X »
-- et un item « X suit  » vide dans l'activité réseau de la sidebar.

-- 1) Nettoyer les lignes fautives existantes.
DELETE FROM public.follows WHERE follower_actor = following_actor;

-- 2) Invariant : plus jamais de self-follow, quel que soit le chemin d'insertion.
ALTER TABLE public.follows
  ADD CONSTRAINT follows_no_self_follow CHECK (follower_actor <> following_actor);
