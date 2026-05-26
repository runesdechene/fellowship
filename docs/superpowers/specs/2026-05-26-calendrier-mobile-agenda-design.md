# Calendrier mobile — Agenda vertical — Design

> **Statut :** validé (brainstorm 2026-05-26, compagnon visuel). **Périmètre : mobile uniquement** (`< 640px`). Le desktop (intégration DA validée le matin même, `2026-05-26-calendar-da-integration-design.md`) **ne change pas**. Dépend de la refonte du cycle de vie de participation (`participationChip`, tokens `--status-*`) déjà en place.

## Contexte & problème

La page Calendrier a reçu la DA « Nuit de Festival » sur desktop ce matin (carte-mois lisible : mes dates avec pastille de statut, section « Tes compagnons » séparée). Le **mobile est resté à moitié à jour** et surtout **pas clair** — deux reproches confirmés par les utilisateurs :

1. **La vue d'ensemble est illisible.** Le mobile entre sur une **grille 3×4** (`MobileYearGrid`) où chaque case montre 2 noms d'événement en **8px** + un point coloré ; on ne lit rien, et il faut **taper un mois** pour atteindre la liste détaillée (`MobileMonthView`). Double friction : illisibilité + navigation à deux niveaux non évidente.
2. **On confond mes dates et celles des amis.** La grille année comme la vue mois **mélangent** mes participations et celles des amis sans séparation visuelle (la vue mois mobile actuelle ne reprend même pas le groupement « Tes compagnons » du desktop).

Accessoirement, `MobileYearGrid` utilise une **table de couleurs de tags codée en dur** (`TAG_COLORS`) au lieu du système de tags unifié (`useTags`) et du vocabulaire de statut (`participationChip`).

## Décision (actée au brainstorm visuel)

On remplace la navigation mobile à deux niveaux par un **agenda vertical unique** : les 12 mois de la fenêtre glissante sont **empilés et scrollables**, chacun rendu comme une section. Plus de grille année, plus de drill-down.

Choix de finition validés :
- **En-tête collant** (`sticky`) : titre + plage de dates + nav année `‹ 2026 ›` + les 3 chips de filtres. Reste visible pendant le scroll.
- **Pas de barre « sauter au mois »** (proposée puis écartée — superflue, le scroll suffit).
- **Mois vides = ligne fine** « libre » (discrète, pas une carte), pour rester un repère sans encombrer.
- **Pills d'événement réutilisées** (l'`mobile-event-pill` actuel est déjà bien : image + nom + méta + pastille statut), **regroupées par mois** avec en-tête de mois, puis la section **« Tes compagnons »** atténuée et séparée par un filet — exactement le découpage du desktop.
- **Parité compagnons sur mes dates** : sous une de mes pills, si des amis vont au même événement, une ligne compacte (avatars empilés + « N compagnons ») ouvre la modal existante `CalendarFriendsModal`. (Le mobile actuel ne le montre pas du tout.)

## Architecture & unités touchées

### Nouveau — `src/components/calendar/MobileAgenda.tsx`
Remplace **`MobileYearGrid` + `MobileMonthView`** (tous deux supprimés). Composant présentationnel.

**Props :**
```ts
interface MobileAgendaProps {
  months: CalendarMonth[]          // les 12 mois glissants déjà mergés avec les amis
  actorKind: ActorKind             // 'entity' | 'person' — pour participationChip
  friendParticipations: FriendParticipation[]
  onOpenFriends: (eventId: string, eventName: string) => void
}
```

**Rendu** — pour chaque mois de `months`, dans l'ordre :
- Si `events.length === 0` → **ligne fine** : barre + nom du mois + « libre » (classe `.agenda-empty`).
- Sinon → **en-tête de mois** = le composant existant `<MonthBanner month label year />` (réutilisé tel quel : SVG saisonnier + label + année, couleur uniforme `hsl(var(--muted-foreground))`), suivi du **nombre de dates** (`.agenda-mh-count`, ex. « 2 dates ») ; puis :
  - **Mes dates** (`events.filter(e => !e.isFriend)`) : chaque event en `.mobile-event-pill` (style existant réutilisé) avec image, nom (icône tag via `getTagIcon`), méta (date formatée + ville/dépt), et **pastille statut** via `participationChip(ev.status, ev.paymentStatus, actorKind, { isPast: ev.endDate < now })`. Si des amis sont sur cette date (`friendParticipations.filter(fp => fp.event_id === ev.id)`), une ligne compacte `.agenda-companions` (avatars + « N compagnons ») déclenche `onOpenFriends`.
  - Si des **amis-seuls** existent (`events.filter(e => e.isFriend)`) → filet + label **« Tes compagnons »** (`.agenda-frlbl`) puis chaque event en `.mobile-event-pill.fr` **atténué** (avatar ami + « {friendName} y va · {mois} »).

> Note : pas de palette de couleurs par mois (mes barres colorées dans la maquette compagnon étaient illustratives). On garde la sobriété du desktop via `MonthBanner` qui existe déjà.

**Helpers réutilisés / partagés :**
- `participationChip`, `ActorKind` depuis `@/lib/explorer`.
- `useTags` + `getTagIcon` depuis `@/components/ui/TagBadge` (couleur/icône de tag) — **supprime le `TAG_COLORS` codé en dur de `MobileYearGrid`**.
- `MonthBanner` depuis `./MonthBanner` (en-tête de mois, déjà utilisé par le desktop).
- **`formatDateRange(start, end)`** : extrait de `MobileMonthView` vers un util pur **`src/lib/calendar-format.ts`** (export nommé), pour être testé en isolation (cf. [[reference_react_test_infra]] : on teste les fonctions pures, pas le rendu). `MobileAgenda` l'importe.
- Le découpage mine/amis (`!e.isFriend` / `e.isFriend`) reste un `filter` inline de 2 lignes dans `MobileAgenda` (trivial, pas d'extraction).

### Modifié — `src/pages/Calendar.tsx`
- **Supprime** l'état et la logique du double-niveau mobile : `mobileView`, `selectedMonthIndex`, `handleSelectMonth`, `handlePrevMonth`, `handleNextMonth`, l'effet `popstate` (lignes ~27-62) et le bloc de rendu `MobileYearGrid`/`MobileMonthView`.
- **Garde** `isMobile` (et son `matchMedia`).
- Le bloc mobile devient :
  ```tsx
  {isMobile && (
    <div className="mobile-calendar">
      <MobileAgenda
        months={slidingMonths}
        actorKind={actorKind}
        friendParticipations={friendActivity}
        onOpenFriends={(id, name) => setModalEvent({ id, name })}
      />
    </div>
  )}
  ```
- L'en-tête (`.calendar-header`) et les filtres (`.calendar-filters`) sont **déjà rendus une seule fois en haut** (partagés desktop/mobile) — on les rend collants en mobile **via CSS**, pas de changement JSX.

### Supprimés
- `src/components/calendar/MobileYearGrid.tsx`
- `src/components/calendar/MobileMonthView.tsx`
- (vérifié : seul `Calendar.tsx` les importait.)

### Styles — `src/pages/Calendar.css`
- **Supprime** toutes les règles `.mobile-year-*` et `.mobile-month-*` devenues mortes (vue année grille + nav mois + bouton retour vue année). **Garde** `.mobile-event-pill*` (réutilisé) et ses variantes de statut.
- **Ajoute** : `.mobile-agenda`, `.agenda-mh` (en-tête mois), `.agenda-empty` (ligne fine), `.agenda-frlbl` (filet + label compagnons), `.mobile-event-pill.fr` (atténué + avatar ami), `.agenda-companions` (avatars empilés + libellé, bouton).
- **Sticky header mobile** : dans `@media (max-width: 639px)`, `.calendar-header` + `.calendar-filters` en `position: sticky; top: 0; z-index` + fond `hsl(var(--background))` (pour masquer le contenu qui scrolle dessous). Vérifier l'ancêtre scrollant (le `<main>` de l'app shell) — à valider visuellement.
- **Filtres mobile** : labels raccourcis pour tenir sur ~320px — « Mes dates » / « Amis pro » / « Visiteurs » (ou autoriser le scroll horizontal de `.calendar-filters`). Décision : **labels courts** (pas de scroll).
- Tokens : `hsl(var(--token))` pour les triplets, `var(--status-*)` brut pour les statuts. Aucun `#fff` ni `rgba(61,48,40,…)` en dur (checklist DA [[reference_da_daynight_gotchas]]).

### Inchangé
Fenêtre glissante 12 mois, merge amis (`friendEventsByMonth`, `mergeWithFriends`), nav année + animation, skeleton, `CalendarFriendsModal`, et **tout le rendu desktop** (`.calendar-grid`, `CalendarMonth`, `MonthBanner`). `CalendarEvent` a déjà `paymentStatus`, `status`, `isFriend`, `friendName` → **aucun changement de données**.

## Hors périmètre
- Le desktop (validé le matin) — on n'y touche pas.
- Le teaser `ProGate` (non-Pro).
- L'application de la migration paiement / régénération de types (au merge de la branche).

## Pièges à vérifier (checklist DA jour/nuit — [[reference_da_daynight_gotchas]])
- Sticky header : le fond doit être **opaque** (`hsl(var(--background))`) sinon les pills scrollent en transparence dessous, illisible.
- Pills atténuées amis : l'`opacity` ne doit pas rendre le texte illisible en mode jour (vérifier contraste).
- Avatars compagnons : dégradés en dur OK (déjà le cas desktop) mais pas de `#fff` de fond de carte.
- Statuts : `var(--status-*)` brut, pas `hsl()`.
- Vérifier en **nuit ET jour** (toggle Pro accessible).

## Tests
- **`src/lib/calendar-format.test.ts`** : tests purs de `formatDateRange` — même jour (`24 mai`), même mois (`24–26 mai`), à cheval sur deux mois (`30 mai — 2 juin`). C'est le seul morceau à logique testable ; `MobileAgenda` est présentationnel (pas de test de rendu, cf. [[reference_react_test_infra]]).

## Vérification
- `pnpm build && pnpm lint && pnpm vitest run` verts.
- `grep` : zéro import résiduel de `MobileYearGrid`/`MobileMonthView` ; zéro `.mobile-year-`/`.mobile-month-nav`/`.mobile-month-back` orphelin dans le CSS ; zéro `TAG_COLORS` résiduel.
- Visuel `/calendrier` sur viewport mobile (compte exposant Pro), nuit ET jour :
  - agenda vertical, en-tête collant qui reste pendant le scroll ;
  - mes dates avec bonne pastille (À payer ambre, Inscrit vert, Repéré or…) ;
  - section « Tes compagnons » atténuée et séparée ;
  - mois vides en ligne fine « libre » ;
  - ligne compagnons sur une de mes dates → ouvre la modal ;
  - filtres lisibles sur petit écran (labels courts).
- Régression : le **desktop** rend toujours `.calendar-grid` (inchangé).
