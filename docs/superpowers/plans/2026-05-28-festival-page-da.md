# Festival Page DA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyler `EventPage` à la DA « Nuit de Festival » (13ᵉ page), avec 5 champs descriptifs neufs, une modale « Comment candidater » lite, un cockpit sticky et des placeholders pour les sous-systèmes reportés.

**Architecture:** Refonte in-place de `EventPage.tsx` + réécriture `EventPage.css`. Logique dérivée extraite dans `src/lib/festival.ts` (fonctions pures, testées en TDD). Nouveaux sous-composants présentationnels (`FestivalFacts`, `HowToApplyModal`, `DiscussionTeaser`). Le cockpit réutilise `EventDashboard` restylé.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4 (CSS-first), Supabase (migration SQL), vitest.

**Spec :** `docs/superpowers/specs/2026-05-28-festival-page-da-design.md`

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `src/lib/festival.ts` | Fonctions pures dérivées : état candidatures, URL maps, J-X, présence d'infos. |
| `src/lib/festival.test.ts` | Tests unitaires des fonctions pures. |
| `supabase/migrations/<ts>_festival_fields.sql` | 5 colonnes optionnelles sur `events`. |
| `src/types/supabase.ts` + `src/types/database.ts` | Étendre `Event` (Row/Insert/Update). |
| `src/components/events/FestivalFacts.tsx` | Grille « Infos pratiques » conditionnelle. |
| `src/components/events/HowToApplyModal.tsx` | Modale « Comment candidater » lite. |
| `src/components/events/DiscussionTeaser.tsx` | Carte placeholder « bientôt ». |
| `src/components/events/EventDashboard.tsx` | Restyle visuel (classes inchangées). |
| `src/pages/EventPage.tsx` | Restructuration rendu + câblage. |
| `src/pages/EventPage.css` | Réécriture DA jour/nuit. |

---

## Task 1: Champs neufs — migration + types

**Files:**
- Create: `supabase/migrations/<ts>_festival_fields.sql`
- Modify: `src/types/supabase.ts` (events Row/Insert/Update), `src/types/database.ts` si `Event` y est dérivé.

- [ ] **Step 1: Écrire la migration**

```sql
-- Festival descriptive fields (optional, freeform). Page Festival DA.
alter table public.events
  add column if not exists edition integer,
  add column if not exists opening_hours text,
  add column if not exists expected_attendance text,
  add column if not exists stand_size text,
  add column if not exists stand_price text;
```

- [ ] **Step 2: Appliquer** via MCP `apply_migration` (name `festival_fields`) ou CLI selon dispo. Vérifier avec `list_tables` que les colonnes existent.

- [ ] **Step 3: Régénérer les types** (`generate_typescript_types`) OU ajouter manuellement les 5 clés dans `events` Row/Insert/Update de `src/types/supabase.ts` (`edition: number | null`, les 4 autres `string | null`; Insert/Update en optionnels).

- [ ] **Step 4: Vérifier** `pnpm build` (tsc) — aucune erreur de type sur `event.edition` etc.

- [ ] **Step 5: Commit** `feat(festival): champs descriptifs events (edition, horaires, affluence, emplacement)`

---

## Task 2: `src/lib/festival.ts` — fonctions pures (TDD)

Suivre `reference_react_test_infra` : tester les fonctions pures, pas le rendu React.

**Files:**
- Create: `src/lib/festival.ts`, `src/lib/festival.test.ts`

- [ ] **Step 1: Écrire les tests d'abord**

```ts
import { describe, it, expect } from 'vitest'
import { candidatureState, mapsSearchUrl, daysUntilStart, hasPracticalInfo, hasApplyInfo, editionLabel } from './festival'
import type { Event } from '@/types/database'

const base = (o: Partial<Event> = {}): Event => ({
  id: '1', name: 'Médiévales de Pérouges', city: 'Pérouges', department: '01',
  start_date: '2026-09-05', end_date: '2026-09-06',
  description: null, image_url: null, tags: ['Médiéval'],
  contact_email: null, registration_url: null, external_url: null,
  registration_deadline: null, registration_note: null,
  created_at: '', created_by: null, created_by_actor: null, acted_by_user_id: null,
  edition: null, opening_hours: null, expected_attendance: null, stand_size: null, stand_price: null,
  ...o,
} as Event)

describe('candidatureState', () => {
  const now = new Date('2026-06-01')
  it('open when deadline in future', () => {
    expect(candidatureState(base({ registration_deadline: '2026-06-30', end_date: '2026-09-06' }), now)).toBe('open')
  })
  it('closed when deadline passed but event future', () => {
    expect(candidatureState(base({ registration_deadline: '2026-05-01', end_date: '2026-09-06' }), now)).toBe('closed')
  })
  it('null when no deadline', () => {
    expect(candidatureState(base({ registration_deadline: null }), now)).toBeNull()
  })
  it('null when event is past', () => {
    expect(candidatureState(base({ registration_deadline: '2026-06-30', end_date: '2026-05-01' }), now)).toBeNull()
  })
})

describe('mapsSearchUrl', () => {
  it('encodes name + city + department', () => {
    const url = mapsSearchUrl(base())
    expect(url).toContain('https://www.google.com/maps/search/?api=1&query=')
    expect(url).toContain(encodeURIComponent('Médiévales de Pérouges Pérouges 01'))
  })
})

describe('daysUntilStart', () => {
  it('returns positive count for future', () => {
    expect(daysUntilStart(base({ start_date: '2026-09-05' }), new Date('2026-09-01'))).toBe(4)
  })
  it('returns null for past start', () => {
    expect(daysUntilStart(base({ start_date: '2026-05-01' }), new Date('2026-06-01'))).toBeNull()
  })
})

describe('hasPracticalInfo', () => {
  it('false when only mandatory dates/lieu', () => {
    expect(hasPracticalInfo(base())).toBe(false)
  })
  it('true when an optional field is filled', () => {
    expect(hasPracticalInfo(base({ opening_hours: '10h–19h' }))).toBe(true)
  })
})

describe('hasApplyInfo', () => {
  it('false when no email/url/note', () => {
    expect(hasApplyInfo(base())).toBe(false)
  })
  it('true with contact_email', () => {
    expect(hasApplyInfo(base({ contact_email: 'a@b.fr' }))).toBe(true)
  })
})

describe('editionLabel', () => {
  it('formats ordinal in French', () => {
    expect(editionLabel(21)).toBe('21ᵉ édition')
    expect(editionLabel(1)).toBe('1ʳᵉ édition')
    expect(editionLabel(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer** `pnpm test festival` → FAIL (module introuvable).

- [ ] **Step 3: Implémenter `src/lib/festival.ts`**

```ts
import type { Event } from '@/types/database'

export type CandidatureState = 'open' | 'closed'

export function candidatureState(event: Event, now: Date = new Date()): CandidatureState | null {
  if (new Date(event.end_date) < now) return null      // event passé
  if (!event.registration_deadline) return null
  return new Date(event.registration_deadline) >= now ? 'open' : 'closed'
}

export function mapsSearchUrl(event: Event): string {
  const q = [event.name, event.city, event.department].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function daysUntilStart(event: Event, now: Date = new Date()): number | null {
  const diff = Math.ceil((new Date(event.start_date).getTime() - now.getTime()) / 86400000)
  return diff > 0 ? diff : null
}

export function hasPracticalInfo(event: Event): boolean {
  return Boolean(event.opening_hours || event.expected_attendance || event.stand_size || event.stand_price || event.registration_deadline)
}

export function hasApplyInfo(event: Event): boolean {
  return Boolean(event.contact_email || event.registration_url || event.registration_note)
}

export function editionLabel(edition: number | null): string | null {
  if (!edition || edition < 1) return null
  return edition === 1 ? '1ʳᵉ édition' : `${edition}ᵉ édition`
}
```

- [ ] **Step 4: Lancer** `pnpm test festival` → PASS.

- [ ] **Step 5: Commit** `feat(festival): fonctions pures dérivées (état candidatures, maps, J-X) — TDD`

---

## Task 3: `DiscussionTeaser` — placeholder « bientôt »

**Files:**
- Create: `src/components/events/DiscussionTeaser.tsx`

- [ ] **Step 1:** Lire `src/components/layout/ComingSoon.tsx` pour réutiliser le pattern (props, classes). Si l'API ne colle pas, faire un bloc autonome.

- [ ] **Step 2: Implémenter** une carte `.event-section-card` contenant : titre « Discussion du festival », 2 onglets non-interactifs (Questions / Rencontres), un aperçu flouté `inert`, et le libellé « La mémoire du festival arrive bientôt — questions entre exposants et points de rencontre, d'une édition à l'autre. » Aucune interaction, aucun fetch.

- [ ] **Step 3: Vérifier** `pnpm build`.

- [ ] **Step 4: Commit** `feat(festival): teaser Discussion du festival (placeholder)`

---

## Task 4: `FestivalFacts` — grille Infos pratiques

**Files:**
- Create: `src/components/events/FestivalFacts.tsx`

- [ ] **Step 1: Implémenter** un composant présentationnel `FestivalFacts({ event }: { event: Event })` rendant une grille `.fest-facts` avec une cellule par champ **rempli** :
  - Dates (toujours) — réutiliser `formatDate`/`dayCount` d'EventPage (les passer en props ou dupliquer un helper court).
  - Horaires (`opening_hours`), Lieu (toujours, `city (department)`), Affluence (`expected_attendance`), Candidatures jusqu'au (`registration_deadline`), Emplacement (`stand_size` + `stand_price`).
  - Chaque cellule : icône lucide (`Calendar`, `Clock`, `MapPin`, `Users`, `FileText`, `Coins`/`Euro`) + `<small>` label + `<b>` valeur.

- [ ] **Step 2: Vérifier** `pnpm build`.

- [ ] **Step 3: Commit** `feat(festival): grille Infos pratiques (cellules conditionnelles)`

---

## Task 5: `HowToApplyModal` — modale « Comment candidater » lite

**Files:**
- Create: `src/components/events/HowToApplyModal.tsx`

- [ ] **Step 1: Implémenter** `HowToApplyModal({ event, onClose, onMarkApplied })`. Rendu conditionné par `hasApplyInfo(event)` (sinon ne pas monter côté parent). Contenu :
  - Sous-titre : « La candidature se fait directement auprès de l'organisateur. Voici les moyens connus : »
  - Si `contact_email` : ligne Email + bouton **Copier** (`navigator.clipboard.writeText`) + lien `mailto:`.
  - Si `registration_url` : ligne « Lien d'inscription » + bouton **Ouvrir** (`window.open`, `target=_blank` rel noopener).
  - Si `registration_note` : bloc note.
  - Footer : « Tu as envoyé ta candidature ? » + bouton **✓ Marquer comme candidaté** → `onMarkApplied()` (appelle `handleJoin('en_cours','amis')` côté parent) puis `onClose()`.
  - Pattern modale = celui déjà utilisé dans `EventPage.tsx` (overlay `fixed inset-0 z-50 … backdrop-blur`, `onClick` stopPropagation).

- [ ] **Step 2: Vérifier** `pnpm build`.

- [ ] **Step 3: Commit** `feat(festival): modale Comment candidater (lite, data existante)`

---

## Task 6: Restructuration `EventPage.tsx` (mode lecture)

**Files:**
- Modify: `src/pages/EventPage.tsx`

- [ ] **Step 1:** Ajouter les imports (`festival` helpers, nouveaux composants, icônes `Share2`, `Map`, `Coins`). Ajouter état `showHowTo`.

- [ ] **Step 2:** Remplacer le bloc de rendu lecture (`!editing`) par la structure DA :
  - `.event-ambient` (affiche floutée si `event.image_url`).
  - Backlink.
  - `.fest-grid` (main + side) :
    - **main** : hero (statpill via `candidatureState`, eyebrow via `tags[0]` + `editionLabel`, titre, hmeta dates/lieu/tag, hactions ★Repéré/Partager/Site + organisateur) ; bande compagnons (`friendsOnEvent`) + rally Partager ; À propos ; `FestivalFacts` ; `DiscussionTeaser` ; Avis (`ReviewSummary` + lock Pro existant).
    - **side** : poster ; cockpit (`FestivalCockpit` ou inline) contenant J-X (`daysUntilStart`), deadline, `EventDashboard`, rows (Emplacement `stand_price`, Candidature→`setShowHowTo(true)` si `hasApplyInfo`, Carte→`mapsSearchUrl`), CTA Candidater.
  - Conserver `ParticipantsModal`, note/review modales, `DateQuotaModal`.
  - Ajouter `Partager` : handler `sharePage()` = `navigator.share?.({url})` sinon `clipboard.writeText` + feedback.
  - Monter `HowToApplyModal` si `showHowTo`.

- [ ] **Step 3: Vérifier** `pnpm build` + `pnpm lint` (attention `react-hooks`, cf. `project_react_hooks_lint_gotchas`).

- [ ] **Step 4: Commit** `feat(festival): structure page DA (hero, cockpit, sections)`

---

## Task 7: Formulaire d'édition — 5 champs neufs

**Files:**
- Modify: `src/pages/EventPage.tsx` (bloc `editing`, `editForm` state, `handleSaveEdit`)

- [ ] **Step 1:** Étendre `editForm` avec `edition, opening_hours, expected_attendance, stand_size, stand_price`. Initialiser depuis `event` dans `startEditing`.

- [ ] **Step 2:** Ajouter une section « Infos pratiques » au formulaire (inputs : `edition` type number, les 4 autres type text). Inclure dans `updates` de `handleSaveEdit` (`edition: editForm.edition ? Number(editForm.edition) : null`, autres `|| null`).

- [ ] **Step 3: Vérifier** `pnpm build`.

- [ ] **Step 4: Commit** `feat(festival): édition des champs Infos pratiques`

---

## Task 8: Réécriture `EventPage.css` — DA jour/nuit

**Files:**
- Modify: `src/pages/EventPage.css`

- [ ] **Step 1:** Réécrire en tokens DA. Remplacer tous les `rgba(61,48,40,…)` (couleurs jour en dur) par `hsl(var(--muted-foreground))` / `hsl(var(--foreground))` / `color-mix`. Nouvelles classes : `.event-ambient`, `.fest-grid` (`grid-template-columns: 1fr 348px`), `.fest-hero`, `.fest-statpill` (`.open`/`.closed`), `.fest-eyebrow`, `.fest-hmeta`, `.fest-cockpit` (sticky), `.fest-facts`/`.fest-fact`, `.fest-friends-band`, `.fest-rally`, `.howto-*`.

- [ ] **Step 2: Checklist DA** (`reference_da_daynight_gotchas`, `feedback_light_button_shadow`) : `svg { fill: none }` conservé ; **aucun `#fff` en dur** (utiliser `hsl(var(--primary-foreground))`) ; ombres douces en `.light` ; boutons colorés en jour = `box-shadow` douce.

- [ ] **Step 3: Mobile** (`max-width: 1080px`) : `.fest-grid` → 1 colonne, `.col-side { order: -1 }`, `.fest-cockpit { position: static }`, affiche `max-width`.

- [ ] **Step 4: Vérifier** `pnpm build`. Vérif visuelle jour ET nuit (capture via skill `run` si possible).

- [ ] **Step 5: Commit** `style(festival): habillage DA EventPage.css (jour/nuit + mobile)`

---

## Task 9: Bump version + vérif finale + push

- [ ] **Step 1:** Bumper `APP_VERSION` (patch) dans `src/version.ts` (ou équivalent) + entrée changelog si le projet en a une.
- [ ] **Step 2:** `pnpm build` vert, `pnpm lint` vert, `pnpm test` vert.
- [ ] **Step 3:** Vérif visuelle jour + nuit + mobile.
- [ ] **Step 4:** Commit `chore: bump version` + `git push` sur `feat/da-nuit-festival-socle`.
- [ ] **Step 5:** code-review du diff de branche (skill `code-review`). Corriger les findings bloquants.

---

## Self-Review (vs spec)

- **§3 migration** → Task 1 ✓
- **§4.1 hero / statpill / eyebrow / partager** → Task 6 + Task 2 (helpers) ✓
- **§4.2 compagnons + rally Partager** → Task 6 ✓
- **§4.3 à propos** → Task 6 (réutilise existant) ✓
- **§4.4 Infos pratiques** → Task 4 ✓
- **§4.5 Discussion placeholder** → Task 3 ✓
- **§4.6 Avis + lock Pro** → Task 6 (réutilise `ReviewSummary`/gating) ✓
- **§4.7 cockpit + stepper** → Task 6 + EventDashboard restyle (Task 8 CSS) ✓
- **§4.8 modale Comment candidater** → Task 5 ✓
- **§5 dérivés (maps, J-X, partager)** → Task 2 + Task 6 ✓
- **§6 états limites** → Task 6 (conditions de rendu) ✓
- **§7 placeholders** → Tasks 3 ; itinéraire = lien maps (Task 6) ✓
- **§8 jour/nuit/mobile/a11y** → Task 8 ✓
- **§9 tests** → Task 2 ✓
- **§10 vérif** → Task 9 ✓

Pas de placeholder de plan ; signatures cohérentes entre tâches (`hasApplyInfo`, `mapsSearchUrl`, `daysUntilStart`, `candidatureState`, `editionLabel`).
