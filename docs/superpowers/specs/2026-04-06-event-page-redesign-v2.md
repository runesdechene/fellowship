# Fiche Événement — Redesign v2 Spec

Inspiré de Lu.ma. Layout 2 colonnes continu du haut en bas. Colonne gauche étroite (260px = largeur poster), colonne droite large = flow continu titre → contenu.

## Layout Desktop — Structure unique 2 colonnes

### Colonne gauche (260px, sticky après le poster)

De haut en bas :

1. **Poster** — `width: 100%`, `aspect-ratio: 2/3`, `border-radius: 16px`, ombre portée. Placeholder gradient si pas d'image.
2. **Ajouté par** — Card blanche. Label uppercase "AJOUTÉ PAR". Avatar gradient + nom + métier (craft_type). Lien vers profil.
3. **Liens** — Card blanche. Label uppercase "LIENS". Liste verticale de boutons outline : S'inscrire (primary), Site web, Email contact. Chacun avec icône.
4. **Amis présents** — Card blanche. Label uppercase "AMIS PRÉSENTS". Liste verticale : avatar (36px) + nom + statut coloré (inscrit=vert, intéressé=ambre). Lien vers profil au clic.

Les éléments 2-4 sont dans un wrapper `position: sticky; top: 20px`.

### Colonne droite (flex: 1) — Flow continu

De haut en bas, sans interruption :

1. **Tags** — Badges : primary_tag (fond copper/10, texte copper) + tags secondaires (fond muted).
2. **Titre** — `font-size: 30px`, `font-weight: 800`, Jakarta Sans, `letter-spacing: -0.03em`.
3. **Meta-rows** — Chaque info = icône dans carré arrondi (38×38px, fond card, border) + texte à droite :
   - Calendrier → dates (primary) + durée (secondary)
   - MapPin → ville + département (primary) + région (secondary)
   - Clock → deadline inscription (primary) + "X jours restants" (secondary)
   - Users → "N participants dont N amis" (primary) + "Voir les participants" (secondary, cliquable → modal)
4. **Mon suivi** — Block inline avec header marqué (style Lu.ma : fond légèrement plus saturé, texte plus gros ou semi-bold, pas juste un label uppercase discret). Contenu :
   - Statut et Paiement côte à côte (flex row) avec steppers 3 boutons chacun
   - Actions en ligne : Notes perso, Bilan post-event, Se désinscrire (destructive)
   - Fond warm `hsl(36 50% 96%)`, border `hsl(30 25% 85%)`, `border-radius: 14px`
   - **Header du bloc** : texte plus visible que les autres labels — `font-size: 13px`, `font-weight: 700`, couleur copper ou foreground au lieu de muted. Légère bordure inférieure ou padding bottom pour séparer du contenu.
5. **Séparateur** — Ligne `1px`, couleur border.
6. **Notes partagées + Avis** — Côte à côte (flex row, gap 16px). Chacun dans une section-card blanche.
   - Notes : label "Notes partagées (N)", liste des notes avec auteur + date + contenu.
   - Avis : label "Avis (N)", score global (gros chiffre + étoiles) + résumé texte. Bouton "Donner mon avis" si événement passé + exposant.
7. **À propos** — Section-card blanche. Label "À propos". Description texte `white-space: pre-wrap`, `line-height: 1.7`, couleur atténuée.

### Première visite (pas de participation)

Le bloc "Mon suivi" affiche un CTA :
- Exposant : "Tu y vas ?" + 3 boutons (Intéressé / En cours / Inscrit)
- Public : "Tu y vas ?" + 2 boutons (Intéressé / J'y vais !)

### Style du header "Mon suivi"

Différent des labels discrets des autres sections. Plus marqué, comme sur Lu.ma :
- Font-size 13-14px, font-weight 700
- Couleur copper ou foreground (pas muted/gris)
- Padding-bottom + fine bordure inférieure dans le bloc, ou légère barre colorée à gauche

## Layout Mobile

Colonnes empilées :

1. Poster centré (width: 220px)
2. Tags + titre + meta (centrés)
3. Mon suivi (inline)
4. Amis présents (horizontal scroll)
5. Notes + Avis (empilés)
6. À propos
7. Ajouté par + Liens

## Mode Édition

Inchangé par rapport à l'existant. Bouton crayon en haut à droite (exposants uniquement). Formulaire inline remplace le hero + infos.

## Fichiers concernés

- `src/pages/EventPage.tsx` — Refonte du JSX, garder la logique/hooks
- `src/pages/EventPage.css` — Nouveau CSS
- `src/components/events/EventHero.tsx` — Supprimé, intégré directement dans EventPage
- `src/components/events/EventDashboard.tsx` — Adapté pour le format inline
- `src/components/events/FriendRow.tsx` — Adapté pour format vertical (gauche) + horizontal (mobile)

## Données existantes

Aucun changement de données. Même hooks, mêmes queries :
- `useEvent(id)` — infos publiques
- `participation` — statut, paiement
- `useFriendsOnEvent(id)` — amis sur l'événement
- `useEventNotes(id)` — notes partagées
- `useEventReviews(id)` — avis
- `profile.type` — exposant vs public

## Référence visuelle

Maquette validée : `.superpowers/brainstorm/9924-1775505826/content/event-page-luma-v4.html` avec ajustements :
- Ordre gauche : Ajouté par → Liens → Amis (pas Amis en premier)
- Notes + Avis au-dessus de À propos
- Header "Mon suivi" plus marqué visuellement
