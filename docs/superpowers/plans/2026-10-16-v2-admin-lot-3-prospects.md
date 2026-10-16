# V2 — Administration, lot 3 : les Prospects — plan d'exécution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** une page `/admin/prospects` où un admin ajoute, importe (CSV) et travaille ses prospects
directement dans le tableau, et voit tout seul qui s'est inscrit.

**Architecture :** une table `prospects` réservée aux admins (RLS `is_admin()`) ; les lectures passent
par des fonctions `admin_prospects*` (recherche sans accents, filtres, pages, correspondances) ; les
écritures vont droit sur la table. Un déclencheur sur `users` relie un prospect à l'inscription par
e-mail. Le front suit le patron du lot 2 (hook de chargement, état dans l'adresse, fonctions pures
testées).

**Tech Stack :** Supabase (Postgres, RLS, plpgsql), React 19, React Router, supabase-js, Papa Parse,
vitest.

**Spec :** `docs/superpowers/specs/2026-10-16-v2-admin-lot-3-prospects-design.md`

## Global Constraints

- Base = **production**. Migrations : `supabase/migrations/<horodatage>_<nom>.sql`, appliquées
  **par le contrôleur seulement** (`node_modules/supabase/bin/supabase.exe db push --linked`, avec
  `export SUPABASE_DB_PASSWORD=$(grep ^SUPABASE_DB_PASSWORD= .env | cut -d= -f2-)`). Jamais
  `apply_migration` du MCP. Un sous-agent écrit le fichier, ne l'applique pas.
- Déploiement (`pnpm deploy:v2`) : **contrôleur seulement**.
- Chaque fonction `admin_*` : `security definer`, `set search_path to 'public'`,
  `perform admin_garde();` en premier, `revoke all … from public, anon` puis
  `grant execute … to authenticated`.
- Toute liste triée (`created_at desc, id`), pages de 50.
- Aucun essai d'écriture sur un vrai client : la vérification du déclencheur se fait dans un bloc
  `do $$ … raise exception $$` qui annule tout.
- V2 : TS strict sans `any` / `!` / `as unknown as` ; 400 lignes max par fichier ; aucun style dans
  les `.tsx` ; aucune valeur en dur dans `styles/3-components/` (couleurs, tailles, polices via les
  jetons `var(--…)` des couches 1-2) ; en-tête `QUOI / POURQUOI` sur chaque fichier, `README.md`
  dans chaque nouveau dossier ; `pnpm --filter web-v2 lint` vert avant chaque commit.
- On ne déduit jamais le genre : « Rapprochement par e-mail le … », « contact le … » (la maquette dit
  « Rapprochée », « contactée »).
- Commits : Conventional Commits en français, terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne jamais pousser.
- Tests : fonctions pures dans `lib/*.ts` testées par vitest (`pnpm --filter web-v2 exec vitest run`) ;
  pas de test de rendu React (`.claude/rules/dev.md`).
- Si vitest, Vite ou la config se mettent en travers plus de 2 fois : s'arrêter et rendre BLOCKED.

## Décisions du plan (là où la spec laisse la main)

- **L'e-mail est stocké en minuscules, sans espaces**, avec une contrainte `unique (email)` (les
  `null` ne se gênent pas) au lieu d'un index sur `lower(email)` : l'import peut alors s'appuyer sur
  `onConflict: 'email', ignoreDuplicates: true`, et le rapprochement compare `lower(users.email)` à
  `prospects.email`.
- **Les nombres des filtres** viennent d'une fonction à part, `admin_prospects_filtres(p_q, p_source)`
  (ils suivent la recherche), comme `admin_filtres` du lot 2 ; `admin_prospects_chiffres()` ne rend
  que les quatre chiffres.
- **Statut et canal** : des `<select>` natifs, stylés comme du texte, toujours actifs (pas de mode
  édition) — l'outil standard. Texte : un clic ouvre un champ. Date : `<input type="date">`.
- **Confirmations** (supprimer, défaire un rapprochement) : un `ConfirmDialog` sur `<dialog>`, comme
  `DeletionDialog`.
- La recherche et le pied de page des Comptes deviennent des briques partagées
  (`components/ui/AdminSearch.tsx`, `AdminPager.tsx`).

## Review Focus

1. **CSV d'Excel français** (séparateur `;`, en-têtes « E-mail », « Téléphone ») : Papa Parse
   détecte le séparateur ; les titres se reconnaissent sans accents — testé en tâche 2.
2. **Même e-mail en majuscules, ou deux fois dans le fichier** : un seul prospect, compté en doublon
   — testé en tâche 2.
3. **Saisir un e-mail déjà présent dans une cellule** : message « Cet e-mail est déjà dans la
   liste. », l'ancienne valeur revient — `writeError` testé en tâche 2.
4. **Téléphones écrits différemment** (`+33 6…`, `0033 6…`, `06.41…`) : même clé en SQL et en TS —
   testé en tâche 2 (TS) et vérifié en tâche 1 (SQL).
5. **Une inscription ne doit jamais échouer à cause des prospects** : le déclencheur avale ses
   erreurs — vérifié en tâche 1 dans le bloc annulé.

---

### Task 1 : la base — table, lectures, rapprochement, déclencheur

**Files :**
- Create : `supabase/migrations/20261016140000_admin_prospects.sql`
- Modify : `apps/web-v2/src/types/supabase.ts` (régénéré par le contrôleur)

**Interfaces :**
- Produces : table `prospects` (colonnes ci-dessous) ; fonctions
  `admin_prospects(p_q text, p_filtre text, p_source text, p_page int)`,
  `admin_prospects_chiffres()`, `admin_prospects_filtres(p_q text, p_source text)`,
  `admin_prospects_sources()`, `admin_prospects_a_rapprocher()`,
  `admin_rapprocher(p_prospect uuid, p_user uuid, p_par text)`, `admin_prospect_de(p_user uuid)`.
  Valeurs de filtre : `tous`, `a_contacter`, `contactes`, `repondu`, `compte`, `a_relancer`.

- [ ] **Step 1 : écrire la migration**

```sql
-- POURQUOI : lot 3 de l'administration V2, les Prospects (spec 2026-10-16). Les commerciaux (des
-- admins) tiennent la liste des exposants et festivals à démarcher. Un prospect n'est jamais un
-- compte : il vit ici, et se relie à un compte quand quelqu'un s'inscrit avec son e-mail (le
-- déclencheur) ou quand un admin confirme une correspondance (admin_rapprocher).
-- Tout est réservé aux admins : RLS is_admin() sur la table, admin_garde() dans chaque fonction.
-- L'e-mail est rangé en minuscules : unique, il permet à l'import d'ignorer les doublons.

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  name text,
  brand text,
  activity text,
  city text,
  email text unique check (email = lower(trim(email)) and email <> ''),
  phone text,
  source text,
  note text,
  contact_channel text check (contact_channel in ('mail', 'appel', 'salon', 'message')),
  contacted_on date,
  email_status text not null default 'pas_envoye'
    check (email_status in ('pas_envoye', 'envoye', 'ouvert', 'repondu', 'rebond')),
  a_relancer boolean not null default false,
  user_id uuid references public.users(actor_id) on delete set null,
  linked_at timestamptz,
  linked_by text check (linked_by in ('email', 'telephone')),
  created_at timestamptz not null default now(),
  -- L'identifiant de connexion de l'auteur : pas de clé vers users, dont l'actor_id peut différer
  -- de auth_id pour les comptes anciens.
  created_by uuid default auth.uid()
);
create index prospects_created_idx on public.prospects (created_at desc, id);
create index prospects_user_idx on public.prospects (user_id);

alter table public.prospects enable row level security;
create policy prospects_admin on public.prospects for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.prospects from anon;

-- Le téléphone se compare chiffres seuls, l'indicatif français ramené à 0 :
-- « 06 41 22 18 90 », « +33 6 41 22 18 90 » et « 0033641221890 » donnent « 0641221890 ».
-- La même règle vit dans apps/web-v2/src/lib/phone.ts (phoneKey) : les deux vont ensemble.
create function public.phone_key(p_tel text) returns text
language sql immutable set search_path to 'public' as $$
  select nullif(case
    when d like '0033%' and length(d) = 13 then '0' || substr(d, 5)
    when d like '33%' and length(d) = 11 then '0' || substr(d, 3)
    else d end, '')
  from (select regexp_replace(coalesce(p_tel, ''), '\D', '', 'g') as d) s;
$$;

-- Contacté : un e-mail parti, ou une date de contact notée.
create function public.prospect_dans_filtre(p public.prospects, p_filtre text) returns boolean
language sql stable set search_path to 'public' as $$
  select case p_filtre
    when 'tous' then true
    when 'a_contacter' then p.email_status = 'pas_envoye' and p.contacted_on is null
      and p.user_id is null
    when 'contactes' then p.email_status <> 'pas_envoye' or p.contacted_on is not null
    when 'repondu' then p.email_status = 'repondu'
    when 'compte' then p.user_id is not null
    when 'a_relancer' then p.a_relancer
    else false
  end;
$$;

create function public.prospect_cherche(p public.prospects, p_q text, p_source text) returns boolean
language sql stable set search_path to 'public' as $$
  select (coalesce(p_source, '') = '' or p.source = p_source)
    and (coalesce(trim(p_q), '') = ''
      or admin_cherche(p.name, p_q) or admin_cherche(p.brand, p_q)
      or admin_cherche(p.email, p_q) or admin_tel(p.phone, p_q));
$$;

create function public.admin_prospects(p_q text default '', p_filtre text default 'tous',
  p_source text default '', p_page int default 0)
returns table (id uuid, name text, brand text, activity text, city text, email text, phone text,
  source text, note text, contact_channel text, contacted_on date, email_status text,
  a_relancer boolean, user_id uuid, user_name text, linked_at timestamptz, linked_by text,
  created_at timestamptz, total bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.brand, p.activity, p.city, p.email, p.phone, p.source, p.note,
    p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.user_id,
    u.display_name::text, p.linked_at, p.linked_by, p.created_at, count(*) over ()
  from prospects p
  left join users u on u.actor_id = p.user_id
  where prospect_dans_filtre(p, p_filtre) and prospect_cherche(p, p_q, p_source)
  order by p.created_at desc, p.id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

create function public.admin_prospects_chiffres()
returns table (total bigint, semaine bigint, contactes bigint, repondu bigint, comptes bigint,
  comptes_pro bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query select
    (select count(*) from prospects),
    (select count(*) from prospects where created_at > now() - interval '7 days'),
    (select count(*) from prospects p where prospect_dans_filtre(p, 'contactes')),
    (select count(*) from prospects where email_status = 'repondu'),
    (select count(*) from prospects where user_id is not null),
    (select count(*) from prospects p
      where p.user_id is not null and exists (
        select 1 from memberships m join entities e on e.actor_id = m.entity_actor_id
        where m.user_actor_id = p.user_id
          and admin_offre(e.plan::text, e.comped_pro_until, e.subscription_status) = 'pro'));
end $$;

create function public.admin_prospects_filtres(p_q text default '', p_source text default '')
returns table (filtre text, nombre bigint)
language plpgsql stable security definer set search_path to 'public' as $$
declare f text;
begin
  perform admin_garde();
  foreach f in array array['tous', 'a_contacter', 'contactes', 'repondu', 'compte', 'a_relancer']
  loop
    filtre := f;
    select count(*) into nombre from prospects p
      where prospect_dans_filtre(p, f) and prospect_cherche(p, p_q, p_source);
    return next;
  end loop;
end $$;

create function public.admin_prospects_sources()
returns table (source text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select distinct p.source from prospects p
  where p.source is not null and trim(p.source) <> ''
  order by p.source;
end $$;

-- Les correspondances pas encore reliées : même e-mail qu'un compte, ou même téléphone.
-- Un prospect n'apparaît qu'une fois ; l'e-mail l'emporte sur le téléphone.
create function public.admin_prospects_a_rapprocher()
returns table (prospect_id uuid, prospect_name text, prospect_brand text, user_id uuid,
  user_name text, user_email text, par text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select c.prospect_id, c.prospect_name, c.prospect_brand, c.user_id, c.user_name, c.user_email,
    c.par
  from (
    select distinct on (p.id) p.id as prospect_id, p.name as prospect_name,
      p.brand as prospect_brand, u.actor_id as user_id, u.display_name::text as user_name,
      u.email::text as user_email,
      case when lower(u.email) = p.email then 'email' else 'telephone' end as par,
      p.created_at as p_created
    from prospects p
    join users u on lower(u.email) = p.email
      or (phone_key(p.phone) is not null and phone_key(u.phone) = phone_key(p.phone))
    where p.user_id is null
    order by p.id, (lower(u.email) = p.email) desc, u.created_at, u.actor_id
  ) c
  order by c.p_created desc, c.prospect_id;
end $$;

create function public.admin_rapprocher(p_prospect uuid, p_user uuid, p_par text)
returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  update prospects set user_id = p_user, linked_at = now(), linked_by = p_par
  where id = p_prospect;
end $$;

-- Le prospect d'origine d'une personne : le premier rapproché, si plusieurs mènent à elle.
create function public.admin_prospect_de(p_user uuid)
returns table (id uuid, source text, contact_channel text, contacted_on date,
  linked_at timestamptz, linked_by text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select p.id, p.source, p.contact_channel, p.contacted_on, p.linked_at, p.linked_by
  from prospects p
  where p.user_id = p_user
  order by p.linked_at, p.id
  limit 1;
end $$;

-- À l'inscription (handle_new_user pose la ligne users), relier le prospect qui a le même e-mail.
-- Une inscription ne doit JAMAIS échouer à cause des prospects : toute erreur est avalée.
create function public.prospect_relier_inscription() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  begin
    update prospects set user_id = new.actor_id, linked_at = now(), linked_by = 'email'
    where user_id is null and new.email is not null and email = lower(trim(new.email));
  exception when others then
    null;
  end;
  return new;
end $$;

create trigger prospect_relier_inscription after insert on public.users
  for each row execute function public.prospect_relier_inscription();

revoke all on function public.phone_key(text) from public, anon, authenticated;
revoke all on function public.prospect_dans_filtre(public.prospects, text) from public, anon, authenticated;
revoke all on function public.prospect_cherche(public.prospects, text, text) from public, anon, authenticated;
revoke all on function public.prospect_relier_inscription() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_prospects(text, text, text, int)', 'admin_prospects_chiffres()',
    'admin_prospects_filtres(text, text)', 'admin_prospects_sources()',
    'admin_prospects_a_rapprocher()', 'admin_rapprocher(uuid, uuid, text)',
    'admin_prospect_de(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
```

- [ ] **Step 2 : commit (le sous-agent s'arrête ici ; il n'applique rien)**

```bash
git add supabase/migrations/20261016140000_admin_prospects.sql
git commit -m "feat(admin): la table des prospects, ses lectures et le rapprochement à l'inscription

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3 (contrôleur) : appliquer, puis régénérer les types**

```bash
export SUPABASE_DB_PASSWORD=$(grep ^SUPABASE_DB_PASSWORD= .env | cut -d= -f2-)
node_modules/supabase/bin/supabase.exe db push --linked
node_modules/supabase/bin/supabase.exe gen types typescript --linked --schema public > /tmp/types.ts \
  && cp /tmp/types.ts apps/web-v2/src/types/supabase.ts
```

- [ ] **Step 4 (contrôleur) : vérifier en base**

Sans être admin (rôle `anon`), l'appel échoue :
```bash
node_modules/supabase/bin/supabase.exe db query --linked "set local role anon; select * from admin_prospects()"
```
Attendu : `permission denied for function admin_prospects`.

`phone_key` :
```bash
node_modules/supabase/bin/supabase.exe db query --linked "select phone_key('06 41 22 18 90') a, phone_key('+33 6 41 22 18 90') b, phone_key('0033641221890') c, phone_key('06.41.22.18.90') d, phone_key('') e"
```
Attendu : `0641221890` quatre fois, `null`.

Le déclencheur, dans un bloc qui annule tout (aucune donnée ne reste) :
```bash
node_modules/supabase/bin/supabase.exe db query --linked "do \$\$ declare v uuid := gen_random_uuid(); lie uuid; begin insert into prospects (email) values ('test-lot3-prospect@flw.sh'); insert into auth.users (id, email, aud, role) values (v, 'Test-Lot3-Prospect@flw.sh', 'authenticated', 'authenticated'); select user_id into lie from prospects where email = 'test-lot3-prospect@flw.sh'; raise exception 'RESULTAT relie=% attendu=%', lie, v; end \$\$"
```
Attendu : l'erreur `RESULTAT relie=<uuid> attendu=<le même uuid>` (le bloc est annulé par l'exception).

- [ ] **Step 5 (contrôleur) : commit des types**

```bash
git add apps/web-v2/src/types/supabase.ts
git commit -m "chore(v2): types de la base avec les prospects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2 : les fonctions pures — téléphone, état de la liste, libellés, import

**Files :**
- Create : `apps/web-v2/src/lib/phone.ts`, `apps/web-v2/src/lib/phone.test.ts`
- Create : `apps/web-v2/src/lib/prospect-list.ts`, `apps/web-v2/src/lib/prospect-list.test.ts`
- Create : `apps/web-v2/src/lib/prospect.ts`, `apps/web-v2/src/lib/prospect.test.ts`
- Create : `apps/web-v2/src/lib/prospect-import.ts`, `apps/web-v2/src/lib/prospect-import.test.ts`

**Interfaces :**
- Consumes : `formatDayMonthShort(date: Date): string` et `parseSqlDate(value: string): Date` de
  `lib/dates.ts`.
- Produces :
  - `phoneKey(raw: string | null | undefined): string | null`
  - `type ProspectFilter = 'tous' | 'a_contacter' | 'contactes' | 'repondu' | 'compte' | 'a_relancer'`,
    `interface ProspectsQuery { q: string; filter: ProspectFilter; source: string; page: number }`,
    `PROSPECT_FILTERS: readonly { value: ProspectFilter; label: string }[]`,
    `readProspectsQuery(search: URLSearchParams): ProspectsQuery`,
    `writeProspectsQuery(query: ProspectsQuery): URLSearchParams`
  - `type EmailStatus`, `EMAIL_STATUSES: readonly { value: EmailStatus; label: string }[]`,
    `type ContactChannel`, `CHANNELS: readonly { value: ContactChannel; label: string }[]`,
    `contactLabel(channel: string | null, on: string | null): string | null`,
    `percent(part: number, whole: number): number`,
    `writeError(error: { code?: string; message: string }): string`,
    `normalizeEmail(raw: string | null): string | null`
  - `interface NewProspect { name; brand; activity; city; email; phone; source; note: string | null }`,
    `interface ImportPlan { toAdd: NewProspect[]; duplicates: number; ignored: number }`,
    `planImport(rows: string[][], known: ReadonlySet<string>, commonSource: string): ImportPlan`,
    `emailsOf(rows: string[][]): string[]`

- [ ] **Step 1 : écrire les tests qui échouent**

`apps/web-v2/src/lib/phone.test.ts` :
```ts
/**
 * QUOI     — tests de lib/phone.ts : la clé de comparaison d'un téléphone.
 * POURQUOI — elle doit donner la même clé que phone_key() en SQL, sinon le rapprochement ment.
 */
import { describe, expect, it } from 'vitest'
import { phoneKey } from './phone'

describe('phoneKey', () => {
  it('garde les chiffres et ramène l’indicatif français à 0', () => {
    expect(phoneKey('06 41 22 18 90')).toBe('0641221890')
    expect(phoneKey('+33 6 41 22 18 90')).toBe('0641221890')
    expect(phoneKey('0033641221890')).toBe('0641221890')
    expect(phoneKey('06.41.22.18.90')).toBe('0641221890')
  })
  it('un numéro étranger reste tel quel, en chiffres', () => {
    expect(phoneKey('+41 79 123 45 67')).toBe('41791234567')
  })
  it('rien à comparer : null', () => {
    expect(phoneKey('')).toBeNull()
    expect(phoneKey(null)).toBeNull()
    expect(phoneKey('pas de numéro')).toBeNull()
  })
})
```

`apps/web-v2/src/lib/prospect-list.test.ts` :
```ts
/**
 * QUOI     — tests de lib/prospect-list.ts : l'état de la liste des prospects dans l'adresse.
 * POURQUOI — l'adresse fait foi (règle V2) : un filtre inconnu ou une page fausse ne cassent rien.
 */
import { describe, expect, it } from 'vitest'
import { readProspectsQuery, writeProspectsQuery } from './prospect-list'

describe('readProspectsQuery', () => {
  it('par défaut : tous, aucune source, page 0', () => {
    expect(readProspectsQuery(new URLSearchParams(''))).toEqual({
      q: '',
      filter: 'tous',
      source: '',
      page: 0,
    })
  })
  it('lit recherche, filtre, source et page', () => {
    expect(
      readProspectsQuery(
        new URLSearchParams('q=%20forge%20&filtre=a_relancer&source=Salon%20de%20Rennes&page=2'),
      ),
    ).toEqual({ q: 'forge', filter: 'a_relancer', source: 'Salon de Rennes', page: 2 })
  })
  it('un filtre inconnu retombe sur tous, une page fausse sur 0', () => {
    const query = readProspectsQuery(new URLSearchParams('filtre=admins&page=-1'))
    expect(query.filter).toBe('tous')
    expect(query.page).toBe(0)
  })
})

describe('writeProspectsQuery', () => {
  it('n’écrit que ce qui s’écarte du défaut', () => {
    expect(writeProspectsQuery({ q: '', filter: 'tous', source: '', page: 0 }).toString()).toBe('')
    expect(
      writeProspectsQuery({ q: 'léa', filter: 'repondu', source: 'Instagram', page: 1 }).toString(),
    ).toBe('q=l%C3%A9a&filtre=repondu&source=Instagram&page=1')
  })
})
```

`apps/web-v2/src/lib/prospect.test.ts` :
```ts
/**
 * QUOI     — tests de lib/prospect.ts : libellé du contact, pourcentages, messages d'écriture,
 *            e-mail rangé.
 * POURQUOI — ce sont les règles que le tableau affiche ; un message d'erreur doit parler français.
 */
import { describe, expect, it } from 'vitest'
import { contactLabel, normalizeEmail, percent, writeError } from './prospect'

describe('contactLabel', () => {
  it('le canal et la date', () => {
    expect(contactLabel('mail', '2026-10-10')).toBe('Mail · 10 oct.')
  })
  it('l’un sans l’autre', () => {
    expect(contactLabel('appel', null)).toBe('Appel')
    expect(contactLabel(null, '2026-10-02')).toBe('2 oct.')
  })
  it('rien : null', () => {
    expect(contactLabel(null, null)).toBeNull()
  })
})

describe('percent', () => {
  it('arrondit, et rend 0 sur un total nul', () => {
    expect(percent(212, 486)).toBe(44)
    expect(percent(3, 0)).toBe(0)
  })
})

describe('writeError', () => {
  it('un e-mail en double parle de la liste', () => {
    expect(writeError({ code: '23505', message: 'duplicate key' })).toBe(
      'Cet e-mail est déjà dans la liste.',
    )
  })
  it('sinon le message de la base', () => {
    expect(writeError({ message: 'réservé aux admins' })).toBe('réservé aux admins')
  })
})

describe('normalizeEmail', () => {
  it('minuscules, sans espaces, vide = null', () => {
    expect(normalizeEmail('  Manon@CuirDeLune.fr ')).toBe('manon@cuirdelune.fr')
    expect(normalizeEmail('   ')).toBeNull()
    expect(normalizeEmail(null)).toBeNull()
  })
})
```

`apps/web-v2/src/lib/prospect-import.test.ts` :
```ts
/**
 * QUOI     — tests de lib/prospect-import.ts : un CSV de tableur devient une liste de prospects.
 * POURQUOI — les fichiers viennent d'Excel ou de Google Sheets, avec des titres écrits à la main.
 */
import { describe, expect, it } from 'vitest'
import { emailsOf, planImport } from './prospect-import'

const HEADER = ['Nom', 'Marque', 'Activité', 'Ville', 'E-mail', 'Téléphone', 'Commentaire']

describe('planImport', () => {
  it('reconnaît les titres sans accents ni casse', () => {
    const plan = planImport(
      [HEADER, ['Manon Leclerc', 'Cuir de Lune', 'Maroquinerie', 'Nantes', 'Manon@CuirDeLune.fr', '06 41 22 18 90', 'Veut tester']],
      new Set(),
      '',
    )
    expect(plan.toAdd).toEqual([
      {
        name: 'Manon Leclerc',
        brand: 'Cuir de Lune',
        activity: 'Maroquinerie',
        city: 'Nantes',
        email: 'manon@cuirdelune.fr',
        phone: '06 41 22 18 90',
        source: null,
        note: 'Veut tester',
      },
    ])
  })
  it('accepte les synonymes : courriel, tel, enseigne, prénom', () => {
    const plan = planImport(
      [['Prénom', 'Enseigne', 'Courriel', 'Tel'], ['Arthur', 'Forge & Feu', 'contact@forgeetfeu.fr', '07 82 10 44 31']],
      new Set(),
      '',
    )
    expect(plan.toAdd[0]).toMatchObject({
      name: 'Arthur',
      brand: 'Forge & Feu',
      email: 'contact@forgeetfeu.fr',
      phone: '07 82 10 44 31',
    })
  })
  it('prénom et nom se joignent dans l’ordre des colonnes', () => {
    const plan = planImport([['Prénom', 'Nom'], ['Élise', 'Caron']], new Set(), '')
    expect(plan.toAdd[0]?.name).toBe('Élise Caron')
  })
  it('compte en doublon un e-mail déjà connu ou répété dans le fichier', () => {
    const plan = planImport(
      [['Nom', 'E-mail'], ['A', 'a@x.fr'], ['B', 'B@X.FR'], ['C', 'b@x.fr']],
      new Set(['a@x.fr']),
      '',
    )
    expect(plan.toAdd.map((p) => p.name)).toEqual(['B'])
    expect(plan.duplicates).toBe(2)
  })
  it('ignore une ligne sans nom, marque ni e-mail', () => {
    const plan = planImport([['Nom', 'Ville'], ['', 'Lyon'], ['Hugo', 'Dijon']], new Set(), '')
    expect(plan.toAdd).toHaveLength(1)
    expect(plan.ignored).toBe(1)
  })
  it('la source commune remplit les lignes qui n’en ont pas', () => {
    const plan = planImport(
      [['Nom', 'Source'], ['A', 'Instagram'], ['B', '']],
      new Set(),
      'Salon de Rennes',
    )
    expect(plan.toAdd.map((p) => p.source)).toEqual(['Instagram', 'Salon de Rennes'])
  })
  it('un fichier vide ou sans titre reconnu ne donne rien', () => {
    expect(planImport([], new Set(), '').toAdd).toEqual([])
    expect(planImport([['Colonne inconnue'], ['x']], new Set(), '').toAdd).toEqual([])
  })
})

describe('emailsOf', () => {
  it('les e-mails du fichier, rangés, sans vides', () => {
    expect(emailsOf([['Nom', 'Mail'], ['A', ' A@X.fr '], ['B', '']])).toEqual(['a@x.fr'])
  })
})
```

- [ ] **Step 2 : lancer les tests, ils échouent**

Run : `pnpm --filter web-v2 exec vitest run src/lib/phone.test.ts src/lib/prospect-list.test.ts src/lib/prospect.test.ts src/lib/prospect-import.test.ts`
Attendu : FAIL, modules introuvables.

- [ ] **Step 3 : écrire le code**

`apps/web-v2/src/lib/phone.ts` :
```ts
/**
 * QUOI     — la clé de comparaison d'un téléphone : ses chiffres, l'indicatif français ramené à 0.
 * POURQUOI — « 06 41 22 18 90 » et « +33 6 41 22 18 90 » sont le même numéro.
 * ATTENTION — la même règle vit en SQL (phone_key, migration 20261016140000) : les deux vont ensemble.
 */
export function phoneKey(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('0033') && digits.length === 13) return `0${digits.slice(4)}`
  if (digits.startsWith('33') && digits.length === 11) return `0${digits.slice(2)}`
  return digits || null
}
```

`apps/web-v2/src/lib/prospect-list.ts` :
```ts
/**
 * QUOI     — l'état de la liste des prospects (recherche, filtre, source, page) lu et écrit dans
 *            l'adresse.
 * POURQUOI — tout état navigable est une URL (règle V2).
 * ATTENTION — les valeurs de filtre sont celles qu'attend admin_prospects (SQL).
 */
export type ProspectFilter =
  | 'tous'
  | 'a_contacter'
  | 'contactes'
  | 'repondu'
  | 'compte'
  | 'a_relancer'

export interface ProspectsQuery {
  q: string
  filter: ProspectFilter
  source: string
  page: number
}

export const PROSPECT_FILTERS: readonly { value: ProspectFilter; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'a_contacter', label: 'À contacter' },
  { value: 'contactes', label: 'Contactés' },
  { value: 'repondu', label: 'Ont répondu' },
  { value: 'compte', label: 'Ont un compte' },
  { value: 'a_relancer', label: 'À relancer' },
]

function isFilter(value: string): value is ProspectFilter {
  return PROSPECT_FILTERS.some((filter) => filter.value === value)
}

export function readProspectsQuery(search: URLSearchParams): ProspectsQuery {
  const raw = search.get('filtre') ?? ''
  return {
    q: (search.get('q') ?? '').trim(),
    filter: isFilter(raw) ? raw : 'tous',
    source: search.get('source') ?? '',
    page: Math.max(0, Number.parseInt(search.get('page') ?? '0', 10) || 0),
  }
}

export function writeProspectsQuery(query: ProspectsQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.filter !== 'tous') params.set('filtre', query.filter)
  if (query.source) params.set('source', query.source)
  if (query.page > 0) params.set('page', String(query.page))
  return params
}
```

`apps/web-v2/src/lib/prospect.ts` :
```ts
/**
 * QUOI     — les valeurs d'un prospect et leurs libellés : statut de l'e-mail, canal de contact,
 *            « Mail · 10 oct. », pourcentages, messages d'écriture, e-mail rangé.
 * POURQUOI — le tableau, les chiffres et l'import parlent la même langue que la base (les valeurs
 *            des contraintes check de la table prospects).
 */
import { formatDayMonthShort, parseSqlDate } from './dates'

export type EmailStatus = 'pas_envoye' | 'envoye' | 'ouvert' | 'repondu' | 'rebond'

export const EMAIL_STATUSES: readonly { value: EmailStatus; label: string }[] = [
  { value: 'pas_envoye', label: 'Pas envoyé' },
  { value: 'envoye', label: 'Envoyé' },
  { value: 'ouvert', label: 'Ouvert' },
  { value: 'repondu', label: 'Répondu' },
  { value: 'rebond', label: 'Rebond' },
]

export type ContactChannel = 'mail' | 'appel' | 'salon' | 'message'

export const CHANNELS: readonly { value: ContactChannel; label: string }[] = [
  { value: 'mail', label: 'Mail' },
  { value: 'appel', label: 'Appel' },
  { value: 'salon', label: 'Salon' },
  { value: 'message', label: 'Message' },
]

/** « Mail · 10 oct. » ; l'un sans l'autre ; null si rien n'est noté. */
export function contactLabel(channel: string | null, on: string | null): string | null {
  const parts = [
    CHANNELS.find((c) => c.value === channel)?.label,
    on ? formatDayMonthShort(parseSqlDate(on)) : undefined,
  ].filter((part): part is string => Boolean(part))
  return parts.length ? parts.join(' · ') : null
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part * 100) / whole) : 0
}

/** 23505 : la contrainte unique de l'e-mail. */
export function writeError(error: { code?: string; message: string }): string {
  return error.code === '23505' ? 'Cet e-mail est déjà dans la liste.' : error.message
}

/** L'e-mail est rangé en minuscules, sans espaces (contrainte de la table). */
export function normalizeEmail(raw: string | null): string | null {
  const email = (raw ?? '').trim().toLowerCase()
  return email || null
}
```

Avant d'écrire `contactLabel`, vérifier que `formatDayMonthShort(new Date(2026, 9, 10))` rend bien
`10 oct.` (lire `lib/dates.ts`) ; s'il rend autre chose, adapter **le test** à la sortie réelle de
`formatDayMonthShort` — jamais une mise en forme maison.

`apps/web-v2/src/lib/prospect-import.ts` :
```ts
/**
 * QUOI     — transforme les lignes d'un CSV (titres en première ligne) en prospects à ajouter, et
 *            compte les doublons et les lignes ignorées, pour l'aperçu avant import.
 * POURQUOI — les fichiers viennent d'Excel ou de Google Sheets, titrés à la main : on reconnaît les
 *            titres sans accents ni casse, avec leurs synonymes.
 * ATTENTION — un doublon est un e-mail déjà connu (dans la base ou plus haut dans le fichier).
 */
import { normalizeEmail } from './prospect'

export interface NewProspect {
  name: string | null
  brand: string | null
  activity: string | null
  city: string | null
  email: string | null
  phone: string | null
  source: string | null
  note: string | null
}

type Field = keyof NewProspect

export interface ImportPlan {
  toAdd: NewProspect[]
  duplicates: number
  ignored: number
}

const SYNONYMS: Record<Field, readonly string[]> = {
  name: ['nom', 'prenom', 'personne', 'contact', 'nomcomplet'],
  brand: ['marque', 'enseigne', 'boutique'],
  activity: ['activite', 'metier'],
  city: ['ville'],
  email: ['email', 'mail', 'courriel', 'adressemail'],
  phone: ['telephone', 'tel', 'portable', 'mobile'],
  source: ['source'],
  note: ['note', 'notes', 'commentaire', 'commentaires'],
}

function simplify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

function fieldOf(title: string): Field | null {
  const key = simplify(title)
  const found = (Object.keys(SYNONYMS) as Field[]).find((field) => SYNONYMS[field].includes(key))
  return found ?? null
}

function emptyProspect(): NewProspect {
  return {
    name: null,
    brand: null,
    activity: null,
    city: null,
    email: null,
    phone: null,
    source: null,
    note: null,
  }
}

function readRow(fields: (Field | null)[], cells: string[]): NewProspect {
  const prospect = emptyProspect()
  fields.forEach((field, index) => {
    const value = (cells[index] ?? '').trim()
    if (!field || !value) return
    const previous = prospect[field]
    prospect[field] = previous ? `${previous} ${value}` : value
  })
  return { ...prospect, email: normalizeEmail(prospect.email) }
}

export function planImport(
  rows: string[][],
  known: ReadonlySet<string>,
  commonSource: string,
): ImportPlan {
  const [header, ...lines] = rows
  const fields = (header ?? []).map(fieldOf)
  const seen = new Set(known)
  const plan: ImportPlan = { toAdd: [], duplicates: 0, ignored: 0 }
  if (!fields.some(Boolean)) return plan
  for (const cells of lines) {
    const prospect = readRow(fields, cells)
    if (!prospect.name && !prospect.brand && !prospect.email) {
      plan.ignored += 1
      continue
    }
    if (prospect.email && seen.has(prospect.email)) {
      plan.duplicates += 1
      continue
    }
    if (prospect.email) seen.add(prospect.email)
    plan.toAdd.push({ ...prospect, source: prospect.source ?? (commonSource.trim() || null) })
  }
  return plan
}

/** Les e-mails du fichier, rangés : ceux qu'on demande à la base avant l'aperçu. */
export function emailsOf(rows: string[][]): string[] {
  const [header, ...lines] = rows
  const column = (header ?? []).findIndex((title) => fieldOf(title) === 'email')
  if (column < 0) return []
  return lines
    .map((cells) => normalizeEmail(cells[column] ?? null))
    .filter((email): email is string => email !== null)
}
```

- [ ] **Step 4 : les tests passent**

Run : la même commande qu'au Step 2. Attendu : PASS.

- [ ] **Step 5 : lint et commit**

```bash
pnpm --filter web-v2 lint
git add apps/web-v2/src/lib/phone.ts apps/web-v2/src/lib/phone.test.ts apps/web-v2/src/lib/prospect-list.ts apps/web-v2/src/lib/prospect-list.test.ts apps/web-v2/src/lib/prospect.ts apps/web-v2/src/lib/prospect.test.ts apps/web-v2/src/lib/prospect-import.ts apps/web-v2/src/lib/prospect-import.test.ts
git commit -m "feat(admin): les règles des prospects — téléphone, liste, libellés, import CSV

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : l'écran en lecture — barre, page, chiffres, bandeau, outils, tableau

**Files :**
- Create : `apps/web-v2/src/components/ui/AdminSearch.tsx`, `apps/web-v2/src/components/ui/AdminPager.tsx`
- Create : `apps/web-v2/src/styles/3-components/admin-search.css`, `apps/web-v2/src/styles/3-components/admin-pager.css`
- Modify : `apps/web-v2/src/features/admin-accounts/AccountsTools.tsx` (utilise les deux briques),
  `apps/web-v2/src/features/admin-accounts/AccountsPage.tsx` (import du pager),
  `apps/web-v2/src/styles/3-components/admin-accounts.css` (retire `.admin-search*` et `.admin-pager*`, déplacés)
- Create : `apps/web-v2/src/features/admin-prospects/README.md`, `ProspectsPage.tsx`,
  `ProspectsStats.tsx`, `MatchBanner.tsx`, `ProspectsTable.tsx`, `useProspects.ts`
- Create : `apps/web-v2/src/styles/3-components/admin-prospects.css`
- Modify : `apps/web-v2/src/styles/index.css` (imports), `apps/web-v2/src/App.tsx` (route),
  `apps/web-v2/src/components/layout/Sidebar.tsx` (`ADMIN_ITEMS`), `apps/web-v2/src/components/ui/README.md`

**Interfaces :**
- Consumes : `readProspectsQuery`, `writeProspectsQuery`, `PROSPECT_FILTERS`, `ProspectsQuery`
  (`lib/prospect-list`), `contactLabel`, `percent`, `EMAIL_STATUSES` (`lib/prospect`), les RPC de la
  tâche 1, `Segmented`, `IconTile`, `AdminPage` (App.tsx), `PAGE_SIZE` (`lib/admin-list`).
- Produces :
  - `AdminSearch({ value, placeholder, onSearch }: { value: string; placeholder: string; onSearch: (q: string) => void })`
  - `AdminPager({ page, shown, total, onPage, empty }: { page: number; shown: number; total: number; onPage: (page: number) => void; empty: string })`
  - `useProspects(query: ProspectsQuery): { data: ProspectsData | null; error: string | null; reload: () => void }`
  - `type ProspectRow = Fn['admin_prospects']['Returns'][number]`, `type ProspectStats`, `type Match`
  - `ProspectsTable({ rows, now, onChanged })` — dans cette tâche, cellules en lecture seule.

- [ ] **Step 1 : extraire la recherche et le pied de page des Comptes**

Lire `features/admin-accounts/AccountsTools.tsx`. Déplacer le formulaire de recherche (état local,
délai de 300 ms, Entrée, retour arrière suivi) dans `components/ui/AdminSearch.tsx`, et
`AccountsPager` dans `components/ui/AdminPager.tsx` (renommé `AdminPager`, avec une prop `empty`
pour le texte « Aucun compte ne correspond. »). Leurs styles (`.admin-search*`, `.admin-pager*`)
quittent `admin-accounts.css` pour `admin-search.css` et `admin-pager.css`, importés dans
`styles/index.css` à côté de `admin-accounts.css`. `AccountsTools` devient :

```tsx
<div className="admin-tools">
  <AdminSearch
    value={query.q}
    placeholder="Nom, enseigne, e-mail ou téléphone"
    onSearch={(q) => onChange({ q })}
  />
  <Segmented … (inchangé) />
  <span className="admin-tools__sort">… (inchangé)</span>
</div>
```

`AdminSearch` reprend tel quel le code actuel (`text`, `seen`, l'effet à `TYPING_DELAY`, `submit`),
avec `value` à la place de `query.q` et `onSearch(q)` à la place de `onChange({ q })`. Le
comportement des Comptes ne change pas : vérifier dans le navigateur que la recherche et « Voir les
suivants » marchent toujours sur `/admin/comptes`.

- [ ] **Step 2 : le hook de chargement**

`apps/web-v2/src/features/admin-prospects/useProspects.ts` :
```ts
/**
 * QUOI     — charge une page de prospects, les quatre chiffres, le nombre de chaque filtre, les
 *            sources et les correspondances à rapprocher.
 * POURQUOI — l'adresse décide (lib/prospect-list.ts) ; la base filtre, cherche et pagine.
 *            `reload` relance tout après une écriture.
 * ATTENTION — une erreur de la base s'affiche telle quelle : jamais une liste vide qui ment.
 */
import { useCallback, useEffect, useState } from 'react'
import type { ProspectsQuery } from '@/lib/prospect-list'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Fn = Database['public']['Functions']
export type ProspectRow = Fn['admin_prospects']['Returns'][number]
export type ProspectStats = Fn['admin_prospects_chiffres']['Returns'][number]
export type Match = Fn['admin_prospects_a_rapprocher']['Returns'][number]

export interface ProspectsData {
  rows: ProspectRow[]
  total: number
  stats: ProspectStats | null
  counts: Map<string, number>
  sources: string[]
  matches: Match[]
}

async function loadProspects({ q, filter, source, page }: ProspectsQuery): Promise<ProspectsData> {
  const [list, stats, filters, sources, matches] = await Promise.all([
    supabase.rpc('admin_prospects', { p_q: q, p_filtre: filter, p_source: source, p_page: page }),
    supabase.rpc('admin_prospects_chiffres'),
    supabase.rpc('admin_prospects_filtres', { p_q: q, p_source: source }),
    supabase.rpc('admin_prospects_sources'),
    supabase.rpc('admin_prospects_a_rapprocher'),
  ])
  const rows = must(list)
  return {
    rows,
    total: rows[0]?.total ?? 0,
    stats: must(stats)[0] ?? null,
    counts: new Map(must(filters).map((row) => [row.filtre, row.nombre])),
    sources: must(sources).map((row) => row.source),
    matches: must(matches),
  }
}

export function useProspects({ q, filter, source, page }: ProspectsQuery) {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ data: ProspectsData | null; error: string | null }>({
    data: null,
    error: null,
  })
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadProspects({ q, filter, source, page })
        if (cancelled) return
        setState({ data, error: null })
      } catch (error) {
        if (cancelled) return
        setState({ data: null, error: error instanceof Error ? error.message : 'Chargement impossible' })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [q, filter, source, page, version])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { ...state, reload }
}
```

- [ ] **Step 3 : les chiffres et le bandeau**

`ProspectsStats.tsx` reprend la forme de `features/admin-accounts/AccountsStats.tsx` (mêmes classes
`admin-stats`, `admin-stat*`) avec ces quatre chiffres (icônes `lucide-react`) :

```tsx
const figures: Figure[] = [
  { label: 'Prospects', Icon: Target, tone: 'prune', value: stats.total,
    detail: `+${stats.semaine} cette semaine` },
  { label: 'Contactés', Icon: Send, tone: 'bleu', value: stats.contactes,
    detail: `${percent(stats.contactes, stats.total)} %` },
  { label: 'Ont répondu', Icon: Reply, tone: 'sauge', value: stats.repondu,
    detail: `${percent(stats.repondu, stats.contactes)} % des contactés` },
  { label: 'Ont créé leur compte', Icon: CircleCheck, tone: 'terre', value: stats.comptes,
    detail: `dont ${stats.comptes_pro} en Pro` },
]
```

`MatchBanner.tsx` :
```tsx
/**
 * QUOI     — le bandeau « N prospects ont le même e-mail ou téléphone qu'un compte Fellowship ».
 * POURQUOI — le rapprochement automatique ne voit que les inscriptions ; ce bandeau montre le reste
 *            (comptes plus anciens, téléphone saisi plus tard), confirmé d'un clic (maquette 2343:2).
 */
import { Link2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function MatchBanner({ count, onOpen }: { count: number; onOpen: () => void }) {
  if (count === 0) return null
  return (
    <aside className="prospect-banner">
      <Link2 size={18} strokeWidth={1.75} aria-hidden="true" />
      <div className="prospect-banner__text">
        <p className="prospect-banner__title">
          {count === 1
            ? '1 prospect a le même e-mail ou téléphone qu’un compte Fellowship'
            : `${count} prospects ont le même e-mail ou téléphone qu’un compte Fellowship`}
        </p>
        <p className="prospect-banner__note">
          Rapprocher coche « Compte créé » et relie le prospect à la fiche de la personne.
        </p>
      </div>
      <Button variant="bare" onClick={onOpen}>
        Voir et rapprocher
      </Button>
    </aside>
  )
}
```
(Vérifier la variante de `Button` la plus proche du bouton blanc bordé de la maquette en lisant
`components/ui/Button.tsx` et `button.css` ; ne pas en inventer une.)

- [ ] **Step 4 : le tableau en lecture**

`ProspectsTable.tsx` : la même table que `EntitiesTable` (`admin-table`, `admin-table__row`,
`admin-table__identity`, `admin-table__name`, `admin-table__meta`, `admin-table__text`), sans lien de
ligne. Colonnes : Personne (nom, marque dessous) · Activité (`activité · ville`) · E-mail ·
Téléphone · Source · Contact (`contactLabel(row.contact_channel, row.contacted_on) ?? '—'`) · Statut
e-mail (`<span className={`prospect-status prospect-status--${row.email_status}`}>` + libellé de
`EMAIL_STATUSES`) · Compte créé (case en lecture seule `checked={row.user_id !== null}`, et si relié
un `Link` vers `/admin/personnes/${row.user_id}` avec l'icône `Link2`) · Note (texte tronqué) ·
Relance (« À relancer » en brique si `row.a_relancer`, sinon « — »). Une valeur absente s'écrit
« — ».

- [ ] **Step 5 : la page**

`ProspectsPage.tsx` : en-tête (`admin-page`, `admin-page__head`, titre « Prospects », phrase « Les
contacts à démarcher, et ceux qui ont déjà franchi le pas. », à droite les boutons « Importer un
fichier » (`Upload`) et « Ajouter un prospect » (`Plus`) — inactifs dans cette tâche, branchés aux
tâches 4 et 5), `ProspectsStats`, `MatchBanner` (`count={data.matches.length}`, `onOpen` branché en
tâche 6), puis les outils :

```tsx
<div className="admin-tools">
  <AdminSearch value={query.q} placeholder="Nom, marque, e-mail ou téléphone" onSearch={(q) => go({ q })} />
  <Segmented
    label="Filtrer"
    options={PROSPECT_FILTERS.map(({ value, label }) => {
      const count = data?.counts.get(value)
      return { value, label: count === undefined ? label : `${label} · ${count}` }
    })}
    value={query.filter}
    onChange={(filter) => go({ filter })}
  />
  <label className="prospect-source">
    <span className="admin-table__sr">Source</span>
    <select
      className="prospect-source__select"
      value={query.source}
      onChange={(event) => go({ source: event.target.value })}
    >
      <option value="">Source : toutes</option>
      {data?.sources.map((source) => (
        <option key={source} value={source}>{source}</option>
      ))}
    </select>
  </label>
</div>
```

`go` suit `AccountsPage` : `setSearch(writeProspectsQuery({ ...query, page: 0, ...next }), { replace: Object.keys(next).join() === 'q' })`.
Puis l'erreur (`admin-page__error`), le tableau, et
`<AdminPager page={query.page} shown={data.rows.length} total={data.total} onPage={(page) => go({ page })} empty="Aucun prospect ne correspond." />`
(`go({ page })` doit garder la page : écrire `setSearch(writeProspectsQuery({ ...query, page }))`
pour ce cas, comme les Comptes).

- [ ] **Step 6 : route, barre, styles, README**

`App.tsx`, à côté de `/admin/comptes` :
```tsx
<Route
  path="/admin/prospects"
  element={
    <AdminPage>
      <ProspectsPage />
    </AdminPage>
  }
/>
```
`Sidebar.tsx`, `ADMIN_ITEMS` (icône `Target` de `lucide-react`) :
```ts
{ to: '/admin/prospects', label: 'Prospects', Icon: Target, prefixes: ['/admin/prospects'] },
```
et retirer de l'en-tête de `Sidebar.tsx` la mention « Prospects arrive au lot 3 ».

`styles/3-components/admin-prospects.css` (importé dans `styles/index.css`) : le bandeau
(`.prospect-banner` : carte `--surface-card`, filet `--line-card`, `--radius-card`, icône, texte,
bouton poussé à droite), la pastille de statut (`.prospect-status` : un point puis le texte ;
`--pas_envoye` point creux gris `--tone-gris-ink`, `--envoye` gris, `--ouvert` `--tone-bleu-ink`,
`--repondu` `--tone-sauge-ink`, `--rebond` `--tone-brique-ink`), la relance en brique
(`.prospect-relance`), le menu source (`.prospect-source__select`, sans bordure, `font:
var(--type-list-meta)`, poussé à droite par `margin-left: auto`). Uniquement des jetons existants des
couches 1-2 ; si une teinte manque, s'arrêter et la signaler (DONE_WITH_CONCERNS) plutôt que d'en
inventer une.

`features/admin-prospects/README.md` : une phrase par fichier. `components/ui/README.md` : ajouter
`AdminSearch` et `AdminPager`.

- [ ] **Step 7 : vérifier et commit**

```bash
pnpm --filter web-v2 lint
pnpm --filter web-v2 exec tsc --noEmit -p .
pnpm --filter web-v2 exec vitest run
```
Attendu : tout vert. Dans le navigateur (le contrôleur, `localhost:5174/v2/admin/prospects`, sur le
compte d'Uriel) : la page s'ouvre par la barre, liste vide « Aucun prospect ne correspond. », les
chiffres à 0, pas de bandeau ; `/admin/comptes` cherche et pagine comme avant.

```bash
git add apps/web-v2/src
git commit -m "feat(admin): la page Prospects en lecture — chiffres, bandeau, filtres, source, tableau

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : modifier dans le tableau, ajouter, supprimer

**Files :**
- Create : `apps/web-v2/src/features/admin-prospects/prospect-writes.ts`,
  `apps/web-v2/src/features/admin-prospects/ProspectCells.tsx`,
  `apps/web-v2/src/components/ui/ConfirmDialog.tsx`,
  `apps/web-v2/src/styles/3-components/confirm-dialog.css`
- Modify : `ProspectsTable.tsx`, `ProspectsPage.tsx`, `admin-prospects.css`, `styles/index.css`,
  les deux README

**Interfaces :**
- Consumes : `writeError`, `normalizeEmail`, `EMAIL_STATUSES`, `CHANNELS`, `contactLabel`
  (`lib/prospect`), `ProspectRow` (`useProspects`).
- Produces :
  - `type ProspectPatch = Database['public']['Tables']['prospects']['Update']`
  - `updateProspect(id: string, patch: ProspectPatch): Promise<void>`
  - `insertProspect(fields: ProspectPatch): Promise<void>`
  - `deleteProspect(id: string): Promise<void>`
  - `unlinkProspect(id: string): Promise<void>`
  - `ConfirmDialog({ title, text, confirmLabel, busy, problem, onConfirm, onClose })`

- [ ] **Step 1 : les écritures**

`prospect-writes.ts` :
```ts
/**
 * QUOI     — les écritures de la liste des prospects : une cellule, une ligne ajoutée, supprimée,
 *            un rapprochement défait.
 * POURQUOI — elles vont droit sur la table, que la RLS réserve aux admins : pas de fonction maison
 *            par champ.
 * ATTENTION — un échec lève une Error au message français (writeError) : la cellule l'affiche.
 */
import { writeError } from '@/lib/prospect'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type ProspectPatch = Database['public']['Tables']['prospects']['Update']

function check(error: { code?: string; message: string } | null) {
  if (error) throw new Error(writeError(error))
}

export async function updateProspect(id: string, patch: ProspectPatch) {
  const { error } = await supabase.from('prospects').update(patch).eq('id', id)
  check(error)
}

export async function insertProspect(fields: ProspectPatch) {
  const { error } = await supabase.from('prospects').insert(fields)
  check(error)
}

export async function deleteProspect(id: string) {
  const { error } = await supabase.from('prospects').delete().eq('id', id)
  check(error)
}

export async function unlinkProspect(id: string) {
  await updateProspect(id, { user_id: null, linked_at: null, linked_by: null })
}
```
(Si le type `Insert` refuse `ProspectPatch` pour `insert`, typer `insertProspect` avec
`Database['public']['Tables']['prospects']['Insert']`.)

- [ ] **Step 2 : les cellules**

`ProspectCells.tsx` — quatre cellules, chacune enregistre par `onSave` (qui écrit puis recharge) :

```tsx
/**
 * QUOI     — les cellules modifiables du tableau des prospects : texte, liste, contact, case.
 * POURQUOI — le prospectant travaille sans quitter le tableau (spec du lot 3) : un clic ouvre le
 *            texte, Entrée ou la sortie du champ enregistre, Échap annule.
 * ATTENTION — pendant l'écriture et le rechargement, la cellule montre déjà la nouvelle valeur ;
 *            un échec rend l'ancienne et affiche le message.
 */
import { useRef, useState, type ReactNode } from 'react'

type Save<T> = (next: T) => Promise<void>

/** La valeur montrée : celle en cours d'écriture, sinon celle de la base. */
function usePending<T>(value: T) {
  const [pending, setPending] = useState<{ value: T } | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  if (pending && Object.is(pending.value, value)) setPending(null)
  async function save(next: T, write: Save<T>) {
    if (Object.is(next, value)) return
    setProblem(null)
    setPending({ value: next })
    try {
      await write(next)
    } catch (error) {
      setPending(null)
      setProblem(error instanceof Error ? error.message : 'Enregistrement impossible')
    }
  }
  return { shown: pending ? pending.value : value, problem, save }
}

function Problem({ text }: { text: string | null }) {
  return text ? <span className="prospect-cell__problem">{text}</span> : null
}

export function TextCell({
  value,
  label,
  onSave,
  autoOpen = false,
  emptyText = '—',
  render,
}: {
  value: string | null
  label: string
  onSave: Save<string | null>
  autoOpen?: boolean
  emptyText?: string
  render?: (text: string) => ReactNode
}) {
  const { shown, problem, save } = usePending(value)
  const [editing, setEditing] = useState(autoOpen)
  const [draft, setDraft] = useState(value ?? '')
  const cancelled = useRef(false)

  function open() {
    cancelled.current = false
    setDraft(shown ?? '')
    setEditing(true)
  }

  if (editing) {
    return (
      <input
        className="prospect-cell__input"
        aria-label={label}
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            cancelled.current = true
            event.currentTarget.blur()
          }
        }}
        onBlur={() => {
          setEditing(false)
          if (!cancelled.current) void save(draft.trim() || null, onSave)
        }}
      />
    )
  }
  return (
    <span className="prospect-cell">
      <button type="button" className="prospect-cell__button" onClick={open} aria-label={label}>
        {shown ? (render ? render(shown) : shown) : <span className="prospect-cell__empty">{emptyText}</span>}
      </button>
      <Problem text={problem} />
    </span>
  )
}

export function SelectCell<T extends string>({
  value,
  label,
  options,
  className,
  onSave,
}: {
  value: T | null
  label: string
  options: readonly { value: T; label: string }[]
  className: (shown: T | null) => string
  onSave: Save<T | null>
}) {
  const { shown, problem, save } = usePending(value)
  return (
    <span className="prospect-cell">
      <select
        className={className(shown)}
        aria-label={label}
        value={shown ?? ''}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value)
          void save(next ? next.value : null, onSave)
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Problem text={problem} />
    </span>
  )
}

export function CheckCell({
  checked,
  label,
  onSave,
  disabled = false,
  title,
}: {
  checked: boolean
  label: string
  onSave: Save<boolean>
  disabled?: boolean
  title?: string
}) {
  const { shown, problem, save } = usePending(checked)
  return (
    <span className="prospect-cell">
      <input
        type="checkbox"
        className="prospect-check"
        aria-label={label}
        title={title}
        checked={shown}
        disabled={disabled}
        onChange={(event) => void save(event.target.checked, onSave)}
      />
      <Problem text={problem} />
    </span>
  )
}
```

La cellule Contact, dans le même fichier : en lecture, un bouton qui montre
`contactLabel(channel, on) ?? '—'` ; au clic, un petit groupe (`.prospect-contact`) avec un `<select>`
du canal (option vide « — » puis `CHANNELS`) et un `<input type="date">` ; chaque changement
enregistre aussitôt son champ (`onSave({ contact_channel })` ou `onSave({ contacted_on })`, vide →
`null`) ; le groupe se referme quand le focus en sort (`onBlur` du groupe avec
`!event.currentTarget.contains(event.relatedTarget)`) ou sur Échap.

```tsx
export function ContactCell({
  channel,
  on,
  onSave,
}: {
  channel: string | null
  on: string | null
  onSave: (patch: { contact_channel?: string | null; contacted_on?: string | null }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  async function write(patch: { contact_channel?: string | null; contacted_on?: string | null }) {
    setProblem(null)
    try {
      await onSave(patch)
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Enregistrement impossible')
    }
  }
  if (!open) {
    return (
      <span className="prospect-cell">
        <button type="button" className="prospect-cell__button" onClick={() => setOpen(true)} aria-label="Contact">
          {contactLabel(channel, on) ?? <span className="prospect-cell__empty">—</span>}
        </button>
        <Problem text={problem} />
      </span>
    )
  }
  return (
    <span
      className="prospect-contact"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <select
        className="prospect-contact__channel"
        aria-label="Canal"
        autoFocus
        value={channel ?? ''}
        onChange={(event) => void write({ contact_channel: event.target.value || null })}
      >
        <option value="">—</option>
        {CHANNELS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        className="prospect-contact__date"
        aria-label="Date du contact"
        value={on ?? ''}
        onChange={(event) => void write({ contacted_on: event.target.value || null })}
      />
    </span>
  )
}
```
(Import de `CHANNELS` et `contactLabel` depuis `@/lib/prospect`.)

- [ ] **Step 3 : la fenêtre de confirmation**

`components/ui/ConfirmDialog.tsx`, sur le modèle de `DeletionDialog` (`<dialog>`, `showModal()` au
montage, Échap et clic sur le voile ferment sauf pendant `busy`) :

```tsx
/**
 * QUOI     — une fenêtre de confirmation : titre, texte, message d'échec, Annuler et le bouton
 *            d'action.
 * POURQUOI — supprimer un prospect ou défaire un rapprochement ne se fait pas d'un clic perdu.
 * ATTENTION — l'élément <dialog> fait le voile, Échap et le piège du focus ; pendant `busy`, rien
 *            ne ferme la fenêtre.
 */
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  title: string
  text: string
  confirmLabel: string
  busy: boolean
  problem: string | null
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ title, text, confirmLabel, busy, problem, onConfirm, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  function close() {
    if (!busy) onClose()
  }
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>
        <p className="confirm-dialog__text">{text}</p>
        {problem && <p className="confirm-dialog__problem">{problem}</p>}
        <div className="confirm-dialog__actions">
          <Button variant="bare" onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? 'Un instant…' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
```
`confirm-dialog.css` reprend les jetons de `delete-dialog.css` (carte, voile, titre, texte, problème
en `--tone-brique-ink`), sans valeur en dur.

- [ ] **Step 4 : brancher le tableau**

`ProspectsTable` reçoit `onChanged: () => void` (le `reload` du hook) et `onAskDelete(row)`,
`onAskUnlink(row)`. Chaque cellule enregistre par une fonction `save(row.id, patch)` qui appelle
`updateProspect` puis `onChanged()`. Les cellules :

| Colonne | Cellule |
| --- | --- |
| Personne | `TextCell` nom (`name`) au-dessus, `TextCell` marque (`brand`) dessous en `admin-table__meta` |
| Activité | `TextCell` `activity` · `TextCell` `city` sur une ligne |
| E-mail | `TextCell` ; l'enregistrement passe `normalizeEmail(next)` |
| Téléphone | `TextCell` `phone` |
| Source | `TextCell` `source` |
| Contact | `ContactCell` |
| Statut e-mail | `SelectCell` sur `EMAIL_STATUSES`, `className={(s) => `prospect-status prospect-status--${s ?? 'pas_envoye'}`}` ; enregistrement `{ email_status: next ?? 'pas_envoye' }` |
| Compte créé | `CheckCell` `checked={row.user_id !== null}` ; décoché → `onAskUnlink(row)` au lieu d'écrire (la fenêtre écrit) ; non relié → `disabled` avec `title="Se coche depuis « Voir et rapprocher »"` ; relié → le lien `Link2` vers la fiche |
| Note | `TextCell` `note`, texte tronqué (`.prospect-note`) |
| Relance | `CheckCell` `a_relancer`, suivi du texte « À relancer » en brique quand coché |
| (fin) | bouton corbeille (`Trash2`, `aria-label="Supprimer ce prospect"`, `.prospect-row__delete`, visible au survol de la ligne et au focus) → `onAskDelete(row)` |

Pour « Compte créé » décoché : `onSave` de la `CheckCell` reçoit `false` → appelle `onAskUnlink(row)`
et lève une `Error('')` pour que la case revienne cochée tant que la fenêtre n'a pas confirmé ; ne pas
afficher de message vide (`Problem` ne rend rien pour une chaîne vide).

- [ ] **Step 5 : ajouter et supprimer dans la page**

Dans `ProspectsPage` :
- état `adding: boolean` ; « Ajouter un prospect » le passe à `true`. Le tableau rend alors, en tête,
  une ligne `prospect-row--draft` avec seulement une `TextCell` `autoOpen` « Nom », les autres
  cellules à « — ». Son `onSave(next)` : `next === null` → `setAdding(false)` sans rien écrire ;
  sinon `insertProspect({ name: next })`, `setAdding(false)`, `reload()`. Si la page n'est pas sur
  le filtre « Tous », la page 0 et sans recherche ni source, « Ajouter » y revient d'abord
  (`setSearch(new URLSearchParams())`) pour que la nouvelle ligne soit visible.
- état `toDelete: ProspectRow | null` → `ConfirmDialog` « Supprimer ce prospect ? », texte
  « {nom ou marque ou e-mail} disparaît de la liste. C'est définitif. », bouton « Supprimer » ;
  confirmer → `deleteProspect(id)` → fermer → `reload()` ; un échec s'affiche dans la fenêtre.
- état `toUnlink: ProspectRow | null` → `ConfirmDialog` « Défaire le rapprochement ? », texte
  « Le prospect n'est plus relié au compte de {user_name}. », bouton « Défaire » →
  `unlinkProspect(id)` → `reload()`.

- [ ] **Step 6 : styles**

Dans `admin-prospects.css` : `.prospect-cell` (colonne : la valeur, puis le problème en
`--tone-brique-ink` et `--type-list-meta`), `.prospect-cell__button` (texte nu, aligné à gauche,
curseur texte, survol `--surface-chip-neutral` arrondi `--round-6`), `.prospect-cell__input` et
`.prospect-contact` (champ compact `--line-card`, `--round-6`, `font: var(--type-list-name)`),
`.prospect-cell__empty` (`--ink-section-pale`), `.prospect-check`, `.prospect-note` (une ligne,
`text-overflow: ellipsis`, largeur max par jeton), `.prospect-row__delete` (`opacity: 0`, révélé par
`.admin-table__row:hover` et `:focus-visible`, transition `--duration-fast` `--ease-out`,
`prefers-reduced-motion` respecté), `.prospect-row--draft`. Les `<select>` de statut :
`appearance: none`, sans bordure, fond transparent, la couleur de la pastille.

- [ ] **Step 7 : vérifier et commit**

```bash
pnpm --filter web-v2 lint
pnpm --filter web-v2 exec tsc --noEmit -p .
pnpm --filter web-v2 exec vitest run
```
Dans le navigateur (contrôleur, avec Uriel) : ajouter « Prospect test », modifier chaque type de
cellule (texte, e-mail en majuscules → rangé en minuscules, statut, contact, relance), saisir le
même e-mail sur un second prospect → « Cet e-mail est déjà dans la liste. », supprimer les deux.

```bash
git add apps/web-v2/src
git commit -m "feat(admin): les prospects se modifient dans le tableau, s'ajoutent et se suppriment

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5 : l'import CSV

**Files :**
- Modify : `apps/web-v2/package.json` (`papaparse`, `@types/papaparse`)
- Create : `apps/web-v2/src/features/admin-prospects/ImportDialog.tsx`
- Modify : `prospect-writes.ts` (`knownEmails`, `importProspects`), `ProspectsPage.tsx`,
  `admin-prospects.css`, README

**Interfaces :**
- Consumes : `planImport`, `emailsOf`, `NewProspect`, `ImportPlan` (`lib/prospect-import`).
- Produces : `knownEmails(emails: string[]): Promise<Set<string>>`,
  `importProspects(rows: NewProspect[]): Promise<void>`,
  `ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void })`.

- [ ] **Step 1 : la dépendance**

```bash
pnpm --filter web-v2 add papaparse
pnpm --filter web-v2 add -D @types/papaparse
```

- [ ] **Step 2 : les écritures de l'import**

Dans `prospect-writes.ts` :
```ts
const EMAIL_CHUNK = 100

/** Les e-mails du fichier déjà dans la liste, demandés par paquets (l'adresse a une longueur max). */
export async function knownEmails(emails: string[]): Promise<Set<string>> {
  const known = new Set<string>()
  for (let start = 0; start < emails.length; start += EMAIL_CHUNK) {
    const { data, error } = await supabase
      .from('prospects')
      .select('email')
      .in('email', emails.slice(start, start + EMAIL_CHUNK))
    check(error)
    for (const row of data ?? []) if (row.email) known.add(row.email)
  }
  return known
}

/** Un seul envoi ; un e-mail arrivé entre l'aperçu et l'import est ignoré, pas dupliqué. */
export async function importProspects(rows: NewProspect[]) {
  const { error } = await supabase
    .from('prospects')
    .upsert(rows, { onConflict: 'email', ignoreDuplicates: true })
  check(error)
}
```
(import de `NewProspect` depuis `@/lib/prospect-import`.)

- [ ] **Step 3 : la fenêtre**

`ImportDialog.tsx` — un `<dialog>` (même mécanique que `ConfirmDialog`) en trois temps :
1. Texte « Un fichier CSV exporté d'Excel ou de Google Sheets (CSV UTF-8), avec les titres en
   première ligne : nom, marque, activité, ville, e-mail, téléphone, source, note. », un
   `<input type="file" accept=".csv,text/csv">`, et un champ « Source pour tout le fichier
   (facultatif) ».
2. Au choix du fichier : lire avec Papa Parse, puis `knownEmails(emailsOf(rows))`, puis
   `planImport(rows, known, source)` (recalculé quand la source change) :
   ```ts
   function readCsv(file: File): Promise<string[][]> {
     return new Promise((resolve, reject) => {
       Papa.parse<string[]>(file, {
         skipEmptyLines: 'greedy',
         complete: (result) => resolve(result.data),
         error: (error) => reject(error),
       })
     })
   }
   ```
   L'aperçu : « {n} prospects à ajouter », puis, s'il y en a, « {d} déjà dans la liste (même
   e-mail) » et « {i} lignes sans nom, marque ni e-mail ignorées » ; et les 5 premiers noms. Rien
   à ajouter : « Aucun prospect à ajouter : vérifie les titres de colonnes. »
3. « Importer {n} prospects » → `importProspects(plan.toAdd)` → `onDone()` (la page ferme et
   recharge). Un échec s'affiche dans la fenêtre ; pendant l'envoi, rien ne ferme.

Garder le fichier sous 400 lignes ; si la lecture et l'aperçu alourdissent trop, sortir l'aperçu dans
`ImportPreview.tsx`.

- [ ] **Step 4 : brancher et vérifier**

« Importer un fichier » ouvre la fenêtre (`importing: boolean` dans la page) ; `onDone` →
`setImporting(false)` + `reload()`.

Fichier d'essai à créer dans le dossier temporaire (pas dans le dépôt), en `;` comme Excel :
```
Nom;Marque;E-mail;Téléphone;Ville
Essai Un;Atelier Essai;essai-un@exemple.fr;06 00 00 00 01;Lyon
Essai Deux;Forge Essai;ESSAI-UN@exemple.fr;;Nantes
;;;;Paris
```
Attendu à l'aperçu : 1 à ajouter, 1 doublon, 1 ignorée. Importer, voir la ligne, la supprimer.

```bash
pnpm --filter web-v2 lint
pnpm --filter web-v2 exec tsc --noEmit -p .
git add apps/web-v2/package.json pnpm-lock.yaml apps/web-v2/src
git commit -m "feat(admin): importer des prospects depuis un CSV, avec aperçu et doublons écartés

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6 : rapprocher, et le prospect d'origine sur la fiche

**Files :**
- Create : `apps/web-v2/src/features/admin-prospects/MatchDialog.tsx`
- Create : `apps/web-v2/src/features/admin-person/ProspectOriginCard.tsx`
- Modify : `prospect-writes.ts` (`linkProspect`), `ProspectsPage.tsx`,
  `apps/web-v2/src/features/admin-person/PersonPage.tsx`, `admin-prospects.css`, les README

**Interfaces :**
- Consumes : `Match` (`useProspects`), RPC `admin_rapprocher`, `admin_prospect_de`,
  `AdminCard`, `formatFullDate`, `formatDayMonthShort`, `parseSqlDate` (`lib/dates`).
- Produces : `linkProspect(prospectId: string, userId: string, par: string): Promise<void>`,
  `MatchDialog({ matches, onClose, onLinked })`, `ProspectOriginCard({ userId })`.

- [ ] **Step 1 : l'écriture**

```ts
export async function linkProspect(prospectId: string, userId: string, par: string) {
  const { error } = await supabase.rpc('admin_rapprocher', {
    p_prospect: prospectId,
    p_user: userId,
    p_par: par,
  })
  check(error)
}
```

- [ ] **Step 2 : la fenêtre « Voir et rapprocher »**

`MatchDialog.tsx` : un `<dialog>` (mécanique de `ConfirmDialog`), titre « Rapprocher les prospects »,
une ligne par correspondance : à gauche le prospect (`prospect_name ?? prospect_brand`), au milieu le
compte (`user_name`, `user_email` dessous), la raison (« même e-mail » / « même téléphone »), à droite
« Rapprocher » → `linkProspect(m.prospect_id, m.user_id, m.par)` puis `onLinked()` (la page recharge,
la ligne disparaît de `matches`). Plus de correspondances → la fenêtre se ferme toute seule. Un échec
s'affiche sur sa ligne. La page ouvre la fenêtre depuis `MatchBanner` (`matching: boolean`).

- [ ] **Step 3 : le bloc « Prospect d'origine »**

`ProspectOriginCard.tsx` :
```tsx
/**
 * QUOI     — le bloc « Prospect d'origine » de la fiche d'une personne : comment et quand elle a
 *            été rapprochée de son prospect, sa source, son dernier contact (maquette 2344:2).
 * POURQUOI — on voit d'où vient un compte démarché.
 * ATTENTION — rien ne s'affiche sans prospect relié ; jamais de genre déduit (« Rapprochement »).
 */
```
Il charge `supabase.rpc('admin_prospect_de', { p_user: userId })` (patron du lot 2 : fonction de
chargement hors de l'effet, un seul `if (cancelled) return`, `must()`), et ne rend rien si la réponse
est vide. Sinon un `AdminCard` titre « Prospect d'origine », `Icon={Link2}`, `tone="bleu"` :
- « Rapprochement par e-mail le 13 mars 2026 » (`par téléphone` si `linked_by = 'telephone'`, date
  `formatFullDate(new Date(linked_at))`) ;
- dessous, en petit : `Source : {source}` et `contact le {formatDayMonthShort(parseSqlDate(contacted_on))}`
  joints par « · », chacun seulement s'il existe.
Une erreur de chargement s'affiche dans le bloc (jamais un bloc absent qui ment).

Dans `PersonPage.tsx`, sous `NotesCard` :
```tsx
<ProspectOriginCard key={person.actor_id} userId={person.actor_id} />
```

- [ ] **Step 4 : vérifier et commit**

```bash
pnpm --filter web-v2 lint
pnpm --filter web-v2 exec tsc --noEmit -p .
pnpm --filter web-v2 exec vitest run
```
Dans le navigateur (contrôleur, avec Uriel) : créer un prospect avec l'e-mail du compte de test
d'Uriel → le bandeau dit « 1 prospect… » → « Voir et rapprocher » → « Rapprocher » → « Compte
créé » coché, lien vers la fiche → la fiche montre « Prospect d'origine » → décocher « Compte créé »,
confirmer → le bandeau revient → supprimer le prospect.

```bash
git add apps/web-v2/src
git commit -m "feat(admin): rapprocher un prospect d'un compte, et son origine sur la fiche de la personne

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7 (contrôleur) : livrer

- [ ] **Step 1 : comparer à la maquette** — `get_screenshot` de `2343:2` à côté de la capture de
  `/v2/admin/prospects` ; reprendre chaque écart (tailles, couleurs, alignements).
- [ ] **Step 2 : version** — `apps/web-v2/package.json` : `2.47.0` → `2.48.0` ; commit
  `chore(v2): les prospects sont en ligne (V2 2.48.0)`.
- [ ] **Step 3 : déployer** — `pnpm deploy:v2`, puis
  `curl -s https://flw.sh/v2/ | grep -o 'src="/v2/assets/[^"]*"'` égal à
  `apps/web-v2/dist/index.html`.
- [ ] **Step 4 : pousser et noter** — `git push` seul ; `_État.md` : *Où on en est* (lot 3 livré),
  *Prochaine action* (lot 4, lot 1b).
