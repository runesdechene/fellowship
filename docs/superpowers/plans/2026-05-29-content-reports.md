# Content Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Séparer les bilans post-festival (privés) des vrais signalements (admin), créer `content_reports` + UI signaler + refonte AdminReports + badge sidebar.

**Architecture:** Drop policies admin sur `event_reports` → bilan strictement privé. Nouvelle table `content_reports` (RLS : insert authentifié, lecture admin). Modale signaler ouvrable sur event/profile. AdminReports refait pour lire `content_reports`. Sidebar lit count pending pour badge rouge sur Admin.

**Tech Stack:** React 19, TypeScript, Vite, Supabase (Postgres + RLS), Tailwind v4, vitest pour TDD pures.

**Spec :** `docs/superpowers/specs/2026-05-29-content-reports-design.md`

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/<ts>_content_reports.sql` | Drop 3 policies admin event_reports + create content_reports + RLS |
| `src/types/supabase.ts` | Étendre avec content_reports Row/Insert/Update |
| `src/lib/content-reports.ts` | Fonctions pures : canReport, formatReason, REPORT_REASONS |
| `src/lib/content-reports.test.ts` | Tests TDD |
| `src/hooks/use-content-reports.ts` | createContentReport, useAdminReports, useAdminPendingReportsCount, resolveReport |
| `src/components/reports/ReportContentModal.tsx` | Modale signalement |
| `src/components/reports/ReportButton.tsx` | Bouton icône Flag qui ouvre la modale |
| `src/components/admin/AdminReports.tsx` | Refonte : lit content_reports, onglets, actions |
| `src/components/admin/ResolveReportModal.tsx` | Modale pour résoudre/rejeter avec admin_note |
| `src/pages/EventPage.tsx` | Ajoute ReportButton dans .fest-hactions |
| `src/pages/PublicProfile.tsx` | Ajoute ReportButton dans le hero |
| `src/components/layout/Sidebar.tsx` | useAdminPendingReportsCount + .navbadge sur lien Admin |

---

## Task 1: Migration DB + types

**Files:**
- Create: `supabase/migrations/<ts>_content_reports.sql`
- Modify: `src/types/supabase.ts`

- [ ] **Step 1: Écrire la migration**

```sql
-- Drop les policies admin sur event_reports → bilan redevient privé à son auteur
drop policy if exists admin_select_reports on public.event_reports;
drop policy if exists admin_update_reports on public.event_reports;
drop policy if exists admin_delete_reports on public.event_reports;

-- Nouvelle table content_reports pour vrais signalements (modération admin)
create table public.content_reports (
  id                     uuid primary key default gen_random_uuid(),
  reporter_actor_id      uuid not null references public.actors(id) on delete set null,
  reporter_auth_id       uuid not null references auth.users(id)   on delete set null,
  target_type            text not null check (target_type in ('event', 'profile')),
  target_id              uuid not null,
  reason                 text not null check (reason in ('spam', 'inapproprie', 'info_erronee', 'doublon')),
  comment                text,
  status                 text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  admin_note             text,
  resolved_at            timestamptz,
  resolved_by_actor_id   uuid references public.actors(id) on delete set null,
  created_at             timestamptz not null default now()
);

create index idx_content_reports_status on public.content_reports (status);
create index idx_content_reports_target on public.content_reports (target_type, target_id);
create index idx_content_reports_created_at on public.content_reports (created_at desc);

alter table public.content_reports enable row level security;

create policy content_reports_insert_authenticated on public.content_reports
  for insert with check (reporter_auth_id = auth.uid());

create policy content_reports_select_admin on public.content_reports
  for select using (
    coalesce(
      (select role = 'admin' from public.profiles where id = auth.uid()),
      (select role = 'admin' from public.users where auth_id = auth.uid()),
      false
    )
  );

create policy content_reports_update_admin on public.content_reports
  for update using (
    coalesce(
      (select role = 'admin' from public.profiles where id = auth.uid()),
      (select role = 'admin' from public.users where auth_id = auth.uid()),
      false
    )
  );

create policy content_reports_delete_admin on public.content_reports
  for delete using (
    coalesce(
      (select role = 'admin' from public.profiles where id = auth.uid()),
      (select role = 'admin' from public.users where auth_id = auth.uid()),
      false
    )
  );
```

- [ ] **Step 2: Appliquer la migration** via MCP `apply_migration` (name `content_reports`).

- [ ] **Step 3: Vérifier en DB**

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('event_reports', 'content_reports')
ORDER BY tablename, policyname;
```
Attendu : `event_reports` n'a plus que les policies owner (event_reports_write_actor, event_reports_owner_only). `content_reports` a 4 policies.

- [ ] **Step 4: Étendre `src/types/supabase.ts`**

Ajouter dans `Database['public']['Tables']` :

```ts
content_reports: {
  Row: {
    id: string
    reporter_actor_id: string
    reporter_auth_id: string
    target_type: string
    target_id: string
    reason: string
    comment: string | null
    status: string
    admin_note: string | null
    resolved_at: string | null
    resolved_by_actor_id: string | null
    created_at: string
  }
  Insert: {
    id?: string
    reporter_actor_id: string
    reporter_auth_id: string
    target_type: string
    target_id: string
    reason: string
    comment?: string | null
    status?: string
    admin_note?: string | null
    resolved_at?: string | null
    resolved_by_actor_id?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    reporter_actor_id?: string
    reporter_auth_id?: string
    target_type?: string
    target_id?: string
    reason?: string
    comment?: string | null
    status?: string
    admin_note?: string | null
    resolved_at?: string | null
    resolved_by_actor_id?: string | null
    created_at?: string
  }
  Relationships: []
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ src/types/supabase.ts
git commit -m "feat(reports): table content_reports + drop policies admin sur event_reports"
```

---

## Task 2: Fonctions pures (TDD)

**Files:**
- Create: `src/lib/content-reports.ts`, `src/lib/content-reports.test.ts`

- [ ] **Step 1: Écrire les tests d'abord**

```ts
// src/lib/content-reports.test.ts
import { describe, it, expect } from 'vitest'
import { canReport, formatReason, REPORT_REASONS } from './content-reports'

describe('canReport', () => {
  const me = { kind: 'person' as const, id: 'me-id' }
  it('false si pas connecté', () => {
    expect(canReport(null, { type: 'event', ownerId: 'other' })).toBe(false)
  })
  it('false si target appartient au reporter', () => {
    expect(canReport(me, { type: 'event', ownerId: 'me-id' })).toBe(false)
  })
  it('true si connecté et target appartient à autre', () => {
    expect(canReport(me, { type: 'event', ownerId: 'other' })).toBe(true)
  })
  it('true si ownerId est null/inconnu (event sans créateur)', () => {
    expect(canReport(me, { type: 'event', ownerId: null })).toBe(true)
  })
})

describe('formatReason', () => {
  it('mappe spam → Spam ou promotion abusive', () => {
    expect(formatReason('spam')).toBe('Spam ou promotion abusive')
  })
  it('mappe inapproprie → Contenu inapproprié', () => {
    expect(formatReason('inapproprie')).toBe('Contenu inapproprié')
  })
  it('mappe info_erronee → Information erronée', () => {
    expect(formatReason('info_erronee')).toBe('Information erronée')
  })
  it('mappe doublon → Doublon', () => {
    expect(formatReason('doublon')).toBe('Doublon')
  })
  it('fallback sur la valeur si inconnue', () => {
    expect(formatReason('xyz')).toBe('xyz')
  })
})

describe('REPORT_REASONS', () => {
  it('expose la liste ordonnée pour la modale', () => {
    expect(REPORT_REASONS.map(r => r.value)).toEqual(['spam', 'inapproprie', 'info_erronee', 'doublon'])
  })
})
```

- [ ] **Step 2: Lancer** `pnpm test content-reports` → FAIL (module introuvable).

- [ ] **Step 3: Implémenter `src/lib/content-reports.ts`**

```ts
export type ReportReason = 'spam' | 'inapproprie' | 'info_erronee' | 'doublon'
export type ReportTargetType = 'event' | 'profile'
export type ReportStatus = 'pending' | 'resolved' | 'dismissed'

export const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: 'Spam ou promotion abusive' },
  { value: 'inapproprie', label: 'Contenu inapproprié' },
  { value: 'info_erronee', label: 'Information erronée' },
  { value: 'doublon', label: 'Doublon (déjà existant)' },
]

const REASON_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map(r => [r.value, r.label])
)

export function formatReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason
}

/** Décide si le current actor peut signaler ce target. */
export function canReport(
  reporter: { id: string } | null,
  target: { type: ReportTargetType; ownerId: string | null }
): boolean {
  if (!reporter) return false
  if (target.ownerId && reporter.id === target.ownerId) return false
  return true
}
```

- [ ] **Step 4: Lancer** `pnpm test content-reports` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content-reports.ts src/lib/content-reports.test.ts
git commit -m "feat(reports): fonctions pures (canReport, formatReason, REPORT_REASONS) — TDD"
```

---

## Task 3: Hook layer

**Files:**
- Create: `src/hooks/use-content-reports.ts`

- [ ] **Step 1: Implémenter**

```ts
// src/hooks/use-content-reports.ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { ReportReason, ReportStatus, ReportTargetType } from '@/lib/content-reports'

export interface ContentReport {
  id: string
  reporter_actor_id: string
  reporter_auth_id: string
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  comment: string | null
  status: ReportStatus
  admin_note: string | null
  resolved_at: string | null
  resolved_by_actor_id: string | null
  created_at: string
}

export interface CreateReportInput {
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  comment?: string
}

/** Crée un signalement pour le current actor. Retourne {ok:true} ou {ok:false, alreadyExists:true} si doublon pending. */
export async function createContentReport(input: CreateReportInput, opts: { actorId: string; authId: string }) {
  // Anti-doublon front : vérifie si l'user a déjà un report PENDING sur ce target
  const { data: existing } = await supabase
    .from('content_reports')
    .select('id')
    .eq('reporter_auth_id', opts.authId)
    .eq('target_type', input.targetType)
    .eq('target_id', input.targetId)
    .eq('status', 'pending')
    .maybeSingle()
  if (existing) return { ok: false as const, alreadyExists: true }

  const { error } = await supabase.from('content_reports').insert({
    reporter_actor_id: opts.actorId,
    reporter_auth_id: opts.authId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    comment: input.comment?.trim() || null,
  })
  if (error) return { ok: false as const, alreadyExists: false, error }
  return { ok: true as const }
}

/** Count des signalements PENDING. Admin only (RLS bloque les non-admin). */
export function useAdminPendingReportsCount() {
  const { isAdmin } = useAuth()
  const [count, setCount] = useState(0)
  const refetch = useCallback(async () => {
    if (!isAdmin) { setCount(0); return }
    const { count: c } = await supabase
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    setCount(c ?? 0)
  }, [isAdmin])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])
  return { count, refetch }
}

export interface ContentReportEnriched extends ContentReport {
  reporter_label: string | null
  reporter_avatar_url: string | null
  target_label: string
  target_url: string
}

/** Liste des signalements pour l'admin, enrichi avec reporter + target. */
export function useAdminReports(filter: ReportStatus | 'all' = 'pending') {
  const { isAdmin } = useAuth()
  const [reports, setReports] = useState<ContentReportEnriched[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!isAdmin) { setReports([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from('content_reports').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data: rows } = await q
    const list = (rows ?? []) as ContentReport[]

    // Enrich reporters via actor_public
    const reporterIds = [...new Set(list.map(r => r.reporter_actor_id))]
    let reporters: Record<string, { label: string | null; avatar_url: string | null }> = {}
    if (reporterIds.length) {
      const { data } = await supabase.from('actor_public').select('actor_id, label, avatar_url').in('actor_id', reporterIds)
      reporters = Object.fromEntries(((data ?? []) as Array<{ actor_id: string; label: string | null; avatar_url: string | null }>).map(a => [a.actor_id, { label: a.label, avatar_url: a.avatar_url }]))
    }

    // Enrich targets : event → events.name, profile → profiles.display_name
    const eventIds = list.filter(r => r.target_type === 'event').map(r => r.target_id)
    const profileIds = list.filter(r => r.target_type === 'profile').map(r => r.target_id)
    let eventsMap: Record<string, { name: string }> = {}
    let profilesMap: Record<string, { display_name: string | null; public_slug: string | null }> = {}
    if (eventIds.length) {
      const { data } = await supabase.from('events').select('id, name').in('id', eventIds)
      eventsMap = Object.fromEntries(((data ?? []) as Array<{ id: string; name: string }>).map(e => [e.id, { name: e.name }]))
    }
    if (profileIds.length) {
      const { data } = await supabase.from('profiles').select('id, display_name, public_slug').in('id', profileIds)
      profilesMap = Object.fromEntries(((data ?? []) as Array<{ id: string; display_name: string | null; public_slug: string | null }>).map(p => [p.id, { display_name: p.display_name, public_slug: p.public_slug }]))
    }

    const enriched: ContentReportEnriched[] = list.map(r => {
      const rep = reporters[r.reporter_actor_id] ?? { label: null, avatar_url: null }
      const target =
        r.target_type === 'event'
          ? { label: eventsMap[r.target_id]?.name ?? '(événement supprimé)', url: `/evenement/${r.target_id}` }
          : (() => {
              const p = profilesMap[r.target_id]
              return { label: p?.display_name ?? '(profil supprimé)', url: p?.public_slug ? `/${p.public_slug}` : `/profil` }
            })()
      return { ...r, reporter_label: rep.label, reporter_avatar_url: rep.avatar_url, target_label: target.label, target_url: target.url }
    })

    setReports(enriched)
    setLoading(false)
  }, [filter, isAdmin])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { reports, loading, refetch }
}

/** Marque un signalement comme resolved ou dismissed, avec note admin optionnelle. */
export async function resolveReport(id: string, status: 'resolved' | 'dismissed', adminNote: string | undefined, adminActorId: string) {
  const { error } = await supabase
    .from('content_reports')
    .update({
      status,
      admin_note: adminNote?.trim() || null,
      resolved_at: new Date().toISOString(),
      resolved_by_actor_id: adminActorId,
    })
    .eq('id', id)
  return { ok: !error, error }
}
```

- [ ] **Step 2: Vérifier qu'aucun lint warning** :

```bash
npx eslint src/hooks/use-content-reports.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-content-reports.ts
git commit -m "feat(reports): hooks — createContentReport, useAdminReports, useAdminPendingReportsCount, resolveReport"
```

---

## Task 4: ReportContentModal

**Files:**
- Create: `src/components/reports/ReportContentModal.tsx`
- Create: `src/components/reports/ReportContentModal.css`

- [ ] **Step 1: Implémenter le composant**

```tsx
// src/components/reports/ReportContentModal.tsx
import { useState } from 'react'
import { X, Flag, Check, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from '@/lib/content-reports'
import { createContentReport } from '@/hooks/use-content-reports'
import './ReportContentModal.css'

interface Props {
  targetType: ReportTargetType
  targetId: string
  targetLabel: string
  onClose: () => void
}

type State = 'form' | 'sending' | 'sent' | 'duplicate' | 'error'

export function ReportContentModal({ targetType, targetId, targetLabel, onClose }: Props) {
  const { user, currentActor } = useAuth()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [comment, setComment] = useState('')
  const [state, setState] = useState<State>('form')

  const title = targetType === 'event' ? 'Signaler ce festival' : 'Signaler ce profil'

  const submit = async () => {
    if (!user || !currentActor) return
    setState('sending')
    const res = await createContentReport(
      { targetType, targetId, reason, comment },
      { actorId: currentActor.id, authId: user.id }
    )
    if (res.ok) {
      setState('sent')
      setTimeout(onClose, 1800)
    } else if (res.alreadyExists) {
      setState('duplicate')
    } else {
      setState('error')
    }
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-head">
          <h2><Flag strokeWidth={1.8} /> {title}</h2>
          <button onClick={onClose} aria-label="Fermer"><X strokeWidth={1.8} /></button>
        </div>

        <p className="report-modal-target">{targetLabel}</p>

        {state === 'sent' ? (
          <div className="report-modal-success">
            <Check strokeWidth={2.2} />
            <p>Merci, l'équipe va examiner ton signalement.</p>
          </div>
        ) : state === 'duplicate' ? (
          <div className="report-modal-info">
            <AlertTriangle strokeWidth={2} />
            <p>Tu as déjà signalé ce contenu, l'équipe est dessus.</p>
            <Button onClick={onClose}>Fermer</Button>
          </div>
        ) : (
          <>
            <fieldset className="report-modal-reasons">
              <legend>Pourquoi signaler ce contenu ?</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className={reason === r.value ? 'on' : ''}>
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </fieldset>

            <label className="report-modal-comment">
              <span>Détails (facultatif)</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Précise si tu veux…"
                rows={3}
                maxLength={500}
              />
            </label>

            {state === 'error' && (
              <p className="report-modal-error">Erreur lors de l'envoi. Réessaie.</p>
            )}

            <div className="report-modal-actions">
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button onClick={submit} disabled={state === 'sending'}>
                {state === 'sending' ? 'Envoi…' : 'Envoyer le signalement'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: CSS du composant**

```css
/* src/components/reports/ReportContentModal.css */
.report-modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  background: rgba(10, 6, 5, 0.6);
  backdrop-filter: blur(4px);
  padding: 16px;
}
.report-modal {
  width: 100%; max-width: 440px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
}
.report-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px;
}
.report-modal-head h2 {
  display: flex; align-items: center; gap: 9px;
  font-family: var(--font-heading); font-weight: 800; font-size: 17px;
  color: hsl(var(--foreground));
}
.report-modal-head h2 svg { width: 18px; height: 18px; color: var(--amber); }
.report-modal-head button {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 9px;
  background: hsl(var(--secondary)); border: 1px solid hsl(var(--border));
  color: hsl(var(--muted-foreground)); cursor: pointer;
}
.report-modal-head button svg { width: 16px; height: 16px; }
.report-modal-target {
  font-size: 13px; color: hsl(var(--muted-foreground)); margin-bottom: 16px;
}

.report-modal-reasons {
  border: none; padding: 0; margin: 0 0 16px;
  display: flex; flex-direction: column; gap: 8px;
}
.report-modal-reasons legend {
  font-size: 12px; font-weight: 700; color: hsl(var(--muted-foreground));
  text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 8px;
}
.report-modal-reasons label {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  background: hsl(var(--secondary));
  border: 1px solid hsl(var(--border));
  cursor: pointer; font-size: 13.5px;
}
.report-modal-reasons label.on {
  background: color-mix(in srgb, var(--amber) 14%, transparent);
  border-color: color-mix(in srgb, var(--amber) 35%, transparent);
  color: var(--amber);
  font-weight: 600;
}
.report-modal-reasons input { accent-color: var(--amber); }

.report-modal-comment {
  display: flex; flex-direction: column; gap: 6px;
  margin-bottom: 16px;
}
.report-modal-comment span {
  font-size: 12px; font-weight: 600; color: hsl(var(--muted-foreground));
}
.report-modal-comment textarea {
  resize: vertical; min-height: 60px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: var(--font-body); font-size: 13.5px;
}
.report-modal-comment textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--amber) 40%, hsl(var(--border)));
}

.report-modal-error {
  font-size: 13px; color: var(--status-refuse); margin-bottom: 10px;
}
.report-modal-actions {
  display: flex; justify-content: flex-end; gap: 8px;
}

.report-modal-success,
.report-modal-info {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 18px 0 8px; text-align: center;
}
.report-modal-success svg {
  width: 44px; height: 44px; padding: 9px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--status-inscrit) 18%, transparent);
  color: var(--status-inscrit);
}
.report-modal-info svg {
  width: 44px; height: 44px; padding: 9px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--amber) 18%, transparent);
  color: var(--amber);
}
.report-modal-success p,
.report-modal-info p {
  font-size: 14px; color: hsl(var(--foreground));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/reports/ReportContentModal.tsx src/components/reports/ReportContentModal.css
git commit -m "feat(reports): ReportContentModal — 4 raisons + commentaire + anti-doublon"
```

---

## Task 5: ReportButton + intégration EventPage + PublicProfile

**Files:**
- Create: `src/components/reports/ReportButton.tsx`
- Modify: `src/pages/EventPage.tsx` (ajout du bouton dans `.fest-hactions`)
- Modify: `src/pages/PublicProfile.tsx` (ajout du bouton dans le hero)

- [ ] **Step 1: ReportButton**

```tsx
// src/components/reports/ReportButton.tsx
import { useState } from 'react'
import { Flag } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { canReport, type ReportTargetType } from '@/lib/content-reports'
import { ReportContentModal } from './ReportContentModal'

interface Props {
  targetType: ReportTargetType
  targetId: string
  targetLabel: string
  targetOwnerId: string | null
  className?: string
  title?: string
}

export function ReportButton({ targetType, targetId, targetLabel, targetOwnerId, className, title }: Props) {
  const { currentActor } = useAuth()
  const [open, setOpen] = useState(false)

  if (!canReport(currentActor ? { id: currentActor.id } : null, { type: targetType, ownerId: targetOwnerId })) {
    return null
  }

  return (
    <>
      <button
        className={className}
        onClick={() => setOpen(true)}
        title={title ?? 'Signaler'}
        aria-label={title ?? 'Signaler'}
      >
        <Flag strokeWidth={1.8} />
      </button>
      {open && (
        <ReportContentModal
          targetType={targetType}
          targetId={targetId}
          targetLabel={targetLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: EventPage — ajouter dans `.fest-hactions`**

Localiser dans `src/pages/EventPage.tsx` les hactions :

```tsx
<button className="fest-iconbtn" onClick={sharePage} title="Partager">
  <Share2 strokeWidth={2} />
</button>
```

Ajouter juste après le bouton site web (`<Globe>`), avant le `creator` org block :

```tsx
<ReportButton
  targetType="event"
  targetId={event.id}
  targetLabel={event.name}
  targetOwnerId={event.created_by_actor ?? null}
  className="fest-iconbtn"
  title="Signaler ce festival"
/>
```

Ajouter l'import en haut du fichier : `import { ReportButton } from '@/components/reports/ReportButton'`.

- [ ] **Step 3: PublicProfile — ajouter dans le hero**

Ouvrir `src/pages/PublicProfile.tsx`, repérer le bloc actions du hero (probablement à côté du partage / follow). Ajouter :

```tsx
<ReportButton
  targetType="profile"
  targetId={profile.id}
  targetLabel={profile.display_name ?? profile.brand_name ?? 'ce profil'}
  targetOwnerId={profile.id}
  className="pp-iconbtn"
  title="Signaler ce profil"
/>
```

Ajuster `className` au pattern d'icônes du hero PublicProfile (par ex. `pp-iconbtn` ou similaire — adapter au CSS existant). Si pas de classe d'icône similaire, créer un style inline ou ajouter une classe `.report-iconbtn` discrète dans le CSS de la page.

Import : `import { ReportButton } from '@/components/reports/ReportButton'`.

- [ ] **Step 4: Commit**

```bash
git add src/components/reports/ReportButton.tsx src/pages/EventPage.tsx src/pages/PublicProfile.tsx
git commit -m "feat(reports): ReportButton + intégration EventPage + PublicProfile"
```

---

## Task 6: Refonte AdminReports

**Files:**
- Modify: `src/components/admin/AdminReports.tsx` (refonte complète)
- Modify: `src/hooks/use-admin.ts` (retirer/ajuster `useAdminReports` legacy)
- Create: `src/components/admin/AdminReports.css`

- [ ] **Step 1: Reécrire AdminReports.tsx**

```tsx
// src/components/admin/AdminReports.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ExternalLink, Check, XCircle, Flag } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useAdminReports } from '@/hooks/use-content-reports'
import { formatReason, type ReportStatus } from '@/lib/content-reports'
import { ResolveReportModal } from './ResolveReportModal'
import './AdminReports.css'

const TABS: Array<{ key: ReportStatus | 'all'; label: string }> = [
  { key: 'pending', label: 'À traiter' },
  { key: 'resolved', label: 'Résolus' },
  { key: 'dismissed', label: 'Rejetés' },
]

export function AdminReports() {
  const navigate = useNavigate()
  const { currentActor } = useAuth()
  const [tab, setTab] = useState<ReportStatus | 'all'>('pending')
  const [resolving, setResolving] = useState<{ id: string; action: 'resolved' | 'dismissed' } | null>(null)
  const { reports, loading, refetch } = useAdminReports(tab)

  return (
    <div className="admin-reports">
      <div className="admin-reports-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={tab === t.key ? 'on' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-reports-empty"><Loader2 className="animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="admin-reports-empty"><Flag /> Aucun signalement dans cette catégorie</div>
      ) : (
        <ul className="admin-reports-list">
          {reports.map(r => (
            <li key={r.id} className="admin-report">
              <div className="admin-report-head">
                <div className="admin-report-reporter">
                  {r.reporter_avatar_url ? (
                    <img src={r.reporter_avatar_url} alt="" />
                  ) : (
                    <div className="av-fallback">{(r.reporter_label ?? '?')[0]?.toUpperCase()}</div>
                  )}
                  <span><b>{r.reporter_label ?? 'Anonyme'}</b> · {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <span className={`admin-report-reason reason-${r.reason}`}>{formatReason(r.reason)}</span>
              </div>

              <div className="admin-report-target">
                <span className="label">Cible {r.target_type === 'event' ? '· festival' : '· profil'} :</span>
                <button className="link" onClick={() => navigate(r.target_url)}>
                  {r.target_label} <ExternalLink strokeWidth={1.8} />
                </button>
              </div>

              {r.comment && (
                <p className="admin-report-comment">« {r.comment} »</p>
              )}

              {r.status === 'pending' && (
                <div className="admin-report-actions">
                  <button className="btn-resolve" onClick={() => setResolving({ id: r.id, action: 'resolved' })}>
                    <Check strokeWidth={2.2} /> Résoudre
                  </button>
                  <button className="btn-dismiss" onClick={() => setResolving({ id: r.id, action: 'dismissed' })}>
                    <XCircle strokeWidth={2.2} /> Rejeter
                  </button>
                </div>
              )}

              {r.status !== 'pending' && (
                <div className="admin-report-resolved">
                  <span className={`badge status-${r.status}`}>{r.status === 'resolved' ? 'Résolu' : 'Rejeté'}</span>
                  {r.admin_note && <p>« {r.admin_note} »</p>}
                  {r.resolved_at && <small>{new Date(r.resolved_at).toLocaleDateString('fr-FR')}</small>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {resolving && currentActor && (
        <ResolveReportModal
          reportId={resolving.id}
          action={resolving.action}
          adminActorId={currentActor.id}
          onClose={() => setResolving(null)}
          onResolved={async () => {
            setResolving(null)
            await refetch()
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: CSS admin reports**

```css
/* src/components/admin/AdminReports.css */
.admin-reports { display: flex; flex-direction: column; gap: 16px; }

.admin-reports-tabs {
  display: flex; gap: 6px;
  background: hsl(var(--card)); border: 1px solid hsl(var(--border));
  border-radius: 12px; padding: 4px; width: fit-content;
}
.admin-reports-tabs button {
  padding: 6px 14px; border-radius: 9px;
  background: transparent; border: none; cursor: pointer;
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  color: hsl(var(--muted-foreground));
}
.admin-reports-tabs button.on {
  background: hsl(var(--secondary)); color: hsl(var(--foreground));
}

.admin-reports-empty {
  padding: 60px 24px; text-align: center;
  color: hsl(var(--muted-foreground));
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.admin-reports-empty svg { width: 28px; height: 28px; }

.admin-reports-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.admin-report {
  background: hsl(var(--card)); border: 1px solid hsl(var(--border));
  border-radius: 14px; padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.admin-report-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.admin-report-reporter { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.admin-report-reporter img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.admin-report-reporter .av-fallback {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, var(--copper), var(--copper-d));
  color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center;
  font-size: 14px;
}
.admin-report-reason {
  font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 99px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.admin-report-reason.reason-spam { background: color-mix(in srgb, var(--status-refuse) 18%, transparent); color: var(--status-refuse); }
.admin-report-reason.reason-inapproprie { background: color-mix(in srgb, var(--status-refuse) 18%, transparent); color: var(--status-refuse); }
.admin-report-reason.reason-info_erronee { background: color-mix(in srgb, var(--status-apayer) 18%, transparent); color: var(--status-apayer); }
.admin-report-reason.reason-doublon { background: hsl(var(--foreground) / 0.08); color: hsl(var(--muted-foreground)); }

.admin-report-target { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.admin-report-target .label { color: hsl(var(--muted-foreground)); }
.admin-report-target .link {
  display: inline-flex; align-items: center; gap: 5px;
  background: none; border: none; cursor: pointer;
  font-weight: 600; color: var(--amber); padding: 0;
}
.admin-report-target .link:hover { text-decoration: underline; }
.admin-report-target .link svg { width: 12px; height: 12px; }

.admin-report-comment { font-size: 13px; color: hsl(var(--foreground) / 0.85); font-style: italic; }

.admin-report-actions { display: flex; gap: 8px; }
.admin-report-actions button {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 9px; border: 1px solid;
  cursor: pointer; font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
  background: transparent;
}
.admin-report-actions .btn-resolve {
  color: var(--status-inscrit); border-color: color-mix(in srgb, var(--status-inscrit) 40%, transparent);
}
.admin-report-actions .btn-resolve:hover { background: color-mix(in srgb, var(--status-inscrit) 14%, transparent); }
.admin-report-actions .btn-dismiss {
  color: var(--status-refuse); border-color: color-mix(in srgb, var(--status-refuse) 40%, transparent);
}
.admin-report-actions .btn-dismiss:hover { background: color-mix(in srgb, var(--status-refuse) 14%, transparent); }
.admin-report-actions button svg { width: 14px; height: 14px; }

.admin-report-resolved { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 12.5px; color: hsl(var(--muted-foreground)); }
.admin-report-resolved .badge { padding: 3px 9px; border-radius: 99px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
.admin-report-resolved .badge.status-resolved { background: color-mix(in srgb, var(--status-inscrit) 18%, transparent); color: var(--status-inscrit); }
.admin-report-resolved .badge.status-dismissed { background: hsl(var(--foreground) / 0.08); color: hsl(var(--muted-foreground)); }
.admin-report-resolved p { font-style: italic; }
```

- [ ] **Step 3: Nettoyer `use-admin.ts` legacy**

Ouvrir `src/hooks/use-admin.ts`, supprimer (ou marquer `@deprecated`) la fonction `useAdminReports` qui pointait sur `event_reports`. Si elle est exportée uniquement pour l'ancien `AdminReports.tsx`, on peut la retirer.

```bash
grep -n "useAdminReports" src/hooks/use-admin.ts
```

Supprimer l'export et la fonction si plus aucun appel. Vérifier ensuite :

```bash
grep -rn "from '@/hooks/use-admin'" src/ | grep -v useAdminReports
```

S'assurer qu'aucun import ne casse.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminReports.tsx src/components/admin/AdminReports.css src/hooks/use-admin.ts
git commit -m "feat(reports): refonte AdminReports — lit content_reports + onglets pending/resolved/dismissed"
```

---

## Task 7: ResolveReportModal

**Files:**
- Create: `src/components/admin/ResolveReportModal.tsx`

- [ ] **Step 1: Implémenter**

```tsx
// src/components/admin/ResolveReportModal.tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveReport } from '@/hooks/use-content-reports'

interface Props {
  reportId: string
  action: 'resolved' | 'dismissed'
  adminActorId: string
  onClose: () => void
  onResolved: () => void | Promise<void>
}

export function ResolveReportModal({ reportId, action, adminActorId, onClose, onResolved }: Props) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const title = action === 'resolved' ? 'Résoudre ce signalement' : 'Rejeter ce signalement'
  const cta = action === 'resolved' ? 'Marquer comme résolu' : 'Rejeter'

  const submit = async () => {
    setSaving(true)
    const res = await resolveReport(reportId, action, note, adminActorId)
    setSaving(false)
    if (res.ok) await onResolved()
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-head">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Fermer"><X strokeWidth={1.8} /></button>
        </div>
        <label className="report-modal-comment">
          <span>Note admin (facultatif)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Action prise, contexte, etc. — pour traçage interne"
            rows={3}
            maxLength={500}
          />
        </label>
        <div className="report-modal-actions">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '…' : cta}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

Réutilise les styles `.report-modal-*` déjà définis dans `ReportContentModal.css` (importé via le path commun ou par AdminReports.css).

- [ ] **Step 2: S'assurer que les styles de modale sont disponibles**

Vérifier que `report-modal-overlay` etc. sont importés. Soit on importe `ReportContentModal.css` depuis `AdminReports.tsx` au début, soit on duplique les styles minimaux dans `AdminReports.css`. Solution simple : importer le CSS de la modale signaler :

Ajouter en haut de `AdminReports.tsx` (ou de `ResolveReportModal.tsx`) :
```tsx
import '@/components/reports/ReportContentModal.css'
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ResolveReportModal.tsx src/components/admin/AdminReports.tsx
git commit -m "feat(reports): ResolveReportModal — saisie admin_note + update status"
```

---

## Task 8: Badge sidebar Admin

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Brancher le hook + rendre le badge**

Ouvrir `src/components/layout/Sidebar.tsx`. Ajouter l'import :

```tsx
import { useAdminPendingReportsCount } from '@/hooks/use-content-reports'
```

Dans le composant, après la ligne qui calcule `myDatesCount`, ajouter :

```tsx
const { count: pendingReportsCount } = useAdminPendingReportsCount()
```

Localiser le NavLink Admin (conditionnel `{isAdmin && ...}`). Le modifier ainsi :

```tsx
{isAdmin && (
  <NavLink to="/admin" title={collapsed ? 'Admin' : undefined} className={({ isActive }) => (isActive ? 'active' : '')}>
    <Shield strokeWidth={2} />
    <span className="navlabel">Admin</span>
    {pendingReportsCount > 0 && <span className="navbadge">{pendingReportsCount}</span>}
  </NavLink>
)}
```

`.navbadge` classe est déjà définie dans Sidebar.css (rouge `#e5484d`).

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(reports): badge rouge sur l'entrée Admin avec count des signalements pending"
```

---

## Task 9: Vérification finale + bump + push + code-review

- [ ] **Step 1: Build + lint**

```bash
pnpm build
pnpm lint
pnpm test
```
Tout vert.

- [ ] **Step 2: Test manuel rapide**

- Se connecter en tant qu'utilisateur lambda (non-admin)
- Aller sur la page d'un festival d'un autre user → cliquer Flag → modale s'ouvre → choisir Spam + commentaire → envoyer → confirmation
- Re-tenter sur le même festival → modale dit « déjà signalé »
- Se connecter en admin → /admin/reports → voir le signalement, le résoudre avec note
- Vérifier que le badge sidebar disparaît une fois traité
- Sur une page exposant Pro, vérifier que le bilan post-festival fonctionne TOUJOURS pour l'auteur, mais n'apparaît PLUS dans AdminReports

- [ ] **Step 3: Bump version + push**

```bash
# bump package.json patch
sed -i 's/"version": "0.7.X"/"version": "0.7.X+1"/' package.json
git add package.json
git commit -m "chore: bump version content-reports"
git push origin feat/da-nuit-festival-socle
```

- [ ] **Step 4: Code review**

Lancer la skill `code-review` (effort medium) sur le diff de la feature :

```bash
git diff main..HEAD -- src/lib/content-reports.ts src/hooks/use-content-reports.ts src/components/reports/ src/components/admin/AdminReports.tsx src/components/admin/ResolveReportModal.tsx src/pages/EventPage.tsx src/pages/PublicProfile.tsx src/components/layout/Sidebar.tsx supabase/migrations/*content_reports*
```

Corriger les findings bloquants.

---

## Self-Review (vs spec)

- **§3.1 drop policies admin event_reports** → Task 1 ✓
- **§3.2 create content_reports table** → Task 1 ✓
- **§3.3 RLS content_reports** → Task 1 ✓
- **§3.4 types TypeScript** → Task 1 ✓
- **§4 architecture & fichiers** → Tasks 1-8 ✓ (tous les fichiers de la spec sont créés/modifiés)
- **§5.1 ReportButton sur Event et Profile** → Task 5 ✓
- **§5.2 ReportContentModal** (4 raisons, commentaire, anti-doublon, confirmation, error) → Tasks 3+4 ✓
- **§6 AdminReports onglets + actions** → Task 6 ✓
- **§6.3 ResolveReportModal admin_note** → Task 7 ✓
- **§7 Badge sidebar (hook + render + classe navbadge + collapsed)** → Task 8 ✓ (collapsed naturellement géré car navlabel hidden via CSS existant)
- **§8 Sécurité — RLS** → Task 1 ✓
- **§9 Cas limites — non auth, auto-signal, doublons** → Tasks 2 (canReport) + 3 (anti-doublon createReport) ✓
- **§10 Tests pure functions** → Task 2 ✓
- **§12 vérification finale** → Task 9 ✓

Signatures cohérentes entre tâches :
- `createContentReport(input, opts)` retourne `{ok: true} | {ok: false, alreadyExists?: boolean}` (Task 3 → Task 4 utilisation cohérente).
- `resolveReport(id, status, adminNote, adminActorId)` (Task 3 → Task 7 cohérent).
- `useAdminReports(filter)` retourne `{reports: ContentReportEnriched[], loading, refetch}` (Task 3 → Task 6 cohérent).
- `useAdminPendingReportsCount()` retourne `{count, refetch}` (Task 3 → Task 8 cohérent).
- Types `ReportReason`, `ReportTargetType`, `ReportStatus` partagés (Task 2 → tous).

Pas de placeholder. Tous les noms de fichiers, fonctions, props, classes CSS sont concrets. Plan complet et exécutable.
