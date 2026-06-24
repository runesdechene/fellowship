# Explorer — refonte bespoke DA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer Explorer en **catalogue de découverte épuré** en DA « sci-fi chaud » : grille seule (coverflow endormi), carte-festival **image + corps verre** (option B v2), barre Quoi/Où/Quand re-skinnée, statuts unifiés `--status-*`, mort aux emojis/hex.

**Architecture :** Page React (`Explorer.tsx`) qui compose un haut de page (h1 + sous-titre + compteur) + `SearchSegments` (filtres) + `EventGrid` (grille de `EventGridCard`). Le coverflow (`EventDeck`/`DeckCard`/`ScrubBar`/`EventDock`/`ViewToggle`) est **débranché mais conservé** dans le repo. Données via hooks existants, aucune nouvelle RPC.

**Tech Stack :** React 19 + TS, Tailwind v4 (CSS-first), CSS scopé `.explorer` dans `Explorer.css`, primitives DA globales dans `index.css`, icônes `lucide-react`.

## Global Constraints

- **Ne PAS toucher** `--copper` / `--primary` / `--page-backdrop` (Landing/vitrine festives) ni `--glass` **global** (casse le Cockpit). Utiliser les tokens DA app : `--app-bg`, `--accent-app`, `--accent-app-ink`, `--name`, `--faint`, `--hair`, `--field`, `--status-*`, et les primitives `.glass-card` / `.da-dot` / `.da-eyebrow`.
- **Scroll de page unique** — jamais de scroll interne imbriqué.
- **Cadrage affiche = `object-fit: cover`** (V1 ; `contain` différé).
- **Pièges jour/nuit DA** : `.explorer svg { fill:none; stroke:currentColor }` (déjà en place) ; aucun `#fff` en dur pour du texte sur surface (OK sur photo/badge) ; ombres `.light` douces ; vérifier `dist` (`hsl(#` doit être vide).
- **Explorer reste gratuit** : aucun teaser Pro.
- **Perf grille** : pas de `backdrop-filter` blur lourd répété par carte (artefacts compositing + coût scroll sur N cartes — cf. leçon Calendrier). Surfaces verre = alpha + hairline, sans blur sur la carte elle-même.
- **Contrainte test (stack)** : `render()` RTL ne flush pas en synchrone sur cette stack → **pas de nouveaux tests de composants** ; on garde les **tests de fonctions pures** Vitest (inchangés) et on vérifie l'UI par **build + lint + check dist + revue visuelle** (dev server). Voir `reference_react_test_infra`.
- **Auto-commit + bump version** : `package.json` `version` (actuel `0.7.310`) bumpé en patch dans la dernière tâche.

---

### Task 1 : Carte-festival B v2 (`EventGridCard` + styles `.egrid-*`)

Le cœur visuel. On remplace la carte « affiche plein cadre + overlay » par **image en haut (jamais recouverte) + corps verre** : titre + étoile sur la même ligne, méta date·ville en **icônes au trait** (lucide), pied = **statut `.da-dot`** OU compagnons OU « À découvrir ». Fallback sans image = surface chaude DA + emoji catégorie en filigrane.

**Files:**
- Modify: `src/components/explorer/EventGridCard.tsx` (réécriture complète du composant)
- Modify: `src/pages/Explorer.css` (remplacer le bloc carte grille `.egrid-card` → `.egrid-corner`, lignes ~1263–1368)
- Test: `src/lib/explorer.test.ts` (existant — `participationChip`/`participationDot` déjà couverts ; ne rien casser)

**Interfaces:**
- Consumes : `participationDot(status, payment, kind, ctx?) → { colorVar: string; label: string } | null` et `participationChip(...) → { label; variant } | null` (déjà dans `src/lib/explorer.ts`) ; `eventBadge(event, now) → 'nouveau' | 'populaire' | null` ; `formatEventDateRange(start, end) → string` ; `getTagEmoji(slug) → string` (`@/components/ui/TagBadge`).
- Produces : `EventGridCard` (mêmes props qu'aujourd'hui — signature inchangée, consommée par `EventGrid`).

- [ ] **Step 1 : Réécrire `EventGridCard.tsx`**

```tsx
import { Star, Calendar, MapPin } from 'lucide-react'
import { getTagEmoji } from '@/components/ui/TagBadge'
import { eventBadge, participationChip, participationDot, formatEventDateRange, type ActorKind } from '@/lib/explorer'
import type { PartLite } from './EventDeck'
import type { FriendAvatar } from '@/lib/map-data'
import type { EventWithScore } from '@/types/database'

interface EventGridCardProps {
  event: EventWithScore
  now: Date
  part?: PartLite
  actorKind: ActorKind
  friends: FriendAvatar[]
  saved: boolean
  onToggleSave: (event: EventWithScore) => void
  onClick: (event: EventWithScore) => void
}

export function EventGridCard({ event, now, part, actorKind, friends, saved, onToggleSave, onClick }: EventGridCardProps) {
  const tag = event.tags?.[0] ?? 'autre'
  const badge = eventBadge(event, now)
  const isPast = new Date(event.end_date) < now
  const chip = participationChip(part?.status, part?.payment_status, actorKind, { isPast })
  // « Repéré » est déjà signalé par l'étoile pleine → le pied n'affiche le point de statut
  // que pour les autres états (Inscrit, Dossier, À payer…).
  const showStatus = !!chip && chip.variant !== 'repere'
  const dot = showStatus ? participationDot(part?.status, part?.payment_status, actorKind, { isPast }) : null
  // Pas de participation → carte atténuée (désat. + transp.) pour faire ressortir les dates engagées.
  const muted = !part
  const shown = friends.slice(0, 4)
  const friendsLabel = friends.length === 1 ? `${friends[0].label} y va` : `${friends.length} compagnons y vont`

  return (
    <div className={'egrid-card' + (muted ? ' egrid-card--muted' : '')} onClick={() => onClick(event)}>
      <div className="egrid-img">
        {event.image_url
          ? <img className="egrid-imgel" src={event.image_url} alt={event.name} loading="lazy" />
          : (
            <div className="egrid-img--empty" aria-hidden="true">
              <span className="egrid-img-emoji">{getTagEmoji(tag)}</span>
            </div>
          )}
        <div className="egrid-imgfade" aria-hidden="true" />
        {badge && (
          <span className={'egrid-badge ' + badge}>
            <span className="egrid-badge-dot" aria-hidden="true" />
            {badge === 'nouveau' ? 'Nouveau' : 'Populaire'}
          </span>
        )}
      </div>

      <div className="egrid-body">
        <div className="egrid-titlerow">
          <div className="egrid-name">{event.name}</div>
          <button
            type="button"
            className={'egrid-star' + (saved ? ' on' : '')}
            aria-label={saved ? 'Ne plus repérer' : 'Repérer'}
            aria-pressed={saved}
            onClick={(e) => { e.stopPropagation(); onToggleSave(event) }}
          >
            <Star size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="egrid-meta">
          <span className="egrid-meta-item"><Calendar size={12} /><b>{formatEventDateRange(event.start_date, event.end_date)}</b></span>
          <span className="egrid-meta-item"><MapPin size={12} /><b>{event.city}</b></span>
        </div>

        <div className="egrid-foot">
          {dot ? (
            <span className="egrid-status">
              <span className="da-dot" style={{ '--dot-color': dot.colorVar } as React.CSSProperties} />
              {dot.label}
            </span>
          ) : friends.length > 0 ? (
            <div className="egrid-friends">
              {shown.length > 0 && (
                <span className="egrid-avs">
                  {shown.map((f, i) => (
                    <span
                      key={i}
                      className="egrid-av"
                      style={f.avatarUrl ? { backgroundImage: `url(${JSON.stringify(f.avatarUrl)})` } : undefined}
                    >
                      {!f.avatarUrl && (f.label.trim()[0] ?? '?').toUpperCase()}
                    </span>
                  ))}
                </span>
              )}
              <span className="egrid-fcount">{friendsLabel}</span>
            </div>
          ) : (
            <span className="egrid-foot-empty">À découvrir</span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Remplacer le bloc CSS carte grille dans `Explorer.css`**

Repérer le bloc qui commence par `/* ── Carte grille (affiche pleine + overlay) ── */` et **remplacer** toutes les règles `.egrid-card` → `.egrid-corner` (jusqu'avant `/* ── Grille : conteneur … */`) par :

```css
/* ── Carte grille B v2 (image + corps verre DA) ───────────────────── */
.explorer .egrid-card {
  display: flex;
  flex-direction: column;
  border-radius: 15px;
  overflow: hidden;
  cursor: pointer;
  background: var(--field);
  border: 1px solid var(--hair);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.42);
  transition: transform 0.14s, border-color 0.15s;
}
.explorer .egrid-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--accent-app) 50%, transparent); }
.light .explorer .egrid-card { box-shadow: 0 8px 20px rgba(60, 45, 35, 0.12); }
/* Sans participation : désaturée + transparente (revient au survol). */
.explorer .egrid-card--muted { filter: saturate(0.62); opacity: 0.78; }
.explorer .egrid-card--muted:hover { filter: none; opacity: 1; }

/* Zone affiche (cover, jamais recouverte par le texte). */
.explorer .egrid-img { position: relative; aspect-ratio: 4 / 5; overflow: hidden; background: #0d0a08; }
.explorer .egrid-imgel { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.explorer .egrid-imgfade { position: absolute; inset: 0; background: linear-gradient(transparent 72%, rgba(10, 7, 5, 0.3)); }

/* Fallback sans affiche : surface chaude DA + emoji catégorie en filigrane monochrome. */
.explorer .egrid-img--empty {
  position: absolute; inset: 0; display: grid; place-items: center;
  background:
    radial-gradient(80% 55% at 50% 16%, color-mix(in srgb, var(--accent-app) 26%, transparent), transparent 62%),
    var(--app-bg);
}
.explorer .egrid-img-emoji {
  font-size: clamp(44px, 7vw, 74px); line-height: 1;
  color: transparent; text-shadow: 0 0 0 #fff; opacity: 0.16;
}

/* Badge Nouveau / Populaire — gélule verre DA, coin haut-gauche. */
.explorer .egrid-badge {
  position: absolute; top: 10px; left: 10px; z-index: 3;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 99px;
  font-size: 10.5px; font-weight: 600; white-space: nowrap;
  background: rgba(20, 14, 11, 0.55); border: 1px solid var(--hair); color: var(--name);
  backdrop-filter: blur(6px);
}
.explorer .egrid-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-app); }
.light .explorer .egrid-badge { background: rgba(248, 242, 232, 0.72); color: var(--name); }

/* Corps verre. */
.explorer .egrid-body { padding: 11px 13px 13px; display: flex; flex-direction: column; gap: 6px; }
.explorer .egrid-titlerow { display: flex; align-items: flex-start; gap: 8px; }
.explorer .egrid-name {
  flex: 1; min-width: 0;
  font-family: var(--font-heading); font-weight: 600; font-size: 14.5px; line-height: 1.25;
  color: var(--name); text-transform: capitalize;
}

/* Étoile « Repérer » sur la ligne du titre (à droite). */
.explorer .egrid-star {
  flex: none; width: 30px; height: 30px; border-radius: 9px; margin: -2px -2px 0 0;
  display: grid; place-items: center; cursor: pointer;
  background: transparent; border: 1px solid var(--hair); color: hsl(var(--muted-foreground));
  transition: 0.15s;
}
.explorer .egrid-star:hover { border-color: var(--accent-app); background: color-mix(in srgb, var(--accent-app) 10%, transparent); }
.explorer .egrid-star svg { width: 16px; height: 16px; }
.explorer .egrid-star.on {
  border-color: color-mix(in srgb, var(--accent-app) 50%, transparent);
  background: color-mix(in srgb, var(--accent-app) 14%, transparent);
  color: var(--accent-app);
}
/* L'étoile pleine quand repérée (override la baseline .explorer svg { fill:none }). */
.explorer .egrid-star.on svg { fill: currentColor; }

/* Méta date · ville — icônes au trait. */
.explorer .egrid-meta { display: flex; gap: 12px; flex-wrap: wrap; color: hsl(var(--muted-foreground)); font-size: 11.5px; }
.explorer .egrid-meta-item { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
.explorer .egrid-meta-item svg { width: 12px; height: 12px; opacity: 0.85; flex: none; }
.explorer .egrid-meta-item b { font-family: var(--font-heading); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Pied : statut .da-dot OU compagnons OU « À découvrir ». */
.explorer .egrid-foot { margin-top: 3px; padding-top: 9px; border-top: 1px solid var(--hair); min-height: 21px; display: flex; align-items: center; }
.explorer .egrid-status { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 11.5px; color: hsl(var(--foreground)); }
.explorer .egrid-foot-empty { font-family: var(--font-mono); font-size: 11px; color: var(--faint); }

.explorer .egrid-friends { display: flex; align-items: center; gap: 8px; min-width: 0; }
.explorer .egrid-avs { display: flex; flex: none; }
.explorer .egrid-av {
  width: 20px; height: 20px; border-radius: 50%; flex: none;
  border: 2px solid #1d1a18; margin-left: -7px;
  background: #2a1c16 center / cover;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700; color: var(--name);
}
.explorer .egrid-av:first-child { margin-left: 0; }
.light .explorer .egrid-av { border-color: #efe6d8; }
.explorer .egrid-fcount { color: hsl(var(--muted-foreground)); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

- [ ] **Step 3 : Build + lint**

Run : `pnpm build && pnpm lint`
Expected : build OK (aucune erreur TS — `getTagLandingColor` n'est plus importé dans ce fichier ; vérifier qu'aucune autre référence ne casse), lint clean.

- [ ] **Step 4 : Revue visuelle (dev server)**

Run : `pnpm dev` puis ouvrir `/explorer`.
Vérifier : affiche en haut non recouverte, étoile à droite du titre (contour terracotta quand repérée), méta avec icônes calendrier/épingle, pied avec point de statut coloré OU pile d'avatars OU « À découvrir », fallback sans image (gradient chaud + emoji filigrane), carte atténuée si non participant. Tester jour ET nuit.

- [ ] **Step 5 : Commit**

```bash
git add src/components/explorer/EventGridCard.tsx src/pages/Explorer.css
git commit -m "feat(explorer): carte-festival B v2 (image + corps verre DA, statut da-dot)"
```

---

### Task 2 : Page en grille seule — `Explorer.tsx` (débranche coverflow, header, compteur unifié)

On retire de la page tout le coverflow (`ViewToggle`, `EventDeck`, `EventDock`, `ScrubBar`, state slideshow, clavier, halos, bottombar slideshow) et on ajoute un **haut de page** (`h1` + sous-titre + compteur unique). Les fichiers coverflow restent dans le repo (TODO suppression).

**Files:**
- Modify: `src/pages/Explorer.tsx` (réécriture du rendu + suppression du state slideshow)
- Modify: `src/components/explorer/EventGrid.tsx` (retirer le compteur interne `egrid-count`)

**Interfaces:**
- Consumes : hooks existants `useEvents`, `useTags`, `useMyParticipations`, `useFriendsByEvent`, `composeFilter`, quota (`countActiveDates`/`canAddDate`/`planForActor`), `DateQuotaModal`, `SearchSegments`, `EventGrid`, `eventPath`.
- Produces : `ExplorerPage` (route `/explorer`, props inchangées côté routeur).

- [ ] **Step 1 : Réécrire le corps de `Explorer.tsx`**

Garder en l'état : imports/hook `useAuth`, `useEvents`, `useTags`, `useMyParticipations` ; tout le bloc **filtres persistés** (`stored`, `selectedTags`, `zone`, `periodChoice`, `period`, `query`, `monthFilter`/`monthRange`/`monthLabel`) ; `displayed = composeFilter(...)` ; `toggleTag`/`handleZone`/`handlePeriod`/`handleQuery` ; `isSaved`/`toggleSave` (quota inclus) ; le bloc **add-image** (`fileInputRef`, `onAddImage`, `handleFileChange`, `canAddImage`) ; `partByEvent`/`actorKind` ; `showQuotaModal`.

**Supprimer** : `viewMode`/`changeView`/`readExplorerView`/`writeExplorerView`, `activeIndex`/`safeIndex`/`scrubbing`/`focusEventId`, le `useEffect` clavier ←/→, `go`, `haloAccent`/`activeTagInfo`/`currentEvent`, `counterContent`, et les imports devenus inutiles (`EventDeck`, `ViewToggle`, `ScrubBar`, `EventDock`, `getTagLandingColor`, `Link`, `useEffect`, `useRef` si plus utilisé — **garder `useRef`** pour `fileInputRef`).

`friendsByEvent` : toujours chargé en grille → `const friendsByEvent = useFriendsByEvent(true)`.

Remplacer le `return (...)` par :

```tsx
  return (
    {/* TODO(coverflow): EventDeck/DeckCard/ScrubBar/EventDock/ViewToggle sont conservés
        mais débranchés (slideshow en sommeil). À SUPPRIMER après déploiement & test de la
        refonte grille (cf. spec 2026-06-24-explorer-da-refonte). */}
    <div className="explorer">
      {/* Hidden file input for add-image */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      <div className="stagewrap">
        <header className="xplr-head">
          <h1 className="xplr-title">Explorer</h1>
          <p className="xplr-sub">Découvre les festivals et repère tes prochaines dates.</p>
        </header>

        <SearchSegments
          tags={dynamicTags}
          selectedTags={selectedTags}
          zone={zone}
          period={period}
          monthLabel={monthLabel}
          query={query}
          userDept={person?.department ?? null}
          onToggleTag={toggleTag}
          onZone={handleZone}
          onPeriod={handlePeriod}
          onQuery={handleQuery}
        />

        <div className="xplr-count">
          {displayed.length} festival{displayed.length !== 1 ? 's' : ''} trouvé{displayed.length !== 1 ? 's' : ''}
        </div>

        {loading ? (
          <GridSkeleton />
        ) : displayed.length === 0 ? (
          <ExplorerEmpty />
        ) : (
          <EventGrid
            events={displayed}
            now={now}
            partByEvent={partByEvent}
            actorKind={actorKind}
            friendsByEvent={friendsByEvent}
            isSaved={isSaved}
            onToggleSave={toggleSave}
            onCardClick={ev => navigate(eventPath(ev))}
          />
        )}
      </div>
      {showQuotaModal && <DateQuotaModal onClose={() => setShowQuotaModal(false)} />}
    </div>
  )
```

Note JSX : le commentaire `{/* … */}` ne peut pas précéder l'élément racine retourné — le placer **à l'intérieur** ou juste avant le `return` sous forme de `//` commentaire. Mettre le TODO en commentaire `//` au-dessus du `return`.

- [ ] **Step 2 : Remplacer le skeleton par une version grille**

Remplacer `DeckSkeleton` par `GridSkeleton` (cartes fantômes en grille) :

```tsx
function GridSkeleton() {
  return (
    <div className="egrid-wrap">
      <div className="egrid">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="egrid-card egrid-skel" aria-hidden="true">
            <div className="egrid-img egrid-skel-img" />
            <div className="egrid-body">
              <div className="egrid-skel-line" style={{ width: '70%' }} />
              <div className="egrid-skel-line" style={{ width: '45%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

(Styles `.egrid-skel*` ajoutés en Task 3.)

- [ ] **Step 3 : `EventGrid.tsx` — retirer le compteur interne**

Supprimer le `<div className="egrid-count">…</div>` (le compteur vit désormais dans `Explorer.tsx`). Le composant ne rend plus que `<div className="egrid-wrap"><div className="egrid">…cards…</div></div>`.

- [ ] **Step 4 : Build + lint**

Run : `pnpm build && pnpm lint`
Expected : aucune erreur TS (vérifier qu'aucun symbole supprimé n'est encore référencé ; imports inutilisés retirés). La page `/explorer` rend la grille seule.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/Explorer.tsx src/components/explorer/EventGrid.tsx
git commit -m "feat(explorer): grille seule + haut de page (h1/sous-titre/compteur), coverflow debranche"
```

---

### Task 3 : Re-skin DA — barre de recherche, chrome de page, états, fond

Migrer le CSS de la page (hors carte, faite en Task 1) vers les tokens DA : barre Quoi/Où/Quand + popovers en verre DA, haut de page, états (skeleton/vide), fond `--app-bg`, retrait des halos, layout grille devenu la base (plus de dualité `is-grid`). Re-skin `SearchSegments` chips.

**Files:**
- Modify: `src/pages/Explorer.css` (sections root/halos/top/searchbar/seg/pop/catchip/peropt/empty/responsive + nouvelles règles header/compteur/skeleton)
- Modify: `src/components/explorer/SearchSegments.tsx` (chip catégories : retirer la couleur hex inline `getTagLandingColor`)

**Interfaces:**
- Consumes : tokens DA globaux (`index.css`). Aucune nouvelle API.
- Produces : styles scopés `.explorer` (classes `.xplr-head`/`.xplr-title`/`.xplr-sub`/`.xplr-count`/`.egrid-skel*`).

- [ ] **Step 1 : Root, fond, halos, layout grille = base**

Dans `Explorer.css`, section Root : la page n'est plus plein écran slideshow. Remplacer :

```css
.explorer {
  position: relative;
  min-height: 100dvh;
  background: var(--app-bg);
  background-attachment: fixed;
}
/* Supprimer .light .explorer { background:#f1ebe1 } (géré par --app-bg jour). */
```

**Supprimer** entièrement le bloc halos `.explorer .xhalos`/`.xb`/`.xb1..4` (jour et nuit) — plus de halo dynamique en grille. **Supprimer** aussi le bloc `.explorer.is-grid { … }` (la grille est la base ; ses règles deviennent le défaut : `height:auto`, scroll page). Retirer toute référence `is-grid` restante.

`.stagewrap` : simplifier — `display:block; height:auto; max-width: 1280px; margin: 0 auto; padding: 0 20px;` (le haut de page et la grille s'empilent en flux normal, scroll de page).

- [ ] **Step 2 : Haut de page + compteur**

Ajouter :

```css
.explorer .xplr-head { padding: 26px 2px 14px; }
.explorer .xplr-title { font-family: var(--font-heading); font-size: 26px; font-weight: 650; color: hsl(var(--foreground)); line-height: 1.1; }
.explorer .xplr-sub { margin-top: 4px; color: hsl(var(--muted-foreground)); font-size: 14px; }
.explorer .xplr-count { color: hsl(var(--muted-foreground)); font-size: 13px; font-weight: 600; padding: 4px 2px 14px; }
```

- [ ] **Step 3 : Barre de recherche + popovers → verre DA**

Remplacer les valeurs des sélecteurs existants (garder la structure) :
- `.explorer .searchbar` : `background: var(--field); border: 1px solid var(--hair); box-shadow: 0 12px 30px rgba(0,0,0,.32);` (retirer `hsl(var(--card))`). Garder `border-radius:99px`.
- `.explorer .seg-l` : `color: var(--accent-app);` (remplace `var(--amber)`).
- `.explorer .seg-v` : `color: hsl(var(--foreground));` (inchangé).
- `.explorer .seg-sep` : `background: var(--hair);`.
- `.explorer .seg-search` : `background: var(--accent-app); color: var(--accent-app-ink);` (remplace le dégradé copper).
- `.explorer .seg:hover` / `.seg.active` : remplacer `rgba(255,255,255,.14/.2)` par `color-mix(in srgb, var(--accent-app) 10%/16%, transparent)`.
- `.explorer .seg-search-ico` : `color: var(--accent-app);`.
- `.explorer .pop` : `background: hsl(var(--card)); border: 1px solid var(--hair);` → préférer `background: var(--app-bg); border:1px solid var(--hair); backdrop-filter: blur(12px);` pour le verre DA. Garder `max-height:70vh; overflow-y:auto` (popover interne, exception légitime — pas la page).
- `.explorer .pop h4` : `color: hsl(var(--muted-foreground));` (inchangé) — peut passer `.da-eyebrow` visuellement, garder.
- `.explorer .catchip` : retirer le `currentColor` hex ; neutre DA : `background: var(--field); border: 1px solid var(--hair);` ; hover `border-color: var(--accent-app);` ; `.on` → `background: color-mix(in srgb, var(--accent-app) 18%, transparent); border-color: var(--accent-app); color: hsl(var(--foreground));`.
- `.explorer .peropt` : `background: var(--field); border:1px solid var(--hair); color: hsl(var(--foreground));` ; hover `border-color: var(--accent-app);` ; `.on` → `background: color-mix(in srgb, var(--accent-app) 18%, transparent); border-color: var(--accent-app); color: var(--accent-app);`.
- `.explorer .seg-clear` : fond `var(--field)`, hover `color-mix(in srgb, var(--accent-app) 12%, transparent)`.

- [ ] **Step 4 : `SearchSegments.tsx` — chip catégorie sans hex**

Dans le popover « quoi », retirer `style={{ color: getTagLandingColor(t.value) }}` du `.catchip` et l'import `getTagLandingColor` s'il devient inutile. Garder `getTagEmoji` (emoji catégorie dans le chip = légitime, registre marque). Le chip prend la teinte DA via le CSS (Step 3).

- [ ] **Step 5 : États (skeleton + vide) DA**

`.explorer .explorer-empty-coverflow` → renommer en `.explorer-empty` (ou garder la classe) mais le rendre **en flux** (plus `position:absolute; inset:0`) : `display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; padding:60px 24px;`. `.explorer-empty-icon` `font-size:44px; opacity:.8`. Texte en `hsl(var(--foreground))` / `hsl(var(--muted-foreground))` (inchangé). Si la classe est renommée, mettre à jour `ExplorerEmpty` dans `Explorer.tsx`.

Ajouter le skeleton grille :

```css
.explorer .egrid-skel { pointer-events: none; }
.explorer .egrid-skel-img { background: var(--field); }
.explorer .egrid-skel-line { height: 9px; border-radius: 5px; background: var(--field); }
.explorer .egrid-skel-img, .explorer .egrid-skel-line { animation: xplr-pulse 1.5s ease-in-out infinite; }
@keyframes xplr-pulse { 0%,100% { opacity: .5 } 50% { opacity: .85 } }
@media (prefers-reduced-motion: reduce) { .explorer .egrid-skel-img, .explorer .egrid-skel-line { animation: none } }
```

- [ ] **Step 6 : Responsive — nettoyer le mobile slideshow**

Dans les media-queries, **supprimer** les règles propres au coverflow (`.flow`, `.deck`, `.card …`, `.arrow`, `.dockinfo`, `.bottombar`, `.scrubber`, `.view-toggle`, `.counter--top/--bottom`, `.eh-*`) qui ne sont plus rendues. **Garder/ajuster** : `.searchbar`/`.seg*` compacts mobile, `.egrid-wrap` padding, et la grille responsive `.egrid` (container queries 5→4→3→2 colonnes — conserver). Le bloc `.egrid` mobile (aspect-ratio 9/16, meta 2 lignes) : garder mais ré-accorder à la carte B v2 (l'aspect-ratio s'applique à `.egrid-img` désormais, pas à `.egrid-card`). Vérifier qu'aucune règle ne cible `.egrid-card { aspect-ratio }` (la carte n'a plus de ratio fixe ; c'est `.egrid-img` qui porte `4/5`).

> Conserver le bloc `.egrid-wrap` / `.egrid` / container-queries (lignes ~1370–1383) tel quel — il reste valide.

- [ ] **Step 7 : Build + lint + revue visuelle jour/nuit**

Run : `pnpm build && pnpm lint`, puis `pnpm dev` → `/explorer`.
Vérifier : barre Quoi/Où/Quand en verre chaud (label terracotta, loupe terracotta pleine), popovers verre, chips catégories neutres DA teintées terracotta à la sélection, haut de page (h1+sous-titre+compteur), fond `--app-bg`, état vide et skeleton corrects, **jour ET nuit**, responsive (réduire la fenêtre : 5→2 colonnes), **aucun scroll interne** (scroll de page).

- [ ] **Step 8 : Commit**

```bash
git add src/pages/Explorer.css src/components/explorer/SearchSegments.tsx
git commit -m "feat(explorer): re-skin DA (barre verre, haut de page, etats, fond app-bg, halos retires)"
```

---

### Task 4 : QA finale — gotchas jour/nuit, dist, bump version, note de progress

**Files:**
- Modify: `package.json` (bump `version`)
- Modify: `Fellowship Progress` memory (note de session)

- [ ] **Step 1 : Chasse aux emojis/hex résiduels dans le rendu grille**

Vérifier qu'il ne reste **aucun** emoji 📅📍✨🔥 ni couleur hex en dur dans le chrome des fichiers touchés :

Run : `grep -nE "📅|📍|✨|🔥|#fff|#[0-9a-fA-F]{6}" src/components/explorer/EventGridCard.tsx src/components/explorer/EventGrid.tsx`
Expected : aucune occurrence problématique (les `#…` légitimes restants ne concernent que des surfaces/alpha dans le CSS, pas le TSX).

- [ ] **Step 2 : Check dist (couleurs invalides)**

Run : `pnpm build && grep -rn "hsl(#" dist/assets/*.css ; echo "exit:$?"`
Expected : **aucune** occurrence de `hsl(#` (triplets HSL invalides). Vérifier aussi visuellement qu'aucun texte blanc en dur ne traîne sur surface en mode jour.

- [ ] **Step 3 : Revue jour/nuit finale (checklist DA)**

Ouvrir `/explorer` en jour ET nuit. Confirmer : svg au trait (icônes méta, étoile, loupe), ombres douces en jour, verre lisible dans les deux modes, badges/points de statut contrastés, fallback sans image lisible, cartes atténuées correctes. Tester arrivée depuis le Calendrier (clic sur un mois → `/explorer` filtré sur ce mois, libellé « Quand »).

- [ ] **Step 4 : Bump version + commit final**

```bash
# package.json : "version": "0.7.310" → "0.7.311"
git add package.json
git commit -m "chore: bump 0.7.311 (refonte Explorer DA)"
git push
```

- [ ] **Step 5 : Note de progress (mémoire)**

Mettre à jour `Fellowship Progress` (`project_progress.md` + ligne MEMORY.md) : Explorer refonte DA shippée (grille seule carte B v2, coverflow en sommeil **TODO suppression**, barre verre, statuts `--status-*`), v0.7.311. Mentionner les leçons éventuelles rencontrées en build.

---

## Self-Review

**1. Spec coverage :**
- Grille seule + coverflow débranché/conservé + TODO → Task 2 (Step 1 TODO) ✓
- Structure A (h1 + sous-titre + barre + compteur unifié) → Task 2 + Task 3 Step 2 ✓
- Carte B v2 (image 4/5 cover + corps verre, étoile sur ligne titre, méta icônes, pied statut/compagnons, fallback) → Task 1 ✓
- Statuts unifiés `.da-dot`/`--status-*` via `participationDot` → Task 1 ✓
- Badges gélule verre DA → Task 1 (`.egrid-badge`) ✓
- Halos dynamiques retirés, fond `--app-bg` → Task 3 Step 1 ✓
- Barre Quoi/Où/Quand re-skin verre DA + chips sans hex → Task 3 Steps 3–4 ✓
- Compteur unifié → Task 2 Step 3 + Task 3 Step 2 ✓
- Gating gratuit (pas de teaser), « X compagnons y vont » conservé → comportement inchangé (Task 1 pied) ✓
- États skeleton/vide DA → Task 2 Step 2 + Task 3 Step 5 ✓
- Mobile grille responsive, scroll unique → Task 3 Steps 1, 6 ✓
- Garde-fous (`--copper`/`--primary`/`--glass`), gotchas, dist → Global Constraints + Task 4 ✓

**2. Placeholder scan :** Pas de TBD/TODO-de-plan. Le seul « TODO » est le commentaire-code volontaire (suppression future du coverflow), explicitement demandé par la spec. ✓

**3. Type consistency :** `EventGridCard` garde sa signature de props (consommée par `EventGrid` inchangé). `participationDot`/`participationChip`/`eventBadge`/`formatEventDateRange`/`getTagEmoji` : signatures réelles vérifiées dans `src/lib/explorer.ts` et `TagBadge`. `--dot-color` consommé par `.da-dot` (vérifié `index.css:228`). Classes CSS référencées dans le TSX (`egrid-img`, `egrid-imgel`, `egrid-img--empty`, `egrid-badge`, `egrid-badge-dot`, `egrid-body`, `egrid-titlerow`, `egrid-name`, `egrid-star`, `egrid-meta`, `egrid-meta-item`, `egrid-foot`, `egrid-status`, `egrid-foot-empty`, `egrid-friends`, `egrid-avs`, `egrid-av`, `egrid-fcount`) toutes définies en Task 1 Step 2. `xplr-*` et `egrid-skel*` définies en Task 3. ✓
