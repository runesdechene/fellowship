-- POURQUOI : le plan de Fellowship (Uriel, 31/10/2026) mesure l'application entière : nouveaux comptes,
-- festivals ajoutés, abonnés Pro. L'exposeur ne lisait qu'une enseigne ; une clé de portée « plateforme »
-- lit les mêmes chiffres que /admin (admin_chiffres, admin_accueil), sans session admin.
-- Spec : docs/superpowers/specs/2026-10-31-exposeur-design.md, partie « Portée plateforme ».
-- Purement additif : une colonne avec défaut, une fonction réservée au service role.

alter table public.api_keys
  add column portee text not null default 'enseigne'
  check (portee in ('enseigne', 'plateforme'));
comment on column public.api_keys.portee is
  'enseigne : les chiffres de l''enseigne de la clé. plateforme : les chiffres de toute l''application (clés données à la main, équipe seulement).';

-- Les chiffres de l'application sur une fenêtre de dates (bornes incluses, jours de Paris).
-- comptes   : personnes inscrites dans la fenêtre (users.created_at), comme « comptes » de /admin.
-- enseignes : enseignes créées dans la fenêtre (entities.created_at).
-- festivals : fiches ajoutées dans la fenêtre (events.created_at), comme « fiches » de /admin.
-- pro, pro_payants, essais : l'état d'aujourd'hui, pas celui de la fenêtre (on ne garde pas l'historique).
--   pro = même règle que /admin (admin_offre, mois offerts compris) ; pro_payants = abonnement Stripe actif.
-- Rend null pour une clé inconnue, révoquée ou qui n'est pas de portée plateforme.
create function public.exposeur_plateforme(p_hash text, p_debut date, p_fin date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_de timestamptz := p_debut::timestamp at time zone 'Europe/Paris';
  v_a  timestamptz := (p_fin + 1)::timestamp at time zone 'Europe/Paris';
begin
  update api_keys set last_used_at = now()
   where hash = p_hash and revoked_at is null and portee = 'plateforme'
  returning id into v_id;
  if v_id is null then return null; end if;

  return jsonb_build_object(
    'comptes',     (select count(*) from users    where created_at >= v_de and created_at < v_a),
    'enseignes',   (select count(*) from entities where created_at >= v_de and created_at < v_a),
    'festivals',   (select count(*) from events   where created_at >= v_de and created_at < v_a),
    'pro',         (select count(*) from entities e
                     where admin_offre(e.plan::text, e.comped_pro_until, e.subscription_status) = 'pro'),
    'pro_payants', (select count(*) from entities where subscription_status = 'active'),
    'essais',      (select count(*) from entities where subscription_status = 'trialing')
  );
end $$;

revoke all on function public.exposeur_plateforme(text, date, date) from public, anon, authenticated;
grant execute on function public.exposeur_plateforme(text, date, date) to service_role;
