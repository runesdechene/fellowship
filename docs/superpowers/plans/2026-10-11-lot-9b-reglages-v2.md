# Lot 9b — Les Réglages (V2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compléter la page `/reglages` de la V2 (Profil, Compte, Enseignes et abonnement, Contact, Supprimer mon compte), avec une vraie suppression de compte côté serveur et le verrou des colonnes Stripe.

**Architecture:** Une section = un composant de `apps/web-v2/src/features/settings/`, toutes bâties sur une seule ligne de réglage (`SettingRow`). Les règles de forme vivent dans `lib/settings.ts` (testé). La suppression passe par une nouvelle fonction serveur `delete-account` (aperçu puis exécution), dont le plan pur `deletionPlan` est écrit et testé dans `lib/deletion-plan.ts` puis recopié dans la fonction par le script de copie existant. Une migration étend le déclencheur `protect_entity_plan` aux colonnes Stripe.

**Tech Stack:** React 19, React Router 7 (`BrowserRouter`), supabase-js, Vitest, Deno (fonctions Supabase), Postgres.

**Spec:** `docs/superpowers/specs/2026-10-11-lot-9b-reglages-v2-design.md`

## Global Constraints

- Maquette qui fait foi : Figma `2206:691` (« 2027 — Réglages · ligne Suggestions pour toi »). Ce qui n'y est pas n'existe pas.
- Aucune valeur en dur dans `styles/3-components/` ; aucun style dans les `.tsx` (sauf variables CSS `'--nom'`). Jetons dans `styles/2-semantic.css`.
- Mouvements : `--duration-fast`, `--duration-medium`, `--ease-out` (pas de `--duration-base`) ; `prefers-reduced-motion` respecté.
- Chaque fichier : en-tête `QUOI / POURQUOI / (ATTENTION)` ; chaque dossier : `README.md`.
- `pnpm --filter web-v2 lint` (ESLint strict, 400 lignes max, pas de `any`/`!`/promesse jetée dans un `onClick`) avant chaque commit.
- Toute requête dont on prend « le premier résultat » est triée.
- Migrations : `supabase/migrations/<horodatage>_<nom>.sql`, appliquées par `node_modules/supabase/bin/supabase.exe db push --linked`, POURQUOI en tête, `CREATE OR REPLACE` depuis la définition **live** copiée entière.
- La base est la production : aucune écriture de test sur un compte réel ; le profil d'Uriel modifié pour essai est remis à l'identique.
- Déploiement de la fonction `delete-account` et de la V2 : au GO d'Uriel seulement.
- Avant tout commit : `git checkout -- graphify-out`. Commits en français, Conventional Commits, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Textes : « Chaque changement s'enregistre aussitôt » ; « Tape SUPPRIMER pour confirmer » ; contact `appfellowship@pm.me`.

## Review Focus

1. **Un champ du profil vidé ou invalide** (nom vide, code postal « 6300 ») : rien ne s'écrit, la saisie reste, un message dit pourquoi — jamais un nom vide en base.
2. **La suppression qui échoue à mi-chemin** (Stripe en panne, fichier introuvable) : la fonction renvoie une erreur, rien de ce qui reste n'est cassé, et un second appel reprend sans planter sur ce qui a déjà disparu.
3. **Une personne membre d'une enseigne sans en être propriétaire** : l'enseigne n'est jamais supprimée avec elle ; elle n'en perd que son appartenance.
4. **Une enseigne Pro offerte (sans abonnement Stripe) ou en essai** : la phrase et le bouton correspondent (pas de « Gérer » sans abonnement).
5. **Le mot de confirmation tapé en minuscules ou avec des espaces** : seul « SUPPRIMER » exact allume le bouton (pas de suppression par erreur), mais les espaces autour sont tolérés.

---

### Task 1: Le verrou Stripe (migration)

**Files:**
- Create: `supabase/migrations/20261011190000_protect_entity_stripe_columns.sql`
- Modify: `docs/v2/purge-back.md` (ligne « Colonnes d'abonnement de `entities` »)

**Interfaces:**
- Consumes: rien.
- Produces: déclencheur `protect_entity_plan` qui, pour une session utilisateur (`auth.uid() IS NOT NULL`), remet à leur ancienne valeur `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `billing_interval`, `current_period_end`, `trial_end`, `discount_end`, `discount_label` (en plus de `plan`, `comped_pro_until`, `is_ambassador`).

- [ ] **Step 1: Prouver le trou (RED)** — une écriture simulée, annulée, sur une enseigne existante d'Uriel, en se faisant passer pour son compte :

```bash
node_modules/supabase/bin/supabase.exe db query --linked "
begin;
select set_config('request.jwt.claims', json_build_object('sub', m.user_actor_id, 'role','authenticated')::text, true)
  from memberships m order by m.created_at limit 1;
set local role authenticated;
update entities set subscription_status = 'zzz-test'
  where actor_id = (select entity_actor_id from memberships order by created_at limit 1);
select subscription_status from entities
  where actor_id = (select entity_actor_id from memberships order by created_at limit 1);
rollback;"
```
Expected : la dernière lecture rend `zzz-test` (le trou existe). Rien n'est gardé (`rollback`).

- [ ] **Step 2: Écrire la migration** (définition live du 11/10/2026, seules les colonnes Stripe s'ajoutent) :

```sql
-- POURQUOI : lot 9b (11/10/2026, accord d'Uriel). La politique entities_update_member laisse tout
--   membre modifier sa ligne d'enseigne ; seuls plan, comped_pro_until et is_ambassador étaient
--   protégés. Un membre pouvait donc s'écrire un abonnement « active » ou une fin de période
--   lointaine. Les colonnes d'abonnement ne s'écrivent plus que par les fonctions serveur (client
--   admin, sans auth.uid()) — le webhook Stripe. legal_name et siren restent modifiables (voulu).
-- Définition reprise entière du live, seules les lignes Stripe s'ajoutent.
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
    IF NEW.comped_pro_until IS DISTINCT FROM OLD.comped_pro_until THEN
      NEW.comped_pro_until := OLD.comped_pro_until;
    END IF;
    IF NEW.is_ambassador IS DISTINCT FROM OLD.is_ambassador THEN
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
  END IF;
  RETURN NEW;
END;
$function$;
```

- [ ] **Step 3: Appliquer** :

```bash
export SUPABASE_DB_PASSWORD="$(grep '^SUPABASE_DB_PASSWORD=' .env | sed 's/^SUPABASE_DB_PASSWORD=//; s/\r$//; s/^"//; s/"$//')"
echo y | node_modules/supabase/bin/supabase.exe db push --linked
```
Expected : `Applying migration 20261011190000_protect_entity_stripe_columns.sql... Finished supabase db push.`

- [ ] **Step 4: GREEN** — relancer exactement la requête du Step 1.
Expected : la lecture rend l'ancien statut (pas `zzz-test`).

- [ ] **Step 5: Clore la ligne du registre** — dans `docs/v2/purge-back.md`, remplacer la ligne « Colonnes d'abonnement de `entities` » par :

```markdown
| ~~Colonnes d'abonnement de `entities`~~ | Réglé le 11/10/2026 (migration `20261011190000`, accord d'Uriel, lot 9b) : le déclencheur `protect_entity_plan` les remet à leur valeur pour toute session utilisateur ; seules les fonctions serveur les écrivent | — |
```

- [ ] **Step 6: Commit**

```bash
git checkout -- graphify-out
git add supabase/migrations/20261011190000_protect_entity_stripe_columns.sql docs/v2/purge-back.md
git commit -m "fix(db): les colonnes d'abonnement d'une enseigne ne s'écrivent plus que par Stripe"
```

---

### Task 2: Les règles des Réglages (`lib/settings.ts`)

**Files:**
- Create: `apps/web-v2/src/lib/settings.ts`, `apps/web-v2/src/lib/settings.test.ts`
- Modify: `apps/web-v2/src/lib/README.md` (une ligne)

**Interfaces:**
- Consumes: `formatFullDate(date: Date): string` (`lib/dates.ts`), `isPro(entity, now)` (`lib/plan.ts`).
- Produces:
  - `type ProfileField = 'display_name' | 'city' | 'postal_code'`
  - `profileProblem(field: ProfileField, value: string): string | null`
  - `cleanProfileValue(field: ProfileField, value: string): string | null` — la valeur à écrire (espaces retirés ; vide → `null`, sauf le nom).
  - `SEX_OPTIONS: ReadonlyArray<{ value: 'indefini' | 'femme' | 'homme'; label: string }>`
  - `interface EntityBilling { plan: string | null; comped_pro_until: string | null; verified: boolean | null; subscription_status: string | null; billing_interval: string | null; current_period_end: string | null; trial_end: string | null; legal_name: string | null }`
  - `entityLine(entity: EntityBilling, now: Date, upcomingDates: number): { text: string; action: 'portal' | 'upgrade' | 'none'; pro: boolean }`
  - `confirmsDeletion(typed: string): boolean`

- [ ] **Step 1: Écrire les tests (RED)**

```ts
/**
 * QUOI     — tests des règles des Réglages : les champs du profil, la phrase d'une enseigne, le mot
 *            qui confirme la suppression.
 * POURQUOI — un nom vide ou un code postal faux ne doit jamais partir ; la phrase d'abonnement dit
 *            vrai pour chaque état Stripe ; une suppression ne part que sur le mot exact.
 */
import { describe, expect, test } from 'vitest'
import {
  cleanProfileValue,
  confirmsDeletion,
  entityLine,
  profileProblem,
  type EntityBilling,
} from './settings'

const now = new Date(2026, 9, 11)
const free: EntityBilling = {
  plan: 'free',
  comped_pro_until: null,
  verified: false,
  subscription_status: null,
  billing_interval: null,
  current_period_end: null,
  trial_end: null,
  legal_name: null,
}

describe('profileProblem', () => {
  test('le nom est obligatoire, 60 caractères au plus', () => {
    expect(profileProblem('display_name', '   ')).toBe('Ton nom ne peut pas être vide')
    expect(profileProblem('display_name', 'a'.repeat(61))).toBe('60 caractères au plus')
    expect(profileProblem('display_name', 'Uriel')).toBeNull()
  })
  test('le code postal : cinq chiffres, ou rien', () => {
    expect(profileProblem('postal_code', '6300')).toBe('Cinq chiffres')
    expect(profileProblem('postal_code', '63 000')).toBe('Cinq chiffres')
    expect(profileProblem('postal_code', '63000')).toBeNull()
    expect(profileProblem('postal_code', '')).toBeNull()
  })
  test('la ville : 60 caractères au plus, vide permis', () => {
    expect(profileProblem('city', 'a'.repeat(61))).toBe('60 caractères au plus')
    expect(profileProblem('city', '')).toBeNull()
  })
})

describe('cleanProfileValue', () => {
  test('retire les espaces ; un champ facultatif vide devient null', () => {
    expect(cleanProfileValue('display_name', '  Uriel ')).toBe('Uriel')
    expect(cleanProfileValue('city', '   ')).toBeNull()
    expect(cleanProfileValue('postal_code', ' 63000 ')).toBe('63000')
  })
})

describe('entityLine', () => {
  test('gratuit : le nombre de dates des 6 prochains mois, et Passer Pro', () => {
    expect(entityLine(free, now, 2)).toEqual({
      text: 'Gratuit · 2 dates sur tes 6 prochains mois',
      action: 'upgrade',
      pro: false,
    })
    expect(entityLine(free, now, 1).text).toBe('Gratuit · 1 date sur tes 6 prochains mois')
    expect(entityLine(free, now, 0).text).toBe('Gratuit · aucune date sur tes 6 prochains mois')
  })
  test('Pro payé : rythme, renouvellement, facture', () => {
    const pro = {
      ...free,
      plan: 'pro',
      subscription_status: 'active',
      billing_interval: 'year',
      current_period_end: '2027-03-12T10:00:00Z',
      legal_name: 'SARL Runes de Chêne',
    }
    expect(entityLine(pro, now, 5)).toEqual({
      text: 'Pro annuel · renouvelé le 12 mars 2027 · facture au nom de SARL Runes de Chêne',
      action: 'portal',
      pro: true,
    })
    expect(entityLine({ ...pro, billing_interval: 'month', legal_name: null }, now, 5).text).toBe(
      'Pro mensuel · renouvelé le 12 mars 2027',
    )
  })
  test('essai et paiement en attente', () => {
    const trial = {
      ...free,
      plan: 'pro',
      subscription_status: 'trialing',
      billing_interval: 'month',
      trial_end: '2026-10-25T10:00:00Z',
    }
    expect(entityLine(trial, now, 0).text).toBe('Pro mensuel · essai jusqu’au 25 octobre 2026')
    const late = { ...trial, subscription_status: 'past_due', trial_end: null }
    expect(entityLine(late, now, 0).text).toBe('Pro mensuel · paiement en attente')
    expect(entityLine(late, now, 0).action).toBe('portal')
  })
  test('Pro offert : la date de fin, aucun bouton', () => {
    const comped = { ...free, comped_pro_until: '2027-01-31T00:00:00Z' }
    expect(entityLine(comped, now, 3)).toEqual({
      text: 'Pro offert jusqu’au 31 janvier 2027',
      action: 'none',
      pro: true,
    })
  })
  test('un abonnement résilié retombe en gratuit', () => {
    const canceled = { ...free, subscription_status: 'canceled' }
    expect(entityLine(canceled, now, 1).action).toBe('upgrade')
  })
})

describe('confirmsDeletion', () => {
  test('seul le mot exact confirme ; les espaces autour sont tolérés', () => {
    expect(confirmsDeletion('SUPPRIMER')).toBe(true)
    expect(confirmsDeletion('  SUPPRIMER ')).toBe(true)
    expect(confirmsDeletion('supprimer')).toBe(false)
    expect(confirmsDeletion('SUPPRIME')).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer (RED)**

Run: `pnpm --filter web-v2 exec vitest run src/lib/settings.test.ts`
Expected : FAIL, « Failed to resolve import "./settings" ».

- [ ] **Step 3: Écrire `lib/settings.ts`**

```ts
/**
 * QUOI     — les règles des Réglages : les champs du profil (validation, valeur à écrire), la
 *            phrase d'une enseigne et son geste de facturation, le mot qui confirme la suppression.
 * POURQUOI — lot 9b, maquette 2206:691. Les écrans affichent ; ce qui se décide se teste ici.
 * ATTENTION — `entity.current_period_end` ne dit pas si l'abonnement est résilié en fin de période
 *            (Stripe ne nous l'écrit pas) : « renouvelé le » est la seule lecture possible.
 */
import { formatFullDate } from './dates'
import { isPro } from './plan'

export type ProfileField = 'display_name' | 'city' | 'postal_code'

const MAX_TEXT = 60

export function profileProblem(field: ProfileField, value: string): string | null {
  const trimmed = value.trim()
  if (field === 'display_name' && trimmed === '') return 'Ton nom ne peut pas être vide'
  if (field === 'postal_code') return trimmed === '' || /^\d{5}$/.test(trimmed) ? null : 'Cinq chiffres'
  return trimmed.length > MAX_TEXT ? `${String(MAX_TEXT)} caractères au plus` : null
}

export function cleanProfileValue(field: ProfileField, value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' && field !== 'display_name' ? null : trimmed
}

export const SEX_OPTIONS = [
  { value: 'indefini', label: 'Non précisé' },
  { value: 'femme', label: 'Femme' },
  { value: 'homme', label: 'Homme' },
] as const

export interface EntityBilling {
  plan: string | null
  comped_pro_until: string | null
  verified: boolean | null
  subscription_status: string | null
  billing_interval: string | null
  current_period_end: string | null
  trial_end: string | null
  legal_name: string | null
}

const SUBSCRIBED = ['active', 'trialing', 'past_due']

function datesLabel(count: number): string {
  if (count === 0) return 'aucune date'
  return count === 1 ? '1 date' : `${String(count)} dates`
}

/** La phrase d'une enseigne dans « Enseignes et abonnement », et son bouton. */
export function entityLine(
  entity: EntityBilling,
  now: Date,
  upcomingDates: number,
): { text: string; action: 'portal' | 'upgrade' | 'none'; pro: boolean } {
  const subscribed =
    entity.subscription_status !== null && SUBSCRIBED.includes(entity.subscription_status)
  if (subscribed) {
    const parts = [entity.billing_interval === 'year' ? 'Pro annuel' : 'Pro mensuel']
    if (entity.subscription_status === 'past_due') parts.push('paiement en attente')
    else if (entity.subscription_status === 'trialing' && entity.trial_end)
      parts.push(`essai jusqu’au ${formatFullDate(new Date(entity.trial_end))}`)
    else if (entity.current_period_end)
      parts.push(`renouvelé le ${formatFullDate(new Date(entity.current_period_end))}`)
    if (entity.legal_name) parts.push(`facture au nom de ${entity.legal_name}`)
    return { text: parts.join(' · '), action: 'portal', pro: true }
  }
  if (isPro(entity, now) && entity.comped_pro_until) {
    return {
      text: `Pro offert jusqu’au ${formatFullDate(new Date(entity.comped_pro_until))}`,
      action: 'none',
      pro: true,
    }
  }
  return {
    text: `Gratuit · ${datesLabel(upcomingDates)} sur tes 6 prochains mois`,
    action: 'upgrade',
    pro: false,
  }
}

export function confirmsDeletion(typed: string): boolean {
  return typed.trim() === 'SUPPRIMER'
}
```

- [ ] **Step 4: Lancer (GREEN)**

Run: `pnpm --filter web-v2 exec vitest run src/lib/settings.test.ts`
Expected : PASS, 9 tests. (Si `formatFullDate` rend un format différent de « 12 mars 2027 », c'est le test qui suit `formatFullDate` : lire `lib/dates.ts` et ajuster l'attendu, jamais recalculer la date ailleurs.)

- [ ] **Step 5: README + lint + commit**

Ajouter à `apps/web-v2/src/lib/README.md` : `- \`settings.ts\` — les règles des Réglages : champs du profil, phrase d'une enseigne, mot de suppression.`

```bash
pnpm --filter web-v2 lint
git checkout -- graphify-out
git add apps/web-v2/src/lib/settings.ts apps/web-v2/src/lib/settings.test.ts apps/web-v2/src/lib/README.md
git commit -m "feat(v2): les règles des Réglages (profil, phrase d'une enseigne, mot de suppression)"
```

---

### Task 3: Une ligne de réglage, une seule (`SettingRow`)

**Files:**
- Create: `apps/web-v2/src/features/settings/SettingRow.tsx`
- Modify: `apps/web-v2/src/features/settings/NotificationSettings.tsx`, `apps/web-v2/src/styles/3-components/settings.css`, `apps/web-v2/src/styles/2-semantic.css`

**Interfaces:**
- Produces:
  - `SettingCard({ children })` — la carte blanche bordée qui empile des lignes.
  - `SettingRow({ title, note?, badge?, leading?, children? })` — (logo,) libellé (+ aide, + pastille) à gauche, contrôle à droite.

- [ ] **Step 1: Écrire le composant**

```tsx
/**
 * QUOI     — la carte des Réglages et sa ligne : libellé (avec son aide et sa pastille) à gauche,
 *            contrôle à droite.
 * POURQUOI — maquette 2206:691 : toutes les sections sont faites de ces lignes. Une chose qui se
 *            répète devient un seul composant (Méthode, 11/10/2026).
 */
import type { ReactNode } from 'react'

export function SettingCard({ children }: { children: ReactNode }) {
  return <div className="setting-card">{children}</div>
}

interface SettingRowProps {
  title: string
  note?: string
  badge?: ReactNode
  /** Ce qui précède le libellé : le logo d'une enseigne. */
  leading?: ReactNode
  children?: ReactNode
}

export function SettingRow({ title, note, badge, leading, children }: SettingRowProps) {
  return (
    <div className="setting-row">
      {leading}
      <span className="setting-row__text">
        <span className="setting-row__title">
          {title}
          {badge}
        </span>
        {note && <span className="setting-row__note">{note}</span>}
      </span>
      {children && <span className="setting-row__control">{children}</span>}
    </div>
  )
}
```

- [ ] **Step 2: Le CSS** — dans `settings.css`, ajouter (avant « La carte du téléphone ») :

```css
/* --- La carte et sa ligne (SettingRow.tsx) ------------------------------ */
.setting-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line-card);
  border-radius: var(--radius-card);
  background: var(--surface-card);
}

.setting-row {
  display: flex;
  align-items: center;
  gap: var(--space-24);
  min-height: var(--setting-row-height);
  padding: var(--space-12) var(--space-20);
}

.setting-row + .setting-row {
  border-top: 1px solid var(--line-card);
}

.setting-row__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.setting-row__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-8);
  font: var(--type-reminder-title);
  color: var(--ink-title);
}

.setting-row__note {
  font: var(--type-list-meta);
  color: var(--ink-soft);
}

.setting-row__control {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-12);
}
```

Et dans `2-semantic.css`, bloc « Les Réglages » : `--setting-row-height: 56px; /* une ligne de la maquette 2206:691 */`.

- [ ] **Step 3: Notifications sur la même ligne** — dans `NotificationSettings.tsx`, la carte `.push-lines` devient `SettingCard` et chaque `push-line` devient un `SettingRow` dont le contrôle est l'interrupteur (le bouton `role="switch"` ne porte plus que l'interrupteur, avec `aria-label={line.title}`). L'en-tête « Téléphone » reste au-dessus, dans la carte. Garder les classes `push-line--on` / `push-line--locked` sur le bouton, et les règles CSS de l'interrupteur (`.push-line__switch`) ; supprimer de `settings.css` les règles devenues mortes (`.push-line` en ligne, `.push-line__text`, `.push-line__title`, `.push-line__detail`). La grisaille « avant activation » (`.push-lines--off`) passe sur un `<div>` qui enveloppe la carte.

- [ ] **Step 4: Vérifier** — `pnpm --filter web-v2 lint` puis `pnpm --filter web-v2 dev` ; sur `/reglages`, la section Notifications est identique à avant (capture avant/après), l'interrupteur se bascule.
Expected : aucun écart visible ; lint vert.

- [ ] **Step 5: Commit**

```bash
git checkout -- graphify-out
git add apps/web-v2/src/features/settings apps/web-v2/src/styles
git commit -m "refactor(v2): une seule ligne de réglage, reprise par Notifications"
```

---

### Task 4: Profil

**Files:**
- Create: `apps/web-v2/src/features/settings/ProfileSection.tsx`, `apps/web-v2/src/features/settings/useProfileSave.ts`
- Modify: `apps/web-v2/src/features/settings/SettingsPage.tsx`, `apps/web-v2/src/styles/3-components/settings.css`, `apps/web-v2/src/styles/2-semantic.css`

**Interfaces:**
- Consumes: `profileProblem`, `cleanProfileValue`, `SEX_OPTIONS`, `ProfileField` (Task 2) ; `SettingCard`, `SettingRow` (Task 3) ; `useAuth()` (`person`, `user`, `actor`, `entities`, `reloadIdentity`) ; `imageProblem`, `resizeImage` (`lib/image-resize.ts`) ; `Avatar`, `Button`.
- Produces:
  - `useProfileSave()` → `{ save(patch: Partial<Pick<UserRow, 'display_name' | 'city' | 'postal_code' | 'sex' | 'avatar_url'>>): Promise<boolean>; state: 'idle' | 'saved' | 'failed' }`
  - `SaveState` exporté pour l'en-tête de la page : `type SaveState = 'idle' | 'saved' | 'failed'`.
  - `ProfileSection({ onSave }: { onSave: (state: SaveState) => void })`

- [ ] **Step 1: Le hook d'écriture** (`useProfileSave.ts`) :

```ts
/**
 * QUOI     — écrire un morceau du profil (`users`) puis relire l'identité, et dire si c'est passé.
 * POURQUOI — lot 9b : « Chaque changement s'enregistre aussitôt ». Après écriture, la barre latérale
 *            (nom, photo) se met à jour par reloadIdentity.
 */
import { useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type UserPatch = Partial<
  Pick<
    Database['public']['Tables']['users']['Update'],
    'display_name' | 'city' | 'postal_code' | 'sex' | 'avatar_url'
  >
>

export type SaveState = 'idle' | 'saved' | 'failed'

export function useProfileSave() {
  const { user, reloadIdentity } = useAuth()
  return useCallback(
    async (patch: UserPatch): Promise<boolean> => {
      if (!user) return false
      const { error } = await supabase.from('users').update(patch).eq('actor_id', user.id)
      if (error) return false
      await reloadIdentity()
      return true
    },
    [user, reloadIdentity],
  )
}
```

- [ ] **Step 2: La section** (`ProfileSection.tsx`) — `SettingCard` avec, dans l'ordre de la maquette :
  - **Photo** (note « JPG ou PNG, 5 Mo au plus ») : `Avatar` du `person` + `Button` « Changer » qui ouvre un `<input type="file" accept="image/png,image/jpeg" hidden>` ; au choix : `imageProblem(file)` (message sous la carte si refus), `resizeImage(file, 512)`, envoi dans le bucket `avatars` au chemin `${user.id}/${Date.now()}.${webp|jpg}` (`contentType` = type du blob), puis `save({ avatar_url: publicUrl })`. Le bouton dit « Envoi… » pendant l'envoi.
  - **Nom affiché**, **Ville**, **Code postal** (note « Sert à « Près de chez toi » dans l'Explorer ») : un `<input className="control setting-input">` par champ, valeur locale initialisée depuis `person`. Au `onBlur` : si `profileProblem` → message rouge sous la ligne, rien n'est écrit ; sinon si `cleanProfileValue` diffère de la valeur en base → `save({ [champ]: valeur })` et `onSave('saved' | 'failed')`.
  - **Genre** (note « Facultatif ») : `<select className="control setting-input">` sur `SEX_OPTIONS` (valeur `person.sex ?? 'indefini'`), écrit au changement.
  - **Ma vitrine** (note « L'enseigne, sa présentation, ses liens, sa bannière ») : lien « Ouvrir ma vitrine → » vers `/${entity.public_slug}` de l'enseigne active (`entities.find(e => e.actor_id === actor?.id) ?? entities[0]`) ; ligne absente sans enseigne ou sans adresse.

En-tête de section : titre « Profil », note « Ta personne. L'identité publique de ton enseigne se règle sur ta vitrine. »

- [ ] **Step 3: CSS** — `settings.css` : `.setting-input { width: var(--setting-input-width); }` et `.setting-row__problem { padding: 0 var(--space-20) var(--space-12); font: var(--type-settings-note); color: var(--status-pending-ink); }`, `.setting-link { display: inline-flex; align-items: center; gap: var(--space-6); font: var(--type-button); color: var(--ink-title); }`. `2-semantic.css` : `--setting-input-width: 188px; /* les champs de la maquette 2206:691 */`.

- [ ] **Step 4: Brancher dans la page** — `SettingsPage` tient `saveState` (`useState<SaveState>('idle')`) ; l'en-tête affiche « Chaque changement s'enregistre aussitôt » au repos, « Enregistré » (coche) 2 s après un succès (`setTimeout` nettoyé au démontage), « Pas enregistré — réessaie » après un échec. Ajouter l'entrée « Profil » à la navigation et `<ProfileSection onSave={setSaveState} />` en tête des sections.

- [ ] **Step 5: Vérifier dans le navigateur** (`pnpm dev:v2`, compte d'Uriel) : changer la ville, quitter le champ → « Enregistré », la valeur survit au rechargement ; code postal « 6300 » → « Cinq chiffres », rien n'est écrit ; nom vide → message, rien n'est écrit ; changer le genre ; changer la photo (la barre latérale suit). **Remettre chaque valeur d'origine ensuite** (noter les valeurs avant de commencer).

- [ ] **Step 6: Lint + commit**

```bash
pnpm --filter web-v2 lint
git checkout -- graphify-out
git add apps/web-v2/src/features/settings apps/web-v2/src/styles
git commit -m "feat(v2): Réglages — le profil, enregistré champ par champ"
```

---

### Task 5: Compte et Contact

**Files:**
- Create: `apps/web-v2/src/features/settings/AccountSection.tsx`, `apps/web-v2/src/features/settings/ContactSection.tsx`
- Modify: `apps/web-v2/src/features/settings/SettingsPage.tsx`

**Interfaces:**
- Consumes: `SettingCard`, `SettingRow` ; `useAuth()` (`user`, `signOut`) ; `Button` ; `useTransitionNavigate` (`lib/navigation`).

- [ ] **Step 1: `AccountSection`** — titre « Compte » ; `SettingRow` « E-mail » (note « Tu te connectes avec un code reçu à cette adresse »), contrôle = `user.email` en texte (`.setting-row__value`, encre douce) ; `SettingRow` « Se déconnecter », contrôle = `Button` avec l'icône `LogOut` « Se déconnecter » qui fait `await signOut()` puis `go('/connexion')` (vérifier le chemin de la page de connexion dans `App.tsx` et l'utiliser tel quel).

- [ ] **Step 2: `ContactSection`** — titre « Contact » ; `SettingRow` « Une question, une idée, un souci ? » (note « On lit tout et on répond vite »), contrôle = `<a className="button" href="mailto:appfellowship@pm.me">` avec l'icône `Mail` « Écrire à l'équipe » (reprendre la classe exacte du `Button` par défaut).

- [ ] **Step 3: CSS** — `.setting-row__value { font: var(--type-settings-note); color: var(--ink-soft); }`.

- [ ] **Step 4: Page** — navigation : Profil, Compte, Notifications, (Enseignes et abonnement — Task 6), Contact ; sections dans cet ordre.

- [ ] **Step 5: Vérifier** — l'adresse s'affiche ; « Écrire à l'équipe » ouvre un mail ; « Se déconnecter » ramène à la connexion (puis se reconnecter : c'est la session d'Uriel — à faire en dernier dans la session de test, ou laisser Uriel l'essayer).

- [ ] **Step 6: Lint + commit** — `feat(v2): Réglages — compte (se déconnecter) et contact`.

---

### Task 6: Enseignes et abonnement

**Files:**
- Create: `apps/web-v2/src/features/settings/EntitiesSection.tsx`, `apps/web-v2/src/features/settings/useUpcomingCounts.ts`
- Modify: `apps/web-v2/src/features/settings/SettingsPage.tsx`, `apps/web-v2/src/styles/3-components/settings.css`

**Interfaces:**
- Consumes: `entityLine`, `EntityBilling` (Task 2) ; `SettingCard`, `SettingRow` ; `openPortal(entityId)` (`lib/stripe.ts`) ; `proHorizon(today)` (`lib/plan.ts`) ; `todayIso` (`lib/dates.ts`) ; `PROGRAMMED_STATUSES` (`lib/friends.ts`) ; `useAuth()` (`entities`, `switchActor`) ; `Avatar`, `ProBadge`, `Button`.
- Produces: `useUpcomingCounts(entityIds: string[]): Map<string, number>` — les dates programmées de chaque enseigne d'aujourd'hui à l'horizon des 6 mois.

- [ ] **Step 1: Le compte des dates** (`useUpcomingCounts.ts`) : une requête `participations` (`select('actor_id, events!inner(start_date)')`, `.in('actor_id', ids)`, `.in('status', PROGRAMMED_STATUSES)`, `.gte('events.start_date', todayIso(today))`, `.lt('events.start_date', todayIso(proHorizon(today)))`), comptée par `actor_id`. Patron du dépôt : le chargement rend son résultat, l'effet l'applique une fois après un unique `if (cancelled) return`. Une lecture ratée laisse la carte vide (`Map` vide) : la phrase dira « aucune date » — accepté, c'est une aide.

- [ ] **Step 2: La section** — titre « Enseignes et abonnement », note « Chaque enseigne a sa vitrine et son propre abonnement. » ; une `SettingRow` par enseigne (`entities`, déjà triées par ancienneté d'appartenance) : à gauche `Avatar` de l'enseigne (classe `.setting-row__logo`) + titre = `brand_name`, `badge` = `<ProBadge />` si `line.pro`, note = `line.text`. Contrôle :
  - `portal` → `Button` « Gérer » : `void openPortal(entity.actor_id).catch(() => setFailed(entity.actor_id))` ; en cas d'échec, « Le portail ne s'est pas ouvert. Réessaie. » sous la carte.
  - `upgrade` → `Button variant="action"` « Passer Pro » : `switchActor(entity.actor_id)` puis `go('/pro')`.
  - `none` → rien.
  Pas de « Créer un compte exposant » (lot 10). Section absente si la personne n'a aucune enseigne.

Le logo passe par la prop `leading` de `SettingRow` (Task 3).

- [ ] **Step 3: CSS** — `.setting-row__logo { --avatar-size: var(--avatar-size-discussion); flex: none; }`.

- [ ] **Step 4: Page** — entrée « Enseignes et abonnement » dans la navigation, section entre Notifications et Contact.

- [ ] **Step 5: Vérifier** — sur le compte d'Uriel : Runes de Chêne (Pro) affiche sa phrase réelle et « Gérer » ouvre le portail Stripe (revenir sans rien changer) ; une enseigne gratuite affiche son compte de dates et « Passer Pro » bascule puis ouvre `/pro`.

- [ ] **Step 6: Lint + commit** — `feat(v2): Réglages — les enseignes et leur abonnement`.

---

### Task 7: Le plan de suppression (`deletionPlan`, pur et testé)

**Files:**
- Create: `apps/web-v2/src/lib/deletion-plan.ts`, `apps/web-v2/src/lib/deletion-plan.test.ts`
- Modify: `apps/web-v2/scripts/sync-push-phrases.mjs` (recopie aussi ce fichier dans `supabase/functions/delete-account/`), `apps/web-v2/src/lib/push-copy.test.ts` (nom du test), `apps/web-v2/src/lib/README.md`

**Interfaces:**
- Produces:
  - `interface Membership { userActorId: string; entityActorId: string; role: 'owner' | 'admin' | 'member'; createdAt: string; brandName: string }`
  - `interface DeletionPlan { deleted: { entityActorId: string; brandName: string }[]; kept: { entityActorId: string; brandName: string; heirActorId: string | null }[] }`
  - `deletionPlan(personId: string, memberships: Membership[]): DeletionPlan` — `memberships` = toutes les appartenances des enseignes de la personne (la sienne et celles des autres membres).

- [ ] **Step 1: Tests (RED)**

```ts
/**
 * QUOI     — tests du plan de suppression d'un compte : quelles enseignes partent avec, lesquelles
 *            restent, et qui en hérite.
 * POURQUOI — lot 9b : une enseigne partagée ne disparaît jamais avec un seul de ses membres, et ne
 *            reste jamais sans propriétaire. Ce plan est aussi l'aperçu montré avant de confirmer.
 */
import { describe, expect, test } from 'vitest'
import { deletionPlan, type Membership } from './deletion-plan'

const me = 'moi'
function m(entity: string, user: string, role: Membership['role'], createdAt: string): Membership {
  return { userActorId: user, entityActorId: entity, role, createdAt, brandName: `Enseigne ${entity}` }
}

describe('deletionPlan', () => {
  test('seul membre : l’enseigne part avec', () => {
    expect(deletionPlan(me, [m('a', me, 'owner', '2026-01-01')])).toEqual({
      deleted: [{ entityActorId: 'a', brandName: 'Enseigne a' }],
      kept: [],
    })
  })

  test('partagée avec un autre propriétaire : elle reste, personne à promouvoir', () => {
    const plan = deletionPlan(me, [
      m('a', me, 'owner', '2026-01-01'),
      m('a', 'lui', 'owner', '2026-02-01'),
    ])
    expect(plan.kept).toEqual([{ entityActorId: 'a', brandName: 'Enseigne a', heirActorId: null }])
    expect(plan.deleted).toEqual([])
  })

  test('seul propriétaire d’une enseigne partagée : le membre le plus ancien hérite', () => {
    const plan = deletionPlan(me, [
      m('a', me, 'owner', '2026-01-01'),
      m('a', 'recent', 'member', '2026-05-01'),
      m('a', 'ancien', 'admin', '2026-03-01'),
    ])
    expect(plan.kept).toEqual([{ entityActorId: 'a', brandName: 'Enseigne a', heirActorId: 'ancien' }])
  })

  test('simple membre d’une enseigne : elle reste, sans héritier', () => {
    const plan = deletionPlan(me, [
      m('a', 'patron', 'owner', '2026-01-01'),
      m('a', me, 'member', '2026-02-01'),
    ])
    expect(plan.kept).toEqual([{ entityActorId: 'a', brandName: 'Enseigne a', heirActorId: null }])
  })

  test('plusieurs enseignes, chacune son sort, dans l’ordre des noms', () => {
    const plan = deletionPlan(me, [
      m('b', me, 'owner', '2026-01-01'),
      m('a', me, 'owner', '2026-01-01'),
      m('c', me, 'owner', '2026-01-01'),
      m('c', 'autre', 'member', '2026-02-01'),
    ])
    expect(plan.deleted.map((entity) => entity.entityActorId)).toEqual(['a', 'b'])
    expect(plan.kept.map((entity) => entity.heirActorId)).toEqual(['autre'])
  })
})
```

- [ ] **Step 2: Lancer (RED)** — `pnpm --filter web-v2 exec vitest run src/lib/deletion-plan.test.ts` → FAIL (import introuvable).

- [ ] **Step 3: `lib/deletion-plan.ts`**

```ts
/**
 * QUOI     — le plan de suppression d'un compte : les enseignes qui partent avec la personne, celles
 *            qui restent, et le membre qui hérite de la propriété quand elle était seule à l'avoir.
 * POURQUOI — lot 9b (Uriel, 11/10/2026) : les enseignes dont on est le seul membre partent avec le
 *            compte ; les partagées restent aux autres. Ce même plan est l'aperçu de la confirmation
 *            et ce que la fonction delete-account exécute.
 * ATTENTION — recopié dans supabase/functions/delete-account/ par scripts/sync-push-phrases.mjs :
 *            il ne dépend de rien.
 */

export interface Membership {
  userActorId: string
  entityActorId: string
  role: 'owner' | 'admin' | 'member'
  createdAt: string
  brandName: string
}

export interface DeletionPlan {
  deleted: { entityActorId: string; brandName: string }[]
  kept: { entityActorId: string; brandName: string; heirActorId: string | null }[]
}

export function deletionPlan(personId: string, memberships: Membership[]): DeletionPlan {
  const mine = memberships
    .filter((membership) => membership.userActorId === personId)
    .sort((a, b) => a.brandName.localeCompare(b.brandName, 'fr'))
  const plan: DeletionPlan = { deleted: [], kept: [] }
  for (const own of mine) {
    const others = memberships
      .filter((m) => m.entityActorId === own.entityActorId && m.userActorId !== personId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const entity = { entityActorId: own.entityActorId, brandName: own.brandName }
    if (others.length === 0) {
      plan.deleted.push(entity)
      continue
    }
    const anotherOwner = others.some((m) => m.role === 'owner')
    const heir = own.role === 'owner' && !anotherOwner ? (others[0]?.userActorId ?? null) : null
    plan.kept.push({ ...entity, heirActorId: heir })
  }
  return plan
}
```

- [ ] **Step 4: Lancer (GREEN)** — même commande → PASS, 5 tests.

- [ ] **Step 5: La recopie dans la fonction** — dans `scripts/sync-push-phrases.mjs`, remplacer la liste `FILES` et les chemins par une table de copies `[fichier, dossier de la fonction]` : les quatre fichiers actuels vers `send-push/phrases/`, et `deletion-plan.ts` vers `delete-account/`. Mettre l'en-tête du script à jour (« recopie les fichiers partagés dans les fonctions serveur »). Renommer le test de `push-copy.test.ts` en « les copies des fonctions serveur sont à jour ». Lancer `node apps/web-v2/scripts/sync-push-phrases.mjs` : il crée `supabase/functions/delete-account/deletion-plan.ts`.

- [ ] **Step 6: Suite + lint + commit**

```bash
pnpm --filter web-v2 test
pnpm --filter web-v2 lint
git checkout -- graphify-out
git add apps/web-v2/src/lib apps/web-v2/scripts supabase/functions/delete-account/deletion-plan.ts
git commit -m "feat(v2): le plan de suppression d'un compte, testé et recopié côté serveur"
```

---

### Task 8: La fonction `delete-account`

**Files:**
- Create: `supabase/functions/delete-account/index.ts`
- Modify: `supabase/config.toml` (bloc `[functions.delete-account] verify_jwt = true`)

**Interfaces:**
- Consumes: `deletionPlan`, `Membership` (`./deletion-plan.ts`) ; `getSupabaseAdmin`, `getStripe`, `corsHeaders` (`../_shared/`).
- Produces: `POST /functions/v1/delete-account`, corps `{ confirm: boolean }`.
  - `confirm: false` → `200 { deleted: {entityActorId, brandName, subscribed: boolean}[], kept: {entityActorId, brandName}[] }`
  - `confirm: true` → `200 { done: true }` ; erreur → `500 { error: 'failed', step: string }`.

- [ ] **Step 1: Écrire la fonction**

```ts
// delete-account : supprime pour de vrai le compte de la personne connectée (lot 9b, 11/10/2026).
//
// Auth : verify_jwt = true ; la personne ne peut supprimer que SON compte (user.id du jeton).
// { confirm: false } rend l'aperçu ; { confirm: true } exécute le même plan (deletion-plan.ts).
// Ordre : héritiers → enseignes supprimées (Stripe, fichiers, ligne actors) → fichiers de la
// personne → ligne actors de la personne (cascade) → connexion. Chaque étape se rejoue sans
// planter sur ce qui a déjà disparu.
// Spec : docs/superpowers/specs/2026-10-11-lot-9b-reglages-v2-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getStripe } from '../_shared/stripe.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { deletionPlan, type Membership } from './deletion-plan.ts'

const ACTIVE = ['active', 'trialing', 'past_due']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)
  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: boolean }

  const admin = getSupabaseAdmin()
  let step = 'read'
  try {
    const { memberships, entities } = await readMemberships(admin, user.id)
    const plan = deletionPlan(user.id, memberships)
    const subscribed = (id: string) => {
      const entity = entities.get(id)
      return Boolean(entity?.stripe_subscription_id && ACTIVE.includes(entity.subscription_status ?? ''))
    }

    if (!confirm) {
      return json({
        deleted: plan.deleted.map((e) => ({ ...e, subscribed: subscribed(e.entityActorId) })),
        kept: plan.kept.map(({ entityActorId, brandName }) => ({ entityActorId, brandName })),
      })
    }

    step = 'heirs'
    for (const entity of plan.kept) {
      if (!entity.heirActorId) continue
      await must(admin.from('memberships').update({ role: 'owner' })
        .eq('entity_actor_id', entity.entityActorId).eq('user_actor_id', entity.heirActorId))
    }

    for (const { entityActorId } of plan.deleted) {
      step = `entity:${entityActorId}`
      const entity = entities.get(entityActorId)
      if (entity?.stripe_subscription_id && subscribed(entityActorId)) {
        await getStripe().subscriptions.cancel(entity.stripe_subscription_id)
      }
      await removeFolder(admin, 'entity-gallery', entityActorId)
      await removeFolder(admin, 'bilan-media', entityActorId)
      await must(admin.from('actors').delete().eq('id', entityActorId))
    }

    step = 'files'
    await removeFolder(admin, 'avatars', user.id)
    await removeFolder(admin, 'bilan-media', user.id)

    step = 'person'
    await must(admin.from('actors').delete().eq('id', user.id))

    step = 'auth'
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error && error.status !== 404) throw error

    return json({ done: true })
  } catch (err) {
    console.error('[delete-account]', step, err)
    return json({ error: 'failed', step }, 500)
  }
})

async function readMemberships(admin: ReturnType<typeof getSupabaseAdmin>, personId: string) {
  const { data: mine, error } = await admin.from('memberships').select('entity_actor_id')
    .eq('user_actor_id', personId)
  if (error) throw error
  const ids = (mine ?? []).map((row) => row.entity_actor_id as string)
  if (ids.length === 0) return { memberships: [] as Membership[], entities: new Map() }
  const [all, rows] = await Promise.all([
    admin.from('memberships').select('user_actor_id, entity_actor_id, role, created_at')
      .in('entity_actor_id', ids).order('created_at'),
    admin.from('entities').select('actor_id, brand_name, stripe_subscription_id, subscription_status')
      .in('actor_id', ids),
  ])
  if (all.error) throw all.error
  if (rows.error) throw rows.error
  const entities = new Map(rows.data.map((row) => [row.actor_id as string, row]))
  const memberships: Membership[] = all.data.map((row) => ({
    userActorId: row.user_actor_id,
    entityActorId: row.entity_actor_id,
    role: row.role,
    createdAt: row.created_at,
    brandName: entities.get(row.entity_actor_id)?.brand_name ?? '',
  }))
  return { memberships, entities }
}

/** Efface tout un dossier d'un bucket, sous-dossiers compris. Un dossier absent ne gêne pas. */
async function removeFolder(admin: ReturnType<typeof getSupabaseAdmin>, bucket: string, prefix: string) {
  const paths: string[] = []
  const queue = [prefix]
  while (queue.length > 0) {
    const folder = queue.shift()!
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000 })
    if (error) throw error
    for (const item of data ?? []) {
      const path = `${folder}/${item.name}`
      if (item.id === null) queue.push(path)
      else paths.push(path)
    }
  }
  if (paths.length > 0) {
    const { error } = await admin.storage.from(bucket).remove(paths)
    if (error) throw error
  }
}

async function must<T extends { error: unknown }>(query: PromiseLike<T>) {
  const { error } = await query
  if (error) throw error
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Vérifier les noms avant d'écrire** — `role` de `memberships` et ses valeurs, noms des buckets (`entity-gallery`, `bilan-media`, `avatars`), et le chemin des photos de bilan (`{actorId}/…`, `lib/report-media.ts`) : `docs/db/gotchas.md` et `information_schema`. Si `testimonials` ou `event-images` contiennent des fichiers rangés par acteur, les ajouter à `removeFolder` ; sinon les laisser (festivals et témoignages restent).

- [ ] **Step 3: `config.toml`** — ajouter après `[functions.send-push]` :

```toml
[functions.delete-account]
# Auth = le jeton de la personne : elle ne peut supprimer que son propre compte.
verify_jwt = true
```

- [ ] **Step 4: Vérifier que le webhook supporte une enseigne disparue** — relire `handleSubscriptionDeleted` (`supabase/functions/stripe-webhook/index.ts`) : `lookupEntityIdFromSubscription` rend l'id des métadonnées, puis `update(...).eq('actor_id', id)` touche zéro ligne sans erreur. Rien à changer ; l'écrire dans le ledger.

- [ ] **Step 5: Commit** (le déploiement attend le GO, Task 11)

```bash
git checkout -- graphify-out
git add supabase/functions/delete-account/index.ts supabase/config.toml
git commit -m "feat(db): la fonction delete-account, qui supprime un compte pour de vrai"
```

---

### Task 9: « Supprimer mon compte » (la carte et la confirmation)

**Files:**
- Create: `apps/web-v2/src/features/settings/DeleteAccount.tsx`, `apps/web-v2/src/features/settings/useAccountDeletion.ts`, `apps/web-v2/src/styles/3-components/delete-account.css`
- Modify: `apps/web-v2/src/features/settings/SettingsPage.tsx`, `apps/web-v2/src/styles/index.css`, `apps/web-v2/src/styles/2-semantic.css`

**Interfaces:**
- Consumes: `confirmsDeletion` (Task 2) ; `delete-account` (Task 8) ; `useAuth().signOut` ; `Button`.
- Produces:
  - `useAccountDeletion()` → `{ preview: Preview | null; loading: boolean; failed: boolean; deleting: boolean; load(): Promise<void>; run(): Promise<boolean> }` avec `interface Preview { deleted: { entityActorId: string; brandName: string; subscribed: boolean }[]; kept: { entityActorId: string; brandName: string }[] }`.

- [ ] **Step 1: Le hook** — `load()` : `supabase.functions.invoke<Preview>('delete-account', { body: { confirm: false } })` ; `run()` : `invoke('delete-account', { body: { confirm: true } })`, puis si `data.done` : `await signOut()` et `window.location.assign(import.meta.env.BASE_URL)` (la session n'existe plus : un rechargement complet repart propre) ; rend `false` et `failed = true` sinon.

- [ ] **Step 2: La carte et la fenêtre** — carte seule en bas (`.delete-account`) : « Supprimer mon compte », « Efface ton profil, tes dates et tes bilans. Tes enseignes partagées restent à leurs autres membres. », bouton « Supprimer… » (encre `--danger-ink`). Le bouton ouvre un `<dialog>` (patron de `WhoGoesDialog.tsx` : `showModal`, Échap, clic sur le voile) qui appelle `load()` à l'ouverture et affiche :
  - « Ce qui disparaît : ton profil, tes dates, tes bilans, tes avis. »
  - si `preview.deleted` : « Supprimées avec ton compte : » puis chaque nom, suivi de « — son abonnement Pro est résilié » si `subscribed` ;
  - si `preview.kept` : « Restent à leurs autres membres : » puis chaque nom ;
  - `<input>` avec le libellé « Tape SUPPRIMER pour confirmer » ;
  - « Annuler » et le bouton rouge « Supprimer définitivement », actif seulement si `confirmsDeletion(typed)` et `!deleting` ; il dit « Suppression… » pendant l'appel. Pendant `deleting`, Échap et le voile ne ferment pas.
  - Échec de l'aperçu : « L'aperçu n'a pas pu être chargé. » et pas de bouton de suppression. Échec de l'exécution : « La suppression n'a pas abouti. Réessaie, ou écris-nous à appfellowship@pm.me. »

- [ ] **Step 3: CSS** — `delete-account.css` (carte, fenêtre, listes, bouton rouge) ; jetons `--danger-ink` (lire s'il existe déjà un rouge sémantique dans `2-semantic.css`, sinon le poser depuis les primitives), `--delete-dialog-width: 460px`. Apparition de la fenêtre par `@starting-style` (`opacity`, `translate`), `prefers-reduced-motion` à zéro. Importer le fichier dans `styles/index.css`.

- [ ] **Step 4: Vérifier** (avant déploiement de la fonction, en local) — l'ouverture appelle la fonction : sans déploiement elle répond 404 → message d'aperçu raté, aucun bouton de suppression : c'est le comportement attendu tant que la fonction n'est pas en ligne. Le mot « supprimer » en minuscules n'allume pas le bouton (test Task 2).

- [ ] **Step 5: Lint + commit** — `feat(v2): Réglages — supprimer son compte, après un aperçu et le mot SUPPRIMER`.

---

### Task 10: Navigation de la page, mobile, menu « Moi »

**Files:**
- Modify: `apps/web-v2/src/features/settings/SettingsPage.tsx`, `apps/web-v2/src/styles/3-components/settings.css`, `apps/web-v2/src/components/layout/TabBar.tsx`, `apps/web-v2/src/styles/3-components/tab-bar.css`, `apps/web-v2/src/features/settings/README.md`

- [ ] **Step 1: La section allumée** — dans `SettingsPage`, un `IntersectionObserver` (une seule instance, `rootMargin: '0px 0px -60% 0px'`) sur les `section[id]` allume l'entrée correspondante (`settings__nav-item--on`) ; un clic sur une entrée garde le défilement natif (ancre). Liste des entrées dans une constante `SECTIONS = [{ id: 'profil', label: 'Profil' }, { id: 'compte', … }, { id: 'notifications', … }, { id: 'enseignes', label: 'Enseignes et abonnement' }, { id: 'contact', … }]` ; chaque section porte l'`id` correspondant.

- [ ] **Step 2: Mobile** — dans `settings.css`, sous 760 px : la colonne reste cachée ; `.setting-row` passe en `flex-wrap: wrap`, le contrôle sous le libellé, pleine largeur pour les champs (`.setting-input { width: 100%; }`). Retirer le commentaire « Une seule section pour l'instant ».

- [ ] **Step 3: « Réglages » dans le menu « Moi »** — dans `TabBar.tsx`, avant `.tab-sheet__theme` : un `NavLink` « Réglages » (icône `Settings`) vers `/reglages`, classe `tab-sheet__link`, qui ferme la feuille au clic. CSS dans `tab-bar.css` reprenant `.tab-sheet__item`.

- [ ] **Step 4: README** — `features/settings/README.md` : la liste des fichiers (SettingsPage, SettingRow, ProfileSection, useProfileSave, AccountSection, NotificationSettings, PhoneCard, EntitiesSection, useUpcomingCounts, ContactSection, DeleteAccount, useAccountDeletion) en une ligne chacun.

- [ ] **Step 5: Vérifier** — ordinateur : la navigation suit le défilement ; fenêtre étroite (outil de taille du navigateur ou Uriel sur téléphone) : sections empilées, « Réglages » dans « Moi ».

- [ ] **Step 6: Suite complète, build, commit**

```bash
pnpm --filter web-v2 test
pnpm --filter web-v2 lint
pnpm --filter web-v2 build
git checkout -- graphify-out
git add apps/web-v2
git commit -m "feat(v2): Réglages — la navigation suit la page ; mobile et menu Moi"
```

---

### Task 11: La suppression, essayée de bout en bout (au GO d'Uriel)

**Files:** aucun dans le dépôt (script jetable dans le dossier temporaire de la session).

- [ ] **Step 1: Déployer la fonction** (GO d'Uriel requis) :

```bash
node_modules/supabase/bin/supabase.exe functions deploy delete-account --project-ref trbxpsknbtisqwefqoub
```
Expected : `Deployed Functions on project trbxpsknbtisqwefqoub: delete-account`.

- [ ] **Step 2: Un compte de test jetable** — script Node (dossier temporaire, clés lues dans `.env`, jamais affichées) : `admin.auth.admin.createUser({ email: 'test-suppression-<horodatage>@flw.test', password: <aléatoire>, email_confirm: true })` (le déclencheur crée `actors` + `users`), puis `rpc('create_owned_entity', …)` en se connectant avec ce compte (`signInWithPassword`) pour lui créer une enseigne gratuite ; une participation à un festival public quelconque ; un bilan d'une ligne.

- [ ] **Step 3: Aperçu** — `functions.invoke('delete-account', { body: { confirm: false } })` avec la session du compte de test.
Expected : `deleted` contient l'enseigne de test, `subscribed: false` ; `kept` vide.

- [ ] **Step 4: Exécution** — `{ confirm: true }`.
Expected : `{ done: true }`.

- [ ] **Step 5: Il ne reste rien** — requêtes en lecture : `actors`, `users`, `entities`, `memberships`, `participations`, `event_ledger_entries` pour les deux ids, et `auth.users` par l'e-mail de test.
Expected : zéro ligne partout.

- [ ] **Step 6: Ledger** — noter le résultat ; aucun commit.

---

## Après les tâches

Relecture fraîche de toute la branche (modèle le plus capable), corrections Critiques et Importantes en TDD, puis : déploiement de la V2 au GO (2.31 si elle n'est pas encore partie, sinon 2.32), docs (plan directeur : 9b ☑ ; `maquettes-2027.md` : `2206:691` intégré ; `_État.md` du vault), push.
