# Calendrier Mobile — Design Spec

## Contexte

Le calendrier actuel affiche la même grille sur mobile et desktop. Sur mobile : les cards événements débordent de la largeur de l'écran, et 12 mois en colonne est trop long à scroller. Desktop reste inchangé.

## Breakpoint

- **< 640px** : vue mobile (ce spec)
- **>= 640px** : vue desktop existante (inchangée)

## Vue Annuelle (défaut sur mobile)

Grille 3×4 des 12 mois, tous visibles sans scroll (ou minimal).

**Chaque cellule de mois :**
- Nom du mois abrégé en haut (gras, 11px)
- Liste d'événements : dot coloré (5px, couleur du `primary_tag`) + nom tronqué (8px)
- Max 2 événements affichés, "+N" si davantage
- Mois vides : tiret gris, opacity réduite (0.5)
- Mois courant : outline `hsl(30 60% 55% / 0.3)`, nom du mois en couleur primaire

**Header :**
- Titre "Calendrier" à gauche
- Nav année ‹ 2026 › à droite (chevrons, même style que desktop)

**Filtres :** même barre que desktop (Mes événements, Amis pro, Amis visiteurs), positionnée sous le header.

**Interaction :** tap sur une cellule de mois → bascule en vue mois détaillée pour ce mois.

**Couleurs des dots** — réutiliser le mapping `TAG_COLORS` existant dans `CalendarMonth.tsx`.

## Vue Mois (détaillée)

S'affiche quand on tape un mois depuis la vue annuelle.

**Header :**
- Titre "Calendrier" + nav année (identique)
- Sous-header : chevrons ‹ Juillet › pour naviguer entre mois (même style que la nav année)

**Bouton retour :** lien discret "◻ Vue annuelle" pour revenir à la grille 3×4.

**Liste d'événements — gélules compactes :**
- Fond : couleur du tag en opacity 0.08 (ex: `hsl(24 72% 50% / 0.08)`)
- Border-radius : 14px
- Si l'événement a une `image_url` : miniature carrée 44px à gauche (object-fit cover)
- Si pas d'image : gélule sans miniature (padding gauche normal)
- Contenu : nom (13px bold, tronqué), date abrégée + ville en dessous (10px, gris)
- Icône de statut à droite (18px cercle, fond pastel) :
  - ✓ inscrit → vert `hsl(152 50% 38%)`
  - ● en_cours → bleu `hsl(210 60% 50%)`
  - ○ interesse → orange `hsl(30 80% 50%)`
- Chaque gélule est un `Link` vers `/evenement/:id`

**Mois vide :** message centré "Aucun événement ce mois-ci"

## Architecture

**Nouveaux composants :**
- `src/components/calendar/MobileYearGrid.tsx` — grille 3×4 des 12 mois
- `src/components/calendar/MobileMonthView.tsx` — vue mois avec gélules compactes

**Modifications :**
- `src/pages/Calendar.tsx` — détecter mobile (`< 640px`) et afficher les composants mobiles. State `mobileView: 'year' | 'month'` + `selectedMonth: number`.
- `src/pages/Calendar.css` — styles pour `.mobile-year-grid`, `.mobile-month-view`, `.mobile-event-pill`. Masquer les composants mobile sur desktop et inversement.

**Données :** réutiliser `slidingMonths` existant (déjà fusionné avec les amis). Pas de nouveau hook.

## Hors scope

- Pas de swipe gesture
- Pas de changement sur desktop (>= 640px)
- Pas de refactoring des composants desktop existants
- Les filtres (Mes événements, Amis pro, Amis visiteurs) gardent le même comportement
