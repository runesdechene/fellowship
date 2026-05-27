# Vitrine « Carnet de route » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer la vitrine exposant en « carnet de route » : page de garde minimale + itinéraire d'escales (à venir) + tampons (passés), édition via modale. Sortir le profil social (galerie / À-propos long / compteurs / multi-liens / vérifié).

**Architecture:** Pur frontend. On reconstruit le rendu de `PublicProfile` autour de composants dédiés (`VitrineHeader` allégé, `VitrineSocialStrip`, `VitrineEscales`, `VitrineTampons`, `VitrineEditModal`). Les escales/tampons viennent de `useVitrine().season` (participations+events) découpées par `splitSeason`. L'édition passe par une modale qui écrit via `useVitrineEdit().updateEntity` + `uploadImage`. Logique de présentation pure extraite et testée (durée, année de départ, regroupement compagnons par événement). Aucune migration.

**Tech Stack:** React 19 + TS + Vite, Supabase, Vitest (helpers purs), tokens DA nuit/jour (`hsl(var(--…))`, `--copper`, `--lime`).

**Référence visuelle validée :** `.superpowers/brainstorm/8160-1779874636/content/site-v12.html` (page) et `site-modal4.html` (modale d'édition). Le CSS et le markup de ces fichiers sont la cible — les porter fidèlement.

**Contrainte de test (connue) :** RTL `render()` ne flush pas le sync sur cette stack → **TDD strict sur la logique pure uniquement**. Composants vérifiés par `pnpm build` + `pnpm lint` + test manuel sur `/runes-de-chene` (compte `uriel@lahoussaye.fr`, déjà owner en local).

**Ne pas régresser :** `git diff HEAD` avant d'éditer un fichier déjà touché sur la branche.

---

## File Structure

**Créés :**
- `src/components/vitrine/VitrineSocialStrip.tsx` — bande sociale compacte cliquable (abonnés · compagnons).
- `src/components/vitrine/VitrineEscales.tsx` — itinéraire des dates à venir.
- `src/components/vitrine/VitrineTampons.tsx` — dates passées en tampons ronds.
- `src/components/vitrine/edit/VitrineEditModal.tsx` — modale d'édition.
- `src/hooks/use-season-companions.ts` — map eventId → compagnons du visiteur qui y vont.

**Modifiés :**
- `src/lib/vitrine.ts` — helpers purs `eventDurationDays`, `firstSeasonYear`, `companionsByEvent`.
- `src/lib/vitrine.test.ts` — tests des helpers.
- `src/components/vitrine/VitrineHeader.tsx` — allégé (punchline, lien boutique, actions Modifier/Suivre/Partager/QR ; plus de chips/specialties/inline-edit/vérifié).
- `src/pages/PublicProfile.tsx` — réassemblage du carnet + ouverture modale.
- `src/pages/Vitrine.css` — refonte (cover full-bleed+fondu, escales, tampons, social strip, modale ; suppression des styles d'édition inline obsolètes).

**Supprimés (obsolètes après ce virage) :**
- `src/components/vitrine/VitrineGallery.tsx`, `VitrineLinks.tsx`, `VitrineSeason.tsx`, `VitrineStats.tsx`.
- `src/components/vitrine/edit/EditableText.tsx`, `ChipEditor.tsx`, `LinkEditor.tsx`, `ImageDrop.tsx`.

---

## Task 1: Helpers purs (TDD)

**Files:**
- Modify: `src/lib/vitrine.ts`
- Modify: `src/lib/vitrine.test.ts`

- [ ] **Step 1: Ajouter les tests (échec attendu)**

Ajouter à la fin de `src/lib/vitrine.test.ts` :

```ts
import { eventDurationDays, firstSeasonYear, companionsByEvent } from './vitrine'

describe('eventDurationDays', () => {
  it('compte les jours inclus (3 jours pour 12→14)', () => {
    expect(eventDurationDays('2026-06-12', '2026-06-14')).toBe(3)
  })
  it('1 jour si début = fin', () => {
    expect(eventDurationDays('2026-07-03', '2026-07-03')).toBe(1)
  })
  it('1 jour si fin manquante', () => {
    expect(eventDurationDays('2026-07-03', null)).toBe(1)
  })
})

describe('firstSeasonYear', () => {
  it('renvoie la plus petite année de début', () => {
    expect(firstSeasonYear([ev('a', '2024-05-01'), ev('b', '2023-09-01'), ev('c', '2025-01-01')])).toBe(2023)
  })
  it('null si vide', () => {
    expect(firstSeasonYear([])).toBeNull()
  })
})

describe('companionsByEvent', () => {
  it('regroupe les compagnons par event_id', () => {
    const rows = [
      { event_id: 'e1', actor_id: 'a', label: 'A', avatar_url: null, public_slug: 'a' },
      { event_id: 'e1', actor_id: 'b', label: 'B', avatar_url: null, public_slug: 'b' },
      { event_id: 'e2', actor_id: 'a', label: 'A', avatar_url: null, public_slug: 'a' },
    ]
    const map = companionsByEvent(rows)
    expect(map.get('e1')!.map(m => m.actor_id)).toEqual(['a', 'b'])
    expect(map.get('e2')!.length).toBe(1)
    expect(map.get('e3')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Lancer → échec**

Run: `pnpm exec vitest run src/lib/vitrine.test.ts`
Expected: FAIL (imports `eventDurationDays`/`firstSeasonYear`/`companionsByEvent` non résolus).

- [ ] **Step 3: Implémenter dans `src/lib/vitrine.ts`** (ajouter en fin de fichier)

```ts
/** Nombre de jours (inclus) entre début et fin ; 1 si fin absente/égale. */
export function eventDurationDays(start: string, end: string | null | undefined): number {
  const s = new Date(start)
  const e = end ? new Date(end) : s
  const ms = e.getTime() - s.getTime()
  return Math.max(1, Math.round(ms / 86400000) + 1)
}

/** Plus petite année de début parmi les événements ; null si vide. */
export function firstSeasonYear(events: SeasonEvent[]): number | null {
  if (events.length === 0) return null
  return Math.min(...events.map(e => new Date(e.start_date).getFullYear()))
}

export interface CompanionRow {
  event_id: string
  actor_id: string
  label: string | null
  avatar_url: string | null
  public_slug: string | null
}

/** Regroupe des lignes (event_id + acteur) en Map<event_id, acteurs[]>. */
export function companionsByEvent(rows: CompanionRow[]): Map<string, CompanionRow[]> {
  const map = new Map<string, CompanionRow[]>()
  for (const r of rows) {
    const arr = map.get(r.event_id) ?? []
    arr.push(r)
    map.set(r.event_id, arr)
  }
  return map
}
```

- [ ] **Step 4: Lancer → succès**

Run: `pnpm exec vitest run src/lib/vitrine.test.ts`
Expected: PASS (tous, dont les anciens `splitSeason`/`linkHost`/`linkTypeIcon`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/vitrine.ts src/lib/vitrine.test.ts
git commit -m "feat(vitrine): helpers carnet de route (durée, année départ, compagnons/event)"
```

---

## Task 2: Hook `useSeasonCompanions`

**Files:**
- Create: `src/hooks/use-season-companions.ts`

Renvoie, pour une liste d'event ids, les **compagnons du visiteur connecté** (amis) qui participent à chacun. Une seule requête amis + une requête participations.

- [ ] **Step 1: Écrire le hook**

```ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { companionsByEvent, type CompanionRow } from '@/lib/vitrine'

/** Map<eventId, compagnons du visiteur qui y vont>. Vide si non connecté. */
export function useSeasonCompanions(eventIds: string[]): Map<string, CompanionRow[]> {
  const { currentActor } = useAuth()
  const [map, setMap] = useState<Map<string, CompanionRow[]>>(new Map())
  const key = eventIds.slice().sort().join(',')

  useEffect(() => {
    if (!currentActor || eventIds.length === 0) { setMap(new Map()); return } // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false
    async function run() {
      const { data: friendIds } = await supabase.rpc('get_friend_ids', { p_user_id: currentActor!.id })
      const ids = (friendIds as string[] | null) ?? []
      if (ids.length === 0) { if (!cancelled) setMap(new Map()); return }
      const { data: parts } = await supabase
        .from('participations')
        .select('event_id, actor_id, actor_public:actor_id(label, avatar_url, public_slug)')
        .in('event_id', eventIds).in('actor_id', ids).eq('status', 'inscrit')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: CompanionRow[] = ((parts ?? []) as any[]).map(p => ({
        event_id: p.event_id, actor_id: p.actor_id,
        label: p.actor_public?.label ?? null, avatar_url: p.actor_public?.avatar_url ?? null, public_slug: p.actor_public?.public_slug ?? null,
      }))
      if (!cancelled) setMap(companionsByEvent(rows))
    }
    run()
    return () => { cancelled = true }
  }, [key, currentActor]) // eslint-disable-line react-hooks/exhaustive-deps

  return map
}
```

> Note : la jointure `actor_public:actor_id(...)` suppose une FK participations→actor_public exploitable ; si l'éditeur de requête Supabase la refuse, faire un 2e `select` sur `actor_public` filtré `in('actor_id', …)` et joindre en JS (même pattern que `fetchNetwork` dans `use-vitrine.ts`). Vérifier au build/au test manuel.

- [ ] **Step 2: Vérifier le typecheck**

Run: `pnpm build`
Expected: pas d'erreur TS dans `use-season-companions.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-season-companions.ts
git commit -m "feat(vitrine): hook useSeasonCompanions (compagnons du visiteur par escale)"
```

---

## Task 3: `VitrineSocialStrip`

**Files:**
- Create: `src/components/vitrine/VitrineSocialStrip.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
import { avatarGradient } from '@/lib/avatar-gradient'
import type { NetworkMember } from '@/lib/profile-network'

interface Props {
  followers: NetworkMember[]
  friends: NetworkMember[]
  onOpen?: () => void
}

/** Bande sociale compacte et cliquable : avatars empilés + « N abonnés · M compagnons ». */
export function VitrineSocialStrip({ followers, friends, onOpen }: Props) {
  const preview = followers.slice(0, 3)
  return (
    <button type="button" className="v-social" onClick={onOpen}>
      <div className="v-avs">
        {preview.map(m => {
          const name = m.brand_name ?? m.display_name ?? '?'
          return (
            <span key={m.id} style={!m.avatar_url ? { background: avatarGradient(name) } : undefined}>
              {m.avatar_url ? <img src={m.avatar_url} alt="" /> : (name[0]?.toUpperCase() ?? '?')}
            </span>
          )
        })}
      </div>
      <span className="v-social-t">
        <b>{followers.length} abonné{followers.length !== 1 ? 's' : ''}</b>
        <span className="m"> · {friends.length} compagnon{friends.length !== 1 ? 's' : ''} exposant{friends.length !== 1 ? 's' : ''}</span>
      </span>
      <span className="v-social-ch" aria-hidden="true">›</span>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/VitrineSocialStrip.tsx
git commit -m "feat(vitrine): VitrineSocialStrip (code social compact cliquable)"
```

---

## Task 4: `VitrineEscales`

**Files:**
- Create: `src/components/vitrine/VitrineEscales.tsx`

Itinéraire des dates **à venir**. Date de début en ancre, affiche portrait, tags colorés (via `useTags`), lieu (pin), durée, compagnons. Bouton « Intégrer à mon site » dans l'en-tête.

- [ ] **Step 1: Écrire le composant**

```tsx
import { Link } from 'react-router-dom'
import { useTags } from '@/hooks/use-tags'
import { eventDurationDays, type SeasonEvent, type CompanionRow } from '@/lib/vitrine'
import { avatarGradient } from '@/lib/avatar-gradient'

const MOIS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']

interface Props {
  events: SeasonEvent[]
  companions: Map<string, CompanionRow[]>
  onEmbed?: () => void
}

export function VitrineEscales({ events, companions, onEmbed }: Props) {
  const { tags } = useTags()
  const tagOf = (name: string) => tags.find(t => t.value === name || t.label === name)
  if (events.length === 0) return null

  return (
    <section className="v-sec">
      <div className="v-sec-h">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><polygon points="16 8 14 14 8 16 10 10" /></svg>
        Prochaines escales <span className="v-sec-c">{events.length} date{events.length !== 1 ? 's' : ''}</span>
        {onEmbed && (
          <button type="button" className="v-embed" onClick={onEmbed} title="Intégrer mon agenda sur mon site">
            <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
            Intégrer à mon site
          </button>
        )}
      </div>
      <div className="v-escales">
        {events.map(e => {
          const d = new Date(e.start_date)
          const comps = companions.get(e.id) ?? []
          const geo = [e.city, e.department ? `(${e.department})` : null].filter(Boolean).join(' ')
          return (
            <Link key={e.id} to={`/evenement/${e.id}`} state={{ from: '/' }} className="v-escale">
              <div className="v-edate"><b>{d.getDate()}</b><span>{MOIS[d.getMonth()]}</span><i>{d.getFullYear()}</i></div>
              <div className="v-eposter">{e.image_url && <img src={e.image_url} alt="" loading="lazy" />}</div>
              <div className="v-einfo">
                <div className="v-en">{e.name}</div>
                {e.tags && e.tags.length > 0 && (
                  <div className="v-etags">
                    {e.tags.slice(0, 3).map(name => {
                      const t = tagOf(name)
                      return <span key={name} className="v-etag" style={t ? { background: t.bg, color: t.color } : undefined}>{t?.label ?? name}</span>
                    })}
                  </div>
                )}
                {geo && (
                  <div className="v-eloc">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    {geo}
                  </div>
                )}
                <div className="v-edur">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  {eventDurationDays(e.start_date, e.end_date)} jour{eventDurationDays(e.start_date, e.end_date) !== 1 ? 's' : ''}
                </div>
                {comps.length > 0 && (
                  <div className="v-ecomp">
                    <div className="v-avs">
                      {comps.slice(0, 2).map(c => (
                        <span key={c.actor_id} style={!c.avatar_url ? { background: avatarGradient(c.label ?? '?') } : undefined}>
                          {c.avatar_url ? <img src={c.avatar_url} alt="" /> : (c.label?.[0]?.toUpperCase() ?? '?')}
                        </span>
                      ))}
                    </div>
                    {comps.length} compagnon{comps.length !== 1 ? 's' : ''} t'y retrouve{comps.length !== 1 ? 'nt' : ''}
                  </div>
                )}
              </div>
              <span className="v-echev" aria-hidden="true">›</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/VitrineEscales.tsx
git commit -m "feat(vitrine): VitrineEscales (itinéraire à venir, date-ancre + affiche + tags)"
```

---

## Task 5: `VitrineTampons`

**Files:**
- Create: `src/components/vitrine/VitrineTampons.tsx`

Dates **passées** en tampons ronds (affiche encrée), nom·ville, année. « +N » si tronqué.

- [ ] **Step 1: Écrire le composant**

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { firstSeasonYear, type SeasonEvent } from '@/lib/vitrine'

const MAX = 8

interface Props { events: SeasonEvent[] }

export function VitrineTampons({ events }: Props) {
  const [expanded, setExpanded] = useState(false)
  if (events.length === 0) return null
  const since = firstSeasonYear(events)
  const shown = expanded ? events : events.slice(0, MAX)
  const rest = events.length - shown.length

  return (
    <section className="v-sec">
      <div className="v-sec-h">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" strokeDasharray="3 2" /><path d="M9 12l2 2 4-4" /></svg>
        {since ? `Sur la route depuis ${since}` : 'Déjà passés'}
        <span className="v-sec-c">{events.length} escale{events.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="v-tampons">
        {shown.map(e => {
          const yr = `'${String(new Date(e.start_date).getFullYear()).slice(2)}`
          const geo = e.city ?? ''
          return (
            <Link key={e.id} to={`/evenement/${e.id}`} state={{ from: '/' }} className="v-stamp">
              <div className="v-stamp-pm"><div className="v-stamp-ring">
                {e.image_url && <div className="v-stamp-img" style={{ backgroundImage: `url(${e.image_url})` }} />}
                <span className="v-stamp-yr">{yr}</span>
              </div></div>
              <div className="v-stamp-cap">{e.name}<span>{geo}</span></div>
            </Link>
          )
        })}
        {rest > 0 && <button type="button" className="v-stamp-more" onClick={() => setExpanded(true)}>+{rest}</button>}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/VitrineTampons.tsx
git commit -m "feat(vitrine): VitrineTampons (passés en tampons ronds + voir plus)"
```

---

## Task 6: `VitrineEditModal`

**Files:**
- Create: `src/components/vitrine/edit/VitrineEditModal.tsx`

Modale d'édition. Champs nom/métier/ville/punchline(bio)/lien boutique ; tuiles cover+avatar (overlay caméra) ; Enregistrer = `updateEntity` + uploads. Porte le markup/CSS validés (`site-modal4.html`).

- [ ] **Step 1: Écrire le composant**

```tsx
import { useRef, useState } from 'react'
import { X, Camera, Check, X as XIcon } from 'lucide-react'
import type { EntityRow, VitrineLink } from '@/types/database'
import type { VitrineEditApi } from '@/hooks/use-vitrine-edit'

interface Props {
  entity: EntityRow
  api: VitrineEditApi
  onClose: () => void
  onSaved: (patch: Record<string, unknown>) => void
}

export function VitrineEditModal({ entity, api, onClose, onSaved }: Props) {
  const firstLink = ((entity.links as unknown as VitrineLink[]) ?? [])[0]
  const [brand, setBrand] = useState(entity.brand_name)
  const [craft, setCraft] = useState(entity.craft_type ?? '')
  const [city, setCity] = useState(entity.city ?? '')
  const [bio, setBio] = useState(entity.bio ?? '')
  const [link, setLink] = useState(firstLink?.url ?? '')
  const [cover, setCover] = useState(entity.banner_url)
  const [avatar, setAvatar] = useState(entity.avatar_url)
  const [saving, setSaving] = useState(false)
  const coverRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  async function pick(kind: 'cover' | 'avatar', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const url = await api.uploadImage(file, kind)
    if (url) { kind === 'cover' ? setCover(url) : setAvatar(url) }
    if (e.target) e.target.value = ''
  }

  async function save() {
    setSaving(true)
    const links: VitrineLink[] = link.trim()
      ? [{ type: 'shop', label: 'Boutique', url: /^[a-z]+:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}` }]
      : []
    const patch: Record<string, unknown> = {
      brand_name: brand.trim() || entity.brand_name,
      craft_type: craft.trim() || null,
      city: city.trim() || null,
      bio: bio.trim() || null,
      links,
      banner_url: cover,
      avatar_url: avatar,
    }
    const ok = await api.updateEntity(patch)
    setSaving(false)
    if (ok) { onSaved(patch); onClose() }
  }

  return (
    <div className="v-backdrop" onClick={onClose}>
      <div className="v-modal" onClick={e => e.stopPropagation()}>
        <div className="v-mhead">
          <h3>Modifier ma vitrine</h3>
          <button type="button" className="v-mx" onClick={onClose} aria-label="Fermer"><X /></button>
        </div>
        <div className="v-mbody">
          <div className="v-media">
            <button type="button" className="v-mtile v-mtile-ph" style={avatar ? { backgroundImage: `url(${avatar})` } : undefined} onClick={() => avatarRef.current?.click()}>
              <span className="v-ov"><Camera /></span>
              <input ref={avatarRef} type="file" accept="image/*" hidden onChange={e => pick('avatar', e)} />
            </button>
            <button type="button" className="v-mtile v-mtile-cv" style={cover ? { backgroundImage: `url(${cover})` } : undefined} onClick={() => coverRef.current?.click()}>
              <span className="v-ov"><Camera /></span>
              <input ref={coverRef} type="file" accept="image/*" hidden onChange={e => pick('cover', e)} />
            </button>
          </div>

          <div className="v-field"><label>Nom de la marque</label><input className="v-inp" value={brand} onChange={e => setBrand(e.target.value)} /></div>
          <div className="v-row2">
            <div className="v-field"><label>Métier</label><input className="v-inp" value={craft} onChange={e => setCraft(e.target.value)} placeholder="Céramiste…" /></div>
            <div className="v-field"><label>Ville</label><input className="v-inp" value={city} onChange={e => setCity(e.target.value)} placeholder="Lyon…" /></div>
          </div>
          <div className="v-field">
            <label>Une phrase qui te résume</label>
            <textarea className="v-inp" maxLength={140} value={bio} onChange={e => setBio(e.target.value)} placeholder="Ton univers en une phrase…" />
            <div className="v-hint"><span>Apparaît sous ton nom.</span><span>{bio.length} / 140</span></div>
          </div>
          <div className="v-field">
            <label>Lien boutique</label>
            <input className="v-inp" value={link} onChange={e => setLink(e.target.value)} placeholder="boutique.monsite.fr" />
            <div className="v-hint"><span>Affiché en vert sous ta phrase.</span></div>
          </div>
        </div>
        <div className="v-mfoot">
          <button type="button" className="v-cancel" onClick={onClose}>Annuler</button>
          <button type="button" className="v-save" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}
```

> `Check`/`XIcon` importés mais non utilisés : retirer de l'import si `noUnusedLocals` bronche (garder `X`, `Camera`). Le build le dira (Task 9).

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/edit/VitrineEditModal.tsx
git commit -m "feat(vitrine): VitrineEditModal (édition identité + cover/avatar, façon Instagram)"
```

---

## Task 7: `VitrineHeader` allégé

**Files:**
- Modify: `src/components/vitrine/VitrineHeader.tsx` (remplacer tout le contenu)

Page de garde : avatar (bordé), nom, métier·ville, punchline, lien boutique (vert), actions. **Plus** de vérifié, chips/specialties, inline edit. Le bouton primaire = Modifier (owner) ou Suivre (visiteur).

- [ ] **Step 1: Réécrire le fichier**

```tsx
import { UserPlus, Check, Share2, QrCode, Pencil, Link2 } from 'lucide-react'
import { avatarGradient } from '@/lib/avatar-gradient'
import { linkHost } from '@/lib/vitrine'
import type { EntityRow, VitrineLink } from '@/types/database'

interface Props {
  entity: EntityRow
  canEdit: boolean
  isFollowing: boolean
  onEdit?: () => void
  onToggleFollow?: () => void
  onShare: () => void
  onQR: () => void
}

export function VitrineHeader({ entity, canEdit, isFollowing, onEdit, onToggleFollow, onShare, onQR }: Props) {
  const subtitle = [entity.craft_type, [entity.city, entity.department ? `(${entity.department})` : null].filter(Boolean).join(' ')]
    .filter(Boolean).join(' · ')
  const initials = entity.brand_name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()
  const link = ((entity.links as unknown as VitrineLink[]) ?? [])[0]

  return (
    <>
      <header className="v-head">
        <div className="v-av" style={!entity.avatar_url ? { background: avatarGradient(entity.brand_name) } : undefined}>
          {entity.avatar_url ? <img src={entity.avatar_url} alt={entity.brand_name} /> : <span className="v-av-fallback">{initials}</span>}
        </div>
        <div className="v-id">
          <div className="v-brand">{entity.brand_name}</div>
          {subtitle && <div className="v-sub">{subtitle}</div>}
        </div>
        <div className="v-act">
          {canEdit ? (
            <button type="button" className="v-btn v-btn-p" onClick={onEdit}><Pencil /> Modifier</button>
          ) : onToggleFollow && (
            <button type="button" className={`v-btn ${isFollowing ? 'v-btn-o is-on' : 'v-btn-p'}`} onClick={onToggleFollow} aria-pressed={isFollowing}>
              {isFollowing ? <Check /> : <UserPlus />}<span>{isFollowing ? 'Suivi' : 'Suivre'}</span>
            </button>
          )}
          <button type="button" className="v-iconbtn" title="Partager" onClick={onShare} aria-label="Partager"><Share2 /></button>
          <button type="button" className="v-iconbtn" title="QR / lien" onClick={onQR} aria-label="QR Code"><QrCode /></button>
        </div>
      </header>

      {entity.bio && <p className="v-punch">{entity.bio}</p>}
      {link && (
        <a className="v-biolink" href={link.url} target="_blank" rel="noopener noreferrer">
          <Link2 /> {linkHost(link.url)}
        </a>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vitrine/VitrineHeader.tsx
git commit -m "feat(vitrine): VitrineHeader allégé (punchline + lien boutique + actions)"
```

---

## Task 8: Réassemblage `PublicProfile`

**Files:**
- Modify: `src/pages/PublicProfile.tsx` (remplacer tout le contenu)

- [ ] **Step 1: Réécrire le fichier**

```tsx
import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useVitrine } from '@/hooks/use-vitrine'
import { useVitrineEdit } from '@/hooks/use-vitrine-edit'
import { useFollowStatus } from '@/hooks/use-follows'
import { useSeasonCompanions } from '@/hooks/use-season-companions'
import { canEditVitrine, splitSeason } from '@/lib/vitrine'
import { VitrineCover } from '@/components/vitrine/VitrineCover'
import { VitrineHeader } from '@/components/vitrine/VitrineHeader'
import { VitrineSocialStrip } from '@/components/vitrine/VitrineSocialStrip'
import { VitrineEscales } from '@/components/vitrine/VitrineEscales'
import { VitrineTampons } from '@/components/vitrine/VitrineTampons'
import { VitrineEditModal } from '@/components/vitrine/edit/VitrineEditModal'
import { QRCodeModal } from '@/components/profile/QRCodeModal'
import { EmbedModal } from '@/components/profile/EmbedModal'
import type { EntityRow } from '@/types/database'
import './Vitrine.css'

interface PublicProfilePageProps { overrideSlug?: string }

export function PublicProfilePage({ overrideSlug }: PublicProfilePageProps = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = overrideSlug ?? paramSlug?.replace(/^@/, '')
  const { currentActor, entities } = useAuth()
  const data = useVitrine(slug)
  const { isFollowing, toggleFollow } = useFollowStatus(data.entity?.actor_id)
  const [showQR, setShowQR] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const [entity, setEntity] = useState<EntityRow | null>(null)
  const seededFor = useRef<string | null>(null)
  useEffect(() => {
    if (data.entity && seededFor.current !== data.entity.actor_id) {
      seededFor.current = data.entity.actor_id
      setEntity(data.entity) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [data.entity])

  const edit = useVitrineEdit(entity?.actor_id ?? '')
  const { upcoming, past } = splitSeason(data.season, new Date())
  const companions = useSeasonCompanions(upcoming.map(e => e.id))

  if (data.loading) return <div className="profile-loading">Chargement…</div>
  if (data.notFound || !entity) return (
    <div className="profile-not-found">
      <div className="profile-not-found-code">404</div>
      <h1 className="profile-not-found-title">Profil introuvable</h1>
      <p className="profile-not-found-text">Aucun profil ne correspond à <span>@{slug}</span>.</p>
      <Link to="/" className="profile-not-found-link">Retour à l'accueil</Link>
    </div>
  )

  const canEdit = canEditVitrine(entities.map(e => e.actor_id), entity.actor_id)
  const canFollow = !!currentActor && !canEdit

  return (
    <div className="v-page-root">
      <VitrineCover url={entity.banner_url} />
      <div className="vitrine">
        <VitrineHeader
          entity={entity} canEdit={canEdit} isFollowing={isFollowing}
          onEdit={() => setEditOpen(true)}
          onToggleFollow={canFollow ? toggleFollow : undefined}
          onShare={() => { navigator.share?.({ url: window.location.href }).catch(() => {}) }}
          onQR={() => setShowQR(true)}
        />
        <VitrineSocialStrip followers={data.followers} friends={data.friends} />
        <VitrineEscales events={upcoming} companions={companions} onEmbed={canEdit ? () => setShowEmbed(true) : undefined} />
        <VitrineTampons events={past} />
        <div className="v-footer">
          <span className="v-footer-mark">✦</span>
          Carnet de route Fellowship{entity.public_slug ? <> · <code>flw.sh/{entity.public_slug}</code></> : null}
        </div>
      </div>

      {editOpen && <VitrineEditModal entity={entity} api={edit} onClose={() => setEditOpen(false)} onSaved={patch => setEntity(e => (e ? { ...e, ...patch } as EntityRow : e))} />}
      {showQR && entity.public_slug && <QRCodeModal slug={entity.public_slug} onClose={() => setShowQR(false)} />}
      {showEmbed && entity.public_slug && <EmbedModal slug={entity.public_slug} onClose={() => setShowEmbed(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: 0 erreur. (Si erreurs d'imports vers composants encore non supprimés, c'est OK — la Task 10 supprime les obsolètes ; mais aucun import vers eux ne doit subsister ici.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/PublicProfile.tsx
git commit -m "feat(vitrine): PublicProfile réassemblé en carnet de route"
```

---

## Task 9: CSS `Vitrine.css`

**Files:**
- Modify: `src/pages/Vitrine.css`

Porter le CSS validé. Réutiliser les tokens existants. **Supprimer** les anciens blocs devenus inutiles (galerie `.v-gallery*`, liens `.v-links*`, saison `.v-fest*`/`.v-season*`, stats `.v-stats*`, et tout le bloc « Édition inline (Phase 3) » `.v-edit-*`/`.v-chip-*`/`.v-link-*`/`.v-imagedrop`/`.v-gphoto-*`/`.v-field`/`.v-btn-edit`/`.vitrine.is-editing …`).

- [ ] **Step 1: Lire les tokens & repérer les blocs à retirer**

Run: `pnpm exec rg -n "v-gallery|v-links|v-fest|v-season|v-stats|Édition inline|v-edit-|v-chip|v-imagedrop|v-gphoto|v-btn-edit|is-editing|v-field|v-about|v-nudge" src/pages/Vitrine.css`
Noter les plages à supprimer.

- [ ] **Step 2: Retirer les blocs obsolètes** listés au Step 1 (galerie, liens, saison, stats, édition inline Phase 3, about, nudge). Conserver : `.v-page-root`, `.vitrine`, `.v-cover*`, `.v-head`, `.v-av*`, `.v-id`, `.v-brand`, `.v-sub`, `.v-act`, `.v-btn*`, `.v-iconbtn`, `.v-verified` (peut rester, inutilisé), `.v-footer*`, `.profile-*`.

- [ ] **Step 3: Cover full-bleed + fondu** — remplacer le bloc `.v-cover` par :

```css
.v-cover { position: relative; width: 100%; height: 300px; }
.v-cover img { width: 100%; height: 100%; object-fit: cover; object-position: center 32%; display: block; }
.v-cover-fallback { width: 100%; height: 100%; background: linear-gradient(135deg, hsl(var(--card)), hsl(var(--background))); }
.v-cover::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, hsl(var(--background)/0) 35%, hsl(var(--background)) 100%); }
.vitrine { max-width: 800px; margin: -64px auto 0; padding: 0 28px 64px; position: relative; z-index: 1; }
```

- [ ] **Step 4: Ajouter les styles carnet** (en fin de fichier) — porter depuis `site-v12.html` (escales/tampons/social) et `site-modal4.html` (modale), en convertissant les couleurs en tokens (`var(--copper)`→`var(--copper)`, `--lime`, `hsl(var(--card))`, `hsl(var(--border))`, `hsl(var(--foreground))`, `hsl(var(--muted-foreground))`) :

```css
/* ── Page de garde ── */
.v-av { width: 112px; height: 112px; border-radius: 26px; border: 5px solid hsl(var(--background)); overflow: hidden; flex-shrink: 0; box-shadow: 0 14px 38px rgba(0,0,0,.5); }
.v-av img { width: 100%; height: 100%; object-fit: cover; }
.v-punch { font-size: 15px; font-style: italic; color: hsl(var(--foreground)); opacity: .85; margin-top: 16px; line-height: 1.5; max-width: 62ch; }
.v-biolink { display: inline-flex; align-items: center; gap: 7px; margin-top: 11px; color: var(--lime); font-size: 14.5px; font-weight: 600; text-decoration: none; }
.v-biolink:hover { text-decoration: underline; }
.v-biolink svg { width: 16px; height: 16px; fill: none; stroke: currentColor; }
.v-btn-o.is-on { background: color-mix(in srgb, var(--forest) 20%, transparent); border: 1px solid color-mix(in srgb, var(--forest) 45%, transparent); color: var(--forest); }

/* ── Bande sociale ── */
.v-social { display: inline-flex; align-items: center; gap: 11px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 12px; padding: 10px 14px; margin-top: 16px; cursor: pointer; color: hsl(var(--foreground)); font: inherit; }
.v-avs { display: flex; }
.v-avs span { width: 28px; height: 28px; border-radius: 50%; border: 2px solid hsl(var(--card)); margin-left: -9px; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; background-size: cover; }
.v-avs span:first-child { margin-left: 0; }
.v-avs img { width: 100%; height: 100%; object-fit: cover; }
.v-social-t { font-size: 13.5px; } .v-social-t b { font-weight: 700; } .v-social-t .m { color: hsl(var(--muted-foreground)); }
.v-social-ch { margin-left: 6px; color: hsl(var(--muted-foreground)); }

/* ── Sections ── */
.v-sec { margin-top: 34px; }
.v-sec-h { font-family: var(--font-heading); font-weight: 700; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: hsl(var(--muted-foreground)); display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.v-sec-h svg { width: 15px; height: 15px; fill: none; stroke: currentColor; }
.v-sec-c { font-weight: 500; text-transform: none; letter-spacing: 0; font-size: 12.5px; }
.v-embed { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; background: transparent; border: 1.5px solid color-mix(in srgb, hsl(var(--foreground)) 28%, transparent); color: hsl(var(--foreground)); border-radius: 8px; padding: 4px 9px; font-family: var(--font-body); font-size: 11.5px; font-weight: 600; text-transform: none; letter-spacing: 0; cursor: pointer; }
.v-embed:hover { border-color: color-mix(in srgb, hsl(var(--foreground)) 50%, transparent); }
.v-embed svg { width: 13px; height: 13px; fill: none; stroke: currentColor; }

/* ── Escales ── */
.v-escales { display: flex; flex-direction: column; gap: 14px; }
.v-escale { display: flex; align-items: center; gap: 18px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 18px; padding: 16px 18px; text-decoration: none; color: inherit; transition: border-color .15s, transform .15s; }
.v-escale:hover { border-color: hsl(33 16% 34%); transform: translateY(-1px); }
.v-edate { flex-shrink: 0; width: 58px; text-align: center; }
.v-edate b { font-family: var(--font-heading); font-weight: 800; font-size: 28px; color: hsl(var(--foreground)); line-height: 1; display: block; }
.v-edate span { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: hsl(var(--muted-foreground)); margin-top: 4px; display: block; }
.v-edate i { font-style: normal; font-size: 11px; color: hsl(var(--muted-foreground)); opacity: .7; margin-top: 3px; display: block; }
.v-eposter { width: 86px; height: 116px; border-radius: 11px; overflow: hidden; flex-shrink: 0; background: hsl(var(--background)); box-shadow: 0 6px 16px rgba(0,0,0,.35); }
.v-eposter img { width: 100%; height: 100%; object-fit: cover; }
.v-einfo { flex: 1; min-width: 0; }
.v-en { font-family: var(--font-heading); font-weight: 700; font-size: 18px; line-height: 1.2; }
.v-etags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.v-etag { font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 999px; background: hsl(var(--background)); color: hsl(var(--muted-foreground)); }
.v-eloc { display: flex; align-items: center; gap: 6px; color: hsl(var(--foreground)); opacity: .82; font-size: 14px; margin-top: 9px; }
.v-eloc svg { width: 15px; height: 15px; fill: none; stroke: currentColor; color: hsl(var(--muted-foreground)); }
.v-edur { display: flex; align-items: center; gap: 6px; color: hsl(var(--muted-foreground)); font-size: 12.5px; margin-top: 5px; }
.v-edur svg { width: 14px; height: 14px; fill: none; stroke: currentColor; }
.v-ecomp { display: flex; align-items: center; gap: 8px; margin-top: 9px; font-size: 12.5px; color: hsl(var(--muted-foreground)); }
.v-ecomp .v-avs span { width: 22px; height: 22px; }
.v-echev { color: hsl(var(--muted-foreground)); flex-shrink: 0; }

/* ── Tampons ── */
.v-tampons { display: flex; flex-wrap: wrap; gap: 22px; align-items: flex-start; }
.v-stamp { width: 96px; text-align: center; text-decoration: none; }
.v-stamp-pm { padding: 4px; border: 1.5px dashed hsl(33 16% 38%); border-radius: 50%; width: 96px; height: 96px; transition: border-color .18s, transform .18s; }
.v-stamp-ring { width: 100%; height: 100%; border-radius: 50%; position: relative; overflow: hidden; box-shadow: inset 0 0 0 2px hsl(33 16% 30%); transition: box-shadow .18s; }
.v-stamp-img { position: absolute; inset: 0; background-size: cover; background-position: center; filter: saturate(.6) contrast(1.02) brightness(.92); transition: filter .25s; }
.v-stamp-yr { position: absolute; left: 0; right: 0; bottom: 7px; text-align: center; font-family: var(--font-heading); font-weight: 800; font-size: 12px; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.75); z-index: 2; }
.v-stamp-cap { margin-top: 9px; font-size: 12px; color: hsl(var(--foreground)); opacity: .8; font-weight: 600; line-height: 1.25; }
.v-stamp-cap span { display: block; color: hsl(var(--muted-foreground)); font-weight: 400; font-size: 11px; }
.v-stamp:hover .v-stamp-pm { border-color: color-mix(in srgb, var(--lime) 55%, transparent); transform: translateY(-2px); }
.v-stamp:hover .v-stamp-ring { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--lime) 50%, transparent), 0 8px 20px rgba(0,0,0,.4); }
.v-stamp:hover .v-stamp-img { filter: saturate(1) contrast(1.02) brightness(1); }
.v-stamp-more { width: 96px; height: 96px; border-radius: 50%; border: 1.5px dashed hsl(33 16% 38%); background: transparent; display: flex; align-items: center; justify-content: center; color: hsl(var(--muted-foreground)); font-weight: 700; font-size: 14px; cursor: pointer; }

/* ── Modale d'édition ── */
.v-backdrop { position: fixed; inset: 0; background: rgba(8,5,4,.62); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 50; }
.v-modal { width: 100%; max-width: 430px; max-height: 88vh; display: flex; flex-direction: column; background: hsl(var(--card)); border-radius: 22px; box-shadow: 0 40px 120px rgba(0,0,0,.6); overflow: hidden; }
.v-mhead { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 8px; }
.v-mhead h3 { font-family: var(--font-heading); font-weight: 800; font-size: 16px; }
.v-mx { width: 30px; height: 30px; border-radius: 9px; border: none; background: transparent; color: hsl(var(--muted-foreground)); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.v-mx svg { width: 18px; height: 18px; fill: none; stroke: currentColor; }
.v-mx:hover { background: hsl(9 22% 17%); color: hsl(var(--foreground)); }
.v-mbody { padding: 8px 22px 4px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.v-media { display: flex; gap: 12px; }
.v-mtile { position: relative; border: none; padding: 0; border-radius: 16px; height: 96px; background-color: hsl(var(--background)); background-size: cover; background-position: center; cursor: pointer; overflow: hidden; }
.v-mtile-ph { width: 96px; flex-shrink: 0; }
.v-mtile-cv { flex: 1; background-position: center 32%; }
.v-ov { position: absolute; inset: 0; background: rgba(13,9,8,.34); display: flex; align-items: center; justify-content: center; color: #fff; transition: background .15s; }
.v-mtile:hover .v-ov { background: rgba(13,9,8,.52); }
.v-ov svg { width: 23px; height: 23px; fill: none; stroke: currentColor; filter: drop-shadow(0 1px 3px rgba(0,0,0,.6)); }
.v-field { display: flex; flex-direction: column; gap: 7px; }
.v-field label { font-size: 12px; font-weight: 600; color: hsl(var(--muted-foreground)); }
.v-inp { font-family: var(--font-body); font-size: 14px; color: hsl(var(--foreground)); background: hsl(9 22% 16.5%); border: none; border-radius: 13px; padding: 11px 14px; width: 100%; transition: box-shadow .15s, background .15s; }
.v-inp::placeholder { color: hsl(var(--muted-foreground)); }
.v-inp:focus { outline: none; background: hsl(9 22% 19%); box-shadow: 0 0 0 2px color-mix(in srgb, var(--copper) 60%, transparent); }
textarea.v-inp { resize: vertical; min-height: 60px; line-height: 1.5; }
.v-hint { font-size: 11px; color: hsl(var(--muted-foreground)); opacity: .75; display: flex; justify-content: space-between; gap: 8px; padding: 0 2px; }
.v-row2 { display: flex; gap: 12px; } .v-row2 .v-field { flex: 1; }
.v-mfoot { display: flex; align-items: center; gap: 12px; padding: 14px 22px 20px; }
.v-cancel { background: none; border: none; color: hsl(var(--muted-foreground)); font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; padding: 6px; }
.v-cancel:hover { color: hsl(var(--foreground)); }
.v-save { margin-left: auto; flex: 1; max-width: 200px; background: linear-gradient(135deg, var(--copper), var(--copper-d)); color: #fff; border: none; border-radius: 13px; padding: 12px; font-family: var(--font-body); font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 22px hsl(20 65% 32%/.4); }
.v-save:hover { filter: brightness(1.07); } .v-save:disabled { opacity: .7; cursor: default; }
```

> **Jour/nuit** : les `hsl(9 22% 16.5%)` / `hsl(9 22% 17%)` / `hsl(33 16% …)` sont des surfaces sombres en dur. À l'étape de vérif manuelle, basculer en thème **jour** : si une zone devient illisible, remplacer par un token (`hsl(var(--secondary))`, `hsl(var(--border))`). Garder les overlays sur image (`rgba(13,9,8,…)`, `#fff`) — intentionnels.

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: OK.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Vitrine.css
git commit -m "style(vitrine): refonte CSS carnet de route (cover/escales/tampons/social/modale)"
```

---

## Task 10: Suppression des composants obsolètes

**Files:**
- Delete: `src/components/vitrine/{VitrineGallery,VitrineLinks,VitrineSeason,VitrineStats}.tsx`
- Delete: `src/components/vitrine/edit/{EditableText,ChipEditor,LinkEditor,ImageDrop}.tsx`

- [ ] **Step 1: Vérifier qu'aucun import ne subsiste**

Run: `pnpm exec rg -n "VitrineGallery|VitrineLinks|VitrineSeason|VitrineStats|edit/EditableText|edit/ChipEditor|edit/LinkEditor|edit/ImageDrop" src`
Expected : **aucune** occurrence hors des fichiers à supprimer (sinon retirer l'import fautif d'abord).

- [ ] **Step 2: Supprimer**

```bash
git rm src/components/vitrine/VitrineGallery.tsx src/components/vitrine/VitrineLinks.tsx src/components/vitrine/VitrineSeason.tsx src/components/vitrine/VitrineStats.tsx
git rm src/components/vitrine/edit/EditableText.tsx src/components/vitrine/edit/ChipEditor.tsx src/components/vitrine/edit/LinkEditor.tsx src/components/vitrine/edit/ImageDrop.tsx
```

- [ ] **Step 3: Build + lint + tests**

Run: `pnpm build && pnpm lint && pnpm test`
Expected: 0 erreur, tests verts. (Si `use-vitrine-edit.ts` expose des méthodes galerie désormais inutilisées — `addGalleryImages`/`removeGalleryImage`/`reorderGallery` — les laisser : `updateEntity` + `uploadImage` restent utilisés ; pas de import cassé.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(vitrine): supprime galerie/liens/saison/stats + primitives d'édition inline (obsolètes)"
```

---

## Task 11: Vérification finale + version + push

**Files:**
- Modify: `package.json` (bump patch)

- [ ] **Step 1: Build + lint + tests complets**

Run: `pnpm build && pnpm lint && pnpm test`
Expected: build OK, lint 0, tests verts.

- [ ] **Step 2: Vérification manuelle** — `pnpm dev`, `/runes-de-chene` connecté `uriel@lahoussaye.fr` :
- Cover full-bleed + fondu ; identité à la limite du dégradé ; punchline + lien boutique vert.
- Bande sociale « N abonnés · M compagnons ».
- 🧭 Prochaines escales : date à gauche, affiche portrait, tags colorés, lieu+pin, durée en jours, « compagnons t'y retrouvent » si applicable ; bouton « Intégrer à mon site » (owner) ouvre l'EmbedModal.
- 🎫 Tampons : affiches rondes, hover qui ravive + vire au vert ; « +N » déplie.
- **Modifier** ouvre la modale ; changer cover/avatar, éditer champs, **Enregistrer** → persiste après reload ; **Annuler** ferme sans écrire.
- Visiteur (déconnecté ou autre compte) : pas de Modifier, bouton **Suivre** présent ; pas d'embed.
- Bascule thème **jour** : tout reste lisible.

- [ ] **Step 3: Bump version + push**

Bump patch dans `package.json` (`pnpm exec rg "\"version\"" package.json`).

```bash
git add -A
git commit -m "chore: bump version — vitrine carnet de route"
git push
```

---

## Self-Review (effectuée)

- **Couverture spec :** cover full-bleed+fondu ✓ (T9) · page de garde minimale (avatar bordé/nom/métier·ville/punchline/lien boutique vert) ✓ (T7,T9) · actions Modifier|Suivre + Partager + QR ✓ (T7) · vérifié retiré ✓ (absent de T7) · bande sociale compacte cliquable ✓ (T3) · escales (date-ancre, affiche portrait, tags couleur, lieu pin, durée, compagnons) ✓ (T1,T2,T4) · « Intégrer à mon site » sur la section escales ✓ (T4,T8) · tampons ronds encrés + hover + voir plus ✓ (T5,T9) · édition = modale (tuiles overlay caméra, inputs sans bordure, champs nom/métier/ville/punchline/lien, Enregistrer) ✓ (T6,T9) · abandon inline + suppression galerie/liens/saison/specialties ✓ (T10) · réutilise `canEditVitrine`/`useVitrineEdit` ✓ (T6,T8) · embed iframe via EmbedModal ✓ (T8) · pas de migration ✓ · palette cuivre rare + lime accent + tags couleur ✓ (T7,T9).
- **Placeholders :** aucun — code complet par step.
- **Cohérence des types :** `eventDurationDays`/`firstSeasonYear`/`companionsByEvent`/`CompanionRow` (T1) consommés par T2/T4/T5/T8. `canEditVitrine` (existant) consommé T8. `VitrineEditApi`/`updateEntity`/`uploadImage` (existant) consommés T6. `splitSeason` (existant) → `upcoming`/`past` (T8) passés à T4/T5. `SeasonEvent` (existant) cohérent partout. Props `VitrineHeader` (canEdit/onEdit/…) ↔ appel T8.
