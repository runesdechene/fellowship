# Page « Mes dates » — Design

> **Statut :** validé (brainstorm 2026-05-27). Page gratuite servant de **compensation** au Calendrier passé Pro. S'appuie sur le vocabulaire de statut déjà unifié (`participationChip`, `docs/superpowers/specs/2026-05-26-participation-lifecycle-refonte-design.md`).
>
> **⚠️ Mise à jour 2026-05-27 (post-implémentation) — pivot du palier gratuit.** Le **cap d'horizon « 3 mois »** + le tease flou (décrits plus bas) ont été **abandonnés** et retirés du code. Raison : gater l'horizon de visibilité de SA PROPRE donnée fait punitif, et « Mes dates débloquée = même liste plus longue » fait doublon avec le Calendrier. Décision : **« Mes dates » affiche TOUT pour tout le monde** (aucun cap d'horizon). Le palier gratuit est désormais piloté par un **quota de dates/an avec statut** (≈10, fenêtre 12 mois glissants, entité gratuite seulement), enforced **à l'ajout d'un statut** — spec dédiée : `docs/superpowers/specs/2026-05-27-quota-dates-gratuit-design.md`. Les sections ci-dessous décrivant la fenêtre 3 mois / le tease sont **caduques** (gardées pour trace).

## Contexte & problème

Le Calendrier devient une surface **Pro**. Sans alternative, l'exposant gratuit perd toute vue d'ensemble de sa saison, et le festivalier n'a aucun endroit pour retrouver les festivals qu'il a repérés / où il va.

« Mes dates » est cette alternative gratuite : une **liste agenda de mes participations**, groupée par mois, chronologique. Elle existe déjà côté festivalier dans la nav (`PERSON_NAV`) mais pointe sur un `ComingSoon`. Elle n'existe pas encore côté exposant.

Deux maquettes validées servent de référence :
- `docs/decisions/assets/festivalier-mesdates.html` — variante personne (aucun paywall).
- `docs/decisions/assets/mes-dates.html` — variante exposant gratuit (fenêtre 3 mois + tease Pro).

## Audience & placement

| Acteur | Accès | Comportement |
|---|---|---|
| **Festivalier** (`kind === 'person'`) | toujours | aucun paywall, toutes les dates (présent + « Plus tard ») |
| **Exposant gratuit** (`kind === 'entity'`, plan `free`) | toujours | fenêtre **3 prochains mois** réelle, puis vraies dates au-delà en **flou progressif** + CTA Pro |
| **Exposant Pro** (`kind === 'entity'`, plan `pro`) | toujours | tout visible, **pas** de tease |

C'est la vraie compensation : le gratuit garde une vue 3 mois de sa saison ; le Calendrier Pro déverrouille l'année.

### Nav (`src/lib/navModel.ts`)
- Ajouter `'mes-dates'` à `EXPOSANT_NAV` (déjà dans `PERSON_NAV`).
- `NAV_DEFS['mes-dates'].built` → `true`.
- `App.tsx` : remplacer `<ComingSoon title="Mes dates" />` par la vraie page `<MesDatesPage />`.
- La BottomBar mobile (`mobilePrimaryFor`) reste inchangée pour l'instant (exposant : Cockpit · Calendrier · Explorer) — « Mes dates » est accessible via la nav complète / feuille de compte. *(Réévaluer après coup si on veut le promouvoir en lien principal mobile exposant.)*

## Architecture logicielle

### Page `src/pages/MesDates.tsx` (+ `MesDates.css`)
Page autonome. Le shell (sidebar desktop / BottomBar mobile) est fourni par `AuthenticatedApp`, comme `Explorer`. Aucune gestion de shell ici.

### Données
- **`useMyParticipations()`** — déjà scopé sur l'acteur actif (`actor_id`), renvoie `ParticipationWithEvent[]` (jointure `events`). Source des dates.
- **`useFriendsParticipations()`** — abonnés qui participent (visibilité `amis`/`public`), 1 requête batch + résolution `actor_public`. Source de la ligne « compagnons ». **Pas de requête par-événement** : on filtre en JS par `event_id` (même pattern que `MobileAgenda`).

### Helper pur `src/lib/mes-dates.ts`

```ts
export interface MonthBucket {
  year: number
  month: number   // 0-11
  label: string   // "Septembre 2026" (capitalisé)
  events: ParticipationWithEvent[]  // triés par start_date asc
}

export type Direction = 'upcoming' | 'past'

/**
 * Groupe mes participations en buckets mois (année+mois), triés.
 * - 'upcoming' : end_date >= now, ordre chronologique croissant.
 * - 'past'     : end_date <  now, ordre chronologique décroissant (plus récent d'abord).
 * Traverse le changement d'année (contrairement à buildCalendarMonths, figé sur 1 an).
 * Un événement est rattaché au mois de sa start_date uniquement (pas de duplication).
 */
export function groupParticipationsByMonth(
  participations: ParticipationWithEvent[],
  opts: { now: Date; direction: Direction },
): MonthBucket[]
```

Raison d'un nouveau helper plutôt que `buildCalendarMonths` : ce dernier produit une grille fixe de 12 mois d'**une seule année**. « Mes dates » est une liste **roulante** futur/passé qui doit traverser le changement d'année et n'afficher que les mois non vides. Fonction **pure, testée en TDD**.

### Découpe paywall exposant gratuit
Helper séparé (testable) dans `src/lib/mes-dates.ts` :

```ts
/** Index de coupe : nb de buckets dans la fenêtre des 3 prochains mois calendaires. */
export function freeWindowSplit(buckets: MonthBucket[], now: Date): {
  visible: MonthBucket[]   // mois <= now+2 (mois courant + 2)
  beyond: MonthBucket[]    // au-delà
  beyondCount: number      // nb total d'événements au-delà (pour « +N dates »)
}
```

Fenêtre = mois courant + 2 mois suivants (3 mois calendaires glissants). Appliquée **uniquement** pour un exposant `free` sur l'onglet « À venir ». Festivalier et exposant Pro : `beyond` vide, tout dans `visible`.

### Composant ligne `DateRow` (`src/components/mes-dates/DateRow.tsx`)
D'après les maquettes :
- **Pastille date** : jour en grand + abréviation jour (`Sam`) + `→ 6` si multi-jours.
- **Vignette affiche** (`event.image_url`), masquée < 560px.
- **Infos** : titre · `Ville (dpt) · 🏷️ Tag` (icône tag via `getTagIcon`).
- **Ligne compagnons** : avatars empilés (≤ 4, `avatarGradient` en fallback) + libellé. Réutilise la donnée `useFriendsParticipations` filtrée par `event_id`. Clic → ouvre la même feuille « compagnons » que le calendrier si réutilisable, sinon fallback : navigation vers la page événement. *(À trancher en implémentation selon couplage du composant existant — ne pas dupliquer un système parallèle.)*
- **Pastille statut** : `participationChip(status, payment, actorKind, { isPast })` + classe `chip.variant`, teintes `--status-*`.
- Clic sur la ligne → `/evenement/:id`.

### Page : structure
- **Onglets** `À venir` / `Passées` (state local, défaut `À venir`).
- En-tête : titre « Mes dates » + sous-titre adapté à l'acteur (exposant : « Tes prochains festivals » ; personne : « Les festivals où tu vas — et ceux qui te font de l'œil »). Exposant gratuit : pastille « Vue gratuite · 3 mois ».
- Corps : `groupParticipationsByMonth` → bandeaux mois + `DateRow`. Exposant gratuit (onglet À venir) : applique `freeWindowSplit`, rend `visible`, puis le **bloc tease** si `beyond` non vide.
- **Bloc tease (exposant gratuit, beyond non vide)** : on tease **« Mes dates » elle-même débloquée**, pas le calendrier. On continue de rendre les **vraies `DateRow` de `beyond`** (les participations réelles au-delà de 3 mois) sous un **flou progressif** : net en haut → de plus en plus flou vers le bas (masque/dégradé CSS), `pointer-events` coupés. Par-dessus, un CTA « Vois ta saison complète — Pro » + titre honnête « +N dates au-delà de 3 mois » (N = `beyondCount`). CTA = passage Pro (route `/reglages`).
  - Le flou progressif est un traitement **bespoke** (gradient de `backdrop-filter`/`mask` croissant vers le bas), distinct du flou uniforme de `ProTeaser` — on ne réutilise donc pas `ProTeaser` ici, mais le même esprit (vrai contenu masqué + voile + CTA).
- **État vide** (aucune date dans l'onglet) : encart CTA « Explorer les festivals » → `/explorer`. Présent aussi en bas de l'onglet À venir non vide pour le festivalier (maquette).

## DA jour/nuit
Les maquettes sont **nuit only** : on mappe sur les tokens DA réels (`hsl(var(--card))`, `hsl(var(--primary))`, `--status-*`, `--muted-foreground`…), **aucun `#fff` / `--amber` en dur**. Passer la checklist jour/nuit (`reference_da_daynight_gotchas`) :
- SVG décoratifs `fill: none` si besoin.
- Pas de couleur claire codée en dur.
- En `.light`, ombres douces sur boutons colorés (`feedback_light_button_shadow`).
- Audit tokens CSS avant tout changement de format (`feedback_css_token_audit`) — ici on **consomme** les tokens, on n'en change pas le format.

## Surfaces touchées (récap)

| Fichier | Changement |
|---|---|
| `src/lib/mes-dates.ts` *(nouveau)* | `groupParticipationsByMonth` + `freeWindowSplit` (purs) |
| `src/lib/mes-dates.test.ts` *(nouveau)* | tests TDD des deux helpers |
| `src/pages/MesDates.tsx` *(nouveau)* | page (onglets, variantes acteur, tease, états vides) |
| `src/pages/MesDates.css` *(nouveau)* | styles dual-thème mappés sur tokens DA |
| `src/components/mes-dates/DateRow.tsx` *(nouveau)* | ligne réutilisable (date, affiche, compagnons, statut) |
| `src/lib/navModel.ts` | `mes-dates` dans `EXPOSANT_NAV` ; `built: true` |
| `src/App.tsx` | route `/mes-dates` → `MesDatesPage` (remplace `ComingSoon`) |

**Réutilisé tel quel (pas de modif)** : `participationChip` + `--status-*`, `useMyParticipations`, `useFriendsParticipations`, `getTagIcon`, `avatarGradient`, `formatDateRange`. *(`ProTeaser` non réutilisé : le tease « Mes dates débloquée » utilise un flou progressif bespoke, voir §structure.)*

## Tests & vérification

- **TDD** sur `src/lib/mes-dates.ts` :
  - `groupParticipationsByMonth` : split upcoming/past sur `end_date` vs `now` ; bucket par mois de `start_date` ; passage d'année (déc → janv) ; tri intra-mois ; mois vides exclus ; ordre décroissant pour `past`.
  - `freeWindowSplit` : fenêtre mois courant + 2 ; `beyondCount` exact ; cas « rien au-delà » → `beyond` vide ; événements pile à la limite.
- `participationChip` : déjà couvert (`explorer.test.ts`), non re-testé.
- `pnpm build && pnpm lint && pnpm vitest run` vert.
- **Vérif visuelle** jour **et** nuit, pour : festivalier (À venir/Passées, « Plus tard »), exposant gratuit (fenêtre 3 mois + tease), exposant Pro (pas de tease), états vides.

## Risques & points d'attention

- **Feuille « compagnons »** : si le composant du calendrier est trop couplé (`from: '/calendrier'`, etc.), fallback = avatars cliquables vers la page événement. Ne pas dupliquer un second système de compagnons.
- **Perf ligne sociale** : `useFriendsParticipations` plafonne à 50 lignes ; suffisant pour le v1. Si un acteur a beaucoup d'abonnés très actifs, certaines participations compagnons pourraient manquer — acceptable en v1, à revoir si remonté.
- **Limite 3 mois** : c'est une **fenêtre de présentation** (découpe en JS sur la donnée déjà chargée), pas un filtre serveur — on charge toutes les participations puis on coupe. Cohérent avec le pattern `ProTeaser` (le vrai contenu est là, masqué).
- **BottomBar exposant** : « Mes dates » n'est pas (encore) un lien principal mobile exposant. À réévaluer après mise en ligne.
