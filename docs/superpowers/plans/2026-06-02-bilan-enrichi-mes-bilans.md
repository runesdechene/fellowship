# Bilan enrichi + section « Mes bilans » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir le bilan post-festival (note libre + photos souvenir privées) et ajouter une section « Mes bilans » au Cockpit pour consulter ses festivals passés et leurs bilans.

**Architecture:** Une migration ajoute `note` + `media_paths` à `event_reports` et crée un bucket privé `bilan-media` (RLS owner-only, URLs signées). Un helper `bilan-media.ts` isole la plomberie storage. `EventReportForm` gagne note + photos (et perd « Points forts »). Une fonction pure `buildPastBilans` (testée) alimente le composant `MesBilans` monté dans le Cockpit.

**Tech Stack:** React 19 + TS, Vite, Vitest, Supabase (Postgres + Storage), supabase-js, `compress-image.ts` existant.

**Spec :** `docs/superpowers/specs/2026-06-02-bilan-enrichi-mes-bilans-design.md`

---

## File Structure

**Créés :**
- `supabase/migrations/20260602180000_bilan_note_media.sql` — colonnes `note`/`media_paths` + bucket `bilan-media` + policies.
- `src/lib/bilan-media.ts` — helpers storage (upload compressé, URLs signées, suppression).
- `src/lib/cockpit-bilans.ts` — fonctions pures `bilanProfit` + `buildPastBilans`.
- `src/lib/cockpit-bilans.test.ts` — tests.
- `src/components/cockpit/MesBilans.tsx` — module « Mes bilans ».

**Modifiés :**
- `src/hooks/use-reports.ts` — `useMyReports()` + `saveEventReport` persiste note/media_paths.
- `src/components/reports/EventReportForm.tsx` — note + photos, retrait de « Points forts ».
- `src/pages/Cockpit.tsx` — monte `<MesBilans>` en colonne 3.
- `src/pages/Cockpit.css` — styles du module.
- `src/types/supabase.ts` — régénéré après migration (note/media_paths typés).

---

## Task 1: Migration DB (colonnes + bucket privé + policies)

**Files:**
- Create: `supabase/migrations/20260602180000_bilan_note_media.sql`
- Modify (régénéré): `src/types/supabase.ts`

- [ ] **Step 1: Écrire la migration**

Create `supabase/migrations/20260602180000_bilan_note_media.sql`:

```sql
-- Bilan enrichi : note libre + photos souvenir privées.
ALTER TABLE event_reports ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE event_reports ADD COLUMN IF NOT EXISTS media_paths TEXT[] NOT NULL DEFAULT '{}';

-- Bucket PRIVÉ dédié aux médias de bilan (le bilan est « visible uniquement par toi »).
INSERT INTO storage.buckets (id, name, public)
  VALUES ('bilan-media', 'bilan-media', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

-- Policies owner-only (modèle acteur, comme entity-gallery). 1er segment du path = actor_id.
CREATE POLICY "bilan_media_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bilan-media' AND can_act_as(((storage.foldername(name))[1])::uuid));

CREATE POLICY "bilan_media_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bilan-media' AND can_act_as(((storage.foldername(name))[1])::uuid));

CREATE POLICY "bilan_media_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'bilan-media' AND can_act_as(((storage.foldername(name))[1])::uuid));

CREATE POLICY "bilan_media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'bilan-media' AND can_act_as(((storage.foldername(name))[1])::uuid));
```

- [ ] **Step 2: Pousser la migration**

Run: `npx supabase db push` (ou le binaire direct si `npx` échoue — cf. mémoire `reference_supabase_cli` : binaire Supabase CLI en chemin direct sur Windows).
Expected: la migration `20260602180000_bilan_note_media` est appliquée sans erreur.
Si `db push` saute la migration (divergence), suivre `reference_supabase_migration_repair` (migration repair --status). Si l'accès DB n'est pas disponible dans l'environnement, reporter **BLOCKED** (la suite a besoin des colonnes en base).

- [ ] **Step 3: Régénérer les types**

Run: `npx supabase gen types typescript --linked > src/types/supabase.ts`
Expected: `src/types/supabase.ts` contient désormais `note: string | null` et `media_paths: string[]` dans `event_reports` (Row + Insert + Update). Vérifier avec : `git diff src/types/supabase.ts` montre l'ajout de `note` et `media_paths`.
**Fallback** si la génération de types est indisponible : éditer manuellement le bloc `event_reports` de `src/types/supabase.ts` pour ajouter `note: string | null` et `media_paths: string[]` aux trois sous-types Row/Insert/Update. Ne PAS laisser le code non typé.

- [ ] **Step 4: Vérifier la compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260602180000_bilan_note_media.sql src/types/supabase.ts
git commit -m "feat(bilan): migration note + media_paths + bucket privé bilan-media"
```

---

## Task 2: Helpers storage `lib/bilan-media.ts`

**Files:**
- Create: `src/lib/bilan-media.ts`

- [ ] **Step 1: Écrire le helper**

Create `src/lib/bilan-media.ts`:

```ts
// Plomberie Storage du bilan : bucket PRIVÉ `bilan-media`. Path = {actorId}/{eventId}/{uuid}.ext.
// Lecture par URL signée (bucket non public). Cf. spec 2026-06-02-bilan-enrichi-mes-bilans.
import { supabase } from './supabase'
import { compressImage } from './compress-image'

const BUCKET = 'bilan-media'
const SIGNED_TTL = 3600 // 1 h

/** Compresse (WebP ~800px) puis upload une photo de bilan. Retourne le path stocké. */
export async function uploadBilanPhoto(file: File, actorId: string, eventId: string): Promise<string> {
  const compressed = await compressImage(file)
  const ext = compressed.name.split('.').pop() || 'webp'
  const path = `${actorId}/${eventId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    upsert: false,
    contentType: compressed.type,
  })
  if (error) throw error
  return path
}

/** URLs signées (TTL 1 h) pour des paths du bucket privé. Map path -> url. */
export async function signedUrlsFor(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (paths.length === 0) return map
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL)
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl)
  }
  return map
}

/** Supprime une photo du bucket. */
export async function removeBilanPhoto(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/bilan-media.ts
git commit -m "feat(bilan): helpers storage bilan-media (upload compressé, URLs signées, remove)"
```

---

## Task 3: Fonctions pures `lib/cockpit-bilans.ts` (TDD)

**Files:**
- Create: `src/lib/cockpit-bilans.ts`
- Test: `src/lib/cockpit-bilans.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/lib/cockpit-bilans.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { bilanProfit, buildPastBilans } from './cockpit-bilans'
import type { ParticipationWithEvent, EventReport } from '@/types/database'

const NOW = new Date('2026-05-15T12:00:00Z')

function part(id: string, end: string, status = 'inscrit'): ParticipationWithEvent {
  return {
    id, event_id: 'e' + id, status, payment_status: 'paye', visibility: 'amis',
    events: { id: 'e' + id, name: 'Festival ' + id, start_date: end, end_date: end, city: 'Lyon', department: '69', image_url: null, tags: ['medieval'] },
  } as unknown as ParticipationWithEvent
}

function report(eventId: string, revenue: number, booth: number, charges: number): EventReport {
  return { event_id: eventId, revenue, booth_cost: booth, charges } as unknown as EventReport
}

describe('bilanProfit', () => {
  it('revenue - booth_cost - charges, null traités comme 0', () => {
    expect(bilanProfit({ revenue: 1000, booth_cost: 300, charges: 220 })).toBe(480)
    expect(bilanProfit({ revenue: null, booth_cost: null, charges: null })).toBe(0)
  })
})

describe('buildPastBilans', () => {
  it('ne garde que les inscrit passés, tri end_date desc, joint le report + profit', () => {
    const parts = [
      part('1', '2026-04-01'),                 // passé
      part('2', '2026-05-01'),                 // passé, plus récent
      part('3', '2026-07-01'),                 // futur → exclu
      part('4', '2026-03-01', 'en_cours'),     // non confirmé → exclu
    ]
    const reports = new Map<string, EventReport>([['e2', report('e2', 1240, 410, 350)]])
    const out = buildPastBilans(parts, reports, NOW)
    expect(out.map(b => b.participation.id)).toEqual(['2', '1'])
    expect(out[0].report?.event_id).toBe('e2')
    expect(out[0].profit).toBe(480)
    expect(out[1].report).toBeNull()      // festival '1' non bilané
    expect(out[1].profit).toBeNull()
  })

  it('liste vide si aucun festival passé', () => {
    expect(buildPastBilans([part('1', '2026-07-01')], new Map(), NOW)).toEqual([])
  })
})
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `pnpm vitest run src/lib/cockpit-bilans.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

Create `src/lib/cockpit-bilans.ts`:

```ts
import type { ParticipationWithEvent, EventReport } from '@/types/database'

export interface PastBilan {
  participation: ParticipationWithEvent
  report: EventReport | null
  profit: number | null   // null si pas de bilan rempli
}

/** Bénéfice = CA − coût stand − charges. null traités comme 0. */
export function bilanProfit(r: { revenue: number | null; booth_cost: number | null; charges: number | null }): number {
  return (r.revenue ?? 0) - (r.booth_cost ?? 0) - (r.charges ?? 0)
}

/**
 * Festivals PASSÉS confirmés (inscrit, end_date < now), triés du plus récent au plus ancien,
 * chacun joint à son bilan (event_reports) s'il existe + le bénéfice calculé.
 */
export function buildPastBilans(
  parts: ParticipationWithEvent[],
  reportsByEvent: Map<string, EventReport>,
  now: Date,
): PastBilan[] {
  return parts
    .filter(p => p.events && p.status === 'inscrit' && new Date(p.events.end_date).getTime() < now.getTime())
    .sort((a, b) => new Date(b.events.end_date).getTime() - new Date(a.events.end_date).getTime())
    .map(p => {
      const report = reportsByEvent.get(p.event_id) ?? null
      return { participation: p, report, profit: report ? bilanProfit(report) : null }
    })
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `pnpm vitest run src/lib/cockpit-bilans.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cockpit-bilans.ts src/lib/cockpit-bilans.test.ts
git commit -m "feat(bilan): buildPastBilans + bilanProfit (fonctions pures testées)"
```

---

## Task 4: `useMyReports` + `saveEventReport` enrichi

**Files:**
- Modify: `src/hooks/use-reports.ts`

- [ ] **Step 1: Étendre `saveEventReport` (note + media_paths)**

Dans `src/hooks/use-reports.ts`, remplacer la fonction `saveEventReport` existante par :

```ts
export async function saveEventReport(report: EventReportInsert) {
  const { data, error } = await supabase
    .from('event_reports')
    .upsert(report, { onConflict: 'actor_id,event_id' })
    .select().single()
  return { data, error }
}
```

(Inchangée dans sa mécanique : `EventReportInsert` inclut désormais `note?` et `media_paths?` grâce aux types régénérés en Task 1. Aucun cast nécessaire si la régénération a réussi ; sinon, le fallback de Task 1 a déjà ajouté ces champs au type.)

- [ ] **Step 2: Ajouter `useMyReports`**

Ajouter en bas de `src/hooks/use-reports.ts` (réutilise les imports existants `useState`/`useEffect`/`useCallback`/`supabase`/`useAuth` + le type `EventReport`) :

```ts
/** Tous les bilans de l'acteur actif, indexés par event_id. `refetch` après save. */
export function useMyReports(): { reportsByEvent: Map<string, EventReport>; loading: boolean; refetch: () => Promise<void> } {
  const { currentActor } = useAuth()
  const [reportsByEvent, setReportsByEvent] = useState<Map<string, EventReport>>(new Map())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!currentActor) { setLoading(false); return }
    const { data } = await supabase.from('event_reports').select('*').eq('actor_id', currentActor.id)
    const rows = (data ?? []) as EventReport[]
    setReportsByEvent(new Map(rows.map(r => [r.event_id, r])))
    setLoading(false)
  }, [currentActor])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { reportsByEvent, loading, refetch }
}
```

- [ ] **Step 3: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS (pas de nouvelle alerte ; même pattern eslint que les hooks voisins du fichier).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-reports.ts
git commit -m "feat(bilan): useMyReports (bilans par event) + saveEventReport persiste note/media"
```

---

## Task 5: `EventReportForm` — note + photos, retrait de « Points forts »

**Files:**
- Modify: `src/components/reports/EventReportForm.tsx`

- [ ] **Step 1: Réécrire le formulaire**

Remplacer INTÉGRALEMENT le contenu de `src/components/reports/EventReportForm.tsx` par :

```tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useEventReport, saveEventReport } from '@/hooks/use-reports'
import { uploadBilanPhoto, signedUrlsFor, removeBilanPhoto } from '@/lib/bilan-media'
import { Button } from '@/components/ui/button'
import { Lock, Plus, X, ImagePlus } from 'lucide-react'

interface EventReportFormProps {
  eventId: string
  /** Appelé après save réussi (utilisé par BilanModal pour fermer + refetch parent). */
  onSaved?: () => void
}

export function EventReportForm({ eventId, onSaved }: EventReportFormProps) {
  const { user, currentActor, currentActorRow } = useAuth()
  const { report: existing } = useEventReport(eventId)
  const [boothCost, setBoothCost] = useState('')
  const [charges, setCharges] = useState('')
  const [revenue, setRevenue] = useState('')
  const [improvements, setImprovements] = useState<string[]>([])
  const [newImprovement, setNewImprovement] = useState('')
  const [note, setNote] = useState('')
  const [mediaPaths, setMediaPaths] = useState<string[]>([])
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map())
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBoothCost(existing.booth_cost?.toString() ?? '')
      setCharges(existing.charges?.toString() ?? '')
      setRevenue(existing.revenue?.toString() ?? '')
      setImprovements(existing.improvements ?? [])
      setNote(existing.note ?? '')
      setMediaPaths(existing.media_paths ?? [])
    }
  }, [existing])

  // Signer les paths pour l'aperçu (bucket privé).
  useEffect(() => {
    let cancelled = false
    if (mediaPaths.length === 0) { setSignedUrls(new Map()); return }
    signedUrlsFor(mediaPaths).then(map => { if (!cancelled) setSignedUrls(map) })
    return () => { cancelled = true }
  }, [mediaPaths])

  if (planForActor(currentActor, currentActorRow) !== 'pro') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-secondary p-4 text-sm">
        <Lock className="h-4 w-4 text-primary" />
        <span>Le bilan post-événement est une fonctionnalité <strong>Pro</strong></span>
      </div>
    )
  }

  const profit = (parseFloat(revenue) || 0) - (parseFloat(boothCost) || 0) - (parseFloat(charges) || 0)

  const handlePhotos = async (files: FileList | null) => {
    if (!files || !currentActor) return
    setUploading(true)
    try {
      const added: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        added.push(await uploadBilanPhoto(file, currentActor.id, eventId))
      }
      if (added.length) setMediaPaths(prev => [...prev, ...added])
    } catch (e) {
      console.error('bilan photo upload failed', e)
    }
    setUploading(false)
  }

  const handleRemovePhoto = async (path: string) => {
    setMediaPaths(prev => prev.filter(p => p !== path))
    try { await removeBilanPhoto(path) } catch (e) { console.error('bilan photo remove failed', e) }
  }

  const handleSave = async () => {
    if (!user || !currentActor) return
    setSaving(true)
    const { error } = await saveEventReport({
      actor_id: currentActor.id,
      acted_by_user_id: user.id,
      event_id: eventId,
      booth_cost: boothCost ? parseFloat(boothCost) : null,
      charges: charges ? parseFloat(charges) : null,
      revenue: revenue ? parseFloat(revenue) : null,
      improvements,
      note: note.trim() || null,
      media_paths: mediaPaths,
    })
    setSaving(false)
    if (!error) onSaved?.()
  }

  const addImprovement = () => {
    if (newImprovement.trim()) { setImprovements([...improvements, newImprovement.trim()]); setNewImprovement('') }
  }

  const inputClass = "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-secondary p-4">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Bilan privé</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Coût emplacement (€)</label>
          <input type="number" className={inputClass} value={boothCost} onChange={e => setBoothCost(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Charges (€)</label>
          <input type="number" className={inputClass} value={charges} onChange={e => setCharges(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Chiffre d'affaires (€)</label>
          <input type="number" className={inputClass} value={revenue} onChange={e => setRevenue(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg bg-card p-3 text-center">
        <p className="text-xs text-muted-foreground">Bénéfice</p>
        <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
          {profit.toFixed(2)} €
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Note libre</label>
        <textarea
          className={inputClass}
          rows={3}
          placeholder="Comment ça s'est passé ? Ambiance, public, ce que tu retiens…"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">À améliorer la prochaine fois</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {improvements.map((im, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-700">
              {im}
              <button onClick={() => setImprovements(improvements.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={inputClass} placeholder="Ajouter un point à améliorer" value={newImprovement} onChange={e => setNewImprovement(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImprovement() } }} />
          <Button size="icon" variant="ghost" onClick={addImprovement}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Photos souvenir <span className="opacity-70">— 🔒 privées, visibles uniquement par toi</span></label>
        <div className="mt-1 flex flex-wrap gap-2">
          {mediaPaths.map(path => (
            <span key={path} className="relative h-16 w-16 overflow-hidden rounded-lg bg-card">
              {signedUrls.get(path) && <img src={signedUrls.get(path)} alt="" className="h-full w-full object-cover" />}
              <button onClick={() => handleRemovePhoto(path)} className="absolute right-0 top-0 bg-black/60 p-0.5 text-white" aria-label="Retirer la photo"><X className="h-3 w-3" /></button>
            </span>
          ))}
          <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-input text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotos(e.target.files)} />
          </label>
        </div>
        {uploading && <p className="mt-1 text-xs text-muted-foreground">Envoi des photos…</p>}
      </div>

      <Button className="w-full" onClick={handleSave} disabled={saving || uploading}>
        {saving ? 'Sauvegarde...' : 'Sauvegarder le bilan'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS. (Plus de référence à `wins`/`newWin` ; `note`/`media_paths` typés via Task 1.)

- [ ] **Step 3: Commit**

```bash
git add src/components/reports/EventReportForm.tsx
git commit -m "feat(bilan): formulaire avec note libre + photos privées, retrait des points forts"
```

---

## Task 6: Composant `MesBilans`

**Files:**
- Create: `src/components/cockpit/MesBilans.tsx`

- [ ] **Step 1: Écrire le composant**

Create `src/components/cockpit/MesBilans.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Pencil, Plus } from 'lucide-react'
import { useMyParticipations } from '@/hooks/use-participations'
import { useMyReports } from '@/hooks/use-reports'
import { buildPastBilans, type PastBilan } from '@/lib/cockpit-bilans'
import { signedUrlsFor } from '@/lib/bilan-media'
import { BilanModal } from '@/components/reports/BilanModal'

const MAX_ROWS = 5

export function MesBilans() {
  const { participations } = useMyParticipations()
  const { reportsByEvent, refetch } = useMyReports()
  const now = useMemo(() => new Date(), [])
  const bilans = useMemo(() => buildPastBilans(participations, reportsByEvent, now), [participations, reportsByEvent, now])
  const rows = bilans.slice(0, MAX_ROWS)

  const [openEventId, setOpenEventId] = useState<string | null>(null)
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map())

  // Signer la 1re photo de chaque bilan pour la bande d'aperçu.
  useEffect(() => {
    const firstPaths = rows.map(b => b.report?.media_paths?.[0]).filter((p): p is string => !!p)
    if (firstPaths.length === 0) { setThumbs(new Map()); return }
    let cancelled = false
    signedUrlsFor(firstPaths).then(m => { if (!cancelled) setThumbs(m) })
    return () => { cancelled = true }
  }, [rows])

  if (bilans.length === 0) return null // pas de festival passé → module masqué

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <div className="ck-card">
      <h3><span className="ck-ic cop"><ClipboardList strokeWidth={1.8} /></span> Mes bilans</h3>

      <ul className="ck-bilan-list">
        {rows.map((b: PastBilan) => {
          const ev = b.participation.events
          const hasReport = !!b.report
          const note = b.report?.note
          const firstPhoto = b.report?.media_paths?.[0]
          return (
            <li key={b.participation.id}>
              <button type="button" className={'ck-bilan-row' + (hasReport ? '' : ' todo')} onClick={() => setOpenEventId(ev.id)}>
                {firstPhoto && thumbs.get(firstPhoto)
                  ? <span className="ck-bilan-thumb"><img src={thumbs.get(firstPhoto)} alt="" /></span>
                  : ev.image_url
                    ? <span className="ck-bilan-thumb"><img src={ev.image_url} alt="" /></span>
                    : <span className="ck-bilan-thumb ck-bilan-thumb-ph" />}
                <span className="ck-bilan-bd">
                  <b>{ev.name}</b>
                  <small>{fmtDate(ev.start_date)} · {ev.city}</small>
                  {hasReport ? (
                    <span className="ck-bilan-stats">
                      <span className="ck-bilan-stat"><i>CA</i> {(b.report!.revenue ?? 0).toLocaleString('fr-FR')} €</span>
                      <span className={'ck-bilan-stat ' + ((b.profit ?? 0) >= 0 ? 'pos' : 'neg')}><i>Bénéf.</i> {(b.profit! >= 0 ? '+' : '') + b.profit!.toLocaleString('fr-FR')} €</span>
                    </span>
                  ) : (
                    <span className="ck-bilan-fill"><Plus strokeWidth={2.2} /> Remplir le bilan</span>
                  )}
                  {hasReport && note && <span className="ck-bilan-note">« {note} »</span>}
                </span>
                {hasReport && <Pencil className="ck-bilan-edit" strokeWidth={2} />}
              </button>
            </li>
          )
        })}
      </ul>

      {openEventId && (
        <BilanModal
          eventId={openEventId}
          onClose={() => setOpenEventId(null)}
          onSaved={() => { setOpenEventId(null); refetch() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/cockpit/MesBilans.tsx
git commit -m "feat(bilan): module Cockpit MesBilans (festivals passés + récap)"
```

---

## Task 7: Monter `MesBilans` dans le Cockpit + CSS

**Files:**
- Modify: `src/pages/Cockpit.tsx`
- Modify: `src/pages/Cockpit.css`

- [ ] **Step 1: Monter le composant en colonne 3**

Dans `src/pages/Cockpit.tsx` :
- Ajouter l'import après celui de `SaisonFrise` :
  ```tsx
  import { MesBilans } from '@/components/cockpit/MesBilans'
  ```
- Dans la 3ᵉ colonne, sous `<SaisonFrise season={season} />`, ajouter `<MesBilans />` :
  ```tsx
            <div className="ck-col">
              <SaisonFrise season={season} />
              <MesBilans />
            </div>
  ```

- [ ] **Step 2: Ajouter les styles**

Ajouter à la fin de `src/pages/Cockpit.css` :

```css
/* Mes bilans */
.ck-bilan-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.ck-bilan-row { display: flex; gap: 11px; width: 100%; text-align: left; padding: 11px; border-radius: 12px; background: hsl(var(--secondary)); border: 1px solid hsl(var(--border)); cursor: pointer; color: hsl(var(--foreground)); }
.ck-bilan-row:hover { border-color: color-mix(in srgb, var(--copper) 32%, hsl(var(--border))); }
.ck-bilan-row.todo { background: transparent; border: 1px dashed color-mix(in srgb, var(--amber) 45%, transparent); }
.ck-bilan-thumb { width: 42px; height: 56px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.ck-bilan-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ck-bilan-thumb-ph { background: hsl(var(--card)); }
.ck-bilan-bd { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ck-bilan-bd > b { font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ck-bilan-bd > small { font-size: 11.5px; color: hsl(var(--muted-foreground)); }
.ck-bilan-stats { display: flex; gap: 14px; margin-top: 5px; }
.ck-bilan-stat { font-size: 13px; font-weight: 800; color: hsl(var(--foreground)); }
.ck-bilan-stat i { display: block; font-size: 9px; font-style: normal; text-transform: uppercase; letter-spacing: .05em; color: hsl(var(--muted-foreground)); font-weight: 700; }
.ck-bilan-stat.pos { color: var(--status-inscrit); }
.ck-bilan-stat.neg { color: var(--status-refuse); }
.ck-bilan-fill { display: inline-flex; align-items: center; gap: 6px; margin-top: 5px; font-size: 13px; font-weight: 700; color: var(--amber); }
.ck-bilan-fill svg { width: 15px; height: 15px; }
.ck-bilan-note { font-size: 12px; font-style: italic; color: hsl(var(--muted-foreground)); margin-top: 6px; border-left: 2px solid color-mix(in srgb, var(--amber) 50%, transparent); padding-left: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ck-bilan-edit { width: 15px; height: 15px; color: hsl(var(--muted-foreground)); flex-shrink: 0; }
```

- [ ] **Step 3: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Cockpit.tsx src/pages/Cockpit.css
git commit -m "feat(bilan): monter MesBilans dans le Cockpit (col 3) + styles"
```

---

## Task 8: Vérification finale + bump version

**Files:**
- Modify: `package.json`, `src/changelog.ts`

- [ ] **Step 1: Suite complète**

Run: `pnpm vitest run` → tous verts (dont `cockpit-bilans.test.ts`).
Run: `pnpm build && pnpm lint` → PASS, pas de nouvelle alerte.

- [ ] **Step 2: Vérification visuelle manuelle**

`pnpm dev`, connecté en entité Pro : ouvrir un bilan (note + photos s'enregistrent, photos privées s'affichent via URL signée), puis `/tableau-de-bord` → la section « Mes bilans » liste les festivals passés (bilané = CA/bénéfice/note/photo ; non bilané = « Remplir le bilan »). Vérifier jour/nuit.

- [ ] **Step 3: Bump version + changelog**

Bumper `package.json` (patch) et ajouter une entrée en tête de `src/changelog.ts` (même format que les entrées existantes) : titre « Bilan enrichi + Mes bilans », changes : [« Bilan : note libre + photos souvenir privées », « Cockpit : nouvelle section Mes bilans (festivals passés) »].

```bash
git add -A
git commit -m "chore(bilan): vérif + bump version <new-version>"
```

---

## Self-Review (effectué)

**Couverture spec :**
- note + media_paths colonnes → Task 1. ✓
- bucket privé + policies owner-only → Task 1. ✓
- helpers upload/sign/remove (compress réutilisé) → Task 2. ✓
- formulaire note + photos, retrait wins, improvements gardé → Task 5. ✓
- section Mes bilans (par festival, pas d'agrégat, bilané/non bilané, masquée si vide, max 5) → Tasks 3/6/7. ✓
- placement col 3 sous Saison → Task 7. ✓
- vidéos différées → non implémentées (volontaire). ✓
- tests fonctions pures → Task 3. ✓

**Cohérence des types :** `PastBilan`/`bilanProfit`/`buildPastBilans` définis en Task 3, consommés en Task 6. `useMyReports` retourne `{ reportsByEvent, loading, refetch }` (Task 4) consommé en Task 6. `uploadBilanPhoto/signedUrlsFor/removeBilanPhoto` (Task 2) consommés en Tasks 5/6. `note`/`media_paths` ajoutés au type en Task 1 → lus dans `EventReport`/`EventReportInsert` en Tasks 4/5/6. `BilanModal` props `{ eventId, onClose, onSaved }` inchangées.

**Placeholder scan :** aucun TBD/TODO ; tout le code est explicite.

**Dépendance externe :** Task 1 nécessite un accès DB (push migration) + régénération de types — fallback manuel documenté si indisponible ; sinon BLOCKED.
