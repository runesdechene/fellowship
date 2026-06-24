# Calendrier — refonte bespoke DA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre le Calendrier dans la DA « sci-fi chaud » — grille saison 12 mois conservée + ancre saison légère, cartes-mois verre sobres, statut point+label unifié, fusion chronologique des dates amis (Pro) + teaser free — en réutilisant les primitives `.glass-card`/`.da-*`/`--accent-app` de la Fondation.

**Architecture:** Deux helpers purs (statut→point, résumé saison) testés en TDD d'abord ; puis refonte composant par composant (carte-mois desktop, page+ancre+teaser, agenda mobile, modale amis), chaque composant portant ses propres classes CSS dans `Calendar.css` ; enfin nettoyage du code mort. Le rendu pixel de référence est la maquette validée (voir Global Constraints).

**Tech Stack:** React 19 + TypeScript, Tailwind v4 CSS-first, Vite, Vitest (`pnpm test`). CSS bespoke dans `src/pages/Calendar.css`. Icônes lucide-react.

## Global Constraints

- **Source de vérité pixel = maquette validée** : `.superpowers/brainstorm/21902-1782302373/content/full-page.html` (page assemblée) + `month-card.html`, `page-top.html`, `network.html`. Reprendre ses valeurs (espacements, tailles, couleurs) lors de l'écriture du CSS.
- **Réutiliser les primitives Fondation** : carte verre = classe globale **`.glass-card`** (NE PAS re-déclarer le verre/grain). Statut = **`.da-status` + `.da-dot`** avec couleur via `style={{ ['--dot-color']: 'var(--status-xxx)' }}`. Boutons = `.da-btn*` si besoin.
- **Tokens DA uniquement** : `--accent-app`, `--accent-app-ink`, `--name`, `--faint`, `--field`, `--hair`, `--status-*`, `--app-bg`. Plus aucun hex/HSL en dur dans le TSX ni dans `Calendar.css`.
- **Garde-fous** : ne PAS toucher `--copper`, `--primary`, `--page-backdrop`, `Landing.css`, `Vitrine.css`.
- **Scroll** : scroll de page unique, jamais de scroll interne imbriqué.
- **Pièges jour/nuit** : ombres douces en `.light`, pas de `#fff` en dur, `svg fill:none` ; chaque valeur DA a sa déclinaison `.light`.
- **Vue saison 12 mois CONSERVÉE** (demandée par les utilisateurs). Données/hooks inchangés (`useMyParticipations`, `useCalendarYear`, `useFriendsParticipations`, `useDateQuota`). Pas de nouvelle RPC, pas de feature « ajouter une date ».
- Vérif par tâche = tests (helpers) + `pnpm build` + `pnpm lint`. La recette visuelle jour+nuit est faite par le contrôleur/Uriel.
- Commits fréquents, conventional commits. Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>. Pas de bump version ni push par les implémenteurs (le contrôleur s'en charge).

---

### Task 1: Helper pur `participationDot` (statut → point + label)

Unifie les deux systèmes de statut (variants `participationChip` + map inline de la modale) sur une seule source : un point coloré (`--status-*`) + un label court SANS emoji.

**Files:**
- Modify: `src/lib/explorer.ts` (après `participationChip`, ~l.205)
- Test: `src/lib/explorer.test.ts` (créer si absent, sinon append)

**Interfaces:**
- Consumes: `participationChip(status, payment, kind, ctx)` et son type de retour `StatusChip { label, variant }` (variants : `termine|repere|refuse|going|dossier|inscrit|acompte|apayer|accepte`).
- Produces: `participationDot(status, payment, kind, ctx?) → { colorVar: string; label: string } | null`. `colorVar` = `var(--status-xxx)` ou `var(--muted-foreground)` (terminé). Réutilisé par Tasks 3, 5, 6.

- [ ] **Step 1: Écrire les tests (RED)**

Dans `src/lib/explorer.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { participationDot } from './explorer'

describe('participationDot', () => {
  it('exposant accepté impayé → point À payer orange', () => {
    expect(participationDot('confirme', 'a_payer', 'entity')).toEqual({
      colorVar: 'var(--status-apayer)', label: 'À payer',
    })
  })
  it('exposant payé → point Inscrit', () => {
    expect(participationDot('confirme', 'paye', 'entity')).toEqual({
      colorVar: 'var(--status-inscrit)', label: 'Inscrit',
    })
  })
  it('dossier envoyé → point Dossier bleu', () => {
    expect(participationDot('en_cours', null, 'entity')).toEqual({
      colorVar: 'var(--status-dossier)', label: 'Dossier',
    })
  })
  it('repéré → point Repéré', () => {
    expect(participationDot('interesse', null, 'entity')).toEqual({
      colorVar: 'var(--status-repere)', label: 'Repéré',
    })
  })
  it('refusé → point Refusé', () => {
    expect(participationDot('refuse', null, 'entity')).toEqual({
      colorVar: 'var(--status-refuse)', label: 'Refusé',
    })
  })
  it('personne (festivalier) → point J’y vais', () => {
    expect(participationDot('inscrit', null, 'person')).toEqual({
      colorVar: 'var(--status-inscrit)', label: 'J’y vais',
    })
  })
  it('passé → point Terminé neutre (prioritaire)', () => {
    expect(participationDot('confirme', 'paye', 'entity', { isPast: true })).toEqual({
      colorVar: 'var(--muted-foreground)', label: 'Terminé',
    })
  })
  it('statut vide (date amie) → null', () => {
    expect(participationDot('', null, 'entity')).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer les tests (échec attendu)**

Run: `pnpm test -- src/lib/explorer.test.ts`
Expected: FAIL — `participationDot is not a function`.

- [ ] **Step 3: Implémenter `participationDot`**

Dans `src/lib/explorer.ts`, juste après `participationChip` :

```ts
/** Variant de statut → token couleur + label court (sans emoji) pour le point DA. */
const DOT_BY_VARIANT: Record<StatusVariant, { colorVar: string; label: string }> = {
  termine: { colorVar: 'var(--muted-foreground)', label: 'Terminé' },
  repere:  { colorVar: 'var(--status-repere)',    label: 'Repéré' },
  refuse:  { colorVar: 'var(--status-refuse)',    label: 'Refusé' },
  going:   { colorVar: 'var(--status-inscrit)',   label: 'J’y vais' },
  dossier: { colorVar: 'var(--status-dossier)',   label: 'Dossier' },
  inscrit: { colorVar: 'var(--status-inscrit)',   label: 'Inscrit' },
  acompte: { colorVar: 'var(--status-acompte)',   label: 'Acompte' },
  apayer:  { colorVar: 'var(--status-apayer)',    label: 'À payer' },
  accepte: { colorVar: 'var(--status-accepte)',   label: 'Accepté' },
}

/**
 * Point coloré + label court pour le Calendrier (DA). Dérive du même arbre de
 * décision que participationChip ; retourne null quand il n'y a pas de chip
 * (ex. date amie sans statut perso).
 */
export function participationDot(
  status: string | null | undefined,
  payment: string | null | undefined,
  kind: ActorKind,
  ctx?: ChipContext,
): { colorVar: string; label: string } | null {
  const chip = participationChip(status, payment, kind, ctx)
  if (!chip) return null
  return DOT_BY_VARIANT[chip.variant]
}
```

⚠️ Vérifier que `participationChip` retourne bien `null` pour `status===''` (date amie). Si ce n'est pas le cas (il renvoie un chip par défaut), ajouter en tête de `participationChip` : `if (!status) return null` — et adapter le test « statut vide → null ». Lire les ~25 lignes de `participationChip` avant d'implémenter.

- [ ] **Step 4: Lancer les tests (vert)**

Run: `pnpm test -- src/lib/explorer.test.ts`
Expected: PASS (8/8).

- [ ] **Step 5: Commit**

```bash
git add src/lib/explorer.ts src/lib/explorer.test.ts
git commit -m "feat(calendrier): helper participationDot (statut → point+label unifié)"
```

---

### Task 2: Helper pur `seasonSummary` (ancre saison)

Calcule le contenu de l'ancre : total de MES dates de la saison + prochaine date à venir.

**Files:**
- Create: `src/lib/calendar-season.ts`
- Test: `src/lib/calendar-season.test.ts`

**Interfaces:**
- Consumes: `CalendarMonth` / `CalendarEvent` (de `@/hooks/use-calendar`) — `CalendarEvent` a `{ name, startDate: Date, endDate: Date, isFriend?: boolean }`.
- Produces: `seasonSummary(months: CalendarMonth[], now: Date) → { total: number; next: { name: string; daysUntil: number } | null }`. `total` = nb d'events `!isFriend` sur tous les mois ; `next` = 1ʳᵉ date `!isFriend` dont `startDate >= now` (jour calendaire), `daysUntil` arrondi en jours pleins (0 = aujourd'hui). Réutilisé par Task 4.

- [ ] **Step 1: Écrire les tests (RED)**

`src/lib/calendar-season.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { seasonSummary } from './calendar-season'
import type { CalendarMonth } from '@/hooks/use-calendar'

const ev = (name: string, start: string, isFriend = false) => ({
  id: name, name, startDate: new Date(start), endDate: new Date(start),
  primaryTag: 'autre', status: 'confirme', paymentStatus: null,
  visibility: 'public', city: '', department: '', imageUrl: null, slug: null,
  isFriend,
})
const month = (events: ReturnType<typeof ev>[]): CalendarMonth =>
  ({ month: 0, label: 'Janvier', year: 2026, events } as unknown as CalendarMonth)

describe('seasonSummary', () => {
  const now = new Date('2026-06-10T12:00:00')

  it('compte mes dates, ignore les dates amies', () => {
    const months = [month([ev('A', '2026-06-20'), ev('Ami', '2026-06-25', true), ev('B', '2026-07-05')])]
    expect(seasonSummary(months, now).total).toBe(2)
  })
  it('prochaine date = 1re à venir (mienne), en jours pleins', () => {
    const months = [month([ev('Passé', '2026-06-01'), ev('Avalon', '2026-06-17')])]
    expect(seasonSummary(months, now).next).toEqual({ name: 'Avalon', daysUntil: 7 })
  })
  it('aucune date à venir → next null', () => {
    const months = [month([ev('Passé', '2026-06-01')])]
    expect(seasonSummary(months, now).next).toBeNull()
  })
  it('saison vide → total 0, next null', () => {
    expect(seasonSummary([month([])], now)).toEqual({ total: 0, next: null })
  })
})
```

- [ ] **Step 2: Lancer les tests (échec attendu)**

Run: `pnpm test -- src/lib/calendar-season.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

`src/lib/calendar-season.ts` :

```ts
import type { CalendarMonth, CalendarEvent } from '@/hooks/use-calendar'

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export interface SeasonSummary {
  total: number
  next: { name: string; daysUntil: number } | null
}

export function seasonSummary(months: CalendarMonth[], now: Date): SeasonSummary {
  const mine: CalendarEvent[] = months.flatMap(m => m.events).filter(e => !e.isFriend)
  const today = startOfDay(now)
  const upcoming = mine
    .filter(e => startOfDay(e.startDate).getTime() >= today.getTime())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  const next = upcoming[0]
    ? {
        name: upcoming[0].name,
        daysUntil: Math.round((startOfDay(upcoming[0].startDate).getTime() - today.getTime()) / 86400000),
      }
    : null
  return { total: mine.length, next }
}
```

- [ ] **Step 4: Lancer les tests (vert)**

Run: `pnpm test -- src/lib/calendar-season.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar-season.ts src/lib/calendar-season.test.ts
git commit -m "feat(calendrier): helper seasonSummary (total + prochaine date)"
```

---

### Task 3: Glyphe saison + refonte `CalendarMonth` (carte-mois desktop)

Carte verre sobre + petit picto saisonnier monochrome ; **fusion chronologique** (rendre `events` dans l'ordre sans re-séparer mine/amis) ; statut = point+label via `participationDot` ; pile de compagnons restylée ; suppression de `MonthBanner`.

**Files:**
- Create: `src/components/calendar/SeasonGlyph.tsx`
- Modify: `src/components/calendar/CalendarMonth.tsx` (réécriture du rendu)
- Modify: `src/pages/Calendar.css` (classes carte-mois — voir Task 7 pour le nettoyage des anciennes)

**Interfaces:**
- Consumes: `participationDot` (T1) ; `CalendarMonth`/`CalendarEvent`, `FriendParticipation`, `eventPath`, `formatDateRange`, `avatarGradient`, `getTagIcon`.
- Produces: `<SeasonGlyph month={number} />` (icône lucide monochrome par saison) ; `CalendarMonth` rendant la grille sobre. Mêmes props qu'avant (`data`, `actorKind`, `friendParticipations`, `onOpenFriends`).

- [ ] **Step 1: Créer `SeasonGlyph`**

`src/components/calendar/SeasonGlyph.tsx` :

```tsx
import { Snowflake, Sprout, Sun, Leaf } from 'lucide-react'

/** Picto saisonnier monochrome (hiver/printemps/été/automne) par numéro de mois (0-11). */
export function SeasonGlyph({ month, size = 15 }: { month: number; size?: number }) {
  const Icon = month <= 1 || month === 11 ? Snowflake
    : month <= 4 ? Sprout
    : month <= 7 ? Sun
    : Leaf
  return <Icon size={size} strokeWidth={1.6} className="calendar-month-picto" aria-hidden />
}
```

- [ ] **Step 2: Réécrire `CalendarMonth.tsx`**

Remplacer tout le corps de rendu (l.41-126) par la version fusionnée ci-dessous. On garde `useTagColor`, les props et `dayCount`. On **supprime** l'import `MonthBanner`, on ajoute `SeasonGlyph` et `participationDot`.

```tsx
// imports : retirer MonthBanner ; ajouter :
import { SeasonGlyph } from './SeasonGlyph'
import { participationChip, participationDot, type ActorKind } from '@/lib/explorer'
// (le reste des imports existants conservés : Link/useNavigate, MapPin/Lock, eventPath,
//  useTags+getTagIcon, formatDateRange, types, avatarGradient)

export function CalendarMonth({ data, actorKind, friendParticipations = [], onOpenFriends }: CalendarMonthProps) {
  const { month, label, year, events } = data
  const getTagColor = useTagColor()
  const navigate = useNavigate()
  const now = new Date()
  const isEmpty = events.length === 0
  const mineCount = events.filter(e => !e.isFriend).length
  const friendCount = events.length - mineCount

  const dayCount = (ev: CalendarEvent) =>
    Math.max(1, Math.round((ev.endDate.getTime() - ev.startDate.getTime()) / 86400000) + 1)

  return (
    <>
      <div className="calendar-month-head">
        <SeasonGlyph month={month} />
        <span className="calendar-month-name">{label}</span>
        <span className="calendar-month-count">
          {isEmpty ? 'libre'
            : friendCount > 0 ? `${mineCount} · ${friendCount} ami${friendCount > 1 ? 's' : ''}`
            : `${mineCount} date${mineCount > 1 ? 's' : ''}`}
        </span>
      </div>

      {events.map(ev => {
        // Date amie (fusion chronologique) : ligne atténuée, avatar, pas de point statut.
        if (ev.isFriend) {
          const fname = (ev.friendName ?? '').trim() || 'Un ami'
          return (
            <Link key={ev.id} to={eventPath(ev)} state={{ from: '/calendrier' }} className="calendar-event-row friend">
              <span className="calendar-event-av"
                title={`Voir le profil de ${fname}`}
                onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/@${ev.friendSlug ?? ''}`) }}
                style={ev.friendAvatarUrl ? undefined : { background: avatarGradient(fname) }}>
                {ev.friendAvatarUrl ? <img src={ev.friendAvatarUrl} alt={fname} /> : fname[0]!.toUpperCase()}
              </span>
              <div className="calendar-event-info">
                <div className="calendar-event-name">{ev.name}</div>
                <div className="calendar-event-meta">{fname} y va · {formatDateRange(ev.startDate, ev.endDate)}</div>
              </div>
              <span className="calendar-event-tag-amis">amis</span>
            </Link>
          )
        }

        // Ma date.
        const I = getTagIcon(ev.primaryTag)
        const isPast = ev.endDate < now
        const dot = participationDot(ev.status, ev.paymentStatus, actorKind, { isPast })
        const friendsAtEvent = friendParticipations.filter(fp => fp.event_id === ev.id)
        const days = dayCount(ev)
        return (
          <div key={ev.id} className="calendar-event-wrapper">
            <Link to={eventPath(ev)} state={{ from: '/calendrier' }} className="calendar-event-row">
              {ev.imageUrl
                ? <div className="calendar-event-image"><img src={ev.imageUrl} alt="" /></div>
                : <div className="calendar-event-image placeholder"><I size={14} strokeWidth={2} /></div>}
              <div className="calendar-event-info">
                <div className="calendar-event-name">{ev.name}{ev.isPrivate && <Lock className="inline h-3 w-3 opacity-70 ml-1" strokeWidth={2.2} />}</div>
                <div className="calendar-event-meta">
                  <MapPin size={11} strokeWidth={2} /><span>{ev.city}{ev.department ? ` (${ev.department})` : ''}</span>
                  <span>·</span><span>{ev.startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '')}</span>
                  {days > 1 && <><span>·</span><span>{days} j</span></>}
                </div>
              </div>
              {friendsAtEvent.length > 0 && (
                <button className="calendar-pav" onClick={e => { e.preventDefault(); onOpenFriends?.(ev.id, ev.name) }}
                  aria-label={`${friendsAtEvent.length} compagnon(s) sur cette date`}>
                  {friendsAtEvent.slice(0, 3).map((fp, i) => {
                    const nm = (fp.actor_public?.label ?? '').trim() || '?'
                    const url = fp.actor_public?.avatar_url
                    return (
                      <span key={fp.actor_id} className="calendar-pav-item"
                        style={{ background: url ? 'transparent' : avatarGradient(nm), zIndex: 3 - i }}>
                        {url ? <img src={url} alt={nm} /> : nm[0]!.toUpperCase()}
                      </span>
                    )
                  })}
                </button>
              )}
              {dot && (
                <span className="da-status calendar-status">
                  <span className="da-dot" style={{ ['--dot-color' as string]: dot.colorVar }} />
                  {dot.label}
                </span>
              )}
            </Link>
          </div>
        )
      })}
    </>
  )
}
```

Notes : `participationChip` reste importé seulement s'il est encore utilisé ailleurs dans le fichier ; sinon retirer l'import inutilisé (le lint le signalera). Le wrapper `<div>` racine devient un fragment (la carte verre + le liseré mois courant sont portés par le parent dans `Calendar.tsx`, Task 4).

- [ ] **Step 3: Ajouter le CSS carte-mois dans `Calendar.css`**

Ajouter (les anciennes règles `.calendar-month-banner*`, `.calendar-evst*`, `.calendar-friend-lbl`, `.calendar-evF*` seront retirées en Task 7). Reprendre les valeurs de la maquette `full-page.html` :

```css
/* En-tête de mois */
.calendar-month-head { display:flex; align-items:center; gap:8px; margin-bottom:2px; padding:2px 0 6px; }
.calendar-month-picto { color:hsl(var(--muted-foreground)); flex-shrink:0; }
.calendar-month-name { font-family:var(--font-heading); font-weight:800; font-size:14px; color:hsl(var(--foreground)); }
.calendar-month-count { font-family:var(--font-mono); font-size:9px; letter-spacing:.13em; text-transform:uppercase; color:var(--faint); margin-left:auto; }

/* Ligne d'événement */
.calendar-event-row { display:flex; align-items:center; gap:9px; padding:8px 0; text-decoration:none; color:inherit; }
.calendar-event-wrapper + .calendar-event-wrapper .calendar-event-row,
.calendar-event-row + .calendar-event-row { border-top:1px solid var(--hair); }
.calendar-event-image { width:26px; height:35px; border-radius:5px; overflow:hidden; flex-shrink:0; }
.calendar-event-image img { width:100%; height:100%; object-fit:cover; }
.calendar-event-image.placeholder { background:var(--field); display:flex; align-items:center; justify-content:center; color:var(--faint); }
.calendar-event-info { flex:1; min-width:0; }
.calendar-event-name { color:var(--name); font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.calendar-event-meta { display:flex; align-items:center; gap:5px; color:hsl(var(--muted-foreground)); font-size:10.5px; margin-top:1px; }
.calendar-event-meta svg { flex-shrink:0; }

/* Statut : .da-status/.da-dot fournissent l'essentiel ; ajustement de taille local */
.calendar-status { font-size:9.5px; flex-shrink:0; }

/* Ligne amie (fusion, atténuée) */
.calendar-event-row.friend { opacity:.72; }
.calendar-event-av { width:26px; height:26px; border-radius:50%; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; }
.calendar-event-av img { width:100%; height:100%; object-fit:cover; }
.calendar-event-tag-amis { font-family:var(--font-mono); font-size:8.5px; color:var(--status-dossier); border:1px solid color-mix(in srgb, var(--status-dossier) 30%, transparent); border-radius:5px; padding:1px 5px; flex-shrink:0; }

/* Pile de compagnons sur ma date */
.calendar-pav { display:flex; background:none; border:none; cursor:pointer; padding:0; flex-shrink:0; }
.calendar-pav-item { width:22px; height:22px; border-radius:50%; margin-left:-7px; border:1px solid var(--hair); overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; }
.calendar-pav-item:first-child { margin-left:0; }
.calendar-pav-item img { width:100%; height:100%; object-fit:cover; }
```

- [ ] **Step 4: Build + lint**

Run: `pnpm build`
Expected: succès.
Run: `pnpm lint`
Expected: pas de nouvelle erreur (retirer tout import devenu inutile).

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/SeasonGlyph.tsx src/components/calendar/CalendarMonth.tsx src/pages/Calendar.css
git commit -m "feat(calendrier): carte-mois sobre + fusion chrono + statut point/label (desktop)"
```

---

### Task 4: Page `Calendar.tsx` — shell DA, ancre saison, teaser free, carte verre

**Files:**
- Modify: `src/pages/Calendar.tsx` (l.161-280 : markup) + imports
- Modify: `src/pages/Calendar.css` (page, toolbar, anchor, teaser, filters, grille)

**Interfaces:**
- Consumes: `seasonSummary` (T2) ; `slidingMonths`, `isFree`, `quota`, état `showMine/showPro/showVisiteurs`, `navigate`.
- Produces: la page restylée. La carte de mois passe en `glass-card` : la `<div className="calendar-month-card ...">` reçoit la classe `glass-card`.

- [ ] **Step 1: Ajouter l'import + le calcul d'ancre dans `Calendar.tsx`**

En haut : `import { seasonSummary } from '@/lib/calendar-season'`.
Après `const lastMonth = slidingMonths[11]` (~l.132) :

```tsx
  const summary = seasonSummary(slidingMonths, now)
```

- [ ] **Step 2: Insérer l'ancre saison + le teaser free dans le markup**

Dans `.calendar-topbar`, juste après la fermeture de `.calendar-header` (`</div>` de la l.202) et AVANT `.calendar-filters` :

```tsx
      {/* Ancre saison — point focal léger (pas un héros) */}
      <div className="calendar-anchor">
        <span className="calendar-anchor-big">{summary.total}</span>
        <div>
          <div className="eyebrow calendar-anchor-eyebrow">dates cette saison</div>
          {summary.next && (
            <div className="calendar-anchor-next">
              prochaine dans <strong>{summary.next.daysUntil === 0 ? "aujourd'hui" : `${summary.next.daysUntil} jour${summary.next.daysUntil > 1 ? 's' : ''}`}</strong>
              {summary.next.daysUntil !== 0 && ' — '}{summary.next.daysUntil !== 0 && summary.next.name}
            </div>
          )}
        </div>
      </div>

      {/* Teaser Pro — uniquement en free */}
      {isFree && (
        <Link to="/boutique" className="calendar-teaser">
          <div>
            <div className="calendar-teaser-title">Vois où vont tes amis et les festivaliers</div>
            <div className="calendar-teaser-sub">Tes dates restent gratuites. Le réseau « qui va où » est réservé au Pro.</div>
          </div>
          <span className="da-btn da-btn-flat da-btn-sm">Passer Pro</span>
        </Link>
      )}
```

- [ ] **Step 3: Carte de mois en `glass-card`**

Dans la grille (l.250-253), ajouter `glass-card` à la className de la carte :

```tsx
              <div
                key={`${month.year}-${month.month}`}
                className={`glass-card calendar-month-card ${isCurrentMonth ? 'current' : ''} ${isEmpty ? 'empty' : ''}`}
              >
```

Et pour les mois vides cliquables → comportement desktop : ajouter sur la carte vide un `onClick` vers Explorer (parité avec le mobile). Remplacer le bloc carte par :

```tsx
              <div
                key={`${month.year}-${month.month}`}
                className={`glass-card calendar-month-card ${isCurrentMonth ? 'current' : ''} ${isEmpty ? 'empty' : ''}`}
                {...(isEmpty ? {
                  role: 'button', tabIndex: 0,
                  onClick: () => routerNav('/explorer', { state: { month: { year: month.year, month: month.month } } }),
                } : {})}
              >
```

- [ ] **Step 4: CSS page / toolbar / ancre / teaser / filtres / grille**

Ajouter/_remplacer_ dans `Calendar.css` (reprendre valeurs de `page-top.html` + `full-page.html`) :

```css
.calendar-page { background:var(--app-bg); background-attachment:fixed; min-height:100%; padding:28px 40px 80px; }
@media (max-width:639px){ .calendar-page{ padding:16px 14px 90px; } }

.calendar-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.calendar-subtitle { font-family:var(--font-mono); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:hsl(var(--muted-foreground)); margin-top:3px; }
.calendar-quota { display:inline-block; margin-top:8px; font-size:12px; color:hsl(var(--muted-foreground)); text-decoration:none; }
.calendar-quota b { color:hsl(var(--foreground)); }
.calendar-quota.at-limit b { color:var(--accent-app); }

.calendar-year-nav { display:inline-flex; align-items:center; gap:10px; font-family:var(--font-mono); color:var(--name); }
.calendar-year-label { font-size:14px; }
.calendar-nav-btn { width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; background:var(--field); border:1px solid var(--hair); border-radius:8px; color:hsl(var(--muted-foreground)); cursor:pointer; }
.calendar-nav-btn svg { width:16px; height:16px; }
.calendar-nav-btn:disabled { opacity:.5; }

/* Ancre saison */
.calendar-anchor { display:flex; align-items:baseline; gap:12px; padding:13px 0 5px; border-top:1px solid var(--hair); margin-top:14px; }
.calendar-anchor-big { font-family:var(--font-mono); font-variant-numeric:tabular-nums; font-size:32px; font-weight:600; line-height:1; color:var(--accent-app); }
.calendar-anchor-eyebrow { margin-bottom:2px; }
.calendar-anchor-next { color:hsl(var(--muted-foreground)); font-size:12px; }
.calendar-anchor-next strong { color:var(--accent-app); font-weight:600; }

/* Teaser Pro */
.calendar-teaser { display:flex; align-items:center; gap:14px; margin:12px 0 4px; padding:13px 16px; border-radius:13px; text-decoration:none;
  background:linear-gradient(150deg, color-mix(in srgb, var(--accent-app) 16%, transparent), var(--field));
  border:1px solid color-mix(in srgb, var(--accent-app) 30%, transparent); }
.calendar-teaser-title { color:hsl(var(--foreground)); font-weight:600; font-size:13.5px; }
.calendar-teaser-sub { color:hsl(var(--muted-foreground)); font-size:12px; margin-top:2px; }
.calendar-teaser .da-btn { margin-left:auto; flex-shrink:0; }

/* Filtres */
.calendar-filters { display:flex; gap:7px; margin:12px 0 0; flex-wrap:wrap; }
.calendar-filter-btn { display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:6px 11px; border-radius:999px; border:1px solid var(--hair); background:var(--field); color:var(--name); cursor:pointer; }
.calendar-filter-btn svg { width:14px; height:14px; }
.calendar-filter-btn.active { background:color-mix(in srgb, var(--accent-app) 15%, transparent); border-color:color-mix(in srgb, var(--accent-app) 40%, transparent); color:var(--accent-app); }
.calendar-filter-btn.locked { opacity:.6; }

/* Grille saison */
.calendar-grid { display:grid; grid-template-columns:1fr; gap:11px; margin-top:16px; }
@media (min-width:760px){ .calendar-grid{ grid-template-columns:repeat(2,1fr); } }
@media (min-width:1200px){ .calendar-grid{ grid-template-columns:repeat(3,1fr); } }

/* Carte-mois : .glass-card fournit le verre/grain ; on ajoute padding + états */
.calendar-month-card { padding:12px 14px; }
.calendar-month-card.current { border-left:2.5px solid var(--accent-app); box-shadow:0 0 0 1px color-mix(in srgb, var(--accent-app) 12%, transparent), 0 18px 44px rgba(0,0,0,.32); }
.light .calendar-month-card.current { box-shadow:0 0 0 1px color-mix(in srgb, var(--accent-app) 14%, transparent), 0 4px 14px rgba(120,90,60,.06); }
.calendar-month-card.empty { opacity:.4; cursor:pointer; }

.calendar-empty-hint { color:hsl(var(--muted-foreground)); font-size:13px; margin-bottom:12px; }
.calendar-empty-hint a { color:var(--accent-app); }
```

⚠️ Sur mobile (`@media max-width:639px`), la grille desktop est masquée et `.mobile-calendar` prend le relais (logique existante conservée) — garder la règle `@media(max-width:639px){ .calendar-grid{display:none} .mobile-calendar{display:block} }` (vérifier qu'elle existe encore après Task 7).

- [ ] **Step 5: Build + lint + commit**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur.

```bash
git add src/pages/Calendar.tsx src/pages/Calendar.css
git commit -m "feat(calendrier): shell DA + ancre saison + teaser free + carte verre"
```

---

### Task 5: Refonte `MobileAgenda` (agenda mobile)

Mêmes principes : sections de mois (picto + nom + compteur, plus de bannière), fusion chronologique, statut point+label, mois vide « libre », teaser hérité de la page.

**Files:**
- Modify: `src/components/calendar/MobileAgenda.tsx`
- Modify: `src/pages/Calendar.css` (classes `.agenda-*` / `.mobile-event-*`)

**Interfaces:**
- Consumes: `participationDot` (T1), `SeasonGlyph` (T3), mêmes props (`months`, `actorKind`, `friendParticipations`, `onOpenFriends`).

- [ ] **Step 1: Réécrire le rendu de `MobileAgenda.tsx`**

Retirer l'import `MonthBanner` ; ajouter `SeasonGlyph` et `participationDot`. Remplacer le contenu de `.map(month => …)` :

```tsx
      {months.map(month => {
        if (month.events.length === 0) {
          return (
            <div key={`${month.year}-${month.month}`} className="agenda-empty" {...monthNav(month)}>
              <SeasonGlyph month={month.month} size={14} />
              <span className="agenda-empty-nm">{month.label}</span>
              <span className="agenda-empty-lbl">libre</span>
            </div>
          )
        }
        const mineCount = month.events.filter(e => !e.isFriend).length
        return (
          <section key={`${month.year}-${month.month}`} className="agenda-month">
            <div className="agenda-mh" {...monthNav(month)}>
              <SeasonGlyph month={month.month} size={15} />
              <span className="agenda-mh-name">{month.label}</span>
              {mineCount > 0 && <span className="agenda-count">{mineCount} date{mineCount > 1 ? 's' : ''}</span>}
            </div>

            {month.events.map(ev => {
              if (ev.isFriend) {
                const fname = (ev.friendName ?? '').trim() || 'Un ami'
                return (
                  <Link key={ev.id} to={eventPath(ev)} state={{ from: '/calendrier' }} className="agenda-row friend">
                    <span className="agenda-fr-av" title={`Voir le profil de ${fname}`}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/@${ev.friendSlug ?? ''}`) }}
                      style={ev.friendAvatarUrl ? undefined : { background: avatarGradient(fname) }}>
                      {ev.friendAvatarUrl ? <img src={ev.friendAvatarUrl} alt={fname} /> : fname[0]!.toUpperCase()}
                    </span>
                    <div className="agenda-row-info">
                      <div className="agenda-row-name">{ev.name}</div>
                      <div className="agenda-row-meta">{fname} y va · {formatDateRange(ev.startDate, ev.endDate)}</div>
                    </div>
                    <span className="calendar-event-tag-amis">amis</span>
                  </Link>
                )
              }
              const Icon = getTagIcon(ev.primaryTag)
              const dot = participationDot(ev.status, ev.paymentStatus, actorKind, { isPast: ev.endDate < now })
              const friendsAtEvent = friendParticipations.filter(fp => fp.event_id === ev.id)
              return (
                <div key={ev.id} className="agenda-event">
                  <Link to={eventPath(ev)} state={{ from: '/calendrier' }} className="agenda-row">
                    {ev.imageUrl
                      ? <div className="agenda-row-img"><img src={ev.imageUrl} alt="" /></div>
                      : <div className="agenda-row-img placeholder"><Icon size={14} strokeWidth={2} /></div>}
                    <div className="agenda-row-info">
                      <div className="agenda-row-name">{ev.name}{ev.isPrivate && <Lock className="inline h-3 w-3 opacity-70 ml-1" strokeWidth={2.2} />}</div>
                      <div className="agenda-row-meta">{formatDateRange(ev.startDate, ev.endDate)} · {ev.city}</div>
                    </div>
                    {dot && (
                      <span className="da-status calendar-status">
                        <span className="da-dot" style={{ ['--dot-color' as string]: dot.colorVar }} />{dot.label}
                      </span>
                    )}
                  </Link>
                  {friendsAtEvent.length > 0 && (
                    <button type="button" className="calendar-pav" onClick={() => onOpenFriends(ev.id, ev.name)}
                      aria-label={`${friendsAtEvent.length} compagnon(s) sur ${ev.name}`}>
                      {friendsAtEvent.slice(0, 3).map((fp, i) => {
                        const nm = (fp.actor_public?.label ?? '').trim() || '?'
                        const url = fp.actor_public?.avatar_url
                        return (
                          <span key={fp.actor_id} className="calendar-pav-item"
                            style={{ background: url ? 'transparent' : avatarGradient(nm), zIndex: 3 - i }}>
                            {url ? <img src={url} alt={nm} /> : nm[0].toUpperCase()}
                          </span>
                        )
                      })}
                    </button>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}
```

- [ ] **Step 2: CSS agenda mobile dans `Calendar.css`**

```css
.mobile-agenda { display:flex; flex-direction:column; gap:14px; }
.agenda-empty { display:flex; align-items:center; gap:8px; padding:11px 14px; border-radius:12px; background:var(--field); border:1px solid var(--hair); opacity:.6; cursor:pointer; }
.agenda-empty-nm { font-family:var(--font-heading); font-weight:800; color:hsl(var(--foreground)); font-size:14px; }
.agenda-empty-lbl { font-family:var(--font-mono); font-size:10px; letter-spacing:.13em; text-transform:uppercase; color:var(--faint); margin-left:auto; }
.agenda-mh { display:flex; align-items:center; gap:8px; padding:4px 2px 8px; cursor:pointer; }
.agenda-mh .calendar-month-picto { color:hsl(var(--muted-foreground)); }
.agenda-mh-name { font-family:var(--font-heading); font-weight:800; font-size:16px; color:hsl(var(--foreground)); }
.agenda-count { font-family:var(--font-mono); font-size:9px; letter-spacing:.13em; text-transform:uppercase; color:var(--faint); margin-left:auto; }
.agenda-event { }
.agenda-row { display:flex; align-items:center; gap:10px; padding:9px 0; text-decoration:none; color:inherit; }
.agenda-row + .agenda-row, .agenda-event + .agenda-event .agenda-row { border-top:1px solid var(--hair); }
.agenda-row-img { width:30px; height:40px; border-radius:5px; overflow:hidden; flex-shrink:0; }
.agenda-row-img img { width:100%; height:100%; object-fit:cover; }
.agenda-row-img.placeholder { background:var(--field); display:flex; align-items:center; justify-content:center; color:var(--faint); }
.agenda-row-info { flex:1; min-width:0; }
.agenda-row-name { color:var(--name); font-size:13px; font-weight:600; }
.agenda-row-meta { color:hsl(var(--muted-foreground)); font-size:11px; margin-top:1px; }
.agenda-row.friend { opacity:.72; }
.agenda-fr-av { width:30px; height:30px; border-radius:50%; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:12px; }
.agenda-fr-av img { width:100%; height:100%; object-fit:cover; }
```

- [ ] **Step 3: Build + lint + commit**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur.

```bash
git add src/components/calendar/MobileAgenda.tsx src/pages/Calendar.css
git commit -m "feat(calendrier): agenda mobile DA (fusion chrono + statut point/label)"
```

---

### Task 6: Restyle `CalendarFriendsModal` (DA + statut unifié)

**Files:**
- Modify: `src/components/calendar/CalendarFriendsModal.tsx`
- Modify: `src/pages/Calendar.css` (classes `.calendar-modal-*`)

**Interfaces:**
- Consumes: `participationDot` (T1), `avatarGradient`, `FriendParticipation`.

- [ ] **Step 1: Réécrire la modale**

Supprimer les maps inline `GRADIENTS`/`STATUS_LABELS`/`STATUS_COLORS` et `hashName`. Coquille en `.glass-card`. Le statut d'un ami (festivalier) passe par `participationDot(status, null, 'person')` (les amis affichés ici sont des participations « going »).

```tsx
import { Link } from 'react-router-dom'
import { X, Users } from 'lucide-react'
import { participationDot } from '@/lib/explorer'
import { avatarGradient } from '@/lib/avatar-gradient'
import type { FriendParticipation } from '@/hooks/use-participations'

interface CalendarFriendsModalProps { eventName: string; friends: FriendParticipation[]; onClose: () => void }

export function CalendarFriendsModal({ eventName, friends, onClose }: CalendarFriendsModalProps) {
  const pros = friends.filter(f => f.actor_public?.kind === 'entity')
  const visiteurs = friends.filter(f => f.actor_public?.kind === 'person')
  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div className="calendar-modal glass-card" onClick={e => e.stopPropagation()}>
        <div className="calendar-modal-header">
          <div className="calendar-modal-title">
            <Users size={18} strokeWidth={1.5} />
            <div>
              <span className="calendar-modal-heading">Amis participants</span>
              <span className="calendar-modal-event-name">{eventName}</span>
            </div>
          </div>
          <button onClick={onClose} className="calendar-modal-close" aria-label="Fermer"><X size={16} strokeWidth={1.5} /></button>
        </div>
        <div className="calendar-modal-list">
          {pros.length > 0 && (<><div className="calendar-modal-section-label">Amis pro</div>{pros.map(fp => <FriendItem key={fp.id} friend={fp} kind="entity" />)}</>)}
          {visiteurs.length > 0 && (<><div className="calendar-modal-section-label">Amis visiteurs</div>{visiteurs.map(fp => <FriendItem key={fp.id} friend={fp} kind="person" />)}</>)}
          {pros.length === 0 && visiteurs.length === 0 && (<div className="calendar-modal-empty">Aucun ami sur cet événement</div>)}
        </div>
      </div>
    </div>
  )
}

function FriendItem({ friend, kind }: { friend: FriendParticipation; kind: 'entity' | 'person' }) {
  const name = (friend.actor_public?.label ?? '').trim() || '?'
  const slug = friend.actor_public?.public_slug ?? friend.actor_id
  const avatarUrl = friend.actor_public?.avatar_url
  const dot = participationDot(friend.status ?? 'inscrit', null, kind)
  return (
    <Link to={`/@${slug}`} className="calendar-modal-friend" onClick={e => e.stopPropagation()}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} className="calendar-modal-friend-avatar" />
        : <div className="calendar-modal-friend-avatar-letter" style={{ background: avatarGradient(name) }}>{name[0]?.toUpperCase() ?? '?'}</div>}
      <div className="calendar-modal-friend-info">
        <span className="calendar-modal-friend-name">{name}</span>
        <span className="calendar-modal-friend-type">{kind === 'entity' ? 'Exposant' : 'Visiteur'}</span>
      </div>
      {dot && (
        <span className="da-status">
          <span className="da-dot" style={{ ['--dot-color' as string]: dot.colorVar }} />{dot.label}
        </span>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: CSS modale (DA) dans `Calendar.css`**

Remplacer les anciennes règles `.calendar-modal*` (qui utilisaient hex/HSL en dur) par :

```css
.calendar-modal-overlay { position:fixed; inset:0; z-index:60; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; padding:18px; }
.calendar-modal { width:100%; max-width:420px; max-height:80vh; display:flex; flex-direction:column; }
.calendar-modal-header { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:16px; border-bottom:1px solid var(--hair); }
.calendar-modal-title { display:flex; align-items:center; gap:10px; color:hsl(var(--muted-foreground)); }
.calendar-modal-heading { display:block; font-family:var(--font-heading); font-weight:700; font-size:14px; color:hsl(var(--foreground)); }
.calendar-modal-event-name { display:block; font-size:12px; color:hsl(var(--muted-foreground)); }
.calendar-modal-close { width:30px; height:30px; display:flex; align-items:center; justify-content:center; background:var(--field); border:1px solid var(--hair); border-radius:8px; color:hsl(var(--muted-foreground)); cursor:pointer; }
.calendar-modal-list { overflow-y:auto; padding:6px 0; }
.calendar-modal-section-label { font-family:var(--font-mono); font-size:9.5px; letter-spacing:.15em; text-transform:uppercase; color:var(--faint); padding:10px 16px 4px; }
.calendar-modal-friend { display:flex; align-items:center; gap:11px; padding:9px 16px; text-decoration:none; color:inherit; }
.calendar-modal-friend:hover { background:hsl(var(--foreground)/.05); }
.calendar-modal-friend-avatar, .calendar-modal-friend-avatar-letter { width:36px; height:36px; border-radius:50%; object-fit:cover; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; }
.calendar-modal-friend-info { flex:1; min-width:0; }
.calendar-modal-friend-name { display:block; color:var(--name); font-size:13px; font-weight:600; }
.calendar-modal-friend-type { display:block; color:hsl(var(--muted-foreground)); font-size:11px; }
.calendar-modal-empty { padding:24px 16px; text-align:center; color:hsl(var(--muted-foreground)); font-size:13px; }
```

- [ ] **Step 3: Build + lint + commit**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur.

```bash
git add src/components/calendar/CalendarFriendsModal.tsx src/pages/Calendar.css
git commit -m "feat(calendrier): modale amis DA (verre + statut unifié)"
```

---

### Task 7: Nettoyage — code mort + CSS legacy + minor Fondation

**Files:**
- Delete: `src/components/calendar/YearView.tsx`, `src/components/calendar/MonthCell.tsx`, `src/components/calendar/MonthBanner.tsx`
- Modify: `src/pages/Calendar.css` (suppression des règles devenues mortes)
- Modify: `src/index.css` (minor `.da-btn-sm`)

- [ ] **Step 1: Vérifier que les composants sont bien orphelins puis supprimer**

Run: `rg -n "YearView|MonthCell|MonthBanner" src/`
Expected: aucune référence d'import restante (CalendarMonth et MobileAgenda ont retiré `MonthBanner` aux Tasks 3/5 ; YearView/MonthCell étaient déjà du code mort). Si une référence subsiste, la retirer d'abord.

Puis : `git rm src/components/calendar/YearView.tsx src/components/calendar/MonthCell.tsx src/components/calendar/MonthBanner.tsx`

- [ ] **Step 2: Retirer les règles CSS mortes de `Calendar.css`**

Supprimer les blocs qui ne sont plus référencés par le TSX : `.calendar-month-banner*`, `.calendar-evst*` (toutes variantes), `.calendar-friend-lbl`, `.calendar-evF*`, `.calendar-presence-*`, `.calendar-month-header`, `.calendar-title*`, `.calendar-month-empty-note`, `.mobile-event-pill*` (remplacé par `.agenda-row*`), `.calendar-companions`/`.calendar-pav`(ancienne déclaration si dupliquée), `.calendar-skeleton-*` SI le skeleton est conservé garder ces dernières. Vérifier chaque suppression par grep avant de retirer :

Run (exemple) : `rg -n "calendar-evst|calendar-evF|calendar-month-banner|mobile-event-pill|calendar-month-header|calendar-presence" src/`
Expected: 0 hit dans les `.tsx` (donc CSS retirable). Garder toute classe encore référencée.

- [ ] **Step 3: Minor Fondation — `.da-btn-sm`**

Dans `src/index.css`, retirer le `font-size:13px` no-op de `.da-btn-sm` (égal à `.da-btn`) :

```css
.da-btn-sm { padding: 6px 11px; }
```

- [ ] **Step 4: Build + lint**

Run: `pnpm build`
Expected: succès (aucun import cassé).
Run: `pnpm lint`
Expected: pas de nouvelle erreur, pas d'import inutilisé.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(calendrier): retire code mort (YearView/MonthCell/MonthBanner) + CSS legacy + da-btn-sm no-op"
```

---

## Self-Review

**Spec coverage :**
- Grille saison 12 mois conservée → Task 4 (grille) + données inchangées ✓.
- Ancre saison légère (total + prochaine) → Task 2 (helper) + Task 4 (markup/CSS) ✓.
- Carte-mois sobre + picto saison + mois courant terracotta + vides « libre » cliquables → Task 3 + Task 4 ✓.
- Suppression bannières décoratives → Task 3 (retrait import) + Task 7 (suppression fichier+CSS) ✓.
- Statut = point + label mono unifié (les 2 systèmes) → Task 1 (helper) consommé en Tasks 3/5/6 ✓.
- Fusion chronologique amis (Pro) → Task 3/5 (rendu de `events` sans re-split) ; données déjà fusionnées par `mergeWithFriends` (inchangé) ✓.
- Gating free : chips 🔒 (existant, restylé Task 4) + teaser dédié → Task 4 ✓.
- Migration DA + `--app-bg` + `.glass-card` + `.da-*` → Tasks 3-6 ✓.
- Modale amis restylée + statut unifié → Task 6 ✓.
- Agenda mobile DA → Task 5 ✓.
- Nettoyage code mort + 2 minors Fondation → Task 7 (`.da-btn-sm`) ; minor `--dot-color` soldé par l'usage en Tasks 3/5/6 ✓.
- Garde-fous (copper/primary/Landing/Vitrine intacts ; pas de scroll interne ; pièges jour/nuit) → Global Constraints, à vérifier en recette ✓.

**Placeholder scan :** aucun TBD. Helpers fournis intégralement avec tests. Le CSS « mécanique » restant renvoie explicitement à la maquette validée (artefact concret avec valeurs réelles), pas à un placeholder.

**Type consistency :** `participationDot(status, payment, kind, ctx?) → {colorVar,label}|null` (T1) consommé identiquement en T3/T5/T6. `seasonSummary(months, now) → {total, next:{name,daysUntil}|null}` (T2) consommé en T4. `<SeasonGlyph month size? />` (T3) consommé en T3/T5. Classes `.da-status`/`.da-dot` (Fondation) + `--dot-color` cohérentes partout. `.calendar-event-tag-amis` défini en T3, réutilisé en T5.
