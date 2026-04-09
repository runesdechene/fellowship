# Widget Embed — Calendrier intégrable

**Date :** 2026-04-09
**Statut :** Validé

## Problème

Les artisans exposants ont souvent un site web avec un calendrier d'événements qu'ils mettent à jour manuellement. Il est rarement à jour et souvent mal présenté. Fellowship connaît déjà leurs événements — on peut leur fournir un widget intégrable qui se met à jour automatiquement.

## Solution

Une page embed (`/:slug/embed`) affichable en iframe ou en lien direct. Design style Lu.ma : cartes horizontales empilées, grandes images, élégant. Souvent affichée en pleine page, elle sert aussi de vitrine Fellowship.

## Route

`/:slug/embed` — déjà existante dans App.tsx, on refait le composant `EmbedPage.tsx`.

Aucune authentification requise. Aucune nouvelle table Supabase.

## Paramètres URL

| Param    | Défaut    | Description                              |
|----------|-----------|------------------------------------------|
| `theme`  | `light`   | `light` ou `dark`                        |
| `max`    | `10`      | Nombre max d'événements affichés         |
| `accent` | `c87941`  | Couleur hex sans # pour les accents      |

## Data flow

1. Extraire `slug` de l'URL, strip le `@` si présent
2. Fetch profil par `public_slug` dans la table `profiles`
3. Fetch participations : `visibility = 'public'`, jointure `events(id, name, start_date, end_date, city, tags, image_url)`
4. Filtrer côté client : `start_date >= today` (uniquement événements à venir)
5. Trier par `start_date` croissant
6. Limiter à `max` résultats

## Design

### Header

- Avatar de l'artisan (rond, 32px) ou initiale sur fond dégradé cuivre
- Nom d'affichage (`brand_name` ou `display_name`) en bold
- Sous-titre : craft type + ville
- Pas de lien dans le header

### Cartes événements (empilées verticalement)

Chaque carte est un lien cliquable → `https://flw.sh/evenement/:id` (nouvel onglet).

Layout horizontal :
- **Gauche** : image de l'événement (carrée, ~110px). Si pas d'image, dégradé de couleur avec icône du tag principal
- Badge tag en glassmorphism positionné en bas de l'image (nom du premier tag)
- **Droite** : 
  - Nom de l'événement (font-weight 800, ~15px)
  - Date en couleur accent (ex: "12-14 avr") + lieu avec pin emoji
  - Lien "Voir l'événement →" en couleur accent

### Footer — Pub Fellowship

Bloc visible et soigné en bas de page (pas un simple texte discret) :
- Logo Fellowship (image ou SVG)
- Texte : "Calendrier propulsé par Fellowship"
- Lien vers le profil de l'artisan sur Fellowship (`https://flw.sh/@slug`)
- Bien espacé, sert de publicité pour la plateforme

### États vides / erreurs

- **Profil introuvable** : message centré "Profil introuvable"
- **Aucun événement** : icône calendrier + "Aucun événement à venir" + footer Fellowship
- **Chargement** : skeleton cards animées (2 placeholders)

### Thème dark

Quand `?theme=dark` :
- Background : `#1a1a1a`
- Cartes : `#242424`
- Texte principal : `#f0f0f0`
- Texte secondaire : `#888`
- Accent : paramètre `accent` ou cuivre par défaut

### Responsive

- La page s'adapte naturellement (max-width ~480px, centrée)
- Les cartes restent horizontales (image + texte) y compris sur mobile
- Sur très petit écran (<360px) : l'image passe à 80px de large

## Styles

CSS isolé dans `EmbedPage.css` — pas de dépendance à Tailwind ni aux variables CSS de Fellowship. Le widget doit s'afficher correctement en isolation totale dans un iframe.

Font-stack : `-apple-system, 'Inter', 'Plus Jakarta Sans', system-ui, sans-serif`

## Bouton "Intégrer mon calendrier"

Ajouté sur `PublicProfile.tsx`, visible uniquement quand le profil affiché est celui de l'utilisateur connecté.

- Bouton avec icône `<Code />` de lucide-react
- Texte : "Intégrer mon calendrier"
- Clic → modale avec :
  - Preview du snippet iframe
  - Bouton "Copier" qui copie dans le presse-papier
  - Snippet : `<iframe src="https://flw.sh/@{slug}/embed" width="100%" height="600" frameborder="0"></iframe>`
  - Note : "Collez ce code sur votre site pour afficher vos événements automatiquement"

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `src/pages/Embed.tsx` | Refaire le composant |
| `src/pages/EmbedPage.css` | Nouveau fichier de styles |
| `src/pages/PublicProfile.tsx` | Ajouter bouton "Intégrer" |

## Hors scope

- API JSON publique
- Personnalisation avancée (polices, border-radius, etc.)
- Analytics / tracking des vues embed
- Mode calendrier grille
