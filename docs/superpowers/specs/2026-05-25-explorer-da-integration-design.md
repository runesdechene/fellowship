# Explorer « Nuit de Festival » — Intégration maquette — Design

- **Date :** 2026-05-25
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `à valider` (design présenté, en attente de revue de la spec)
- **Branche :** `feat/da-nuit-festival-socle` (socle + tunnel d'entrée déjà dessus)
- **Référence visuelle :** [`assets/explorer.html`](../../decisions/assets/explorer.html) (coverflow). DA : [`0001 §9`](../../decisions/0001-fondations-vision-packs-da.md) + gotchas jour/nuit. Données : base locale enrichie (68 events / 56 images, importés du distant).

> **But :** remplacer la grille Explorer actuelle par l'expérience **coverflow** de la maquette (effet « wouaw » + parcours reposant avec tris), branchée sur les données et hooks réels, en DA Nuit de Festival.

---

## 1. Décisions de cadrage (tranchées avec Uriel, 2026-05-25)
1. **Coverflow = la vue Explorer**, il **remplace la grille** actuelle (pas de vue liste alternative en V1).
2. **Barre de recherche segmentée = les « tris »** : **Quoi** (catégories = tags), **Où** (département/région + « Toute la France »), **Quand** (présélections de période). Popovers comme la maquette.
3. **« Où » par zone** (dept/région), **pas de rayon km** en V1 (pas de géocodage — évolution future).
4. **Carte sans image = fallback « B »** : surface sombre (`hsl(var(--card))`) + lueur copper en haut + **icône de catégorie** en filigrane + infos en bas. (82 % des events ont une image ; ~18 % utilisent ce fallback.)
5. **Bouton « Ajouter une image »** sur les cartes sans image : visible pour **tout exposant** (+ admin), **pas les festivaliers**. **Les fiches events sont déjà 100 % collaboratives** (RLS `events_update_exposant` : tout exposant peut éditer n'importe quel event) — **sauf si un organisateur a revendiqué la fiche** (verrou = module orga **V2**, pas encore en base). Donc **aucun nouveau backend** : on réutilise l'update collaboratif existant + l'upload `EventForm` (compression → webp → Storage → URL publique).
6. **« X y vont »** = participations **réelles** des compagnons (follow mutuel). **CTAs** : « Voir le festival » (→ page event) et « ★ Repérer » (bascule la participation de l'acteur courant).
7. **Mobile = coverflow rétréci** (option B), **pas** de bascule en liste : on conserve le carrousel 3D compacté. Raison : les affiches sont souvent chargées d'infos → voir l'image (même petite) a de la valeur, et ça garde l'effet.
8. **Données réelles obligatoires** en dev (cf. [[reference_local_dev_data]]).

---

## 2. Architecture & composants

Découpage pour isolation/testabilité (fichiers focalisés) :

- **`src/pages/Explorer.tsx`** — réécriture : compose la scène (ambient + barre de recherche + deck + dock + bottombar), gère l'état (filtres persistés, index actif, autoplay, popovers). Lit les hooks de données.
- **`src/pages/Explorer.css`** — réécriture : styles coverflow portés de la maquette → tokens DA (table de correspondance + gotchas svg/texte/ombres, cf. [[reference_da_daynight_gotchas]]). Scopé `.explorer`.
- **`src/components/explorer/EventDeck.tsx`** — le coverflow 3D : reçoit `events` filtrés + `activeIndex` + handlers ; rend une **fenêtre** de cartes autour de l'actif (perf, cf. §6). Pas de logique de données.
- **`src/components/explorer/DeckCard.tsx`** — une carte : photo plein cadre **ou** fallback B (icône catégorie). Affiche le bouton « Ajouter une image » si éligible.
- **`src/components/explorer/SearchSegments.tsx`** — barre Quoi/Où/Quand + popovers (catégories, zone, périodes). Émet les changements de filtres.
- **`src/components/explorer/EventDock.tsx`** — infos de l'event actif (eyebrow, nom, tag, date·lieu, « X y vont » + avatars) + CTAs.
- **`src/components/explorer/AmbientBackground.tsx`** — calque flou de l'image de l'event actif (fondu au changement), fallback dégradé si pas d'image.
- **Helpers purs** dans **`src/lib/explorer.ts`** (étendre l'existant) + tests Vitest :
  - `deckCardStyle(offset)` → transform/opacity/zIndex/filter d'une carte selon son décalage à l'actif (le math du coverflow, isolé et testé).
  - `periodToRange(preset, now)` → `{ from, to }` (et/ou mode) pour les présélections « Quand ».
  - `composeFilter(events, { tags, zone, period }, ctx)` → events filtrés + triés (réutilise/rassemble `applyViewMode` + filtre tags + filtre dept).

---

## 3. Données & hooks (réutilisation)
- **Events** : `useEvents` (déjà branché, données réelles). 
- **Catégories (Quoi)** : `useTags` (chips colorés existants).
- **Compagnons « qui y vont »** : réutiliser les données sociales/participations existantes (`friendCount` / vues `event_scores`/`friends`) pour calculer, par event, le **nombre + avatars** (initiales/couleur) des compagnons participants. V1 : nombre fiable via l'existant ; avatars best-effort (initiales). Libellé conforme au modèle de visibilité : « X utilisateurs de Fellowship y vont » / « <prénoms> y vont » (cf. [[project_visibility_model]]).
- **Repérer** : `use-participations` — bascule la participation de **`currentActor`** pour l'event (réutilise la mécanique 3A.2 `actor_id`/`acted_by_user_id`).
- **Filtres persistés** : localStorage `explorer-filters` (comme aujourd'hui : tags, zone, période).

---

## 4. Interactions
- **Navigation deck** : flèches gauche/droite, clic sur une carte latérale pour la centrer, **autoplay** (~4,5 s) en pause au survol/interaction. Clavier : ←/→ pour naviguer (a11y).
- **Quoi/Où/Quand** : clic sur un segment ouvre son popover ; sélection met à jour le libellé du segment + refiltre le deck (et réinitialise `activeIndex` à 0). Fermeture au clic extérieur.
- **« Voir le festival »** → `/evenement/:id`.
- **« ★ Repérer »** → toggle participation (état visuel reflété ; optimistic UI). 
- **Compteur** : « position / N festivals trouvés ».
- **Carte sans image + éligible** → bouton « Ajouter une image » → ouvre le sélecteur de fichier, réutilise le pipeline d'upload (compression webp → bucket → URL) puis applique via l'RPC §5 ; la carte se met à jour (image affichée, bouton disparaît).

## 5. Backend — rien à construire (édition déjà collaborative)
Vérifié sur la base : la RLS `events_update_exposant` autorise **tout exposant** à UPDATE n'importe quel event (fiches collaboratives). Le bouton « Ajouter une image » **réutilise l'update existant** (pose `image_url` après upload Storage, comme `EventForm`) — **pas de nouvelle RPC/policy**. Bouton masqué pour les festivaliers (cohérent avec la RLS).
- **Nuance à vérifier au plan (hors périmètre Explorer, à ne pas casser)** : sous le modèle acteur, la policy `events_write_actor` (= `can_act_as(created_by_actor)`) ne couvre que le **créateur** ; l'édition par un exposant **non-créateur** repose aujourd'hui sur la policy legacy `events_update_exposant` (basée sur `profiles`). Si `profiles` est retiré (Plan 4 « contract »), prévoir une policy **acteur** « tout exposant peut update » pour préserver la collaboration.
- **Revendication orga (V2)** : quand le module organisateur arrivera, une fiche revendiquée se verrouillera au seul orga → édition restreinte. Aucune colonne `claim` en base aujourd'hui → rien à gérer en V1.

## 6. Performance
- **Fenêtrage du deck** : ne monter/charger que les cartes proches de l'actif (ex. ±3) ; les autres ne sont pas rendues ou sans `<img>`. Évite 68+ `<img>` simultanés. `loading="lazy"` + préchargement de l'image ambiante de la carte suivante.
- Transitions GPU (`transform`/`opacity`), `will-change` ciblé. Respecter `prefers-reduced-motion` (réduire/désactiver autoplay + rotations).

## 7. Mobile / responsive (décision : coverflow rétréci — option B)
< ~1080px : **sidebar** masquée (la **BottomBar** existante prend le relais) ; on **conserve le coverflow 3D** mais compacté (esprit media-query maquette), **pas** de bascule en liste.
- **Budget vertical serré** (le point dur de B) : searchbar **compacte** = une pilule « Quoi · Où · Quand » qui ouvre les popovers en plein largeur → deck centré → **dock condensé** (eyebrow + nom + tag·date·lieu + « X y vont » sur 1–2 lignes) → CTAs → BottomBar. Réduire les hauteurs pour tenir sans scroll de page.
- Cartes latérales réduites mais visibles (slivers) ; tap sur une carte latérale la centre.
- **Gestes** : swipe tactile gauche/droite (+ flèches rapprochées). Autoplay conservé, `prefers-reduced-motion` respecté.

## 8. DA jour/nuit (gotchas appliqués d'emblée)
- `.explorer svg { fill:none; stroke:currentColor }` (icônes au trait).
- Aucun `#fff` en dur pour du texte sur surface → `hsl(var(--foreground))` (sauf texte sur photo/dégradé/bouton, légitime).
- Ombres : override `.light` douces (cartes/dock/searchbar) ; check dist `hsl(#` vide.
- Le verre dépoli de la searchbar/arrows : versions nuit (clair translucide) **et** jour (sombre translucide) lisibles.

## 9. États
- **Chargement** : skeleton deck (quelques cartes fantômes) + dock vide.
- **Vide (après filtres)** : message « Aucun festival ne correspond » + reset filtres (réutilise l'esprit de l'état vide actuel).
- **Erreur réseau** : message non bloquant.

## 10. Tests
- Vitest sur les helpers purs : `deckCardStyle` (offsets −2..+2, au-delà), `periodToRange` (ce mois / 3-6-12 / récents / terminés), `composeFilter` (tags ∩ zone ∩ période + tri). Conforme à la contrainte RTL (tests de fonctions pures, cf. [[reference_react_test_infra]]).
- Smoke : éligibilité du bouton « Ajouter une image » (exposant voit / festivalier non) ; un exposant **non-créateur** peut bien poser une image (update collaboratif existant) ; le bouton n'apparaît pas sur un event qui a déjà une image.
- Build + lint + check dist couleurs.

## 11. Hors périmètre (V1)
- Rayon **km / géocodage** (« Où » par zone uniquement).
- **Modération** d'images / contribution festivalier (pros only, direct).
- **Vue liste/grille** alternative (coverflow seul).
- Upload d'avatars perso/logo (toujours Plan 6).

## 12. Risques
| Risque | Mitigation |
|---|---|
| Perf du deck avec beaucoup d'events | Fenêtrage ±3 + lazy images (§6). |
| Coverflow peu ergonomique pour scanner en masse | Filtres « tris » resserrent le set ; compteur ; (vue liste = évolution si besoin). |
| « X y vont » coûteux à calculer par event | Réutiliser les vues sociales existantes ; avatars best-effort. |
| Collaboration cassée si `profiles` retiré | L'édition par un non-créateur dépend de la policy legacy `events_update_exposant` ; prévoir une policy **acteur** équivalente au moment du « contract » (noté §5). |
| Lisibilité jour du verre dépoli | Variantes `.light` explicites (§8). |
