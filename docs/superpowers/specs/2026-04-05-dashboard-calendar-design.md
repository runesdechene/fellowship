# Dashboard & Calendar Redesign — Design Spec

## Dashboard `/dashboard`

Centre névralgique personnel. Pas un outil de planification — un fil d'actualité qui tient au courant.

### Sections (de haut en bas)

1. **Header** : "Salut, {brand_name} !" + sous-titre contextuel (ex: "Ta prochaine date est dans 3 jours")

2. **Prochaines dates** (max 3) : Cards horizontales avec :
   - Barre de couleur latérale (par primary_tag)
   - Nom de l'événement (serif)
   - Date + lieu
   - Countdown ("dans X jours") ou "En cours"
   - Lien vers la fiche
   - Si aucune date à venir : CTA "Explorer les événements"

3. **Tes amis bougent** : Liste compacte des dernières participations du réseau
   - Avatar initiale + "{nom} participe à {événement}"
   - Max 5, lien "Voir tout" vers /suivis
   - Si pas d'amis : CTA "Trouver des exposants"

4. **Derniers ajouts** : Deux sous-sections
   - "De ton réseau" : événements ajoutés par des gens suivis
   - "Sur Fellowship" : derniers événements ajoutés globalement
   - Affichés en EventCards compactes (image + nom + date + lieu), grille 2-3 colonnes
   - Max 6 par section

### Layout
- Utilise `.page-width` (max 1200px)
- Padding standard `p-4 sm:p-6 lg:p-8`

---

## Calendrier `/calendrier` (nouvelle page)

Vue annuelle full-width pour planifier sa saison.

### Layout
- **Pas de `.page-width`** — utilise toute la largeur disponible (padding horizontal seulement)
- Header : titre "Calendrier {année}" (serif) + sélecteur d'année (< 2025 | 2026 | 2027 >)
- Grille : `grid-template-columns: repeat(3, 1fr)`, gap 16px
- 4 rangées = 12 mois

### Chaque mois
- Card bg-card avec shadow
- Titre : nom du mois (serif) + badge compteur événements
- Grille de jours : 7 colonnes (Lun-Dim), numéros de jours
  - Jours avec événement : fond cuivre translucide, texte cuivre, border-radius
  - Jours normaux : texte muted
  - Aujourd'hui : cercle outline cuivre
- Liste d'événements sous la grille :
  - Barre de couleur latérale (3px, couleur par tag)
  - Nom (font-weight 600) + date courte + ville
  - Cliquable → lien vers `/evenement/{id}`

### Mois vides
- Même card mais `opacity-50`
- Juste le titre + grille de jours (pas de liste)

### Responsive
- Desktop : 3 colonnes
- Tablette : 2 colonnes
- Mobile : 1 colonne

### Navigation
- Ajouter "Calendrier" dans la sidebar (entre Dashboard et Explorer)
- Icône : `CalendarDays` de Lucide

---

## Fichiers impactés

### Nouveaux
- `src/pages/Calendar.tsx` — Page calendrier
- `src/components/calendar/CalendarMonth.tsx` — Composant mois individuel (grille jours + événements)

### Modifiés
- `src/pages/Dashboard.tsx` — Refonte complète
- `src/components/layout/Sidebar.tsx` — Ajout lien Calendrier
- `src/components/layout/BottomBar.tsx` — Ajout lien Calendrier
- `src/App.tsx` — Route `/calendrier`
- `src/hooks/use-events.ts` — Ajout hook pour "derniers événements ajoutés"
- `src/components/calendar/MonthCell.tsx` — Supprimé ou remplacé par CalendarMonth
- `src/components/calendar/YearView.tsx` — Supprimé ou remplacé

### Conservés tels quels
- `src/hooks/use-participations.ts` — Déjà utilisé pour les prochaines dates et amis
- `src/hooks/use-calendar.ts` — Adapter pour le nouveau CalendarMonth

---

## Couleurs des barres d'événements

Réutiliser le mapping tag → couleur :
- médiéval → cuivre (primary)
- geek → bleu
- marché → vert forêt (accent)
- salon → vert clair
- foire → ambre
- défaut → primary
