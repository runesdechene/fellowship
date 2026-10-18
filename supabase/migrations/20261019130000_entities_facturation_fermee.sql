-- POURQUOI : `authenticated` gardait le SELECT au niveau table sur `entities` : tout compte connecté
-- lisait la facturation de toutes les enseignes (identifiants Stripe, statut, SIREN, raison
-- sociale…) — le résidu de 20260626100145, qui ne l'avait fermée qu'aux visiteurs (lot 1b).
-- Depuis 20261019120100, les deux apps lisent leurs propres enseignes par `mes_enseignes()` ;
-- toutes les autres lectures de `entities` côté client se limitent aux colonnes ci-dessous
-- (vérifié le 19/10/2026, V1 et V2 déployées). L'administration lit par ses fonctions admin_*.
-- Comme pour anon : un revoke par colonne ne suffit pas tant que le grant table existe.
revoke select on public.entities from authenticated;
grant select (
  actor_id, type, brand_name, craft_type, bio, website, banner_url, avatar_url,
  public_slug, city, department, postal_code, created_at, plan, links, verified,
  banner_position, location, comped_pro_until, is_ambassador
) on public.entities to authenticated;
