-- POURQUOI : la facturation d'une enseigne (Stripe, SIREN, raison sociale) se lit aujourd'hui sur
-- `entities` par n'importe quel compte connecté (lot 1b). Pour la fermer, les apps doivent d'abord
-- cesser de lire `entities(*)` : elles chargent leurs propres enseignes par cette fonction, qui
-- rend les lignes entières — facturation comprise — des seules enseignes dont on est membre,
-- dans l'ordre d'adhésion (l'enseigne par défaut est la première). Le retrait des colonnes de
-- facturation à `authenticated` suit, une fois les deux apps déployées.

create function public.mes_enseignes()
returns setof public.entities
language sql stable security definer set search_path = public
as $$
  select e.*
  from memberships m
  join entities e on e.actor_id = m.entity_actor_id
  where m.user_actor_id = auth.uid()
  order by m.created_at, e.actor_id;
$$;

revoke execute on function public.mes_enseignes() from public, anon;
grant execute on function public.mes_enseignes() to authenticated;
