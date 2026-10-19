-- POURQUOI : `admin_categorie_enregistrer` (20261019140000) créait aussi une catégorie quand
-- `p_id` était nul ; or l'app crée par insertion directe (politique `tags_admin_insert`), et le
-- type généré exige `p_id`. La branche de création est retirée : la fonction ne fait plus que
-- corriger, et faire suivre un renommage dans `events.tags`. Repris de la définition live.

create or replace function public.admin_categorie_enregistrer(
  p_id uuid, p_name text, p_slug text, p_bg text, p_text text, p_ordre integer
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  ancien tags%rowtype;
begin
  perform admin_garde();
  select * into ancien from tags where tags.id = p_id;
  if not found then
    raise exception 'catégorie introuvable';
  end if;
  update tags set name = trim(p_name), slug = trim(p_slug), bg_color = trim(p_bg),
    text_color = trim(p_text), sort_order = p_ordre
  where tags.id = p_id;
  if ancien.name <> trim(p_name) or ancien.slug <> trim(p_slug) then
    update events
    set tags = array_replace(array_replace(events.tags, ancien.name, trim(p_name)),
      ancien.slug, trim(p_slug))
    where events.tags && array[ancien.name, ancien.slug];
  end if;
  return p_id;
end $$;
