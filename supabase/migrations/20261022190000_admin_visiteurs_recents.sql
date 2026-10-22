-- POURQUOI — « Vus récemment », sur l'accueil de l'administration, montre l'enseigne avant la
-- personne : c'est elle qui intéresse (Uriel, 22/10/2026). La lecture directe de `users` ne
-- rejoignait pas les enseignes, dont les colonnes sont fermées au client (20261019130000).
-- L'enseigne d'une personne est la première par adhésion, comme dans admin_personnes : une seule
-- personne en a plusieurs aujourd'hui.

create function public.admin_visiteurs_recents(p_limite int default 6)
returns table (actor_id uuid, display_name text, avatar_url text, last_seen_at timestamptz,
  visits integer, entity_id uuid, brand_name text, entity_avatar_url text, entity_type text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select u.actor_id, u.display_name::text, u.avatar_url::text, u.last_seen_at, u.visits,
    prem.e_id, prem.e_name, prem.e_avatar, prem.e_type
  from users u
  left join lateral (
    select en.actor_id as e_id, en.brand_name::text as e_name, en.avatar_url::text as e_avatar,
      en.type::text as e_type
    from memberships m join entities en on en.actor_id = m.entity_actor_id
    where m.user_actor_id = u.actor_id
    order by m.created_at, en.actor_id
    limit 1
  ) prem on true
  where u.last_seen_at is not null
  order by u.last_seen_at desc, u.actor_id
  limit greatest(p_limite, 0);
end $$;

revoke all on function public.admin_visiteurs_recents(int) from public, anon;
grant execute on function public.admin_visiteurs_recents(int) to authenticated;
