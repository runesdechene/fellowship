-- POURQUOI : relecture finale du lot 3c. « Nouveau prospect » depuis un Non classé créait le
-- prospect côté navigateur, puis rangeait un seul message : un inconnu qui écrit deux fois faisait
-- échouer le second (e-mail déjà pris), et un échec entre les deux laissait un prospect orphelin.
-- Une seule fonction retrouve ou crée le prospect et range tous ses messages en attente. Et un
-- Non classé (spam, hors sujet) peut désormais s'écarter : sans ça, la liste ne faisait que grossir.

create function public.admin_prospect_depuis_message(p_message uuid) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  v_email text;
  v_prospect uuid;
begin
  perform admin_garde();
  select lower(trim(from_email)) into v_email from prospect_messages
  where id = p_message and prospect_id is null and direction = 'in';
  if v_email is null then
    raise exception 'message déjà rangé ou introuvable' using errcode = 'P0002';
  end if;

  insert into prospects (email) values (v_email) on conflict (email) do nothing;
  select id into v_prospect from prospects where email = v_email;

  update prospect_messages set prospect_id = v_prospect
  where prospect_id is null and direction = 'in' and lower(trim(from_email)) = v_email;
  update prospects set email_status = 'repondu' where id = v_prospect;
  return v_prospect;
end $$;

create function public.admin_ecarter_message(p_message uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  delete from prospect_messages where id = p_message and prospect_id is null and direction = 'in';
  if not found then
    raise exception 'message déjà rangé ou introuvable' using errcode = 'P0002';
  end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array['admin_prospect_depuis_message(uuid)', 'admin_ecarter_message(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
