# Fiche Événement — Redesign Spec

## Objectif

Refondre la page événement (`EventPage.tsx`) pour en faire le **cockpit central** de l'exposant. Séparation claire entre ce qui est vu par le public, par les amis, et par soi-même. Design moderne, aéré, adapté mobile.

## Layout Desktop

### Hero compact (haut de page)

Deux éléments côte à côte :

- **Gauche** : Affiche portrait grande (~220×310px, `aspect-ratio: 2/3`, `max-height: 400px`, `border-radius: 16px`, ombre portée). Si pas d'image, placeholder avec icône.
- **Droite** : Bloc info vertical :
  - Tags (primary_tag en badge coloré + tags secondaires)
  - Titre (`text-2xl font-extrabold`)
  - Infos : dates, lieu (ville + département), deadline inscription, nombre participants + amis
  - Badges statut + paiement inline (pills colorées, mêmes que le stepper du dashboard)
  - Liens d'action : S'inscrire, Site web, Contact email (boutons outline)
  - Note d'inscription (si présente, encart muted)

Bouton "modifier" (crayon) en haut à droite, visible uniquement pour les exposants.

### Séparateur

Ligne horizontale subtile (`border-border`).

### Deux colonnes

#### Colonne gauche (flex: 1) — Contenu public + amis

**Section "🌍 Infos publiques"**
- Label uppercase coloré (primary)
- Card blanche avec description de l'événement

**Section "👥 Amis sur ce festival"**
- Label uppercase coloré (violet/accent)
- Card blanche avec les amis en **ligne horizontale** (scroll horizontal si beaucoup)
- Chaque ami : avatar rond (40px, photo réelle ou initiale gradient), nom en dessous, statut coloré (Intéressé = orange, En cours = bleu, Inscrit = vert)
- Clic sur un ami → vers son profil

**Notes et Avis — côte à côte (flex row, gap-12px)**

- **Notes** (gauche) : Label "📝 Notes (N)", card blanche, liste des notes avec avatar auteur + contenu + date. Formulaire d'ajout en bas.
- **Avis** (droite) : Label "⭐ Avis (N)", card blanche, score global (gros chiffre) + détail par critère (affluence, organisation, rentabilité). Bouton "Donner mon avis" si événement passé.

#### Colonne droite (width: 240-260px, sticky) — Dashboard privé 🔒

Card avec fond chaud (`bg-amber-50/30` ou `#fef9f3`), bordure douce, `border-radius: 14px`, `position: sticky; top: 20px`.

**Titre** : "🔒 Mon suivi" (uppercase, muted)

**Stepper Participation** :
- Label "Participation"
- 3 boutons radio en ligne : Intéressé / En cours / Inscrit
- Le statut actif = fond primary + texte blanc
- Les statuts avant l'actif = fond primary/20 + texte primary
- Les statuts après = fond muted + texte muted

**Encadré éphémère** (apparaît au changement de statut, disparaît après 5s ou au clic) :
- Fond teinté selon le statut, bordure légère, border-radius: 8px
- **Intéressé** (orange) : "Tes **amis** peuvent voir que tu t'intéresses à cet événement. Tu recevras les notifications de mise à jour."
- **En cours** (bleu) : "Tes **amis** voient que tu es en cours d'inscription. Tu recevras les notifications de mise à jour."
- **Inscrit** (primary/warm) : "Ton **public** peut voir que tu participes. L'événement apparaît sur ton **calendrier live**."

**Stepper Paiement** (visible uniquement si inscrit) :
- Label "Paiement"
- 3 boutons radio : À payer (rouge si actif) / En cours (ambre si actif) / Payé (vert si actif)

**Séparateur** (ligne pointillée)

**Notes perso** :
- Label "Notes perso"
- Textarea libre (sauvegarde auto ou au blur)
- Données stockées dans `participation.payments` JSONB ou un nouveau champ `private_note`

**Actions** :
- Bouton "📝 Bilan post-événement" (si événement passé)
- Bouton "Retirer ma participation" (destructive/rouge)

### Première visite (pas encore de participation)

Le dashboard privé affiche un bloc d'appel à l'action :
- **Exposant** : "Tu y vas ?" + 3 boutons (Intéressé / En cours d'inscription / Inscrit)
- **Public** : "Tu y vas ?" + 2 boutons (Intéressé / J'y vais !)

Au clic, la participation est créée et le dashboard se remplit.

### Vue Public (compte non-exposant)

- Même hero + colonne gauche
- Dashboard privé simplifié : juste le statut (Intéressé / J'y vais !), pas de paiement, pas de notes perso, pas de bilan

## Layout Mobile

Les deux colonnes ne tiennent pas côte à côte. Le contenu s'empile :

### Contenu scrollable

1. Hero (affiche + infos empilés verticalement, affiche pleine largeur `max-height: 300px`)
2. Infos publiques
3. Amis (scroll horizontal)
4. Notes et Avis (empilés verticalement, plus côte à côte)

### Barre sticky en bas

Le dashboard privé "Mon suivi" devient une **barre collante en bas de l'écran** (au-dessus de la BottomBar) :

- **État replié** : barre compacte montrant le statut actuel + paiement en badges, avec une flèche pour déplier
- **État déplié** : slide-up panel avec le contenu complet du dashboard (steppers, notes perso, actions)
- Z-index au-dessus du contenu, en dessous de la BottomBar

## Mode Édition

Quand l'exposant clique sur le crayon, le hero et les infos publiques passent en mode formulaire (comportement existant, inchangé). Le dashboard privé reste visible et fonctionnel pendant l'édition.

## Fichiers concernés

- `src/pages/EventPage.tsx` — Refonte complète du JSX (garder la logique/hooks existants)
- `src/pages/EventPage.css` — Nouveau fichier CSS dédié (comme Profile.css, Calendar.css)
- `src/components/events/EventDashboard.tsx` — Nouveau composant pour le dashboard privé
- `src/components/events/EventDashboardMobile.tsx` — Version mobile (barre sticky + panel)
- `src/components/events/FriendRow.tsx` — Composant pour la ligne d'amis horizontale

## Données existantes utilisées

- `event` : toutes les infos publiques (name, city, dates, tags, urls, image_url, contact_email, registration_note)
- `participation` : status, payment_status, visibility, total_cost, payments
- `friendCount` + amis individuels (à fetcher avec profils)
- `notes` : notes partagées entre amis
- `reviews` : avis avec scores détaillés
- `profile.type` : exposant vs public (conditionne l'UI)
