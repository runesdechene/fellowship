-- Faille : `entities_select_all` est `using(true)` et `anon` avait le grant SELECT au
-- niveau TABLE → un visiteur anonyme pouvait lire stripe_customer_id, subscription_status,
-- siren, etc. (la vitrine faisait `select('*')`).
-- ⚠️ Un `revoke select (colonnes)` est inopérant tant qu'un grant SELECT au niveau table
-- existe (le grant table domine). Il faut donc REVOKE la table puis GRANT uniquement les
-- colonnes publiques.
-- `authenticated` est conservé (le propriétaire lit SES infos dans Abonnement/Boutique).
-- Côté app, les lectures publiques (use-vitrine, Embed) passent par PUBLIC_ENTITY_COLUMNS
-- (identique à la liste ci-dessous) — plus aucun select('*') anonyme.
revoke select on public.entities from anon;
grant select (
  actor_id, type, brand_name, craft_type, bio, website, banner_url, avatar_url,
  public_slug, city, department, postal_code, created_at, plan, links, verified,
  banner_position, location, comped_pro_until, is_ambassador
) on public.entities to anon;
