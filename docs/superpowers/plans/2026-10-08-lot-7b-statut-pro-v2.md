# Lot 7b — Le statut Pro dans la V2 — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** la V2 lit le statut Pro de l'enseigne active et montre, en gratuit, les états verrouillés des maquettes : horizon de 6 mois, bilans floutés, notes détaillées floutées, badge Certifié à obtenir.

**Architecture:** une règle pure (`lib/plan.ts`, testée) et un hook (`lib/usePlan.ts`) lu par chaque écran ; trois briques d'interface (`ProBadge`, `ProBubble`, `ProVeil`) ; une page d'attente `/pro`. Aucune migration, aucune requête nouvelle : les enseignes sont déjà chargées avec toutes leurs colonnes par `useAuth()`.

**Tech Stack:** React 19, React Router 7, supabase-js 2, Vitest, lucide-react, CSS en trois couches.

**Spec:** `docs/superpowers/specs/2026-10-08-lot-7b-statut-pro-v2-design.md` — à lire avant toute tâche.

## Global Constraints

- Tout dans `apps/web-v2/` ; rien de la V1 n'est importé.
- `pnpm lint` (dans `apps/web-v2`) avant chaque commit : ESLint strict zéro avertissement, 400 lignes max, pas de `any` ni de `!`, pas de style inline sauf variables CSS `'--nom'`, stylelint (couche 3 = jetons de la couche 2 seulement), prettier, en-tête `QUOI / POURQUOI / (ATTENTION)` et `README.md` par dossier.
- Tests : `pnpm exec vitest run <fichier>` dans `apps/web-v2` (`pnpm --filter … test -- x` lance toute la suite).
- **Pro = `entity.plan === 'pro'` ou `comped_pro_until` dans le futur.** Un compte personnel est gratuit. Certifié = Pro ou `verified === true`.
- **Horizon = `monthsAhead(today, 6)`** (lib/dates.ts) : en gratuit, on agit sur une date dont le **début** est strictement avant.
- **Le geste est refusé, jamais l'affichage caché.** Une participation existante au-delà de l'horizon reste modifiable et retirable.
- Toutes les invitations mènent à `/pro`.
- Le réglage `?plan=free` n'existe que si `import.meta.env.DEV`.
- Le flou (`filter: blur()`) ne s'applique qu'à des blocs de taille modeste ; le contenu flouté est `aria-hidden` et `inert`.
- Maquettes (fichier Figma `9CmmBD3t5rAk4tD583cdN3`) : `2085:2` Mes bilans gratuit, `2086:2` Points de contact (Explorer `2086:3`, Calendrier `2086:31`, Vitrine `2086:75`, Notes détaillées `2163:2`).
- Commits Conventional Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucune écriture en base pour tester.

## Review Focus

1. **Une date le 31 mars quand on est le 8 octobre** (dernier jour du sixième mois) est permise, **le 1er avril** refusée ; **en décembre**, l'horizon passe l'année (1er juin). Tests dans `lib/plan.test.ts` (tâche 1).
2. **Un gratuit qui a déjà une date posée dans 9 mois** (venue de la V1) : la fiche le laisse changer ou retirer son statut, l'Explorer laisse son étoile retirable. `canChangeStatus` (tâche 1) le teste ; les écrans l'utilisent (tâche 3).
3. **Changer d'enseigne** entre une enseigne Pro et une gratuite : chaque écran suit l'acteur actif, sans recharger. `usePlan` dépend de `actor.id` et des enseignes (tâche 1).
4. **Pro offert expiré hier** : gratuit. Test dans `lib/plan.test.ts` (tâche 1).
5. **`?plan=free` en production** : sans effet. `devOverride` rend `null` hors DEV (tâche 1, test).

---

### Task 1 : `lib/plan.ts` et `lib/usePlan.ts`

**Files:**
- Create: `apps/web-v2/src/lib/plan.ts`, `apps/web-v2/src/lib/plan.test.ts`, `apps/web-v2/src/lib/usePlan.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PlanFields { plan: string | null; comped_pro_until: string | null; verified: boolean | null }
  export function isPro(entity: PlanFields | null, now: Date): boolean
  export function isCertified(entity: PlanFields | null, now: Date): boolean
  export function proHorizon(today: Date): Date
  export function canActOn(startDate: Date, pro: boolean, today: Date): boolean
  /** Changer le statut d'une date : toujours permis si une participation existe déjà. */
  export function canChangeStatus(startDate: Date, hasParticipation: boolean, pro: boolean, today: Date): boolean
  export function monthsBeyond(startDate: Date, today: Date): number  // « dans 9 mois »
  export function devOverride(search: string, isDev: boolean): 'free' | null
  // usePlan.ts
  export function usePlan(): { pro: boolean; certified: boolean }
  ```

- [ ] **Step 1 : le test qui échoue** — `lib/plan.test.ts` :

```ts
/**
 * QUOI     — tests de lib/plan.ts : statut Pro, badge Certifié, horizon des 6 mois.
 * POURQUOI — toute la règle du gratuit se vérifie ici ; les écrans ne font que la lire.
 */
import { describe, expect, it } from 'vitest'
import {
  canActOn,
  canChangeStatus,
  devOverride,
  isCertified,
  isPro,
  monthsBeyond,
  proHorizon,
} from './plan'

const now = new Date(2026, 9, 8, 12) // 8 octobre 2026
const entity = (fields: Partial<{ plan: string; comped_pro_until: string; verified: boolean }>) => ({
  plan: fields.plan ?? 'free',
  comped_pro_until: fields.comped_pro_until ?? null,
  verified: fields.verified ?? false,
})

describe('isPro', () => {
  it('une enseigne qui paie est Pro', () => {
    expect(isPro(entity({ plan: 'pro' }), now)).toBe(true)
  })
  it('un Pro offert qui court encore est Pro', () => {
    expect(isPro(entity({ comped_pro_until: '2026-11-01T00:00:00Z' }), now)).toBe(true)
  })
  it('un Pro offert expiré hier ne l’est plus', () => {
    expect(isPro(entity({ comped_pro_until: '2026-10-07T00:00:00Z' }), now)).toBe(false)
  })
  it('un compte personnel est gratuit', () => {
    expect(isPro(null, now)).toBe(false)
  })
})

describe('isCertified', () => {
  it('Pro ou certifié à la main', () => {
    expect(isCertified(entity({ plan: 'pro' }), now)).toBe(true)
    expect(isCertified(entity({ verified: true }), now)).toBe(true)
    expect(isCertified(entity({}), now)).toBe(false)
  })
})

describe('proHorizon', () => {
  it('le premier jour du septième mois', () => {
    expect(proHorizon(now)).toEqual(new Date(2027, 3, 1))
  })
  it('passe l’année en décembre', () => {
    expect(proHorizon(new Date(2026, 11, 20))).toEqual(new Date(2027, 5, 1))
  })
})

describe('canActOn', () => {
  it('le dernier jour du sixième mois est permis, le premier du septième refusé', () => {
    expect(canActOn(new Date(2027, 2, 31), false, now)).toBe(true)
    expect(canActOn(new Date(2027, 3, 1), false, now)).toBe(false)
  })
  it('le Pro agit sur toute l’année', () => {
    expect(canActOn(new Date(2027, 8, 1), true, now)).toBe(true)
  })
})

describe('canChangeStatus', () => {
  it('une date déjà posée au-delà de l’horizon reste modifiable', () => {
    expect(canChangeStatus(new Date(2027, 6, 1), true, false, now)).toBe(true)
  })
  it('une nouvelle date au-delà de l’horizon est refusée en gratuit', () => {
    expect(canChangeStatus(new Date(2027, 6, 1), false, false, now)).toBe(false)
  })
})

describe('monthsBeyond', () => {
  it('compte les mois jusqu’au début de la date', () => {
    expect(monthsBeyond(new Date(2027, 6, 4), now)).toBe(9)
  })
})

describe('devOverride', () => {
  it('?plan=free force le gratuit en développement', () => {
    expect(devOverride('?plan=free', true)).toBe('free')
  })
  it('sans effet en production', () => {
    expect(devOverride('?plan=free', false)).toBeNull()
  })
  it('sans paramètre, rien', () => {
    expect(devOverride('', true)).toBeNull()
  })
})
```

- [ ] **Step 2 :** `pnpm exec vitest run src/lib/plan.test.ts` → FAIL (`Failed to resolve import "./plan"`).

- [ ] **Step 3 : `lib/plan.ts`**

```ts
/**
 * QUOI     — le statut Pro d'une enseigne, son badge Certifié, et l'horizon des 6 mois du gratuit.
 * POURQUOI — une seule règle, lue par tous les écrans (Dev.md, 07/10/2026) : le Pro vit sur
 *            l'enseigne ; en gratuit, on agit sur les 6 prochains mois, on VOIT tout.
 * ATTENTION — la limite ne vit que dans la V2 (décision du 08/10/2026) : la V1 la laisse ouverte.
 *            Une date déjà posée au-delà reste modifiable : on ne bloque personne sur ses dates.
 */
import { monthsAhead } from './dates'

export interface PlanFields {
  plan: string | null
  comped_pro_until: string | null
  verified: boolean | null
}

export function isPro(entity: PlanFields | null, now: Date): boolean {
  if (!entity) return false
  if (entity.plan === 'pro') return true
  return entity.comped_pro_until !== null && new Date(entity.comped_pro_until) > now
}

export function isCertified(entity: PlanFields | null, now: Date): boolean {
  return isPro(entity, now) || entity?.verified === true
}

/** Le premier jour du septième mois : en gratuit, une date doit commencer avant. */
export function proHorizon(today: Date): Date {
  return monthsAhead(today, 6)
}

export function canActOn(startDate: Date, pro: boolean, today: Date): boolean {
  return pro || startDate < proHorizon(today)
}

export function canChangeStatus(
  startDate: Date,
  hasParticipation: boolean,
  pro: boolean,
  today: Date,
): boolean {
  return hasParticipation || canActOn(startDate, pro, today)
}

/** « dans 9 mois » : les mois de calendrier entre aujourd'hui et le début de la date. */
export function monthsBeyond(startDate: Date, today: Date): number {
  return (startDate.getFullYear() - today.getFullYear()) * 12 + startDate.getMonth() - today.getMonth()
}

/** `?plan=free` force le gratuit pour tester — en développement seulement. */
export function devOverride(search: string, isDev: boolean): 'free' | null {
  if (!isDev) return null
  return new URLSearchParams(search).get('plan') === 'free' ? 'free' : null
}
```

- [ ] **Step 4 :** relancer → PASS, 15 tests.

- [ ] **Step 5 : `lib/usePlan.ts`**

```ts
/**
 * QUOI     — le statut de l'acteur actif : Pro, Certifié.
 * POURQUOI — chaque écran le lit d'ici ; rien n'est rechargé, les enseignes viennent de useAuth.
 * ATTENTION — `?plan=free` force le gratuit en développement, et seulement là (devOverride) : le
 *            choix tient pour l'onglet (sessionStorage), pour qu'on puisse naviguer.
 */
import { useMemo } from 'react'
import { useAuth } from './auth'
import { devOverride, isCertified, isPro } from './plan'

const FORCE_KEY = 'flwsh-v2-plan'

function forcedFree(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    if (devOverride(window.location.search, true) === 'free') sessionStorage.setItem(FORCE_KEY, 'free')
    return sessionStorage.getItem(FORCE_KEY) === 'free'
  } catch {
    return devOverride(window.location.search, true) === 'free'
  }
}

export function usePlan(): { pro: boolean; certified: boolean } {
  const { actor, entities } = useAuth()
  return useMemo(() => {
    const entity = entities.find((row) => row.actor_id === actor?.id) ?? null
    if (forcedFree()) return { pro: false, certified: entity?.verified === true }
    const now = new Date()
    return { pro: isPro(entity, now), certified: isCertified(entity, now) }
  }, [actor?.id, entities])
}
```

Si `react-hooks/preserve-manual-memoization` refuse `actor?.id` en dépendance (`.claude/rules/dev.md`, piège 3), sortir `const actorId = actor?.id` avant le `useMemo`.

- [ ] **Step 6 :** `pnpm lint` → PASS. Commit : `feat(v2): le statut Pro de l'enseigne active et l'horizon des 6 mois`.

---

### Task 2 : les briques Pro et la page `/pro`

**Files:**
- Create: `apps/web-v2/src/components/ui/ProBadge.tsx`, `ProBubble.tsx`, `ProVeil.tsx`
- Create: `apps/web-v2/src/styles/3-components/pro.css` (importé dans `styles/index.css` après `segmented.css`), jetons dans `2-semantic.css` (bloc « LE PRO »)
- Create: `apps/web-v2/src/pages/ProPage.tsx`
- Modify: `apps/web-v2/src/App.tsx` (route `/pro`), `components/ui/README.md`, `pages/README.md` s'il existe
- Modify: `features/event/EventReviews.tsx` — la pastille « Pro » existante (`reviews__pro`) devient `<ProBadge />`, et la règle CSS `.reviews__pro` morte est supprimée.

**Interfaces:**
- Produces:
  ```tsx
  export function ProBadge(): JSX.Element                       // la pastille noire « Pro »
  export function ProBubble(props: { title: string; text: string; onClose?: () => void }): JSX.Element
  // carte blanche bordée : ProBadge, titre, texte, lien « Découvrir le Pro → » vers /pro
  export function ProVeil(props: { children: ReactNode; invitation: ReactNode }): JSX.Element
  // le contenu flouté (aria-hidden, inert) et l'invitation posée par-dessus, au centre
  ```

- [ ] **Step 1 :** relever `2086:3` (bulle Explorer) et `2085:2` (carte d'invitation) avec `get_design_context` (skill `figma:figma-design-to-code`), puis écrire les trois composants et `pro.css`. `ProBubble` : `role="dialog"`, `aria-label={title}`, fermeture par Échap et par `onClose`. Le lien « Découvrir le Pro » passe par `useTransitionNavigate()` vers `/pro`. `ProVeil` :

```tsx
export function ProVeil({ children, invitation }: { children: ReactNode; invitation: ReactNode }) {
  return (
    <div className="pro-veil">
      <div className="pro-veil__content" aria-hidden="true" inert>
        {children}
      </div>
      <div className="pro-veil__invitation">{invitation}</div>
    </div>
  )
}
```

  (`inert` est un attribut booléen de React 19.)

- [ ] **Step 2 : `ProPage`** — `/pro` : `useDeclarePageChrome({ poster: null, lead: null, back: '/' })` ; ProBadge, titre « L'offre Pro arrive dans la V2. », texte « En attendant, ton abonnement se gère dans la version actuelle. », lien `<a href="/abonnement">Voir l'abonnement</a>` (hors du routeur `/v2` : un `<a>`, pas un `Link`). Route dans `App.tsx` au-dessus de `/:slug`, même habillage `ProtectedRoute` + `AppShell`.
- [ ] **Step 3 :** `pnpm lint && pnpm build` → PASS. Commit : `feat(v2): les briques du Pro — pastille, bulle, voile — et la page d'attente /pro`.

---

### Task 3 : l'horizon des 6 mois

**Files:**
- Modify: `features/explorer/ExploreCard.tsx`, `EventRail.tsx`, `SearchResults.tsx` (ou le parent qui passe `onMark`)
- Modify: `features/event/EventStatus.tsx`, `features/event/EventPage.tsx`
- Modify: `features/calendar/CalendarPage.tsx`, création `features/calendar/ProMonth.tsx`
- Modify: `features/event-create/CreateEvent.tsx`

**Interfaces:**
- Consumes: `usePlan`, `canActOn`, `canChangeStatus`, `monthsBeyond`, `proHorizon` (tâche 1) ; `ProBubble` (tâche 2).

- [ ] **Step 1 : Explorer.** `ExploreCard` reçoit `locked: boolean` (calculé par l'écran parent : `!canChangeStatus(event.startDate, event.myStatus !== null, pro, new Date())`). Si `locked`, le clic sur l'étoile ouvre une `ProBubble` posée à côté de la carte (état local `open`), titre « Ce festival est dans {monthsBeyond} mois », texte « En gratuit, tu planifies tes 6 prochains mois. Le Pro t'ouvre toute ton année. » ; `onMark` n'est pas appelé. L'étoile garde son aspect.
- [ ] **Step 2 : Fiche.** `EventStatus` reçoit `locked: boolean` et `monthsAway: number` (calculés dans `EventPage` avec `canChangeStatus(startDate, status !== null, pro, new Date())`). Si `locked`, `onChange` ouvre la même bulle sous le contrôle au lieu d'appeler `setStatus`. Une date déjà posée n'est jamais `locked`.
- [ ] **Step 3 : Calendrier.** En gratuit, `CalendarPage` n'affiche que les mois dont le premier jour est avant `proHorizon(today)`, puis une colonne `ProMonth` : le nom du mois suivant en serif clair, « Dans {n} mois », et la carte de la maquette `2086:31` (ProBadge, « {Mois} et au-delà », « Pose les dates sur toute l'année et ne rate plus une candidature. », « Découvrir le Pro → »). `MonthNav` reçoit la même liste réduite. En Pro, rien ne change.
- [ ] **Step 4 : Ajouter une date.** Si la date de début saisie est au-delà de l'horizon et que l'enseigne est gratuite, l'étape où l'on choisit les dates affiche, sous le choix, la note « Cette date est dans {n} mois : elle entrera dans l'annuaire, pas dans ton calendrier. Le Pro t'ouvre toute ton année. » avec le lien vers `/pro` ; à l'enregistrement, l'insertion dans `participations` est sautée.
- [ ] **Step 5 :** `pnpm lint && pnpm build` → PASS ; `pnpm dev`, `?plan=free`, vérifier les quatre gestes contre `2086:3` et `2086:31`. Commit : `feat(v2): en gratuit, on agit sur ses 6 prochains mois`.

---

### Task 4 : les bilans en gratuit

**Files:**
- Modify: `features/reports/ReportsPage.tsx`, `features/reports/ReportPage.tsx`
- Create: `features/reports/ReportsInvitation.tsx`, `features/reports/sampleReports.ts`
- Modify: `features/dashboard/Dashboard.tsx`, `features/dashboard/ReportsSection.tsx`
- Modify: `features/event/EventPage.tsx` (bloc « Mon bilan »)

- [ ] **Step 1 : `/bilans` en gratuit.** `ReportsPage` lit `usePlan()`. Gratuit : le contenu (carte de l'année, mois, dates) est rendu dans `<ProVeil invitation={<ReportsInvitation />}>`. Sans aucune date, le contenu flouté est l'exemple fixe de `sampleReports.ts` (trois `ReportDate` aux noms de la maquette, l'année en cours). `ReportsInvitation` reprend `2085:2` : ProBadge, « Sache ce que chaque festival t'a vraiment apporté », le texte, les six avantages cochés, « Découvrir le Pro » (vers `/pro`) et « Pas maintenant » (vers `/`).
- [ ] **Step 2 : `/bilans/:eventId` en gratuit** → `<Navigate to="/bilans" replace />`, avant tout chargement (le hook `useReport` reçoit `undefined` comme `eventId` pour ne rien lire).
- [ ] **Step 3 : tableau de bord.** Gratuit : `ReportsSection` est rendu dans un `ProVeil` dont l'invitation est une pastille cliquable (ProBadge + « Tes bilans avec le Pro → ») vers `/bilans` ; l'`ActionBanner` du bilan à remplir n'est pas rendue.
- [ ] **Step 4 : fiche, « Mon bilan ».** Gratuit : même voile que le tableau de bord ; en Pro, le bloc gagne le lien « Ouvrir le bilan → » vers `/bilans/:id` (le bilan a désormais son écran).
- [ ] **Step 5 :** `pnpm lint && pnpm build` → PASS ; `?plan=free` contre `2085:2`. Commit : `feat(v2): en gratuit, les bilans se devinent sous un voile`.

---

### Task 5 : notes détaillées et badge Certifié

**Files:**
- Modify: `features/event/EventReviews.tsx`
- Modify: `features/vitrine/VitrineHead.tsx`, `features/vitrine/useVitrine.ts`, `styles/3-components/vitrine.css`

- [ ] **Step 1 : notes détaillées.** `EventReviews` lit `usePlan()`. Gratuit : la colonne `reviews__detail` (sauf sa légende « Le détail · Pro ») passe dans un `ProVeil` dont l'invitation est la pastille « Voir le détail avec le Pro → » vers `/pro` (`2163:2`). La note globale, les étoiles et les avis restent lisibles. En-tête du fichier : retirer la phrase « il reste visible à tous tant que l'offre n'est pas lue par la V2 (lot 7) ».
- [ ] **Step 2 : badge Certifié.** `useVitrine` garde son calcul `certified` (il vaut pour les visiteurs) et le remplace par `isCertified(entity, new Date())` de `lib/plan.ts` (même règle, une seule source ; il doit aussi lire `comped_pro_until`). Dans `VitrineHead`, si `isOwner && !vitrine.certified` : l'emplacement en pointillés de `2086:75` (icône, « Obtenir le badge Certifié ») vers `/pro`. Les visiteurs ne voient rien.
- [ ] **Step 3 :** `pnpm lint && pnpm build` → PASS ; vérifier contre `2163:2` et `2086:75`. Commit : `feat(v2): notes détaillées et badge Certifié — les deux derniers points de contact du Pro`.

---

### Task 6 : déployer et cocher

- [ ] Relecture finale de la branche (agent neuf), corrections, puis déploiement de la V2 selon `.claude/rules/deploiement.md` (version mineure suivante dans `apps/web-v2/package.json`).
- [ ] Cocher « 7b ☑ » dans le plan directeur et le carnet des maquettes ; commit `docs(v2): lot 7b livré — le statut Pro` ; push.
- [ ] Demander à Uriel de regarder les états gratuits sur une enseigne gratuite (ou en dev avec `?plan=free`).
