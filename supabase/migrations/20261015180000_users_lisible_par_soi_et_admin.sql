-- POURQUOI : `users_select_all` (USING true, sans rôle) laissait lire toute la table `users` —
-- e-mails, codes postaux, sexe, rôle — à n'importe qui, même sans compte, avec la clé publique.
-- Vérifié en prod le 15/10/2026. Désormais : chacun lit sa propre ligne, un admin lit tout
-- (l'administration en a besoin), un visiteur ne lit rien.
--
-- Ce qui reste public passe par la vue `actor_public` (nom et avatar, sans e-mail), qui tourne
-- avec les droits de son propriétaire. Le code qui lisait les lignes des autres a été déployé
-- avant (V1 0.7.400, V2 2.45.4), conformément à `.claude/rules/supabase.md`.
--
-- `auth_id = auth.uid()` reste accepté : les policies de `content_reports` cherchent l'appelant
-- par cette colonne. `is_admin()` est SECURITY DEFINER : pas de récursion sur `users`.

drop policy users_select_all on public.users;

create policy users_select_self_or_admin on public.users
  for select to authenticated
  using (
    actor_id = (select auth.uid())
    or auth_id = (select auth.uid())
    or (select public.is_admin())
  );
