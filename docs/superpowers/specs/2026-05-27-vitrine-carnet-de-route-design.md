# Vitrine exposant → « Carnet de route »

> Spec validée le 2026-05-27 (maquette HD itérée v1→v12, validée visuellement par Uriel).
> Branche `feat/da-nuit-festival-socle`. Maquette de référence : `.superpowers/brainstorm/8160-1779874636/content/site-v12.html`.

## Pourquoi ce virage

La vitrine actuelle (Phases 1-3) est un **profil social riche** : galerie murale, « À propos » long, compteurs d'abonnés/compagnons en gros, pile de liens. En 2026, post-hype réseaux sociaux, ce format fait daté (« MySpace ») et **demande à l'artisan un travail qu'il fait déjà mieux ailleurs** (Instagram, sa boutique). Le wedge de Fellowship, c'est **l'événement** : où l'exposant va, où on le rencontre.

**Nouveau cadrage produit (métaphore d'Uriel) : la page = un carnet de route / passeport de voyage.** L'exposant *roule* de festival en festival ; sa page raconte son itinéraire. Identité minimale (page de garde), l'**agenda devient la star**, les événements passés deviennent des **tampons** (preuve d'un artisan actif, pas une archive morte).

Ce n'est **pas** un profil social — c'est une **fiche événementielle** qui sert aussi d'**embed iframe** sur le site perso de l'exposant.

## Structure de la page (de haut en bas)

### 1. Cover — bannière plein écran + fondu
`banner_url` en pleine largeur de la zone principale (full-bleed), hauteur ~300px, **dégradé vers le fond** en bas (l'image se fond dans la page). **Pas de badge « vérifié » pour l'instant** (aucun process de vérification réel aujourd'hui → YAGNI ; à réintroduire si on lance la vérification, cf. hors-scope).

### 2. Page de garde — identité minimale
Le contenu (max-width ~800px, centré) **remonte sur le bas du dégradé** (chevauchement ~64px) pour que l'identité apparaisse à la limite du fondu.
- **Avatar** : carré arrondi 112px, **bordure épaisse couleur du fond** (5px) + ombre portée.
- **Nom de marque** (pas de pastille vérifié pour l'instant).
- **Sous-titre** : `craft_type · city (department)`.
- **Punchline** : une phrase courte en italique (≤ ~140 car.) — **remplace l'« À propos » long**. (Champ : on réutilise `entities.bio` mais traité comme une punchline courte ; pas de pavé.)
- **Lien boutique** façon Instagram : lien **vert printemps** cliquable sous la punchline (icône maillon + hôte de l'URL). Source = 1er lien de `entities.links` (ou `website`).
- **Actions** (coin haut droit, alignées au nom) :
  - Propriétaire (`canEditVitrine`) : **✎ Modifier** (cuivre, primaire).
  - Visiteur : **＋ Suivre** (cuivre) — même emplacement.
  - Toujours : **icône Partager** (outline, icône seule) + **icône QR** (outline) — par-dessus la cover, bordure marquée, fond transparent.

### 3. Bande sociale — légère et cliquable (découverte)
Une pilule discrète : 3 avatars empilés + « **142 abonnés · 12 compagnons exposants** ». **Cliquable** → ouvre la liste pour naviguer vers d'autres profils (mécanique de découverte, pas de la vanité). Pas de gros compteurs.

### 4. 🧭 Prochaines escales — l'itinéraire (la star)
En-tête de section neutre « Prochaines escales · N dates », avec à droite **un petit bouton « Intégrer à mon site »** (icône `</>`, exporte l'embed de l'agenda).
Liste d'événements **à venir** (participations `inscrit`/`confirmé` avec `start_date ≥ now`, triées croissant). Chaque escale = une carte horizontale :
- **Date de début** comme ancre à gauche (jour + mois + année, neutre — pas de cuivre). Pas de date de fin ici.
- **Affiche en portrait** (`event.image_url`, ~86×116, recadrée).
- **Infos** : nom de l'événement ; **tags de l'événement** (emoji + couleur propre de chaque tag — c'est eux qui portent la couleur, pas le cuivre) ; **lieu avec pin** (`city · lieu`) ; **durée en jours** sous le lieu (calculée `end-start+1`) ; **preuve sociale** « N compagnons t'y retrouvent » avec mini-avatars (réutilise la logique amis/compagnons sur événement).
- Chevron → fiche événement.

### 5. 🎫 Sur la route depuis {année} — les tampons (passés)
En-tête « Sur la route depuis {1re année} · N escales ». Les événements **passés** (`start_date < now`) en **tampons** :
- Cercle = l'**affiche de l'événement recadrée en rond**, léger **fondu vintage** (désaturée, **sans teinte cuivre**), double anneau (intérieur + pointillé extérieur neutre), **année** incrustée au centre.
- Nom · ville dessous.
- **Hover** : le tampon se soulève, anneaux en **vert printemps**, l'affiche **reprend ses couleurs** (transition).
- « +N » pour voir tout le passé.

## Édition (mode « Modifier »)

Toggle propriétaire (`canEditVitrine`). En édition, **seule l'identité se saisit** ; l'agenda (escales/tampons) se peuple seul.
- Bouton **✎ Modifier** (cuivre) → **✓ Terminé** (vert forest) une fois en édition.
- **Cover** : bouton overlay « Changer la cover » → upload (bucket `entity-gallery`, préfixe `<actor_id>/cover/`).
- **Avatar** : overlay caméra → upload.
- **Champs directs** (pas de crayon, commit au blur) : nom, métier, ville, punchline, lien boutique.
- **Blocs auto atténués** (opacité ~0.4, non éditables) : bande sociale, escales, tampons — avec un bandeau d'aide « *tes escales et tes tampons se remplissent automatiquement depuis ton agenda* ».
- Réutilise `EditableText`, `useVitrineEdit`, `canEditVitrine` (déjà livrés v0.7.90). On retire l'éditeur de galerie et de liens multiples.

## Ce qui change vs la vitrine actuelle

| Élément actuel | Devient |
|---|---|
| Galerie murale (`entity_gallery`) | **Supprimée de la vitrine** (les affiches d'événements portent le visuel). Table/bucket conservés (non affichés) — décision de suppression backend hors scope. |
| « À propos » long (textarea) | **Punchline courte** (1 phrase) |
| Compteurs abonnés/compagnons en gros | **Bande sociale compacte cliquable** + preuve sociale **par escale** |
| Pile de liens (`LinkEditor`) | **1 lien boutique** (style Instagram) |
| Saison en colonne latérale (`VitrineSeason`) | **Escales** (itinéraire, pleine largeur, vedette) + **Tampons** (passés) |
| Badge « vérifié » (vert forest) | **Retiré pour l'instant** (pas de process de vérification) |

## Réutilisation / impact technique

- **Données** : escales & tampons viennent des **participations + events** (déjà dispo via `use-vitrine`/`useFriendsOnEvent`). Champs events utilisés : `image_url` (affiche portrait), `tags`, `city`/`department`, `start_date`/`end_date` (durée), `name`. Identité : `entities` (brand_name, craft_type, city, department, avatar_url, banner_url, bio→punchline, links→boutique). Colonne `verified` conservée en base mais **non affichée**.
- **Édition inline** : on **garde** le mode édition par toggle, `canEditVitrine` (membership), `useVitrineEdit`, `EditableText`, l'upload cover/avatar (bucket `entity-gallery`). On **retire** l'éditeur de galerie et le ChipEditor de spécialités du rendu vitrine (spécialités : à décider — soit retirées, soit déplacées). Éditable : cover, avatar, nom, métier, ville, punchline, lien boutique.
- **Embed iframe** : la page est pensée pour être embarquée. « Intégrer à mon site » réutilise/étend l'`EmbedModal` existant — mais cette fois l'embed = **l'agenda/escales** (et non l'ancien calendrier). En mode embed : pas de sidebar (déjà géré pour `/:slug`).
- **Composants** : refonte de `PublicProfile` + composants `src/components/vitrine/` (nouveaux : `VitrineEscales`, `VitrineTampons` ; `VitrineHeader` allégé ; `VitrineStats` → bande sociale compacte ; `VitrineGallery`/`VitrineLinks` retirés du rendu). `Vitrine.css` (dans `src/pages/`) retravaillé.
- **Palette** : cuivre **rare** (Modifier/Suivre, nav active). Le vert printemps `--lime` = accent secondaire (vérifié + lien boutique). La couleur vient surtout des **tags d'événement**.
- **DA jour/nuit** : tokens `hsl(var(--…))`, pas de `#fff`/`#000` en dur sauf overlays sur image (badge cover, etc.). Checklist jour/nuit à chaque composant.

## Hors scope / à trancher plus tard
- **Badge vérifié** : réintroduit seulement si on lance un vrai process de vérification (colonne `verified` déjà là, protégée par trigger).
- Sort des **spécialités** (`specialties`) : retirées du rendu ou recasées discrètement ?
- Suppression effective du backend galerie (`entity_gallery`/bucket) — laissé en place pour l'instant.
- Définition exacte de « compagnons exposants » dans la bande sociale (amis exposants ? co-exposants d'événements communs ?).
- Champ punchline dédié vs réutilisation de `bio` (on part sur réutilisation de `bio` court).
- Recadrage/orientation des affiches uploadées côté event (on consomme l'existant).

## Critères de succès
- Un visiteur comprend en < 5 s : qui, quoi, **où le rencontrer bientôt**, où acheter.
- Un exposant configure sa page en < 1 min (presque rien à remplir ; l'agenda se peuple seul).
- La page est belle embarquée en iframe sur un site perso.
- Zéro impression « réseau social 2015 ».
