-- POURQUOI : depuis `20261015180000`, toute mise à jour de `users` échoue en « infinite recursion
-- detected in policy for relation "users" » — un admin qui change un rôle, mais aussi chacun qui
-- modifie son propre profil (les politiques UPDATE s'additionnent, `admin_update_users` est donc
-- évaluée à chaque fois). Cette politique relisait `users` dans une sous-requête ; tant que la
-- lecture était `USING true`, Postgres laissait passer, mais la nouvelle politique SELECT contient
-- des sous-requêtes, et Postgres refuse alors d'appliquer la RLS de `users` à l'intérieur d'elle-même.
-- `is_admin()` (SECURITY DEFINER) dit la même chose sans relire la table sous RLS.

drop policy admin_update_users on public.users;

create policy admin_update_users on public.users
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
