# Administration V2, lot 2 — la coquille et les Comptes : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** une administration sous `/v2/admin` où un admin lit, corrige, annote et gère (accès, argent) les enseignes et les personnes.

**Architecture:** la vraie garde est en base — des fonctions `admin_*` `SECURITY DEFINER` qui lèvent 42501 hors admin, plus deux tables à RLS « admin seulement ». Stripe et l'authentification passent par deux fonctions Edge (`admin-stripe`, `admin-compte`) et `delete-account` étendu. Le front ajoute une coquille (`AdminShell`), trois écrans (`features/admin-accounts`, `admin-entity`, `admin-person`) et des fonctions pures testées dans `lib/`.

**Tech Stack:** React 19 + React Router 7 + supabase-js (V2, `apps/web-v2`), Postgres/Supabase (migrations SQL), Deno Edge Functions, Stripe (API `2024-12-18.acacia`), vitest.

**Spec:** `docs/superpowers/specs/2026-10-15-v2-admin-lot-2-comptes-design.md` — maquettes Figma `2338:2` (par enseigne), `2340:2` (par personne), `2342:2` (fiche enseigne), `2344:2` (fiche personne), fichier `9CmmBD3t5rAk4tD583cdN3`.

## Global Constraints

- pnpm uniquement ; TS strict : pas de `any`, `@ts-ignore`, `as unknown as`, `!` (lint V2).
- Lint V2 avant chaque commit : `pnpm --filter web-v2 lint` (ESLint 0 avertissement, stylelint, prettier, en-têtes QUOI/POURQUOI, README par dossier, 400 lignes max par fichier).
- Aucun style dans les `.tsx` ; aucune valeur en dur dans `styles/3-components/` ; une couleur neuve entre dans `1-primitives.css` puis prend son sens dans `2-semantic.css`.
- Rien de la V1 n'est importé ni recopié.
- Toute logique de date passe par `lib/dates.ts`, tout montant par `lib/money.ts`.
- Migrations : `supabase/migrations/<horodatage>_<nom>.sql`, POURQUOI en tête, appliquées par `node_modules/supabase/bin/supabase.exe db push --linked` (mot de passe : voir `.claude/rules/supabase.md`). **La base est la production.** Jamais `apply_migration` du MCP.
- Tout `CREATE OR REPLACE` part de la définition live entière.
- Toute requête dont on prend « le premier résultat » est triée ; toute liste aussi.
- Types régénérés après chaque migration (voir Task 1, étape 5) ; `src/types/supabase.ts` formaté avec `npx prettier --write --ignore-path=/dev/null src/types/supabase.ts` (le fichier est ignoré par prettier, mais versionné formaté).
- Conventional Commits en français ; un commit par tâche qui marche ; fin de chaque commit : `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Fonctions Edge : `node_modules/supabase/bin/supabase.exe functions deploy <nom> --project-ref trbxpsknbtisqwefqoub`. Un commit ne déploie rien.
- Déploiement V2 : `pnpm deploy:v2` (voir `.claude/rules/deploiement.md`). La V2 n'est ouverte qu'aux admins et au rôle `v2` : déployer une étape intermédiaire est sans risque.
- Les actions qui écrivent (offrir, remise, suspendre, supprimer, changer un e-mail) se testent sur un **compte de test**, jamais sur un vrai client.

## Review Focus

1. **Un compte non admin appelle une fonction `admin_*` en direct** (console, curl) → erreur 42501, aucune ligne. Testé : Task 2, étape 4.
2. **Une recherche avec accents, majuscules ou un téléphone écrit autrement** (« crémieu », « CRÉMIEU », « 06 12 34 » pour « 0612345678 ») → la ligne est trouvée. Testé : Task 2, étape 4, et Task 6, étape 6.
3. **Une enseigne sans aucun membre** (membre supprimé) → la ligne s'affiche avec « aucun compte », sans planter. Testé : Task 4 (`membersSummary(0)`).
4. **Un admin qui se suspend ou se supprime lui-même** → refusé par le serveur, et le bouton absent sur sa propre fiche. Testé : Task 13, étapes 1 et 5.
5. **« Offrir des mois » sur une enseigne déjà offerte jusqu'à une date future** → les mois s'ajoutent à cette date, pas à aujourd'hui. Testé : Task 3, étape 3.

## Les fichiers

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/20261016090000_admin_comptes_donnees.sql` | colonnes, tables `admin_notes`/`admin_labels`, déclencheur |
| `supabase/migrations/20261016090100_admin_comptes_lectures.sql` | fonctions de lecture |
| `supabase/migrations/20261016090200_admin_comptes_ecritures.sql` | fonctions d'écriture |
| `supabase/functions/admin-stripe/index.ts` | paiements, coupons, remise |
| `supabase/functions/admin-compte/index.ts` | suspendre, réactiver, e-mail |
| `supabase/functions/delete-account/index.ts` | + `userId` pour un admin |
| `supabase/functions/stripe-checkout-session/index.ts`, `stripe-webhook/index.ts` | qui paie |
| `apps/web-v2/src/lib/offer.ts` (+ test) | l'offre d'une enseigne en une ligne |
| `apps/web-v2/src/lib/admin-list.ts` (+ test) | l'état de la liste ↔ l'adresse |
| `apps/web-v2/src/lib/admin-members.ts` (+ test) | membres groupés, résumé, rôle |
| `apps/web-v2/src/lib/useAdminNotes.ts` | notes et étiquettes d'un acteur |
| `apps/web-v2/src/lib/admin-functions.ts` | appels typés aux fonctions Edge |
| `apps/web-v2/src/components/layout/AdminShell.tsx` | la coquille |
| `apps/web-v2/src/components/ui/IconTile.tsx`, `TypeChip.tsx`, `OfferBadge.tsx`, `AdminCard.tsx`, `NotesCard.tsx` | briques partagées |
| `apps/web-v2/src/features/admin-accounts/*` | la liste |
| `apps/web-v2/src/features/admin-entity/*` | la fiche d'une enseigne |
| `apps/web-v2/src/features/admin-person/*` | la fiche d'une personne |
| `apps/web-v2/src/styles/3-components/admin-*.css` | les styles |

---

### Task 1: La base — données neuves

**Files:**
- Create: `supabase/migrations/20261016090000_admin_comptes_donnees.sql`
- Modify: `supabase/config.toml` (rien ici ; voir Task 12)
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)

**Interfaces:**
- Produces: `users.phone text`, `users.suspended_at timestamptz`, `entities.paid_by_user uuid`, tables `admin_notes(id, actor_id, author_user_id, body, created_at)` et `admin_labels(actor_id, label, created_at)`.

- [ ] **Step 1: Vérifier que la définition de `protect_entity_plan` est bien la dernière**

Run: `grep -rln "protect_entity_plan" supabase/migrations`
Expected : la dernière migration qui la définit est `20261011190000_protect_entity_stripe_columns.sql`. Si une plus récente existe, partir de celle-là à l'étape 2.

- [ ] **Step 2: Écrire la migration**

```sql
-- POURQUOI : lot 2 de l'administration V2 (spec 2026-10-15-v2-admin-lot-2-comptes-design.md).
-- Ce que l'administration retient sur les comptes et que la base ne savait pas : le téléphone
-- (saisi par un admin seulement, Uriel 15/10/2026), la suspension, qui paie l'abonnement d'une
-- enseigne (Stripe ne garde que l'e-mail du premier payeur), les notes internes et les étiquettes.
-- Additif : le code déployé n'en lit rien.

alter table public.users
  add column phone text,
  add column suspended_at timestamptz;

alter table public.entities
  add column paid_by_user uuid references public.users(actor_id) on delete set null;

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.actors(id) on delete cascade,
  author_user_id uuid references public.users(actor_id) on delete set null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index admin_notes_actor_idx on public.admin_notes (actor_id, created_at desc);

create table public.admin_labels (
  actor_id uuid not null references public.actors(id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  created_at timestamptz not null default now(),
  primary key (actor_id, label)
);

alter table public.admin_notes enable row level security;
alter table public.admin_labels enable row level security;

create policy admin_notes_admin on public.admin_notes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_labels_admin on public.admin_labels for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- protect_entity_plan : définition live (20261011190000) reprise entière. Deux changements :
-- un admin peut écrire comped_pro_until et is_ambassador (offrir des mois, ambassadeur) ;
-- paid_by_user ne s'écrit que par le serveur (le webhook), comme les colonnes Stripe.
CREATE OR REPLACE FUNCTION public.protect_entity_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      NEW.plan := OLD.plan;
    END IF;
    IF NEW.comped_pro_until IS DISTINCT FROM OLD.comped_pro_until AND NOT is_admin() THEN
      NEW.comped_pro_until := OLD.comped_pro_until;
    END IF;
    IF NEW.is_ambassador IS DISTINCT FROM OLD.is_ambassador AND NOT is_admin() THEN
      NEW.is_ambassador := OLD.is_ambassador;
    END IF;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.subscription_status := OLD.subscription_status;
    NEW.billing_interval := OLD.billing_interval;
    NEW.current_period_end := OLD.current_period_end;
    NEW.trial_end := OLD.trial_end;
    NEW.discount_end := OLD.discount_end;
    NEW.discount_label := OLD.discount_label;
    NEW.paid_by_user := OLD.paid_by_user;
  END IF;
  RETURN NEW;
END;
$function$;
```

- [ ] **Step 3: Appliquer**

```bash
export SUPABASE_DB_PASSWORD="$(grep '^SUPABASE_DB_PASSWORD=' .env | sed 's/^SUPABASE_DB_PASSWORD=//; s/\r$//; s/^"//; s/"$//')"
npx --no-install supabase migration list --linked | tail -3   # la nouvelle : colonne remote vide
echo y | node_modules/supabase/bin/supabase.exe db push --linked
```
Expected : `Applying migration 20261016090000_admin_comptes_donnees.sql... Finished supabase db push.`

- [ ] **Step 4: Vérifier qu'un visiteur ne lit pas les notes**

```bash
U=$(grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '\r"'); K=$(grep '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '\r"')
curl -s "$U/rest/v1/admin_notes?select=id" -H "apikey: $K"
```
Expected : `[]`.

- [ ] **Step 5: Régénérer les types de la V2**

```bash
S="$TMPDIR/types.ts"; node_modules/supabase/bin/supabase.exe gen types typescript --linked --schema public > "$S" && cp "$S" apps/web-v2/src/types/supabase.ts
cd apps/web-v2 && npx prettier --write --ignore-path=/dev/null src/types/supabase.ts && cd ../..
git diff --ignore-cr-at-eol --stat -- apps/web-v2/src/types
```
Expected : seules les colonnes et tables neuves apparaissent.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261016090000_admin_comptes_donnees.sql apps/web-v2/src/types/supabase.ts
git commit -m "feat(db): ce que l'administration retient — téléphone, suspension, qui paie, notes et étiquettes"
```

---

### Task 2: La base — les lectures

**Files:**
- Create: `supabase/migrations/20261016090100_admin_comptes_lectures.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)

**Interfaces:**
- Consumes: Task 1.
- Produces (RPC, toutes `authenticated`, 42501 hors admin) :
  - `admin_chiffres()` → `{comptes, comptes_semaine, pro, pro_offerts, essais, essais_bientot, echecs}` (bigint)
  - `admin_enseignes(p_q text, p_filtre text, p_page int)` → lignes `{actor_id, brand_name, type, city, avatar_url, plan, comped_pro_until, subscription_status, billing_interval, trial_end, discount_label, is_ambassador, created_at, paid_by_name, dates, avis, total}`
  - `admin_personnes(p_q text, p_filtre text, p_page int)` → `{actor_id, display_name, email, avatar_url, role, created_at, last_sign_in_at, suspended_at, entity_id, brand_name, entity_type, plan, comped_pro_until, subscription_status, billing_interval, trial_end, discount_label, dates, avis, total}`
  - `admin_membres(p_entities uuid[])` → `{entity_id, actor_id, display_name, email, avatar_url, phone, role, created_at}`
  - `admin_enseigne(p_id uuid)` → une ligne (voir SQL)
  - `admin_personne(p_id uuid)` → une ligne (voir SQL)
  - `admin_enseignes_de(p_person uuid)` → `{entity_id, brand_name, type, city, avatar_url, role, plan, comped_pro_until, subscription_status, billing_interval, trial_end, discount_label, paid_by_user}`
  - `admin_gestes(p_actors uuid[])` → `{quand timestamptz, quoi text}` (les 3 derniers)
  - `admin_filtres(p_vue text, p_q text)` → `{filtre text, nombre bigint}` — le nombre de lignes de chaque filtre pour la recherche en cours (les compteurs des filtres de la maquette)
  - Filtres : enseignes `toutes|pro|essai|gratuit|exposants|festivals` ; personnes `tous|pro|essai|gratuit|sans_enseigne|admins`.

- [ ] **Step 1: Écrire la migration**

```sql
-- POURQUOI : les lectures de l'administration V2 (lot 2). SECURITY DEFINER pour lire toutes les
-- lignes ; chaque fonction appelle admin_garde() et lève 42501 si l'appelant n'est pas admin :
-- c'est la vraie garde, l'écran ne fait que masquer. Les listes sont triées (created_at desc, id)
-- et paginées par 50. La recherche ignore accents et casse ; le téléphone se compare chiffres seuls.

create function public.admin_garde() returns void
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not is_admin() then
    raise exception 'réservé aux admins' using errcode = '42501';
  end if;
end $$;

-- Le même découpage que lib/offer.ts (offerOf) : les deux vont ensemble.
create function public.admin_offre(p_plan text, p_comped timestamptz, p_status text) returns text
language sql stable set search_path to 'public' as $$
  select case
    when p_status = 'trialing' then 'essai'
    when p_plan = 'pro' or p_comped > now() then 'pro'
    else 'gratuit'
  end;
$$;

create function public.admin_cherche(p_valeur text, p_q text) returns boolean
language sql stable set search_path to 'public' as $$
  select lower(extensions.unaccent(coalesce(p_valeur, '')))
    like '%' || lower(extensions.unaccent(trim(p_q))) || '%';
$$;

create function public.admin_tel(p_tel text, p_q text) returns boolean
language sql immutable set search_path to 'public' as $$
  select length(regexp_replace(p_q, '\D', '', 'g')) >= 4
     and regexp_replace(coalesce(p_tel, ''), '\D', '', 'g')
         like '%' || regexp_replace(p_q, '\D', '', 'g') || '%';
$$;

create function public.admin_activite(p_actors uuid[])
returns table (dates bigint, avis bigint, questions bigint, bilans bigint, fiches bigint, abonnes bigint)
language sql stable security definer set search_path to 'public' as $$
  select
    (select count(*) from participations where actor_id = any(p_actors)),
    (select count(*) from reviews where actor_id = any(p_actors)),
    (select count(*) from event_threads where actor_id = any(p_actors))
      + (select count(*) from event_thread_replies where actor_id = any(p_actors)),
    (select count(*) from event_reports where actor_id = any(p_actors)),
    (select count(*) from events where created_by_actor = any(p_actors)),
    (select count(*) from follows where following_actor = any(p_actors));
$$;

create function public.admin_chiffres()
returns table (comptes bigint, comptes_semaine bigint, pro bigint, pro_offerts bigint,
  essais bigint, essais_bientot bigint, echecs bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query select
    (select count(*) from users),
    (select count(*) from users where created_at > now() - interval '7 days'),
    (select count(*) from entities e
      where admin_offre(e.plan, e.comped_pro_until, e.subscription_status) = 'pro'),
    (select count(*) from entities e
      where coalesce(e.plan, '') <> 'pro' and e.comped_pro_until > now()),
    (select count(*) from entities where subscription_status = 'trialing'),
    (select count(*) from entities
      where subscription_status = 'trialing' and trial_end < now() + interval '3 days'),
    (select count(*) from entities where subscription_status = 'past_due');
end $$;

create function public.admin_enseignes(p_q text default '', p_filtre text default 'toutes', p_page int default 0)
returns table (actor_id uuid, brand_name text, type text, city text, avatar_url text, plan text,
  comped_pro_until timestamptz, subscription_status text, billing_interval text, trial_end timestamptz,
  discount_label text, is_ambassador boolean, created_at timestamptz, paid_by_name text,
  dates bigint, avis bigint, total bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  with choisies as (
    select e.* from entities e
    where (p_filtre = 'toutes'
        or (p_filtre in ('pro', 'essai', 'gratuit')
            and admin_offre(e.plan, e.comped_pro_until, e.subscription_status) = p_filtre)
        or (p_filtre = 'exposants' and e.type = 'exposant')
        or (p_filtre = 'festivals' and e.type = 'festival'))
      and (coalesce(trim(p_q), '') = ''
        or admin_cherche(e.brand_name, p_q)
        or exists (
          select 1 from memberships m join users u on u.actor_id = m.user_actor_id
          where m.entity_actor_id = e.actor_id
            and (admin_cherche(u.display_name, p_q) or admin_cherche(u.email, p_q)
              or admin_tel(u.phone, p_q))))
  )
  select c.actor_id, c.brand_name::text, c.type::text, c.city::text, c.avatar_url::text, c.plan::text,
    c.comped_pro_until, c.subscription_status::text, c.billing_interval::text, c.trial_end,
    c.discount_label::text, coalesce(c.is_ambassador, false), c.created_at, payer.display_name::text,
    a.dates, a.avis, count(*) over ()
  from choisies c
  left join users payer on payer.actor_id = c.paid_by_user
  cross join lateral admin_activite(array[c.actor_id]) a
  order by c.created_at desc, c.actor_id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

create function public.admin_personnes(p_q text default '', p_filtre text default 'tous', p_page int default 0)
returns table (actor_id uuid, display_name text, email text, avatar_url text, role text,
  created_at timestamptz, last_sign_in_at timestamptz, suspended_at timestamptz, entity_id uuid,
  brand_name text, entity_type text, plan text, comped_pro_until timestamptz,
  subscription_status text, billing_interval text, trial_end timestamptz, discount_label text,
  dates bigint, avis bigint, total bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  with base as (
    select u.actor_id as u_id, u.display_name as u_name, u.email as u_email, u.avatar_url as u_avatar,
      u.role as u_role, u.created_at as u_created, u.suspended_at as u_suspended, u.phone as u_phone,
      first.*
    from users u
    left join lateral (
      select en.actor_id as e_id, en.brand_name as e_name, en.type::text as e_type, en.plan as e_plan,
        en.comped_pro_until as e_comped, en.subscription_status as e_status,
        en.billing_interval as e_interval, en.trial_end as e_trial, en.discount_label as e_discount
      from memberships m join entities en on en.actor_id = m.entity_actor_id
      where m.user_actor_id = u.actor_id
      order by m.created_at, en.actor_id
      limit 1
    ) first on true
  ), choisis as (
    select * from base b
    where (p_filtre = 'tous'
        or (p_filtre in ('pro', 'essai', 'gratuit') and
            (case when b.e_id is null then 'gratuit'
                  else admin_offre(b.e_plan, b.e_comped, b.e_status) end) = p_filtre)
        or (p_filtre = 'sans_enseigne' and b.e_id is null)
        or (p_filtre = 'admins' and b.u_role = 'admin'))
      and (coalesce(trim(p_q), '') = ''
        or admin_cherche(b.u_name, p_q) or admin_cherche(b.u_email, p_q)
        or admin_cherche(b.e_name, p_q) or admin_tel(b.u_phone, p_q))
  )
  select c.u_id, c.u_name::text, c.u_email::text, c.u_avatar::text, c.u_role::text, c.u_created,
    au.last_sign_in_at, c.u_suspended, c.e_id, c.e_name::text, c.e_type, c.e_plan::text, c.e_comped,
    c.e_status::text, c.e_interval::text, c.e_trial, c.e_discount::text, a.dates, a.avis,
    count(*) over ()
  from choisis c
  left join auth.users au on au.id = c.u_id
  cross join lateral admin_activite(array_remove(array[c.u_id, c.e_id], null)) a
  order by c.u_created desc, c.u_id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

create function public.admin_membres(p_entities uuid[])
returns table (entity_id uuid, actor_id uuid, display_name text, email text, avatar_url text,
  phone text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select m.entity_actor_id, u.actor_id, u.display_name::text, u.email::text, u.avatar_url::text,
    u.phone, m.role::text, m.created_at
  from memberships m join users u on u.actor_id = m.user_actor_id
  where m.entity_actor_id = any(p_entities)
  order by m.entity_actor_id, (m.role = 'owner') desc, m.created_at, u.actor_id;
end $$;

create function public.admin_enseigne(p_id uuid)
returns table (actor_id uuid, brand_name text, type text, craft_type text, city text,
  avatar_url text, public_slug text, created_at timestamptz, plan text, comped_pro_until timestamptz,
  subscription_status text, billing_interval text, trial_end timestamptz,
  current_period_end timestamptz, discount_label text, discount_end timestamptz,
  is_ambassador boolean, stripe_customer_id text, legal_name text, siren text,
  paid_by_user uuid, paid_by_name text, parrain_nom text, filleuls bigint,
  dates bigint, avis bigint, questions bigint, bilans bigint, fiches bigint, abonnes bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select e.actor_id, e.brand_name::text, e.type::text, e.craft_type::text, e.city::text,
    e.avatar_url::text, e.public_slug::text, e.created_at, e.plan::text, e.comped_pro_until,
    e.subscription_status::text, e.billing_interval::text, e.trial_end, e.current_period_end,
    e.discount_label::text, e.discount_end, coalesce(e.is_ambassador, false),
    e.stripe_customer_id::text, e.legal_name::text, e.siren::text, e.paid_by_user,
    payer.display_name::text,
    (select pe.brand_name::text from referrals r join entities pe on pe.actor_id = r.parrain_entity_id
      where r.filleul_entity_id = e.actor_id and r.status <> 'rejected_fraud'
      order by r.attributed_at desc nulls last limit 1),
    (select count(*) from referrals r where r.parrain_entity_id = e.actor_id and r.status = 'rewarded'),
    a.dates, a.avis, a.questions, a.bilans, a.fiches, a.abonnes
  from entities e
  left join users payer on payer.actor_id = e.paid_by_user
  cross join lateral admin_activite(array[e.actor_id]) a
  where e.actor_id = p_id;
end $$;

create function public.admin_personne(p_id uuid)
returns table (actor_id uuid, display_name text, email text, handle text, avatar_url text,
  role text, phone text, postal_code text, city text, push_muted boolean, created_at timestamptz,
  last_sign_in_at timestamptz, suspended_at timestamptz,
  dates bigint, avis bigint, questions bigint, fiches bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select u.actor_id, u.display_name::text, u.email::text, u.handle::text, u.avatar_url::text,
    u.role::text, u.phone, u.postal_code::text, u.city::text, coalesce(u.push_muted, false),
    u.created_at, au.last_sign_in_at, u.suspended_at, a.dates, a.avis, a.questions, a.fiches
  from users u
  left join auth.users au on au.id = u.actor_id
  cross join lateral admin_activite(
    array[u.actor_id] || array(select m.entity_actor_id from memberships m where m.user_actor_id = u.actor_id)
  ) a
  where u.actor_id = p_id;
end $$;

create function public.admin_enseignes_de(p_person uuid)
returns table (entity_id uuid, brand_name text, type text, city text, avatar_url text, role text,
  plan text, comped_pro_until timestamptz, subscription_status text, billing_interval text,
  trial_end timestamptz, discount_label text, paid_by_user uuid)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select e.actor_id, e.brand_name::text, e.type::text, e.city::text, e.avatar_url::text,
    m.role::text, e.plan::text, e.comped_pro_until, e.subscription_status::text,
    e.billing_interval::text, e.trial_end, e.discount_label::text, e.paid_by_user
  from memberships m join entities e on e.actor_id = m.entity_actor_id
  where m.user_actor_id = p_person
  order by m.created_at, e.actor_id;
end $$;

-- Les trois derniers gestes d'un ou plusieurs acteurs, en phrases neutres (sans accord de genre).
create function public.admin_gestes(p_actors uuid[])
returns table (quand timestamptz, quoi text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select g.quand, g.quoi from (
    select p.created_at as quand, 'Suit ' || ev.name as quoi
      from participations p join events ev on ev.id = p.event_id where p.actor_id = any(p_actors)
    union all
    select r.created_at, 'Avis sur ' || ev.name
      from reviews r join events ev on ev.id = r.event_id where r.actor_id = any(p_actors)
    union all
    select t.created_at, 'Question sur ' || ev.name
      from event_threads t join events ev on ev.id = t.event_id where t.actor_id = any(p_actors)
    union all
    select b.created_at, 'Bilan de ' || ev.name
      from event_reports b join events ev on ev.id = b.event_id where b.actor_id = any(p_actors)
    union all
    select ev.created_at, 'Fiche créée : ' || ev.name
      from events ev where ev.created_by_actor = any(p_actors)
  ) g
  order by g.quand desc, g.quoi
  limit 3;
end $$;

-- Les compteurs des filtres : le total de chaque filtre pour la recherche en cours.
create function public.admin_filtres(p_vue text, p_q text default '')
returns table (filtre text, nombre bigint)
language plpgsql stable security definer set search_path to 'public' as $$
declare f text;
begin
  perform admin_garde();
  foreach f in array case when p_vue = 'personnes'
    then array['tous', 'pro', 'essai', 'gratuit', 'sans_enseigne', 'admins']
    else array['toutes', 'pro', 'essai', 'gratuit', 'exposants', 'festivals'] end
  loop
    filtre := f;
    if p_vue = 'personnes' then
      select coalesce(max(p.total), 0) into nombre from admin_personnes(p_q, f, 0) p;
    else
      select coalesce(max(e.total), 0) into nombre from admin_enseignes(p_q, f, 0) e;
    end if;
    return next;
  end loop;
end $$;

revoke all on function public.admin_garde() from public, anon;
revoke all on function public.admin_offre(text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.admin_cherche(text, text) from public, anon, authenticated;
revoke all on function public.admin_tel(text, text) from public, anon, authenticated;
revoke all on function public.admin_activite(uuid[]) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'admin_chiffres()', 'admin_enseignes(text, text, int)', 'admin_personnes(text, text, int)',
    'admin_membres(uuid[])', 'admin_enseigne(uuid)', 'admin_personne(uuid)',
    'admin_enseignes_de(uuid)', 'admin_gestes(uuid[])', 'admin_filtres(text, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
```

- [ ] **Step 2: Appliquer** — même commande que Task 1, étape 3. Expected : `Applying migration 20261016090100_admin_comptes_lectures.sql... Finished`.

- [ ] **Step 3: Régénérer les types** — même commande que Task 1, étape 5. Expected : les neuf fonctions `admin_*` publiques apparaissent sous `Functions`.

- [ ] **Step 4: Vérifier la garde et la recherche**

Sans compte (clé publique) — doit échouer :
```bash
curl -s -X POST "$U/rest/v1/rpc/admin_chiffres" -H "apikey: $K" -H "Content-Type: application/json" -d '{}'
```
Expected : une erreur (`permission denied for function admin_chiffres` ou code 42501), aucune donnée.

En admin, dans le navigateur d'Uriel sur `https://flw.sh/v2/` (onglet piloté, console via `javascript_tool`), le client de l'app n'étant pas global, passer par l'API REST avec le jeton de session du stockage local :
```js
const k = Object.keys(localStorage).find(x => x.endsWith('-auth-token'))
const t = JSON.parse(localStorage.getItem(k)).access_token
const call = (fn, body) => fetch(`https://trbxpsknbtisqwefqoub.supabase.co/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: '<VITE_SUPABASE_ANON_KEY>', Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
await call('admin_chiffres', {})
await call('admin_enseignes', { p_q: 'CHÊNE', p_filtre: 'toutes', p_page: 0 })   // trouve « Runes de Chêne »
await call('admin_enseignes', { p_q: 'chene', p_filtre: 'toutes', p_page: 0 })   // la même ligne
await call('admin_personnes', { p_q: '', p_filtre: 'admins', p_page: 0 })       // les admins, total cohérent
```
Expected : des lignes, `total` identique sur chaque ligne, aucune erreur. Ne rien écrire.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261016090100_admin_comptes_lectures.sql apps/web-v2/src/types/supabase.ts
git commit -m "feat(db): les lectures de l'administration, gardées en base"
```

---

### Task 3: La base — les écritures

**Files:**
- Create: `supabase/migrations/20261016090200_admin_comptes_ecritures.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)

**Interfaces:**
- Produces:
  - `admin_offrir_mois(p_entity uuid, p_mois int)` → `timestamptz` (nouvelle fin)
  - `admin_ambassadeur(p_entity uuid, p_oui boolean)` → `void`
  - `admin_corriger_enseigne(p_id uuid, p_brand_name text, p_craft_type text, p_city text, p_public_slug text, p_legal_name text, p_siren text)` → `void`
  - `admin_corriger_personne(p_id uuid, p_display_name text, p_handle text, p_phone text, p_postal_code text)` → `void`

- [ ] **Step 1: Écrire la migration**

```sql
-- POURQUOI : les écritures de l'administration V2 (lot 2). SECURITY DEFINER (un admin n'est pas
-- membre des enseignes qu'il corrige), garde admin_garde(). Offrir des mois prolonge à partir de la
-- fin déjà offerte si elle est future, sinon d'aujourd'hui. protect_entity_plan laisse passer
-- comped_pro_until et is_ambassador pour un admin (migration 20261016090000).

create function public.admin_offrir_mois(p_entity uuid, p_mois int) returns timestamptz
language plpgsql security definer set search_path to 'public' as $$
declare v_fin timestamptz;
begin
  perform admin_garde();
  if p_mois is null or p_mois not between 1 and 24 then
    raise exception 'entre 1 et 24 mois' using errcode = '22023';
  end if;
  update entities
     set comped_pro_until = greatest(now(), coalesce(comped_pro_until, now())) + make_interval(months => p_mois)
   where actor_id = p_entity
  returning comped_pro_until into v_fin;
  if v_fin is null then raise exception 'enseigne introuvable' using errcode = 'P0002'; end if;
  return v_fin;
end $$;

create function public.admin_ambassadeur(p_entity uuid, p_oui boolean) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  update entities set is_ambassador = p_oui where actor_id = p_entity;
  if not found then raise exception 'enseigne introuvable' using errcode = 'P0002'; end if;
end $$;

create function public.admin_corriger_enseigne(p_id uuid, p_brand_name text, p_craft_type text,
  p_city text, p_public_slug text, p_legal_name text, p_siren text) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  if coalesce(trim(p_brand_name), '') = '' then
    raise exception 'le nom est requis' using errcode = '22023';
  end if;
  update entities set
    brand_name = trim(p_brand_name),
    craft_type = nullif(trim(p_craft_type), ''),
    city = nullif(trim(p_city), ''),
    public_slug = nullif(trim(p_public_slug), ''),
    legal_name = nullif(trim(p_legal_name), ''),
    siren = nullif(regexp_replace(coalesce(p_siren, ''), '\s', '', 'g'), '')
  where actor_id = p_id;
  if not found then raise exception 'enseigne introuvable' using errcode = 'P0002'; end if;
end $$;

create function public.admin_corriger_personne(p_id uuid, p_display_name text, p_handle text,
  p_phone text, p_postal_code text) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  update users set
    display_name = nullif(trim(p_display_name), ''),
    handle = nullif(trim(p_handle), ''),
    phone = nullif(trim(p_phone), ''),
    postal_code = nullif(trim(p_postal_code), '')
  where actor_id = p_id;
  if not found then raise exception 'compte introuvable' using errcode = 'P0002'; end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_offrir_mois(uuid, int)', 'admin_ambassadeur(uuid, boolean)',
    'admin_corriger_enseigne(uuid, text, text, text, text, text, text)',
    'admin_corriger_personne(uuid, text, text, text, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
```

- [ ] **Step 2: Appliquer, puis régénérer les types** (Task 1, étapes 3 et 5).

- [ ] **Step 3: Vérifier « offrir des mois » sur le compte de test** — Review Focus 5

Avec `call` (Task 2, étape 4), sur l'enseigne **de test** `<ID_TEST>` (demander à Uriel laquelle) :
```js
const a = await call('admin_offrir_mois', { p_entity: '<ID_TEST>', p_mois: 1 })
const b = await call('admin_offrir_mois', { p_entity: '<ID_TEST>', p_mois: 1 })
// b doit valoir a + 1 mois (prolongé depuis la fin offerte, pas depuis aujourd'hui)
```
Puis remettre la valeur d'origine notée avant le test, avec l'accord d'Uriel. Expected : `b` = `a` + 1 mois.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261016090200_admin_comptes_ecritures.sql apps/web-v2/src/types/supabase.ts
git commit -m "feat(db): offrir des mois, ambassadeur et corrections, réservés aux admins"
```

---

### Task 4: Les règles pures et les teintes

**Files:**
- Create: `apps/web-v2/src/lib/offer.ts`, `apps/web-v2/src/lib/offer.test.ts`
- Create: `apps/web-v2/src/lib/admin-list.ts`, `apps/web-v2/src/lib/admin-list.test.ts`
- Create: `apps/web-v2/src/lib/admin-members.ts`, `apps/web-v2/src/lib/admin-members.test.ts`
- Modify: `apps/web-v2/src/styles/1-primitives.css` (après `--bleu-50`), `apps/web-v2/src/styles/2-semantic.css` (jour, et le bloc `:root[data-theme='dark']` ligne ~1470 — et tout autre bloc nuit où `--status-validated-ink` est redéfini)

**Interfaces:**
- Produces:
  - `offerOf(e: OfferFields, now: Date): Offer` ; `Offer = { kind: 'pro' | 'essai' | 'gratuit'; detail: string; alert: boolean }` ; `OfferFields = { plan; comped_pro_until; subscription_status; billing_interval; trial_end; discount_label }` (tous `string | null`).
  - `readAccountsQuery(search: URLSearchParams): AccountsQuery` ; `writeAccountsQuery(q: AccountsQuery): URLSearchParams` ; `AccountsQuery = { view: 'enseignes' | 'personnes'; q: string; filter: string; page: number }` ; `filtersFor(view): readonly { value: string; label: string }[]` ; `PAGE_SIZE = 50`.
  - `groupMembers<T extends { entity_id: string }>(rows: T[]): Map<string, T[]>` ; `membersSummary(count: number): string` ; `roleLabel(role: string): string`.
  - Jetons CSS `--tone-{terre,prune,bleu,sauge,ocre,brique,gris}-{ink,surface}`.

- [ ] **Step 1: Écrire les tests**

`apps/web-v2/src/lib/offer.test.ts` :
```ts
/**
 * QUOI     — tests de lib/offer.ts : l'offre d'une enseigne vue par l'administration.
 * POURQUOI — la liste et les deux fiches la lisent ; le découpage doit coller à admin_offre (SQL).
 */
import { describe, expect, it } from 'vitest'
import { formatDayMonthShort } from './dates'
import { offerOf, type OfferFields } from './offer'

const now = new Date(2026, 9, 15, 12)
const base: OfferFields = {
  plan: 'free', comped_pro_until: null, subscription_status: null,
  billing_interval: null, trial_end: null, discount_label: null,
}

describe('offerOf', () => {
  it('sans rien, gratuit', () => {
    expect(offerOf(base, now)).toEqual({ kind: 'gratuit', detail: '', alert: false })
  })
  it('un essai Stripe compte ses jours, même si plan vaut pro', () => {
    const o = offerOf({ ...base, plan: 'pro', subscription_status: 'trialing', trial_end: '2026-10-24T12:00:00Z' }, now)
    expect(o.kind).toBe('essai')
    expect(o.detail).toBe('9 j restants')
  })
  it('un abonnement annuel', () => {
    expect(offerOf({ ...base, plan: 'pro', subscription_status: 'active', billing_interval: 'year' }, now))
      .toEqual({ kind: 'pro', detail: 'annuel', alert: false })
  })
  it('un abonnement mensuel avec remise', () => {
    expect(offerOf({ ...base, plan: 'pro', subscription_status: 'active', billing_interval: 'month', discount_label: 'RUNE-2026' }, now).detail)
      .toBe('mensuel · remise RUNE-2026')
  })
  it('un paiement refusé alerte', () => {
    expect(offerOf({ ...base, plan: 'pro', subscription_status: 'past_due', billing_interval: 'month' }, now))
      .toEqual({ kind: 'pro', detail: 'paiement refusé', alert: true })
  })
  it('un Pro offert dit jusqu’à quand', () => {
    const until = '2026-12-31T00:00:00Z'
    expect(offerOf({ ...base, comped_pro_until: until }, now).detail)
      .toBe(`offert jusqu’au ${formatDayMonthShort(new Date(until))}`)
  })
  it('un Pro offert échu redevient gratuit', () => {
    expect(offerOf({ ...base, comped_pro_until: '2026-01-01T00:00:00Z' }, now).kind).toBe('gratuit')
  })
})
```

`apps/web-v2/src/lib/admin-list.test.ts` :
```ts
/**
 * QUOI     — tests de lib/admin-list.ts : l'état de la liste des comptes lu et écrit dans l'adresse.
 * POURQUOI — l'adresse fait foi (règle V2) : un filtre inconnu ou une page fausse ne cassent rien.
 */
import { describe, expect, it } from 'vitest'
import { filtersFor, readAccountsQuery, writeAccountsQuery } from './admin-list'

describe('readAccountsQuery', () => {
  it('par défaut : les enseignes, toutes, page 0', () => {
    expect(readAccountsQuery(new URLSearchParams(''))).toEqual({ view: 'enseignes', q: '', filter: 'toutes', page: 0 })
  })
  it('lit la vue personnes et son filtre', () => {
    expect(readAccountsQuery(new URLSearchParams('vue=personnes&filtre=admins&q=%20lea%20&page=2')))
      .toEqual({ view: 'personnes', q: 'lea', filter: 'admins', page: 2 })
  })
  it('un filtre d’une autre vue retombe sur le défaut', () => {
    expect(readAccountsQuery(new URLSearchParams('filtre=admins')).filter).toBe('toutes')
  })
  it('une page négative ou illisible vaut 0', () => {
    expect(readAccountsQuery(new URLSearchParams('page=-3')).page).toBe(0)
    expect(readAccountsQuery(new URLSearchParams('page=abc')).page).toBe(0)
  })
})

describe('writeAccountsQuery', () => {
  it('n’écrit que ce qui s’écarte du défaut', () => {
    expect(writeAccountsQuery({ view: 'enseignes', q: '', filter: 'toutes', page: 0 }).toString()).toBe('')
    expect(writeAccountsQuery({ view: 'personnes', q: 'léa', filter: 'pro', page: 1 }).toString())
      .toBe('vue=personnes&q=l%C3%A9a&filtre=pro&page=1')
  })
})

describe('filtersFor', () => {
  it('six filtres par vue, le défaut en tête', () => {
    expect(filtersFor('enseignes').map((f) => f.value)).toEqual(['toutes', 'pro', 'essai', 'gratuit', 'exposants', 'festivals'])
    expect(filtersFor('personnes').map((f) => f.value)).toEqual(['tous', 'pro', 'essai', 'gratuit', 'sans_enseigne', 'admins'])
  })
})
```

`apps/web-v2/src/lib/admin-members.test.ts` :
```ts
/**
 * QUOI     — tests de lib/admin-members.ts : membres groupés par enseigne, résumé, rôle.
 * POURQUOI — une enseigne peut n'avoir plus aucun compte (Review Focus 3) : la ligne ne doit pas casser.
 */
import { describe, expect, it } from 'vitest'
import { groupMembers, membersSummary, roleLabel } from './admin-members'

describe('groupMembers', () => {
  it('garde l’ordre reçu dans chaque enseigne', () => {
    const map = groupMembers([
      { entity_id: 'a', actor_id: '1' }, { entity_id: 'b', actor_id: '2' }, { entity_id: 'a', actor_id: '3' },
    ])
    expect(map.get('a')?.map((m) => m.actor_id)).toEqual(['1', '3'])
    expect(map.get('b')?.length).toBe(1)
  })
})

describe('membersSummary', () => {
  it('dit le nombre de comptes en plus du premier', () => {
    expect(membersSummary(0)).toBe('aucun compte')
    expect(membersSummary(1)).toBe('seul compte')
    expect(membersSummary(2)).toBe('+ 1 membre')
    expect(membersSummary(4)).toBe('+ 3 membres')
  })
})

describe('roleLabel', () => {
  it('traduit les rôles de memberships', () => {
    expect(roleLabel('owner')).toBe('propriétaire')
    expect(roleLabel('admin')).toBe('administrateur')
    expect(roleLabel('member')).toBe('membre')
  })
})
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `pnpm --filter web-v2 test -- offer admin-list admin-members`
Expected : FAIL, modules introuvables.

- [ ] **Step 3: Écrire les trois modules**

`apps/web-v2/src/lib/offer.ts` :
```ts
/**
 * QUOI     — l'offre d'une enseigne telle que l'administration la lit : Pro, essai ou gratuit, et
 *            son détail en une ligne (« annuel », « 9 j restants », « offert jusqu’au 31 déc. »).
 * POURQUOI — la liste, la fiche d'une enseigne et celle d'une personne disent la même chose ; le Pro
 *            suit lib/plan.ts, l'essai l'état Stripe `trialing`.
 * ATTENTION — le même découpage vit en SQL (admin_offre) pour les filtres : les deux vont ensemble.
 */
import { daysUntil, formatDayMonthShort } from './dates'
import { isPro } from './plan'

export interface OfferFields {
  plan: string | null
  comped_pro_until: string | null
  subscription_status: string | null
  billing_interval: string | null
  trial_end: string | null
  discount_label: string | null
}

export interface Offer {
  kind: 'pro' | 'essai' | 'gratuit'
  detail: string
  /** Un paiement refusé : la ligne se lit en brique. */
  alert: boolean
}

export function offerOf(e: OfferFields, now: Date): Offer {
  if (e.subscription_status === 'trialing') {
    const days = e.trial_end ? Math.max(0, daysUntil(new Date(e.trial_end), now)) : 0
    return { kind: 'essai', detail: `${days} j restants`, alert: false }
  }
  if (!isPro({ plan: e.plan, comped_pro_until: e.comped_pro_until, verified: null }, now)) {
    return { kind: 'gratuit', detail: '', alert: false }
  }
  if (e.subscription_status === 'past_due') return { kind: 'pro', detail: 'paiement refusé', alert: true }
  if (e.plan !== 'pro' && e.comped_pro_until) {
    return { kind: 'pro', detail: `offert jusqu’au ${formatDayMonthShort(new Date(e.comped_pro_until))}`, alert: false }
  }
  const rhythm = e.billing_interval === 'year' ? 'annuel' : 'mensuel'
  return { kind: 'pro', detail: e.discount_label ? `${rhythm} · remise ${e.discount_label}` : rhythm, alert: false }
}
```
Si `daysUntil` arrondit autrement que le test ne l'attend, lire `lib/dates.ts:33` et ajuster **le test** à sa règle (une seule règle de dates dans l'app).

`apps/web-v2/src/lib/admin-list.ts` :
```ts
/**
 * QUOI     — l'état de la liste des comptes (vue, recherche, filtre, page) lu et écrit dans l'adresse.
 * POURQUOI — tout état navigable est une URL (règle V2) : une recherche se partage, le retour
 *            arrière la retrouve.
 * ATTENTION — les valeurs de filtre sont celles qu'attendent admin_enseignes / admin_personnes (SQL).
 */
export type AccountsView = 'enseignes' | 'personnes'

export interface AccountsQuery {
  view: AccountsView
  q: string
  filter: string
  page: number
}

export const PAGE_SIZE = 50

const FILTERS: Record<AccountsView, readonly { value: string; label: string }[]> = {
  enseignes: [
    { value: 'toutes', label: 'Toutes' },
    { value: 'pro', label: 'Pro' },
    { value: 'essai', label: 'Essai' },
    { value: 'gratuit', label: 'Gratuit' },
    { value: 'exposants', label: 'Exposants' },
    { value: 'festivals', label: 'Festivals' },
  ],
  personnes: [
    { value: 'tous', label: 'Tous' },
    { value: 'pro', label: 'Pro' },
    { value: 'essai', label: 'Essai' },
    { value: 'gratuit', label: 'Gratuit' },
    { value: 'sans_enseigne', label: 'Sans enseigne' },
    { value: 'admins', label: 'Admins' },
  ],
}

const DEFAULT_FILTER: Record<AccountsView, string> = { enseignes: 'toutes', personnes: 'tous' }

export function filtersFor(view: AccountsView): readonly { value: string; label: string }[] {
  return FILTERS[view]
}

export function readAccountsQuery(search: URLSearchParams): AccountsQuery {
  const view: AccountsView = search.get('vue') === 'personnes' ? 'personnes' : 'enseignes'
  const raw = search.get('filtre') ?? ''
  const filter = FILTERS[view].some((f) => f.value === raw) ? raw : DEFAULT_FILTER[view]
  const page = Math.max(0, Number.parseInt(search.get('page') ?? '0', 10) || 0)
  return { view, q: (search.get('q') ?? '').trim(), filter, page }
}

export function writeAccountsQuery(query: AccountsQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.view === 'personnes') params.set('vue', 'personnes')
  if (query.q) params.set('q', query.q)
  if (query.filter !== DEFAULT_FILTER[query.view]) params.set('filtre', query.filter)
  if (query.page > 0) params.set('page', String(query.page))
  return params
}
```

`apps/web-v2/src/lib/admin-members.ts` :
```ts
/**
 * QUOI     — les membres d'enseignes vus par l'administration : groupés, résumés, rôle en français.
 * POURQUOI — la liste charge les membres de 50 enseignes en une requête (admin_membres) et les
 *            range ensuite ; la fiche dit le rôle avec les mêmes mots.
 */
export function groupMembers<T extends { entity_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) map.set(row.entity_id, [...(map.get(row.entity_id) ?? []), row])
  return map
}

export function membersSummary(count: number): string {
  if (count === 0) return 'aucun compte'
  if (count === 1) return 'seul compte'
  return count === 2 ? '+ 1 membre' : `+ ${count - 1} membres`
}

const ROLES: Record<string, string> = { owner: 'propriétaire', admin: 'administrateur', member: 'membre' }

export function roleLabel(role: string): string {
  return ROLES[role] ?? role
}
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm --filter web-v2 test -- offer admin-list admin-members`
Expected : PASS.

- [ ] **Step 5: Les teintes**

`1-primitives.css`, après `--bleu-50` :
```css
  /* Les teintes de l'administration (maquettes « Admin — … », validées le 15/10/2026) : une
     pastille par type d'enseigne, une icône par bloc. */
  --prune-700: #7a4f78; /* encre d'un festival, des comptes reliés, le jour */
  --prune-300: #d7b4d4; /* la même encre, la nuit */
  --prune-50: #f2e8f1;
  --ocre-700: #8a6d1f; /* encre des notes internes, le jour */
  --ocre-300: #e2c66f;
  --ocre-50: #f6f0dc;
  --brique-50: #f8e6e1; /* fond de ce qui détruit ou alerte */
```
`2-semantic.css`, jour (à côté de `--status-sent-*`) :
```css
  /* Les tons de l'administration : encre et fond d'une pastille de type ou d'une icône de bloc. */
  --tone-terre-ink: var(--terre-700);
  --tone-terre-surface: var(--terre-50);
  --tone-prune-ink: var(--prune-700);
  --tone-prune-surface: var(--prune-50);
  --tone-bleu-ink: var(--bleu-700);
  --tone-bleu-surface: var(--bleu-50);
  --tone-sauge-ink: var(--sauge-700);
  --tone-sauge-surface: var(--sauge-50);
  --tone-ocre-ink: var(--ocre-700);
  --tone-ocre-surface: var(--ocre-50);
  --tone-brique-ink: var(--brique-600);
  --tone-brique-surface: var(--brique-50);
  --tone-gris-ink: var(--ink-600);
  --tone-gris-surface: var(--sand-100);
```
Nuit (chaque bloc nuit qui redéfinit `--status-validated-ink`) — voile translucide et encre lumineuse, comme les statuts :
```css
  --tone-terre-ink: var(--terre-400);
  --tone-terre-surface: var(--terre-900);
  --tone-prune-ink: var(--prune-300);
  --tone-prune-surface: color-mix(in srgb, var(--prune-300) 14%, transparent);
  --tone-bleu-ink: var(--pervenche-300);
  --tone-bleu-surface: color-mix(in srgb, var(--pervenche-300) 14%, transparent);
  --tone-sauge-ink: var(--menthe-300);
  --tone-sauge-surface: color-mix(in srgb, var(--menthe-300) 14%, transparent);
  --tone-ocre-ink: var(--ocre-300);
  --tone-ocre-surface: color-mix(in srgb, var(--ocre-300) 14%, transparent);
  --tone-brique-ink: var(--brique-400);
  --tone-brique-surface: color-mix(in srgb, var(--brique-400) 14%, transparent);
  --tone-gris-ink: var(--cream-500);
  --tone-gris-surface: var(--night-200);
```
Si `--ink-600` ou `--sand-100` n'existent pas dans `1-primitives.css`, prendre l'encre secondaire et la surface discrète déjà utilisées par `--status-todo-*`.

- [ ] **Step 6: Lint et commit**

```bash
pnpm --filter web-v2 lint
git add apps/web-v2/src/lib/offer.ts apps/web-v2/src/lib/offer.test.ts apps/web-v2/src/lib/admin-list.ts apps/web-v2/src/lib/admin-list.test.ts apps/web-v2/src/lib/admin-members.ts apps/web-v2/src/lib/admin-members.test.ts apps/web-v2/src/styles/1-primitives.css apps/web-v2/src/styles/2-semantic.css
git commit -m "feat(v2): les règles de l'administration — l'offre, la liste dans l'adresse, les membres — et ses teintes"
```

---

### Task 5: La coquille de l'administration

**Files:**
- Create: `apps/web-v2/src/components/layout/AdminShell.tsx`
- Create: `apps/web-v2/src/components/ui/IconTile.tsx`, `TypeChip.tsx`, `OfferBadge.tsx`, `AdminCard.tsx`
- Create: `apps/web-v2/src/styles/3-components/admin-shell.css`, `admin-card.css`
- Modify: `apps/web-v2/src/styles/index.css` (importer les nouveaux fichiers comme les autres)
- Modify: `apps/web-v2/src/components/layout/Sidebar.tsx` (lien « Administration »)
- Modify: `apps/web-v2/src/App.tsx` (garde et routes)
- Modify: `apps/web-v2/src/components/layout/README.md`, `components/ui/README.md` (une ligne par fichier neuf)

**Interfaces:**
- Consumes: `useAuth().person?.role`, `ProBadge`, `offerOf` (Task 4).
- Produces:
  - `AdminShell({ children }: { children: ReactNode })`
  - `type Tone = 'terre' | 'prune' | 'bleu' | 'sauge' | 'ocre' | 'brique' | 'gris'`, `IconTile({ Icon, tone }: { Icon: LucideIcon; tone: Tone })`
  - `TypeChip({ type }: { type: string | null })` — `exposant` terre, `festival` prune, `entreprise` bleu, `null` « Sans enseigne » gris
  - `OfferBadge({ offer }: { offer: Offer })` — Pro (ProBadge) / Essai (bleu) / « Gratuit », puis le détail (brique si `alert`)
  - `AdminCard({ title, Icon, tone, action, children }: { title: string; Icon: LucideIcon; tone: Tone; action?: ReactNode; children: ReactNode })`
  - Routes `/admin` → `/admin/comptes`, `/admin/comptes`, `/admin/enseignes/:id`, `/admin/personnes/:id` (pages créées aux Tasks 6-8 ; ici des composants vides importés de leurs fichiers).

- [ ] **Step 1: La garde et les routes**

Dans `App.tsx`, après `ProtectedRoute` :
```tsx
/** L'administration : les admins seulement. Elle ne protège que l'affichage — chaque fonction
 *  admin_* refuse en base tout appel qui ne vient pas d'un admin. */
function AdminRoute({ children }: { children: ReactNode }) {
  const { person } = useAuth()
  if (!person) return null
  if (person.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function AdminPage({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminRoute>
        <AdminShell>{children}</AdminShell>
      </AdminRoute>
    </ProtectedRoute>
  )
}
```
Routes, **avant** `/:slug` (la vitrine) :
```tsx
<Route path="/admin" element={<Navigate to="/admin/comptes" replace />} />
<Route path="/admin/comptes" element={<AdminPage><AccountsPage /></AdminPage>} />
<Route path="/admin/enseignes/:id" element={<AdminPage><EntityPage /></AdminPage>} />
<Route path="/admin/personnes/:id" element={<AdminPage><PersonPage /></AdminPage>} />
```
Créer pour l'instant les trois pages minimales, chacune dans son dossier avec en-tête et `README.md` :
`features/admin-accounts/AccountsPage.tsx` → `export function AccountsPage() { return <h1 className="admin-page__title">Comptes</h1> }` (idem `features/admin-entity/EntityPage.tsx`, `features/admin-person/PersonPage.tsx`). Les vraies pages arrivent aux Tasks 6-8.

- [ ] **Step 2: La coquille**

`components/layout/AdminShell.tsx` :
```tsx
/**
 * QUOI     — la coquille de l'administration : la barre beige de l'app avec sa propre navigation,
 *            et le panneau blanc pleine largeur (maquettes « Admin — … », 2338:2).
 * POURQUOI — l'administration est un outil de travail : des tableaux larges, ni barre du haut ni
 *            mur d'affiche. Elle reprend les classes de la barre latérale pour en garder l'allure.
 * ATTENTION — seules les sections codées sont listées : Prospects arrive au lot 3, Signalements,
 *            Événements, Catégories et Témoignages au lot 4.
 */
import { ArrowLeft, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

const SECTIONS = [{ to: '/admin/comptes', label: 'Comptes', Icon: Users }] as const

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell admin-shell">
      <aside className="sidebar admin-shell__nav">
        <img className="sidebar__logo" src={`${import.meta.env.BASE_URL}icon.png`} alt="Fellowship" />
        <div className="admin-shell__badge">
          <span className="admin-shell__badge-title">Administration</span>
          <span className="admin-shell__badge-note">Réservé aux admins</span>
        </div>
        <nav className="sidebar__nav">
          {SECTIONS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'sidebar__item sidebar__item--active' : 'sidebar__item')}
            >
              <Icon className="sidebar__item-icon" size={24} strokeWidth={1.75} />
              <span className="sidebar__item-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <Link className="admin-shell__back" to="/">
          <ArrowLeft size={16} strokeWidth={1.75} />
          Revenir à l’application
        </Link>
      </aside>
      <main className="app-shell__main admin-shell__main">{children}</main>
    </div>
  )
}
```
`NavLink` sans `end` : « Comptes » reste actif sur `/admin/enseignes/…` ? Non — les fiches ont d'autres chemins. Ajouter `isActive || pathname.startsWith('/admin/enseignes') || pathname.startsWith('/admin/personnes')` via `useLocation()` pour que Comptes reste allumé sur les fiches.

`styles/3-components/admin-shell.css` : la largeur du panneau sans mur d'affiche (le panneau prend tout l'espace à droite de la barre), le padding du contenu (56 px dans la maquette → le jeton d'espace le plus proche de `1-primitives.css`), la pastille « Administration » (fond `--surface-card`, filet `--line-card`, rayon 10, textes 12/10 px), « Revenir à l'application » collé en bas de la barre (`margin-top: auto`, texte 12 px secondaire). Valeurs relevées sur `2338:2` avec `get_design_context`, traduites en jetons existants.

- [ ] **Step 3: Les briques**

`components/ui/IconTile.tsx` :
```tsx
/**
 * QUOI     — la petite pastille carrée teintée qui porte l'icône d'un bloc ou d'un chiffre.
 * POURQUOI — Uriel, 15/10/2026 : « un tout petit peu de couleur » pour s'y retrouver ; une teinte
 *            par sujet, toujours la même (abonnement terre, paiements sauge, activité bleu…).
 */
import type { LucideIcon } from 'lucide-react'

export type Tone = 'terre' | 'prune' | 'bleu' | 'sauge' | 'ocre' | 'brique' | 'gris'

export function IconTile({ Icon, tone }: { Icon: LucideIcon; tone: Tone }) {
  return (
    <span className={`icon-tile icon-tile--${tone}`} aria-hidden="true">
      <Icon size={16} strokeWidth={2} />
    </span>
  )
}
```
`components/ui/TypeChip.tsx` :
```tsx
/**
 * QUOI     — la pastille du type d'enseigne : exposant, festival, entreprise, ou sans enseigne.
 * POURQUOI — on distingue un festival d'un exposant d'un coup d'œil (maquette 2338:2).
 */
import type { Tone } from './IconTile'

const TYPES: Record<string, { label: string; tone: Tone }> = {
  exposant: { label: 'Exposant', tone: 'terre' },
  festival: { label: 'Festival', tone: 'prune' },
  entreprise: { label: 'Entreprise', tone: 'bleu' },
}

export function TypeChip({ type }: { type: string | null }) {
  const found = type ? TYPES[type] : undefined
  const { label, tone } = found ?? { label: 'Sans enseigne', tone: 'gris' }
  return <span className={`type-chip type-chip--${tone}`}>{label}</span>
}
```
`components/ui/OfferBadge.tsx` :
```tsx
/**
 * QUOI     — l'offre d'une enseigne en une ligne : la pastille Pro ou Essai, puis le détail.
 * POURQUOI — même lecture dans la liste et les fiches ; le calcul vit dans lib/offer.ts.
 */
import type { Offer } from '@/lib/offer'
import { ProBadge } from './ProBadge'

export function OfferBadge({ offer }: { offer: Offer }) {
  if (offer.kind === 'gratuit') return <span className="offer-badge__detail">Gratuit</span>
  return (
    <span className="offer-badge">
      {offer.kind === 'pro' ? <ProBadge /> : <span className="offer-badge__trial">Essai</span>}
      {offer.detail && (
        <span className={offer.alert ? 'offer-badge__detail offer-badge__detail--alert' : 'offer-badge__detail'}>
          {offer.detail}
        </span>
      )}
    </span>
  )
}
```
`components/ui/AdminCard.tsx` :
```tsx
/**
 * QUOI     — un bloc de fiche d'administration : carte blanche bordée, titre précédé de son icône
 *            teintée, une action à droite (« Corriger », « Tout voir »).
 * POURQUOI — les deux fiches (enseigne, personne) sont faites de ces blocs (maquettes 2342:2, 2344:2).
 */
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconTile, type Tone } from './IconTile'

interface AdminCardProps {
  title: string
  Icon: LucideIcon
  tone: Tone
  action?: ReactNode
  children: ReactNode
}

export function AdminCard({ title, Icon, tone, action, children }: AdminCardProps) {
  return (
    <section className="admin-card" aria-label={title}>
      <header className="admin-card__head">
        <IconTile Icon={Icon} tone={tone} />
        <h2 className="admin-card__title">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}
```
`styles/3-components/admin-card.css` : `.admin-card` (fond `--surface-card`, filet `--line-card`, rayon 16, padding 20/24, gap 16), `.admin-card__head` (rangée, gap 10, titre 16 px demi-gras qui pousse l'action à droite), `.icon-tile` (30 × 30, rayon 8, centré) et ses tons `.icon-tile--terre { background: var(--tone-terre-surface); color: var(--tone-terre-ink) }` pour les sept tons, `.type-chip` (11 px demi-gras, padding 2/7, rayon 6, fond `--tone-*-surface`, filet et encre `--tone-*-ink` adoucis comme `tag.css`), `.offer-badge`, `.offer-badge__trial` (fond/encre `--tone-bleu-*`), `.offer-badge__detail--alert` (encre `--tone-brique-ink`).

- [ ] **Step 4: L'entrée depuis l'app**

Dans `Sidebar.tsx`, après la boucle des entrées et avant « Revenir à la V1 » :
```tsx
{person?.role === 'admin' && (
  <NavLink to="/admin" className="sidebar__item">
    <ShieldCheck className="sidebar__item-icon" size={24} strokeWidth={1.75} />
    <span className="sidebar__item-label">Administration</span>
  </NavLink>
)}
```
(`const { actor, entities, person } = useAuth()` ; `ShieldCheck` importé de `lucide-react` ; mettre l'en-tête du fichier à jour : « Administration » pour les admins seulement.)

- [ ] **Step 5: Vérifier dans le navigateur**

Run: `pnpm dev:v2` puis, connecté en admin sur `http://localhost:5174/v2/` (ou après `pnpm deploy:v2` sur `https://flw.sh/v2/` — voir `.claude/rules/v2.md`, « Vérifier un écran de la V2 sans Uriel ») : le lien « Administration » est dans la barre, mène à `/admin/comptes`, la coquille ressemble au cadre de `2338:2`. Un compte `v2` non admin qui tape `/v2/admin` revient sur `/`.

- [ ] **Step 6: Lint, build, commit**

```bash
pnpm --filter web-v2 lint && pnpm --filter web-v2 build
git add apps/web-v2/src
git commit -m "feat(v2): la coquille de l'administration, réservée aux admins"
```

---

### Task 6: La liste des comptes

**Files:**
- Create: `apps/web-v2/src/features/admin-accounts/useAccounts.ts`, `AccountsStats.tsx`, `AccountsTools.tsx`, `EntitiesTable.tsx`, `PeopleTable.tsx`, `README.md`
- Modify: `apps/web-v2/src/features/admin-accounts/AccountsPage.tsx`
- Create: `apps/web-v2/src/styles/3-components/admin-table.css` (+ import dans `index.css`)

**Interfaces:**
- Consumes: RPC `admin_chiffres`, `admin_enseignes`, `admin_personnes`, `admin_membres`, `admin_filtres` (Task 2) ; `readAccountsQuery`, `writeAccountsQuery`, `filtersFor`, `PAGE_SIZE` ; `groupMembers`, `membersSummary`, `roleLabel` ; `offerOf` ; `TypeChip`, `OfferBadge`, `IconTile`, `Avatar`, `Segmented`.
- Produces: `AccountsPage()`.

- [ ] **Step 1: Le chargement**

`useAccounts.ts` :
```ts
/**
 * QUOI     — charge une page de la liste des comptes (enseignes ou personnes), ses quatre chiffres
 *            et, pour les enseignes, leurs membres.
 * POURQUOI — l'adresse décide (lib/admin-list.ts) ; la base filtre, cherche et pagine (admin_*).
 * ATTENTION — une erreur de la base s'affiche telle quelle : jamais une liste vide qui ment.
 */
import { useEffect, useState } from 'react'
import { groupMembers } from '@/lib/admin-members'
import type { AccountsQuery } from '@/lib/admin-list'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Fn = Database['public']['Functions']
export type Stats = Fn['admin_chiffres']['Returns'][number]
export type EntityRow = Fn['admin_enseignes']['Returns'][number]
export type PersonRow = Fn['admin_personnes']['Returns'][number]
export type MemberRow = Fn['admin_membres']['Returns'][number]

export type AccountsData =
  | { view: 'enseignes'; stats: Stats | null; rows: EntityRow[]; members: Map<string, MemberRow[]>; total: number }
  | { view: 'personnes'; stats: Stats | null; rows: PersonRow[]; total: number }

async function loadAccounts(query: AccountsQuery): Promise<AccountsData> {
  const args = { p_q: query.q, p_filtre: query.filter, p_page: query.page }
  const statsResponse = await supabase.rpc('admin_chiffres')
  const stats = must(statsResponse)[0] ?? null
  if (query.view === 'personnes') {
    const rows = must(await supabase.rpc('admin_personnes', args))
    return { view: 'personnes', stats, rows, total: Number(rows[0]?.total ?? 0) }
  }
  const rows = must(await supabase.rpc('admin_enseignes', args))
  const ids = rows.map((row) => row.actor_id)
  const members = ids.length ? must(await supabase.rpc('admin_membres', { p_entities: ids })) : []
  return { view: 'enseignes', stats, rows, members: groupMembers(members), total: Number(rows[0]?.total ?? 0) }
}

export function useAccounts(query: AccountsQuery) {
  const [state, setState] = useState<{ data: AccountsData | null; error: string | null }>({ data: null, error: null })
  const key = JSON.stringify(query)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadAccounts(JSON.parse(key) as AccountsQuery)
        if (cancelled) return
        setState({ data, error: null })
      } catch (error) {
        if (cancelled) return
        setState({ data: null, error: error instanceof Error ? error.message : 'Chargement impossible' })
      }
    }
    void run()
    return () => { cancelled = true }
  }, [key])
  return state
}
```
Si le lint refuse `JSON.parse(key) as AccountsQuery`, passer `query.view`, `query.q`, `query.filter`, `query.page` en dépendances de l'effet et appeler `loadAccounts(query)` directement (règle des hooks : `.claude/rules/dev.md`).

- [ ] **Step 2: La page**

`AccountsPage.tsx` :
```tsx
/**
 * QUOI     — la liste des comptes de l'administration : en-tête et bascule Enseignes / Personnes,
 *            quatre chiffres, recherche et filtres, tableau paginé (maquettes 2338:2 et 2340:2).
 * POURQUOI — c'est l'enseigne qu'on regarde le plus (Uriel, 15/10/2026) : vue par défaut.
 */
import { useSearchParams } from 'react-router-dom'
import { Segmented } from '@/components/ui/Segmented'
import { readAccountsQuery, writeAccountsQuery, type AccountsQuery, type AccountsView } from '@/lib/admin-list'
import { AccountsStats } from './AccountsStats'
import { AccountsTools } from './AccountsTools'
import { EntitiesTable } from './EntitiesTable'
import { PeopleTable } from './PeopleTable'
import { useAccounts } from './useAccounts'

export function AccountsPage() {
  const [search, setSearch] = useSearchParams()
  const query = readAccountsQuery(search)
  const { data, error } = useAccounts(query)
  const go = (next: Partial<AccountsQuery>) => setSearch(writeAccountsQuery({ ...query, page: 0, ...next }))
  const switchView = (view: AccountsView) =>
    setSearch(writeAccountsQuery({ view, q: query.q, filter: view === 'personnes' ? 'tous' : 'toutes', page: 0 }))

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Comptes</h1>
          <p className="admin-page__lede">
            {query.view === 'enseignes'
              ? 'Les enseignes, leur offre et les comptes qui les tiennent.'
              : 'Les personnes et leurs enseignes. Cherche, ouvre une fiche, corrige.'}
          </p>
        </div>
        <Segmented
          label="Lire par"
          options={[{ value: 'enseignes', label: 'Enseignes' }, { value: 'personnes', label: 'Personnes' }]}
          value={query.view}
          onChange={switchView}
        />
      </header>
      {data?.stats && <AccountsStats stats={data.stats} />}
      <AccountsTools query={query} onChange={go} />
      {error && <p className="admin-page__error">{error}</p>}
      {data?.view === 'enseignes' && <EntitiesTable rows={data.rows} members={data.members} />}
      {data?.view === 'personnes' && <PeopleTable rows={data.rows} />}
      {data && (
        <AccountsPager page={query.page} shown={data.rows.length} total={data.total} onPage={(page) => go({ page })} />
      )}
    </div>
  )
}
```
`AccountsPager` vit dans `AccountsTools.tsx` (export nommé) : « 1–50 sur 173 », « Précédents » si `page > 0`, « Voir les suivants » si `(page + 1) * PAGE_SIZE < total`.

- [ ] **Step 3: Chiffres et outils**

`AccountsStats.tsx` — quatre cartes, chacune `IconTile` + libellé, chiffre en Instrument Serif, ligne de détail :
| Libellé | Icône / ton | Chiffre | Détail |
| --- | --- | --- | --- |
| Comptes | `Users` / prune | `comptes` | `+{comptes_semaine} cette semaine` |
| Enseignes Pro | `Sparkles` / terre | `pro` | `dont {pro_offerts} offertes` |
| Essais en cours | `Hourglass` / bleu | `essais` | `{essais_bientot} finissent dans 3 jours` |
| Paiements en échec | `CircleAlert` / brique | `echecs` | `à relancer` (encre brique si `echecs > 0`, sinon « aucun ») |

`AccountsTools.tsx` — la recherche (`<input type="search">` contrôlé, appliqué à l'adresse sur Entrée ou 300 ms après la dernière frappe ; libellé « Nom, enseigne, e-mail ou téléphone »), les filtres (`filtersFor(query.view)` dans un `Segmented`, chaque libellé suivi de son nombre lu par `supabase.rpc('admin_filtres', { p_vue: query.view, p_q: query.q })` — « Pro · 38 »), le tri affiché « Les plus récents » (texte, seul tri).

- [ ] **Step 4: Les tableaux**

`EntitiesTable.tsx` — un `<table className="admin-table">` ; en-têtes Enseigne, Offre, Comptes reliés, Payée par, Activité ; chaque ligne est un lien vers `/admin/enseignes/:id` (la ligne entière cliquable : `<tr>` avec un `<Link>` dans la première cellule et `.admin-table__row-link` étendu à la ligne en CSS) :
- Enseigne : logo (`Avatar` carré, `className="admin-table__logo"` ; repli teinté du type), nom, `TypeChip` + ville.
- Offre : `<OfferBadge offer={offerOf(row, now)} />` (`now` = `new Date()` une fois par rendu).
- Comptes reliés : pile d'`Avatar` (3 au plus), `{nom du premier} · {roleLabel(role)}`, `membersSummary(members.length)`.
- Payée par : `paid_by_name`, sinon « Offert » si l'offre est Pro sans abonnement (`plan !== 'pro'`), sinon « — ».
- Activité : `{dates} dates · {avis} avis` (« 1 date », « 0 avis » omis).

`PeopleTable.tsx` — en-têtes Compte, Enseigne, Offre, Inscrit, Dernière venue, Activité ; ligne vers `/admin/personnes/:id` :
- Compte : `Avatar`, nom (ou « Sans prénom »), e-mail ; pastille « Suspendu » (ton brique) si `suspended_at`.
- Enseigne : nom + `TypeChip` ; sans enseigne : « — » et `TypeChip type={null}`.
- Offre : `OfferBadge` si une enseigne, sinon « Gratuit ».
- Inscrit : `formatDayMonthShort` + année si différente (lire `lib/dates.ts` : `formatFullDate` s'il convient).
- Dernière venue : `timeAgo(new Date(last_sign_in_at), now)` (lib/dates.ts), « jamais » si nul.
- Activité : `{dates} dates · {avis} avis`.

`admin-table.css` : carte blanche bordée (rayon 16), en-têtes 12 px tertiaires, lignes séparées d'un filet, survol `--surface-hover` (le même que les lignes de « Mes dossiers »), cellules alignées au centre, chevron discret en fin de ligne. Valeurs relevées sur `2338:2`.

- [ ] **Step 5: Lint et build**

Run: `pnpm --filter web-v2 lint && pnpm --filter web-v2 build`
Expected : 0 erreur.

- [ ] **Step 6: Comparer à la maquette et tester la recherche** — Review Focus 2

`pnpm deploy:v2`, puis dans le navigateur d'Uriel (`https://flw.sh/v2/admin/comptes`) : capture de la page à côté de `get_screenshot` de `2338:2`, puis `?vue=personnes` à côté de `2340:2` ; reprendre chaque écart (tailles, couleurs, alignements). Chercher « chene », « CHÊNE », un e-mail partiel, quatre chiffres d'un téléphone connu (après Task 10) ; changer de filtre, de vue, de page, revenir en arrière : l'adresse suit.

- [ ] **Step 7: Commit**

```bash
git add apps/web-v2/src
git commit -m "feat(v2): la liste des comptes de l'administration, par enseigne et par personne"
```

---

### Task 7: La fiche d'une enseigne (lecture)

**Files:**
- Create: `apps/web-v2/src/features/admin-entity/useAdminEntity.ts`, `SubscriptionCard.tsx`, `ActivityCard.tsx`, `MembersCard.tsx`, `EntityInfoCard.tsx`, `README.md`
- Modify: `apps/web-v2/src/features/admin-entity/EntityPage.tsx`
- Create: `apps/web-v2/src/styles/3-components/admin-sheet.css` (+ import)

**Interfaces:**
- Consumes: RPC `admin_enseigne`, `admin_membres`, `admin_gestes` ; `offerOf`, `roleLabel` ; `AdminCard`, `TypeChip`, `ProBadge`, `Avatar` ; `formatPrice` (lib/money.ts), `proPriceLines` ou les prix de `lib/pricing.ts`.
- Produces: `EntityPage()` ; `useAdminEntity(id: string): { data: EntitySheet | null; error: string | null; reload: () => void }` avec `EntitySheet = { entity: Fn['admin_enseigne']['Returns'][number]; members: MemberRow[]; gestures: Fn['admin_gestes']['Returns'] }`.

- [ ] **Step 1: Le chargement**

```ts
/**
 * QUOI     — charge la fiche d'une enseigne : ses champs, ses comptes reliés, ses derniers gestes.
 * POURQUOI — trois fonctions admin_* gardées en base ; `reload` relit après une correction.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Fn = Database['public']['Functions']
export type EntityFields = Fn['admin_enseigne']['Returns'][number]
export type MemberRow = Fn['admin_membres']['Returns'][number]
export type Gesture = Fn['admin_gestes']['Returns'][number]
export interface EntitySheet { entity: EntityFields; members: MemberRow[]; gestures: Gesture[] }

async function loadEntity(id: string): Promise<EntitySheet | null> {
  const response = await supabase.rpc('admin_enseigne', { p_id: id })
  const entity = must(response)[0]
  if (!entity) return null
  const [members, gestures] = await Promise.all([
    supabase.rpc('admin_membres', { p_entities: [id] }),
    supabase.rpc('admin_gestes', { p_actors: [id] }),
  ])
  return { entity, members: must(members), gestures: must(gestures) }
}

export function useAdminEntity(id: string) {
  const [state, setState] = useState<{ data: EntitySheet | null; error: string | null }>({ data: null, error: null })
  const [round, setRound] = useState(0)
  const reload = useCallback(() => setRound((r) => r + 1), [])
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadEntity(id)
        if (cancelled) return
        setState({ data, error: data ? null : 'Enseigne introuvable' })
      } catch (error) {
        if (cancelled) return
        setState({ data: null, error: error instanceof Error ? error.message : 'Chargement impossible' })
      }
    }
    void run()
    return () => { cancelled = true }
  }, [id, round])
  return { ...state, reload }
}
```

- [ ] **Step 2: La page et ses blocs** (maquette `2342:2`)

`EntityPage.tsx` : lien retour « Comptes » (`Link` vers `/admin/comptes`), en-tête (logo 72 px, nom en `--type-display-*`, `ProBadge` si Pro, `TypeChip`, `{ville} · créée le {formatFullDate}`, lien de vitrine `flw.sh/{public_slug}` ouvert dans un nouvel onglet ; boutons « Voir la vitrine » (lien `/{public_slug}`) et « Modifier » qui passe `EntityInfoCard` en correction — Task 10), puis deux colonnes : principale (Abonnement, Paiements — Task 12, Activité), latérale 440 px (Comptes reliés, Notes internes — Task 9, Informations).

- `SubscriptionCard` (`CreditCard`, terre) : trois colonnes Offre (`Pro annuel`/`Pro mensuel`/`Essai`/`Gratuit` en serif, prix dessous lu dans `lib/pricing.ts`), Prochain renouvellement (`current_period_end`, « dans N mois » ; « — » sans abonnement), Payée par (`paid_by_name`, « propriétaire » si c'est le propriétaire ; sinon l'e-mail du client Stripe — Task 12 ; sinon « — »). Puis lignes : Parrainage (`Parrainée par {parrain_nom}` · `a parrainé {filleuls} enseignes`, « — » si rien), Mois offerts (`offerOf` si offert, sinon « Aucun en cours »), Remise (`discount_label` jusqu'au `discount_end`, sinon « Aucune »), Ambassadeur (Oui/Non). Les boutons d'action arrivent Task 11. « Ouvrir dans Stripe ↗ » : `https://dashboard.stripe.com/customers/{stripe_customer_id}`, seulement si l'id existe.
- `ActivityCard` (`Activity`, bleu) : cinq tuiles (dates suivies, avis écrits, bilans, fiches créées, abonnés), puis les `gestures` : `timeAgo(quand)` + `quoi`.
- `MembersCard` (`Users`, prune) : chaque membre, avatar 40, nom, e-mail, `roleLabel(role)` + « · paie l'abonnement » si `actor_id === paid_by_user` ; lien vers `/admin/personnes/:id`. « Aucun compte relié » si vide.
- `EntityInfoCard` (`Info`, gris) en lecture : Nom, Type (`TypeChip` + `craft_type`), Ville, Vitrine, Raison sociale, SIREN, Téléphone (celui du propriétaire, lu dans `members`). Action « Corriger » (Task 10).

`admin-sheet.css` : la page (retour, en-tête, deux colonnes 1fr / 440 px), les rangées clé/valeur (libellé 150 px secondaire, valeur moyenne), les tuiles d'activité (fond `--surface-subtle`, rayon 12, chiffre serif 28), les membres. Valeurs relevées sur `2342:2`.

- [ ] **Step 3: Lint, build, déploiement, comparaison**

```bash
pnpm --filter web-v2 lint && pnpm --filter web-v2 build && pnpm deploy:v2
```
Ouvrir une enseigne depuis la liste : capture à côté de `get_screenshot` de `2342:2`, reprendre les écarts. Une enseigne sans abonnement, une en essai, une offerte : chaque bloc dit vrai.

- [ ] **Step 4: Commit**

```bash
git add apps/web-v2/src
git commit -m "feat(v2): la fiche d'une enseigne dans l'administration"
```

---

### Task 8: La fiche d'une personne (lecture)

**Files:**
- Create: `apps/web-v2/src/features/admin-person/useAdminPerson.ts`, `PersonEntitiesCard.tsx`, `PersonActivityCard.tsx`, `AccessCard.tsx`, `PersonInfoCard.tsx`, `README.md`
- Modify: `apps/web-v2/src/features/admin-person/PersonPage.tsx`

**Interfaces:**
- Consumes: RPC `admin_personne`, `admin_enseignes_de`, `admin_gestes` ; `offerOf`, `roleLabel` ; `AdminCard`, `TypeChip`, `OfferBadge`, `Avatar`, `Segmented`.
- Produces: `PersonPage()` ; `useAdminPerson(id): { data: PersonSheet | null; error; reload }` avec `PersonSheet = { person: Fn['admin_personne']['Returns'][number]; entities: Fn['admin_enseignes_de']['Returns']; gestures: Gesture[] }`. `admin_gestes` reçoit `[id, ...entities.map(e => e.entity_id)]`.

- [ ] **Step 1: Le chargement** — même patron que `useAdminEntity` (Task 7, étape 1), avec `admin_personne` puis, en parallèle, `admin_enseignes_de({ p_person: id })` ; `admin_gestes` après, sur la personne et ses enseignes.

- [ ] **Step 2: La page et ses blocs** (maquette `2344:2`)

En-tête : avatar 72, nom en serif, pastille du rôle (« Utilisateur », « V2 », « Admin » ; « Suspendu » en brique si `suspended_at`), ligne `{email} · @{handle} · inscrit le {date} · dernière venue {timeAgo}`. Colonne principale : Enseignes, Activité, Accès ; latérale : Notes internes (Task 9), Informations.
- `PersonEntitiesCard` (`Store`, prune) : logo, nom, `OfferBadge`, `TypeChip` + ville, `roleLabel(role)` + « · paie l'abonnement » si `paid_by_user === id` ; lien vers la fiche de l'enseigne. « Aucune enseigne — arrivée non finie » si vide.
- `PersonActivityCard` (`Activity`, bleu) : dates suivies, avis, questions et réponses, fiches créées ; derniers gestes.
- `AccessCard` (`ShieldCheck`, brique) en lecture pour l'instant : le rôle affiché dans un `Segmented` désactivé (Task 10 l'active), la phrase « « V2 » ouvre la nouvelle application, « Admin » ouvre aussi cette administration. », les rangées Suspendre / Supprimer avec leurs phrases et leurs boutons désactivés (Task 13 les branche).
- `PersonInfoCard` (`Info`, gris) : Prénom, E-mail, Téléphone, Identifiant, Code postal (· ville), Notifications (« coupées » si `push_muted`, sinon « actives »), Connexion (« Code par e-mail »).

- [ ] **Step 3: Lint, build, déploiement, comparaison avec `2344:2`.**

- [ ] **Step 4: Commit**

```bash
git add apps/web-v2/src
git commit -m "feat(v2): la fiche d'une personne dans l'administration"
```

---

### Task 9: Les notes internes et les étiquettes

**Files:**
- Create: `apps/web-v2/src/lib/useAdminNotes.ts`
- Create: `apps/web-v2/src/components/ui/NotesCard.tsx`, `apps/web-v2/src/styles/3-components/admin-notes.css` (+ import)
- Modify: `EntityPage.tsx`, `PersonPage.tsx` (poser `<NotesCard actorId={id} />` dans la colonne latérale)

**Interfaces:**
- Consumes: tables `admin_notes`, `admin_labels` (RLS admin) ; `useAuth().person`.
- Produces: `useAdminNotes(actorId: string): { notes: Note[]; labels: string[]; error: string | null; addNote(body: string): Promise<void>; addLabel(label: string): Promise<void>; removeLabel(label: string): Promise<void> }` ; `Note = { id: string; body: string; created_at: string; author: string | null }`.

- [ ] **Step 1: Le hook**

```ts
/**
 * QUOI     — les notes internes et les étiquettes d'un acteur (enseigne ou personne).
 * POURQUOI — ce que l'équipe sait d'un compte et que le compte ne voit jamais (RLS : admins seuls).
 * ATTENTION — l'auteur est lu dans actor_public (users ne se lit plus que sur sa propre ligne).
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth'
import { must, supabase } from './supabase'

export interface Note { id: string; body: string; created_at: string; author: string | null }

async function loadNotes(actorId: string): Promise<{ notes: Note[]; labels: string[] }> {
  const [notes, labels] = await Promise.all([
    supabase.from('admin_notes').select('id, body, created_at, author_user_id')
      .eq('actor_id', actorId).order('created_at', { ascending: false }).order('id'),
    supabase.from('admin_labels').select('label').eq('actor_id', actorId).order('created_at').order('label'),
  ])
  const rows = must(notes)
  const authorIds = [...new Set(rows.flatMap((n) => (n.author_user_id ? [n.author_user_id] : [])))]
  const authors = authorIds.length
    ? must(await supabase.from('actor_public').select('actor_id, label').in('actor_id', authorIds))
    : []
  const names = new Map(authors.flatMap((a) => (a.actor_id ? [[a.actor_id, a.label]] : [])))
  return {
    notes: rows.map((n) => ({ id: n.id, body: n.body, created_at: n.created_at, author: n.author_user_id ? (names.get(n.author_user_id) ?? null) : null })),
    labels: must(labels).map((l) => l.label),
  }
}

export function useAdminNotes(actorId: string) {
  const { person } = useAuth()
  const [state, setState] = useState<{ notes: Note[]; labels: string[]; error: string | null }>({ notes: [], labels: [], error: null })
  const [round, setRound] = useState(0)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadNotes(actorId)
        if (cancelled) return
        setState({ ...data, error: null })
      } catch (error) {
        if (cancelled) return
        setState((s) => ({ ...s, error: error instanceof Error ? error.message : 'Chargement impossible' }))
      }
    }
    void run()
    return () => { cancelled = true }
  }, [actorId, round])

  const write = useCallback(async (job: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await job
    if (error) throw new Error(error.message)
    setRound((r) => r + 1)
  }, [])

  return {
    ...state,
    addNote: (body: string) => write(supabase.from('admin_notes').insert({ actor_id: actorId, body: body.trim(), author_user_id: person?.actor_id ?? null })),
    addLabel: (label: string) => write(supabase.from('admin_labels').insert({ actor_id: actorId, label: label.trim() })),
    removeLabel: (label: string) => write(supabase.from('admin_labels').delete().eq('actor_id', actorId).eq('label', label)),
  }
}
```

- [ ] **Step 2: Le bloc** — `NotesCard({ actorId })` dans un `AdminCard` (`StickyNote`, ocre) : les étiquettes en pastilles (×  pour retirer au survol), « + Étiquette » ouvre un petit champ (Entrée ajoute, Échap annule) ; les notes (fond `--surface-subtle`, « {auteur} · {formatDayMonthShort} », le texte) ; « Ajouter une note… » est un `<textarea>` d'une ligne qui grandit, Ctrl+Entrée ou un bouton « Ajouter » enregistre. Erreur affichée sous le bloc. Apparition animée (`@starting-style`, jetons `--duration-*`), comme les autres listes de la V2.

- [ ] **Step 3: Vérifier** — sur le **compte de test** : ajouter une note et une étiquette, recharger, elles restent ; les retirer (l'étiquette) ; un compte non admin ne les lit pas (`curl` Task 1, étape 4).

- [ ] **Step 4: Lint, build, commit**

```bash
pnpm --filter web-v2 lint && pnpm --filter web-v2 build
git add apps/web-v2/src
git commit -m "feat(v2): les notes internes et les étiquettes d'un compte"
```

---

### Task 10: Corriger, et changer le rôle

**Files:**
- Modify: `EntityInfoCard.tsx`, `PersonInfoCard.tsx`, `AccessCard.tsx`, `EntityPage.tsx`, `PersonPage.tsx`

**Interfaces:**
- Consumes: RPC `admin_corriger_enseigne`, `admin_corriger_personne` (Task 3) ; `supabase.from('users').update({ role })` (policy `admin_update_users` + déclencheur `protect_user_role`) ; `reload()` des hooks de fiche.
- Produces: `EntityInfoCard({ entity, ownerPhone, editing, onEdit, onDone })`, `PersonInfoCard({ person, editing, onEdit, onDone })`.

- [ ] **Step 1: Le mode correction** — « Corriger » (ou « Modifier » de l'en-tête) rend chaque valeur modifiable en place (`Input` de `components/ui/Field.tsx`), avec « Enregistrer » (bouton solide) et « Annuler ». Enseigne : nom (requis), métier, ville, adresse de vitrine, raison sociale, SIREN. Personne : prénom, identifiant, téléphone, code postal. L'e-mail se corrige à la Task 13 (il change aussi l'adresse de connexion). Enregistrer :

```ts
const { error } = await supabase.rpc('admin_corriger_enseigne', {
  p_id: entity.actor_id, p_brand_name: form.brandName, p_craft_type: form.craftType,
  p_city: form.city, p_public_slug: form.slug, p_legal_name: form.legalName, p_siren: form.siren,
})
if (error) setError(error.code === '23505' ? 'Cette adresse de vitrine est déjà prise.' : error.message)
else { onDone(); reload() }
```
(`admin_corriger_personne` : `p_display_name`, `p_handle`, `p_phone`, `p_postal_code` ; `23505` → « Cet identifiant est déjà pris. »)

- [ ] **Step 2: Le rôle** — dans `AccessCard`, le `Segmented` Utilisateur / V2 / Admin devient actif, sauf sur sa propre fiche (`person.actor_id === useAuth().person?.actor_id` : désactivé, « Ton propre rôle ne se change pas ici. »). Passer à « Admin » demande une confirmation en une phrase dans la carte (« Donner l'administration à {prénom} ? » Confirmer / Annuler). Enregistrer :

```ts
const values = { utilisateur: 'user', v2: 'v2', admin: 'admin' } as const
const { error } = await supabase.from('users').update({ role: values[choice] }).eq('actor_id', person.actor_id)
```
Puis `reload()` et vérifier que le rôle relu est bien le nouveau (le déclencheur ramène silencieusement l'ancien si l'appelant n'est pas admin) ; sinon afficher « Le rôle n'a pas changé. »

- [ ] **Step 3: Vérifier** — sur le compte de test : corriger un nom, une ville, une adresse de vitrine déjà prise (message), un téléphone (puis le retrouver par la recherche de la liste, Review Focus 2) ; passer le rôle de `user` à `v2` puis revenir.

- [ ] **Step 4: Lint, build, commit**

```bash
pnpm --filter web-v2 lint && pnpm --filter web-v2 build
git add apps/web-v2/src
git commit -m "feat(v2): corriger une enseigne ou une personne, et changer un rôle, depuis l'administration"
```

---

### Task 11: Offrir des mois et ambassadeur

**Files:**
- Modify: `apps/web-v2/src/features/admin-entity/SubscriptionCard.tsx`
- Create: `apps/web-v2/src/features/admin-entity/GiftMonths.tsx`

**Interfaces:**
- Consumes: RPC `admin_offrir_mois(p_entity, p_mois)`, `admin_ambassadeur(p_entity, p_oui)` ; `reload()`.

- [ ] **Step 1: Les boutons** — sous les rangées de l'Abonnement : « Offrir des mois » (`Gift`), « Poser une remise » (`Percent`, branché Task 12), « Passer ambassadeur » / « Retirer ambassadeur » (`Star`). Boutons secondaires blancs bordés, comme la maquette.

- [ ] **Step 2: Offrir des mois** — `GiftMonths` : un petit panneau qui s'ouvre sous les boutons (glisse, `--ease-drawer`) : « Offrir » + un `Select` de 1 à 12 mois + « jusqu'au {date calculée} » (aperçu : `max(aujourd'hui, comped_pro_until) + n mois`, calculé par une fonction pure `giftEnd(current: string | null, months: number, now: Date): Date` ajoutée à `lib/offer.ts` **avec son test** dans `offer.test.ts`) + « Offrir ». Appel :
```ts
const { error } = await supabase.rpc('admin_offrir_mois', { p_entity: entity.actor_id, p_mois: months })
```
Test à ajouter dans `offer.test.ts` :
```ts
describe('giftEnd', () => {
  it('part d’aujourd’hui sans Pro offert', () => {
    expect(giftEnd(null, 2, new Date(2026, 9, 15))).toEqual(new Date(2026, 11, 15))
  })
  it('prolonge un Pro offert encore futur', () => {
    expect(giftEnd(new Date(2026, 11, 31).toISOString(), 1, new Date(2026, 9, 15))).toEqual(new Date(2027, 0, 31))
  })
})
```
Implémentation (dans `offer.ts`, via `monthsAhead` de `lib/dates.ts` si son comportement colle — sinon `setMonth`) :
```ts
export function giftEnd(current: string | null, months: number, now: Date): Date {
  const start = current && new Date(current) > now ? new Date(current) : now
  const end = new Date(start)
  end.setMonth(end.getMonth() + months)
  return end
}
```

- [ ] **Step 3: Ambassadeur** — un clic bascule, avec confirmation pour retirer : `supabase.rpc('admin_ambassadeur', { p_entity, p_oui: !entity.is_ambassador })`, puis `reload()`.

- [ ] **Step 4: Vérifier** — `pnpm --filter web-v2 test -- offer` (PASS) ; sur l'enseigne **de test** : offrir 1 mois, la ligne « Mois offerts » et l'offre de la liste changent ; ambassadeur oui puis non. Remettre l'état d'origine (avec Uriel).

- [ ] **Step 5: Lint, build, commit**

```bash
pnpm --filter web-v2 lint && pnpm --filter web-v2 build
git add apps/web-v2/src
git commit -m "feat(v2): offrir des mois de Pro et nommer un ambassadeur depuis l'administration"
```

---

### Task 12: Stripe — paiements, remise, et qui paie

**Files:**
- Create: `supabase/functions/admin-stripe/index.ts`
- Modify: `supabase/config.toml` (bloc `[functions.admin-stripe]`)
- Modify: `supabase/functions/stripe-checkout-session/index.ts:144` et `:159` (métadonnées)
- Modify: `supabase/functions/stripe-webhook/index.ts` (`syncSubscriptionToDB`, ~`:203`)
- Create: `apps/web-v2/src/lib/admin-functions.ts`
- Create: `apps/web-v2/src/features/admin-entity/PaymentsCard.tsx`, `DiscountPicker.tsx`
- Modify: `SubscriptionCard.tsx`, `EntityPage.tsx`

**Interfaces:**
- Produces (Edge `admin-stripe`, POST, jeton d'un admin) :
  - `{ action: 'paiements', entityId }` → `{ customerEmail: string | null, invoices: { id, date, amountCents, label, status, url }[] }`
  - `{ action: 'coupons' }` → `{ coupons: { id, name, percentOff, amountOff, duration, months }[] }`
  - `{ action: 'remise', entityId, couponId }` → `{ done: true }` ; 409 `no_subscription`
- Produces (front) : `fetchPayments(entityId): Promise<Payments>`, `fetchCoupons(): Promise<Coupon[]>`, `applyCoupon(entityId, couponId): Promise<void>` dans `lib/admin-functions.ts`.

- [ ] **Step 1: La fonction Edge**

```ts
// admin-stripe : ce que la fiche d'une enseigne lit et pose chez Stripe (administration V2, lot 2).
// Auth : verify_jwt = true, puis is_admin() sur le jeton de l'appelant — sinon 403.
// Actions : paiements (factures du client et son e-mail), coupons (ceux qui existent chez Stripe),
// remise (applique un coupon à l'abonnement ; le webhook remplit ensuite discount_label).
// Spec : docs/superpowers/specs/2026-10-15-v2-admin-lot-2-comptes-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getStripe } from '../_shared/stripe.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

type Body =
  | { action: 'paiements'; entityId: string }
  | { action: 'coupons' }
  | { action: 'remise'; entityId: string; couponId: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (isAdmin !== true) return json({ error: 'forbidden' }, 403)

  const body = (await req.json().catch(() => ({}))) as Body
  const stripe = getStripe()
  try {
    if (body.action === 'coupons') {
      const list = await stripe.coupons.list({ limit: 100 })
      return json({
        coupons: list.data.filter((c) => c.valid).map((c) => ({
          id: c.id, name: c.name ?? c.id, percentOff: c.percent_off, amountOff: c.amount_off,
          duration: c.duration, months: c.duration_in_months,
        })),
      })
    }

    const { data: entity, error } = await getSupabaseAdmin().from('entities')
      .select('stripe_customer_id, stripe_subscription_id').eq('actor_id', body.entityId).maybeSingle()
    if (error) throw error
    if (!entity) return json({ error: 'not_found' }, 404)

    if (body.action === 'paiements') {
      if (!entity.stripe_customer_id) return json({ customerEmail: null, invoices: [] })
      const [customer, invoices] = await Promise.all([
        stripe.customers.retrieve(entity.stripe_customer_id),
        stripe.invoices.list({ customer: entity.stripe_customer_id, limit: 24 }),
      ])
      return json({
        customerEmail: 'deleted' in customer ? null : customer.email,
        invoices: invoices.data.map((i) => ({
          id: i.id,
          date: new Date(i.created * 1000).toISOString(),
          amountCents: i.subtotal_excluding_tax ?? i.subtotal,
          label: i.lines.data[0]?.description ?? '',
          status: i.status,
          url: i.hosted_invoice_url,
        })),
      })
    }

    if (body.action === 'remise') {
      if (!entity.stripe_subscription_id) return json({ error: 'no_subscription' }, 409)
      await stripe.subscriptions.update(entity.stripe_subscription_id, { discounts: [{ coupon: body.couponId }] })
      return json({ done: true })
    }
    return json({ error: 'invalid_action' }, 400)
  } catch (err) {
    console.error('[admin-stripe]', err)
    return json({ error: 'failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
```
`config.toml` :
```toml
[functions.admin-stripe]
# Auth = le jeton d'un admin (is_admin() vérifié dans la fonction).
verify_jwt = true
```
Vérifier en copie isolée (`.claude/rules/dev.md`, « Deno réécrit le package.json ») : `_shared/` et `admin-stripe/` dans le dossier temporaire avec `deno.json` `{"nodeModulesDir":"auto"}`, puis `npx --prefix <dépôt> --no-install deno check admin-stripe/index.ts`. Seule l'erreur connue de version d'API Stripe est tolérée.

- [ ] **Step 2: Qui paie**

`stripe-checkout-session/index.ts`, dans `subscription_data.metadata` **et** `metadata` de la session :
```ts
metadata: { entity_actor_id: entity.actor_id, paid_by_user: user.id },
```
`stripe-webhook/index.ts`, dans `syncSubscriptionToDB`, ajouter au `.update({...})` :
```ts
...(sub.metadata?.paid_by_user ? { paid_by_user: sub.metadata.paid_by_user } : {}),
```
(on n'efface jamais un payeur connu ; le client service contourne `protect_entity_plan`.)

- [ ] **Step 3: Déployer les trois fonctions**

```bash
for f in admin-stripe stripe-checkout-session stripe-webhook; do node_modules/supabase/bin/supabase.exe functions deploy $f --project-ref trbxpsknbtisqwefqoub; done
```
Puis vérifier que le code déployé contient la nouveauté (`.claude/rules/supabase.md`, « reference_edge_function_deploy_gotcha ») : `get_edge_function` du MCP Supabase, ou relire la sortie du déploiement. Un appel sans jeton admin :
```bash
curl -s -X POST "$U/functions/v1/admin-stripe" -H "apikey: $K" -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{"action":"coupons"}'
```
Expected : `{"error":"forbidden"}`.

- [ ] **Step 4: Le front**

`lib/admin-functions.ts` :
```ts
/**
 * QUOI     — les appels de l'administration aux fonctions serveur (admin-stripe, admin-compte,
 *            delete-account) et la forme de leurs réponses.
 * POURQUOI — un seul endroit qui connaît leurs noms et leurs corps ; les écrans n'appellent que ça.
 */
import { supabase } from './supabase'

export interface Invoice { id: string; date: string; amountCents: number; label: string; status: string | null; url: string | null }
export interface Payments { customerEmail: string | null; invoices: Invoice[] }
export interface Coupon { id: string; name: string; percentOff: number | null; amountOff: number | null; duration: string; months: number | null }

async function call<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error || data === null) throw new Error(error?.message ?? 'La fonction n’a rien rendu')
  return data
}

export const fetchPayments = (entityId: string) => call<Payments>('admin-stripe', { action: 'paiements', entityId })
export const fetchCoupons = () => call<{ coupons: Coupon[] }>('admin-stripe', { action: 'coupons' }).then((r) => r.coupons)
export const applyCoupon = (entityId: string, couponId: string) =>
  call<{ done: true }>('admin-stripe', { action: 'remise', entityId, couponId }).then(() => undefined)
```
`PaymentsCard` (`Receipt`, sauge) : se charge à part (un échec Stripe n'empêche pas la fiche) ; tableau Date (`formatFullDate`), Montant (`formatPrice(amountCents)` + « HT »), Pour (`label`), État (`paid` → « Payé » sauge, `open` → « À payer », `void` → « Annulé », `uncollectible` → « Impayé » brique, sinon le statut brut) ; 4 lignes, « Tout voir » déplie le reste ; lien vers la facture Stripe (`url`) sur la date. « Aucun paiement » sans client. `customerEmail` remonte à `SubscriptionCard` pour « Payée par » quand `paid_by_name` est vide.

`DiscountPicker` : « Poser une remise » ouvre la liste des coupons (`fetchCoupons`), chacun « {name} — {percentOff} % » ou « {amountOff/100} € » et sa durée (« 2 mois », « une fois », « pour toujours ») ; choisir puis « Appliquer » → `applyCoupon`, message « Remise posée : elle apparaît ici dès que Stripe a prévenu Fellowship (quelques secondes). », puis `reload()` après 3 s. Désactivé sans abonnement (« Pas d'abonnement Stripe en cours »). Créer un coupon se fait dans Stripe : lien « Créer un coupon dans Stripe ↗ » (`https://dashboard.stripe.com/coupons/create`).

- [ ] **Step 5: Vérifier** — fiche d'une enseigne abonnée (lecture seule) : les factures correspondent à celles du tableau de bord Stripe. La remise : uniquement sur l'abonnement **de test**, avec Uriel. Un nouvel abonnement de test : `paid_by_user` est rempli après le webhook.

- [ ] **Step 6: Lint, build, commit**

```bash
pnpm --filter web-v2 lint && pnpm --filter web-v2 build
git add supabase/functions supabase/config.toml apps/web-v2/src
git commit -m "feat(admin): les paiements Stripe d'une enseigne, poser une remise, et retenir qui paie"
```

---

### Task 13: Suspendre, réactiver, changer l'e-mail, supprimer

**Files:**
- Create: `supabase/functions/admin-compte/index.ts`
- Modify: `supabase/config.toml` (bloc `[functions.admin-compte]`)
- Modify: `supabase/functions/delete-account/index.ts`
- Modify: `apps/web-v2/src/lib/admin-functions.ts`, `AccessCard.tsx`, `PersonInfoCard.tsx`

**Interfaces:**
- Produces (Edge `admin-compte`) : `{ action: 'suspendre' | 'reactiver', userId }` → `{ done: true }` ; `{ action: 'email', userId, email }` → `{ done: true }` ; 400 `self` si `userId` est l'appelant.
- Produces (`delete-account`) : `{ confirm, userId? }` — `userId` différent de l'appelant exige `is_admin()`, sinon 403.
- Produces (front) : `suspendAccount(userId)`, `reactivateAccount(userId)`, `changeEmail(userId, email)`, `previewDeletion(userId)`, `deleteAccount(userId)`.

- [ ] **Step 1: La fonction `admin-compte`** — Review Focus 4

```ts
// admin-compte : suspendre, réactiver ou changer l'e-mail de connexion d'un compte (administration V2).
// Auth : verify_jwt = true, puis is_admin() — sinon 403. Jamais sur soi-même (400 self).
// Suspendre = bannir chez Supabase (plus de connexion) + dater users.suspended_at ; le contenu reste.
// Spec : docs/superpowers/specs/2026-10-15-v2-admin-lot-2-comptes-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

type Body =
  | { action: 'suspendre' | 'reactiver'; userId: string }
  | { action: 'email'; userId: string; email: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (isAdmin !== true) return json({ error: 'forbidden' }, 403)

  const body = (await req.json().catch(() => ({}))) as Body
  if (!body.userId) return json({ error: 'invalid_body' }, 400)
  if (body.userId === user.id) return json({ error: 'self' }, 400)

  const admin = getSupabaseAdmin()
  try {
    if (body.action === 'suspendre' || body.action === 'reactiver') {
      const suspend = body.action === 'suspendre'
      const { error } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: suspend ? '876000h' : 'none' })
      if (error) throw error
      const { error: dbError } = await admin.from('users')
        .update({ suspended_at: suspend ? new Date().toISOString() : null }).eq('actor_id', body.userId)
      if (dbError) throw dbError
      return json({ done: true })
    }
    if (body.action === 'email') {
      const email = body.email.trim().toLowerCase()
      if (!EMAIL.test(email)) return json({ error: 'invalid_email' }, 400)
      const { error } = await admin.auth.admin.updateUserById(body.userId, { email, email_confirm: true })
      if (error) return json({ error: error.message.includes('already') ? 'email_taken' : 'failed' }, error.message.includes('already') ? 409 : 500)
      const { error: dbError } = await admin.from('users').update({ email }).eq('actor_id', body.userId)
      if (dbError) throw dbError
      return json({ done: true })
    }
    return json({ error: 'invalid_action' }, 400)
  } catch (err) {
    console.error('[admin-compte]', err)
    return json({ error: 'failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
```
`config.toml` : `[functions.admin-compte]` `verify_jwt = true` (commentaire : jeton d'un admin).

- [ ] **Step 2: `delete-account` pour un admin**

Remplacer la lecture du corps et la cible :
```ts
const body = (await req.json().catch(() => ({}))) as { confirm?: unknown; userId?: unknown }
// Seul un vrai `true` supprime : « "false" » ou « 1 » ne rendent que l'aperçu.
const confirm = body.confirm === true
// Un admin peut viser un autre compte (administration V2, lot 2) ; jamais une personne ordinaire.
let targetId = user.id
if (typeof body.userId === 'string' && body.userId !== user.id) {
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (isAdmin !== true) return json({ error: 'forbidden' }, 403)
  targetId = body.userId
}
```
puis remplacer **chaque** `user.id` qui suit par `targetId` (`readMemberships`, `deletionPlan`, les deux `removeFolder` de la personne, la suppression de `actors`, `deleteUser`). Mettre l'en-tête du fichier à jour (« ou, pour un admin, celui qu'il vise »). `deletion-plan.ts` ne change pas.

- [ ] **Step 3: Vérifier et déployer**

Copie isolée et `deno check` (Task 12, étape 1) pour `admin-compte` et `delete-account`. Puis :
```bash
for f in admin-compte delete-account; do node_modules/supabase/bin/supabase.exe functions deploy $f --project-ref trbxpsknbtisqwefqoub; done
```
Contrôle sans admin : `curl … /functions/v1/admin-compte -d '{"action":"suspendre","userId":"x"}'` → `forbidden`.

- [ ] **Step 4: Le front**

Dans `lib/admin-functions.ts` :
```ts
export const suspendAccount = (userId: string) => call<{ done: true }>('admin-compte', { action: 'suspendre', userId }).then(() => undefined)
export const reactivateAccount = (userId: string) => call<{ done: true }>('admin-compte', { action: 'reactiver', userId }).then(() => undefined)
export const changeEmail = (userId: string, email: string) => call<{ done: true }>('admin-compte', { action: 'email', userId, email }).then(() => undefined)
export interface DeletionPreview { deleted: { entityActorId: string; brandName: string; subscribed: boolean }[]; kept: { entityActorId: string; brandName: string; endsOn: string | null }[] }
export const previewDeletion = (userId: string) => call<DeletionPreview>('delete-account', { confirm: false, userId })
export const deleteAccount = (userId: string) => call<{ done: true }>('delete-account', { confirm: true, userId }).then(() => undefined)
```
`AccessCard` : « Suspendre » (bouton secondaire) → confirmation en une phrase → `suspendAccount`, `reload()` ; suspendu, la rangée dit « Suspendu depuis le {date} » et le bouton devient « Réactiver ». « Supprimer… » (bouton brique) ouvre un `<dialog>` (règles `<dialog>` de `.claude/rules/v2.md`) : l'aperçu (`previewDeletion` : enseignes supprimées, enseignes gardées et date de fin d'abonnement), un champ où taper le prénom du compte pour activer « Supprimer définitivement » → `deleteAccount`, puis retour à `/admin/comptes?vue=personnes`. **Sur sa propre fiche, Suspendre et Supprimer n'apparaissent pas.**
`PersonInfoCard` : l'e-mail devient modifiable en correction ; enregistrer appelle `changeEmail` (message « Cette adresse est déjà utilisée par un autre compte. » sur 409), puis `reload()`.

- [ ] **Step 5: Vérifier** — uniquement sur le **compte de test**, avec Uriel :
  1. suspendre → la connexion par code échoue pour ce compte ; réactiver → elle remarche ;
  2. changer l'e-mail → le code arrive à la nouvelle adresse ;
  3. ouvrir sa propre fiche → ni Suspendre ni Supprimer (Review Focus 4) ;
  4. supprimer → l'aperçu correspond, le compte disparaît de la liste, son enseigne seule aussi.

- [ ] **Step 6: Lint, build, commit**

```bash
pnpm --filter web-v2 lint && pnpm --filter web-v2 build
git add supabase/functions supabase/config.toml apps/web-v2/src
git commit -m "feat(admin): suspendre pour de vrai, réactiver, changer l'e-mail de connexion et supprimer un compte"
```

---

### Task 14: Livrer

**Files:**
- Modify: `apps/web-v2/package.json` (version `2.46.0`)
- Modify: `docs/v2/purge-back.md` (une ligne : le rôle `'suspended'` écrit par la V1, cosmétique, à retirer avec la V1)
- Modify: `apps/web-v2/README.md` (« Réservé aux admins (`is_admin()`) » → `can_use_v2()`, et l'administration sous `/v2/admin`)
- Modify (vault) : `1. LE MÉTIER/2. Fellowship/_État.md` — *Où on en est* : l'administration V2 (lot 2) est en ligne.

- [ ] **Step 1: Tests, lint, build** — `pnpm --filter web-v2 test && pnpm --filter web-v2 lint && pnpm --filter web-v2 build`. Expected : tout passe.

- [ ] **Step 2: Version, déploiement, contrôles** — version `2.46.0` ; `pnpm deploy:v2` ; `curl -s https://flw.sh/v2/ | grep -o 'src="/v2/assets/[^"]*"'` égal au `dist/index.html` local.

- [ ] **Step 3: La revue à l'œil** — les quatre écrans en production à côté de leurs maquettes (`2338:2`, `2340:2`, `2342:2`, `2344:2`), en jour **et** en nuit (l'interrupteur de la barre). Chaque écart repris avant de dire « fini ».

- [ ] **Step 4: Commit, puis push en fin de session**

```bash
git add apps/web-v2/package.json apps/web-v2/README.md docs/v2/purge-back.md
git commit -m "chore(v2): l'administration des comptes est en ligne (V2 2.46.0)"
```
