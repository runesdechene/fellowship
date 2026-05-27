# Vitrine Phase 3 — Édition inline WYSIWYG — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'exposant d'éditer toute sa vitrine directement sur la vitrine (WYSIWYG), via un mode édition par toggle, sans formulaire séparé ni migration.

**Architecture:** Pur frontend. Les composants Vitrine existants reçoivent une prop `editing` + callbacks et rendent soit leur mode lecture actuel, soit leurs affordances d'édition. Des primitives réutilisables (`InlineText`, `ChipEditor`, `LinkEditor`, `ImageDrop`) vivent dans `src/components/vitrine/edit/`. Un hook `useVitrineEdit` centralise les écritures Supabase (update entité, CRUD galerie, uploads bucket) avec état optimiste + rollback. La logique pure (normalisation URL, chips, repositionnement) est extraite dans `src/lib/vitrine-edit.ts` et testée en TDD.

**Tech Stack:** React 19 + TypeScript, Supabase (RLS `entities_update_member`, table `entity_gallery`, bucket `entity-gallery`), Vitest pour les helpers purs, drag-and-drop natif HTML5 (zéro dépendance).

**Contrainte de test (connue) :** sur cette stack, `render()` de RTL ne flush pas le sync — pas de test de rendu de composant. **TDD strict sur la logique pure uniquement** (Task 1). Les composants/hook se vérifient par `pnpm build` (typecheck) + `pnpm lint` + vérification manuelle sur l'entité seedée `runes-de-chene` en local.

**Ne pas régresser :** `git diff HEAD` avant d'éditer un fichier déjà touché sur cette branche (cover en haut, scroll pleine hauteur, footer, guard nav).

---

## File Structure

**Créés :**
- `src/lib/vitrine-edit.ts` — helpers purs : `normalizeLinkUrl`, `addChip`, `reorderPositions`, `SPECIALTIES_CAP`.
- `src/lib/vitrine-edit.test.ts` — tests Vitest des helpers.
- `src/hooks/use-vitrine-edit.ts` — hook d'écriture : `updateEntity`, `uploadImage`, `addGalleryImages`, `removeGalleryImage`, `reorderGallery`, + `status`.
- `src/components/vitrine/edit/InlineText.tsx` — éditeur texte inline (input/textarea + ✓/✕).
- `src/components/vitrine/edit/ChipEditor.tsx` — éditeur de tags (spécialités).
- `src/components/vitrine/edit/LinkEditor.tsx` — éditeur de liste de liens.
- `src/components/vitrine/edit/ImageDrop.tsx` — bouton d'upload image (cover/avatar).

**Modifiés :**
- `src/components/vitrine/VitrineCover.tsx` — prop `editing` + overlay upload.
- `src/components/vitrine/VitrineHeader.tsx` — prop `editing` + édition avatar/nom/métier/ville/spécialités.
- `src/components/vitrine/VitrineLinks.tsx` — prop `editing` + LinkEditor.
- `src/components/vitrine/VitrineGallery.tsx` — prop `editing` + ajout/suppr/DnD.
- `src/pages/PublicProfile.tsx` — orchestration : state `editing`, toggle, bloc À propos éditable, câblage du hook, status pill.
- `src/components/vitrine/Vitrine.css` — styles des affordances d'édition (jour/nuit).

---

## Task 1: Helpers purs `vitrine-edit.ts` (TDD)

**Files:**
- Create: `src/lib/vitrine-edit.ts`
- Test: `src/lib/vitrine-edit.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
// src/lib/vitrine-edit.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeLinkUrl, addChip, reorderPositions, SPECIALTIES_CAP } from './vitrine-edit'

describe('normalizeLinkUrl', () => {
  it('ajoute https:// si pas de schéma', () => {
    expect(normalizeLinkUrl('terresetflammes.fr')).toBe('https://terresetflammes.fr')
  })
  it('préserve un schéma existant', () => {
    expect(normalizeLinkUrl('http://x.fr')).toBe('http://x.fr')
    expect(normalizeLinkUrl('https://x.fr')).toBe('https://x.fr')
  })
  it('trim les espaces', () => {
    expect(normalizeLinkUrl('  x.fr  ')).toBe('https://x.fr')
  })
  it('chaîne vide → vide', () => {
    expect(normalizeLinkUrl('   ')).toBe('')
  })
})

describe('addChip', () => {
  it('ajoute un chip trimé', () => {
    expect(addChip(['a'], '  b ')).toEqual(['a', 'b'])
  })
  it('ignore une entrée vide', () => {
    expect(addChip(['a'], '   ')).toEqual(['a'])
  })
  it('dédoublonne (insensible à la casse/espaces)', () => {
    expect(addChip(['Céramique'], 'céramique')).toEqual(['Céramique'])
  })
  it(`respecte le cap de ${SPECIALTIES_CAP}`, () => {
    const full = Array.from({ length: SPECIALTIES_CAP }, (_, i) => `s${i}`)
    expect(addChip(full, 'trop')).toEqual(full)
  })
})

describe('reorderPositions', () => {
  it('renvoie {id, position} séquentiels à partir de 0', () => {
    expect(reorderPositions(['z', 'a', 'm'])).toEqual([
      { id: 'z', position: 0 },
      { id: 'a', position: 1 },
      { id: 'm', position: 2 },
    ])
  })
})
```

- [ ] **Step 2: Lancer les tests → échec**

Run: `pnpm exec vitest run src/lib/vitrine-edit.test.ts`
Expected: FAIL — `Failed to resolve import "./vitrine-edit"`.

- [ ] **Step 3: Implémenter les helpers**

```ts
// src/lib/vitrine-edit.ts

/** Nombre max de spécialités affichables sans casser le header. */
export const SPECIALTIES_CAP = 8

/** Ajoute https:// si l'URL n'a pas de schéma ; trim ; chaîne vide si rien. */
export function normalizeLinkUrl(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return t
  return `https://${t}`
}

/** Ajoute un chip trimé : ignore le vide, dédoublonne (casse/espaces), respecte le cap. */
export function addChip(list: string[], raw: string): string[] {
  const t = raw.trim()
  if (!t) return list
  if (list.length >= SPECIALTIES_CAP) return list
  const norm = (s: string) => s.trim().toLowerCase()
  if (list.some(c => norm(c) === norm(t))) return list
  return [...list, t]
}

/** Mappe une liste ordonnée d'ids vers leurs positions séquentielles (0-based). */
export function reorderPositions(orderedIds: string[]): Array<{ id: string; position: number }> {
  return orderedIds.map((id, position) => ({ id, position }))
}
```

- [ ] **Step 4: Lancer les tests → succès**

Run: `pnpm exec vitest run src/lib/vitrine-edit.test.ts`
Expected: PASS (4 + 4 + 1 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/vitrine-edit.ts src/lib/vitrine-edit.test.ts
git commit -m "feat(vitrine): helpers purs d'édition (url/chips/positions) testés"
```

---

## Task 2: Hook `useVitrineEdit`

**Files:**
- Create: `src/hooks/use-vitrine-edit.ts`

Pas de test unitaire (effets Supabase ; contrainte de test de la stack). Vérification par typecheck en Task 11/13.

- [ ] **Step 1: Écrire le hook**

```ts
// src/hooks/use-vitrine-edit.ts
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { reorderPositions } from '@/lib/vitrine-edit'
import type { EntityRow, EntityGalleryRow } from '@/types/database'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface VitrineEditApi {
  status: SaveStatus
  /** Patch partiel de l'entité (bio, brand_name, specialties, links…). Renvoie true si OK. */
  updateEntity: (patch: Record<string, unknown>) => Promise<boolean>
  /** Upload une image dans entity-gallery sous <actor_id>/<kind>/… et renvoie l'URL publique. */
  uploadImage: (file: File, kind: 'cover' | 'avatar' | 'gallery') => Promise<string | null>
  /** Upload N fichiers en galerie + insère les lignes ; renvoie les nouvelles lignes. */
  addGalleryImages: (files: File[], currentCount: number) => Promise<EntityGalleryRow[]>
  removeGalleryImage: (id: string) => Promise<boolean>
  /** Persiste l'ordre (positions séquentielles) d'après la liste d'ids ordonnée. */
  reorderGallery: (orderedIds: string[]) => Promise<boolean>
}

export function useVitrineEdit(actorId: string): VitrineEditApi {
  const [status, setStatus] = useState<SaveStatus>('idle')

  const flash = useCallback((s: SaveStatus) => {
    setStatus(s)
    if (s === 'saved' || s === 'error') setTimeout(() => setStatus('idle'), 2500)
  }, [])

  const updateEntity = useCallback(async (patch: Record<string, unknown>) => {
    setStatus('saving')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('entities') as any).update(patch).eq('actor_id', actorId)
    if (error) { console.error('updateEntity', error); flash('error'); return false }
    flash('saved'); return true
  }, [actorId, flash])

  const uploadImage = useCallback(async (file: File, kind: 'cover' | 'avatar' | 'gallery') => {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${actorId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('entity-gallery').upload(path, file, { upsert: true })
    if (error) { console.error('uploadImage', error); return null }
    return supabase.storage.from('entity-gallery').getPublicUrl(path).data.publicUrl
  }, [actorId])

  const addGalleryImages = useCallback(async (files: File[], currentCount: number) => {
    setStatus('saving')
    const rows: EntityGalleryRow[] = []
    let pos = currentCount
    for (const file of files) {
      const url = await uploadImage(file, 'gallery')
      if (!url) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('entity_gallery') as any)
        .insert({ entity_actor_id: actorId, image_url: url, position: pos }).select('*').single()
      if (error) { console.error('addGallery', error); flash('error'); continue }
      rows.push(data as EntityGalleryRow); pos += 1
    }
    flash(rows.length ? 'saved' : 'error')
    return rows
  }, [actorId, uploadImage, flash])

  const removeGalleryImage = useCallback(async (id: string) => {
    setStatus('saving')
    const { error } = await supabase.from('entity_gallery').delete().eq('id', id)
    if (error) { console.error('removeGallery', error); flash('error'); return false }
    flash('saved'); return true
  }, [flash])

  const reorderGallery = useCallback(async (orderedIds: string[]) => {
    setStatus('saving')
    for (const { id, position } of reorderPositions(orderedIds)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('entity_gallery') as any).update({ position }).eq('id', id)
      if (error) { console.error('reorderGallery', error); flash('error'); return false }
    }
    flash('saved'); return true
  }, [flash])

  return { status, updateEntity, uploadImage, addGalleryImages, removeGalleryImage, reorderGallery }
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `pnpm build`
Expected: build OK (aucune erreur TS dans `use-vitrine-edit.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-vitrine-edit.ts
git commit -m "feat(vitrine): hook useVitrineEdit (update entité + CRUD galerie + uploads)"
```

---

## Task 3: Primitive `InlineText`

**Files:**
- Create: `src/components/vitrine/edit/InlineText.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
// src/components/vitrine/edit/InlineText.tsx
import { useState } from 'react'
import { Check, X } from 'lucide-react'

interface InlineTextProps {
  value: string
  multiline?: boolean
  placeholder?: string
  /** Rendu en lecture quand on n'édite pas ce champ. */
  children: React.ReactNode
  onCommit: (value: string) => void
}

/** Affiche `children` ; au clic sur le crayon, ouvre un éditeur input/textarea avec ✓/✕. */
export function InlineText({ value, multiline, placeholder, children, onCommit }: InlineTextProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  function start() { setDraft(value); setOpen(true) }
  function commit() { onCommit(draft.trim()); setOpen(false) }
  function cancel() { setOpen(false) }

  if (!open) {
    return (
      <span className="v-edit-field">
        {children}
        <button type="button" className="v-edit-pencil" onClick={start} aria-label="Modifier">✏</button>
      </span>
    )
  }

  return (
    <span className="v-edit-inline">
      {multiline ? (
        <textarea
          className="v-edit-input" value={draft} placeholder={placeholder} autoFocus
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit(); if (e.key === 'Escape') cancel() }}
        />
      ) : (
        <input
          className="v-edit-input" value={draft} placeholder={placeholder} autoFocus
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
        />
      )}
      <button type="button" className="v-edit-ok" onClick={commit} aria-label="Valider"><Check /></button>
      <button type="button" className="v-edit-cancel" onClick={cancel} aria-label="Annuler"><X /></button>
    </span>
  )
}
```

- [ ] **Step 2: Commit** (vérification globale du build en Task 11)

```bash
git add src/components/vitrine/edit/InlineText.tsx
git commit -m "feat(vitrine): primitive InlineText (édition texte inline ✓/✕)"
```

---

## Task 4: Primitive `ChipEditor`

**Files:**
- Create: `src/components/vitrine/edit/ChipEditor.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
// src/components/vitrine/edit/ChipEditor.tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { addChip, SPECIALTIES_CAP } from '@/lib/vitrine-edit'

interface ChipEditorProps {
  values: string[]
  onChange: (next: string[]) => void
}

/** Tags éditables : taper + Entrée ajoute, ✕ retire. Cap géré par addChip. */
export function ChipEditor({ values, onChange }: ChipEditorProps) {
  const [input, setInput] = useState('')
  const full = values.length >= SPECIALTIES_CAP

  function add() {
    const next = addChip(values, input)
    if (next !== values) onChange(next)
    setInput('')
  }

  return (
    <div className="v-chips v-chips-edit">
      {values.map(v => (
        <span key={v} className="v-chip">
          {v}
          <button type="button" className="v-chip-x" onClick={() => onChange(values.filter(c => c !== v))} aria-label={`Retirer ${v}`}><X /></button>
        </span>
      ))}
      {!full && (
        <input
          className="v-chip-input" value={input} placeholder="+ spécialité"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          onBlur={add}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/edit/ChipEditor.tsx
git commit -m "feat(vitrine): primitive ChipEditor (spécialités, cap 8)"
```

---

## Task 5: Primitive `LinkEditor`

**Files:**
- Create: `src/components/vitrine/edit/LinkEditor.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
// src/components/vitrine/edit/LinkEditor.tsx
import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { normalizeLinkUrl } from '@/lib/vitrine-edit'
import type { VitrineLink } from '@/types/database'

const TYPES: VitrineLink['type'][] = ['website', 'shop', 'instagram', 'facebook', 'other']
const TYPE_LABEL: Record<VitrineLink['type'], string> = {
  website: 'Site', shop: 'Boutique', instagram: 'Instagram', facebook: 'Facebook', other: 'Autre',
}

interface LinkEditorProps {
  links: VitrineLink[]
  onChange: (next: VitrineLink[]) => void
}

/** Liste éditable de liens : type + label + url, ajout/suppression. Pas de réordre (Phase 3.1). */
export function LinkEditor({ links, onChange }: LinkEditorProps) {
  const [draft, setDraft] = useState<VitrineLink>({ type: 'website', label: '', url: '' })

  function update(i: number, patch: Partial<VitrineLink>) {
    onChange(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function commitUrl(i: number) {
    update(i, { url: normalizeLinkUrl(links[i].url) })
  }
  function remove(i: number) { onChange(links.filter((_, idx) => idx !== i)) }
  function addDraft() {
    const url = normalizeLinkUrl(draft.url)
    if (!url || !draft.label.trim()) return
    onChange([...links, { ...draft, url, label: draft.label.trim() }])
    setDraft({ type: 'website', label: '', url: '' })
  }

  return (
    <div className="v-links v-links-edit">
      {links.map((l, i) => (
        <div key={i} className="v-linkrow-edit">
          <select className="v-link-type" value={l.type} onChange={e => update(i, { type: e.target.value as VitrineLink['type'] })}>
            {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          <input className="v-link-label" value={l.label} placeholder="Libellé" onChange={e => update(i, { label: e.target.value })} />
          <input className="v-link-url" value={l.url} placeholder="url.fr" onChange={e => update(i, { url: e.target.value })} onBlur={() => commitUrl(i)} />
          <button type="button" className="v-link-del" onClick={() => remove(i)} aria-label="Supprimer"><Trash2 /></button>
        </div>
      ))}
      <div className="v-linkrow-edit v-linkrow-new">
        <select className="v-link-type" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as VitrineLink['type'] })}>
          {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <input className="v-link-label" value={draft.label} placeholder="Libellé" onChange={e => setDraft({ ...draft, label: e.target.value })} />
        <input className="v-link-url" value={draft.url} placeholder="url.fr" onChange={e => setDraft({ ...draft, url: e.target.value })} />
        <button type="button" className="v-link-add" onClick={addDraft} aria-label="Ajouter le lien"><Plus /></button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/edit/LinkEditor.tsx
git commit -m "feat(vitrine): primitive LinkEditor (liens type/label/url)"
```

---

## Task 6: Primitive `ImageDrop`

**Files:**
- Create: `src/components/vitrine/edit/ImageDrop.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
// src/components/vitrine/edit/ImageDrop.tsx
import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'

interface ImageDropProps {
  label: string
  /** Upload + persiste, renvoie true si OK (le parent met à jour son URL optimiste avant). */
  onPick: (file: File) => Promise<void>
  className?: string
}

/** Bouton overlay « changer l'image » : ouvre le file picker et délègue l'upload au parent. */
export function ImageDrop({ label, onPick, className }: ImageDropProps) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try { await onPick(file) } finally { setBusy(false); if (ref.current) ref.current.value = '' }
  }

  return (
    <button type="button" className={`v-imagedrop ${className ?? ''}`} onClick={() => ref.current?.click()} disabled={busy}>
      <Camera />
      <span>{busy ? 'Envoi…' : label}</span>
      <input ref={ref} type="file" accept="image/*" hidden onChange={handle} />
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/edit/ImageDrop.tsx
git commit -m "feat(vitrine): primitive ImageDrop (upload cover/avatar)"
```

---

## Task 7: Édition dans `VitrineCover`

**Files:**
- Modify: `src/components/vitrine/VitrineCover.tsx`

- [ ] **Step 1: Réécrire le composant avec mode édition**

```tsx
// src/components/vitrine/VitrineCover.tsx
import { ImageDrop } from './edit/ImageDrop'

interface VitrineCoverProps {
  url: string | null
  editing?: boolean
  onUpload?: (file: File) => Promise<void>
}

export function VitrineCover({ url, editing, onUpload }: VitrineCoverProps) {
  return (
    <div className="v-cover">
      {url ? <img src={url} alt="" /> : <div className="v-cover-fallback" aria-hidden="true" />}
      {editing && onUpload && (
        <div className="v-cover-edit">
          <ImageDrop label="Changer la cover" onPick={onUpload} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/VitrineCover.tsx
git commit -m "feat(vitrine): VitrineCover éditable (overlay upload cover)"
```

---

## Task 8: Édition dans `VitrineHeader`

**Files:**
- Modify: `src/components/vitrine/VitrineHeader.tsx`

Ajoute la prop `editing` + callbacks. En édition : avatar cliquable (ImageDrop), nom/métier/ville via InlineText, spécialités via ChipEditor. Le badge `verified` et les actions (suivre/partager/QR) ne changent pas. **Conserver** la logique existante d'initiales/subtitle/gradient.

- [ ] **Step 1: Réécrire le composant**

```tsx
// src/components/vitrine/VitrineHeader.tsx
import { BadgeCheck, UserPlus, Check, Share2, QrCode } from 'lucide-react'
import { avatarGradient } from '@/lib/avatar-gradient'
import { InlineText } from './edit/InlineText'
import { ChipEditor } from './edit/ChipEditor'
import { ImageDrop } from './edit/ImageDrop'
import type { EntityRow } from '@/types/database'

interface VitrineHeaderProps {
  entity: EntityRow
  isOwner: boolean
  isFollowing: boolean
  onToggleFollow?: () => void
  onShare: () => void
  onQR: () => void
  editing?: boolean
  onField?: (patch: Record<string, unknown>) => void
  onAvatar?: (file: File) => Promise<void>
}

export function VitrineHeader({
  entity, isOwner: _isOwner, isFollowing, onToggleFollow, onShare, onQR,
  editing, onField, onAvatar,
}: VitrineHeaderProps) {
  const subtitleParts: string[] = []
  if (entity.craft_type) subtitleParts.push(entity.craft_type)
  const geo = [entity.city, entity.department ? `(${entity.department})` : null].filter(Boolean).join(' ')
  if (geo) subtitleParts.push(geo)
  const subtitle = subtitleParts.join(' · ')

  const initials = entity.brand_name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()

  return (
    <header className="v-head">
      <div className="v-av" style={!entity.avatar_url ? { background: avatarGradient(entity.brand_name) } : undefined}>
        {entity.avatar_url ? <img src={entity.avatar_url} alt={entity.brand_name} /> : <span className="v-av-fallback">{initials}</span>}
        {editing && onAvatar && <div className="v-av-edit"><ImageDrop label="" onPick={onAvatar} className="v-av-drop" /></div>}
      </div>

      <div className="v-id">
        <div className="v-brand">
          {editing && onField ? (
            <InlineText value={entity.brand_name} onCommit={v => onField({ brand_name: v || entity.brand_name })}>
              {entity.brand_name}
            </InlineText>
          ) : entity.brand_name}
          {entity.verified && <span className="v-verified" title="Exposant vérifié"><BadgeCheck /></span>}
        </div>

        {editing && onField ? (
          <div className="v-sub">
            <InlineText value={entity.craft_type ?? ''} placeholder="Métier" onCommit={v => onField({ craft_type: v || null })}>
              {entity.craft_type || <span className="v-edit-empty">+ métier</span>}
            </InlineText>
            {' · '}
            <InlineText value={entity.city ?? ''} placeholder="Ville" onCommit={v => onField({ city: v || null })}>
              {entity.city || <span className="v-edit-empty">+ ville</span>}
            </InlineText>
          </div>
        ) : subtitle && <div className="v-sub">{subtitle}</div>}

        {editing && onField ? (
          <ChipEditor values={entity.specialties} onChange={v => onField({ specialties: v })} />
        ) : entity.specialties.length > 0 && (
          <div className="v-chips">{entity.specialties.map(s => <span key={s} className="v-chip">{s}</span>)}</div>
        )}
      </div>

      <div className="v-act">
        {onToggleFollow && (
          <button type="button" className={`v-btn v-btn-follow ${isFollowing ? 'is-on' : 'v-btn-p'}`} onClick={onToggleFollow} aria-pressed={isFollowing}>
            {isFollowing ? <Check /> : <UserPlus />}<span>{isFollowing ? 'Suivi' : 'Suivre'}</span>
          </button>
        )}
        <button type="button" className="v-iconbtn" title="Partager" onClick={onShare} aria-label="Partager"><Share2 /></button>
        <button type="button" className="v-iconbtn" title="QR / lien" onClick={onQR} aria-label="QR Code"><QrCode /></button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/VitrineHeader.tsx
git commit -m "feat(vitrine): VitrineHeader éditable (avatar/nom/métier/ville/spécialités)"
```

---

## Task 9: Édition dans `VitrineLinks`

**Files:**
- Modify: `src/components/vitrine/VitrineLinks.tsx`

En édition : afficher le bloc **même si vide** et rendre `LinkEditor`. Conserver l'en-tête `<h2>` et les icônes existantes en lecture.

- [ ] **Step 1: Modifier le composant**

Remplacer la signature et le corps :

```tsx
// imports : ajouter
import { LinkEditor } from './edit/LinkEditor'

interface VitrineLinksProps {
  links: VitrineLink[]
  editing?: boolean
  onChange?: (next: VitrineLink[]) => void
}

export function VitrineLinks({ links, editing, onChange }: VitrineLinksProps) {
  if (!editing && links.length === 0) return null

  return (
    <div className="v-card">
      <h2>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1.5 1.5" />
          <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1.5-1.5" />
        </svg>
        Liens
      </h2>
      {editing && onChange ? (
        <LinkEditor links={links} onChange={onChange} />
      ) : (
        <div className="v-links">
          {links.map((l, i) => (
            <a key={i} className="v-linkrow" href={l.url} target="_blank" rel="noopener noreferrer">
              <span className="v-li"><LinkIcon type={l.type} /></span>
              <span className="v-lt"><b>{l.label}</b><span>{linkHost(l.url)}</span></span>
              <ExternalLink className="v-lext" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
```

(Garder les imports/`ICON_MAP`/`LinkIcon` existants en tête de fichier.)

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/VitrineLinks.tsx
git commit -m "feat(vitrine): VitrineLinks éditable (LinkEditor en mode édition)"
```

---

## Task 10: Édition dans `VitrineGallery` (ajout / suppr / DnD)

**Files:**
- Modify: `src/components/vitrine/VitrineGallery.tsx`

En édition : afficher le bloc même si vide, bouton `+ Ajouter` (multi-fichiers), `✕` par photo, et drag-and-drop natif pour réordonner. Le réordre appelle `onReorder(orderedIds)` (le parent persiste).

- [ ] **Step 1: Réécrire le composant**

```tsx
// src/components/vitrine/VitrineGallery.tsx
import { useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { EntityGalleryRow } from '@/types/database'

interface VitrineGalleryProps {
  photos: EntityGalleryRow[]
  editing?: boolean
  onAdd?: (files: File[]) => void
  onRemove?: (id: string) => void
  onReorder?: (orderedIds: string[]) => void
}

export function VitrineGallery({ photos, editing, onAdd, onRemove, onReorder }: VitrineGalleryProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  if (!editing && photos.length === 0) return null

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId || !onReorder) return
    const ids = photos.map(p => p.id)
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId)
    ids.splice(to, 0, ids.splice(from, 1)[0])
    onReorder(ids)
    setDragId(null)
  }

  return (
    <div className="v-card">
      <h2>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        Sélection
      </h2>
      <div className="v-gallery">
        {photos.map(p => (
          <div
            key={p.id}
            className={`v-gphoto ${editing ? 'is-editing' : ''} ${dragId === p.id ? 'is-dragging' : ''}`}
            draggable={editing}
            onDragStart={() => setDragId(p.id)}
            onDragOver={e => { if (editing) e.preventDefault() }}
            onDrop={() => handleDrop(p.id)}
          >
            <img src={p.image_url} alt="" loading="lazy" />
            {editing && onRemove && (
              <button type="button" className="v-gphoto-del" onClick={() => onRemove(p.id)} aria-label="Supprimer la photo"><X /></button>
            )}
          </div>
        ))}
        {editing && onAdd && (
          <button type="button" className="v-gphoto v-gphoto-add" onClick={() => fileRef.current?.click()} aria-label="Ajouter des photos">
            <Plus />
            <input
              ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) onAdd(f); if (fileRef.current) fileRef.current.value = '' }}
            />
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/VitrineGallery.tsx
git commit -m "feat(vitrine): VitrineGallery éditable (ajout multi + suppr + DnD natif)"
```

---

## Task 11: Orchestration dans `PublicProfile` (toggle + câblage)

**Files:**
- Modify: `src/pages/PublicProfile.tsx`

Introduit : état local éditable de l'entité + galerie (copie optimiste seedée depuis `useVitrine`), state `editing`, bouton toggle (owner only), status pill, bloc À propos éditable, et câblage de tous les callbacks au hook `useVitrineEdit`.

- [ ] **Step 1: Réécrire le corps du composant**

```tsx
// src/pages/PublicProfile.tsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Pencil, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useVitrine } from '@/hooks/use-vitrine'
import { useVitrineEdit } from '@/hooks/use-vitrine-edit'
import { useFollowStatus } from '@/hooks/use-follows'
import { VitrineCover } from '@/components/vitrine/VitrineCover'
import { VitrineHeader } from '@/components/vitrine/VitrineHeader'
import { VitrineStats } from '@/components/vitrine/VitrineStats'
import { VitrineGallery } from '@/components/vitrine/VitrineGallery'
import { VitrineLinks } from '@/components/vitrine/VitrineLinks'
import { VitrineSeason } from '@/components/vitrine/VitrineSeason'
import { InlineText } from '@/components/vitrine/edit/InlineText'
import { QRCodeModal } from '@/components/profile/QRCodeModal'
import { EmbedModal } from '@/components/profile/EmbedModal'
import type { EntityRow, EntityGalleryRow, VitrineLink } from '@/types/database'
import './Vitrine.css'

interface PublicProfilePageProps { overrideSlug?: string }

export function PublicProfilePage({ overrideSlug }: PublicProfilePageProps = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = overrideSlug ?? paramSlug?.replace(/^@/, '')
  const { currentActor } = useAuth()
  const data = useVitrine(slug)
  const { isFollowing, toggleFollow } = useFollowStatus(data.entity?.actor_id)
  const [showQR, setShowQR] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const [editing, setEditing] = useState(false)

  // Copie locale optimiste (seedée depuis le hook de lecture)
  const [entity, setEntity] = useState<EntityRow | null>(null)
  const [gallery, setGallery] = useState<EntityGalleryRow[]>([])
  useEffect(() => { setEntity(data.entity) }, [data.entity])
  useEffect(() => { setGallery(data.gallery) }, [data.gallery])

  const edit = useVitrineEdit(entity?.actor_id ?? '')

  if (data.loading) return <div className="profile-loading">Chargement…</div>
  if (data.notFound || !entity) return (
    <div className="profile-not-found">
      <div className="profile-not-found-code">404</div>
      <h1 className="profile-not-found-title">Profil introuvable</h1>
      <p className="profile-not-found-text">Aucun profil ne correspond à <span>@{slug}</span>.</p>
      <Link to="/" className="profile-not-found-link">Retour à l'accueil</Link>
    </div>
  )

  const isOwner = currentActor?.id === entity.actor_id
  const canFollow = !!currentActor && !isOwner
  const links = (entity.links as unknown as VitrineLink[]) ?? []
  const year = new Date().getFullYear()

  // Helpers de mise à jour locale + persistance
  const patchEntity = (patch: Record<string, unknown>) => {
    setEntity(e => (e ? { ...e, ...patch } as EntityRow : e))
    edit.updateEntity(patch)
  }
  const uploadCover = async (file: File) => {
    const url = await edit.uploadImage(file, 'cover')
    if (url) patchEntity({ banner_url: url })
  }
  const uploadAvatar = async (file: File) => {
    const url = await edit.uploadImage(file, 'avatar')
    if (url) patchEntity({ avatar_url: url })
  }
  const addPhotos = async (files: File[]) => {
    const rows = await edit.addGalleryImages(files, gallery.length)
    if (rows.length) setGallery(g => [...g, ...rows])
  }
  const removePhoto = async (id: string) => {
    const prev = gallery
    setGallery(g => g.filter(p => p.id !== id))
    const ok = await edit.removeGalleryImage(id)
    if (!ok) setGallery(prev)
  }
  const reorderPhotos = (orderedIds: string[]) => {
    setGallery(g => orderedIds.map(id => g.find(p => p.id === id)!).filter(Boolean))
    edit.reorderGallery(orderedIds)
  }

  return (
    <div className="v-page-root">
      <VitrineCover url={entity.banner_url} editing={editing} onUpload={uploadCover} />
      <div className="vitrine">
        {isOwner && (
          <div className="v-edit-bar">
            <button type="button" className={`v-btn ${editing ? 'v-btn-p' : ''}`} onClick={() => setEditing(v => !v)}>
              {editing ? <><Check /> Terminé</> : <><Pencil /> Modifier ma vitrine</>}
            </button>
            {edit.status === 'saving' && <span className="v-save-pill">Enregistrement…</span>}
            {edit.status === 'saved' && <span className="v-save-pill is-ok">✓ Enregistré</span>}
            {edit.status === 'error' && <span className="v-save-pill is-err">Échec — réessaie</span>}
          </div>
        )}

        <VitrineHeader
          entity={entity} isOwner={isOwner} isFollowing={isFollowing}
          onToggleFollow={canFollow ? toggleFollow : undefined}
          onShare={() => { navigator.share?.({ url: window.location.href }).catch(() => {}) }}
          onQR={() => setShowQR(true)}
          editing={editing} onField={patchEntity} onAvatar={uploadAvatar}
        />
        <VitrineStats followers={data.followers} friends={data.friends} seasonCount={data.season.length} year={year} />

        <div className="v-grid">
          <div className="v-col-main">
            {(entity.bio || editing) && (
              <div className="v-card v-about">
                <h2>À propos</h2>
                {editing ? (
                  <InlineText value={entity.bio ?? ''} multiline placeholder="Présente ton univers, ton artisanat…" onCommit={v => patchEntity({ bio: v || null })}>
                    <p>{entity.bio || <span className="v-edit-empty">+ Ajouter une présentation</span>}</p>
                  </InlineText>
                ) : <p>{entity.bio}</p>}
              </div>
            )}
            <VitrineGallery photos={gallery} editing={editing} onAdd={addPhotos} onRemove={removePhoto} onReorder={reorderPhotos} />
            {canFollow && !isFollowing && (
              <div className="v-nudge">
                <span className="v-nudge-ic">🔔</span>
                <div className="v-nudge-t">
                  <b>Ne rate plus ses dates</b>
                  <span>Suis {entity.brand_name} pour être prévenu de ses prochains festivals.</span>
                </div>
                <button className="v-btn v-btn-p" onClick={toggleFollow}>Suivre</button>
              </div>
            )}
          </div>
          <aside className="v-col-side">
            <VitrineLinks links={links} editing={editing} onChange={next => patchEntity({ links: next })} />
            <VitrineSeason season={data.season} />
          </aside>
        </div>

        <div className="v-footer">
          <span className="v-footer-mark">✦</span>
          Vitrine Fellowship{entity.public_slug ? <> · <code>flw.sh/{entity.public_slug}</code></> : null}
        </div>
      </div>

      {showQR && entity.public_slug && <QRCodeModal slug={entity.public_slug} onClose={() => setShowQR(false)} />}
      {showEmbed && entity.public_slug && <EmbedModal slug={entity.public_slug} onClose={() => setShowEmbed(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier le build + lint**

Run: `pnpm build` puis `pnpm lint`
Expected: aucune erreur TS, aucune erreur ESLint (notamment règles react-hooks). Si `react-hooks/exhaustive-deps` râle sur les helpers, mémoïser ou suivre le pattern existant du projet.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PublicProfile.tsx
git commit -m "feat(vitrine): orchestration édition inline (toggle + câblage hook + état optimiste)"
```

---

## Task 12: Styles `Vitrine.css` (affordances jour/nuit)

**Files:**
- Modify: `src/components/vitrine/Vitrine.css`

Ajouter les styles pour : `.v-edit-bar`, `.v-save-pill` (+ `.is-ok`/`.is-err`), `.v-edit-pencil`, `.v-edit-inline`/`.v-edit-input`, `.v-edit-ok`/`.v-edit-cancel`, `.v-edit-field`, `.v-edit-empty`, `.v-chips-edit`/`.v-chip-x`/`.v-chip-input`, `.v-links-edit`/`.v-linkrow-edit`/`.v-link-*`, `.v-imagedrop`, `.v-cover-edit`, `.v-av-edit`/`.v-av-drop`, `.v-gphoto.is-editing`/`.is-dragging`/`.v-gphoto-del`/`.v-gphoto-add`.

**Checklist DA jour/nuit (obligatoire) :** réutiliser les tokens existants de `Vitrine.css` (greper `var(--` en tête de fichier pour les noms). **Aucun `#fff`/`#000` en dur** — utiliser les tokens. SVG d'icônes `fill: none` si trait. Ombres douces sous `.light`.

- [ ] **Step 1: Lire les tokens existants**

Run: `pnpm exec rg "var\(--" src/components/vitrine/Vitrine.css | head -30` (ou la racine `:root`/`.light` de `src/index.css`).
Identifier : couleur de surface carte, couleur d'accent (le doré `--…`), couleur de texte, couleur de bordure.

- [ ] **Step 2: Ajouter le bloc de styles d'édition**

Ajouter en fin de `Vitrine.css` (adapter les noms de tokens à ceux relevés au Step 1) :

```css
/* ───── Édition inline (Phase 3) ───── */
.v-edit-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.v-save-pill { font-size: 13px; padding: 4px 10px; border-radius: 999px; background: var(--v-surface-2, rgba(0,0,0,.06)); color: var(--v-text-soft); }
.v-save-pill.is-ok { color: var(--v-accent); }
.v-save-pill.is-err { color: #c0392b; }

.v-edit-pencil { margin-left: 6px; background: none; border: none; cursor: pointer; opacity: .55; font-size: .85em; }
.v-edit-pencil:hover { opacity: 1; }
.v-edit-empty { opacity: .5; font-style: italic; }

.v-edit-inline { display: inline-flex; align-items: center; gap: 6px; width: 100%; }
.v-edit-input { flex: 1; min-width: 0; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--v-border); background: var(--v-surface); color: var(--v-text); font: inherit; }
textarea.v-edit-input { min-height: 96px; resize: vertical; }
.v-edit-ok, .v-edit-cancel { display: inline-flex; padding: 4px; border-radius: 6px; border: none; cursor: pointer; background: var(--v-surface-2, rgba(0,0,0,.06)); color: var(--v-text); }
.v-edit-ok { color: var(--v-accent); }
.v-edit-ok svg, .v-edit-cancel svg { width: 16px; height: 16px; fill: none; stroke: currentColor; }

.v-chips-edit .v-chip { display: inline-flex; align-items: center; gap: 4px; }
.v-chip-x { display: inline-flex; background: none; border: none; cursor: pointer; padding: 0; opacity: .6; }
.v-chip-x svg { width: 12px; height: 12px; fill: none; stroke: currentColor; }
.v-chip-input { padding: 2px 8px; border-radius: 999px; border: 1px dashed var(--v-accent); background: transparent; color: var(--v-text); font: inherit; max-width: 140px; }

.v-links-edit { display: flex; flex-direction: column; gap: 8px; }
.v-linkrow-edit { display: grid; grid-template-columns: 96px 1fr 1fr auto; gap: 6px; align-items: center; }
.v-link-type, .v-link-label, .v-link-url { padding: 6px 8px; border-radius: 8px; border: 1px solid var(--v-border); background: var(--v-surface); color: var(--v-text); font: inherit; min-width: 0; }
.v-link-del, .v-link-add { display: inline-flex; padding: 6px; border-radius: 8px; border: none; cursor: pointer; background: var(--v-surface-2, rgba(0,0,0,.06)); color: var(--v-text); }
.v-link-add { color: var(--v-accent); }
.v-link-del svg, .v-link-add svg { width: 16px; height: 16px; fill: none; stroke: currentColor; }

.v-imagedrop { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: none; cursor: pointer; background: rgba(0,0,0,.55); color: #f3e9d8; backdrop-filter: blur(4px); }
.v-imagedrop svg { width: 18px; height: 18px; fill: none; stroke: currentColor; }
.v-cover-edit { position: absolute; right: 16px; bottom: 16px; }
.v-cover { position: relative; }

.v-av { position: relative; }
.v-av-edit { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: inherit; background: rgba(0,0,0,.35); opacity: 0; transition: opacity .15s; }
.v-av:hover .v-av-edit { opacity: 1; }
.v-av-drop { padding: 6px; background: transparent; }

.v-gphoto.is-editing { position: relative; cursor: grab; }
.v-gphoto.is-dragging { opacity: .4; }
.v-gphoto-del { position: absolute; top: 4px; right: 4px; display: inline-flex; padding: 4px; border-radius: 999px; border: none; cursor: pointer; background: rgba(0,0,0,.6); color: #fff; }
.v-gphoto-del svg { width: 14px; height: 14px; fill: none; stroke: currentColor; }
.v-gphoto-add { display: flex; align-items: center; justify-content: center; border: 2px dashed var(--v-border); background: transparent; cursor: pointer; color: var(--v-accent); }
.v-gphoto-add svg { width: 28px; height: 28px; fill: none; stroke: currentColor; }
```

> Note : `.v-imagedrop` et `.v-gphoto-del` utilisent un fond sombre semi-opaque **sur l'image** (overlay), où le blanc du texte/icône est intentionnel et lisible jour comme nuit — c'est l'exception admise à la règle « pas de #fff en dur ». Tout le reste passe par les tokens.

- [ ] **Step 3: Vérifier le build**

Run: `pnpm build`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/vitrine/Vitrine.css
git commit -m "style(vitrine): affordances d'édition inline (tokens jour/nuit)"
```

---

## Task 13: Vérification finale + version + push

**Files:**
- Modify: `src/version.ts` (bump patch `APP_VERSION`)

- [ ] **Step 1: Build + lint + tests complets**

Run: `pnpm build && pnpm lint && pnpm test`
Expected: build OK, lint 0 erreur, tous tests verts.

- [ ] **Step 2: Vérification manuelle (entité seedée `runes-de-chene`)**

Run: `pnpm dev`, ouvrir `/runes-de-chene` connecté en tant que propriétaire.
Vérifier dans l'ordre :
- Le bouton « ✏ Modifier ma vitrine » apparaît (et **pas** pour un visiteur non-owner).
- Toggle → crayons/+/champs apparaissent ; « ✓ Terminé » repasse en vue visiteur **identique** au public.
- Bio : éditer + ✓ → persiste (recharger la page).
- Spécialités : ajouter/retirer un chip → persiste, cap 8 respecté.
- Liens : ajouter (type/label/url sans `https://`) → l'URL est normalisée ; supprimer → persiste.
- Cover & avatar : upload → s'affiche immédiatement + persiste après reload.
- Galerie : ajouter plusieurs photos, supprimer une, glisser-déposer pour réordonner → l'ordre persiste après reload.
- Status pill « Enregistré ✓ » s'affiche après chaque écriture.
- Basculer le thème jour/nuit en édition : aucune zone illisible, pas de blanc cru hors overlays image.

- [ ] **Step 3: Bump version + commit + push**

Bumper le patch de `APP_VERSION` (chercher le fichier : `pnpm exec rg "APP_VERSION" src`).

```bash
git add -A
git commit -m "chore: bump version — vitrine édition inline Phase 3"
git push
```

---

## Self-Review (effectuée)

- **Couverture spec :** mode toggle ✓ (T11) · commit par bloc ✓/✕ ✓ (T3, T11) · actions atomiques ✓ (T2,T7,T8,T10) · périmètre complet cover/avatar/nom/métier/ville/bio/spécialités/liens/galerie ✓ (T7–T11) · `verified` exclu ✓ (non câblé) · `website` non touché ✓ · prop `editing` sur composants existants ✓ · primitives dans `edit/` ✓ (T3–T6) · hook `useVitrineEdit` ✓ (T2) · bucket unique `<actor_id>/{cover,avatar,gallery}/…` ✓ (T2 `uploadImage`) · galerie ajout multi + suppr + DnD ✓ (T10) · liens sans réordre ✓ (T5) · spécialités libres cap 8 ✓ (T4) · helpers purs testés ✓ (T1) · pas de migration ✓ · DA jour/nuit ✓ (T12) · ne pas régresser ✓ (rappel en tête).
- **Placeholders :** aucun — chaque step a son code/commande complets.
- **Cohérence des types :** `useVitrineEdit(actorId: string)` appelé avec `entity.actor_id` (T11). `updateEntity(patch)` ↔ `patchEntity`/`onField` (Record<string,unknown>). `VitrineLink` réutilisé (T5, T9, T11). `EntityGalleryRow` cohérent (T2, T10, T11). `reorderPositions` (T1) consommé par `reorderGallery` (T2). `addChip`/`SPECIALTIES_CAP` (T1) consommés par `ChipEditor` (T4). `normalizeLinkUrl` (T1) consommé par `LinkEditor` (T5).
