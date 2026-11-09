-- POURQUOI : l'e-reporting B2C devient obligatoire le 01/09/2027 (flux 10.3, un envoi par décade,
-- 500 € par envoi manquant). Fellowship déclare les ventes aux particuliers d'une enseigne par
-- SuperPDP. Zone à part, multi-entreprises, accès par appartenance (can_act_as), jamais is_admin().
-- Un envoi ne se corrige pas : dans le doute, le serveur n'envoie pas et prévient.
-- Conception : « E-Repporting Imperial/conception.md » (09/11/2026). Maquettes Figma 2795:233, 2803:233.
-- Pas de cron ici : il viendra avec l'Edge Function reporting-quotidien, qu'il appellerait sinon dans le vide.

-- Une ligne par enseigne activée : c'est elle qui ouvre la zone Reporting.
create table public.reporting_entreprises (
  entity_actor_id uuid primary key references public.entities(actor_id) on delete restrict,
  -- réglages de l'écran
  regime_tva text not null default 'monthly'
    check (regime_tva in ('monthly', 'quarterly', 'simplified', 'vat_exemption')),
  date_de_vente text not null default 'commande' check (date_de_vente in ('commande', 'expedition')),
  alerte_email text,
  rappel_echeance boolean not null default true,
  recap_comptable boolean not null default false,
  recap_comptable_email text,
  actif boolean not null default true,
  -- hors écran, en SQL seulement : un envoi réel ne part jamais d'un clic
  environnement text not null default 'sandbox' check (environnement in ('sandbox', 'production')),
  envoi_a_partir_du date,
  created_at timestamptz not null default now()
);

-- Les sources de ventes. Aucun secret ici : ils sont dans Vault.
create table public.reporting_sources (
  id uuid primary key default gen_random_uuid(),
  entity_actor_id uuid not null references public.reporting_entreprises(entity_actor_id) on delete restrict,
  type text not null check (type in ('shopify', 'sumup')),
  identifiant text not null,
  actif boolean not null default true,
  derniere_lecture timestamptz,
  derniere_erreur text,
  unique (entity_actor_id, type)
);

-- Une ligne par jour. L'environnement est dans la clé : un essai en sandbox ne bloque pas le vrai envoi.
create table public.reporting_journees (
  id uuid primary key default gen_random_uuid(),
  entity_actor_id uuid not null references public.reporting_entreprises(entity_actor_id) on delete restrict,
  environnement text not null check (environnement in ('sandbox', 'production')),
  jour date not null,
  statut text not null check (statut in
    ('en_attente', 'a_verifier', 'prete', 'en_cours', 'envoyee', 'refusee', 'inconnue', 'vide')),
  lignes jsonb not null default '[]',   -- le contenu exact envoyé à SuperPDP
  detail jsonb not null default '{}',   -- ce que chaque source a donné
  anomalies jsonb not null default '[]',
  validee_par uuid references public.users(actor_id) on delete set null,
  validee_le timestamptz,
  updated_at timestamptz not null default now(),
  unique (entity_actor_id, environnement, jour)
);

-- L'historique des appels à SuperPDP : on ajoute, on ne modifie jamais.
create table public.reporting_envois (
  id bigint generated always as identity primary key,
  journee_id uuid not null references public.reporting_journees(id) on delete restrict,
  envoye_le timestamptz not null default now(),
  http_status int,
  superpdp_ids bigint[],
  requete jsonb not null,
  reponse jsonb
);
create index reporting_envois_journee_idx on public.reporting_envois (journee_id);

-- Droits : Supabase ouvre tout par défaut sur une table de public. On referme, puis on rouvre le strict nécessaire.
revoke all on public.reporting_entreprises, public.reporting_sources,
  public.reporting_journees, public.reporting_envois from anon, authenticated;
grant select on public.reporting_entreprises, public.reporting_sources,
  public.reporting_journees, public.reporting_envois to authenticated;
-- Les réglages de l'écran, et eux seuls (environnement et envoi_a_partir_du restent au SQL).
grant update (regime_tva, date_de_vente, alerte_email, rappel_echeance,
  recap_comptable, recap_comptable_email, actif) on public.reporting_entreprises to authenticated;
grant update (actif) on public.reporting_sources to authenticated;
-- Même le serveur ne réécrit pas l'historique.
revoke update, delete, truncate on public.reporting_envois from service_role;

alter table public.reporting_entreprises enable row level security;
alter table public.reporting_sources enable row level security;
alter table public.reporting_journees enable row level security;
alter table public.reporting_envois enable row level security;

create policy reporting_entreprises_select on public.reporting_entreprises
  for select to authenticated using (public.can_act_as(entity_actor_id));
create policy reporting_entreprises_update on public.reporting_entreprises
  for update to authenticated
  using (public.is_entity_owner(entity_actor_id)) with check (public.is_entity_owner(entity_actor_id));

create policy reporting_sources_select on public.reporting_sources
  for select to authenticated using (public.can_act_as(entity_actor_id));
create policy reporting_sources_update on public.reporting_sources
  for update to authenticated
  using (public.is_entity_owner(entity_actor_id)) with check (public.is_entity_owner(entity_actor_id));

create policy reporting_journees_select on public.reporting_journees
  for select to authenticated using (public.can_act_as(entity_actor_id));

create policy reporting_envois_select on public.reporting_envois
  for select to authenticated using (exists (
    select 1 from public.reporting_journees j
    where j.id = journee_id and public.can_act_as(j.entity_actor_id)
  ));

-- Le propriétaire débloque une journée à vérifier : elle repart au prochain passage.
create function public.reporting_valider_journee(p_journee uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update reporting_journees
     set statut = 'prete', validee_par = auth.uid(), validee_le = now(), updated_at = now()
   where id = p_journee and statut = 'a_verifier' and is_entity_owner(entity_actor_id);
  if not found then
    raise exception 'journée introuvable, déjà validée, ou réservée au propriétaire';
  end if;
end; $$;
revoke execute on function public.reporting_valider_journee(uuid) from public, anon;
grant execute on function public.reporting_valider_journee(uuid) to authenticated;

-- Les secrets (SuperPDP, Shopify, SumUp) vivent dans Vault, nommés reporting:<enseigne>:<environnement>:<nom>.
-- Vault n'est pas exposé par l'API : l'Edge Function les lit par cette fonction, ouverte à elle seule.
create function public.reporting_secret(p_entity uuid, p_environnement text, p_nom text)
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets
   where name = format('reporting:%s:%s:%s', p_entity, p_environnement, p_nom);
$$;
revoke execute on function public.reporting_secret(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reporting_secret(uuid, text, text) to service_role;
