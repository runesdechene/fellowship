# Participation System Refonte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte du système de participation (nouveaux statuts exposant + public, suivi paiement multi-versements) et réorganisation des notifications liées aux événements.

**Architecture:** Migration DB pour modifier l'enum `participation_status` (`interesse`/`en_cours`/`inscrit`), ajout colonnes paiement (`total_cost`/`payments` JSONB). Nouveaux triggers pour notifier uniquement les participants d'un event modifié. UI exposant avec progression linéaire + suivi paiement. UI public simplifiée (intéressé / j'y vais).

**Tech Stack:** Supabase (PostgreSQL), React 19, TypeScript 5.9, Tailwind CSS v4

---

### Task 1: Migration DB — Refonte enum + colonnes paiement

**Files:**
- Create: `supabase/migrations/20260406120000_participation_refonte.sql`
- Modify: `src/types/supabase.ts`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Create migration SQL**

```sql
-- supabase/migrations/20260406120000_participation_refonte.sql

-- 1. Add new enum values to participation_status
ALTER TYPE participation_status ADD VALUE IF NOT EXISTS 'en_cours';

-- 2. Migrate existing 'confirme' to 'inscrit' 
UPDATE participations SET status = 'inscrit' WHERE status = 'confirme';

-- 3. Add payment tracking columns
ALTER TABLE participations ADD COLUMN IF NOT EXISTS total_cost NUMERIC;
ALTER TABLE participations ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]';

-- 4. Update RLS to include 'en_cours' visibility (same rules as 'interesse')
DROP POLICY IF EXISTS "participations_select" ON participations;

CREATE POLICY "participations_select" ON participations
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR status = 'inscrit'
    OR (status IN ('interesse', 'en_cours') AND are_friends(auth.uid(), user_id))
    OR visibility = 'public'
    OR (visibility = 'amis' AND are_friends(auth.uid(), user_id))
  );
```

- [ ] **Step 2: Update TypeScript types in `src/types/supabase.ts`**

In the `participation_status` enum type (union form ~line 500):
```typescript
participation_status: "interesse" | "en_cours" | "inscrit"
```

In the array form (~line 643):
```typescript
participation_status: ["interesse", "en_cours", "inscrit"],
```

In the `participations` Row type, add:
```typescript
total_cost: number | null
payments: { amount: number; date: string; label: string }[] | null
```

In the `participations` Insert type, add:
```typescript
total_cost?: number | null
payments?: { amount: number; date: string; label: string }[] | null
```

In the `participations` Update type, add:
```typescript
total_cost?: number | null
payments?: { amount: number; date: string; label: string }[] | null
```

- [ ] **Step 3: Add PaymentEntry type in `src/types/database.ts`**

```typescript
export interface PaymentEntry {
  amount: number
  date: string
  label: string
}
```

- [ ] **Step 4: Push migration**

Run: `npx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 5: Build check**

Run: `pnpm build`
Expected: Build passes (no TS errors from type changes since existing code uses `'confirme'` which we'll fix in Task 3).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260406120000_participation_refonte.sql src/types/supabase.ts src/types/database.ts
git commit -m "feat: refonte participation — new enum (en_cours), payment columns, updated types"
```

---

### Task 2: Migration DB — Notification triggers for event participants

**Files:**
- Create: `supabase/migrations/20260406120001_participant_notification_triggers.sql`

The goal: when an event is updated (name, dates, city, etc.), notify only users who have a participation on that event — NOT everyone.

- [ ] **Step 1: Create migration SQL**

```sql
-- supabase/migrations/20260406120001_participant_notification_triggers.sql

-- Notify participants when an event is updated
CREATE OR REPLACE FUNCTION notify_event_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant RECORD;
  updater_name text;
  updater_avatar text;
BEGIN
  -- Only fire on meaningful changes (not just timestamps)
  IF OLD.name = NEW.name
    AND OLD.city = NEW.city
    AND OLD.department = NEW.department
    AND OLD.start_date = NEW.start_date
    AND OLD.end_date = NEW.end_date
    AND OLD.description IS NOT DISTINCT FROM NEW.description
    AND OLD.registration_deadline IS NOT DISTINCT FROM NEW.registration_deadline
    AND OLD.registration_url IS NOT DISTINCT FROM NEW.registration_url
    AND OLD.external_url IS NOT DISTINCT FROM NEW.external_url
    AND OLD.image_url IS NOT DISTINCT FROM NEW.image_url
  THEN
    RETURN NEW;
  END IF;

  -- Get updater info (current user)
  SELECT COALESCE(brand_name, display_name, 'Quelqu''un'), avatar_url
    INTO updater_name, updater_avatar
    FROM profiles WHERE id = auth.uid();

  -- Notify all participants except the updater
  FOR participant IN
    SELECT DISTINCT user_id FROM participations WHERE event_id = NEW.id AND user_id != auth.uid()
  LOOP
    INSERT INTO notifications (user_id, type, data)
    VALUES (
      participant.user_id,
      'event_updated',
      jsonb_build_object(
        'actor_id', auth.uid(),
        'actor_name', updater_name,
        'actor_avatar_url', updater_avatar,
        'event_id', NEW.id,
        'event_name', NEW.name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_updated ON events;
CREATE TRIGGER on_event_updated
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_updated();

-- Reclassify: event_created broadcast stays as-is (activity feed)
-- event_updated now only targets participants (personal notification)
```

- [ ] **Step 2: Push migration**

Run: `npx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260406120001_participant_notification_triggers.sql
git commit -m "feat: event_updated notifies only participants, not everyone"
```

---

### Task 3: Reclassify notification types — event_updated to personal

**Files:**
- Modify: `src/hooks/use-notifications.ts`

Now that `event_updated` targets participants, it's a personal notification (not activity).

- [ ] **Step 1: Move `event_updated` from ACTIVITY_TYPES to NOTIFICATION_TYPES**

In `src/hooks/use-notifications.ts`:

```typescript
// Community feed — platform-wide actions
export const ACTIVITY_TYPES = new Set([
  'event_created',
  'event_image_added',
  'event_info_added',
  'new_exposant',
])

// Personal — important to you
export const NOTIFICATION_TYPES = new Set([
  'new_follower',
  'friend_going',
  'friend_note',
  'deadline_reminder',
  'event_updated',
])
```

- [ ] **Step 2: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-notifications.ts
git commit -m "refactor: event_updated is now a personal notification for participants"
```

---

### Task 4: UI — Participation exposant (progression linéaire + paiement)

**Files:**
- Modify: `src/pages/EventPage.tsx`

Replace the 3 flat buttons with a stepper UI for exposants and a simple 2-button UI for public accounts. Add payment tracking section.

- [ ] **Step 1: Replace the participation section in `EventPage.tsx`**

Find the block `{/* Participation */}` (lines ~409-438) and replace with:

```tsx
      {/* Participation */}
      {!loadingParticipation && (
        <div className="mb-6 rounded-2xl bg-card p-4">
          {participation ? (
            <div className="space-y-3">
              {/* Status stepper — exposant */}
              {isExposant ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1">
                    {(['interesse', 'en_cours', 'inscrit'] as const).map((s, i) => {
                      const labels = { interesse: 'Intéressé', en_cours: 'En cours', inscrit: 'Inscrit' }
                      const statusOrder = ['interesse', 'en_cours', 'inscrit']
                      const currentIdx = statusOrder.indexOf(participation.status)
                      const isActive = i <= currentIdx
                      const isCurrent = participation.status === s
                      return (
                        <button
                          key={s}
                          onClick={async () => {
                            const { data } = await updateParticipation(participation.id, { status: s })
                            if (data) setParticipation(data)
                          }}
                          className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : isActive
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {labels[s]}
                        </button>
                      )
                    })}
                  </div>

                  {/* Payment tracking — only when inscrit */}
                  {participation.status === 'inscrit' && (
                    <PaymentTracker participation={participation} onUpdate={setParticipation} />
                  )}
                </div>
              ) : (
                /* Public user — simple status */
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">
                    {participation.status === 'interesse' ? 'Intéressé' : 'J\'y vais !'}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  ({participation.visibility === 'prive' ? 'Privé' : participation.visibility === 'amis' ? 'Amis' : 'Public'})
                </span>
                <Button variant="outline" size="sm" onClick={handleLeave}>Retirer</Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm font-medium">Tu y vas ?</p>
              {isExposant ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleJoin('interesse', 'amis')}>Intéressé</Button>
                  <Button size="sm" variant="outline" onClick={() => handleJoin('en_cours', 'amis')}>En cours d'inscription</Button>
                  <Button size="sm" onClick={() => handleJoin('inscrit', 'amis')}>Inscrit</Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleJoin('interesse', 'amis')}>Intéressé</Button>
                  <Button size="sm" onClick={() => handleJoin('inscrit', 'public')}>J'y vais !</Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 2: Add `updateParticipation` import**

At top of `EventPage.tsx`, update the import:
```typescript
import { addParticipation, removeParticipation, updateParticipation } from '@/hooks/use-participations'
```

- [ ] **Step 3: Remove all references to `'confirme'` status in `EventPage.tsx`**

Search for `confirme` — the edit form state also references it. Remove any `confirme` references in `startEditing` or elsewhere.

- [ ] **Step 4: Add `PaymentTracker` component inline or as a separate file**

Create `src/components/events/PaymentTracker.tsx`:

```tsx
import { useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateParticipation } from '@/hooks/use-participations'
import type { Participation } from '@/types/database'
import type { PaymentEntry } from '@/types/database'

interface PaymentTrackerProps {
  participation: Participation
  onUpdate: (p: Participation) => void
}

export function PaymentTracker({ participation, onUpdate }: PaymentTrackerProps) {
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')
  const [totalCost, setTotalCost] = useState(participation.total_cost?.toString() ?? '')
  const [editingCost, setEditingCost] = useState(!participation.total_cost)

  const payments: PaymentEntry[] = (participation.payments as PaymentEntry[] | null) ?? []
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const cost = participation.total_cost ?? 0

  const handleSetCost = async () => {
    const val = parseFloat(totalCost)
    if (isNaN(val) || val <= 0) return
    const { data } = await updateParticipation(participation.id, { total_cost: val })
    if (data) { onUpdate(data); setEditingCost(false) }
  }

  const handleAddPayment = async () => {
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) return
    const newPayment: PaymentEntry = {
      amount: val,
      date: new Date().toISOString().split('T')[0],
      label: label || 'Versement',
    }
    const updated = [...payments, newPayment]
    const { data } = await updateParticipation(participation.id, { payments: updated as unknown as Participation['payments'] })
    if (data) { onUpdate(data); setAmount(''); setLabel(''); setShowForm(false) }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <Receipt className="h-3.5 w-3.5" />
        Paiement
      </div>

      {/* Total cost */}
      {editingCost ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Coût total (€)"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
            value={totalCost}
            onChange={e => setTotalCost(e.target.value)}
          />
          <Button size="sm" onClick={handleSetCost}>OK</Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-bold text-foreground">{totalPaid}€</span>
            <span className="text-muted-foreground"> / {cost}€</span>
          </div>
          <button onClick={() => setEditingCost(true)} className="text-xs text-primary hover:underline">Modifier</button>
        </div>
      )}

      {/* Progress bar */}
      {cost > 0 && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${Math.min(100, (totalPaid / cost) * 100)}%` }}
          />
        </div>
      )}

      {/* Payment list */}
      {payments.length > 0 && (
        <div className="space-y-1">
          {payments.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{p.label} — {new Date(p.date).toLocaleDateString('fr-FR')}</span>
              <span className="font-medium">{p.amount}€</span>
            </div>
          ))}
        </div>
      )}

      {/* Add payment */}
      {showForm ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Montant"
            className="w-24 rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Acompte, solde..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <Button size="sm" onClick={handleAddPayment}>OK</Button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Plus className="h-3 w-3" />
          Ajouter un versement
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Import PaymentTracker in EventPage.tsx**

```typescript
import { PaymentTracker } from '@/components/events/PaymentTracker'
```

- [ ] **Step 6: Remove `isExposant` gate on participation section**

Currently the participation section has no type gate (both exposant and public see it), but `handleJoin` is available to all. Good — no change needed, the new JSX handles both cases.

- [ ] **Step 7: Update `handleJoin` type signature**

The `handleJoin` function uses `ParticipationStatus` type. Since `'en_cours'` is now a valid value and `'confirme'` is removed, no code change needed — just ensure no `'confirme'` strings remain in EventPage.tsx.

- [ ] **Step 8: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/pages/EventPage.tsx src/components/events/PaymentTracker.tsx
git commit -m "feat: participation UI — stepper for exposants, simplified for public, payment tracker"
```

---

### Task 5: Update all remaining `'confirme'` references

**Files:**
- Modify: `src/components/calendar/CalendarMonth.tsx` (if it renders status labels)
- Modify: `src/pages/PublicProfile.tsx` (participation queries)
- Modify: `src/hooks/use-participations.ts` (if any `confirme` filters)
- Modify: `src/components/notifications/NotificationItem.tsx` (if any)

- [ ] **Step 1: Search for all `confirme` occurrences**

Run: `grep -rn "confirme" src/`

Replace every `'confirme'` with `'inscrit'` where it's a status check. Remove `confirme` from any status label rendering.

Update RLS migration reference: the new migration already handles this at DB level. Frontend just needs to stop using `'confirme'`.

- [ ] **Step 2: Update `src/pages/PublicProfile.tsx`** if it filters by status

Currently the RLS handles visibility — no explicit `confirme` filter in the frontend query. Check and clean up any display labels.

- [ ] **Step 3: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "refactor: remove all 'confirme' status references, use 'inscrit' instead"
```

---

### Task 6: Update CalendarMonth and other status displays

**Files:**
- Modify: `src/components/calendar/CalendarMonth.tsx`
- Modify: `src/components/calendar/MonthCell.tsx`
- Modify: `src/hooks/use-calendar.ts`

- [ ] **Step 1: Check CalendarMonth for status rendering**

Read `src/components/calendar/CalendarMonth.tsx` and `MonthCell.tsx`. If they show participation status labels or colors based on `'confirme'`, update to use `'inscrit'` and add `'en_cours'`.

Status label map should be:
```typescript
const STATUS_LABELS: Record<string, string> = {
  interesse: 'Intéressé',
  en_cours: 'En cours',
  inscrit: 'Inscrit',
}
```

- [ ] **Step 2: Update `use-calendar.ts`**

The `CalendarEvent` interface has `status: string`. No type change needed, but verify the hook correctly passes the status through.

- [ ] **Step 3: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar/ src/hooks/use-calendar.ts
git commit -m "refactor: calendar components use new participation statuses"
```

---

### Task 7: Final build + push migrations

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: PASS with no TypeScript errors.

- [ ] **Step 2: Push all new migrations**

Run: `npx supabase db push`
Expected: All pending migrations applied.

- [ ] **Step 3: Final commit if any remaining changes**

```bash
git add -u
git commit -m "feat: participation refonte complete — new statuses, payment tracking, participant notifications"
```
