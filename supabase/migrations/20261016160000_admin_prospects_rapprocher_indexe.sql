-- POURQUOI : relecture finale du lot 3. admin_prospects_a_rapprocher joignait prospects et users
-- par « même e-mail OU même téléphone » : un OR force une boucle prospects × comptes, avec deux
-- regexp_replace par paire, et la fonction tourne à chaque écriture du tableau. On sépare les deux
-- correspondances (union) et chacune s'appuie sur un index d'expression. Même résultat : un
-- prospect n'apparaît qu'une fois, l'e-mail l'emporte sur le téléphone.
-- La définition reprend celle de 20261016140000 (seule version live), entière.

create index users_email_lower_idx on public.users (lower(email));
create index users_phone_key_idx on public.users (public.phone_key(phone));
create index prospects_phone_key_idx on public.prospects (public.phone_key(phone));

create or replace function public.admin_prospects_a_rapprocher()
returns table (prospect_id uuid, prospect_name text, prospect_brand text, user_id uuid,
  user_name text, user_email text, par text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select c.prospect_id, c.prospect_name, c.prospect_brand, c.user_id, c.user_name, c.user_email,
    c.par
  from (
    select distinct on (t.prospect_id) t.*
    from (
      select p.id as prospect_id, p.name as prospect_name, p.brand as prospect_brand,
        u.actor_id as user_id, u.display_name::text as user_name, u.email::text as user_email,
        'email'::text as par, 0 as rang, u.created_at as u_created, p.created_at as p_created
      from prospects p
      join users u on lower(u.email) = p.email
      where p.user_id is null
      union all
      select p.id, p.name, p.brand, u.actor_id, u.display_name::text, u.email::text,
        'telephone'::text, 1, u.created_at, p.created_at
      from prospects p
      join users u on phone_key(u.phone) = phone_key(p.phone)
      where p.user_id is null and phone_key(p.phone) is not null
    ) t
    order by t.prospect_id, t.rang, t.u_created, t.user_id
  ) c
  order by c.p_created desc, c.prospect_id;
end $$;
