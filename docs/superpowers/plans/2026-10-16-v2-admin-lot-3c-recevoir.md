# V2 — Messagerie de prospection, lot 3c : recevoir et répondre — plan d'exécution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** les réponses des prospects arrivent dans Fellowship, se rangent dans le bon fil (ou dans
« Non classés »), font passer le prospect en « À répondre » et préviennent son suiveur par e-mail ;
la relance se propose seule après 5 jours sans réponse.

**Architecture :** Resend reçoit le courrier de `equipe.flw.sh` et appelle `prospect-inbound`
(signature Svix vérifiée) ; la fonction lit le message complet par l'API de réception, le rattache
(en-têtes, sinon adresse, sinon non classé), l'enregistre et envoie la copie au suiveur. Une tâche
quotidienne (pg_cron) coche « À relancer ». Le front plie la partie citée, ajoute « À répondre » et
la page « Non classés ».

**Tech Stack :** Supabase (Postgres, pg_cron, Edge Functions Deno), Resend (réception, webhooks
Svix), React 19, vitest.

**Spec :** `docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md` (« Lot 3c »).

## Global Constraints

- Base = production ; migrations et déploiements par le contrôleur seulement.
- **Un secret ne passe jamais dans une commande `!`** : Uriel l'écrit dans `.env.<nom>.local`, puis
  `secrets set --env-file` (`.claude/rules/supabase.md`).
- Vérifier les types par `pnpm --filter web-v2 exec tsc -b` (pas `-p .`).
- Fonction dans un index ou un check : exécutable par tous.
- `admin_*` : `security definer`, `search_path`, `admin_garde()`, grants ; listes triées.
- Essais réels seulement entre nos adresses (`uriel@equipe.flw.sh` ↔ boîtes ProtonMail d'Uriel).
- Jamais de genre déduit. V2 : TS strict, 400 lignes max, jetons, en-têtes, README, lint vert.

## Prérequis (Uriel, avant la tâche 6)

1. Resend → domaine `equipe.flw.sh` → **Enable Receiving** ; le contrôleur lit l'enregistrement MX et
   donne la commande `! netlify api createDnsRecord …` (aucun secret dedans).
2. Resend → **API Keys** → une clé **Full access** nommée « Fellowship lecture des réponses » (la clé
   d'envoi ne sait pas lire les messages reçus).
3. Resend → **Webhooks** → un second webhook vers
   `https://trbxpsknbtisqwefqoub.supabase.co/functions/v1/prospect-inbound`, événement
   **email.received** ; son Signing Secret.
4. Uriel écrit dans `.env.resend-inbound.local` :
   `RESEND_READ_KEY=…` et `RESEND_INBOUND_SECRET=…`, puis lance
   `! node_modules/supabase/bin/supabase.exe secrets set --env-file .env.resend-inbound.local --project-ref trbxpsknbtisqwefqoub`.

## Décisions du plan

- **Deux secrets de plus** : la clé de lecture (accès complet, uniquement côté fonctions) et le secret
  du webhook de réception (un webhook par fonction, un secret chacun).
- **Une réponse non rattachée** est enregistrée sans prospect ; sa copie part au compte dont l'alias
  a reçu l'e-mail (`to`), pour que rien ne se perde.
- **La partie citée** (« Le … a écrit : », lignes `>`) est gardée en base et pliée à l'affichage.
- **« À répondre »** se lit dans le fil (le dernier message est reçu) : pas de colonne à tenir.
- **Décocher « À relancer »** retient le message sortant concerné (`relance_vue_pour`) : la tâche ne
  recoche que pour un nouvel envoi.
- `Reply-To` repasse à l'adresse `@equipe.flw.sh` de l'expéditeur.

## Review Focus

1. **Le même e-mail reçu deux fois** (Svix réessaie) : un seul message — `resend_id` unique, insert
   ignoré (tâche 3).
2. **Une réponse dont le texte est vide et l'HTML seul** (ou en `data:`) : le texte se reconstruit —
   `bodyText` testé (tâche 2).
3. **Une adresse d'expéditeur avec nom et majuscules** (`"Manon" <Manon@X.fr>`) : rattachée au
   prospect `manon@x.fr` — `emailAddress` testé (tâche 2).
4. **Une réponse à un e-mail désormais sans prospect** (prospect supprimé) : « Non classés », pas
   d'erreur — rattachement testé par `threadKeys` + chemin « adresse » (tâche 3, vérifié en vrai).
5. **Une signature de webhook forgée sur prospect-inbound** : 400, rien d'écrit (tâche 6).

---

### Task 1 : la base

**Files :** Create `supabase/migrations/20261016220000_prospection_reception.sql` ; régénérer
`apps/web-v2/src/types/supabase.ts`.

**Produces :** `prospects.relance_vue_pour`, `prospect_attend_reponse(p prospects)`, filtre
`a_repondre`, colonne `a_repondre` dans `admin_prospects`, `admin_prospects_non_classes()`,
`admin_ranger_message(p_message uuid, p_prospect uuid)`, `prospects_relancer()`, tâche
`relances-prospects`.

- [ ] **Step 1 : la migration**

```sql
-- POURQUOI : lot 3c de la messagerie de prospection. Les réponses arrivent dans Fellowship
-- (prospect-inbound) : « À répondre » se lit dans le fil, les réponses sans prospect vont dans
-- « Non classés », et la relance se propose seule après 5 jours sans réponse (tâche quotidienne).
-- prospect_dans_filtre et admin_prospects reprennent leur définition live (20261016140000,
-- 20261016180000) avec le filtre et la colonne a_repondre.

alter table public.prospects
  add column relance_vue_pour uuid references public.prospect_messages(id) on delete set null;

-- Le dernier message du fil vient du prospect : il attend une réponse.
create function public.prospect_attend_reponse(p public.prospects) returns boolean
language sql stable set search_path to 'public' as $$
  select coalesce((
    select m.direction = 'in' from prospect_messages m
    where m.prospect_id = p.id
    order by coalesce(m.sent_at, m.received_at, m.created_at) desc, m.id desc
    limit 1
  ), false);
$$;
revoke all on function public.prospect_attend_reponse(public.prospects) from public, anon, authenticated;

create or replace function public.prospect_dans_filtre(p public.prospects, p_filtre text) returns boolean
language sql stable set search_path to 'public' as $$
  select case p_filtre
    when 'tous' then true
    when 'a_contacter' then p.email_status = 'pas_envoye' and p.contacted_on is null
      and p.user_id is null
    when 'contactes' then p.email_status <> 'pas_envoye' or p.contacted_on is not null
    when 'repondu' then p.email_status = 'repondu'
    when 'a_repondre' then prospect_attend_reponse(p)
    when 'compte' then p.user_id is not null
    when 'a_relancer' then p.a_relancer
    else false
  end;
$$;

drop function public.admin_prospects(text, text, text, text, int);
create function public.admin_prospects(p_q text default '', p_filtre text default 'tous',
  p_source text default '', p_suivi text default '', p_page int default 0)
returns table (id uuid, name text, brand text, activity text, city text, email text, phone text,
  source text, note text, contact_channel text, contacted_on date, email_status text,
  a_relancer boolean, user_id uuid, user_name text, linked_at timestamptz, linked_by text,
  owner_id uuid, owner_name text, unsubscribed_at timestamptz, a_repondre boolean,
  created_at timestamptz, total bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.brand, p.activity, p.city, p.email, p.phone, p.source, p.note,
    p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.user_id,
    u.display_name::text, p.linked_at, p.linked_by, p.owner_id, o.display_name::text,
    p.unsubscribed_at, prospect_attend_reponse(p), p.created_at, count(*) over ()
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where prospect_dans_filtre(p, p_filtre) and prospect_cherche(p, p_q, p_source)
    and prospect_suivi(p, p_suivi)
  order by p.created_at desc, p.id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

create or replace function public.admin_prospects_filtres(p_q text default '', p_source text default '',
  p_suivi text default '')
returns table (filtre text, nombre bigint)
language plpgsql stable security definer set search_path to 'public' as $$
declare f text;
begin
  perform admin_garde();
  foreach f in array array['tous', 'a_contacter', 'contactes', 'repondu', 'a_repondre', 'compte',
    'a_relancer']
  loop
    filtre := f;
    select count(*) into nombre from prospects p
      where prospect_dans_filtre(p, f) and prospect_cherche(p, p_q, p_source)
        and prospect_suivi(p, p_suivi);
    return next;
  end loop;
end $$;

create function public.admin_prospects_non_classes()
returns table (id uuid, from_email text, to_email text, subject text, body_text text,
  has_attachments boolean, received_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select m.id, m.from_email, m.to_email, m.subject, m.body_text, m.has_attachments, m.received_at
  from prospect_messages m
  where m.prospect_id is null and m.direction = 'in'
  order by m.received_at desc, m.id;
end $$;

-- Ranger une réponse sous un prospect : le fil la reprend, le prospect passe « Répondu ».
create function public.admin_ranger_message(p_message uuid, p_prospect uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  update prospect_messages set prospect_id = p_prospect
  where id = p_message and prospect_id is null and direction = 'in';
  if not found then
    raise exception 'message déjà rangé ou introuvable' using errcode = 'P0002';
  end if;
  update prospects set email_status = 'repondu', a_relancer = false where id = p_prospect;
end $$;

-- Décocher « À relancer » retient le message sortant concerné : la tâche ne le recochera pas.
create function public.prospect_relance_vue() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if old.a_relancer and not new.a_relancer then
    new.relance_vue_pour := (
      select m.id from prospect_messages m
      where m.prospect_id = new.id and m.direction = 'out'
      order by m.sent_at desc nulls last, m.id desc limit 1);
  end if;
  return new;
end $$;
create trigger prospect_relance_vue before update of a_relancer on public.prospects
  for each row execute function public.prospect_relance_vue();

-- Chaque matin : « À relancer » pour un prospect dont le dernier message est un envoi délivré,
-- vieux de 5 jours et plus, sans réponse, et pas déjà vu.
create function public.prospects_relancer() returns void
language sql security definer set search_path to 'public' as $$
  update prospects p set a_relancer = true
  from (
    select distinct on (m.prospect_id) m.prospect_id, m.id, m.direction, m.sent_at, m.delivery
    from prospect_messages m
    where m.prospect_id is not null
    order by m.prospect_id, coalesce(m.sent_at, m.received_at, m.created_at) desc, m.id desc
  ) last
  where last.prospect_id = p.id
    and last.direction = 'out' and last.delivery in ('envoye', 'delivre')
    and last.sent_at < now() - interval '5 days'
    and p.unsubscribed_at is null and not p.a_relancer
    and p.relance_vue_pour is distinct from last.id;
$$;

revoke all on function public.prospect_relance_vue() from public, anon, authenticated;
revoke all on function public.prospects_relancer() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_prospects(text, text, text, text, int)', 'admin_prospects_filtres(text, text, text)',
    'admin_prospects_non_classes()', 'admin_ranger_message(uuid, uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

select cron.schedule('relances-prospects', '0 6 * * *', 'select public.prospects_relancer()');
```

Avant d'écrire : relire les définitions **live** de `prospect_dans_filtre`, `admin_prospects`,
`admin_prospects_filtres` (`pg_get_functiondef`) et partir d'elles.

- [ ] **Step 2 (contrôleur)** : `db push`, régénérer les types, vérifier : `anon` refusé sur
  `admin_prospects_non_classes`, la tâche listée dans `cron.job`, `select prospects_relancer()` sans
  erreur. `useProspects.ts` : `ProspectRow` gagne `a_repondre: boolean`. `tsc -b` vert. Commit
  `feat(admin): la base de la réception — À répondre, Non classés, relance à 5 jours`.

---

### Task 2 : les règles pures — lire un e-mail reçu, plier la citation

**Files :** Create `supabase/functions/_shared/prospect-inbound.ts`,
`apps/web-v2/src/lib/prospect-inbound.test.ts`, `apps/web-v2/src/lib/quoted.ts`,
`apps/web-v2/src/lib/quoted.test.ts`.

**Produces :**
- `emailAddress(from: string): string` — l'adresse, minuscules, sans le nom.
- `threadKeys(headers: Record<string, string>): string[]` — les Message-ID d'`in-reply-to` puis de
  `references` (sans doublon, dans l'ordre, clés d'en-tête insensibles à la casse).
- `bodyText(o: { text: string | null; html: string | null }): string` — le texte ; sinon l'HTML
  (décodé s'il est en `data:…;base64,`) réduit à du texte (balises retirées, `<br>`/`</p>` en sauts de
  ligne, entités `&amp; &lt; &gt; &quot; &#39; &nbsp;` décodées).
- `splitQuoted(text: string): { main: string; quoted: string }` — coupe à la première ligne
  « Le … a écrit : » / « On … wrote: » / ligne commençant par `>`.

- [ ] **Step 1 : les tests**

`apps/web-v2/src/lib/prospect-inbound.test.ts` :
```ts
/**
 * QUOI     — tests de supabase/functions/_shared/prospect-inbound.ts : lire un e-mail reçu.
 * POURQUOI — une réponse mal lue se rangerait dans le mauvais fil, ou nulle part.
 */
import { describe, expect, it } from 'vitest'
import { bodyText, emailAddress, threadKeys } from '../../../../supabase/functions/_shared/prospect-inbound'

describe('emailAddress', () => {
  it('garde l’adresse, en minuscules, sans le nom', () => {
    expect(emailAddress('"Manon Leclerc" <Manon@CuirDeLune.fr>')).toBe('manon@cuirdelune.fr')
    expect(emailAddress('manon@cuirdelune.fr')).toBe('manon@cuirdelune.fr')
  })
})

describe('threadKeys', () => {
  it('In-Reply-To puis References, sans doublon', () => {
    expect(
      threadKeys({ 'In-Reply-To': '<b@x>', references: '<a@x> <b@x>' }),
    ).toEqual(['<b@x>', '<a@x>'])
  })
  it('rien : liste vide', () => {
    expect(threadKeys({})).toEqual([])
  })
})

describe('bodyText', () => {
  it('le texte quand il existe', () => {
    expect(bodyText({ text: 'Bonjour', html: '<p>x</p>' })).toBe('Bonjour')
  })
  it('sinon l’HTML réduit à du texte', () => {
    expect(bodyText({ text: null, html: '<p>Merci &amp; à bientôt</p><p>Manon<br>Cuir</p>' })).toBe(
      'Merci & à bientôt\n\nManon\nCuir',
    )
  })
  it('un HTML en data:base64', () => {
    const html = `data:text/html;base64,${btoa('<p>Oui</p>')}`
    expect(bodyText({ text: null, html })).toBe('Oui')
  })
})
```

`apps/web-v2/src/lib/quoted.test.ts` :
```ts
/**
 * QUOI     — tests de lib/quoted.ts : séparer la réponse du message cité.
 * POURQUOI — le fil montre ce que le prospect a écrit, pas notre e-mail recopié dessous.
 */
import { describe, expect, it } from 'vitest'
import { splitQuoted } from './quoted'

describe('splitQuoted', () => {
  it('coupe à « Le … a écrit : »', () => {
    expect(splitQuoted('Merci !\n\nLe 16 oct. 2026, Uriel a écrit :\n> Bonjour')).toEqual({
      main: 'Merci !',
      quoted: 'Le 16 oct. 2026, Uriel a écrit :\n> Bonjour',
    })
  })
  it('coupe à « On … wrote: » et aux lignes « > »', () => {
    expect(splitQuoted('Yes\nOn Fri, Uriel wrote:\n> Hi').main).toBe('Yes')
    expect(splitQuoted('Oui\n> Bonjour').main).toBe('Oui')
  })
  it('sans citation : tout est la réponse', () => {
    expect(splitQuoted('Juste ça')).toEqual({ main: 'Juste ça', quoted: '' })
  })
})
```

- [ ] **Step 2 : ils échouent** (`pnpm --filter web-v2 exec vitest run src/lib/prospect-inbound.test.ts src/lib/quoted.test.ts`).

- [ ] **Step 3 : le code**

`supabase/functions/_shared/prospect-inbound.ts` :
```ts
// prospect-inbound (règles) : lire un e-mail reçu — l'adresse de l'expéditeur, les identifiants du
// fil, le texte. Pur, sans Deno : testé par vitest (apps/web-v2/src/lib/prospect-inbound.test.ts).
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

export function emailAddress(from: string): string {
  const inBrackets = /<([^>]+)>/.exec(from)
  return (inBrackets?.[1] ?? from).trim().toLowerCase()
}

function header(headers: Record<string, string>, name: string): string {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name)
  return key ? (headers[key] ?? '') : ''
}

export function threadKeys(headers: Record<string, string>): string[] {
  const ids = `${header(headers, 'in-reply-to')} ${header(headers, 'references')}`.match(/<[^>]+>/g) ?? []
  return [...new Set(ids)]
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
}

function decodeDataUri(html: string): string {
  const match = /^data:[^,]*;base64,(.*)$/s.exec(html)
  if (!match) return html
  const bytes = Uint8Array.from(atob(match[1] ?? ''), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function bodyText(o: { text: string | null; html: string | null }): string {
  if (o.text?.trim()) return o.text.trim()
  return decodeDataUri(o.html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTITIES[e] ?? e)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
```

`apps/web-v2/src/lib/quoted.ts` :
```ts
/**
 * QUOI     — sépare une réponse reçue du message cité qu'elle recopie (« Le … a écrit : », « > »).
 * POURQUOI — le fil montre ce que le prospect a écrit ; la citation se déplie à la demande.
 */
const QUOTE_START = /^(Le .+ a écrit\s?:|On .+ wrote:|>)/m

export function splitQuoted(text: string): { main: string; quoted: string } {
  const match = QUOTE_START.exec(text)
  if (!match) return { main: text.trim(), quoted: '' }
  return { main: text.slice(0, match.index).trim(), quoted: text.slice(match.index).trim() }
}
```

- [ ] **Step 4 : ils passent ; lint ; commit** `feat(admin): lire un e-mail reçu et plier la citation`.

---

### Task 3 : la fonction `prospect-inbound`

**Files :** Create `supabase/functions/prospect-inbound/index.ts` ; Modify `supabase/config.toml`
(`verify_jwt = false`, raison en commentaire), `supabase/functions/prospect-send/index.ts`
(`reply_to: from`, commentaire du lot 3b retiré).

- [ ] **Step 1 : la fonction**

```ts
// prospect-inbound : les réponses reçues sur @equipe.flw.sh. Public (verify_jwt = false) : la
// signature Svix du webhook « email.received » fait foi, vérifiée avant toute écriture. Le message
// complet se lit par l'API de réception de Resend (clé de lecture), se rattache à son fil (en-têtes,
// sinon adresse de l'expéditeur, sinon « Non classés »), s'enregistre une seule fois (resend_id
// unique : Svix réessaie), et part en copie au suiveur.
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

import { Webhook } from 'npm:svix@1.45.1'
import { bodyText, emailAddress, threadKeys } from '../_shared/prospect-inbound.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

type Received = { type: string; data: { email_id?: string } }
type Email = {
  from: string; to: string[]; subject: string | null; text: string | null; html: string | null
  headers: Record<string, string>; message_id: string | null; created_at: string
  attachments?: unknown[]
}
const PAGE = 'https://flw.sh/v2/admin/prospects'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })
  const payload = await req.text()
  let event: Received
  try {
    event = new Webhook(Deno.env.get('RESEND_INBOUND_SECRET')!).verify(payload, {
      'svix-id': req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    }) as Received
  } catch {
    return new Response('invalid_signature', { status: 400 })
  }
  const emailId = event.data.email_id
  if (event.type !== 'email.received' || !emailId) return new Response('ignored')

  const admin = getSupabaseAdmin()
  try {
    const { data: already } = await admin.from('prospect_messages').select('id').eq('resend_id', emailId).maybeSingle()
    if (already) return new Response('ok')

    const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_READ_KEY')}` },
    })
    if (!response.ok) throw new Error(`resend ${response.status}`)
    const email = (await response.json()) as Email

    const from = emailAddress(email.from)
    const to = emailAddress(email.to[0] ?? '')
    const keys = threadKeys(email.headers ?? {})

    // Le fil : un de nos messages cité dans les en-têtes, sinon un prospect à cette adresse.
    let prospectId: string | null = null
    if (keys.length) {
      const { data: known } = await admin.from('prospect_messages').select('prospect_id')
        .in('message_id', keys).not('prospect_id', 'is', null)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      prospectId = known?.prospect_id ?? null
    }
    if (!prospectId) {
      const { data: byEmail } = await admin.from('prospects').select('id').eq('email', from).maybeSingle()
      prospectId = byEmail?.id ?? null
    }

    const text = bodyText({ text: email.text, html: email.html })
    const { error: insErr } = await admin.from('prospect_messages').insert({
      prospect_id: prospectId, direction: 'in', from_email: from, to_email: to,
      subject: email.subject ?? '', body_text: text, message_id: email.message_id,
      in_reply_to: keys[0] ?? null, references_ids: keys, resend_id: emailId,
      has_attachments: (email.attachments?.length ?? 0) > 0, received_at: email.created_at,
    })
    // 23505 : déjà reçu (deux signaux presque simultanés) — rien à refaire.
    if (insErr?.code === '23505') return new Response('ok')
    if (insErr) throw insErr

    let prospectName: string | null = null
    let ownerId: string | null = null
    if (prospectId) {
      const { data: p, error } = await admin.from('prospects')
        .update({ email_status: 'repondu', a_relancer: false }).eq('id', prospectId)
        .select('name, brand, owner_id').single()
      if (error) throw error
      prospectName = p.name ?? p.brand
      ownerId = p.owner_id
    }

    // La copie : au suiveur, sinon au compte dont l'adresse a reçu l'e-mail.
    if (!ownerId) {
      const alias = to.split('@')[0] ?? ''
      const { data: sender } = await admin.from('prospect_senders').select('user_id').eq('alias', alias).maybeSingle()
      ownerId = sender?.user_id ?? null
    }
    const { data: owner } = ownerId
      ? await admin.from('users').select('email').eq('actor_id', ownerId).maybeSingle()
      : { data: null }
    if (owner?.email) {
      const who = prospectName ?? from
      const link = prospectId ? `${PAGE}/${prospectId}` : `${PAGE}/non-classes`
      const copy = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '"Fellowship" <notifications@equipe.flw.sh>', to: [owner.email],
          subject: `${who} t’a répondu`,
          text: `${who} t’a répondu :\n\n${text}\n\n—\nRépondre depuis Fellowship : ${link}`,
        }),
      })
      if (!copy.ok) console.error('[prospect-inbound] copie', copy.status)
    }
    return new Response('ok')
  } catch (err) {
    console.error('[prospect-inbound]', err)
    // 500 : Svix réessaiera plus tard.
    return new Response('failed', { status: 500 })
  }
})
```

- [ ] **Step 2 : `prospect-send`** : `reply_to: from` (au lieu de l'e-mail du compte), retirer la
  lecture de `users.email` devenue inutile et le commentaire « Lot 3b ».
- [ ] **Step 3 : vérifier en copie isolée** (`deno check` des deux fonctions) ; commit
  `feat(admin): la fonction prospect-inbound range les réponses et prévient le suiveur`.

---

### Task 4 : le fil, « À répondre », la relance proposée

**Files :** Modify `ThreadCard.tsx`, `ComposeCard.tsx`, `ProspectsTable.tsx`, `ProspectPage.tsx`,
`lib/prospect-list.ts` (+ test), `useProspects.ts`, `admin-prospect-page.css`, `admin-prospects.css`.

- [ ] **Step 1 (TDD)** — `PROSPECT_FILTERS` gagne `{ value: 'a_repondre', label: 'À répondre' }` après
  « Ont répondu » ; test : `readProspectsQuery(new URLSearchParams('filtre=a_repondre')).filter` vaut
  `'a_repondre'`.
- [ ] **Step 2 — le fil** : un message reçu affiche `splitQuoted(body).main` ; si `quoted`, un
  `<details className="prospect-thread__quoted"><summary>Voir le message cité</summary>…</details>`
  (texte en `pre-wrap`, couleur `--ink-soft`).
- [ ] **Step 3 — « À répondre »** : dans le tableau et l'en-tête de la page, si `a_repondre` (liste)
  ou si le dernier message du fil est reçu (page), le statut affiche « À répondre » en brique
  (`prospect-status--a-repondre`, `color: var(--tone-brique-ink)`), à la place de « Répondu ».
- [ ] **Step 4 — la relance** : dans `ComposeCard`, le modèle voulu est
  `search.get('modele') ?? (prospect.a_relancer && dernierMessageSortant ? 'relance' : null)`.
- [ ] **Step 5** : lint, `tsc -b`, vitest ; commit
  `feat(admin): le fil plie la citation, « À répondre » et la relance proposée`.

---

### Task 5 : « Non classés »

**Files :** Create `features/admin-prospects/UnclassifiedPage.tsx`, `useUnclassified.ts`,
`FileDialog.tsx`, `styles/3-components/admin-unclassified.css` ; Modify `App.tsx` (route
`/admin/prospects/non-classes` **avant** `/admin/prospects/:id`), `ProspectsPage.tsx` (bouton « Non
classés · N », visible si N > 0 — N lu par `admin_prospects_non_classes` dans `useProspects`),
`prospect-writes.ts` (`fileMessage(messageId, prospectId)` → RPC `admin_ranger_message`).

- [ ] **Step 1 — la page** (patron des pages du lot) : retour « Prospects », titre « Non classés »,
  phrase « Les réponses reçues qu’on n’a pas su rattacher à un prospect. » ; une carte par message :
  expéditeur, adresse qui l'a reçu, date (`formatDayMonthShort`, `formatTime`), objet, texte
  (`splitQuoted(...).main`, citation pliée) ; deux boutons : **Ranger sous un prospect** (fenêtre
  `FileDialog` : `AdminSearch` sur `admin_prospects`, une ligne par résultat, « Ranger ») et **Nouveau
  prospect** (`insertProspect({ name: nom lu dans l'expéditeur ou null, email })` puis
  `fileMessage`, puis ouverture de la page du nouveau prospect). Liste vide : « Aucune réponse en
  attente de rangement. »
- [ ] **Step 2** : lint, `tsc -b`, vitest ; commit `feat(admin): Non classés — ranger une réponse ou en faire un prospect`.

---

### Task 6 (contrôleur, avec Uriel) : activer la réception, essais réels, livrer

- [ ] Prérequis 1 à 4 (MX, clé de lecture, webhook, secrets par fichier).
- [ ] Appliquer, déployer `prospect-inbound` et `prospect-send` ; faux signal sur `prospect-inbound` → 400.
- [ ] Un prospect d'essai à l'adresse ProtonMail d'Uriel ; un envoi ; Uriel **répond** depuis
  ProtonMail. Attendu : la réponse apparaît dans le fil (citation pliée), le prospect passe « À
  répondre », la copie « … t’a répondu » arrive dans la boîte d'Uriel avec le lien.
- [ ] Uriel écrit **un nouvel e-mail** (sans répondre) à `uriel@equipe.flw.sh` depuis une adresse qui
  n'est pas un prospect : il arrive dans « Non classés » ; le ranger sous le prospect d'essai.
- [ ] `select prospects_relancer()` après avoir antidaté l'envoi d'essai de 6 jours
  (`update prospect_messages set sent_at = now() - interval '6 days' …`) : « À relancer » coché ;
  décocher, relancer la fonction : reste décoché.
- [ ] Effacer les données d'essai. V2 `2.50.0`, `pnpm deploy:v2`, hash vérifié, `git push`,
  `_État.md`.
- [ ] Relecture finale par un agent neuf avant le déploiement de la V2.
