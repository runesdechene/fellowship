# Quota de dates gratuit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limiter l'entité gratuite à 5 « dates à venir actives » suivies simultanément, avec un mur d'upsell aux 2 points d'ajout de statut + un compteur sur « Mes dates ».

**Architecture:** Deux fonctions pures (`countActiveDates`, `canAddDate`) + une constante `FREE_DATES_QUOTA`, exposées via un hook `useDateQuota()`. Les 2 seuls points d'ajout (`Explorer.toggleSave`, `EventPage.handleJoin`) consultent la décision avant d'insérer et ouvrent une modale d'upsell si bloqué. Compteur affiché sur la page Mes dates pour l'entité gratuite. Enforcement client-side (durcissement serveur = follow-up).

**Tech Stack:** React 19 + TypeScript, Vite, Vitest, React Router v7, Tailwind v4 (tokens DA dual-thème), Supabase.

**Spec de référence :** `docs/superpowers/specs/2026-05-27-quota-dates-gratuit-design.md`

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `src/lib/date-quota.ts` *(nouveau)* | `countActiveDates`, `canAddDate`, `FREE_DATES_QUOTA` (purs) |
| `src/lib/date-quota.test.ts` *(nouveau)* | TDD des deux fonctions |
| `src/hooks/use-date-quota.ts` *(nouveau)* | `useDateQuota()` — état dérivé pour les consommateurs |
| `src/components/mes-dates/DateQuotaModal.tsx` *(nouveau)* | Modale d'upsell au plafond |
| `src/pages/Explorer.tsx` *(modif)* | guard dans `toggleSave` (calcul local) + rendu modale |
| `src/pages/EventPage.tsx` *(modif)* | guard dans `handleJoin` via `useDateQuota` + rendu modale |
| `src/pages/MesDates.tsx` *(modif)* | compteur quota (entité gratuite) |
| `src/pages/MesDates.css` *(modif)* | style `.md-quota` |

**Réutilisé sans modif** : `useMyParticipations` (`src/hooks/use-participations.ts`), `planForActor` + type `Plan` (`src/lib/navModel.ts`), `ActorKind` (`src/lib/explorer.ts`), `ParticipationWithEvent` (`src/types/database.ts`), tokens DA.

---

## Task 1 : Fonctions pures `date-quota.ts` (TDD)

**Files:**
- Create: `src/lib/date-quota.ts`
- Test: `src/lib/date-quota.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `src/lib/date-quota.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { countActiveDates, canAddDate, FREE_DATES_QUOTA } from './date-quota'
import type { ParticipationWithEvent } from '@/types/database'

const NOW = new Date('2026-05-15T12:00:00Z')

function part(id: string, end: string, status = 'interesse'): ParticipationWithEvent {
  return {
    id, event_id: 'e' + id, status, payment_status: null, visibility: 'amis',
    events: { id: 'e' + id, name: 'F' + id, start_date: end, end_date: end, city: 'Lyon', department: '69', image_url: null, tags: ['medieval'] },
  } as unknown as ParticipationWithEvent
}

describe('FREE_DATES_QUOTA', () => {
  it('vaut 5', () => expect(FREE_DATES_QUOTA).toBe(5))
})

describe('countActiveDates', () => {
  it('compte les dates à venir actives (end_date >= now)', () => {
    const parts = [part('1', '2026-06-01'), part('2', '2026-07-01')]
    expect(countActiveDates(parts, NOW)).toBe(2)
  })

  it('exclut les dates passées (end_date < now)', () => {
    const parts = [part('1', '2026-06-01'), part('2', '2026-01-01')]
    expect(countActiveDates(parts, NOW)).toBe(1)
  })

  it('exclut le statut refuse', () => {
    const parts = [part('1', '2026-06-01'), part('2', '2026-07-01', 'refuse')]
    expect(countActiveDates(parts, NOW)).toBe(1)
  })

  it('compte un événement en cours (start passé, end futur)', () => {
    expect(countActiveDates([part('1', '2026-05-20')], NOW)).toBe(1)
  })

  it('ignore les participations sans events', () => {
    const orphan = { id: 'x', event_id: 'ex', status: 'interesse', payment_status: null, visibility: 'amis', events: null } as unknown as ParticipationWithEvent
    expect(countActiveDates([orphan, part('1', '2026-06-01')], NOW)).toBe(1)
  })

  it('liste vide → 0', () => expect(countActiveDates([], NOW)).toBe(0))
})

describe('canAddDate', () => {
  it('entité gratuite sous le quota → true', () => expect(canAddDate('free', 'entity', 4)).toBe(true))
  it('entité gratuite pile au quota → false', () => expect(canAddDate('free', 'entity', 5)).toBe(false))
  it('entité gratuite au-delà → false', () => expect(canAddDate('free', 'entity', 6)).toBe(false))
  it('entité Pro → true quel que soit used', () => expect(canAddDate('pro', 'entity', 99)).toBe(true))
  it('personne → true quel que soit used', () => expect(canAddDate('free', 'person', 99)).toBe(true))
})
```

- [ ] **Step 2 : Lancer les tests, vérifier l'échec**

Run: `pnpm vitest run src/lib/date-quota.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3 : Implémenter**

Créer `src/lib/date-quota.ts` :

```ts
import type { ParticipationWithEvent } from '@/types/database'
import type { ActorKind } from '@/lib/explorer'
import type { Plan } from '@/lib/navModel'

/** Plafond de dates à venir actives pour une entité gratuite (curseur monétisation). */
export const FREE_DATES_QUOTA = 5

/**
 * « Dates à venir actives » : participations dont l'événement n'est pas passé
 * (end_date >= now) et dont le statut n'est pas 'refuse'. Compteur live
 * (le retrait d'un statut fait baisser le compte).
 */
export function countActiveDates(participations: ParticipationWithEvent[], now: Date): number {
  let n = 0
  for (const p of participations) {
    if (!p.events) continue
    if (p.status === 'refuse') continue
    if (new Date(p.events.end_date).getTime() < now.getTime()) continue
    n++
  }
  return n
}

/**
 * Peut-on poser un statut de plus ? Personne et entité Pro : toujours.
 * Entité gratuite : seulement sous le quota.
 */
export function canAddDate(plan: Plan, actorKind: ActorKind, used: number): boolean {
  if (actorKind === 'person') return true
  if (plan === 'pro') return true
  return used < FREE_DATES_QUOTA
}
```

- [ ] **Step 4 : Lancer les tests, vérifier le succès**

Run: `pnpm vitest run src/lib/date-quota.test.ts`
Expected: PASS (tous).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/date-quota.ts src/lib/date-quota.test.ts
git commit -m "feat(quota): fonctions pures countActiveDates + canAddDate (TDD)"
```
(Hook graphify post-commit attendu.)

---

## Task 2 : Hook `useDateQuota`

**Files:**
- Create: `src/hooks/use-date-quota.ts`

> Pas de test unitaire (hook qui assemble useMyParticipations + plan ; la logique testable est dans les fonctions pures de Task 1). Vérif via build + usage en Task 5/6.

- [ ] **Step 1 : Écrire le hook**

Créer `src/hooks/use-date-quota.ts` :

```ts
import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useMyParticipations } from '@/hooks/use-participations'
import { countActiveDates, canAddDate, FREE_DATES_QUOTA } from '@/lib/date-quota'
import type { ActorKind } from '@/lib/explorer'

export interface DateQuota {
  used: number
  limit: number
  remaining: number
  atLimit: boolean       // entité gratuite ET plus de slot
  canAdd: boolean
  isFreeEntity: boolean   // pilote l'affichage du compteur
}

export function useDateQuota(): DateQuota {
  const { currentActor, currentActorRow } = useAuth()
  const { participations } = useMyParticipations()
  const actorKind: ActorKind = currentActor?.kind === 'entity' ? 'entity' : 'person'
  const plan = planForActor(currentActor, currentActorRow)
  const isFreeEntity = actorKind === 'entity' && plan === 'free'

  return useMemo(() => {
    const now = new Date()
    const used = countActiveDates(participations, now)
    const canAdd = canAddDate(plan, actorKind, used)
    return {
      used,
      limit: FREE_DATES_QUOTA,
      remaining: Math.max(0, FREE_DATES_QUOTA - used),
      atLimit: isFreeEntity && used >= FREE_DATES_QUOTA,
      canAdd,
      isFreeEntity,
    }
  }, [participations, plan, actorKind, isFreeEntity])
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `pnpm build`
Expected: succès (0 erreur TS).

- [ ] **Step 3 : Commit**

```bash
git add src/hooks/use-date-quota.ts
git commit -m "feat(quota): hook useDateQuota (etat derive du quota)"
```

---

## Task 3 : Composant `DateQuotaModal`

**Files:**
- Create: `src/components/mes-dates/DateQuotaModal.tsx`

> Pas de test RTL (présentational ; RTL ne flush pas en synchrone sur cette stack). Vérif build + visuel.

- [ ] **Step 1 : Écrire le composant**

Créer `src/components/mes-dates/DateQuotaModal.tsx` :

```tsx
import { Link } from 'react-router-dom'
import { Lock, X } from 'lucide-react'
import { FREE_DATES_QUOTA } from '@/lib/date-quota'

/** Mur d'upsell quand une entité gratuite atteint le plafond de dates à venir. */
export function DateQuotaModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="dq-overlay" role="dialog" aria-modal="true" aria-labelledby="dq-title" onClick={onClose}>
      <div className="dq-card" onClick={e => e.stopPropagation()}>
        <button type="button" className="dq-close" aria-label="Fermer" onClick={onClose}><X size={18} strokeWidth={2} /></button>
        <div className="dq-lock"><Lock strokeWidth={1.5} /></div>
        <h2 id="dq-title">Tu suis déjà {FREE_DATES_QUOTA} festivals à venir</h2>
        <p>C'est le maximum en gratuit. Passe Pro pour suivre un <b>nombre illimité</b> de dates — plus le Calendrier, la Communauté et ton Cockpit.</p>
        <Link to="/reglages" className="dq-btn">Passer en Pro — dès 9,99 € HT/mois</Link>
        <button type="button" className="dq-later" onClick={onClose}>Plus tard</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Écrire les styles**

Ajouter à la **fin** de `src/components/mes-dates/` … (le composant n'a pas de CSS dédié : ajouter les règles dans `src/pages/MesDates.css` réutilisé, OU créer `DateQuotaModal.css`). **Choix : créer `src/components/mes-dates/DateQuotaModal.css`** et l'importer.

Créer `src/components/mes-dates/DateQuotaModal.css` :

```css
.dq-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; background: color-mix(in srgb, hsl(var(--background)) 70%, transparent); backdrop-filter: blur(4px); }
.dq-card { position: relative; width: min(420px, 100%); text-align: center; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 18px; padding: 28px 24px; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
.dq-close { position: absolute; top: 12px; right: 12px; background: none; border: none; color: hsl(var(--muted-foreground)); cursor: pointer; padding: 4px; border-radius: 8px; }
.dq-close:hover { color: hsl(var(--foreground)); }
.dq-lock { width: 48px; height: 48px; border-radius: 14px; background: color-mix(in srgb, hsl(var(--primary)) 16%, transparent); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: hsl(var(--primary)); }
.dq-lock svg { width: 22px; height: 22px; }
.dq-card h2 { font-size: 19px; font-weight: 800; color: hsl(var(--foreground)); margin-bottom: 8px; }
.dq-card p { font-size: 14px; color: hsl(var(--muted-foreground)); line-height: 1.5; margin-bottom: 18px; }
.dq-btn { display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; border-radius: 11px; padding: 12px 22px; text-decoration: none; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
.dq-later { display: block; margin: 12px auto 0; background: none; border: none; color: hsl(var(--muted-foreground)); font-size: 13px; cursor: pointer; }
.dq-later:hover { color: hsl(var(--foreground)); }
```

Puis ajouter l'import en tête de `DateQuotaModal.tsx` (sous les imports existants) :
```tsx
import './DateQuotaModal.css'
```

- [ ] **Step 3 : Vérifier la compilation**

Run: `pnpm build`
Expected: succès.

- [ ] **Step 4 : Commit**

```bash
git add src/components/mes-dates/DateQuotaModal.tsx src/components/mes-dates/DateQuotaModal.css
git commit -m "feat(quota): DateQuotaModal (mur d'upsell au plafond)"
```

---

## Task 4 : Enforcement Explorer (`toggleSave`)

**Files:**
- Modify: `src/pages/Explorer.tsx`

Contexte : Explorer a déjà `participations` (via `useMyParticipations`) et `currentActor`. On calcule la décision **localement** (pas de re-fetch). Le bloc d'ajout est dans `toggleSave` (branche `else`, là où il n'y a pas de participation existante).

- [ ] **Step 1 : Imports + plan + état modale**

Dans `src/pages/Explorer.tsx` :

(a) Ajouter aux imports :
```ts
import { planForActor } from '@/lib/navModel'
import { countActiveDates, canAddDate } from '@/lib/date-quota'
import { DateQuotaModal } from '@/components/mes-dates/DateQuotaModal'
```

(b) La ligne `const { profile, currentActor, isAdmin, user } = useAuth()` devient :
```ts
const { profile, currentActor, currentActorRow, isAdmin, user } = useAuth()
```

(c) Ajouter un état modale près des autres `useState` (par ex. sous `const [activeIndex, setActiveIndex] = useState(0)`) :
```ts
const [showQuotaModal, setShowQuotaModal] = useState(false)
```

- [ ] **Step 2 : Guard dans `toggleSave`**

Le `toggleSave` actuel :
```ts
  const toggleSave = useCallback(async (event: EventWithScore) => {
    if (!currentActor || !user) return
    const existing = participations.find(p => p.event_id === event.id)
    if (existing) {
      await removeParticipation(existing.id)
    } else {
      await addParticipation({
        actor_id: currentActor.id,
        acted_by_user_id: user.id,
        event_id: event.id,
        status: 'interesse',
        visibility: 'amis',
      })
    }
    refetchParticipations()
  }, [currentActor, user, participations, refetchParticipations])
```
devient (guard uniquement la branche d'ajout) :
```ts
  const toggleSave = useCallback(async (event: EventWithScore) => {
    if (!currentActor || !user) return
    const existing = participations.find(p => p.event_id === event.id)
    if (existing) {
      await removeParticipation(existing.id)
    } else {
      // Quota dates : entité gratuite plafonnée aux dates à venir actives.
      const plan = planForActor(currentActor, currentActorRow)
      const actorKind = currentActor.kind === 'entity' ? 'entity' : 'person'
      if (!canAddDate(plan, actorKind, countActiveDates(participations, new Date()))) {
        setShowQuotaModal(true)
        return
      }
      await addParticipation({
        actor_id: currentActor.id,
        acted_by_user_id: user.id,
        event_id: event.id,
        status: 'interesse',
        visibility: 'amis',
      })
    }
    refetchParticipations()
  }, [currentActor, currentActorRow, user, participations, refetchParticipations])
```

- [ ] **Step 3 : Rendu de la modale**

Dans le JSX retourné par `ExplorerPage`, juste avant la balise fermante racine `</div>` de `.explorer` (à la toute fin du `return`), ajouter :
```tsx
      {showQuotaModal && <DateQuotaModal onClose={() => setShowQuotaModal(false)} />}
```

- [ ] **Step 4 : Vérifier build + lint**

Run: `pnpm build` (succès) puis `pnpm lint` (0 erreur ; si `react-hooks/exhaustive-deps` se plaint de `currentActorRow`, c'est déjà dans le tableau de deps → OK).

- [ ] **Step 5 : Commit**

```bash
git add src/pages/Explorer.tsx
git commit -m "feat(quota): mur d'upsell sur Reperer dans Explorer (entite gratuite au plafond)"
```

---

## Task 5 : Enforcement page Événement (`handleJoin`)

**Files:**
- Modify: `src/pages/EventPage.tsx`

Contexte : `handleJoin` n'est appelé que pour **rejoindre** (nouvelle date — `onJoin` de `EventDashboard`) ; les changements de statut passent par `onUpdate`. EventPage n'a pas la liste complète → on utilise `useDateQuota()`.

- [ ] **Step 1 : Imports + hook + état modale**

Dans `src/pages/EventPage.tsx` :

(a) Ajouter aux imports :
```ts
import { useDateQuota } from '@/hooks/use-date-quota'
import { DateQuotaModal } from '@/components/mes-dates/DateQuotaModal'
```

(b) Dans le composant, près des autres hooks/états, ajouter :
```ts
const { canAdd } = useDateQuota()
const [showQuotaModal, setShowQuotaModal] = useState(false)
```
(`useState` est déjà importé dans ce fichier.)

- [ ] **Step 2 : Guard dans `handleJoin`**

Le `handleJoin` actuel :
```ts
  const handleJoin = async (status: ParticipationStatus, visibility: ParticipationVisibility) => {
    if (!user || !currentActor || !id) return
    const { data } = await addParticipation({
      actor_id: currentActor.id,
      acted_by_user_id: user.id,
      event_id: id,
      status,
      visibility,
    })
    setParticipation(data)
  }
```
devient :
```ts
  const handleJoin = async (status: ParticipationStatus, visibility: ParticipationVisibility) => {
    if (!user || !currentActor || !id) return
    // Quota dates : bloque l'ajout d'une NOUVELLE date pour une entité gratuite au plafond.
    if (!canAdd) { setShowQuotaModal(true); return }
    const { data } = await addParticipation({
      actor_id: currentActor.id,
      acted_by_user_id: user.id,
      event_id: id,
      status,
      visibility,
    })
    setParticipation(data)
  }
```
(`handleJoin` n'est branché que sur `onJoin` = nouvelle participation ; les changements de statut d'une date déjà suivie passent par `onUpdate` et ne sont donc jamais bloqués.)

- [ ] **Step 3 : Rendu de la modale**

À la fin du JSX de la page (avant la dernière balise fermante racine du `return` principal de `EventPage`), ajouter :
```tsx
      {showQuotaModal && <DateQuotaModal onClose={() => setShowQuotaModal(false)} />}
```

- [ ] **Step 4 : Vérifier build + lint**

Run: `pnpm build` (succès) puis `pnpm lint` (0 erreur).

- [ ] **Step 5 : Commit**

```bash
git add src/pages/EventPage.tsx
git commit -m "feat(quota): mur d'upsell sur rejoindre dans la page Evenement"
```

---

## Task 6 : Compteur quota sur « Mes dates »

**Files:**
- Modify: `src/pages/MesDates.tsx`
- Modify: `src/pages/MesDates.css`

- [ ] **Step 1 : Afficher le compteur (entité gratuite)**

Dans `src/pages/MesDates.tsx` :

(a) Ajouter l'import :
```ts
import { useDateQuota } from '@/hooks/use-date-quota'
```

(b) Dans le composant, après `const actorKind = ...` :
```ts
const quota = useDateQuota()
```

(c) Dans `.md-head`, après le bloc titre+sous-titre (le `<div>` contenant `<h1>`/`<p>`), ajouter la pastille compteur :
```tsx
        {quota.isFreeEntity && (
          <Link to="/reglages" className={'md-quota' + (quota.atLimit ? ' at-limit' : '')}>
            <b>{quota.used} / {quota.limit}</b> dates à venir · Pro = illimité
          </Link>
        )}
```
(`Link` est déjà importé dans ce fichier.)

- [ ] **Step 2 : Style du compteur**

Ajouter à la fin de `src/pages/MesDates.css` :
```css
.md-quota { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; white-space: nowrap; font-size: 11.5px; font-weight: 600; padding: 6px 12px; border-radius: 99px; text-decoration: none; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); color: hsl(var(--muted-foreground)); }
.md-quota b { color: hsl(var(--primary)); font-weight: 800; }
.md-quota.at-limit { border-color: color-mix(in srgb, var(--status-apayer) 50%, hsl(var(--border))); }
.md-quota.at-limit b { color: var(--status-apayer); }
```

- [ ] **Step 3 : Vérifier build + lint**

Run: `pnpm build` (succès) puis `pnpm lint` (0 erreur).

- [ ] **Step 4 : Commit**

```bash
git add src/pages/MesDates.tsx src/pages/MesDates.css
git commit -m "feat(quota): compteur X/5 dates a venir sur Mes dates (entite gratuite)"
```

---

## Task 7 : Vérification finale + version + push

**Files:**
- Modify: `package.json` (`version`, source de `APP_VERSION`)

- [ ] **Step 1 : Suite complète**

Run: `pnpm build; if ($?) { pnpm lint }; if ($?) { pnpm vitest run }`
Expected: build OK, lint 0 erreur, tous les tests PASS (les tests `date-quota` inclus).

- [ ] **Step 2 : Vérification manuelle (dev server)**

Run: `pnpm dev`, puis via le **switch admin Réel/Pro/Gratuit** :
- **Entité gratuite** avec 4 dates à venir → Repérer une 5e (Explorer) OK, compteur « 5/5 » en `at-limit`.
- 6e tentative depuis **Explorer** (Repérer) ET depuis la **page Événement** (rejoindre) → `DateQuotaModal` s'ouvre, **rien n'est ajouté**.
- **Retirer** une date → compteur repasse « 4/5 », ajout de nouveau possible.
- Changer le **statut** d'une date déjà suivie (page Événement, dossier→accepté) → jamais bloqué.
- **Entité Pro** et **festivalier (personne)** → aucun mur, **aucun compteur**.
- Jour **et** nuit : modale + compteur lisibles, contrastes OK.

Corriger tout écart avant de continuer.

- [ ] **Step 3 : Bump version**

Incrémenter `version` (patch) dans `package.json`.

- [ ] **Step 4 : Commit + push**

```bash
git add package.json
git commit -m "chore(quota): bump version — quota dates gratuit livre"
git push
```
(Branche `feat/da-nuit-festival-socle`.)

---

## Self-Review (rempli par l'auteur du plan)

**Couverture spec :**
- Sémantique (à-venir actives, hors refuse, live) → Task 1 (`countActiveDates`) ✓
- `canAddDate` (pro/person/free<quota) + `FREE_DATES_QUOTA=5` → Task 1 ✓
- Hook source unique → Task 2 ✓
- Enforcement aux 2 points d'ajout, modale au clic (bouton non désactivé), retrait jamais gaté, changement de statut non gaté → Tasks 4 & 5 ✓
- Modale d'upsell DA → Task 3 ✓
- Compteur « X / 5 dates à venir » entité gratuite seulement → Task 6 ✓
- Périmètre (person + Pro illimités, pas de compteur) → `canAddDate` + `isFreeEntity` (Tasks 1, 2, 6) ✓
- Client-side V1 / durcissement serveur = follow-up → hors-périmètre assumé (spec) ✓
- Tests TDD + vérif jour/nuit → Tasks 1, 7 ✓

**Placeholders :** aucun — code complet à chaque étape.

**Cohérence des types :** `countActiveDates(parts, now)`, `canAddDate(plan, actorKind, used)`, `FREE_DATES_QUOTA`, `DateQuota`, `useDateQuota()`, `DateQuotaModal({ onClose })` — signatures identiques entre définition (Tasks 1-3) et consommation (Tasks 4-6). `Plan` importé de `navModel`, `ActorKind` de `explorer`.
```
