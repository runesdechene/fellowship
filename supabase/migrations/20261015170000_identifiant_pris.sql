-- POURQUOI : la table `users` (e-mails compris) est lisible par tous, même sans compte. Pour la
-- fermer à « sa propre ligne », l'inscription V1 ne peut plus vérifier qu'un identifiant est libre
-- en lisant les lignes des autres. Cette fonction répond oui ou non, sans rien exposer.
-- Additive : sans effet sur le code déployé. La fermeture de `users` suit dans une autre migration,
-- appliquée après le déploiement du code qui l'appelle.

create or replace function public.identifiant_pris(p_handle text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from users where handle = p_handle);
$$;

revoke execute on function public.identifiant_pris(text) from public, anon;
grant execute on function public.identifiant_pris(text) to authenticated;
