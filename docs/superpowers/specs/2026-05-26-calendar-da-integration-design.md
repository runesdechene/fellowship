# Calendrier — Intégration DA « Nuit de Festival » — Design

> **Statut :** validé (brainstorm 2026-05-26). **Dépend de** la refonte du cycle de vie de participation (`2026-05-26-participation-lifecycle-refonte-design.md`, déjà implémentée) : la page consomme `participationChip` et les tokens `--status-*`. 4ᵉ page DA après landing / onboarding / explorer.

## Contexte & problème

La page Calendrier (`/calendrier`, derrière `ProGate`) est **fonctionnelle et riche** (grille annuelle, fenêtre glissante 12 mois, 3 filtres pro/visiteur persistés, modal compagnons, vues mobiles, skeleton) mais **n'a jamais reçu la DA**. Pire : son CSS est **cassé sous les tokens DA** — `Calendar.css` utilise partout `hsl(var(--foreground))`, `hsl(var(--card))`, etc., or le socle DA a basculé ces tokens en **triplets HSL** consommés via `hsl(var(--token))` ; mais le fichier contient aussi des dizaines de `rgba(61, 48, 40, …)` (brun du thème jour) **en dur**, illisibles sur le fond nuit.

On applique la DA en s'alignant sur la maquette `docs/decisions/assets/calendar-exposant.html`, **sans régresser** la logique existante (qui marche).

## Décisions (actées au brainstorm)

1. **Fenêtre glissante 12 mois conservée** (démarre au mois courant, déborde sur l'an+1). Pas l'année civile fixe de la maquette (c'était un jeu de test). La nav `‹ année ›` et le sous-titre de plage restent.
2. **3 filtres conservés** (Mes événements / Amis pro / Amis visiteurs) — la granularité pro/visiteur reste — **rendus en style maquette** (chips arrondis `.chip`, état actif copper pour « mes » / vert pour « compagnons »). Persistance localStorage inchangée.
3. **Section « Tes compagnons ce mois-ci »** en bas de chaque carte-mois : les événements où des **amis vont mais pas toi** sont regroupés là, atténués, sous un libellé dédié (maquette `.friend-lbl` + `.evF`). Tes propres événements gardent leur ligne de présence (« N compagnons sur cette date »).
4. **Pas de CTA « Ajouter une date »** dans l'en-tête (doublon avec le « + » global de la SearchBar, présente sur `/calendrier`).
5. **Pastilles de statut = vocabulaire unifié** via `participationChip` (Repéré/Accepté/À payer/Inscrit/Refusé/Terminé) + tokens `--status-*`. Remplace le `STATUS_CONFIG` maison de `CalendarMonth.tsx`.
6. **`Calendar.css` réécrit** intégralement sur les tokens DA corrects (`hsl(var(--token))` pour les triplets, `var(--status-*)` pour les couleurs de statut), look maquette (carte `border`+`radius:18px`, lignes-événement sur surface `--surface2`-like, bannière SVG saisonnière).

## Architecture & unités touchées

### Données — `src/hooks/use-calendar.ts`
`CalendarEvent` gagne **`paymentStatus: string | null`** et **`actorKind`** (pour le chip). Le mapping dans `useCalendarYear` propage `p.payment_status` ; le mapping des événements amis dans `Calendar.tsx` (friendEventsByMonth) propage le `kind` de l'ami. Un flag dérivé **`isPast`** (end_date < now) est calculé au rendu pour l'override « Terminé ».

### Carte-mois — `src/components/calendar/CalendarMonth.tsx`
- Remplace `STATUS_CONFIG` + la logique de statut maison par **`participationChip(status, paymentStatus, actorKind, { isPast })`** → pastille verticale icône+label façon maquette (`.evst`).
- Sépare les événements en deux groupes : **les tiens** (présence + compagnons sur la date) et **ceux des amis seuls** (« Tes compagnons ce mois-ci », atténués).
- Réutilise `MonthBanner` (bannière saisonnière).

### Bannière — `src/components/calendar/MonthBanner.tsx`
Reçoit déjà une `color` ; on lui passe une couleur **token-aware** (claire en nuit, sombre en jour) au lieu d'une valeur figée. Vérifier `svg { fill: none }` et pas de `#fff` en dur (checklist DA).

### Styles — `src/pages/Calendar.css` (réécriture)
- Tous les `hsl(var(--token))` corrects pour les triplets ; **suppression de tous les `rgba(61,48,40,…)`** → `hsl(var(--muted-foreground))` / `hsl(var(--foreground))` / `var(--border)` selon l'intention.
- Carte-mois, bannière, ligne-événement, pastille `.evst`, présence, section compagnons, filtres `.chip`, nav année — au look maquette, **lisibles nuit ET jour** (ombres `.light` douces).
- Les vues mobiles (`MobileYearGrid`, `MobileMonthView`, pills) sont dans le même fichier → mêmes corrections de tokens.

### Inchangé (pas de refactor)
Fenêtre glissante, merge amis, modal compagnons (`CalendarFriendsModal`), navigation année/mobile, skeleton — la **logique** reste ; on restyle et on rebranche le statut.

## Hors périmètre
- Le **teaser `ProGate`** (ce que voient les non-Pro) — composant séparé, pas la page elle-même.
- L'application de la migration paiement / régénération de types (gérées au merge de la branche).
- Unification du vocabulaire des **autres** surfaces tierces (ParticipantsModal, FriendRow) — décision séparée.

## Pièges à vérifier (checklist DA jour/nuit — [[reference_da_daynight_gotchas]])
- **Tokens** : jamais `var(--foreground)` brut là où c'est un triplet → `hsl(var(--foreground))`. Les `--status-*` sont des couleurs brutes → `var(--status-*)` direct (pas de `hsl()`).
- Aucun `#fff` / `rgba(61,48,40,…)` en dur.
- SVG bannière : `fill:none` + couleur via prop.
- Ombres et contrastes vérifiés dans les **deux** thèmes (Pro toggle accessible).

## Vérification
- `pnpm build && pnpm lint && pnpm vitest run` verts.
- `grep` : zéro `hsl(var(` cassé restant et zéro `rgba(61, 48, 40` dans `Calendar.css`.
- Visuel : `/calendrier` (compte exposant Pro) en nuit ET jour — pastilles statut correctes (À payer ambre, Inscrit vert…), section compagnons atténuée, filtres style maquette, mois vide « Ce mois est libre », vues mobiles lisibles.
