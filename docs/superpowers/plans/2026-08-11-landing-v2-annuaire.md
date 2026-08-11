# Page d'accueil V2 « Annuaire » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer la page d'accueil V2 « annuaire » (structure validée + peau parchemin), branchée sur les vraies données Supabase en lecture anonyme, derrière un interrupteur, sans toucher d'une ligne la landing actuelle.

**Architecture :** Nouveaux fichiers `LandingV2.tsx` / `LandingV2.css` **à côté** de `Landing.tsx` / `Landing.css` (jamais à leur place). La route `/` choisit l'une ou l'autre selon un interrupteur pur (`?v2=1`, persisté en `localStorage`). Tout le CSS est scopé sous une racine `.lv2`. Les données viennent d'un hook `use-public-events` en lecture anonyme directe (PostgREST, pas de nouvelle RPC : la lecture anon sur `events` existe déjà en prod), et de logique **pure et testée** dans `src/lib/annuaire.ts`.

**Tech Stack :** React 19 · TypeScript 5.9 · Vite 7 · Tailwind v4 (non utilisé ici : CSS dédié, comme Landing.css) · Supabase JS (client anon) · Vitest.

**Sources de vérité :**
- Maquette validée : `docs/decisions/assets/v2-landing-annuaire.html` (CSS lignes 3‑382, markup lignes 558‑851, données/comportement lignes 854‑1003)
- Décision produit : `docs/decisions/0006-virage-annuaire-homme-du-milieu.md`
- Décision DA : `docs/decisions/0007-da-v2-parchemin.md`

---

## Constat terrain (mesuré le 2026-08-11 sur la prod, clé anon)

Ces chiffres commandent trois arbitrages du plan. Ils ont été relevés en direct, pas supposés.

| Mesure | Valeur réelle | Ce que dit la maquette |
|---|---|---|
| Événements en base (tous) | **101** | — |
| Événements publics à venir | **42** | « 412 événements » |
| …dont avec `registration_url` | **15** | « 340 prennent des exposants » |
| …dont avec `image_url` | **29** | vignettes grises |
| Participations publiques | 153 | « 1 284 exposants » |
| Lecture anon sur `events` | **autorisée** (200, 101 lignes) | supposée à créer |
| Événements privés visibles en anon | **1** (`is_private=eq.true` renvoie 1) | — |

**Conséquences actées dans ce plan :**
1. **Aucun compteur inventé.** Les compteurs affichent les vrais nombres, avec des libellés qui restent vrais quand le nombre grandit (Task 5). Le libellé « 412 événements » de la maquette est un remplissage de maquette, pas une promesse.
2. **La colonne « Par région » du pied de page n'est pas livrée** : la colonne `department` est sale en base (`84`, `Ille-et-villaine (35)`, `Puy-de-Dôme`, `Drôme `, `76610`…). Un lien de région produirait des pages vides ou fausses. Le pied de page passe à 3 colonnes (Task 8). À rouvrir quand les départements auront été normalisés.
3. **Les événements privés sont lisibles en anonyme** (modèle « unlisted » assumé par `20260613130000_events_private.sql` : *« RLS lecture inchangée, exclusion au niveau applicatif »*). Ce plan filtre `is_private=false` **côté requête ET côté logique pure** (Task 2). Refermer la lecture anon elle-même est un chantier DB séparé — hors périmètre ici, signalé à Uriel.

---

## Global Constraints

Ces règles s'appliquent à **toutes** les tâches. Une tâche qui les viole est à refuser en revue.

1. **Ne jamais modifier** `src/pages/Landing.tsx`, `src/pages/Landing.css`, ni les jetons de `src/index.css`. Aucune exception. La V1 doit rester bit-pour-bit fonctionnelle tant que l'interrupteur est éteint.
2. **Ne jamais toucher** `--copper`, `--primary`, `--page-backdrop`, `--glass`, `--accent` globaux (collision connue : un hex écrasant un triplet HSL casse ~13 survols de l'app).
3. **Tout le CSS de la V2 est scopé sous `.lv2`.** Aucun sélecteur nu. `section {}` de la maquette devient `.lv2 section {}` ; `.btn` devient `.lv2 .btn` ; idem `.ev`, `.chip`, `.wrap`, `.door`, `.q`, `.feat`, `.seg`, `.link`, `.stat`. *(Les fichiers `.css` de composant sont globaux dans ce projet — une classe générique non scopée fuit dans toute l'app.)*
4. **Le logo** est `public/icon.png` (pictogramme seul, 458×389). Hauteur fixée, largeur `auto`, **jamais** de `border-radius`, jamais de recadrage, jamais `pwa-192x192.png`. Le nom « Fellowship » est du texte à côté.
5. **Aucune illustration SVG dessinée à la main.** Les vignettes sans photo sont un dégradé neutre (`--photo-a` → `--photo-b`). Les `<symbol id="art-*">` de la maquette (lignes 390‑460) sont du code mort : **ne pas les porter**.
6. **Boutons à plat** : pas de liseré blanc en surimpression, pas d'ombre colorée. Tout liseré passe par le jeton `--lift`, redéfini par thème (un `inset 0 1px 0 rgba(255,255,255,…)` en dur se voit comme un trait blanc en sombre).
7. **Clair par défaut**, aucune bascule automatique sur `prefers-color-scheme` (décision 0007).
8. **Pas de scroll interne imbriqué.** Un seul scroll de page.
9. **Copie française telle quelle** depuis la maquette : tutoiement pour exposant/festivalier, **vouvoiement pour organisateur**. Ne pas réécrire les textes validés.
10. **TDD sur toute logique pure.** `render()` de RTL ne vide pas les effets de façon synchrone sur cette stack : on teste des fonctions pures dans `src/lib/*.test.ts`, jamais le composant monté.
11. **Après chaque tâche** : `pnpm build` + `pnpm test` + `pnpm lint` verts, bump `version` (patch) dans `package.json`, commit conventional, push sur `main`.

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/landing-v2.ts` *(créer)* | Interrupteur : fonction pure `resolveLandingV2(search, stored)` |
| `src/lib/landing-v2.test.ts` *(créer)* | Tests de l'interrupteur |
| `src/lib/annuaire.ts` *(créer)* | Logique pure : filtrage public, tri, statut de candidature, compteurs, recherche |
| `src/lib/annuaire.test.ts` *(créer)* | Tests de la logique de l'annuaire |
| `src/hooks/use-public-events.ts` *(créer)* | Lecture anonyme des événements publics + comptages |
| `src/pages/LandingV2.tsx` *(créer)* | La page : nav, hero, annuaire, gratuit, fondateur, témoignages, CTA, pied de page |
| `src/pages/LandingV2.css` *(créer)* | Le parchemin, scopé `.lv2` |
| `src/App.tsx:104` *(modifier)* | La route `/` arbitre V1/V2 |
| `src/lib/theme.ts` *(modifier)* | `getInitialTheme` accepte un défaut ; la V2 force le jour sans choix persisté |

---

## Task 1 : L'interrupteur

**Files:**
- Create: `src/lib/landing-v2.ts`
- Create: `src/lib/landing-v2.test.ts`
- Modify: `src/App.tsx:104`
- Create: `src/pages/LandingV2.tsx` (coquille minimale, remplie aux tâches suivantes)

**Interfaces:**
- Produces: `resolveLandingV2(search: string, stored: string | null): LandingV2Decision`, `LANDING_V2_STORAGE_KEY: string`, `readLandingV2(): boolean` *(fonction simple, pas un hook : elle est appelée une fois via `useState(readLandingV2)`)*, composant `LandingV2Page`.
- Consumes: rien.

Règle : `?v2=1` allume **et** mémorise ; `?v2=0` éteint **et** oublie ; sans paramètre, on relit la mémoire ; défaut éteint. Un lien partagé suffit donc à montrer la V2 à une cliente, et elle la garde à la visite suivante.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/landing-v2.test.ts
import { describe, it, expect } from 'vitest'
import { resolveLandingV2 } from './landing-v2'

describe('resolveLandingV2', () => {
  it('sans paramètre ni mémoire → V1', () => {
    expect(resolveLandingV2('', null)).toEqual({ enabled: false, persist: null })
  })
  it('?v2=1 → V2 et on mémorise', () => {
    expect(resolveLandingV2('?v2=1', null)).toEqual({ enabled: true, persist: '1' })
  })
  it('?v2=0 → V1 et on efface la mémoire', () => {
    expect(resolveLandingV2('?v2=0', '1')).toEqual({ enabled: false, persist: null })
  })
  it('sans paramètre mais mémoire allumée → V2, sans réécrire', () => {
    expect(resolveLandingV2('', '1')).toEqual({ enabled: true, persist: '1' })
  })
  it('valeur de mémoire inattendue → V1', () => {
    expect(resolveLandingV2('', 'oui')).toEqual({ enabled: false, persist: null })
  })
  it('autre paramètre présent → ignoré', () => {
    expect(resolveLandingV2('?utm_source=insta', null)).toEqual({ enabled: false, persist: null })
  })
})
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run : `pnpm test src/lib/landing-v2.test.ts`
Attendu : FAIL — `Failed to resolve import "./landing-v2"`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

```ts
// src/lib/landing-v2.ts
export const LANDING_V2_STORAGE_KEY = 'flwsh-landing-v2'

export interface LandingV2Decision {
  /** Faut-il rendre la V2 ? */
  enabled: boolean
  /** Valeur à écrire en mémoire, ou null pour l'effacer. */
  persist: '1' | null
}

/** L'interrupteur, en pur : `?v2=1` allume et mémorise, `?v2=0` éteint et oublie,
 *  sinon on relit la mémoire. Défaut : V1. */
export function resolveLandingV2(search: string, stored: string | null): LandingV2Decision {
  const param = new URLSearchParams(search).get('v2')
  if (param === '1') return { enabled: true, persist: '1' }
  if (param === '0') return { enabled: false, persist: null }
  return stored === '1' ? { enabled: true, persist: '1' } : { enabled: false, persist: null }
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run : `pnpm test src/lib/landing-v2.test.ts`
Attendu : PASS, 6 tests.

- [ ] **Step 5 : Brancher l'interrupteur sur la route**

Ajouter le hook dans le même fichier (il n'est pas testé : il ne fait que lire le navigateur) :

```ts
// src/lib/landing-v2.ts (suite)
/** Lit l'interrupteur côté navigateur et applique l'effet de mémoire. */
export function readLandingV2(): boolean {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem(LANDING_V2_STORAGE_KEY)
  const { enabled, persist } = resolveLandingV2(window.location.search, stored)
  if (persist) window.localStorage.setItem(LANDING_V2_STORAGE_KEY, persist)
  else window.localStorage.removeItem(LANDING_V2_STORAGE_KEY)
  return enabled
}
```

Créer la coquille de page :

```tsx
// src/pages/LandingV2.tsx
import './LandingV2.css'

export function LandingV2Page() {
  return (
    <div className="lv2" data-aud="exposant">
      <p style={{ padding: 40 }}>V2 — coquille</p>
    </div>
  )
}
```

Créer `src/pages/LandingV2.css` avec une seule ligne pour l'instant : `.lv2 { min-height: 100dvh; }`

Dans `src/App.tsx`, importer les deux et remplacer la ligne 104 :

```tsx
import { LandingV2Page } from '@/pages/LandingV2'
import { readLandingV2 } from '@/lib/landing-v2'

// …
function LandingRoute() {
  // Lu une seule fois au montage : l'interrupteur ne change pas en cours de visite.
  const [v2] = useState(readLandingV2)
  return v2 ? <LandingV2Page /> : <LandingPage />
}

// dans <Routes> :
<Route path="/" element={<LandingRoute />} />
```

- [ ] **Step 6 : Vérifier les deux chemins**

Run : `pnpm build && pnpm lint && pnpm test`
Attendu : build OK, 0 erreur lint, tous les tests verts.
Run : `pnpm dev`, ouvrir `http://localhost:5173/` → **landing actuelle inchangée**. Puis `http://localhost:5173/?v2=1` → « V2 — coquille ». Puis recharger `http://localhost:5173/` → toujours la coquille (mémoire). Puis `?v2=0` → landing actuelle.

- [ ] **Step 7 : Commit**

```bash
pnpm version patch --no-git-tag-version
git add src/lib/landing-v2.ts src/lib/landing-v2.test.ts src/pages/LandingV2.tsx src/pages/LandingV2.css src/App.tsx package.json
git commit -m "feat(landing-v2): interrupteur ?v2=1 et coquille de page"
git push
```

---

## Task 2 : Les données publiques de l'annuaire

**Files:**
- Create: `src/lib/annuaire.ts`
- Create: `src/lib/annuaire.test.ts`
- Create: `src/hooks/use-public-events.ts`

**Interfaces:**
- Consumes: `getTagEmoji`, `getTagLandingColor` depuis `@/components/ui/TagBadge`.
- Produces:
  - `type PublicEvent = { id, name, slug, city, department, start_date, end_date, image_url, tags, registration_url, registration_deadline, is_private }`
  - `type AnnuaireCard = { id, slug, title, when, tagSlug, tagColor, tagLabel, image, status: { kind: 'open' | 'soon' | 'info'; label: string } }`
  - `toPublicList(rows: PublicEvent[], today: Date): PublicEvent[]`
  - `applicationStatus(e: PublicEvent, today: Date): { kind: 'open' | 'soon' | 'info'; label: string }`
  - `formatWhen(e: PublicEvent): string`
  - `toCard(e: PublicEvent, today: Date, tagLabels: Record<string, string>): AnnuaireCard`
  - `searchEvents(list: PublicEvent[], query: string): PublicEvent[]`
  - `countCounters(list: PublicEvent[], exposants: number | null): Array<{ n: string; label: string }>`
  - `usePublicEvents(): { events: PublicEvent[]; loading: boolean }`

Note sur les colonnes : relevées sur une vraie ligne de prod — `id, name, slug, city, department, start_date, end_date, image_url, tags (text[]), registration_url, registration_deadline, stand_price, is_private, latitude, longitude`.

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// src/lib/annuaire.test.ts
import { describe, it, expect } from 'vitest'
import { toPublicList, applicationStatus, formatWhen, searchEvents, countCounters } from './annuaire'
import type { PublicEvent } from './annuaire'

const TODAY = new Date('2026-08-11T00:00:00Z')

function ev(over: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: 'x', name: 'Fête médiévale', slug: 'fete-medievale-provins', city: 'Provins',
    department: '77', start_date: '2026-09-12', end_date: '2026-09-13',
    image_url: null, tags: ['fete-medievale'], registration_url: null,
    registration_deadline: null, is_private: false, ...over,
  }
}

describe('toPublicList', () => {
  it('exclut les événements privés', () => {
    const list = toPublicList([ev(), ev({ id: 'p', is_private: true })], TODAY)
    expect(list.map(e => e.id)).toEqual(['x'])
  })
  it('exclut ce qui est déjà terminé, garde ce qui est en cours', () => {
    const fini = ev({ id: 'fini', start_date: '2026-07-01', end_date: '2026-07-03' })
    const encours = ev({ id: 'encours', start_date: '2026-08-09', end_date: '2026-08-13' })
    expect(toPublicList([fini, encours], TODAY).map(e => e.id)).toEqual(['encours'])
  })
  it('trie par date de début croissante', () => {
    const tard = ev({ id: 'tard', start_date: '2026-12-01', end_date: '2026-12-02' })
    const tot = ev({ id: 'tot', start_date: '2026-08-20', end_date: '2026-08-21' })
    expect(toPublicList([tard, tot], TODAY).map(e => e.id)).toEqual(['tot', 'tard'])
  })
})

describe('applicationStatus', () => {
  it('sans lien ni date limite → info neutre', () => {
    expect(applicationStatus(ev(), TODAY)).toEqual({ kind: 'info', label: 'Voir la fiche' })
  })
  it('lien de candidature sans date limite → ouvertes', () => {
    expect(applicationStatus(ev({ registration_url: 'https://x.fr' }), TODAY))
      .toEqual({ kind: 'open', label: 'Candidatures ouvertes' })
  })
  it('date limite dans 9 jours → clôture imminente', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-08-20' }), TODAY))
      .toEqual({ kind: 'soon', label: 'Clôture dans 9 jours' })
  })
  it('date limite demain → singulier', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-08-12' }), TODAY))
      .toEqual({ kind: 'soon', label: 'Clôture dans 1 jour' })
  })
  it('date limite dépassée → candidatures closes', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-08-01', registration_url: 'https://x.fr' }), TODAY))
      .toEqual({ kind: 'info', label: 'Candidatures closes' })
  })
  it('date limite lointaine → ouvertes', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-11-01' }), TODAY))
      .toEqual({ kind: 'open', label: 'Candidatures ouvertes' })
  })
})

describe('formatWhen', () => {
  it('deux jours du même mois → « 12 – 13 septembre · Provins »', () => {
    expect(formatWhen(ev())).toBe('12 – 13 septembre · Provins')
  })
  it('à cheval sur deux mois → les deux mois sont nommés', () => {
    expect(formatWhen(ev({ start_date: '2026-10-30', end_date: '2026-11-02' })))
      .toBe('30 octobre – 2 novembre · Provins')
  })
  it('un seul jour → pas de tiret', () => {
    expect(formatWhen(ev({ start_date: '2026-09-12', end_date: '2026-09-12' })))
      .toBe('12 septembre · Provins')
  })
  it('sans ville → seulement les dates', () => {
    expect(formatWhen(ev({ city: null }))).toBe('12 – 13 septembre')
  })
})

describe('searchEvents', () => {
  const list = [ev(), ev({ id: 'n', name: 'Marché de Noël', city: 'Colmar' })]
  it('requête vide → tout', () => {
    expect(searchEvents(list, '  ')).toHaveLength(2)
  })
  it('cherche dans le nom, sans casse ni accents', () => {
    expect(searchEvents(list, 'MARCHE DE NOEL').map(e => e.id)).toEqual(['n'])
  })
  it('cherche dans la ville', () => {
    expect(searchEvents(list, 'provins').map(e => e.id)).toEqual(['x'])
  })
})

describe('countCounters', () => {
  it('compte les vrais nombres, jamais de chiffre inventé', () => {
    const list = [ev(), ev({ id: 'b', registration_url: 'https://x.fr' })]
    expect(countCounters(list, 84)).toEqual([
      { n: '2', label: 'événements à venir' },
      { n: '1', label: 'prend des exposants' },
      { n: '84', label: 'exposants inscrits' },
    ])
  })
  it('accorde le libellé au pluriel', () => {
    const list = [ev({ id: 'a', registration_url: 'https://x.fr' }), ev({ id: 'b', registration_url: 'https://y.fr' })]
    expect(countCounters(list, 2)[1]).toEqual({ n: '2', label: 'prennent des exposants' })
  })
  it('compte des exposants inconnu → la troisième pastille disparaît', () => {
    expect(countCounters([ev()], null)).toHaveLength(2)
  })
})
```

- [ ] **Step 2 : Lancer les tests et vérifier qu'ils échouent**

Run : `pnpm test src/lib/annuaire.test.ts`
Attendu : FAIL — `Failed to resolve import "./annuaire"`.

- [ ] **Step 3 : Écrire l'implémentation**

```ts
// src/lib/annuaire.ts
import { getTagEmoji, getTagLandingColor } from '@/components/ui/TagBadge'

export interface PublicEvent {
  id: string
  name: string
  slug: string | null
  city: string | null
  department: string | null
  start_date: string
  end_date: string
  image_url: string | null
  tags: string[] | null
  registration_url: string | null
  registration_deadline: string | null
  is_private: boolean
}

export type StatusKind = 'open' | 'soon' | 'info'
export interface CardStatus { kind: StatusKind; label: string }

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** Une date ISO `YYYY-MM-DD` lue en heure locale, sans décalage de fuseau. */
function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Nombre de jours pleins entre deux jours calendaires. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)
}

/** Les seuls événements que l'annuaire public a le droit de montrer :
 *  jamais un privé (modèle unlisted : la RLS ne les cache pas, c'est à nous
 *  de ne pas les lister), jamais un événement terminé. Triés par date. */
export function toPublicList(rows: PublicEvent[], today: Date): PublicEvent[] {
  const t = startOfDay(today)
  return rows
    .filter(e => !e.is_private)
    .filter(e => parseDay(e.end_date ?? e.start_date) >= t)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
}

export function applicationStatus(e: PublicEvent, today: Date): CardStatus {
  if (e.registration_deadline) {
    const left = daysBetween(today, parseDay(e.registration_deadline))
    if (left < 0) return { kind: 'info', label: 'Candidatures closes' }
    if (left === 0) return { kind: 'soon', label: 'Clôture aujourd’hui' }
    if (left <= 30) return { kind: 'soon', label: `Clôture dans ${left} jour${left > 1 ? 's' : ''}` }
    return { kind: 'open', label: 'Candidatures ouvertes' }
  }
  if (e.registration_url) return { kind: 'open', label: 'Candidatures ouvertes' }
  return { kind: 'info', label: 'Voir la fiche' }
}

export function formatWhen(e: PublicEvent): string {
  const s = parseDay(e.start_date)
  const en = parseDay(e.end_date ?? e.start_date)
  const sameDay = e.start_date === e.end_date
  const sameMonth = s.getMonth() === en.getMonth() && s.getFullYear() === en.getFullYear()
  const dates = sameDay
    ? `${s.getDate()} ${MOIS[s.getMonth()]}`
    : sameMonth
      ? `${s.getDate()} – ${en.getDate()} ${MOIS[en.getMonth()]}`
      : `${s.getDate()} ${MOIS[s.getMonth()]} – ${en.getDate()} ${MOIS[en.getMonth()]}`
  return e.city ? `${dates} · ${e.city}` : dates
}

/** Repli sans accents ni casse : « MARCHE DE NOEL » doit trouver « Marché de Noël ». */
function fold(s: string): string {
  // Plage des diacritiques combinants, construite par échappements : écrite
  // en littéral dans une regex, elle se fait avaler par les copier-coller.
  const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
  return s.normalize('NFD').replace(DIACRITICS, '').toLowerCase()
}

export function searchEvents(list: PublicEvent[], query: string): PublicEvent[] {
  const q = fold(query.trim())
  if (!q) return list
  return list.filter(e =>
    fold(e.name).includes(q) ||
    fold(e.city ?? '').includes(q) ||
    fold(e.department ?? '').includes(q))
}

export interface AnnuaireCard {
  id: string
  href: string
  title: string
  when: string
  tagSlug: string | null
  tagColor: string
  tagLabel: string
  image: string | null
  status: CardStatus
}

/** `tagLabels` vient de la table `tags` (slug → libellé). Sans libellé connu,
 *  on n'invente rien : on retombe sur le slug. */
export function toCard(e: PublicEvent, today: Date, tagLabels: Record<string, string>): AnnuaireCard {
  const slug = e.tags?.[0] ?? null
  return {
    id: e.id,
    href: e.slug ? `/e/${e.slug}` : `/evenement/${e.id}`,
    title: e.name,
    when: formatWhen(e),
    tagSlug: slug,
    tagColor: slug ? getTagLandingColor(slug) : '#e8a06a',
    tagLabel: slug ? `${getTagEmoji(slug)} ${tagLabels[slug] ?? slug}` : '',
    image: e.image_url,
    status: applicationStatus(e, today),
  }
}

/** Compteurs du hero. Uniquement des nombres mesurés : la page plaide
 *  l'honnêteté, elle ne peut pas s'ouvrir sur un chiffre gonflé. */
export function countCounters(list: PublicEvent[], exposants: number | null): Array<{ n: string; label: string }> {
  const withApplications = list.filter(e => e.registration_url || e.registration_deadline).length
  const out = [
    { n: String(list.length), label: list.length > 1 ? 'événements à venir' : 'événement à venir' },
    { n: String(withApplications), label: withApplications > 1 ? 'prennent des exposants' : 'prend des exposants' },
  ]
  if (exposants != null) out.push({ n: String(exposants), label: 'exposants inscrits' })
  return out
}
```

- [ ] **Step 4 : Lancer les tests et vérifier qu'ils passent**

Run : `pnpm test src/lib/annuaire.test.ts`
Attendu : PASS, 18 tests.

- [ ] **Step 5 : Écrire le hook de lecture anonyme**

```ts
// src/hooks/use-public-events.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PublicEvent } from '@/lib/annuaire'

/** Colonnes strictement nécessaires à l'annuaire public. On ne fait jamais
 *  `select('*')` ici : la table porte des colonnes qui n'ont rien à faire
 *  dans une page anonyme (contact_email, acted_by_user_id…). */
const PUBLIC_EVENT_COLUMNS =
  'id, name, slug, city, department, start_date, end_date, image_url, tags, registration_url, registration_deadline, is_private'

export interface PublicEventsState {
  events: PublicEvent[]
  tagLabels: Record<string, string>
  loading: boolean
}

export function usePublicEvents(): PublicEventsState {
  const [state, setState] = useState<PublicEventsState>({ events: [], tagLabels: {}, loading: true })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const today = new Date().toISOString().slice(0, 10)
      const [evs, tags] = await Promise.all([
        supabase.from('events').select(PUBLIC_EVENT_COLUMNS)
          // Double garde : le filtre serveur évite de faire transiter les privés,
          // `toPublicList` refiltre côté client. Les deux sont voulus.
          .eq('is_private', false)
          .gte('end_date', today)
          .order('start_date', { ascending: true })
          .limit(200),
        // La colonne du libellé s'appelle `name` en base, pas `label`
        // (vérifié en prod : `label` renvoie 42703).
        supabase.from('tags').select('slug, name'),
      ])
      if (cancelled) return
      const labels = Object.fromEntries(
        ((tags.data ?? []) as Array<{ slug: string; name: string }>).map(t => [t.slug, t.name]))
      setState({ events: (evs.data ?? []) as unknown as PublicEvent[], tagLabels: labels, loading: false })
    }
    run().catch(() => { if (!cancelled) setState({ events: [], tagLabels: {}, loading: false }) })
    return () => { cancelled = true }
  }, [])

  return state
}
```

- [ ] **Step 6 : Vérifier la lecture réelle**

Vérifier d'abord que la table `tags` est bien lisible en anonyme (elle alimente les libellés) :

```bash
set -a; . ./.env; set +a
curl -s -o /dev/null -w "tags: %{http_code}\n" "$VITE_SUPABASE_URL/rest/v1/tags?select=slug,label&limit=1" -H "apikey: $VITE_SUPABASE_ANON_KEY"
```

Attendu : `tags: 200`. **Si la réponse est 401/403, arrêter et le signaler** : il faudra alors se rabattre sur `getTagEmoji` seul (emoji + slug) plutôt que d'ouvrir une table en anonyme sans arbitrage d'Uriel.

Puis : `pnpm build && pnpm lint && pnpm test` → tout vert.

- [ ] **Step 7 : Commit**

```bash
pnpm version patch --no-git-tag-version
git add src/lib/annuaire.ts src/lib/annuaire.test.ts src/hooks/use-public-events.ts package.json
git commit -m "feat(landing-v2): lecture publique des evenements et logique d'annuaire testee"
git push
```

---

## Task 3 : Le socle parchemin

**Files:**
- Modify: `src/pages/LandingV2.css` (remplacement complet)
- Modify: `src/pages/LandingV2.tsx` (racine + halos + thème)
- Modify: `src/lib/theme.ts`

**Interfaces:**
- Consumes: `LandingV2Page` (Task 1).
- Produces: la classe racine `.lv2`, les jetons parchemin, `applyThemeDefaultDay(): void`.

Portage : CSS de la maquette **lignes 4‑104 et 374‑381**, **chaque sélecteur préfixé `.lv2`**. Les jetons vivent sur `.lv2` (pas sur `:root`) pour ne rien déverser dans l'app.

- [ ] **Step 1 : Écrire le socle CSS**

```css
/* src/pages/LandingV2.css
   Parchemin V2. TOUT est scopé sous .lv2 — les .css de ce projet sont globaux,
   une classe nue comme .ev ou .btn fuirait dans toute l'application. */

.lv2 {
  --parchment: #F4EEE1; --rail: #EFE8D9;
  --ink: #594848; --ink-soft: #8C7B72; --ink-faint: #B0A197;
  --hairline: rgba(89,72,72,.13); --hairline-2: rgba(89,72,72,.09);
  --block: rgba(255,252,246,.58); --block-2: rgba(255,252,246,.38);
  --accent-lv2: #C06846; --accent-ink: #FFF6F0; --accent-wash: rgba(192,104,70,.11);
  --ok: #4E7355; --ok-wash: rgba(78,115,85,.13);
  --wait: #B98032; --wait-wash: rgba(185,128,50,.14);
  --lift: inset 0 1px 0 rgba(255,255,255,.72), 0 1px 2px rgba(84,62,44,.045), 0 10px 26px -8px rgba(84,62,44,.10);
  --halo-1: rgba(226,155,118,.17); --halo-2: rgba(186,152,214,.075);
  --halo-3: rgba(232,180,120,.08); --halo-4: rgba(214,146,120,.08);
  --halo-blur: 90px;
  --tag-bg: 22%; --tag-ink: 62%;
  --photo-a: #D8C7A8; --photo-b: #A8927A;

  min-height: 100dvh;
  color: var(--ink);
  background-color: var(--parchment);
  font-size: 16px;
  line-height: 1.62;
  -webkit-font-smoothing: antialiased;
}

/* Le sombre ne s'active que sur demande explicite (classe .light absente =
   nuit dans cette app). Aucune règle prefers-color-scheme : décision 0007. */
html:not(.light) .lv2 {
  --parchment: #171414; --rail: #1B1716;
  --ink: #F0E5D6; --ink-soft: #A3948A; --ink-faint: #786A62;
  --hairline: rgba(240,229,214,.15); --hairline-2: rgba(240,229,214,.10);
  --block: rgba(255,238,222,.042); --block-2: rgba(255,238,222,.028);
  --accent-lv2: #E29B76; --accent-ink: #2A1810; --accent-wash: rgba(226,155,118,.16);
  --ok: #8FBF9C; --ok-wash: rgba(143,191,156,.15);
  --wait: #E0B26A; --wait-wash: rgba(224,178,106,.16);
  --lift: inset 0 1px 0 rgba(255,255,255,.055), 0 1px 2px rgba(0,0,0,.34), 0 12px 30px -10px rgba(0,0,0,.50);
  --halo-1: rgba(226,124,78,.18); --halo-2: rgba(150,110,205,.15);
  --halo-3: rgba(226,155,90,.10); --halo-4: rgba(196,96,80,.12);
  --halo-blur: 110px;
  --tag-bg: 16%; --tag-ink: 78%;
  --photo-a: #4E4237; --photo-b: #2E2721;
}

.lv2 * { box-sizing: border-box; }
.lv2 p { margin: 0; }
.lv2 svg { flex: none; }
/* width:100% indispensable : dans un parent flex, `margin: 0 auto` annule
   l'étirement et le bloc se réduit à son contenu. */
.lv2 .wrap { width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 30px; }

.lv2 .halos { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; }
.lv2 .halos i { position: absolute; border-radius: 50%; filter: blur(var(--halo-blur)); display: block; }
.lv2 .h1x { width: 680px; height: 560px; top: -220px; left: -140px; background: var(--halo-1); }
.lv2 .h2x { width: 520px; height: 460px; top: 0; right: -160px; background: var(--halo-2); }
.lv2 .h3x { width: 620px; height: 520px; top: 48%; left: 14%; background: var(--halo-3); }
.lv2 .h4x { width: 520px; height: 440px; bottom: -180px; right: 4%; background: var(--halo-4); }

.lv2 h1 { font-size: clamp(2.3rem, 5.2vw, 3.5rem); font-weight: 500; letter-spacing: -.036em; line-height: 1.03; margin: 0; text-wrap: balance; }
.lv2 h2 { font-size: clamp(1.5rem, 2.6vw, 2rem); font-weight: 500; letter-spacing: -.028em; line-height: 1.12; margin: 0; text-wrap: balance; }
.lv2 h3 { font-size: 1.0625rem; font-weight: 600; letter-spacing: -.014em; margin: 0; }
.lv2 .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: .6875rem; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--accent-lv2); margin: 0; }
.lv2 .eyebrow svg { width: 15px; height: 15px; }
.lv2 .lede { font-size: 1.0625rem; color: var(--ink-soft); max-width: 56ch; }
.lv2 .note { font-size: .9375rem; color: var(--ink-soft); }

.lv2 nav.site { position: sticky; top: 0; z-index: 40; background: transparent; border-bottom: 1px solid transparent; transition: background .3s ease, border-color .3s ease; }
.lv2 nav.site.scrolled { background: var(--parchment); }  /* pas de filet : le fond suffit */
.lv2 .nav-in { display: flex; align-items: center; justify-content: space-between; gap: 22px; height: 76px; }
.lv2 .logo { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; letter-spacing: -.022em; font-size: 1.0625rem; color: var(--ink); text-decoration: none; }
/* Pictogramme SEUL (public/icon.png, 458x389), affiché entier : hauteur fixée,
   largeur libre. Jamais de cadre, jamais de recadrage, JAMAIS de border-radius. */
.lv2 .logo img { height: 26px; width: auto; display: block; }
.lv2 .nav-links { display: flex; align-items: center; gap: 26px; }
.lv2 .link { color: var(--ink-soft); text-decoration: none; font-size: .9375rem; background: none; border: 0; font: inherit; cursor: pointer; padding: 0; }
.lv2 .link:hover { color: var(--ink); }

.lv2 .btn { display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 13px 26px; border-radius: 999px; font: inherit; font-size: .9375rem; font-weight: 600; letter-spacing: -.005em; border: 1px solid transparent; cursor: pointer; text-decoration: none; transition: opacity .18s, border-color .18s; }
.lv2 .btn svg { width: 17px; height: 17px; }
/* À plat : ni liseré blanc en surimpression, ni ombre colorée. */
.lv2 .btn-primary { background: var(--accent-lv2); color: var(--accent-ink); box-shadow: none; }
.lv2 .btn-primary:hover { opacity: .9; }
.lv2 .btn-ghost { background: transparent; color: var(--ink); border-color: var(--hairline); }
.lv2 .btn-ghost:hover { border-color: var(--accent-lv2); }
.lv2 .btn-sm { padding: 9px 19px; font-size: .875rem; }
.lv2 .btn:focus-visible { outline: 2px solid var(--accent-lv2); outline-offset: 3px; }

.lv2 section { padding: 62px 0; display: flex; flex-direction: column; gap: 28px; }
.lv2 .sec-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.lv2 .sec-head .l { display: flex; flex-direction: column; gap: 11px; }

@media (prefers-reduced-motion: reduce) {
  .lv2 *, .lv2 *::before, .lv2 *::after { transition: none !important; animation: none !important; }
}
@media (max-width: 720px) {
  .lv2 .wrap { padding: 0 20px; }
  .lv2 section { padding: 48px 0; }
  .lv2 .nav-links .link { display: none; }
}
```

- [ ] **Step 2 : Rendre le clair prioritaire sur la V2**

Ajouter dans `src/lib/theme.ts`, **sans changer** `getInitialTheme` (l'app connectée reste en nuit par défaut) :

```ts
/** Un choix de thème explicitement persisté par l'utilisateur. Tout le reste
 *  (absence de clé, valeur inconnue) veut dire « il n'a jamais choisi ». */
export function hasExplicitThemeChoice(stored: string | null): boolean {
  return stored === 'day' || stored === 'night'
}
```

⚠️ **Écrire la classe `.light` directement depuis la page ne marche pas** — corrigé en séance,
ne pas y revenir. `ThemeProvider` s'initialise sur `getInitialTheme()` (nuit si le stockage est
vide) et applique son thème dans un effet de montage ; les effets enfants passant **avant** ceux
du parent, tout ce que la page écrit dans le DOM est écrasé juste après. Le provider est la
source unique : la page doit passer **par lui**.

```tsx
// dans LandingV2.tsx
const { setTheme } = useTheme()
// Lu au PREMIER rendu, avant que l'effet de ThemeProvider ne persiste son
// propre défaut : c'est le seul moment où l'on sait s'il avait vraiment choisi.
const [hadChoice] = useState(() => hasExplicitThemeChoice(
  typeof window === 'undefined' ? null : window.localStorage.getItem(THEME_STORAGE_KEY)))

useEffect(() => {
  if (!hadChoice) setTheme('day')   // parchemin par défaut, décision 0007
}, [hadChoice, setTheme])
```

- [ ] **Step 3 : Poser la racine dans la page**

```tsx
// src/pages/LandingV2.tsx
import { useEffect, useRef, useState } from 'react'
import { applyThemeDefaultDay } from '@/lib/theme'
import './LandingV2.css'

type Audience = 'festivalier' | 'exposant' | 'organisateur'

export function LandingV2Page() {
  const [audience] = useState<Audience>('exposant')
  const navRef = useRef<HTMLElement>(null)

  // Parchemin par défaut : voir le Step 2 ci-dessus, on passe par le provider.
  useEffect(() => { if (!hadChoice) setTheme('day') }, [hadChoice, setTheme])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const handler = () => nav.classList.toggle('scrolled', window.scrollY > 16)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="lv2" data-aud={audience}>
      <div className="halos" aria-hidden="true"><i className="h1x" /><i className="h2x" /><i className="h3x" /><i className="h4x" /></div>

      <nav className="site" ref={navRef}>
        <div className="wrap nav-in">
          <a className="logo" href="/"><img src="/icon.png" alt="" />Fellowship</a>
          <div className="nav-links">
            <a className="link" href="#annuaire">L'annuaire</a>
            <a className="link" href="#gratuit">C'est gratuit</a>
            <a className="btn btn-primary btn-sm" href="/login">Créer mon compte</a>
          </div>
        </div>
      </nav>
    </div>
  )
}
```

- [ ] **Step 4 : Vérifier à l'œil, jour et nuit**

Run : `pnpm dev` puis ouvrir `http://localhost:5173/?v2=1`.
Attendu : fond parchemin chaud, barre transparente en haut qui prend le fond au défilement (sans filet), logo entier sans coin arrondi, bouton terracotta plat.
Vérifier le sombre : dans la console, `localStorage.setItem('flwsh-theme','night'); location.reload()` → fond `#171414`, encre crème, **aucun trait blanc** sur les boutons. Puis remettre `day`.

- [ ] **Step 5 : Commit**

```bash
pnpm version patch --no-git-tag-version
git add src/pages/LandingV2.css src/pages/LandingV2.tsx src/lib/theme.ts package.json
git commit -m "feat(landing-v2): socle parchemin scope .lv2, barre et boutons"
git push
```

---

## Task 4 : Hero, sélecteur d'audience et bandeau des univers

**Files:**
- Modify: `src/pages/LandingV2.tsx`
- Modify: `src/pages/LandingV2.css`

**Interfaces:**
- Consumes: `usePublicEvents` (Task 2), `countCounters`, `toPublicList`.
- Produces: l'état `audience` et son setter, partagés avec les tâches 5 à 7 ; la constante `MARQUEE_TAGS`.

Copie : maquette lignes 570‑603 (hero) — reprise **mot pour mot**. Les 19 univers et leurs couleurs : maquette lignes 876‑883 (identiques à `marqueTags` de `Landing.tsx:10-30`).

- [ ] **Step 1 : Ajouter le CSS du hero et du bandeau**

Porter la maquette lignes 106‑147 (sélecteur, `.v`, hero, recherche, compteurs, signature) et 205‑222 (bandeau), **chaque sélecteur préfixé `.lv2`**. Les règles de bascule d'audience deviennent :

```css
.lv2 .v { display: none; }
.lv2[data-aud="festivalier"]  .v.festivalier,
.lv2[data-aud="exposant"]     .v.exposant,
.lv2[data-aud="organisateur"] .v.organisateur { display: block; }
.lv2 .hero-copy.v { display: none; }
.lv2[data-aud="festivalier"]  .hero-copy.festivalier,
.lv2[data-aud="exposant"]     .hero-copy.exposant,
.lv2[data-aud="organisateur"] .hero-copy.organisateur { display: flex; flex-direction: column; gap: 18px; }
```

Le champ de recherche n'est plus un faux : c'est un vrai `input`.

```css
.lv2 .search-big { display: flex; align-items: center; gap: 14px; padding: 18px 26px; border-radius: 999px; max-width: 620px; background: var(--block); box-shadow: var(--lift); }
.lv2 .search-big svg { width: 20px; height: 20px; color: var(--ink-soft); }
.lv2 .search-big input { flex: 1; border: 0; background: none; font: inherit; font-size: 1.0625rem; color: var(--ink); outline: none; min-width: 0; }
.lv2 .search-big input::placeholder { color: var(--ink-faint); }
```

Le reste (`.seg`, `.counts`, `.signature`, `.badge-free`, `.marquee`, `.mtrack`, `.etag`, `@keyframes slide`) est porté tel quel, préfixé. **Le `@keyframes slide` n'est pas préfixable** : le renommer `lv2-slide` pour éviter toute collision avec `Landing.css`.

- [ ] **Step 2 : Écrire le hero**

L'état de la page, déclaré une fois en tête du composant et partagé avec les tâches 5 à 7 :

```tsx
const [audience, setAudience] = useState<Audience>('exposant')
const [query, setQuery] = useState('')
const { count: exposantsCount } = useLandingExposants()   // hook existant, lecture anonyme
const { events: rawEvents, tagLabels, loading } = usePublicEvents()
const today = useMemo(() => new Date(), [])
const publicEvents = useMemo(() => toPublicList(rawEvents, today), [rawEvents, today])
const counters = useMemo(() => countCounters(publicEvents, exposantsCount), [publicEvents, exposantsCount])
/** Combien d'événements prennent réellement des exposants — sert le hero ET
 *  la bande de dernier appel (Task 7). Une seule source, pas deux comptages. */
const withApplications = useMemo(
  () => publicEvents.filter(e => e.registration_url || e.registration_deadline).length,
  [publicEvents])
```

Les trois titres, dans cet ordre exact (maquette 579‑590) — le titre organisateur affiche le **vrai** nombre d'exposants, pas « 1 284 » :

```tsx
<header className="hero">
  <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
    <div className="seg" role="group" aria-label="Je suis">
      {(['festivalier', 'exposant', 'organisateur'] as const).map(a => (
        <button key={a} type="button" className={audience === a ? 'on' : undefined}
          aria-pressed={audience === a} onClick={() => switchAudience(a)}>
          {a === 'festivalier' ? 'Festivalier' : a === 'exposant' ? 'Exposant' : 'Organisateur'}
          {a === 'organisateur' && <span className="mini">Soon</span>}
        </button>
      ))}
    </div>

    <div className="hero-copy v exposant">
      <h1>Tous les événements<br />où poser son stand.</h1>
      <p className="lede">Festivals médiévaux, fests de métal, conventions de tatouage, marchés de créateurs et de Noël. Un seul annuaire, gratuit, tenu à jour par ceux qui y exposent.</p>
    </div>
    <div className="hero-copy v festivalier">
      <h1>Tous les festivals,<br />près de chez toi.</h1>
      <p className="lede">Fêtes médiévales, fests de métal, conventions, marchés de créateurs et de Noël. Découvre où sortir, et suis les créateurs que tu aimes de festival en festival.</p>
    </div>
    <div className="hero-copy v organisateur">
      <h1>{exposantsCount ?? '—'} exposants<br />cherchent une date.</h1>
      <p className="lede">Référencez votre festival gratuitement dans l'annuaire, voyez combien d'exposants le suivent, et recevez bientôt leurs candidatures sans un seul PDF.</p>
    </div>

    <div className="search-big">
      <Search aria-hidden="true" />
      <input value={query} onChange={e => setQuery(e.target.value)}
        aria-label="Chercher dans l'annuaire" placeholder={SEARCH_PLACEHOLDER[audience]} />
    </div>

    <div className="counts">
      {counters.map((c, i) => (
        <span key={c.label} style={{ display: 'contents' }}>
          {i > 0 && <span>·</span>}<b>{c.n}</b><span>{c.label}</span>
        </span>
      ))}
    </div>

    <div className="signature">
      <span className="badge-free"><Check aria-hidden="true" />Gratuit : chercher, planifier, se retrouver</span>
      <span className="by">Édité par <strong>Runes de Chêne</strong> — on expose, comme vous.</span>
    </div>
  </div>
</header>
```

Avec, en haut du fichier :

```tsx
const SEARCH_PLACEHOLDER: Record<Audience, string> = {
  exposant: 'Chercher un festival, une ville, une date…',
  festivalier: 'Chercher une sortie, une ville, une date…',
  organisateur: 'Chercher votre festival dans l’annuaire…',
}
```

Les icônes viennent de `lucide-react` (déjà une dépendance, cf. `TagBadge.tsx`) : `Search`, `Check`, `Compass`, `Tent`, `Calendar`, `ArrowRight`, `Plus`, `LayoutGrid`, `Users`, `CreditCard`, `Bell`, `Code`, `Send`, `ScrollText`. Elles remplacent les `<use href="#i-…">` de la maquette, qui référençaient un sprite non porté.

`switchAudience` reprend le comportement de la maquette (ligne 997) : changer l'audience **puis** remonter en haut.

```tsx
function switchAudience(a: Audience) {
  setAudience(a)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
```

- [ ] **Step 3 : Écrire le bandeau des univers**

```tsx
const MARQUEE_TAGS: Array<[string, string]> = [
  ['⚔️ Médiéval', '#e8a06a'], ['🎵 Fête de la musique', '#b89ae0'], ['🖼️ Exposition', '#7fc6a0'],
  ['🎄 Marché de Noël', '#e8897a'], ['🎮 Festival geek', '#79b4d6'], ['🛠️ Foire artisanale', '#e8c06a'],
  ['🎨 Marché de créateurs', '#f0a86a'], ['🐉 Fantasy', '#c4a0e0'], ['📚 Salon du livre', '#7fc6b4'],
  ['🪑 Brocante', '#d4be8a'], ['🦸 Comic Con', '#e89ab4'], ['🧺 Marché de producteurs', '#a8cc7a'],
  ['🎭 Culturel', '#c4a0c4'], ['🌾 Terroir', '#c4a06a'], ['🎬 Cinéma', '#8a98c4'],
  ['🏍️ Biker', '#9a9a9a'], ['🏕️ Outdoor', '#79c6a0'], ['🥘 Gastronomique', '#e89a6a'], ['🌹 Tatouage', '#c4768a'],
]
```

```tsx
{/* Deux passes : la piste se translate de -50 %, la seconde moitié prend
    exactement la place de la première — pas de saut visible. */}
<div className="marquee" aria-hidden="true">
  <div className="mtrack">
    {[0, 1].map(pass => MARQUEE_TAGS.map(([label, c]) => (
      <span key={`${pass}-${label}`} className="etag" style={{ '--c': c } as React.CSSProperties}>{label}</span>
    )))}
  </div>
</div>
```

- [ ] **Step 4 : Vérifier à l'écran**

Run : `pnpm dev`, ouvrir `/?v2=1`.
Attendu : les trois onglets changent le titre, le placeholder et les compteurs ; les compteurs affichent les **vrais** nombres (~42 / ~15 / le compte d'exposants) ; le bandeau défile en boucle sans saut et se met en pause au survol.
Vérifier aussi : réduire la fenêtre à 380 px → aucun débordement horizontal, aucune barre de scroll latérale.

- [ ] **Step 5 : Commit**

```bash
pnpm version patch --no-git-tag-version
git add src/pages/LandingV2.tsx src/pages/LandingV2.css package.json
git commit -m "feat(landing-v2): hero, selecteur d'audience, compteurs reels, bandeau des univers"
git push
```

---

## Task 5 : La grille de l'annuaire

**Files:**
- Modify: `src/pages/LandingV2.tsx`
- Modify: `src/pages/LandingV2.css`

**Interfaces:**
- Consumes: `usePublicEvents`, `toPublicList`, `searchEvents`, `toCard`, `AnnuaireCard` (Task 2) ; `audience`, `query` (Task 4).
- Produces: la section `#annuaire`, l'état `activeTag` (filtre par univers) consommé par le pied de page (Task 8).

C'est le cœur du virage 0006 : la première chose que voit un inconnu, ce sont de **vrais** événements cliquables. Les cartes pointent vers `/e/:slug`, qui est **déjà public** (`App.tsx` → `EventWithLayout` rend `EventPage` sans authentification).

- [ ] **Step 1 : Porter le CSS de la grille**

Maquette lignes 224‑259 (`.filters`, `.chip`, `.events`, `.ev`, `.uni-tag`, `.stat`), préfixé `.lv2`. Deux ajouts, absents de la maquette parce qu'elle n'avait pas de vraies données :

```css
/* La photo réelle quand l'orga en a fourni une (29 événements sur 42 en ont
   une aujourd'hui) ; le dégradé neutre sinon. Jamais d'illustration dessinée. */
.lv2 .ev .art { position: relative; aspect-ratio: 4/3; overflow: hidden; border-radius: 13px; transition: transform .24s; background: linear-gradient(152deg, var(--photo-a), var(--photo-b)); }
.lv2 .ev .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lv2 .ev:hover .art { transform: translateY(-2px); }

/* Squelettes pendant le chargement : la grille ne doit pas sauter. */
.lv2 .ev-skeleton { border-radius: 20px; background: var(--block-2); padding: 10px 10px 4px; }
.lv2 .ev-skeleton .art { background: var(--block); }
.lv2 .annuaire-empty { padding: 40px 0; color: var(--ink-soft); font-size: .9375rem; }
```

- [ ] **Step 2 : Écrire la section**

`rawEvents`, `publicEvents`, `today`, `tagLabels`, `loading` et `query` sont déjà déclarés en Task 4. On ajoute ici l'état propre à la grille :

```tsx
const [activeTag, setActiveTag] = useState<string | null>(null)
const [activeFilters, setActiveFilters] = useState<string[]>([])
const [showAll, setShowAll] = useState(false)

function toggleFilter(key: string) {
  setActiveFilters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
}
function resetFilters() {
  setActiveFilters([]); setActiveTag(null); setQuery('')
}

const filtered = useMemo(() => {
  const byTag = activeTag ? publicEvents.filter(e => e.tags?.includes(activeTag)) : publicEvents
  // Filtres cumulatifs : cocher deux puces resserre, ça n'élargit jamais.
  const byChips = FILTERS
    .filter(f => activeFilters.includes(f.key))
    .reduce((list, f) => list.filter(e => f.test(e)), byTag)
  return searchEvents(byChips, query)
}, [publicEvents, activeTag, activeFilters, query])

const cards = useMemo(
  () => filtered.map(e => toCard(e, today, tagLabels)),
  [filtered, today, tagLabels])
const visible = showAll ? cards : cards.slice(0, 12)
```

Les filtres à puces sont ceux de la maquette (lignes 921‑935) **réduits à ce qui est réellement calculable** sur les données existantes. On ne pose pas de puce qui ne filtre rien. `FILTERS` se déclare **au-dessus** du `useMemo` ci-dessus (il en dépend) et à l'intérieur du composant (il capture `today`) :

```tsx
const FILTERS: Array<{ key: string; label: string; icon?: React.ReactNode; test: (e: PublicEvent) => boolean }> = [
  { key: 'expo', label: 'Prend des exposants', icon: <Tent aria-hidden="true" />,
    test: e => Boolean(e.registration_url || e.registration_deadline) },
  { key: 'open', label: 'Candidatures ouvertes',
    test: e => applicationStatus(e, today).kind === 'open' },
  { key: 'photo', label: 'Avec affiche', test: e => Boolean(e.image_url) },
]
```

*(« Moins de 300 km » et « Ce week-end » de la maquette sont écartés : le premier exige la position du visiteur — un consentement qu'on ne demande pas sur une page d'accueil ; le second ne renverrait presque jamais de résultat sur 42 événements. À rouvrir quand le volume aura grossi.)*

Le markup suit la maquette lignes 605‑617, avec un titre par audience (lignes 918/925/932) et le bouton « tout voir » branché sur le vrai total :

```tsx
<section id="annuaire">
  <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
    <div className="sec-head">
      <div className="l">
        <p className="eyebrow"><Compass aria-hidden="true" />L'annuaire</p>
        <h2>{ANNUAIRE_TITLE[audience]}</h2>
      </div>
      {cards.length > 12 && !showAll && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAll(true)}>
          Voir les {cards.length} événements
        </button>
      )}
    </div>

    <div className="filters">
      {FILTERS.map(f => (
        <button key={f.key} type="button" className={`chip${activeFilters.includes(f.key) ? ' on' : ''}`}
          aria-pressed={activeFilters.includes(f.key)} onClick={() => toggleFilter(f.key)}>
          {f.icon}{f.label}
        </button>
      ))}
      {activeTag && (
        <button type="button" className="chip on" onClick={() => setActiveTag(null)}>
          {tagLabels[activeTag] ?? activeTag} ✕
        </button>
      )}
    </div>

    <div className="events">
      {loading
        ? Array.from({ length: 8 }, (_, i) => <div key={i} className="ev-skeleton"><div className="art" /></div>)
        : visible.map(c => (
          <Link key={c.id} to={c.href} className="ev">
            <div className="art">{c.image && <img src={c.image} alt="" loading="lazy" />}</div>
            <div className="b">
              <span className="t">{c.title}</span>
              <span className="w">{c.when}</span>
              <div className="meta">
                {c.tagSlug && <span className="uni-tag" style={{ '--c': c.tagColor } as React.CSSProperties}>{c.tagLabel}</span>}
                <span className={`stat ${c.status.kind}`}>{c.status.label}</span>
              </div>
            </div>
          </Link>
        ))}
    </div>

    {!loading && cards.length === 0 && (
      <p className="annuaire-empty">
        Aucun événement ne correspond. <button type="button" className="link" onClick={resetFilters}>Tout afficher</button>
      </p>
    )}
  </div>
</section>
```

```tsx
const ANNUAIRE_TITLE: Record<Audience, string> = {
  exposant: 'Les prochaines dates où candidater',
  festivalier: 'Les prochaines sorties',
  organisateur: 'Ces festivals sont déjà référencés',
}
```

- [ ] **Step 3 : Vérifier sur les vraies données**

Run : `pnpm dev`, ouvrir `/?v2=1`.
Attendu : la grille affiche des événements réels avec leurs vraies affiches ; taper « provins » dans la recherche du hero filtre la grille ; la puce « Prend des exposants » réduit à ~15 ; cliquer une carte ouvre `/e/<slug>` **sans demander de connexion**.
Vérification de fuite, obligatoire : dans la console du navigateur,
`[...document.querySelectorAll('.lv2 .ev .t')].length` doit valoir au plus 42, et **aucun** titre ne doit correspondre à un événement privé connu. Recouper avec :

```bash
set -a; . ./.env; set +a
curl -s "$VITE_SUPABASE_URL/rest/v1/events?select=name&is_private=eq.true" -H "apikey: $VITE_SUPABASE_ANON_KEY"
```

Le nom renvoyé par cette commande ne doit apparaître nulle part dans la page.

- [ ] **Step 4 : Commit**

```bash
pnpm version patch --no-git-tag-version
git add src/pages/LandingV2.tsx src/pages/LandingV2.css package.json
git commit -m "feat(landing-v2): grille d'annuaire sur donnees reelles, recherche et filtres"
git push
```

---

## Task 6 : Ce que ça fait, ce que ça coûte, et les deux autres publics

**Files:**
- Modify: `src/pages/LandingV2.tsx`
- Modify: `src/pages/LandingV2.css`

**Interfaces:**
- Consumes: `audience` (Task 4).
- Produces: la section `#gratuit`, l'ancre `#tarifs` réutilisée par la barre de navigation.

Copie : maquette lignes 619‑750, **mot pour mot**. Trois blocs sous la même section, un par audience.

- [ ] **Step 1 : Porter le CSS**

Maquette lignes 149‑203 (`.free-block`, `.free-left`, `.free-price`, `.pro-line`, `.pro-tag`, `.feats`, `.feat`, `.soon`, la requête média 860 px) et 265‑272 (`.two-doors`, `.door`, `.ck`), préfixé `.lv2`.

- [ ] **Step 2 : Écrire le bloc exposant**

Les six avantages (maquette 630‑659), dans l'ordre, avec leurs icônes lucide :

| Titre | Icône | Texte |
|---|---|---|
| Vision d'ensemble | `LayoutGrid` | Toute ton année en un coup d'œil. Prévois tes dates et déniche de nouvelles dates où t'inscrire, facilement. |
| L'esprit de camaraderie | `Users` | Vois où vont tes amis, organisez vos covoiturages, collaborez, et soyez prévenus quand l'un de vous galère. |
| Inscriptions, paiements & rentabilité | `CreditCard` | Suis tes inscriptions, tes paiements et ton bilan. Sache enfin quels festivals valent vraiment le coup. |
| Rappels de deadlines | `Bell` | Ne rate plus jamais une date limite d'inscription. Fellowship te prévient au bon moment. |
| Calendrier intégrable, toujours à jour | `Code` | Affiche ton agenda en direct sur ton site. Relié à Fellowship, il se met à jour tout seul — tu ne le réédites jamais. |
| Postuler en 1 clic *(gélule « Bientôt »)* | `Send` | Vois un festival, clique « Postuler », ton dossier part direct à l'organisateur. |

Puis le bloc gratuit (maquette 662‑681). Le premier item, « Chercher dans 412 événements », devient dynamique : `Chercher dans {publicEvents.length} événements`. Les cinq autres sont repris tels quels.

Puis la ligne Pro (maquette 683‑690), avec l'ancre `id="tarifs"` sur la section pour que la barre puisse y renvoyer, et le lien du bouton vers `/login` (« Voir ce que ça contient » — la page d'abonnement est derrière authentification).

- [ ] **Step 3 : Écrire les blocs festivalier et organisateur**

Reprise exacte des maquettes lignes 693‑719 (festivalier, deux portes « Découvre » / « Suis tes artisans ») et 721‑747 (organisateur, deux portes « Référencez votre festival — gratuitement » / « Recevoir les candidatures · Bientôt »).

Cibles des boutons, dans un monde sans page organisateur dédiée :
- « Créer mon compte gratuit », « Créer mon compte », « Ajouter mon festival » → `/login`
- « Voir un exemple de vitrine » → `/rune-de-chene` *(vitrine publique existante — vérifier le slug avec `curl "$VITE_SUPABASE_URL/rest/v1/entities?select=public_slug&limit=5" -H "apikey: $VITE_SUPABASE_ANON_KEY"` et prendre celui de Runes de Chêne)*
- « Être prévenu au lancement » → ouvre la liste d'attente organisateur existante (`useWaitlist`, déjà utilisée par `Landing.tsx`), rendue sous la porte. **Ne pas** créer un second mécanisme.

- [ ] **Step 4 : Vérifier**

Run : `pnpm dev` → basculer les trois audiences : chaque bloc apparaît seul, aucun résidu de l'audience précédente, aucun bouton mort (cliquer chacun).
Run : `pnpm build && pnpm lint` → verts.

- [ ] **Step 5 : Commit**

```bash
pnpm version patch --no-git-tag-version
git add src/pages/LandingV2.tsx src/pages/LandingV2.css package.json
git commit -m "feat(landing-v2): avantages exposant, bloc gratuit, ligne Pro et portes festivalier/orga"
git push
```

---

## Task 7 : Fait par un exposant, témoignages, dernier appel

**Files:**
- Modify: `src/pages/LandingV2.tsx`
- Modify: `src/pages/LandingV2.css`

**Interfaces:**
- Consumes: `useTestimonials` depuis `@/hooks/use-landing-stats` (existant, lecture anonyme, RLS = actifs seulement), `publicEvents` (Task 5).
- Produces: rien pour les tâches suivantes.

- [ ] **Step 1 : Porter le CSS**

Maquette lignes 194‑201 (`.founder`), 274‑280 (`.quotes`, `.q`), 282‑308 (`.cta-band`), préfixé `.lv2`. **Ne pas porter** `.cta-band .bg` ni `.cta-band .veil` : ils servaient l'illustration dessinée, qui est bannie. La bande garde son dégradé d'accent seul.

- [ ] **Step 2 : Le bloc fondateur**

Reprise exacte de la maquette lignes 754‑763 (« Fait par un exposant, pour des exposants. », les deux paragraphes, la signature « Uriel · Runes de Chêne · exposant »).

⚠️ Ce texte est marqué « à valider par Uriel » dans le statut de session. **Le porter tel quel** ; toute réécriture est un aller-retour avec lui, pas une décision d'implémentation.

- [ ] **Step 3 : Les témoignages, sur la base**

La maquette montre trois emplacements réservés. Les vrais témoignages existent déjà en base et sont déjà lus en anonyme par `useTestimonials()`. On rend la section **seulement s'il y en a**, plutôt que d'afficher des cartes « Exemple d'affichage » en production :

```tsx
const { testimonials } = useTestimonials()

{testimonials.length > 0 && (
  <section>
    <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div className="l" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <p className="eyebrow"><ScrollText aria-hidden="true" />Ils y sont déjà</p>
        <h2>Ils en parlent mieux que nous.</h2>
      </div>
      <div className="quotes">
        {testimonials.map(t => {
          const initials = (t.name ?? '?').trim().charAt(0).toUpperCase()
          const card = (
            <div className="q">
              <div className="q-head">
                {t.resolvedAvatar
                  ? <img className="q-av" src={t.resolvedAvatar} alt="" />
                  : <span className="q-av">{initials}</span>}
                <div><div className="q-n">{t.name}</div><div className="q-c">{t.craft}</div></div>
              </div>
              <blockquote>« {t.quote} »</blockquote>
            </div>
          )
          return t.resolvedSlug
            ? <Link key={t.id} to={`/${t.resolvedSlug}`} className="q-link">{card}</Link>
            : <div key={t.id}>{card}</div>
        })}
      </div>
    </div>
  </section>
)}
```

Ajouter au CSS : `.lv2 .q-link { text-decoration: none; color: inherit; display: block; }` et `.lv2 img.q-av { object-fit: cover; }`.

- [ ] **Step 4 : La bande de dernier appel**

Maquette lignes 781‑791, avec le sous-titre branché sur les vrais nombres :

```tsx
<p className="sub">
  {publicEvents.length} événements à venir, {withApplications} qui prennent des exposants.
  Le compte est gratuit et se crée en trente secondes.
</p>
```

Les deux boutons : « Créer mon compte » → `/login` ; « Parcourir l'annuaire » → `#annuaire`.

- [ ] **Step 5 : Vérifier**

Run : `pnpm dev` → la section témoignages apparaît avec les vrais témoignages de la base (les mêmes que sur la landing actuelle) ; cliquer une tête ouvre la vitrine correspondante ; la bande de dernier appel affiche les vrais nombres, pas 412.

- [ ] **Step 6 : Commit**

```bash
pnpm version patch --no-git-tag-version
git add src/pages/LandingV2.tsx src/pages/LandingV2.css package.json
git commit -m "feat(landing-v2): bloc fondateur, temoignages en base, bande de dernier appel"
git push
```

---

## Task 8 : Le pied de page

**Files:**
- Modify: `src/pages/LandingV2.tsx`
- Modify: `src/pages/LandingV2.css`

**Interfaces:**
- Consumes: `setActiveTag` (Task 5), `publicEvents`.
- Produces: rien.

**Écart assumé avec la maquette :** trois colonnes au lieu de quatre. « Par région » n'est pas livrée — la colonne `department` est trop sale en base pour produire des liens honnêtes (relevé : `84`, `Ille-et-villaine (35)`, `Puy-de-Dôme`, `Drôme ` avec espace, `76610`). La grille passe à `1.6fr 1fr 1fr`.

**Deuxième écart, dans le bon sens :** la colonne « Par univers » de la maquette pointait sur `#`. Ici, chaque univers **filtre réellement** la grille de l'annuaire et y ramène le visiteur. Ne sont listés que les univers qui ont au moins un événement à venir : une porte qui ouvre sur du vide est pire que pas de porte.

- [ ] **Step 1 : Porter le CSS**

Maquette lignes 310‑361, préfixé `.lv2`, avec la grille corrigée :

```css
.lv2 .foot-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 44px; padding-bottom: 48px; }
@media (max-width: 900px) { .lv2 .foot-grid { grid-template-columns: 1fr 1fr; gap: 34px; } }
@media (max-width: 560px) { .lv2 .foot-grid { grid-template-columns: 1fr; } }
```

Le logotype géant `.foot-mark` est porté tel quel (dégradé sur le texte, `background-clip: text`).

- [ ] **Step 2 : Écrire le pied de page**

```tsx
const universes = useMemo(() => {
  const counts = new Map<string, number>()
  for (const e of publicEvents) {
    const slug = e.tags?.[0]
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([slug]) => slug)
}, [publicEvents])

function filterByUniverse(slug: string) {
  setActiveTag(slug)
  document.getElementById('annuaire')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
```

Structure : `.foot-mark` (« Fellowship. »), puis `.foot-grid` avec
1. `.foot-brand` — la phrase de la maquette (ligne 800) et l'encart « Édité par Runes de Chêne » (lignes 801‑804) ;
2. « Par univers » — les universes ci-dessus, chacun un `<button className="link">` avec sa pastille `<i style={{ '--c': getTagLandingColor(slug) }} />` et son libellé `tagLabels[slug]` ;
3. « Fellowship » — `L'annuaire` → `#annuaire`, `Pour les exposants` → `#gratuit`, `Ajouter un événement` → `/login`, `Nous écrire` → `mailto:appfellowship@pm.me`.

Puis `.foot-bar` : `© 2026 Fellowship · flw.sh` et les liens légaux **vers les vraies routes existantes** — les relever avant d'écrire :

```bash
ls src/pages/legal/ && grep -n "legal\|mentions\|cgu\|cgv\|confidentialite\|charte" src/App.tsx
```

Utiliser exactement ces chemins. Aucun `href="#"` ne doit subsister dans le pied de page livré.

- [ ] **Step 3 : Vérifier**

Run : `pnpm dev` → cliquer chaque univers : la grille se filtre et la page remonte à l'annuaire ; cliquer chaque lien légal : la vraie page s'ouvre.
Vérification anti-lien-mort : dans la console,
`[...document.querySelectorAll('.lv2 a[href="#"], .lv2 a:not([href])')].length` doit valoir **0**.

- [ ] **Step 4 : Commit**

```bash
pnpm version patch --no-git-tag-version
git add src/pages/LandingV2.tsx src/pages/LandingV2.css package.json
git commit -m "feat(landing-v2): pied de page, univers filtrants et liens legaux reels"
git push
```

---

## Task 9 : Finition — mobile, accessibilité, preuve visuelle

**Files:**
- Modify: `src/pages/LandingV2.css`
- Modify: `src/pages/LandingV2.tsx`
- Create: `docs/decisions/assets/v2-landing-integree-jour.png`
- Create: `docs/decisions/assets/v2-landing-integree-nuit.png`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: les captures de recette, jointes au commit.

- [ ] **Step 1 : Passer le mobile au crible**

Run : `pnpm dev`, ouvrir `/?v2=1`, mettre la fenêtre à 360 px, puis 390 px, puis 768 px.
Corriger dans `LandingV2.css` tout ce qui déborde. Points de contrôle :
- le sélecteur d'audience passe à la ligne sans casser (`flex-wrap: wrap` déjà posé) ;
- `.search-big` ne déborde pas (`min-width: 0` sur l'`input` — indispensable en flex) ;
- `.free-block` passe à une colonne sous 860 px ;
- `.foot-grid` passe à une colonne sous 560 px ;
- **aucun scroll horizontal** : `document.documentElement.scrollWidth <= window.innerWidth` doit être vrai à chaque largeur.

- [ ] **Step 2 : Accessibilité**

- Chaque `<button>` d'audience porte `aria-pressed`, chaque puce de filtre aussi.
- L'`<input>` de recherche porte un `aria-label`.
- Le bandeau des univers est décoratif : `aria-hidden="true"` sur `.marquee` (déjà posé) — donc **aucun** élément interactif à l'intérieur.
- Les images d'événement ont `alt=""` (le titre est juste à côté, une répétition est du bruit pour un lecteur d'écran).
- Vérifier au clavier : `Tab` traverse barre → audience → recherche → filtres → cartes → pied de page, avec un anneau de focus visible partout (`:focus-visible` posé sur `.btn` ; l'ajouter aussi sur `.lv2 .chip` et `.lv2 .ev`).
- Contraste : l'encre secondaire `#8C7B72` sur parchemin `#F4EEE1` donne ≈ 3,4:1 — **suffisant pour du texte de 19 px et plus, insuffisant en dessous**. Vérifier qu'aucun texte en `--ink-faint` ne descend sous 14 px porteur d'information ; les mentions décoratives peuvent rester.

- [ ] **Step 3 : Capturer la preuve, jour et nuit**

Capture anonyme via Edge headless (méthode maison, déjà utilisée sur ce projet) :

```bash
node -e "
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const [theme, file] of [['day','jour'],['night','nuit']]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    await p.addInitScript(t => localStorage.setItem('flwsh-theme', t), theme);
    await p.goto('http://localhost:5173/?v2=1', { waitUntil: 'networkidle' });
    await p.screenshot({ path: 'docs/decisions/assets/v2-landing-integree-' + file + '.png', fullPage: true });
    await p.close();
  }
  await b.close();
})();
"
```

Regarder les deux images. Pièges connus à chercher explicitement :
- un **trait blanc** sur un bord en mode nuit (liseré `inset` écrit en dur) ;
- une **couture** : un halo ou un grain qui s'arrête avant le bord du fond ;
- un **rectangle sombre** au milieu du parchemin (le bug corrigé de la V1) ;
- un `#fff` en dur qui traverse le thème.

- [ ] **Step 4 : Vérification finale**

Run : `pnpm build && pnpm lint && pnpm test`
Attendu : build sans erreur TypeScript, 0 erreur ESLint, tous les tests verts.
Run : `git diff --stat HEAD~8 -- src/pages/Landing.tsx src/pages/Landing.css src/index.css`
Attendu : **aucune ligne modifiée**. Si ce n'est pas le cas, la contrainte 1 a été violée — annuler ces changements avant de livrer.

- [ ] **Step 5 : Commit**

```bash
pnpm version patch --no-git-tag-version
git add src/pages/LandingV2.css src/pages/LandingV2.tsx docs/decisions/assets/v2-landing-integree-*.png package.json
git commit -m "feat(landing-v2): finition mobile, accessibilite et captures de recette"
git push
```

---

## Ce que ce plan ne fait pas

À dire à Uriel, pas à découvrir en route :

1. **Le prérendu / SSG n'est pas fait.** L'annuaire reste une SPA React : Google l'indexera mal. C'est le coût caché n° 1 identifié dans la décision 0006, et c'est un chantier à part entière (Vite SSG ou prerender Netlify + balises `<meta>` par événement).
2. **La lecture anonyme de `events` n'est pas refermée.** Elle expose aujourd'hui les événements privés à qui interroge l'API directement (1 en base). Ce plan ne les *liste* pas, mais ne corrige pas la surface. Chantier DB séparé, à arbitrer.
3. **La colonne « Par région »** attend la normalisation des départements.
4. **La bascule V2 → défaut** n'est pas faite : l'interrupteur reste éteint pour tout le monde tant qu'Uriel n'a pas vu la page et dit oui.
5. **La police Cabin** n'est pas embarquée — décision 0007 la veut « seule, dans un second temps, pour mesurer son effet ».
6. **La DA de l'app** (Cockpit, Calendrier, Explorer…) n'est pas touchée : c'est le chantier suivant dans l'ordre de fusion de la décision 0007.
