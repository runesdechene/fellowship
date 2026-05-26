# Refonte du cycle de vie de participation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unifier le vocabulaire de statut de participation (Repéré → Dossier envoyé → Accepté → À payer → Inscrit, + Refusé/Terminé) dans une fonction pure `participationChip` consommée par l'Explorer et la page Événement, avec un jeu de couleurs partagé dual-thème.

**Architecture :** `participationChip` (fonction pure, `src/lib/explorer.ts`) reste la source de vérité unique ; on étend sa signature avec un contexte `{ boothCost, isPast }`, on ajoute les états `dossier`/`accepte`/`apayer`/`refuse`/`termine`, on traite `inscrit` comme alias legacy de `confirme`, et on supprime `en_cours_paiement`. Les couleurs vivent en variables CSS `--status-*` (nuit + jour). La donnée gagne la valeur enum `refuse` (migration non destructive).

**Tech Stack :** React 19, TypeScript, Tailwind v4 (CSS-first dans `index.css`), Vitest, Supabase (Postgres enum), lucide-react.

**Hors périmètre :** restyle DA du calendrier (`CalendarMonth.tsx`, `Calendar.css`) — spec/plan #2 séparé.

---

## File Structure

- **Create** `supabase/migrations/20260526120000_participation_lifecycle.sql` — ajoute `refuse` à l'enum + nettoie `en_cours_paiement`.
- **Modify** `src/lib/explorer.ts` — `StatusChip`/`StatusVariant`/`ChipContext` + `participationChip` réécrit.
- **Modify** `src/lib/explorer.test.ts` — bloc `participationChip` réécrit (tous les cas).
- **Modify** `src/components/explorer/EventDeck.tsx` — passe `ctx` à `participationChip`.
- **Modify** `src/pages/Explorer.tsx` — passe `ctx` à `participationChip`.
- **Modify** `src/index.css` — variables `--status-*` (nuit `:root` + jour `.light`).
- **Modify** `src/pages/Explorer.css` — `.card-status.*` (aplat sur affiche) + `.eh-status.*` (translucide) recâblés sur les nouvelles variantes.
- **Modify** `src/components/events/EventHero.tsx` — un seul chip dérivé via `participationChip` (nouveau prop `isExposant`).
- **Modify** `src/pages/EventPage.css` — classes `.event-badge-status.*` par variante.
- **Modify** `src/pages/EventPage.tsx` — passe `isExposant` à `<EventHero>`.
- **Modify** `src/components/events/EventDashboard.tsx` — steppers (Repéré/Dossier envoyé/Accepté + Refusé), paiement 2 états.
- **Modify** `src/components/events/EventDashboardMobile.tsx` — badge via `participationChip`, suppr. `en_cours_paiement`.

---

## Task 1: Migration DB — enum `refuse` + nettoyage paiement

> **⚠️ Action sortante :** cette migration modifie le projet Supabase. **Confirmer avec Uriel avant `db push`.** Ajouter `refuse` à l'enum et retomber `en_cours_paiement → a_payer` sont non destructifs (compatibles avec l'existant).

**Files:**
- Create: `supabase/migrations/20260526120000_participation_lifecycle.sql`

- [ ] **Step 1: Créer le fichier de migration**

```sql
-- Participation lifecycle refonte :
-- 1) Nouvelle valeur d'enum « refuse » (dossier refusé).
-- 2) Le paiement n'a plus que deux états : a_payer / paye. On retombe en_cours_paiement -> a_payer.
-- Note : ADD VALUE ne peut pas être utilisé dans la même transaction que sa première utilisation,
-- mais l'UPDATE ci-dessous ne référence PAS 'refuse' (payment_status est une colonne texte libre),
-- donc les deux instructions cohabitent sans souci.

ALTER TYPE participation_status ADD VALUE IF NOT EXISTS 'refuse';

UPDATE participations
SET payment_status = 'a_payer'
WHERE payment_status = 'en_cours_paiement';
```

- [ ] **Step 2: Appliquer la migration (après accord)**

Run (Windows, chemin binaire direct — cf. mémoire `reference_supabase_cli`) :
`supabase db push`
Expected: migration `20260526120000_participation_lifecycle` appliquée, aucune erreur.

- [ ] **Step 3: Régénérer les types TypeScript**

Run: `supabase gen types typescript --linked > src/types/supabase.ts`
Expected: `participation_status` inclut désormais `"refuse"` (vérifier le diff sur `src/types/supabase.ts`, enum ligne ~905/1055).

- [ ] **Step 4: Vérifier la compilation**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260526120000_participation_lifecycle.sql src/types/supabase.ts
git commit -m "feat(participation): add 'refuse' enum value + collapse payment to a_payer/paye"
```

---

## Task 2: `participationChip` réécrit (TDD)

**Files:**
- Modify: `src/lib/explorer.test.ts` (bloc `describe('participationChip', ...)`)
- Modify: `src/lib/explorer.ts:94-117`

- [ ] **Step 1: Réécrire le bloc de tests `participationChip`**

Remplacer **tout** le `describe('participationChip', () => { ... })` (lignes 163-186) par :

```ts
describe('participationChip', () => {
  it('null si pas de participation', () => {
    expect(participationChip(null, null, 'person')).toBeNull()
    expect(participationChip(undefined, null, 'entity')).toBeNull()
  })

  it('repéré (interesse) pour les deux acteurs → variant repere', () => {
    expect(participationChip('interesse', null, 'person')?.variant).toBe('repere')
    expect(participationChip('interesse', null, 'entity')?.variant).toBe('repere')
    expect(participationChip('interesse', null, 'entity')?.label).toContain('Repéré')
  })

  it('personne : inscrit/confirme → J’y vais (variant going)', () => {
    expect(participationChip('inscrit', null, 'person')?.label).toContain('vais')
    expect(participationChip('inscrit', null, 'person')?.variant).toBe('going')
    expect(participationChip('confirme', null, 'person')?.variant).toBe('going')
  })

  it('exposant : en_cours → Dossier envoyé', () => {
    const c = participationChip('en_cours', null, 'entity')
    expect(c?.variant).toBe('dossier')
    expect(c?.label).toContain('Dossier')
  })

  it('exposant : confirme + paiement non renseigné + payant → Accepté', () => {
    const c = participationChip('confirme', null, 'entity', { boothCost: 120 })
    expect(c?.variant).toBe('accepte')
    expect(c?.label).toContain('Accepté')
  })

  it('exposant : confirme + a_payer + payant → À payer', () => {
    const c = participationChip('confirme', 'a_payer', 'entity', { boothCost: 120 })
    expect(c?.variant).toBe('apayer')
    expect(c?.label).toContain('À payer')
  })

  it('exposant : confirme + paye → Inscrit', () => {
    const c = participationChip('confirme', 'paye', 'entity', { boothCost: 120 })
    expect(c?.variant).toBe('inscrit')
    expect(c?.label).toContain('Inscrit')
  })

  it('exposant : event gratuit (booth_cost 0/null) → Inscrit direct', () => {
    expect(participationChip('confirme', 'a_payer', 'entity', { boothCost: 0 })?.variant).toBe('inscrit')
    expect(participationChip('confirme', null, 'entity', { boothCost: null })?.variant).toBe('inscrit')
  })

  it('exposant : inscrit legacy traité comme confirme (reflète le paiement)', () => {
    expect(participationChip('inscrit', 'paye', 'entity', { boothCost: 120 })?.variant).toBe('inscrit')
    expect(participationChip('inscrit', 'a_payer', 'entity', { boothCost: 120 })?.variant).toBe('apayer')
  })

  it('refuse → Refusé', () => {
    const c = participationChip('refuse', null, 'entity')
    expect(c?.variant).toBe('refuse')
    expect(c?.label).toContain('Refusé')
  })

  it('isPast override → Terminé (quel que soit le statut)', () => {
    expect(participationChip('confirme', 'paye', 'entity', { isPast: true })?.variant).toBe('termine')
    expect(participationChip('interesse', null, 'person', { isPast: true })?.variant).toBe('termine')
    expect(participationChip('refuse', null, 'entity', { isPast: true })?.variant).toBe('termine')
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run src/lib/explorer.test.ts -t participationChip`
Expected: FAIL — variantes `dossier`/`accepte`/`apayer`/`termine` inexistantes, libellés divergents.

- [ ] **Step 3: Réécrire `participationChip` (+ types)**

Dans `src/lib/explorer.ts`, remplacer le bloc `export interface StatusChip { ... }` + `export function participationChip(...) { ... }` (lignes 95-117) par :

```ts
export type StatusVariant =
  | 'repere' | 'dossier' | 'accepte' | 'apayer' | 'inscrit'
  | 'refuse' | 'termine' | 'going'

export interface StatusChip { label: string; variant: StatusVariant }

export interface ChipContext {
  /** event.booth_cost — un coût 0/null = gratuit (pas d'étape paiement). */
  boothCost?: number | null
  /** end_date < now — override « Terminé », prioritaire sur tout le reste. */
  isPast?: boolean
}

/**
 * Pastille de statut de participation, vocabulaire unifié (Explorer / Événement / Calendrier).
 * Exposant : Repéré → Dossier envoyé → Accepté → À payer → Inscrit (+ Refusé). Personne : Repéré / J'y vais.
 * « Inscrit » = confirme/inscrit + payé (ou gratuit). « Accepté » = confirme avant paiement.
 */
export function participationChip(
  status: string | null | undefined,
  payment: string | null | undefined,
  kind: ActorKind,
  ctx?: ChipContext,
): StatusChip | null {
  if (!status) return null
  if (ctx?.isPast) return { label: '✓ Terminé', variant: 'termine' }
  if (status === 'interesse') return { label: '★ Repéré', variant: 'repere' }
  if (status === 'refuse') return { label: '✕ Refusé', variant: 'refuse' }
  if (kind === 'person') return { label: '✓ J’y vais', variant: 'going' }

  // Exposant
  if (status === 'en_cours') return { label: '📨 Dossier envoyé', variant: 'dossier' }

  // Branche « accepté » : confirme (= Accepté) ou inscrit (legacy)
  const isFree = ctx?.boothCost == null || ctx.boothCost <= 0
  if (isFree || payment === 'paye') return { label: '✓ Inscrit', variant: 'inscrit' }
  if (payment === 'a_payer') return { label: '€ À payer', variant: 'apayer' }
  return { label: '✦ Accepté', variant: 'accepte' }
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run src/lib/explorer.test.ts -t participationChip`
Expected: PASS (tous les `it`).

- [ ] **Step 5: Mettre à jour le site d'appel `EventDeck.tsx`**

Dans `src/components/explorer/EventDeck.tsx:69`, remplacer :

```tsx
          const statusChip = participationChip(part?.status, part?.payment_status, actorKind)
```

par :

```tsx
          const statusChip = participationChip(part?.status, part?.payment_status, actorKind, {
            boothCost: ev.booth_cost,
            isPast: new Date(ev.end_date) < now,
          })
```

- [ ] **Step 6: Mettre à jour le site d'appel `Explorer.tsx`**

Dans `src/pages/Explorer.tsx:245`, remplacer :

```tsx
  const activeChip = participationChip(activePart?.status, activePart?.payment_status, actorKind)
```

par :

```tsx
  const activeChip = currentEvent
    ? participationChip(activePart?.status, activePart?.payment_status, actorKind, {
        boothCost: currentEvent.booth_cost,
        isPast: new Date(currentEvent.end_date) < now,
      })
    : null
```

- [ ] **Step 7: Build + lint + tests**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: tout vert.

- [ ] **Step 8: Commit**

```bash
git add src/lib/explorer.ts src/lib/explorer.test.ts src/components/explorer/EventDeck.tsx src/pages/Explorer.tsx
git commit -m "feat(participation): unified participationChip vocabulary (Accepté/Dossier envoyé/Terminé, free-event + isPast ctx)"
```

---

## Task 3: Couleurs partagées + recâblage Explorer.css

**Files:**
- Modify: `src/index.css` (ajout variables `--status-*` dans `:root` puis `.light`)
- Modify: `src/pages/Explorer.css:734-738` (`.card-status.*`) et `:1034-1036` (`.eh-status.*`)

- [ ] **Step 1: Ajouter les variables de couleur de statut (nuit) dans `:root` de `src/index.css`**

Juste après la ligne `--amber: #ffce85;` du bloc `:root` (tokens de marque), ajouter :

```css
  /* Statuts de participation (vocabulaire unifié) — couleur de texte/accent (nuit) */
  --status-repere:  #a8cc7a;   /* tilleul */
  --status-dossier: #86bce8;   /* bleu */
  --status-accepte: #5fd9a0;   /* émeraude */
  --status-apayer:  #ffce85;   /* ambre */
  --status-inscrit: #34c98a;   /* forêt */
  --status-refuse:  #e8897a;   /* terracotta */
```

- [ ] **Step 2: Ajouter les overrides JOUR dans le bloc `.light` de `src/index.css`**

Juste après `--amber: hsl(36 82% 46%);` du bloc `.light`, ajouter (teintes assombries pour contraste sur fond clair) :

```css
  --status-repere:  hsl(88 50% 32%);
  --status-dossier: hsl(210 55% 42%);
  --status-accepte: hsl(152 48% 32%);
  --status-apayer:  hsl(36 82% 40%);
  --status-inscrit: hsl(152 52% 28%);
  --status-refuse:  hsl(8 62% 46%);
```

- [ ] **Step 3: Recâbler les pastilles sur affiche (`.card-status.*`) — aplat brillant + encre, stable sur image**

> Ces pastilles sont posées **sur l'affiche** (pas sur le fond de page) : on garde des aplats brillants fixes (indépendants du thème), encre sombre sauf inscrit/refuse en blanc.

Dans `src/pages/Explorer.css`, remplacer les lignes 734-738 :

```css
.explorer .card-status.repere { background: var(--amber); color: #3a2410; }
.explorer .card-status.going { background: var(--lime); color: #1b2e10; }
.explorer .card-status.pending { background: var(--copper); color: #fff; }
.explorer .card-status.paid { background: hsl(152 55% 42%); color: #fff; }
```

par :

```css
.explorer .card-status.repere  { background: #a8cc7a; color: #1b2e10; }
.explorer .card-status.dossier { background: #86bce8; color: #0e2233; }
.explorer .card-status.accepte { background: #5fd9a0; color: #06281a; }
.explorer .card-status.apayer  { background: #ffce85; color: #3a2410; }
.explorer .card-status.inscrit { background: hsl(152 55% 40%); color: #fff; }
.explorer .card-status.refuse  { background: #e8897a; color: #fff; }
.explorer .card-status.termine { background: rgba(20,14,12,.55); color: #d8c7b4; }
.explorer .card-status.going   { background: hsl(152 55% 40%); color: #fff; }
```

- [ ] **Step 4: Recâbler les pastilles du dock (`.eh-status.*`) — translucide + texte thémé**

Dans `src/pages/Explorer.css`, remplacer les lignes 1034-1036 :

```css
.explorer .eh-status.repere { background: hsl(40 90% 60% / .16); border: 1px solid hsl(40 90% 60% / .4); color: var(--amber); }
.explorer .eh-status.pending { background: hsl(28 80% 60% / .16); border: 1px solid hsl(28 80% 60% / .4); color: var(--copper); }
.explorer .eh-status.paid { background: hsl(152 50% 45% / .18); border: 1px solid hsl(152 50% 45% / .45); color: hsl(152 45% 46%); }
```

par :

```css
.explorer .eh-status.repere  { background: color-mix(in srgb, var(--status-repere)  18%, transparent); border: 1px solid color-mix(in srgb, var(--status-repere)  40%, transparent); color: var(--status-repere); }
.explorer .eh-status.dossier { background: color-mix(in srgb, var(--status-dossier) 18%, transparent); border: 1px solid color-mix(in srgb, var(--status-dossier) 40%, transparent); color: var(--status-dossier); }
.explorer .eh-status.accepte { background: color-mix(in srgb, var(--status-accepte) 18%, transparent); border: 1px solid color-mix(in srgb, var(--status-accepte) 40%, transparent); color: var(--status-accepte); }
.explorer .eh-status.apayer  { background: color-mix(in srgb, var(--status-apayer)  18%, transparent); border: 1px solid color-mix(in srgb, var(--status-apayer)  40%, transparent); color: var(--status-apayer); }
.explorer .eh-status.inscrit { background: color-mix(in srgb, var(--status-inscrit) 18%, transparent); border: 1px solid color-mix(in srgb, var(--status-inscrit) 45%, transparent); color: var(--status-inscrit); }
.explorer .eh-status.refuse  { background: color-mix(in srgb, var(--status-refuse)  16%, transparent); border: 1px solid color-mix(in srgb, var(--status-refuse)  40%, transparent); color: var(--status-refuse); }
.explorer .eh-status.termine { background: rgba(255,240,225,.08); border: 1px solid var(--border); color: var(--muted-foreground); }
.explorer .eh-status.going   { background: color-mix(in srgb, var(--status-inscrit) 18%, transparent); border: 1px solid color-mix(in srgb, var(--status-inscrit) 45%, transparent); color: var(--status-inscrit); }
```

- [ ] **Step 5: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: vert. (Tailwind v4 accepte `color-mix` et les variables custom.)

- [ ] **Step 6: Vérification visuelle Explorer (nuit + jour)**

Run: `pnpm dev`, ouvrir `/explorer`, basculer le thème.
Vérifier : pastille « Repéré » désormais **verte** (cohérente avec le bouton « Repérer »), lisible en nuit et jour ; les autres variantes apparaissent avec les bonnes teintes quand on a des participations.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/pages/Explorer.css
git commit -m "feat(participation): shared --status-* color tokens (night/day) + rewire Explorer chips"
```

---

## Task 4: Page Événement — un seul chip dérivé (`EventHero`)

**Files:**
- Modify: `src/components/events/EventHero.tsx`
- Modify: `src/pages/EventPage.css` (classes `.event-badge-status.*`)
- Modify: `src/pages/EventPage.tsx` (passe `isExposant` à `EventHero`)

- [ ] **Step 1: Remplacer le bloc badges de `EventHero.tsx` par un chip unique via `participationChip`**

Dans `src/components/events/EventHero.tsx` :

a) Remplacer l'import (ligne 4) et ajouter celui de `participationChip` :

```tsx
import type { Event } from '@/types/database'
import { participationChip } from '@/lib/explorer'
```

b) Supprimer les constantes `STATUS_LABELS` (14-18) et `PAYMENT_LABELS` (20-24).

c) Ajouter `isExposant` aux props (interface lignes 6-12 + signature ligne 30) :

```tsx
interface EventHeroProps {
  event: Event
  friendCount: number
  participationStatus?: string | null
  paymentStatus?: string | null
  isExposant?: boolean
  onParticipantsClick?: () => void
}
```
```tsx
export function EventHero({ event, friendCount, participationStatus, paymentStatus, isExposant, onParticipantsClick }: EventHeroProps) {
  const chip = participationChip(participationStatus, paymentStatus, isExposant ? 'entity' : 'person', {
    boothCost: event.booth_cost,
    isPast: new Date(event.end_date) < new Date(),
  })
```

d) Remplacer **tout** le bloc `{/* Status + payment badges */} ... {participationStatus && ( ... )}` (lignes 82-112) par :

```tsx
        {/* Statut de participation (chip unifié) */}
        {chip && (
          <div className="event-badges">
            <span className={'event-badge-status ' + chip.variant}>{chip.label}</span>
          </div>
        )}
```

- [ ] **Step 2: Ajouter les classes de variante dans `EventPage.css`**

Localiser la règle `.event-badge-status` existante :

Run: `pnpm exec grep -n "event-badge-status" src/pages/EventPage.css`

Juste après le bloc `.event-badge-status { ... }` (conserver ses styles de forme : padding, radius, font), ajouter les variantes (translucide + texte thémé, comme le dock) :

```css
.event-badge-status.repere  { background: color-mix(in srgb, var(--status-repere)  18%, transparent); color: var(--status-repere); }
.event-badge-status.dossier { background: color-mix(in srgb, var(--status-dossier) 18%, transparent); color: var(--status-dossier); }
.event-badge-status.accepte { background: color-mix(in srgb, var(--status-accepte) 18%, transparent); color: var(--status-accepte); }
.event-badge-status.apayer  { background: color-mix(in srgb, var(--status-apayer)  18%, transparent); color: var(--status-apayer); }
.event-badge-status.inscrit { background: color-mix(in srgb, var(--status-inscrit) 18%, transparent); color: var(--status-inscrit); }
.event-badge-status.refuse  { background: color-mix(in srgb, var(--status-refuse)  16%, transparent); color: var(--status-refuse); }
.event-badge-status.termine { background: rgba(255,240,225,.08); color: var(--muted-foreground); }
.event-badge-status.going   { background: color-mix(in srgb, var(--status-inscrit) 18%, transparent); color: var(--status-inscrit); }
```

> Si `.event-badge-status` fixait une couleur de fond/texte en dur, la retirer (les variantes la portent désormais).

- [ ] **Step 3: Passer `isExposant` depuis `EventPage.tsx`**

Localiser le rendu `<EventHero` :

Run: `pnpm exec grep -n "EventHero" src/pages/EventPage.tsx`

Ajouter le prop `isExposant={isExposant}` au composant `<EventHero ... />` (la variable `isExposant` est déjà calculée dans `EventPage` — elle est passée à `EventDashboard`). Si le nom local diffère, utiliser la même expression que celle passée à `<EventDashboard isExposant=...>`.

- [ ] **Step 4: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: vert.

- [ ] **Step 5: Vérification visuelle page Événement (nuit + jour)**

Run: `pnpm dev`, ouvrir une page `/evenement/:id` où l'on a une participation exposant.
Vérifier : un seul chip cohérent (ex. « À payer » ambre, « Inscrit » forêt) ; plus de double badge statut+paiement ; lisible nuit/jour.

- [ ] **Step 6: Commit**

```bash
git add src/components/events/EventHero.tsx src/pages/EventPage.css src/pages/EventPage.tsx
git commit -m "feat(participation): EventHero uses single derived chip via participationChip"
```

---

## Task 5: Dashboard exposant — steppers Accepté/Refusé + paiement 2 états

**Files:**
- Modify: `src/components/events/EventDashboard.tsx`
- Modify: `src/components/events/EventDashboardMobile.tsx`

- [ ] **Step 1: Mettre à jour les steppers et libellés dans `EventDashboard.tsx`**

a) Remplacer `PARTICIPATION_STEPS` (lignes 20-24) :

```tsx
const PARTICIPATION_STEPS = [
  { key: 'interesse' as const, label: 'Repéré' },
  { key: 'en_cours' as const, label: 'Dossier envoyé' },
  { key: 'confirme' as const, label: 'Accepté' },
]
```

b) Remplacer `PAYMENT_STEPS` (lignes 26-30) — 2 états :

```tsx
const PAYMENT_STEPS = [
  { key: 'a_payer', label: 'À payer' },
  { key: 'paye', label: 'Payé' },
]
```

c) Remplacer `INFO_MESSAGES` (lignes 32-45) :

```tsx
const INFO_MESSAGES: Record<string, { title: string; text: string }> = {
  interesse: {
    title: '★ Repéré',
    text: 'Tes amis voient que tu as repéré cet événement. Tu recevras les notifications de mise à jour.',
  },
  en_cours: {
    title: '📨 Dossier envoyé',
    text: 'Ta candidature est envoyée. Marque « Accepté » dès que l\'organisateur valide ton dossier.',
  },
  confirme: {
    title: '✦ Accepté',
    text: 'Ton dossier est accepté. Renseigne le paiement ci-dessous. Une fois payé, tu passes « Inscrit ».',
  },
  refuse: {
    title: '✕ Refusé',
    text: 'Dossier refusé — gardé en historique. Tu peux te retirer complètement avec « Se désinscrire ».',
  },
}
```

- [ ] **Step 2: Débloquer le paiement sur `confirme` (+ event payant) au lieu de `inscrit`**

Dans `EventDashboard.tsx`, remplacer la condition d'affichage du bloc Paiement (ligne 164) :

```tsx
        {participation.status === 'inscrit' && (
```

par (le bloc paiement n'a de sens que pour un dossier accepté **et** un stand payant) :

```tsx
        {(participation.status === 'confirme' || participation.status === 'inscrit') && (event.booth_cost ?? 0) > 0 && (
```

> `EventDashboard` doit recevoir l'`event` pour lire `booth_cost`. Vérifier les props : si `event` n'est pas déjà passé, l'ajouter à `EventDashboardProps` (`event: Event`) et au site d'appel dans `EventPage.tsx` (et `EventDashboardMobile` qui relaie `{...props}`). Importer `Event` depuis `@/types/database`.

- [ ] **Step 3: Ajouter l'action « Refusé » sur le stepper participation**

Dans `EventDashboard.tsx`, juste après la `<div className="event-stepper">` des `PARTICIPATION_STEPS` (après le `.map(...)`, avant la fermeture du bloc), ajouter un bouton refus discret :

```tsx
            <button
              onClick={() => handleStatusChange('refuse' as ParticipationStatus)}
              className={`event-stepper-btn refuse ${participation.status === 'refuse' ? 'pay-active refuse' : 'inactive'}`}
            >
              Refusé
            </button>
```

> Le bouton « Se désinscrire » existant (`onLeave`, en-tête) reste la voie pour **retirer** complètement la participation. Aucun nouveau code de suppression.

- [ ] **Step 4: Mettre à jour le badge replié mobile (`EventDashboardMobile.tsx`)**

a) Supprimer `STATUS_LABELS` (18-22) et `PAYMENT_LABELS` (24-28).

b) Remplacer le bloc `{participation ? ( <> ...badges... </> ) : (...)}` (lignes 43-71) par un chip unifié :

```tsx
          {participation ? (
            (() => {
              const chip = participationChip(
                participation.status as string,
                (participation.payment_status as string | null) ?? null,
                props.isExposant ? 'entity' : 'person',
                { boothCost: props.event?.booth_cost, isPast: props.isPast },
              )
              return chip ? (
                <span className={'event-mobile-status ' + chip.variant}>{chip.label}</span>
              ) : null
            })()
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
              Tu y vas ?
            </span>
```

c) Ajouter en tête de fichier : `import { participationChip } from '@/lib/explorer'`. (Le prop `event` arrive avec l'ajout fait en Step 2 ; `isPast` existe déjà sur les props.)

d) Ajouter dans `EventPage.css` une règle minimale pour `.event-mobile-status` réutilisant les variantes (réutilise les couleurs translucides) :

```css
.event-mobile-status { padding: 3px 10px; border-radius: 16px; font-size: 11px; font-weight: 700; }
.event-mobile-status.repere  { background: color-mix(in srgb, var(--status-repere)  18%, transparent); color: var(--status-repere); }
.event-mobile-status.dossier { background: color-mix(in srgb, var(--status-dossier) 18%, transparent); color: var(--status-dossier); }
.event-mobile-status.accepte { background: color-mix(in srgb, var(--status-accepte) 18%, transparent); color: var(--status-accepte); }
.event-mobile-status.apayer  { background: color-mix(in srgb, var(--status-apayer)  18%, transparent); color: var(--status-apayer); }
.event-mobile-status.inscrit { background: color-mix(in srgb, var(--status-inscrit) 18%, transparent); color: var(--status-inscrit); }
.event-mobile-status.refuse  { background: color-mix(in srgb, var(--status-refuse)  16%, transparent); color: var(--status-refuse); }
.event-mobile-status.termine { background: rgba(255,240,225,.08); color: var(--muted-foreground); }
.event-mobile-status.going   { background: color-mix(in srgb, var(--status-inscrit) 18%, transparent); color: var(--status-inscrit); }
```

- [ ] **Step 5: Vérifier qu'il ne reste plus aucun `en_cours_paiement` dans `src/`**

Run: `pnpm exec grep -rn "en_cours_paiement" src/`
Expected: aucun résultat.

- [ ] **Step 6: Build + lint + tests**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: tout vert.

- [ ] **Step 7: Vérification visuelle dashboard (nuit + jour)**

Run: `pnpm dev`, ouvrir une page événement en tant qu'exposant.
Vérifier : stepper « Repéré / Dossier envoyé / Accepté » + bouton « Refusé » ; le bloc Paiement (À payer / Payé) n'apparaît qu'en « Accepté » sur un stand payant ; badge mobile cohérent.

- [ ] **Step 8: Commit**

```bash
git add src/components/events/EventDashboard.tsx src/components/events/EventDashboardMobile.tsx src/pages/EventPage.css src/pages/EventPage.tsx
git commit -m "feat(participation): dashboard steppers (Repéré/Dossier envoyé/Accepté + Refusé), payment 2-state, mobile chip via participationChip"
```

---

## Task 6: Vérification finale + bump version

**Files:**
- Modify: fichier de version (`src/changelog.ts` ou `version.ts` selon l'emplacement d'`APP_VERSION`)

- [ ] **Step 1: Localiser `APP_VERSION` et bumper le patch**

Run: `pnpm exec grep -rn "APP_VERSION" src/`
Incrémenter le patch (ex. `0.7.x` → `0.7.x+1`) dans le fichier trouvé, et ajouter une entrée changelog si le fichier en contient une (cycle de vie unifié).

- [ ] **Step 2: Vérification complète**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: tout vert.

- [ ] **Step 3: Grep de cohérence final**

Run: `pnpm exec grep -rn "En inscription\|en_cours_paiement" src/`
Expected: aucun résultat (vocabulaire migré).

- [ ] **Step 4: Commit + push**

```bash
git add -A
git commit -m "chore(participation): bump version after lifecycle refonte"
git push
```

---

## Self-Review

**Couverture de la spec :**
- Cycle exposant (Repéré/Dossier envoyé/Accepté/À payer/Inscrit/Refusé) + personne (Repéré/J'y vais) + Terminé → Task 2 (`participationChip` + tests). ✓
- Cas event gratuit (booth_cost 0/null → Inscrit) → Task 2 (`isFree`). ✓
- Override Terminé (isPast) → Task 2 (priorité en tête). ✓
- Enum `refuse` + suppression `en_cours_paiement` (data) → Task 1. ✓
- `inscrit` alias legacy de `confirme`, **zéro migration de status** → Task 2 (branche commune confirme/inscrit). ✓
- Couleurs partagées dual-thème (`--status-*`) → Task 3 (nuit + jour). ✓
- Recâblage Explorer (card-status aplat / eh-status translucide) → Task 3. ✓
- Page Événement chip unique → Task 4. ✓
- Dashboard : steppers renommés, Accepté débloque paiement, Refusé, 2 états paiement, badge mobile via chip → Task 5. ✓
- Hors périmètre calendrier → respecté (aucune tâche ne touche `CalendarMonth.tsx`/`Calendar.css`). ✓

**Placeholders :** aucun — chaque step porte le code/commande réels. Les deux `grep` de localisation (`EventHero`, `event-badge-status`, `APP_VERSION`) servent à situer une insertion dont le contenu exact est fourni.

**Cohérence des types/noms :** `StatusVariant` (Task 2) = `repere|dossier|accepte|apayer|inscrit|refuse|termine|going`, repris à l'identique dans toutes les classes CSS (Tasks 3-5). `ChipContext { boothCost, isPast }` (Task 2) utilisé tel quel dans EventDeck/Explorer/EventHero/EventDashboardMobile. `confirme` posé par le stepper (Task 5) ⇄ lu par `participationChip` (Task 2). `--status-*` défini en Task 3, consommé en Tasks 3-5.

**Risques :** `ADD VALUE` Postgres isolé (Task 1, UPDATE ne référence pas `refuse`) ; application migration = action sortante à confirmer ; `EventDashboard` doit recevoir `event` (vérif explicite en Task 5 Step 2).
```
