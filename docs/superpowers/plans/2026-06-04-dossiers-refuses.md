# Dossiers refusés — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un exposant de revoir ses dossiers refusés et de noter pourquoi, via une section repliable au Cockpit + une saisie à chaud sur la page event.

**Architecture:** Colonne `refusal_note` sur `participations` (1:1, éditable). Saisie à chaud sous le stepper `EventDashboard` quand le dossier est « Refusé ». Section repliable `DossiersRefuses` au Cockpit (sélecteur pur `selectRefusedDossiers`). Mêmes données éditées des deux côtés.

**Tech Stack:** React 19 + TS, Supabase (Postgres), vitest. Spec : `docs/superpowers/specs/2026-06-04-dossiers-refuses-design.md`.

---

## File Structure

- Create: `supabase/migrations/20260604130000_participation_refusal_note.sql` — ajoute la colonne.
- Modify: `src/types/supabase.ts` — `refusal_note: string | null` sur participations (Row/Insert/Update).
- Modify: `src/lib/cockpit.ts` — `selectRefusedDossiers`.
- Test: `src/lib/cockpit.test.ts` — test du sélecteur.
- Create: `src/components/cockpit/DossiersRefuses.tsx` — section repliable + ligne éditable.
- Modify: `src/pages/Cockpit.tsx` — câble la section.
- Modify: `src/components/events/EventDashboard.tsx` — champ note à chaud.
- Modify: `src/pages/Cockpit.css` + `src/pages/EventPage.css` — styles (tokens DA).

---

### Task 1: Migration colonne `refusal_note`

**Files:** Create `supabase/migrations/20260604130000_participation_refusal_note.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- #8 Dossiers refusés : raison du refus, 1:1 avec la participation, éditable.
-- Nullable, hérite des RLS existantes de participations. Idempotent.
ALTER TABLE participations ADD COLUMN IF NOT EXISTS refusal_note text;
```

- [ ] **Step 2: Appliquer en prod (non-interactif)**

```bash
export SUPABASE_ACCESS_TOKEN="$(grep '^SUPABASE_ACCESS_TOKEN=' .env | sed 's/^SUPABASE_ACCESS_TOKEN=//; s/\r$//; s/^"//; s/"$//')"
export SUPABASE_DB_PASSWORD="$(grep '^SUPABASE_DB_PASSWORD=' .env | sed 's/^SUPABASE_DB_PASSWORD=//; s/\r$//; s/^"//; s/"$//')"
echo "y" | npx --no-install supabase db push --linked
```
Expected: `Applying migration 20260604130000_participation_refusal_note.sql... Finished`.

- [ ] **Step 3: Types — éditer `src/types/supabase.ts`** (3 occurrences dans le bloc `participations`)

Ajouter `refusal_note: string | null` (Row) et `refusal_note?: string | null` (Insert, Update), à côté de `payment_status`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260604130000_participation_refusal_note.sql src/types/supabase.ts
git commit -m "feat(db): participations.refusal_note (#8 dossiers refusés)"
```

---

### Task 2: Sélecteur pur `selectRefusedDossiers` (TDD)

**Files:** Modify `src/lib/cockpit.ts` · Test `src/lib/cockpit.test.ts`

- [ ] **Step 1: Test (RED)** — ajouter dans `cockpit.test.ts`, importer `selectRefusedDossiers`

```ts
describe('selectRefusedDossiers', () => {
  it('ne garde que les refusés, triés par fin décroissante', () => {
    const parts = [
      part('1', '2026-04-01', '2026-04-02', 'refuse'),
      part('2', '2026-05-01', '2026-05-02', 'inscrit'),
      part('3', '2026-03-01', '2026-03-02', 'refuse'),
    ]
    expect(selectRefusedDossiers(parts).map(p => p.id)).toEqual(['1', '3'])
  })
  it('ignore les participations sans events', () => {
    const parts = [{ id: 'x', status: 'refuse', events: null }] as unknown as ParticipationWithEvent[]
    expect(selectRefusedDossiers(parts)).toEqual([])
  })
})
```

- [ ] **Step 2: Run RED** — `pnpm vitest run src/lib/cockpit.test.ts` → FAIL (`selectRefusedDossiers is not a function`)

- [ ] **Step 3: Implémenter dans `cockpit.ts`**

```ts
/** Dossiers refusés de l'acteur (statut 'refuse'), triés du plus récemment terminé au plus ancien (#8). */
export function selectRefusedDossiers(parts: ParticipationWithEvent[]): ParticipationWithEvent[] {
  return parts
    .filter(p => p.events && (p.status as string) === 'refuse')
    .sort((a, b) => new Date(b.events.end_date).getTime() - new Date(a.events.end_date).getTime())
}
```

- [ ] **Step 4: Run GREEN** — `pnpm vitest run src/lib/cockpit.test.ts` → PASS

- [ ] **Step 5: Commit** — `git commit -am "feat(cockpit): selectRefusedDossiers + tests"`

---

### Task 3: Saisie à chaud dans `EventDashboard`

**Files:** Modify `src/components/events/EventDashboard.tsx` · `src/pages/EventPage.css`

- [ ] **Step 1: État local + sauvegarde** — dans le composant, après `const [infoBox, ...]`

```tsx
const [refusalNote, setRefusalNote] = useState((participation?.refusal_note as string | null) ?? '')
// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(() => { setRefusalNote((participation?.refusal_note as string | null) ?? '') }, [participation?.id])

const saveRefusalNote = async () => {
  if (!participation) return
  const cur = (participation.refusal_note as string | null) ?? ''
  if (cur === refusalNote.trim()) return
  const { data } = await updateParticipation(participation.id, { refusal_note: refusalNote.trim() || null })
  if (data) onUpdate(data)
}
```

- [ ] **Step 2: Champ** — juste après le bloc du stepper de participation (après le `</div>` du `event-suivi-block` Participation, avant le bloc Paiement)

```tsx
{(participation?.status as string) === 'refuse' && (
  <div className="event-suivi-block">
    <div className="event-suivi-block-label">Pourquoi ce refus ? (optionnel)</div>
    <textarea
      className="event-refusal-note"
      value={refusalNote}
      onChange={e => setRefusalNote(e.target.value)}
      onBlur={saveRefusalNote}
      placeholder="Ex : trop cher, dates en conflit, pas le bon public…"
      rows={2}
    />
  </div>
)}
```

- [ ] **Step 3: CSS** — ajouter à `EventPage.css`

```css
.event-refusal-note {
  width: 100%;
  resize: vertical;
  border-radius: 12px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  padding: 8px 10px;
  font-family: var(--font-body);
  font-size: 14px;
}
.event-refusal-note:focus { outline: none; border-color: var(--copper); }
```

- [ ] **Step 4: Build** — `pnpm build` → OK (tsc voit `refusal_note` grâce à Task 1 Step 3)

- [ ] **Step 5: Commit** — `git commit -am "feat(event): note de refus à chaud sous le stepper (#8)"`

---

### Task 4: Section Cockpit `DossiersRefuses`

**Files:** Create `src/components/cockpit/DossiersRefuses.tsx` · Modify `src/pages/Cockpit.tsx` · `src/pages/Cockpit.css`

- [ ] **Step 1: Composant** — `src/components/cockpit/DossiersRefuses.tsx`

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { XCircle, ChevronDown } from 'lucide-react'
import { eventPath } from '@/lib/event-link'
import { updateParticipation } from '@/hooks/use-participations'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]  // déjà filtrés 'refuse'
  onUpdated: () => void
}

function RefuseRow({ p, onUpdated }: { p: ParticipationWithEvent; onUpdated: () => void }) {
  const ev = p.events
  const [note, setNote] = useState((p.refusal_note as string | null) ?? '')
  const save = async () => {
    if (((p.refusal_note as string | null) ?? '') === note.trim()) return
    const { data } = await updateParticipation(p.id, { refusal_note: note.trim() || null })
    if (data) onUpdated()
  }
  return (
    <li className="ck-refuse-row">
      <Link to={eventPath(ev)} className="ck-refuse-link">
        <b>{ev.name}</b>
        <small>{ev.city} · {new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
      </Link>
      <textarea
        className="ck-refuse-note"
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={save}
        placeholder="Pourquoi ce refus ? (optionnel)"
        rows={2}
      />
    </li>
  )
}

export function DossiersRefuses({ participations, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  if (participations.length === 0) return null
  return (
    <div className="ck-card ck-refuses">
      <button className="ck-refuses-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="ck-refuses-title"><span className="ck-ic"><XCircle strokeWidth={1.8} /></span>Dossiers refusés ({participations.length})</span>
        <ChevronDown className={'ck-refuses-chev' + (open ? ' open' : '')} strokeWidth={2} />
      </button>
      {open && (
        <ul className="ck-list ck-refuses-list">
          {participations.map(p => <RefuseRow key={p.id} p={p} onUpdated={onUpdated} />)}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Câbler dans `Cockpit.tsx`** — import + sélecteur + rendu

```tsx
// imports
import { DossiersRefuses } from '@/components/cockpit/DossiersRefuses'
// dans la liste d'import de '@/lib/cockpit' : ajouter selectRefusedDossiers
// après les autres useMemo :
const refused = useMemo(() => selectRefusedDossiers(participations), [participations])
```

Rendu : juste APRÈS la fermeture de `<div className="ck-cols">…</div>`, dans le fragment `<>…</>` :

```tsx
<DossiersRefuses participations={refused} onUpdated={refetch} />
```

- [ ] **Step 3: CSS** — ajouter à `Cockpit.css`

```css
.ck-refuses { margin-top: 18px; }
.ck-refuses-head {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  background: none; border: none; cursor: pointer; padding: 0; color: inherit;
}
.ck-refuses-title { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-heading); font-weight: 700; font-size: 15px; }
.ck-refuses-chev { width: 18px; height: 18px; transition: transform 0.18s ease; color: hsl(var(--muted-foreground)); }
.ck-refuses-chev.open { transform: rotate(180deg); }
.ck-refuses-list { margin-top: 12px; }
.ck-refuse-row { display: flex; flex-direction: column; gap: 6px; padding: 10px 0; border-bottom: 1px solid hsl(var(--border)); }
.ck-refuse-row:last-child { border-bottom: none; }
.ck-refuse-link { display: flex; flex-direction: column; text-decoration: none; color: hsl(var(--foreground)); }
.ck-refuse-link small { color: hsl(var(--muted-foreground)); font-size: 12px; }
.ck-refuse-note {
  width: 100%; resize: vertical; border-radius: 10px; border: 1px solid hsl(var(--border));
  background: hsl(var(--background)); color: hsl(var(--foreground)); padding: 7px 9px;
  font-family: var(--font-body); font-size: 13px;
}
.ck-refuse-note:focus { outline: none; border-color: var(--copper); }
```

- [ ] **Step 4: Vérif complète** — `pnpm vitest run` (tous verts) ; `pnpm lint` (0 nouveau warning) ; `pnpm build` (OK)

- [ ] **Step 5: Bump version + changelog + commit + push**

```
package.json 0.7.216 -> 0.7.217
changelog.ts : nouvelle entrée 0.7.217 « Dossiers refusés — revois tes refus et note pourquoi »
git commit -am "feat(cockpit): section Dossiers refusés + note du pourquoi (#8) (v0.7.217)" && git push
```

---

## Self-Review

- **Spec coverage :** colonne refusal_note (T1), capture à chaud EventDashboard (T3), section repliable Cockpit voir+note+lien (T4), sélecteur pur testé (T2), masqué si vide (DossiersRefuses early-return), replié par défaut (`open=false`). ✓
- **Types :** `selectRefusedDossiers` signature identique T2/T4 ; `refusal_note` ajouté aux types en T1 avant usage T3/T4. ✓
- **Placeholders :** aucun — code complet à chaque étape. ✓
- **DA jour/nuit :** styles en tokens `hsl(var(--…))`, pas de couleur en dur (cf. reference_da_daynight_gotchas). ✓
