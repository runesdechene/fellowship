# V2 — Messagerie de prospection, lot 3b : écrire et envoyer — plan d'exécution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** depuis la page d'un prospect, un admin choisit un modèle, retouche et envoie un e-mail
depuis son adresse `@equipe.flw.sh` ; les expéditeurs et les modèles se gèrent dans
l'administration ; la livraison, les rebonds et les désinscriptions se tiennent tout seuls.

**Architecture :** trois tables (expéditeurs, modèles, messages) réservées aux admins ; une fonction
serveur `prospect-send` compose (signature, pied de désinscription, en-têtes de fil) et envoie par
l'API de Resend ; `prospect-events` reçoit les signaux signés de Resend ; `prospect-unsubscribe` sert
la page de désinscription. Le front remplit le modèle (fonction pure) et affiche le fil.

**Tech Stack :** Supabase (Postgres, RLS, Edge Functions Deno), Resend (API REST, webhooks Svix),
React 19, React Router, vitest.

**Spec :** `docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md` (partie
« Lot 3b »).

## Global Constraints

- Base = **production**. Migrations appliquées par le contrôleur seulement
  (`node_modules/supabase/bin/supabase.exe db push --linked`, `SUPABASE_DB_PASSWORD` lu dans `.env`) ;
  jamais `apply_migration`. Fonctions déployées par le contrôleur (`functions deploy <nom>`).
- Toute fonction utilisée dans un index, un check ou un défaut reste exécutable par tous les rôles
  (`.claude/rules/supabase.md`, piège du 16/10).
- Chaque fonction `admin_*` : `security definer`, `set search_path to 'public'`,
  `perform admin_garde();`, `revoke … from public, anon`, `grant execute … to authenticated`. Listes
  triées.
- Aucun envoi réel vers un vrai prospect pendant les essais : seulement entre nos adresses
  (`uriel@equipe.flw.sh` → la boîte ProtonMail d'Uriel).
- Les secrets (`RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`) vivent dans les secrets des fonctions et
  dans `.env` (gitignoré), jamais dans le dépôt.
- On ne déduit jamais le genre dans les textes.
- V2 : TS strict, 400 lignes max par fichier, pas de style dans les `.tsx`, jetons des couches 1-2
  seulement, en-tête `QUOI / POURQUOI` partout, `README.md` par dossier, `pnpm --filter web-v2 lint`
  vert. Commits Conventional en français, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Prérequis (Uriel, avant la tâche 2)

1. Dans Resend : **Add Domain** `equipe.flw.sh` (région Irlande, comme `flw.sh`), **Enable Sending**
   (la réception s'active au lot 3c). Le contrôleur lit les enregistrements dans la page du domaine et donne les
   commandes `! netlify api createDnsRecord …` à lancer (comme le 16/10).
2. Une **clé API** Resend « Sending access » limitée à `equipe.flw.sh`, et un **webhook** vers
   `https://trbxpsknbtisqwefqoub.supabase.co/functions/v1/prospect-events` (événements
   `email.delivered`, `email.bounced`, `email.complained`) ; son « Signing secret ».
3. Uriel lance lui-même :
   `! node_modules/supabase/bin/supabase.exe secrets set RESEND_API_KEY=… RESEND_WEBHOOK_SECRET=… --project-ref trbxpsknbtisqwefqoub`
   et ajoute les deux lignes à `.env`.

## Décisions du plan

- **La page de désinscription est servie par la fonction `prospect-unsubscribe`** (HTML minimal), pas
  par une route de la V2 : la V2 exige une connexion, un prospect n'en a pas. Écart avec la spec
  (`/desinscription/:jeton` « V2, publique ») ; même effet.
- **Les notes d'un prospect restent le champ `note`** (un bloc « Note » modifiable), pas les notes
  datées de `admin_notes`, qui pointent vers un acteur — un prospect n'en est pas un. La maquette
  montre des notes datées : à valider avec Uriel.
- **On n'envoie que depuis sa propre adresse.** Si le prospect est suivi par quelqu'un d'autre, la zone
  d'écriture propose « Prendre le relais » (qui change le suiveur), sans envoyer au nom d'un autre.
  Un prospect sans suiveur prend comme suiveur celui qui lui écrit.
- **Entre les lots, les réponses vont dans la boîte personnelle de l'expéditeur** : `Reply-To` = l'e-mail
  du compte de l'expéditeur (`users.email`) jusqu'au lot 3c, qui le remplacera par l'adresse
  `@equipe.flw.sh` une fois la réception codée. La réception de Resend ne s'active qu'au lot 3c.
- Le `Message-ID` est posé par nous (`<uuid@equipe.flw.sh>`) dans les en-têtes ; la tâche 7 vérifie
  que Resend le garde (sinon on retient l'identifiant renvoyé dans les signaux, pour le lot 3c).

## Review Focus

1. **Un prospect désinscrit, ou sans e-mail** : l'envoi est refusé par le serveur, quel que soit
   l'écran — testé par la fonction de garde `sendRefusal` (tâche 3).
2. **Un emplacement de modèle sans valeur** (`{prénom}` sans nom) : jamais « Bonjour , » — testé en
   tâche 3 (`fillTemplate`).
3. **Une signature forgée sur `prospect-events`** : rien n'est écrit, réponse 400 — vérifié en tâche 6.
4. **Un texte avec `<`, `&` ou un lien** : l'HTML envoyé est échappé, les liens cliquables — testé en
   tâche 3 (`toHtml`).
5. **Deux admins sur le même prospect** : seul le suiveur envoie ; l'autre voit « Prendre le relais » —
   refus serveur `not_owner` testé en tâche 3 (`sendRefusal`).

---

### Task 1 : la base

**Files :**
- Create : `supabase/migrations/20261016180000_prospection_messagerie.sql`
- Modify : `apps/web-v2/src/types/supabase.ts` (régénéré)

**Interfaces — Produces :** tables `prospect_senders`, `prospect_templates`, `prospect_messages` ;
colonnes `prospects.owner_id`, `unsubscribed_at`, `unsubscribe_token` ; fonctions
`admin_prospect(p_id uuid)`, `admin_prospect_messages(p_id uuid)`, `admin_prospect_modeles()`,
`admin_prospect_expediteurs()` ; `admin_prospects(p_q, p_filtre, p_source, p_suivi, p_page)` et
`admin_prospects_filtres(p_q, p_source, p_suivi)` gagnent `p_suivi text` (`''` = tous, `'moi'`, ou
l'uuid d'un compte) et `admin_prospects` rend `owner_id`, `owner_name`.

- [ ] **Step 1 : écrire la migration**

```sql
-- POURQUOI : lot 3b de la messagerie de prospection (spec 2026-10-16). Les admins écrivent et
-- envoient leurs e-mails de prospection depuis Fellowship, chacun depuis son adresse
-- @equipe.flw.sh. Trois tables (expéditeurs, modèles, messages), réservées aux admins ; le
-- prospect gagne son suiveur et sa désinscription. Le rapprochement automatique à l'inscription
-- est retiré : un admin confirme désormais chaque rapprochement (Uriel, 16/10 : l'automatique
-- « efface la réussite »). Le statut « ouvert » disparaît (aucun suivi d'ouverture).

drop trigger prospect_relier_inscription on public.users;
drop function public.prospect_relier_inscription();

update public.prospects set email_status = 'envoye' where email_status = 'ouvert';
alter table public.prospects drop constraint prospects_email_status_check;
alter table public.prospects add constraint prospects_email_status_check
  check (email_status in ('pas_envoye', 'envoye', 'repondu', 'rebond'));

alter table public.prospects
  add column owner_id uuid references public.users(actor_id) on delete set null,
  add column unsubscribed_at timestamptz,
  add column unsubscribe_token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

create table public.prospect_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(actor_id) on delete cascade,
  alias text not null unique check (alias ~ '^[a-z0-9][a-z0-9.-]{0,40}$'),
  display_name text not null check (length(trim(display_name)) > 0),
  signature text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.prospect_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('premier_contact', 'relance', 'bienvenue')),
  name text not null check (length(trim(name)) > 0),
  subject text not null default '',
  body text not null default '',
  archived_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.prospect_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete cascade,
  direction text not null check (direction in ('out', 'in')),
  sender_id uuid references public.prospect_senders(id) on delete set null,
  from_email text not null,
  to_email text not null,
  subject text not null default '',
  body_text text not null default '',
  message_id text unique,
  in_reply_to text,
  references_ids text[] not null default '{}',
  resend_id text unique,
  template_id uuid references public.prospect_templates(id) on delete set null,
  delivery text check (delivery in ('envoye', 'delivre', 'rebond', 'plainte')),
  has_attachments boolean not null default false,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);
create index prospect_messages_prospect_idx on public.prospect_messages (prospect_id, created_at, id);
create index prospect_messages_template_idx on public.prospect_messages (template_id);

alter table public.prospect_senders enable row level security;
alter table public.prospect_templates enable row level security;
alter table public.prospect_messages enable row level security;
create policy prospect_senders_admin on public.prospect_senders for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy prospect_templates_admin on public.prospect_templates for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Les messages s'écrivent par les fonctions serveur (clé de service) : les admins les lisent.
create policy prospect_messages_admin_lecture on public.prospect_messages for select to authenticated
  using ((select public.is_admin()));
revoke all on public.prospect_senders, public.prospect_templates, public.prospect_messages from anon;

-- Le suivi : '' = tous, 'moi' = l'appelant, sinon l'uuid d'un compte.
create function public.prospect_suivi(p public.prospects, p_suivi text) returns boolean
language sql stable set search_path to 'public' as $$
  select case
    when coalesce(p_suivi, '') = '' then true
    when p_suivi = 'moi' then p.owner_id = auth.uid()
    else p.owner_id::text = p_suivi
  end;
$$;
revoke all on function public.prospect_suivi(public.prospects, text) from public, anon, authenticated;

drop function public.admin_prospects(text, text, text, int);
create function public.admin_prospects(p_q text default '', p_filtre text default 'tous',
  p_source text default '', p_suivi text default '', p_page int default 0)
returns table (id uuid, name text, brand text, activity text, city text, email text, phone text,
  source text, note text, contact_channel text, contacted_on date, email_status text,
  a_relancer boolean, user_id uuid, user_name text, linked_at timestamptz, linked_by text,
  owner_id uuid, owner_name text, unsubscribed_at timestamptz, created_at timestamptz,
  total bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.brand, p.activity, p.city, p.email, p.phone, p.source, p.note,
    p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.user_id,
    u.display_name::text, p.linked_at, p.linked_by, p.owner_id, o.display_name::text,
    p.unsubscribed_at, p.created_at, count(*) over ()
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where prospect_dans_filtre(p, p_filtre) and prospect_cherche(p, p_q, p_source)
    and prospect_suivi(p, p_suivi)
  order by p.created_at desc, p.id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

drop function public.admin_prospects_filtres(text, text);
create function public.admin_prospects_filtres(p_q text default '', p_source text default '',
  p_suivi text default '')
returns table (filtre text, nombre bigint)
language plpgsql stable security definer set search_path to 'public' as $$
declare f text;
begin
  perform admin_garde();
  foreach f in array array['tous', 'a_contacter', 'contactes', 'repondu', 'compte', 'a_relancer']
  loop
    filtre := f;
    select count(*) into nombre from prospects p
      where prospect_dans_filtre(p, f) and prospect_cherche(p, p_q, p_source)
        and prospect_suivi(p, p_suivi);
    return next;
  end loop;
end $$;

create function public.admin_prospect(p_id uuid)
returns table (id uuid, name text, brand text, activity text, city text, email text, phone text,
  source text, note text, contact_channel text, contacted_on date, email_status text,
  a_relancer boolean, user_id uuid, user_name text, owner_id uuid, owner_name text,
  unsubscribed_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.brand, p.activity, p.city, p.email, p.phone, p.source, p.note,
    p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.user_id,
    u.display_name::text, p.owner_id, o.display_name::text, p.unsubscribed_at, p.created_at
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where p.id = p_id;
end $$;

create function public.admin_prospect_messages(p_id uuid)
returns table (id uuid, direction text, sender_user_id uuid, sender_name text, from_email text,
  to_email text, subject text, body_text text, message_id text, references_ids text[],
  delivery text, has_attachments boolean, at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select m.id, m.direction, s.user_id, s.display_name, m.from_email, m.to_email, m.subject,
    m.body_text, m.message_id, m.references_ids, m.delivery, m.has_attachments,
    coalesce(m.sent_at, m.received_at, m.created_at)
  from prospect_messages m
  left join prospect_senders s on s.id = m.sender_id
  where m.prospect_id = p_id
  order by coalesce(m.sent_at, m.received_at, m.created_at), m.id;
end $$;

-- Un envoi « répondu » : un message reçu dans le même fil après lui.
create function public.admin_prospect_modeles()
returns table (id uuid, kind text, name text, subject text, body text, archived_at timestamptz,
  envois bigint, reponses bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select t.id, t.kind, t.name, t.subject, t.body, t.archived_at,
    (select count(*) from prospect_messages m where m.template_id = t.id),
    (select count(*) from prospect_messages m where m.template_id = t.id
      and exists (select 1 from prospect_messages r where r.prospect_id = m.prospect_id
        and r.direction = 'in' and r.received_at > m.sent_at))
  from prospect_templates t
  order by case t.kind when 'premier_contact' then 0 when 'relance' then 1 else 2 end,
    t.created_at, t.id;
end $$;

-- Palier conseillé d'un domaine neuf : 20 par jour la 1re semaine d'envois, 40 la 2e, puis 80.
create function public.admin_prospect_expediteurs()
returns table (id uuid, user_id uuid, user_name text, alias text, display_name text,
  signature text, active boolean, envoyes_aujourdhui bigint, palier int)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select s.id, s.user_id, u.display_name::text, s.alias, s.display_name, s.signature, s.active,
    (select count(*) from prospect_messages m where m.sender_id = s.id
      and (m.sent_at at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date),
    (select case
       when min(m.sent_at) is null or now() - min(m.sent_at) < interval '7 days' then 20
       when now() - min(m.sent_at) < interval '14 days' then 40
       else 80 end
     from prospect_messages m where m.sender_id = s.id)
  from prospect_senders s
  join users u on u.actor_id = s.user_id
  order by s.created_at, s.id;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_prospects(text, text, text, text, int)', 'admin_prospects_filtres(text, text, text)',
    'admin_prospect(uuid)', 'admin_prospect_messages(uuid)', 'admin_prospect_modeles()',
    'admin_prospect_expediteurs()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
```

Avant d'écrire : relire la définition **live** de `prospect_dans_filtre` (le filtre `contactes`
lit `email_status <> 'pas_envoye'` : `rebond` y reste « contacté », comme aujourd'hui).

- [ ] **Step 2 (contrôleur) : appliquer, régénérer les types, vérifier**

```bash
export SUPABASE_DB_PASSWORD=$(grep ^SUPABASE_DB_PASSWORD= .env | cut -d= -f2-)
node_modules/supabase/bin/supabase.exe db push --linked
node_modules/supabase/bin/supabase.exe gen types typescript --linked --schema public > "$TMP/types.ts" && cp "$TMP/types.ts" apps/web-v2/src/types/supabase.ts
node_modules/supabase/bin/supabase.exe db query --linked "set local role anon; select * from admin_prospect_modeles()"
node_modules/supabase/bin/supabase.exe db query --linked "select tgname from pg_trigger where tgname = 'prospect_relier_inscription'"
```
Attendu : `permission denied for function admin_prospect_modeles` ; aucun déclencheur.

- [ ] **Step 3 : adapter l'appel existant et commit**

`features/admin-prospects/useProspects.ts` passe `p_suivi: query.suivi` aux deux appels (tâche 5
ajoute `suivi` à `ProspectsQuery` ; d'ici là, `p_suivi: ''`). `lib/prospect.ts` : retirer `ouvert`
d'`EmailStatus` et d'`EMAIL_STATUSES`. `pnpm --filter web-v2 exec tsc --noEmit -p .` vert.

```bash
git add supabase/migrations/20261016180000_prospection_messagerie.sql apps/web-v2/src
git commit -m "feat(admin): la base de la messagerie de prospection — expéditeurs, modèles, messages, suiveur

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2 (contrôleur, avec Uriel) : le domaine et les secrets

- [ ] Uriel ajoute `equipe.flw.sh` dans Resend (envoi et réception). Le contrôleur lit les
  enregistrements (page du domaine, `javascript_tool` pour les valeurs complètes) et donne les
  commandes `! netlify api createDnsRecord --data '{"zone_id":"69309c9de9551558952559be","body":{…}}'`.
- [ ] Le contrôleur vérifie chaque enregistrement auprès de `dns1.p01.nsone.net` (`nslookup`), puis
  Uriel clique « Verify DNS Records » ; attendu : « Verified ».
- [ ] Uriel crée la clé API et le webhook (prérequis 2), pose les secrets (prérequis 3).

---

### Task 3 : les règles pures — modèle, composition de l'e-mail, garde d'envoi

**Files :**
- Create : `apps/web-v2/src/lib/prospect-template.ts`, `apps/web-v2/src/lib/prospect-template.test.ts`
- Create : `supabase/functions/_shared/prospect-mail.ts`,
  `apps/web-v2/src/lib/prospect-mail.test.ts` (teste le fichier partagé des fonctions)

**Interfaces — Produces :**
- `templateValues(p: { name: string | null; brand: string | null; activity: string | null; city: string | null; source: string | null }): Record<string, string>`
- `fillTemplate(text: string, values: Record<string, string>): string`
- `relayIntro(previous: string | null): string`
- `toHtml(text: string): string`
- `composeEmail(o: { body: string; signature: string; unsubscribeUrl: string }): { text: string; html: string }`
- `sendRefusal(o: { email: string | null; unsubscribedAt: string | null; ownerId: string | null; callerId: string; senderActive: boolean; subject: string; body: string }): 'no_email' | 'unsubscribed' | 'not_owner' | 'no_sender' | 'empty' | null`

- [ ] **Step 1 : les tests qui échouent**

`apps/web-v2/src/lib/prospect-template.test.ts` :
```ts
/**
 * QUOI     — tests de lib/prospect-template.ts : remplir un modèle d'e-mail de prospection.
 * POURQUOI — un emplacement vide ne doit jamais laisser « Bonjour , » dans un e-mail envoyé.
 */
import { describe, expect, it } from 'vitest'
import { fillTemplate, relayIntro, templateValues } from './prospect-template'

const values = templateValues({
  name: 'Manon Leclerc',
  brand: 'Cuir de Lune',
  activity: 'Maroquinerie',
  city: 'Nantes',
  source: 'Salon de Rennes',
})

describe('fillTemplate', () => {
  it('remplit les emplacements, {prénom} est le premier mot du nom', () => {
    expect(fillTemplate('Bonjour {prénom}, ton stand {marque} au {source}', values)).toBe(
      'Bonjour Manon, ton stand Cuir de Lune au Salon de Rennes',
    )
  })
  it('un emplacement vide s’efface avec son espace et sa virgule orpheline', () => {
    const empty = templateValues({ name: null, brand: null, activity: null, city: null, source: null })
    expect(fillTemplate('Bonjour {prénom},\nÀ bientôt', empty)).toBe('Bonjour,\nÀ bientôt')
  })
  it('laisse tel quel un emplacement inconnu', () => {
    expect(fillTemplate('{inconnu} reste', values)).toBe('{inconnu} reste')
  })
})

describe('relayIntro', () => {
  it('annonce le relais quand un autre écrivait', () => {
    expect(relayIntro('Mathéo')).toBe('Je prends le relais de Mathéo. ')
  })
  it('rien sans prédécesseur', () => {
    expect(relayIntro(null)).toBe('')
  })
})
```

`apps/web-v2/src/lib/prospect-mail.test.ts` :
```ts
/**
 * QUOI     — tests de supabase/functions/_shared/prospect-mail.ts : l'e-mail composé et la garde
 *            d'envoi de la fonction prospect-send.
 * POURQUOI — le fichier est pur (sans Deno) : on le teste ici, avec le reste.
 */
import { describe, expect, it } from 'vitest'
import { composeEmail, sendRefusal, toHtml } from '../../../../supabase/functions/_shared/prospect-mail'

describe('toHtml', () => {
  it('échappe, coupe en paragraphes, rend les liens cliquables', () => {
    expect(toHtml('A < B & C\nligne\n\nVoir https://flw.sh')).toBe(
      '<p>A &lt; B &amp; C<br>ligne</p><p>Voir <a href="https://flw.sh">https://flw.sh</a></p>',
    )
  })
})

describe('composeEmail', () => {
  it('ajoute la signature puis le pied de désinscription', () => {
    const mail = composeEmail({ body: 'Bonjour', signature: 'Uriel — Fellowship', unsubscribeUrl: 'https://x/u?t=1' })
    expect(mail.text).toBe(
      'Bonjour\n\nUriel — Fellowship\n\n—\nTu ne veux plus recevoir nos e-mails ? Se désinscrire : https://x/u?t=1',
    )
    expect(mail.html).toContain('<a href="https://x/u?t=1">Se désinscrire</a>')
  })
  it('sans signature, pas de ligne vide en trop', () => {
    expect(composeEmail({ body: 'Bonjour', signature: '', unsubscribeUrl: 'u' }).text).toBe(
      'Bonjour\n\n—\nTu ne veux plus recevoir nos e-mails ? Se désinscrire : u',
    )
  })
})

describe('sendRefusal', () => {
  const ok = { email: 'a@b.fr', unsubscribedAt: null, ownerId: 'u1', callerId: 'u1', senderActive: true, subject: 'S', body: 'B' }
  it('laisse passer un envoi valide, et un prospect sans suiveur', () => {
    expect(sendRefusal(ok)).toBeNull()
    expect(sendRefusal({ ...ok, ownerId: null })).toBeNull()
  })
  it('refuse dans l’ordre : pas d’e-mail, désinscrit, autre suiveur, pas d’adresse, vide', () => {
    expect(sendRefusal({ ...ok, email: null })).toBe('no_email')
    expect(sendRefusal({ ...ok, unsubscribedAt: '2026-10-16' })).toBe('unsubscribed')
    expect(sendRefusal({ ...ok, ownerId: 'u2' })).toBe('not_owner')
    expect(sendRefusal({ ...ok, senderActive: false })).toBe('no_sender')
    expect(sendRefusal({ ...ok, body: '  ' })).toBe('empty')
  })
})
```

- [ ] **Step 2 : ils échouent** — `pnpm --filter web-v2 exec vitest run src/lib/prospect-template.test.ts src/lib/prospect-mail.test.ts` → FAIL (modules absents).

- [ ] **Step 3 : le code**

`apps/web-v2/src/lib/prospect-template.ts` :
```ts
/**
 * QUOI     — remplir un modèle d'e-mail de prospection avec ce qu'on sait du prospect, et
 *            l'accroche d'un relais.
 * POURQUOI — le prospectant choisit un modèle et retouche le texte rempli (spec messagerie) ; un
 *            emplacement vide s'efface proprement.
 */
interface Known {
  name: string | null
  brand: string | null
  activity: string | null
  city: string | null
  source: string | null
}

export function templateValues(p: Known): Record<string, string> {
  return {
    prénom: (p.name ?? '').trim().split(/\s+/)[0] ?? '',
    marque: p.brand ?? '',
    activité: p.activity ?? '',
    ville: p.city ?? '',
    source: p.source ?? '',
  }
}

export function fillTemplate(text: string, values: Record<string, string>): string {
  return text
    .replace(/ ?\{([a-zéèêàç]+)\}/g, (whole, key: string) => {
      const value = values[key]
      if (value === undefined) return whole
      return value ? `${whole.startsWith(' ') ? ' ' : ''}${value}` : ''
    })
    .replace(/ +,/g, ',')
}

/** « Je prends le relais de Mathéo. » quand le dernier e-mail venait d'un autre prospectant. */
export function relayIntro(previous: string | null): string {
  return previous ? `Je prends le relais de ${previous}. ` : ''
}
```

`supabase/functions/_shared/prospect-mail.ts` :
```ts
// prospect-mail : composer un e-mail de prospection (texte et HTML) et décider si l'envoi est permis.
// Pur, sans Deno : testé par vitest depuis la V2 (apps/web-v2/src/lib/prospect-mail.test.ts).
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c)
}

function linkify(escaped: string): string {
  return escaped.replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}">${url}</a>`)
}

export function toHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${linkify(escape(paragraph)).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

const FOOTER = 'Tu ne veux plus recevoir nos e-mails ? Se désinscrire'

export function composeEmail(o: { body: string; signature: string; unsubscribeUrl: string }) {
  const main = [o.body.trim(), o.signature.trim()].filter(Boolean).join('\n\n')
  const text = `${main}\n\n—\n${FOOTER} : ${o.unsubscribeUrl}`
  const html =
    toHtml(main) +
    `<p style="color:#8a857f;font-size:12px">— <br>Tu ne veux plus recevoir nos e-mails ? ` +
    `<a href="${escape(o.unsubscribeUrl)}">Se désinscrire</a></p>`
  return { text, html }
}

export type Refusal = 'no_email' | 'unsubscribed' | 'not_owner' | 'no_sender' | 'empty'

export function sendRefusal(o: {
  email: string | null
  unsubscribedAt: string | null
  ownerId: string | null
  callerId: string
  senderActive: boolean
  subject: string
  body: string
}): Refusal | null {
  if (!o.email) return 'no_email'
  if (o.unsubscribedAt) return 'unsubscribed'
  if (o.ownerId && o.ownerId !== o.callerId) return 'not_owner'
  if (!o.senderActive) return 'no_sender'
  if (!o.subject.trim() || !o.body.trim()) return 'empty'
  return null
}
```

- [ ] **Step 4 : ils passent** (même commande) ; `pnpm --filter web-v2 lint` vert (si ESLint de la V2
  refuse l'import hors `src`, garder le test et ajouter le fichier au `ignores` seulement s'il le faut,
  avec sa raison).
- [ ] **Step 5 : commit** `feat(admin): remplir un modèle et composer un e-mail de prospection`.

---

### Task 4 : la fonction `prospect-send`

**Files :** Create `supabase/functions/prospect-send/index.ts` ; Modify `supabase/config.toml`
(`[functions.prospect-send] verify_jwt = true`), `apps/web-v2/src/lib/admin-functions.ts`.

**Interfaces — Consumes :** `composeEmail`, `sendRefusal` (`_shared/prospect-mail.ts`). **Produces :**
POST `{ prospectId: string; templateId: string | null; subject: string; body: string }` →
`{ done: true }` ou `{ error: Refusal | 'send_failed' | … }` ; côté V2
`sendProspectEmail(input): Promise<void>`.

- [ ] **Step 1 : la fonction**

```ts
// prospect-send : envoyer un e-mail de prospection depuis l'adresse @equipe.flw.sh de l'admin appelant.
// Auth : verify_jwt = true, puis is_admin(). Seul le suiveur du prospect envoie (ou celui qui lui
// écrit en premier, qui en devient le suiveur). Le fil : In-Reply-To / References du dernier message.
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { composeEmail, sendRefusal } from '../_shared/prospect-mail.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

const DOMAIN = 'equipe.flw.sh'

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

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const prospectId = typeof raw?.prospectId === 'string' ? raw.prospectId : ''
  const templateId = typeof raw?.templateId === 'string' ? raw.templateId : null
  const subject = typeof raw?.subject === 'string' ? raw.subject : ''
  const body = typeof raw?.body === 'string' ? raw.body : ''
  if (!prospectId) return json({ error: 'invalid_body' }, 400)

  const admin = getSupabaseAdmin()
  try {
    const { data: prospect, error: pErr } = await admin.from('prospects')
      .select('id, name, email, owner_id, unsubscribed_at, unsubscribe_token, email_status')
      .eq('id', prospectId).maybeSingle()
    if (pErr) throw pErr
    if (!prospect) return json({ error: 'invalid_body' }, 400)
    const { data: sender, error: sErr } = await admin.from('prospect_senders')
      .select('id, alias, display_name, signature, active')
      .eq('user_id', user.id).eq('active', true).order('created_at').limit(1).maybeSingle()
    if (sErr) throw sErr

    const refusal = sendRefusal({
      email: prospect.email, unsubscribedAt: prospect.unsubscribed_at, ownerId: prospect.owner_id,
      callerId: user.id, senderActive: Boolean(sender), subject, body,
    })
    if (refusal || !sender) return json({ error: refusal ?? 'no_sender' }, 400)

    const { data: last, error: lErr } = await admin.from('prospect_messages')
      .select('message_id, references_ids')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .limit(1).maybeSingle()
    if (lErr) throw lErr
    const inReplyTo = last?.message_id ?? null
    const references = inReplyTo ? [...(last?.references_ids ?? []), inReplyTo] : []

    const { data: me, error: meErr } = await admin.from('users').select('email').eq('actor_id', user.id).maybeSingle()
    if (meErr) throw meErr
    const from = `${sender.alias}@${DOMAIN}`
    const replyTo = me?.email ?? from
    const messageId = `<${crypto.randomUUID()}@${DOMAIN}>`
    const unsubscribeUrl =
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/prospect-unsubscribe?t=${prospect.unsubscribe_token}`
    const mail = composeEmail({ body, signature: sender.signature, unsubscribeUrl })
    const headers: Record<string, string> = {
      'Message-ID': messageId,
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    }
    if (inReplyTo) {
      headers['In-Reply-To'] = inReplyTo
      headers['References'] = references.join(' ')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Lot 3b : les réponses vont à la boîte personnelle de l'expéditeur ; le lot 3c les recevra ici.
        from: `${sender.display_name} <${from}>`, to: [prospect.email], reply_to: replyTo,
        subject: subject.trim(), text: mail.text, html: mail.html, headers,
        tags: [{ name: 'prospect', value: prospectId }],
      }),
    })
    const sent = (await response.json().catch(() => null)) as { id?: string } | null
    if (!response.ok || !sent?.id) {
      console.error('[prospect-send] resend', response.status, sent)
      return json({ error: 'send_failed' }, 502)
    }

    const now = new Date().toISOString()
    const { error: mErr } = await admin.from('prospect_messages').insert({
      prospect_id: prospectId, direction: 'out', sender_id: sender.id, from_email: from,
      to_email: prospect.email, subject: subject.trim(), body_text: mail.text, message_id: messageId,
      in_reply_to: inReplyTo, references_ids: references, resend_id: sent.id, template_id: templateId,
      delivery: 'envoye', sent_at: now,
    })
    if (mErr) throw mErr
    const { error: uErr } = await admin.from('prospects').update({
      owner_id: prospect.owner_id ?? user.id,
      email_status: prospect.email_status === 'repondu' ? 'repondu' : 'envoye',
      contact_channel: 'mail', contacted_on: now.slice(0, 10), a_relancer: false,
    }).eq('id', prospectId)
    if (uErr) throw uErr
    return json({ done: true })
  } catch (err) {
    console.error('[prospect-send]', err)
    return json({ error: 'failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
```

- [ ] **Step 2 : le côté V2** — dans `lib/admin-functions.ts`, `KNOWN_ERRORS` gagne :
```ts
  no_email: 'Ce prospect n’a pas d’adresse e-mail.',
  unsubscribed: 'Ce prospect s’est désinscrit : plus aucun e-mail ne peut partir.',
  not_owner: 'Ce prospect est suivi par quelqu’un d’autre : prends le relais pour lui écrire.',
  no_sender: 'Tu n’as pas d’adresse d’envoi active : ajoute-la dans Modèles et expéditeurs.',
  empty: 'L’objet et le texte ne peuvent pas être vides.',
  send_failed: 'Resend a refusé l’envoi. Réessaie dans un instant.',
```
et :
```ts
export const sendProspectEmail = (input: {
  prospectId: string
  templateId: string | null
  subject: string
  body: string
}) => call<{ done: true }>('prospect-send', input).then(() => undefined)
```
(« s'est désinscrit » : remplacer par « Ce prospect est désinscrit », sans genre — le mot
« prospect » est masculin grammatical, pas une personne genrée.)

- [ ] **Step 3 : vérifier en copie isolée** (`.claude/rules/dev.md`, Deno réécrit le `package.json`) :
  copier `_shared/` et `prospect-send/` dans le dossier temporaire avec `deno.json`
  `{"nodeModulesDir":"auto"}`, puis `npx --prefix <dépôt> --no-install deno check prospect-send/index.ts`.
- [ ] **Step 4 : commit** `feat(admin): la fonction prospect-send envoie par Resend depuis @equipe.flw.sh`.

---

### Task 5 : la page d'un prospect, l'écriture et l'envoi

**Files :**
- Create : `apps/web-v2/src/features/admin-prospects/ProspectPage.tsx`, `useProspect.ts`,
  `ThreadCard.tsx`, `ComposeCard.tsx`, `OwnerMenu.tsx`, `ProspectSideCards.tsx`
- Create : `apps/web-v2/src/styles/3-components/admin-prospect-page.css`
- Modify : `App.tsx` (routes `/admin/prospects/modeles` puis `/admin/prospects/:id`, dans cet
  ordre, avant la vitrine), `ProspectsTable.tsx` (le nom mène à la page), `styles/index.css`, README.

**Interfaces — Consumes :** `admin_prospect`, `admin_prospect_messages`, `admin_prospect_modeles`,
`admin_prospect_expediteurs` (tâche 1), `fillTemplate`, `templateValues`, `relayIntro` (tâche 3),
`sendProspectEmail` (tâche 4), `TextCell` (`ProspectCells.tsx`), `updateProspect`
(`prospect-writes.ts`), `AdminCard`, `SheetRow`.
**Produces :** `useProspect(id): { data: ProspectSheet | null; error: string | null; reload: () => void }`
avec `ProspectSheet = { prospect: ProspectDetail; messages: ThreadMessage[]; templates: Template[]; senders: Sender[] }`
(types écrits à la main, nullables vrais, comme `useProspects.ts`).

- [ ] **Step 1 : `useProspect.ts`** — le patron de `useProspects.ts` (une fonction `loadProspect`
  hors de l'effet, `Promise.all` des quatre RPC, `must()`, un seul `if (cancelled) return`, `reload`
  par compteur). Types :
```ts
export interface ProspectDetail {
  id: string; name: string | null; brand: string | null; activity: string | null
  city: string | null; email: string | null; phone: string | null; source: string | null
  note: string | null; contact_channel: string | null; contacted_on: string | null
  email_status: string; a_relancer: boolean; user_id: string | null; user_name: string | null
  owner_id: string | null; owner_name: string | null; unsubscribed_at: string | null
  created_at: string
}
export interface ThreadMessage {
  id: string; direction: 'out' | 'in'; sender_user_id: string | null; sender_name: string | null
  from_email: string; to_email: string; subject: string; body_text: string
  delivery: string | null; has_attachments: boolean; at: string
}
export interface Template {
  id: string; kind: 'premier_contact' | 'relance' | 'bienvenue'; name: string; subject: string
  body: string; archived_at: string | null; envois: number; reponses: number
}
export interface Sender {
  id: string; user_id: string; user_name: string | null; alias: string; display_name: string
  signature: string; active: boolean; envoyes_aujourdhui: number; palier: number
}
```
Un prospect introuvable (`admin_prospect` vide) : `error = 'Ce prospect n’existe plus.'`.

- [ ] **Step 2 : `ThreadCard.tsx`** (maquette `2355:2`) — `AdminCard` « Échanges », `Icon={Link2}`
  `tone="bleu"`, action « N messages » ou « Aucun échange ». Une bulle par message
  (`.prospect-thread__message--out` à droite fond `--surface-chip-neutral`, `--in` à gauche blanc
  filet) : ligne méta `{sender_name ?? from_email} · {from_email} · {formatDayMonthShort} {heure}`
  `· délivré | rebond | plainte` (rien pour `envoye`), objet en gras pour le premier message, texte
  (`white-space: pre-wrap`). La partie après la ligne `—` du pied (désinscription) n'est pas affichée :
  `body_text.split('\n\n—\n')[0]`. Vide : « Aucun e-mail pour l’instant. Choisis un modèle de premier
  contact ci-dessous. » Heure : `new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })`
  — à placer dans `lib/dates.ts` (`formatTime(date)`), avec son test.

- [ ] **Step 3 : `ComposeCard.tsx`** (maquettes `2355:2`, `2355:273`) — titre « Premier contact avec
  {prénom} » sans message sortant, sinon « Répondre à {prénom} ». Champs : **Modèle** (`<select>`
  groupé par `<optgroup>` Premier contact / Relance / Bienvenue, modèles non archivés, libellé
  `{name} · {envois} envois · {taux} % de réponses`, plus « Aucun — réponse libre ») ; **De** (lecture :
  `{display_name} · {alias}@equipe.flw.sh` de l'expéditeur actif de l'appelant) ; **À** ;
  **Objet** (`<input>`) ; **Texte** (`<textarea>`). Choisir un modèle remplit objet et texte par
  `fillTemplate(…, templateValues(prospect))`, précédé de `relayIntro(previous)` si l'appelant est le
  suiveur et que le dernier message sortant vient d'un autre (`previous` = son `sender_name`). Modèle
  initial : `?modele=bienvenue` dans l'adresse → premier modèle `bienvenue` ; sinon, sans message
  sortant → premier `premier_contact` ; sinon aucun. En réponse, objet initial
  `Re : {objet du premier message}`. Pied : « Un lien de désinscription est ajouté au bas de chaque
  e-mail. » et **Envoyer** (`Button variant="action"`, inactif pendant l'envoi) → `sendProspectEmail`
  puis `reload()` et texte vidé ; l'échec s'affiche sous le bouton.
  Cas qui remplacent la zone : désinscrit → « Désinscription le {date} : plus aucun e-mail ne peut
  partir vers {nom}. » ; sans e-mail → « Ajoute son e-mail dans les informations pour lui écrire. » ;
  suivi par un autre → « Ce prospect est suivi par {owner_name}. » + bouton **Prendre le relais**
  (`updateProspect(id, { owner_id: moi })` puis `reload`) ; appelant sans expéditeur actif → « Tu n’as
  pas encore d’adresse d’envoi. » + lien vers `/admin/prospects/modeles`. Rebond sur le dernier
  message sortant : avertissement en brique au-dessus du bouton.
  L'identifiant de l'appelant : `useAuth().person?.actor_id` (vérifier le nom exact dans
  `lib/auth.tsx`).

- [ ] **Step 4 : `OwnerMenu.tsx`** — en-tête à droite : `<select>` stylé en bouton (« Suivi par
  {nom} », options : les comptes des expéditeurs actifs, et « Personne ») → `updateProspect(id, {
  owner_id })` puis `reload`.

- [ ] **Step 5 : `ProspectSideCards.tsx`** — « Informations » (`AdminCard`, `Icon={Info}`,
  `tone="gris"`) : Marque, Activité, Ville, E-mail (normalisé), Téléphone, Source, Contact
  (`contactLabel`), chacun une `TextCell` dans un `SheetRow` (Contact en lecture) ; « Note »
  (`Icon={StickyNote}`, `tone="ocre"`) : `TextCell` du champ `note`. Si `user_id` : une ligne « Compte
  créé » qui mène à `/admin/personnes/{user_id}`.

- [ ] **Step 6 : `ProspectPage.tsx`** — `sheet` comme `PersonPage` : retour « Prospects » (lien
  `/admin/prospects`), en-tête (initiale dans un rond prune, nom en `sheet__name`, pastille du statut,
  ligne `marque · activité · ville · dans la liste depuis le {date} · source : {source}` sans les
  parties vides, `OwnerMenu`), deux colonnes : `ThreadCard` puis `ComposeCard` ; `ProspectSideCards`.

- [ ] **Step 7 : routes et lien** — `App.tsx` :
```tsx
<Route path="/admin/prospects/modeles" element={<AdminPage><TemplatesPage /></AdminPage>} />
<Route path="/admin/prospects/:id" element={<AdminPage><ProspectPage /></AdminPage>} />
```
(`TemplatesPage` arrive en tâche 6 : d'ici là, n'ajouter que la seconde route.) Dans
`ProspectsTable.tsx`, le nom devient un `Link` vers `/admin/prospects/{id}` (la marque reste une
`TextCell`).

- [ ] **Step 8 : vérifier et commit** — lint, tsc, vitest verts ; dans le navigateur, un prospect
  d'essai avec l'e-mail de la boîte ProtonMail d'Uriel : la page s'ouvre, les modèles se choisissent,
  le texte se remplit. Pas encore d'envoi (pas de modèle ni d'expéditeur : tâche 6).
  `feat(admin): la page d'un prospect — fil, écriture, suiveur`.

---

### Task 6 : modèles et expéditeurs

**Files :** Create `apps/web-v2/src/features/admin-prospects/TemplatesPage.tsx`,
`SendersCard.tsx`, `TemplatesCard.tsx`, `TemplateEditor.tsx`, `SenderDialog.tsx`,
`useTemplates.ts`, `styles/3-components/admin-templates.css` ; Modify `App.tsx` (route),
`ProspectsPage.tsx` (bouton « Modèles et expéditeurs »), README.

**Interfaces — Consumes :** `admin_prospect_modeles`, `admin_prospect_expediteurs`, tables
`prospect_templates`, `prospect_senders` (écritures directes sous RLS), `Segmented`, `ConfirmDialog`.

- [ ] **Step 1 : `useTemplates.ts`** — charge les deux RPC (patron du lot), `reload`. Écritures dans
  `prospect-writes.ts` :
```ts
export async function saveTemplate(t: { id?: string; kind: string; name: string; subject: string; body: string }) {
  const { error } = t.id
    ? await supabase.from('prospect_templates').update({ kind: t.kind, name: t.name, subject: t.subject, body: t.body }).eq('id', t.id)
    : await supabase.from('prospect_templates').insert({ kind: t.kind, name: t.name, subject: t.subject, body: t.body })
  check(error)
}
export async function archiveTemplate(id: string) {
  const { error } = await supabase.from('prospect_templates').update({ archived_at: new Date().toISOString() }).eq('id', id)
  check(error)
}
export async function saveSender(s: { id?: string; user_id: string; alias: string; display_name: string; signature: string; active: boolean }) {
  const { id, ...fields } = s
  const { error } = id
    ? await supabase.from('prospect_senders').update(fields).eq('id', id)
    : await supabase.from('prospect_senders').insert(fields)
  check(error)
}
export async function reassignProspects(fromUser: string, toUser: string | null) {
  const { error } = await supabase.from('prospects').update({ owner_id: toUser }).eq('owner_id', fromUser)
  check(error)
}
```
  `writeError` gagne : code `23505` sur `prospect_senders_alias_key` → « Cette adresse est déjà prise. »
  (tester dans `prospect.test.ts`), code `23514` (check de l'alias) → « Lettres, chiffres, points et
  tirets seulement. »

- [ ] **Step 2 : `TemplatesPage.tsx`** (maquette `2356:2`) — en-tête « Modèles et expéditeurs », « Les
  adresses d’où part la prospection, et les e-mails qu’on y écrit. », boutons « Ajouter un expéditeur »
  et « Nouveau modèle » (`variant="action"`) ; deux colonnes : `SendersCard` + `TemplatesCard` à
  gauche, `TemplateEditor` à droite (le modèle choisi, ou un nouveau). Le modèle édité est dans
  l'adresse : `?modele=<id>` ou `?modele=nouveau`.
- [ ] **Step 3 : `SendersCard.tsx`** — une ligne par expéditeur : prénom et `{alias}@equipe.flw.sh`,
  signature, « {n} envoyés aujourd’hui » et « palier conseillé : {palier} par jour » (en brique si
  dépassé), pastille Actif (sauge) / Désactivé (gris), « Modifier » → `SenderDialog`.
- [ ] **Step 4 : `SenderDialog.tsx`** (`<dialog>`, mécanique de `ConfirmDialog`) — compte admin
  (`<select>` des admins : `supabase.from('users').select('actor_id, display_name').eq('role', 'admin')`,
  triés par nom), partie avant `@` (suffixe `@equipe.flw.sh` affiché), nom affiché, signature
  (`<textarea>`), Actif. Désactiver un expéditeur qui suit des prospects propose de les réattribuer
  (`<select>` des autres comptes ou « Personne ») → `reassignProspects`.
- [ ] **Step 5 : `TemplatesCard.tsx` et `TemplateEditor.tsx`** — groupes PREMIER CONTACT, RELANCE,
  BIENVENUE ; ligne : nom, objet en aperçu, « {envois} envois », « {taux} % de réponses » (`percent`),
  « Modifier ». L'éditeur : Nom, Usage (`Segmented` à trois options), Objet, Texte (`<textarea>`),
  « Insérer : » cinq boutons qui insèrent `{prénom}`… au curseur du texte (`selectionStart`), « La
  signature de l’expéditeur et le lien de désinscription s’ajoutent seuls. », Annuler / Enregistrer ;
  pour un modèle existant, « Archiver » (confirmation) — les archivés ne s'affichent plus.
- [ ] **Step 6 : vérifier et commit** — créer l'expéditeur `uriel` (signature « Uriel — Fellowship »)
  et deux modèles de premier contact, un de relance, un de bienvenue ; alias en double refusé avec le
  bon message. `feat(admin): modèles et expéditeurs`.

---

### Task 7 : désinscription, signaux de livraison, premier envoi réel

**Files :** Create `supabase/functions/prospect-unsubscribe/index.ts`,
`supabase/functions/prospect-events/index.ts` ; Modify `supabase/config.toml` (les deux en
`verify_jwt = false`, avec la raison en commentaire).

- [ ] **Step 1 : `prospect-unsubscribe`**

```ts
// prospect-unsubscribe : la désinscription d'un prospect, par le jeton de son lien.
// Public (verify_jwt = false) : le jeton fait foi. GET montre un bouton (un lien seul serait suivi
// par les antivirus des messageries) ; POST désinscrit — y compris le « List-Unsubscribe-Post » des
// messageries (désinscription en un clic). Aucune information sur le prospect n'est affichée.
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('t') ?? ''
  if (!/^[0-9a-f]{64}$/.test(token)) return page('Ce lien de désinscription n’est pas valable.')
  if (req.method === 'GET') {
    return page(
      'Tu ne veux plus recevoir nos e-mails ?',
      `<form method="post"><button type="submit">Me désinscrire</button></form>`,
    )
  }
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })
  const { error } = await getSupabaseAdmin().from('prospects')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token).is('unsubscribed_at', null)
  if (error) {
    console.error('[prospect-unsubscribe]', error)
    return page('La désinscription n’a pas abouti. Réessaie dans un instant.')
  }
  return page('C’est fait : tu ne recevras plus nos e-mails.')
})

function page(title: string, extra = '') {
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fellowship</title><body style="font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 16px;color:#1f1d1b"><p style="font-size:18px">${title}</p>${extra}</body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
```

- [ ] **Step 2 : `prospect-events`**

```ts
// prospect-events : les signaux de livraison de Resend (délivré, rebond, plainte) sur nos e-mails de
// prospection. Public (verify_jwt = false) : la signature Svix du webhook fait foi, vérifiée avant
// toute écriture. Une plainte pour spam désinscrit le prospect.
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

import { Webhook } from 'npm:svix@1.45.1'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

type Event = { type: string; data: { email_id?: string } }
const DELIVERY: Record<string, 'delivre' | 'rebond' | 'plainte'> = {
  'email.delivered': 'delivre',
  'email.bounced': 'rebond',
  'email.complained': 'plainte',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })
  const payload = await req.text()
  let event: Event
  try {
    event = new Webhook(Deno.env.get('RESEND_WEBHOOK_SECRET')!).verify(payload, {
      'svix-id': req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    }) as Event
  } catch {
    return new Response('invalid_signature', { status: 400 })
  }
  const delivery = DELIVERY[event.type]
  const resendId = event.data.email_id
  if (!delivery || !resendId) return new Response('ignored')

  const admin = getSupabaseAdmin()
  const { data: message, error } = await admin.from('prospect_messages')
    .update({ delivery }).eq('resend_id', resendId)
    .select('prospect_id').maybeSingle()
  if (error) {
    console.error('[prospect-events]', error)
    return new Response('failed', { status: 500 })
  }
  if (message?.prospect_id && delivery !== 'delivre') {
    const patch = delivery === 'rebond'
      ? { email_status: 'rebond' }
      : { unsubscribed_at: new Date().toISOString() }
    const { error: pErr } = await admin.from('prospects').update(patch).eq('id', message.prospect_id)
    if (pErr) {
      console.error('[prospect-events]', pErr)
      return new Response('failed', { status: 500 })
    }
  }
  return new Response('ok')
})
```
  Un `delivered` qui arrive après un `bounced` ne doit pas écraser le rebond : ajouter
  `.neq('delivery', 'rebond')` à la mise à jour quand `delivery === 'delivre'`.

- [ ] **Step 3 (contrôleur) : déployer** `prospect-send`, `prospect-events`, `prospect-unsubscribe`
  (`node_modules/supabase/bin/supabase.exe functions deploy <nom> --project-ref trbxpsknbtisqwefqoub`),
  après vérification en copie isolée (`deno check`).
- [ ] **Step 4 (contrôleur, avec Uriel) : premiers vrais envois, entre nos adresses**
  1. Un prospect d'essai avec l'e-mail ProtonMail d'Uriel ; envoi avec le modèle « Rencontré sur un
     salon ». Attendu : l'e-mail arrive **en boîte de réception**, expéditeur
     `Uriel <uriel@equipe.flw.sh>`, signature et pied présents ; dans ProtonMail, les en-têtes
     montrent `dkim=pass`, `spf=pass`, `dmarc=pass` ; le `Message-ID` est le nôtre (sinon : ruling,
     on retient celui de Resend pour le lot 3c).
  2. Le fil montre le message, « délivré » après le signal.
  3. Un envoi vers `bounced@resend.dev` (adresse de test de Resend) : « rebond » sur le message, statut
     Rebond.
  4. Le lien « Se désinscrire » : la page, le bouton, « C’est fait » ; la zone d'écriture affiche la
     désinscription.
  5. Une requête avec une fausse signature sur `prospect-events` (`curl -X POST … -d '{}'`) → 400,
     rien d'écrit.
  6. Effacer le prospect d'essai (corbeille) ; ses messages partent avec lui (`on delete cascade`).
- [ ] **Step 5 : commit** `feat(admin): désinscription et signaux de livraison des e-mails de prospection`.

---

### Task 8 : la liste et la bienvenue

**Files :** Modify `lib/prospect-list.ts` (+ test), `useProspects.ts`, `ProspectsPage.tsx`,
`ProspectsTable.tsx`, `MatchBanner.tsx`, `MatchDialog.tsx`, `admin-prospects.css`.

- [ ] **Step 1 : `suivi` dans l'adresse (TDD)** — `ProspectsQuery` gagne `suivi: string`
  (`?suivi=moi` ou un uuid ; absent = tous). Tests ajoutés à `prospect-list.test.ts` :
```ts
  it('lit et écrit le suivi', () => {
    expect(readProspectsQuery(new URLSearchParams('suivi=moi')).suivi).toBe('moi')
    expect(writeProspectsQuery({ q: '', filter: 'tous', source: '', suivi: 'moi', page: 0 }).toString()).toBe('suivi=moi')
  })
```
  (et `suivi: ''` dans les attentes existantes).
- [ ] **Step 2 : la liste** — `useProspects` passe `p_suivi` ; menu « Suivi par : tous / moi / {chaque
  expéditeur} » à côté de « Source » (`<select>`, options depuis `admin_prospect_expediteurs`) ;
  colonne **Suivi par** (`owner_name ?? '—'`) à la place de Téléphone ; en-tête « Contact » →
  « Dernier échange » ; **Statut** en lecture (pastille, plus de `<select>`) avec les quatre valeurs ;
  « Désinscrit » en gris à la place du statut si `unsubscribed_at`. `EMAIL_STATUSES` sans `ouvert`.
- [ ] **Step 3 : le bandeau et la bienvenue** — `MatchBanner` : « {n} prospects viennent de créer leur
  compte » (« 1 prospect vient de créer son compte »), « Confirme chacun : « Compte créé » se coche, et
  tu peux lui écrire un mot de bienvenue. », bouton « Voir et confirmer ». `MatchDialog` : le bouton
  devient « Confirmer » ; après succès, `navigate('/admin/prospects/{id}?modele=bienvenue')`.
- [ ] **Step 4 : vérifier, livrer** — lint, tsc, vitest ; navigateur ; version V2 `2.49.0` ;
  `pnpm deploy:v2` ; hash servi = build local ; `git push` ; `_État.md`.
  `feat(admin): la liste suit les suiveurs, le statut se tient seul, la bienvenue à la confirmation`.
