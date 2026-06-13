# Suivi financier des festivals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le bilan post-festival en registre de lignes financières (deux sens), alimenté sans friction par la capture du montant au moment où l'exposant pose son statut de paiement.

**Architecture:** Une table fille `event_ledger_entries` rattachée à `event_reports` porte les lignes (libellé + montant + sens + catégorie). Le stepper de paiement de l'`EventDashboard` capture le prix total et upsert une ligne unique `source='stepper'`. Une colonne `participations.payment_orientation` décide du sens (je paie / on me paie). Le bénéfice = somme(in) − somme(out), calculé en lib pure, réutilisé par le bilan et le cockpit.

**Tech Stack:** Supabase (Postgres + RLS), React 19 + TypeScript, Vitest (tests de fonctions pures uniquement — cf. contrainte infra de test du projet), `@/` alias → `src/`.

**Spec de référence:** `docs/superpowers/specs/2026-06-13-suivi-financier-bilan-design.md`

**Conventions du projet:**
- pnpm. Build = `pnpm build` (tsc + vite). Tests = `pnpm test` (ou `pnpm exec vitest run <fichier>`).
- Tables nouvelles non encore dans `src/types/supabase.ts` : accès via cast `(supabase as any)` (précédent projet pour nouvelles tables/RPC). On régénère les types en fin de plan (Task 9).
- Auto-commit conventional commits à chaque tâche.

---

## File Structure

- **Create** `supabase/migrations/20260613120000_event_ledger.sql` — table `event_ledger_entries`, RLS owner-only, index unique partiel, colonne `participations.payment_orientation`, migration des données existantes.
- **Create** `src/lib/ledger.ts` — catalogue des catégories + `ledgerProfit` + `defaultDirectionFor` (pur, testé).
- **Create** `src/lib/ledger.test.ts` — tests purs de `ledger.ts`.
- **Create** `src/hooks/use-ledger.ts` — chargement/écriture des lignes (par event, et agrégé pour le cockpit).
- **Modify** `src/types/database.ts` — types `LedgerEntry`, `LedgerEntryInsert`, `LedgerDirection`, `LedgerCategory`, `PaymentOrientation`.
- **Modify** `src/lib/cockpit-bilans.ts` — `bilanProfit`/`buildPastBilans` rebranchés sur les lignes.
- **Modify** `src/lib/cockpit-bilans.test.ts` — tests rebranchés.
- **Modify** `src/components/events/EventDashboard.tsx` + `EventDashboardMobile.tsx` — toggle orientation, relabel stepper, capture montant inline, upsert ligne stepper.
- **Modify** `src/components/reports/EventReportForm.tsx` — éditeur de registre à la place des 3 champs.
- **Modify** `src/components/reports/BilanCard.tsx` — résumé chiffré rebranché sur les lignes.
- **Modify** `src/components/cockpit/MesBilans.tsx` — affichage rebranché + chargement des lignes.
- **Modify** `src/pages/Cockpit.tsx` (ou la source de `reportsByEvent` de MesBilans) — fournir `entriesByEvent`.

---

## Task 1: Migration DB — table registre + orientation + migration des données

**Files:**
- Create: `supabase/migrations/20260613120000_event_ledger.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Registre financier par bilan : lignes dans les deux sens (in/out).
-- Table fille d'event_reports. Privée à l'acteur (aucun accès admin, comme event_reports).

CREATE TABLE IF NOT EXISTS public.event_ledger_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid NOT NULL REFERENCES public.event_reports(id) ON DELETE CASCADE,
  actor_id    uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label       text,
  amount      numeric NOT NULL CHECK (amount >= 0),
  direction   text NOT NULL CHECK (direction IN ('in','out')),
  category    text NOT NULL CHECK (category IN
                ('emplacement','cachet','essence','peage','hebergement','repas','remboursement','ventes','autre')),
  source      text NOT NULL DEFAULT 'manual' CHECK (source IN ('stepper','manual')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Une seule ligne issue du stepper par bilan (capture idempotente du prix de la place/cachet).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ledger_stepper_per_report
  ON public.event_ledger_entries (report_id) WHERE source = 'stepper';

CREATE INDEX IF NOT EXISTS idx_ledger_event_actor
  ON public.event_ledger_entries (actor_id, event_id);

ALTER TABLE public.event_ledger_entries ENABLE ROW LEVEL SECURITY;

-- Owner-only via can_act_as (modèle acteur, calqué sur event_reports_write_actor).
CREATE POLICY event_ledger_write_actor ON public.event_ledger_entries
  FOR ALL TO authenticated
  USING (can_act_as(actor_id))
  WITH CHECK (can_act_as(actor_id));

-- Orientation du festival : l'exposant paie sa place, ou on le paie pour venir.
ALTER TABLE public.participations
  ADD COLUMN IF NOT EXISTS payment_orientation text NOT NULL DEFAULT 'payeur'
  CHECK (payment_orientation IN ('payeur','paye'));

-- Migration des bilans existants : les 3 colonnes deviennent des lignes.
-- (Colonnes booth_cost/charges/revenue laissées dormantes — pas de DROP.)
INSERT INTO public.event_ledger_entries (report_id, actor_id, event_id, label, amount, direction, category, source)
SELECT er.id, er.actor_id, er.event_id, NULL, er.booth_cost, 'out', 'emplacement', 'manual'
FROM public.event_reports er WHERE er.booth_cost IS NOT NULL AND er.booth_cost > 0;

INSERT INTO public.event_ledger_entries (report_id, actor_id, event_id, label, amount, direction, category, source)
SELECT er.id, er.actor_id, er.event_id, 'Charges', er.charges, 'out', 'autre', 'manual'
FROM public.event_reports er WHERE er.charges IS NOT NULL AND er.charges > 0;

INSERT INTO public.event_ledger_entries (report_id, actor_id, event_id, label, amount, direction, category, source)
SELECT er.id, er.actor_id, er.event_id, NULL, er.revenue, 'in', 'ventes', 'manual'
FROM public.event_reports er WHERE er.revenue IS NOT NULL AND er.revenue > 0;
```

- [ ] **Step 2: Sauvegarder un dump des bilans existants AVANT push** (préférence « backup avant transformation »)

Via MCP Supabase ou SQL editor, exécuter et garder le résultat :
```sql
SELECT id, actor_id, event_id, booth_cost, charges, revenue FROM public.event_reports
WHERE booth_cost IS NOT NULL OR charges IS NOT NULL OR revenue IS NOT NULL;
```
Coller le résultat dans le message de commit ou un fichier local non commité.

- [ ] **Step 3: Pousser la migration**

Run: `supabase db push` (binaire direct sous Windows — cf. mémoire `reference_supabase_cli` ; `pnpm exec` ne marche pas).
Expected: migration appliquée, aucune erreur de contrainte.

- [ ] **Step 4: Vérifier la migration des données**

Run (SQL editor) :
```sql
SELECT source, category, direction, count(*) FROM public.event_ledger_entries GROUP BY 1,2,3;
SELECT count(*) FROM information_schema.columns
WHERE table_name='participations' AND column_name='payment_orientation';
```
Expected: lignes `manual` créées pour chaque montant non-null des bilans existants ; colonne `payment_orientation` présente.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260613120000_event_ledger.sql
git commit -m "feat(db): registre financier event_ledger_entries + payment_orientation"
```

---

## Task 2: Lib `ledger.ts` — catalogue + profit (pur, TDD)

**Files:**
- Create: `src/lib/ledger.ts`
- Test: `src/lib/ledger.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// src/lib/ledger.test.ts
import { describe, it, expect } from 'vitest'
import { LEDGER_CATEGORIES, defaultDirectionFor, ledgerProfit } from './ledger'

describe('defaultDirectionFor', () => {
  it('catégories sortantes par défaut', () => {
    expect(defaultDirectionFor('emplacement')).toBe('out')
    expect(defaultDirectionFor('essence')).toBe('out')
    expect(defaultDirectionFor('autre')).toBe('out')
  })
  it('catégories entrantes par défaut', () => {
    expect(defaultDirectionFor('cachet')).toBe('in')
    expect(defaultDirectionFor('ventes')).toBe('in')
    expect(defaultDirectionFor('remboursement')).toBe('in')
  })
})

describe('ledgerProfit', () => {
  it('somme(in) - somme(out)', () => {
    expect(ledgerProfit([
      { amount: 1000, direction: 'in' },
      { amount: 300, direction: 'out' },
      { amount: 220, direction: 'out' },
    ])).toBe(480)
  })
  it('liste vide = 0', () => {
    expect(ledgerProfit([])).toBe(0)
  })
})

describe('LEDGER_CATEGORIES', () => {
  it('expose les 9 catégories fixes', () => {
    expect(LEDGER_CATEGORIES.map(c => c.key)).toEqual([
      'emplacement','cachet','essence','peage','hebergement','repas','remboursement','ventes','autre',
    ])
  })
})
```

- [ ] **Step 2: Lancer le test → échoue**

Run: `pnpm exec vitest run src/lib/ledger.test.ts`
Expected: FAIL — `Cannot find module './ledger'`.

- [ ] **Step 3: Implémenter `ledger.ts`**

```typescript
// src/lib/ledger.ts
export type LedgerDirection = 'in' | 'out'
export type LedgerCategory =
  | 'emplacement' | 'cachet' | 'essence' | 'peage'
  | 'hebergement' | 'repas' | 'remboursement' | 'ventes' | 'autre'

export interface LedgerCategoryDef {
  key: LedgerCategory
  label: string
  defaultDirection: LedgerDirection
  emoji: string
}

/** Liste FIXE et courte — pas de taxonomie configurable (garde-fou « pas une app de compta »). */
export const LEDGER_CATEGORIES: LedgerCategoryDef[] = [
  { key: 'emplacement',   label: 'Emplacement',   defaultDirection: 'out', emoji: '🏬' },
  { key: 'cachet',        label: 'Cachet',        defaultDirection: 'in',  emoji: '🎤' },
  { key: 'essence',       label: 'Essence',       defaultDirection: 'out', emoji: '⛽' },
  { key: 'peage',         label: 'Péage',         defaultDirection: 'out', emoji: '🛣️' },
  { key: 'hebergement',   label: 'Hébergement',   defaultDirection: 'out', emoji: '🏨' },
  { key: 'repas',         label: 'Repas',         defaultDirection: 'out', emoji: '🍽️' },
  { key: 'remboursement', label: 'Remboursement', defaultDirection: 'in',  emoji: '↩️' },
  { key: 'ventes',        label: 'Ventes',        defaultDirection: 'in',  emoji: '🛍️' },
  { key: 'autre',         label: 'Autre',         defaultDirection: 'out', emoji: '•' },
]

export function defaultDirectionFor(category: LedgerCategory): LedgerDirection {
  return LEDGER_CATEGORIES.find(c => c.key === category)?.defaultDirection ?? 'out'
}

export function categoryLabel(category: LedgerCategory): string {
  return LEDGER_CATEGORIES.find(c => c.key === category)?.label ?? 'Autre'
}

/** Bénéfice = somme des entrants − somme des sortants. */
export function ledgerProfit(entries: { amount: number; direction: LedgerDirection }[]): number {
  return entries.reduce((sum, e) => sum + (e.direction === 'in' ? e.amount : -e.amount), 0)
}
```

- [ ] **Step 4: Lancer le test → passe**

Run: `pnpm exec vitest run src/lib/ledger.test.ts`
Expected: PASS (3 describes verts).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ledger.ts src/lib/ledger.test.ts
git commit -m "feat(lib): catalogue catégories + ledgerProfit (pur, testé)"
```

---

## Task 3: Types registre dans `database.ts`

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Ajouter les types registre**

Après la ligne `export type EventReport = ...` (l. 21), et près des types Insert, ajouter :

```typescript
// Registre financier (event_ledger_entries) — types manuels tant que supabase.ts
// n'est pas régénéré (Task 9). source/direction/category alignés sur le CHECK SQL.
export type LedgerDirection = 'in' | 'out'
export type LedgerCategory =
  | 'emplacement' | 'cachet' | 'essence' | 'peage'
  | 'hebergement' | 'repas' | 'remboursement' | 'ventes' | 'autre'
export type PaymentOrientation = 'payeur' | 'paye'

export interface LedgerEntry {
  id: string
  report_id: string
  actor_id: string
  event_id: string
  label: string | null
  amount: number
  direction: LedgerDirection
  category: LedgerCategory
  source: 'stepper' | 'manual'
  created_at: string
}

export type LedgerEntryInsert = Omit<LedgerEntry, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `pnpm build`
Expected: PASS (aucune erreur TS — types purs ajoutés).

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat(types): LedgerEntry / PaymentOrientation"
```

---

## Task 4: Hook `use-ledger.ts` — lecture/écriture des lignes

**Files:**
- Create: `src/hooks/use-ledger.ts`

> Accès table via `(supabase as any)` (table absente de supabase.ts jusqu'à Task 9).

- [ ] **Step 1: Implémenter le hook + helpers**

```typescript
// src/hooks/use-ledger.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { LedgerEntry, LedgerCategory, LedgerDirection } from '@/types/database'

const TABLE = 'event_ledger_entries'

/** Lignes du registre d'un event pour l'acteur actif. `refetch` après mutation. */
export function useEventLedger(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!eventId || !currentActor) { setLoading(false); return }
    const { data } = await (supabase as any).from(TABLE).select('*')
      .eq('event_id', eventId).eq('actor_id', currentActor.id)
      .order('created_at', { ascending: true })
    setEntries((data ?? []) as LedgerEntry[])
    setLoading(false)
  }, [eventId, currentActor])

  useEffect(() => { refetch() }, [refetch]) // eslint-disable-line react-hooks/set-state-in-effect

  return { entries, loading, refetch }
}

/** Toutes les lignes de l'acteur actif, indexées par event_id (pour le cockpit). */
export function useMyLedger(): { entriesByEvent: Map<string, LedgerEntry[]>; loading: boolean; refetch: () => Promise<void> } {
  const { currentActor } = useAuth()
  const [entriesByEvent, setEntriesByEvent] = useState<Map<string, LedgerEntry[]>>(new Map())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!currentActor) { setLoading(false); return }
    const { data } = await (supabase as any).from(TABLE).select('*').eq('actor_id', currentActor.id)
    const map = new Map<string, LedgerEntry[]>()
    for (const e of (data ?? []) as LedgerEntry[]) {
      const arr = map.get(e.event_id) ?? []
      arr.push(e); map.set(e.event_id, arr)
    }
    setEntriesByEvent(map)
    setLoading(false)
  }, [currentActor])

  useEffect(() => { refetch() }, [refetch]) // eslint-disable-line react-hooks/set-state-in-effect

  return { entriesByEvent, loading, refetch }
}

export async function insertLedgerEntry(row: {
  report_id: string; actor_id: string; event_id: string
  label: string | null; amount: number; direction: LedgerDirection
  category: LedgerCategory; source: 'stepper' | 'manual'
}) {
  return await (supabase as any).from(TABLE).insert(row).select().single()
}

export async function updateLedgerEntry(id: string, patch: Partial<Pick<LedgerEntry, 'label' | 'amount' | 'direction' | 'category'>>) {
  return await (supabase as any).from(TABLE).update(patch).eq('id', id).select().single()
}

export async function deleteLedgerEntry(id: string) {
  return await (supabase as any).from(TABLE).delete().eq('id', id)
}

/**
 * Upsert idempotent de la ligne « stepper » (prix total de la place/cachet) d'un bilan.
 * direction/category dérivés de l'orientation. Si amount <= 0 → supprime la ligne (pas de ligne à 0).
 */
export async function upsertStepperLedgerLine(args: {
  reportId: string; actorId: string; eventId: string
  amount: number; orientation: 'payeur' | 'paye'
}) {
  const { reportId, actorId, eventId, amount, orientation } = args
  const category: LedgerCategory = orientation === 'paye' ? 'cachet' : 'emplacement'
  const direction: LedgerDirection = orientation === 'paye' ? 'in' : 'out'

  const { data: existing } = await (supabase as any).from(TABLE).select('id')
    .eq('report_id', reportId).eq('source', 'stepper').maybeSingle()

  if (!amount || amount <= 0) {
    if (existing) await (supabase as any).from(TABLE).delete().eq('id', existing.id)
    return
  }
  if (existing) {
    await (supabase as any).from(TABLE).update({ amount, category, direction }).eq('id', existing.id)
  } else {
    await (supabase as any).from(TABLE).insert({
      report_id: reportId, actor_id: actorId, event_id: eventId,
      label: null, amount, direction, category, source: 'stepper',
    })
  }
}

/**
 * Garantit qu'un event_reports existe pour (actor, event) et renvoie son id.
 * Nécessaire car la ligne stepper référence report_id, même si l'exposant n'a pas
 * encore ouvert le formulaire de bilan.
 */
export async function ensureReportId(actorId: string, eventId: string): Promise<string | null> {
  const { data: existing } = await supabase.from('event_reports').select('id')
    .eq('actor_id', actorId).eq('event_id', eventId).maybeSingle()
  if (existing) return (existing as { id: string }).id
  const { data: created } = await supabase.from('event_reports')
    .upsert({ actor_id: actorId, event_id: eventId } as any, { onConflict: 'actor_id,event_id' })
    .select('id').single()
  return created ? (created as { id: string }).id : null
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-ledger.ts
git commit -m "feat(hooks): use-ledger (lecture/écriture + upsert ligne stepper)"
```

---

## Task 5: Rebrancher `cockpit-bilans.ts` sur le registre (TDD)

**Files:**
- Modify: `src/lib/cockpit-bilans.ts`
- Modify: `src/lib/cockpit-bilans.test.ts`

- [ ] **Step 1: Réécrire le test (échoue d'abord)**

Remplacer **tout** le contenu de `src/lib/cockpit-bilans.test.ts` par :

```typescript
import { describe, it, expect } from 'vitest'
import { buildPastBilans, splitOrientation } from './cockpit-bilans'
import type { ParticipationWithEvent, LedgerEntry } from '@/types/database'

const NOW = new Date('2026-05-15T12:00:00Z')

function part(id: string, end: string, status = 'inscrit', orientation = 'payeur'): ParticipationWithEvent {
  return {
    id, event_id: 'e' + id, status, payment_status: 'paye', payment_orientation: orientation, visibility: 'amis',
    events: { id: 'e' + id, name: 'Festival ' + id, start_date: end, end_date: end, city: 'Lyon', department: '69', image_url: null, tags: ['medieval'] },
  } as unknown as ParticipationWithEvent
}

function entry(eventId: string, amount: number, direction: 'in' | 'out'): LedgerEntry {
  return { event_id: eventId, amount, direction, category: 'autre', source: 'manual' } as unknown as LedgerEntry
}

describe('buildPastBilans', () => {
  it('ne garde que les inscrit passés, tri end_date desc, profit = in - out', () => {
    const parts = [
      part('1', '2026-04-01'),
      part('2', '2026-05-01'),
      part('3', '2026-07-01'),                 // futur → exclu
      part('4', '2026-03-01', 'en_cours'),     // non confirmé → exclu
    ]
    const entries = new Map<string, LedgerEntry[]>([
      ['e2', [entry('e2', 1240, 'in'), entry('e2', 410, 'out'), entry('e2', 350, 'out')]],
    ])
    const out = buildPastBilans(parts, entries, NOW)
    expect(out.map(b => b.participation.id)).toEqual(['2', '1'])
    expect(out[0].profit).toBe(480)           // 1240 - 410 - 350
    expect(out[0].revenueIn).toBe(1240)
    expect(out[1].profit).toBeNull()           // festival '1' sans ligne
  })

  it('liste vide si aucun festival passé', () => {
    expect(buildPastBilans([part('1', '2026-07-01')], new Map(), NOW)).toEqual([])
  })
})

describe('splitOrientation', () => {
  it('somme les cachets reçus et les emplacements payés', () => {
    const parts = [part('1', '2026-04-01', 'inscrit', 'paye'), part('2', '2026-04-02', 'inscrit', 'payeur')]
    const entries = new Map<string, LedgerEntry[]>([
      ['e1', [entry('e1', 500, 'in')]],
      ['e2', [entry('e2', 200, 'out')]],
    ])
    const bilans = buildPastBilans(parts, entries, NOW)
    expect(splitOrientation(bilans)).toEqual({ recu: 500, paye: 200 })
  })
})
```

- [ ] **Step 2: Lancer → échoue**

Run: `pnpm exec vitest run src/lib/cockpit-bilans.test.ts`
Expected: FAIL — `splitOrientation` non exporté / signature `buildPastBilans` changée.

- [ ] **Step 3: Réécrire `cockpit-bilans.ts`**

Remplacer **tout** le contenu par :

```typescript
import type { ParticipationWithEvent, LedgerEntry } from '@/types/database'
import { ledgerProfit } from '@/lib/ledger'

export interface PastBilan {
  participation: ParticipationWithEvent
  entries: LedgerEntry[]
  profit: number | null     // null si aucune ligne
  revenueIn: number         // somme des entrants (pour affichage « CA / Reçu »)
}

/**
 * Festivals PASSÉS confirmés (inscrit, end_date < now), triés du plus récent au plus ancien,
 * chacun joint à ses lignes de registre + le bénéfice calculé.
 */
export function buildPastBilans(
  parts: ParticipationWithEvent[],
  entriesByEvent: Map<string, LedgerEntry[]>,
  now: Date,
): PastBilan[] {
  return parts
    .filter(p => p.events && p.status === 'inscrit' && new Date(p.events.end_date).getTime() < now.getTime())
    .sort((a, b) => new Date(b.events.end_date).getTime() - new Date(a.events.end_date).getTime())
    .map(p => {
      const entries = entriesByEvent.get(p.event_id) ?? []
      const revenueIn = entries.filter(e => e.direction === 'in').reduce((s, e) => s + e.amount, 0)
      return {
        participation: p,
        entries,
        profit: entries.length ? ledgerProfit(entries) : null,
        revenueIn,
      }
    })
}

/** Total des cachets reçus (orientation payé) vs emplacements payés (orientation payeur). */
export function splitOrientation(bilans: PastBilan[]): { recu: number; paye: number } {
  let recu = 0, paye = 0
  for (const b of bilans) {
    const orientation = (b.participation as { payment_orientation?: string }).payment_orientation ?? 'payeur'
    if (orientation === 'paye') recu += b.entries.filter(e => e.direction === 'in').reduce((s, e) => s + e.amount, 0)
    else paye += b.entries.filter(e => e.direction === 'out').reduce((s, e) => s + e.amount, 0)
  }
  return { recu, paye }
}
```

- [ ] **Step 4: Lancer → passe**

Run: `pnpm exec vitest run src/lib/cockpit-bilans.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cockpit-bilans.ts src/lib/cockpit-bilans.test.ts
git commit -m "feat(lib): cockpit-bilans rebranché sur le registre + splitOrientation"
```

---

## Task 6: EventDashboard — orientation + capture du montant

**Files:**
- Modify: `src/components/events/EventDashboard.tsx`
- Modify: `src/components/events/EventDashboardMobile.tsx`

- [ ] **Step 1: Ajouter le toggle d'orientation + relabel + capture dans `EventDashboard.tsx`**

a) Imports en tête :
```typescript
import { useAuth } from '@/lib/auth'
import { upsertStepperLedgerLine, ensureReportId } from '@/hooks/use-ledger'
import type { PaymentOrientation } from '@/types/database'
```

b) Remplacer la constante `PAYMENT_STEPS` (l. 30-34) par deux jeux de labels selon l'orientation :
```typescript
// Labels du stepper selon l'orientation : je paie ma place vs on me paie pour venir.
const PAYMENT_STEPS_PAYEUR = [
  { key: 'a_payer', label: 'À payer' },
  { key: 'acompte_verse', label: 'Acompte versé' },
  { key: 'paye', label: 'Payé' },
]
const PAYMENT_STEPS_PAYE = [
  { key: 'a_payer', label: 'À recevoir' },
  { key: 'acompte_verse', label: 'Acompte reçu' },
  { key: 'paye', label: 'Reçu' },
]
```

c) Dans le composant, après `const [infoBox, ...]`, ajouter l'état orientation + montant :
```typescript
  const { currentActor } = useAuth()
  const orientation: PaymentOrientation =
    ((participation?.payment_orientation as PaymentOrientation | undefined) ?? 'payeur')
  // Champ montant inline ouvert quand on clique acompte/payé sans montant connu.
  const [amountDraft, setAmountDraft] = useState('')
  const [amountOpen, setAmountOpen] = useState(false)
```

d) Ajouter le handler d'orientation et adapter `handlePaymentChange` :
```typescript
  const handleOrientationChange = async (next: PaymentOrientation) => {
    if (!participation || next === orientation) return
    const { data } = await updateParticipation(participation.id, { payment_orientation: next } as never)
    if (data) {
      onUpdate(data)
      // Ré-oriente la ligne stepper existante (montant préservé) si elle existe.
      if (currentActor) {
        const reportId = await ensureReportId(currentActor.id, participation.event_id)
        const amt = parseFloat(amountDraft) || 0
        if (reportId && amt > 0) {
          await upsertStepperLedgerLine({ reportId, actorId: currentActor.id, eventId: participation.event_id, amount: amt, orientation: next })
        }
      }
    }
  }

  const handlePaymentChange = async (paymentStatus: string) => {
    if (!participation) return
    const { data } = await updateParticipation(participation.id, { payment_status: paymentStatus })
    if (data) onUpdate(data)
    // Ouvre la capture du montant quand on marque acompte/payé.
    if (paymentStatus === 'acompte_verse' || paymentStatus === 'paye') setAmountOpen(true)
  }

  const saveAmount = async () => {
    if (!participation || !currentActor) return
    const amt = parseFloat(amountDraft) || 0
    const reportId = await ensureReportId(currentActor.id, participation.event_id)
    if (reportId) {
      await upsertStepperLedgerLine({
        reportId, actorId: currentActor.id, eventId: participation.event_id,
        amount: amt, orientation,
      })
    }
    setAmountOpen(false)
  }
```

e) Remplacer `const PAYMENT_STEPS = ...` à l'usage : dans le bloc paiement (l. 192-211), calculer `const PAYMENT_STEPS = orientation === 'paye' ? PAYMENT_STEPS_PAYE : PAYMENT_STEPS_PAYEUR` juste avant le `return`, et ajouter le toggle + le champ montant dans le bloc :
```tsx
          {showPayment && (
            <div className="event-suivi-block">
              <div className="event-suivi-block-label">Paiement</div>
              {/* Toggle orientation : je paie ma place / on me paie pour venir */}
              <div className="event-orientation-toggle">
                <button
                  className={`event-orient-btn ${orientation === 'payeur' ? 'active' : ''}`}
                  onClick={() => handleOrientationChange('payeur')}
                >Je paie ma place</button>
                <button
                  className={`event-orient-btn ${orientation === 'paye' ? 'active' : ''}`}
                  onClick={() => handleOrientationChange('paye')}
                >On me paie pour venir</button>
              </div>
              <div className="event-stepper">
                {PAYMENT_STEPS.map(step => (
                  <button
                    key={step.key}
                    onClick={() => handlePaymentChange(step.key)}
                    className={`event-stepper-btn ${currentPayment === step.key ? `pay-active ${step.key}` : 'inactive'}`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
              {amountOpen && (
                <div className="event-amount-capture">
                  <label>{orientation === 'paye' ? 'Montant du cachet (€)' : 'Prix total de la place (€)'}</label>
                  <div className="event-amount-row">
                    <input
                      type="number" inputMode="decimal" autoFocus
                      value={amountDraft}
                      onChange={e => setAmountDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveAmount() }}
                      placeholder="Ex : 120"
                    />
                    <button className="event-amount-save" onClick={saveAmount}>OK</button>
                  </div>
                  <small>Enregistré dans ton bilan, tu ne l'oublieras pas.</small>
                </div>
              )}
            </div>
          )}
```

> Remarque : le champ `amountDraft` n'est pas pré-rempli depuis la ligne stepper existante en v1 (capture-only). Pré-remplissage = amélioration future, hors périmètre.

- [ ] **Step 2: Vérifier compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Reporter le même comportement dans `EventDashboardMobile.tsx`**

Ouvrir `src/components/events/EventDashboardMobile.tsx`, repérer le bloc paiement (mêmes `PAYMENT_STEPS` / `handlePaymentChange`) et appliquer **les mêmes** changements (toggle orientation, relabel, capture montant, handlers). Réutiliser les helpers déjà importés depuis `@/hooks/use-ledger`.

- [ ] **Step 4: Vérifier compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 5: Ajouter le style minimal**

Dans `src/pages/EventPage.css` (ou le CSS qui porte `.event-stepper`), ajouter :
```css
.event-orientation-toggle { display: flex; gap: 6px; margin-bottom: 8px; }
.event-orient-btn { flex: 1; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); font-size: 12px; cursor: pointer; }
.event-orient-btn.active { border-color: var(--copper); background: color-mix(in srgb, var(--copper) 12%, transparent); font-weight: 600; }
.event-amount-capture { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.event-amount-row { display: flex; gap: 6px; }
.event-amount-row input { flex: 1; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--input); background: var(--background); }
.event-amount-save { padding: 8px 14px; border-radius: 10px; border: none; background: var(--copper); color: #fff; font-weight: 600; cursor: pointer; }
.event-amount-capture small { color: var(--muted-foreground); font-size: 11px; }
```

> Vérifier dans EventPage.css que ces tokens (`--copper`, `--border`, `--card`, `--input`, `--background`, `--muted-foreground`) sont bien ceux utilisés dans le fichier (cf. mémoire `reference_da_css_tokens` : ne pas inventer de noms de tokens). Adapter si le fichier utilise d'autres noms.

- [ ] **Step 6: Commit**

```bash
git add src/components/events/EventDashboard.tsx src/components/events/EventDashboardMobile.tsx src/pages/EventPage.css
git commit -m "feat(event): orientation paiement + capture du montant inline → ligne registre"
```

---

## Task 7: EventReportForm — éditeur de registre

**Files:**
- Modify: `src/components/reports/EventReportForm.tsx`

- [ ] **Step 1: Remplacer la grille 3 champs par l'éditeur de lignes**

a) Imports :
```typescript
import { LEDGER_CATEGORIES, defaultDirectionFor, ledgerProfit, categoryLabel } from '@/lib/ledger'
import type { LedgerCategory, LedgerDirection } from '@/types/database'
import { useEventLedger, insertLedgerEntry, updateLedgerEntry, deleteLedgerEntry, ensureReportId } from '@/hooks/use-ledger'
```

b) Remplacer les états `boothCost/charges/revenue` par le chargement du registre :
```typescript
  const { entries, refetch: refetchEntries } = useEventLedger(eventId)
  const [adding, setAdding] = useState(false)
  const [newCat, setNewCat] = useState<LedgerCategory>('essence')
  const [newAmount, setNewAmount] = useState('')
  const [newLabel, setNewLabel] = useState('')
```
Supprimer le `useEffect` qui copiait `existing.booth_cost/...` (l. 29-39 → ne garder que la copie de `improvements`, `note`, `mediaPaths`).

c) Remplacer le calcul `profit` :
```typescript
  const profit = ledgerProfit(entries)
```

d) Handlers d'ajout/édition/suppression de ligne :
```typescript
  const addEntry = async () => {
    const amt = parseFloat(newAmount) || 0
    if (!currentActor || amt <= 0) return
    const reportId = await ensureReportId(currentActor.id, eventId)
    if (!reportId) return
    await insertLedgerEntry({
      report_id: reportId, actor_id: currentActor.id, event_id: eventId,
      label: newLabel.trim() || null, amount: amt,
      direction: defaultDirectionFor(newCat), category: newCat, source: 'manual',
    })
    setNewAmount(''); setNewLabel(''); setAdding(false)
    await refetchEntries()
  }

  const toggleDirection = async (id: string, dir: LedgerDirection) => {
    await updateLedgerEntry(id, { direction: dir === 'in' ? 'out' : 'in' })
    await refetchEntries()
  }

  const removeEntry = async (id: string) => {
    await deleteLedgerEntry(id)
    await refetchEntries()
  }
```

e) Remplacer le JSX de la grille 3 champs (l. 113-133) par la liste + l'ajout + le bénéfice :
```tsx
      <div className="bilan-ledger">
        <div className="bilan-ledger-label">Mes lignes (dépenses & recettes)</div>
        <ul className="bilan-ledger-list">
          {entries.map(e => (
            <li key={e.id} className={`bilan-ledger-row ${e.direction}`}>
              <button
                type="button"
                className="bilan-ledger-sign"
                onClick={() => toggleDirection(e.id, e.direction)}
                title="Basculer dépense / recette"
              >{e.direction === 'in' ? '+' : '−'}</button>
              <span className="bilan-ledger-cat">{e.label || categoryLabel(e.category)}</span>
              <span className="bilan-ledger-amt">{e.amount.toLocaleString('fr-FR')} €</span>
              {e.source === 'stepper'
                ? <span className="bilan-ledger-auto" title="Saisi depuis le suivi de paiement">auto</span>
                : <button type="button" className="bilan-ledger-del" onClick={() => removeEntry(e.id)} aria-label="Supprimer"><X className="h-3 w-3" /></button>}
            </li>
          ))}
          {entries.length === 0 && <li className="bilan-ledger-empty">Aucune ligne pour l'instant.</li>}
        </ul>

        {adding ? (
          <div className="bilan-ledger-add">
            <select value={newCat} onChange={e => setNewCat(e.target.value as LedgerCategory)}>
              {LEDGER_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
            <input className={inputClass} placeholder="Libellé (optionnel)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            <input className={inputClass} type="number" inputMode="decimal" placeholder="Montant €" value={newAmount} onChange={e => setNewAmount(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addEntry() }} />
            <Button size="sm" onClick={addEntry}>Ajouter</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Ajouter une ligne</Button>
        )}
      </div>

      <div className="rounded-lg bg-card p-3 text-center">
        <p className="text-xs text-muted-foreground">Bénéfice</p>
        <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
          {profit.toFixed(2)} €
        </p>
      </div>
```

f) Dans `handleSave`, retirer `booth_cost/charges/revenue` de l'objet passé à `saveEventReport` (ne garder que `improvements`, `note`, `media_paths`, ids). Les montants vivent désormais dans le registre, pas dans event_reports.

- [ ] **Step 2: Style minimal du registre**

Ajouter dans le CSS du bilan (chercher où `.bilan-modal` / formulaire est stylé, sinon `src/components/reports/BilanCard.css`) :
```css
.bilan-ledger { display: flex; flex-direction: column; gap: 8px; }
.bilan-ledger-label { font-size: 12px; font-weight: 600; color: var(--muted-foreground); }
.bilan-ledger-list { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
.bilan-ledger-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; background: var(--card); }
.bilan-ledger-sign { width: 22px; height: 22px; border-radius: 6px; border: none; cursor: pointer; font-weight: 700; }
.bilan-ledger-row.in .bilan-ledger-sign { background: color-mix(in srgb, var(--forest) 18%, transparent); color: var(--forest); }
.bilan-ledger-row.out .bilan-ledger-sign { background: color-mix(in srgb, var(--copper) 18%, transparent); color: var(--copper); }
.bilan-ledger-cat { flex: 1; font-size: 13px; }
.bilan-ledger-amt { font-weight: 600; font-size: 13px; }
.bilan-ledger-auto { font-size: 10px; opacity: .6; text-transform: uppercase; }
.bilan-ledger-add { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.bilan-ledger-empty { font-size: 12px; color: var(--muted-foreground); }
```

- [ ] **Step 3: Vérifier compilation**

Run: `pnpm build`
Expected: PASS (plus aucune référence à `existing.booth_cost`/`revenue`/`charges`).

- [ ] **Step 4: Commit**

```bash
git add src/components/reports/EventReportForm.tsx src/components/reports/BilanCard.css
git commit -m "feat(bilan): éditeur de registre (lignes deux sens) à la place des 3 champs"
```

---

## Task 8: BilanCard + MesBilans + Cockpit — affichage rebranché

**Files:**
- Modify: `src/components/reports/BilanCard.tsx`
- Modify: `src/components/cockpit/MesBilans.tsx`
- Modify: `src/pages/Cockpit.tsx`

- [ ] **Step 1: BilanCard — résumé chiffré depuis le registre**

Dans `src/components/reports/BilanCard.tsx` :
a) Importer `useEventLedger` et `ledgerProfit` :
```typescript
import { useEventLedger } from '@/hooks/use-ledger'
import { ledgerProfit } from '@/lib/ledger'
```
b) Remplacer le bloc `const revenue = report?.revenue ...` / `boothCost` / `charges` / `profit` (l. 44-47) par :
```typescript
  const { entries, refetch: refetchEntries } = useEventLedger(eventId)
  const revenue = entries.filter(e => e.direction === 'in').reduce((s, e) => s + e.amount, 0)
  const costs = entries.filter(e => e.direction === 'out').reduce((s, e) => s + e.amount, 0)
  const profit = ledgerProfit(entries)
  const hasReport = report != null || entries.length > 0
```
c) Remplacer l'usage de `boothCost + charges` (l. 78) par `costs`.
d) Sur `onSaved` de la modale (l. 115), appeler aussi `refetchEntries` : `onSaved={() => { refetch(); refetchEntries() }}`.

- [ ] **Step 2: MesBilans + Cockpit — fournir les lignes**

Dans `src/pages/Cockpit.tsx`, là où `reportsByEvent` est chargé et passé à `<MesBilans>`, ajouter le hook `useMyLedger` et passer `entriesByEvent`. (Repérer l'appel `useMyReports()` ; ajouter `const { entriesByEvent } = useMyLedger()` à côté, import depuis `@/hooks/use-ledger`.)

Dans `src/components/cockpit/MesBilans.tsx` :
a) Changer les props :
```typescript
import type { ParticipationWithEvent, LedgerEntry } from '@/types/database'
import { buildPastBilans, splitOrientation, type PastBilan } from '@/lib/cockpit-bilans'
// ...
interface Props {
  participations: ParticipationWithEvent[]
  entriesByEvent: Map<string, LedgerEntry[]>
  onSaved: () => void
}
export function MesBilans({ participations, entriesByEvent, onSaved }: Props) {
  const now = useMemo(() => new Date(), [])
  const bilans = useMemo(() => buildPastBilans(participations, entriesByEvent, now), [participations, entriesByEvent, now])
```
b) Le bloc d'aperçu photo `b.report?.media_paths?.[0]` n'est plus disponible (PastBilan n'a plus `report`). Remplacer le thumb par l'image de l'event uniquement (`ev.image_url`), et retirer la dépendance `signedUrlsFor`/`thumbs` (ou garder en chargeant les bilans séparément si l'on veut conserver les photos — **hors périmètre** : simplifier en `ev.image_url`).
c) Stats affichées : remplacer `b.report!.revenue` par `b.revenueIn`, et `hasReport` par `b.entries.length > 0`. Le « Remplir le bilan » s'affiche quand `b.entries.length === 0`.
d) Ajouter en tête de carte le split (bonus) :
```tsx
{(() => { const s = splitOrientation(bilans); return (s.recu > 0 || s.paye > 0) ? (
  <div className="ck-bilan-split">
    {s.recu > 0 && <span>Cachets reçus : <b>{s.recu.toLocaleString('fr-FR')} €</b></span>}
    {s.paye > 0 && <span>Emplacements payés : <b>{s.paye.toLocaleString('fr-FR')} €</b></span>}
  </div>
) : null })()}
```

- [ ] **Step 3: Vérifier compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/reports/BilanCard.tsx src/components/cockpit/MesBilans.tsx src/pages/Cockpit.tsx
git commit -m "feat(cockpit): bilans + carte rebranchés sur le registre + split cachets/emplacements"
```

---

## Task 9: Régénérer les types Supabase + nettoyage des casts

**Files:**
- Modify: `src/types/supabase.ts`
- Modify: `src/hooks/use-ledger.ts` (retirer les `(supabase as any)` si possible)

- [ ] **Step 1: Régénérer les types**

Run (binaire Supabase direct — cf. `reference_supabase_cli`) :
```
supabase gen types typescript --project-id <PROJECT_ID> --schema public > src/types/supabase.ts
```
Expected: `event_ledger_entries` et `participations.payment_orientation` apparaissent dans le fichier.

- [ ] **Step 2: Retirer les casts devenus inutiles**

Dans `src/hooks/use-ledger.ts`, remplacer `(supabase as any).from('event_ledger_entries')` par `supabase.from('event_ledger_entries')` partout où le typing le permet désormais. Garder les types manuels de `database.ts` (ils peuvent coexister, ou être remplacés par `Database['public']['Tables']['event_ledger_entries']['Row']` — au choix, sans casser les imports existants).

- [ ] **Step 3: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS (attention aux pièges eslint react-hooks — cf. mémoire `project_react_hooks_lint_gotchas`).

- [ ] **Step 4: Commit**

```bash
git add src/types/supabase.ts src/hooks/use-ledger.ts
git commit -m "chore(types): régénère supabase types, retire les casts ledger"
```

---

## Task 10: Vérification end-to-end + version bump

- [ ] **Step 1: Build complet**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 2: Tous les tests**

Run: `pnpm test`
Expected: PASS (ledger + cockpit-bilans verts, pas de régression).

- [ ] **Step 3: Smoke test manuel (dev)**

Run: `pnpm dev`, se connecter comme exposant Pro, ouvrir un festival Accepté/Inscrit :
- basculer l'orientation → labels du stepper changent ;
- cliquer « Payé » → champ montant → saisir 120 → OK ;
- ouvrir le bilan → la ligne `Emplacement 120 €` est déjà là, source `auto` ;
- ajouter une ligne `Essence 40 €` → bénéfice = recettes − dépenses correct ;
- cockpit « Mes bilans » → le festival passé montre le bénéfice + le split.

Vérifier aussi en **gratuit** : capture du montant OK, mais bilan complet verrouillé (teaser Pro).

- [ ] **Step 4: Bump version + commit final**

Bumper `APP_VERSION` (patch) dans le fichier version (chercher `APP_VERSION`), puis :
```bash
git add -A
git commit -m "chore: bump version — suivi financier festivals"
git push
```

---

## Self-review (couverture spec)

- Orientation par festival → Task 1 (colonne) + Task 6 (toggle/relabel/sens ligne). ✓
- Registre de lignes + catégories fixes → Task 1 (table/CHECK) + Task 2 (catalogue) + Task 7 (éditeur). ✓
- Capture sans friction + upsert idempotent ligne stepper → Task 4 (`upsertStepperLedgerLine`, index unique partiel Task 1) + Task 6. ✓
- Bénéfice = in − out, bilan + cockpit → Task 2 (`ledgerProfit`) + Task 5 + Task 7 + Task 8. ✓
- Migration des 3 colonnes en lignes, pas de DROP → Task 1 (INSERT … SELECT, colonnes dormantes). ✓
- Gating freemium (capture pour tous, registre Pro) → BilanCard reste Pro-gated (Task 8 conserve le `if (!isPro)`), capture montant dans EventDashboard non gated (Task 6). ✓
- Cas limites (acompte→payé même ligne, changement orientation ré-oriente, montant vidé supprime, cascade) → Task 4 (`upsertStepperLedgerLine`) + Task 1 (cascade). ✓
- Tests sur fonctions pures uniquement (contrainte infra) → Task 2 + Task 5. ✓
