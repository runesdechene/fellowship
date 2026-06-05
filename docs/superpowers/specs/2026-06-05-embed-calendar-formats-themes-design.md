# Embed calendrier — formats adaptatifs + thèmes

**Date :** 2026-06-05
**Statut :** validé (brainstorming), prêt pour plan d'implémentation
**Périmètre :** front-end uniquement, **zéro changement backend**

## Problème

Le client (artisan) doit pouvoir intégrer son calendrier d'escales sur son propre
site sous **deux formats** :

- **Vignette** — petit widget dans une colonne / sidebar (~200–320px de large).
- **Pleine page** — page « Agenda » dédiée, grandes cartes.

Aujourd'hui l'embed existe (`/@slug/embed`, `Embed.tsx` + `EmbedModal.tsx`) mais :
- un seul rendu (grandes cartes), pas de version compacte ;
- snippet = `<iframe height="600">` **figé** : trop grand pour une vignette, ne grandit
  pas tout seul en pleine page ;
- thème clair/sombre via `?theme=` mais le client doit le deviner, et rien ne s'adapte
  au site hôte.

## Décisions (brainstorming)

| Sujet | Décision | Écarté |
|---|---|---|
| Sélection du format | **Deux snippets distincts** via `?view=mini\|full` (onglets dans la modale) | Auto-responsive selon largeur (imprévisible, dur à supporter) |
| Dimensionnement | **Iframe + `embed.js` hébergé** (auto-resize par `postMessage`), repli sur hauteur inline | Iframe pure figée ; widget JS injecté dans le DOM hôte (casse CSS) |
| Thème | **Clair / Sombre / Auto** ; Auto = `embed.js` lit le fond du site, repli `prefers-color-scheme` | Thème unique |

**Principe directeur :** l'iframe isolé (`EmbedPage.css`, sans Tailwind ni vars Fellowship)
reste la base — on capitalise dessus. `embed.js` est une **amélioration progressive** :
quand l'hébergeur du client bloque les `<script>` (Wix, Squarespace gratuit…), l'embed
reste utilisable grâce aux valeurs de repli inline.

## Architecture — 6 pièces

### 1. `src/lib/embed-params.ts` (nouveau, testé)
Fonction pure `parseEmbedParams(searchParams: URLSearchParams)` →
`{ view: 'mini' | 'full', theme: 'light' | 'dark' | 'auto', max: number, accent: string }`.

- `view` : `'mini'` ou `'full'`, **défaut `'full'`** (rétro-compat avec les iframes déjà
  posées sans param).
- `theme` : `'light' | 'dark' | 'auto'`, défaut `'light'`.
- `max` : clampé `[1, 50]`, **défaut `4` si `view=mini`, `10` si `view=full`**.
- `accent` : hex validé, défaut `#c87941`.

Extrait la logique de parsing aujourd'hui inline dans `Embed.tsx` → testable en unitaire
(conforme à la contrainte d'infra de test : on teste les fonctions pures, pas le rendu RTL).

### 2. `src/pages/Embed.tsx` (modifié)
- Utilise `parseEmbedParams`.
- Branche le rendu sur `view` :
  - `full` → cartes actuelles (inchangées).
  - `mini` → **lignes compactes** : header réduit (avatar + nom + sous-titre), puis N lignes
    `[ bloc date coloré ] [ titre + ville ]`, pas de grandes images, footer « propulsé par
    Fellowship ». Chaque ligne reste un `<a>` vers l'événement.
- **Reporte sa hauteur** au parent (voir Contrats postMessage).
- **Thème `auto`** : au montage, applique `prefers-color-scheme` comme valeur initiale ;
  écoute un message `theme` venant du parent et l'applique s'il arrive (override).

### 3. `src/pages/EmbedPage.css` (modifié)
Ajout des styles `.embed-mini` (lignes compactes), light + dark, **isolés** (mêmes
conventions que l'existant : pas de Tailwind, pas de vars Fellowship). Le bloc date utilise
l'accent. Rien ne touche aux styles `full` existants.

### 4. `public/embed.js` (nouveau, vanilla, ~40 lignes)
Loader sans dépendance, servi depuis notre origine, chargé sur le site du client.

- Au chargement : sélectionne tous les `iframe[data-flwsh-embed]`.
- **Auto-resize** (iframe → parent) : écoute `message`, valide
  `event.origin === 'https://flw.sh'` **et** `data.source === 'flwsh-embed'`, retrouve
  l'iframe par `contentWindow === event.source` (gère plusieurs embeds sur une page), pose
  `iframe.style.height = data.height + 'px'`.
- **Thème auto** (parent → iframe) : pour chaque iframe dont le `src` contient `theme=auto`,
  calcule le thème du site (remonte les ancêtres de l'iframe jusqu'à une `background-color`
  opaque → luminance → `light`/`dark`) et l'envoie à l'iframe quand celle-ci signale `ready`.
- Robustesse : try/catch autour du calcul de fond ; si introuvable, n'envoie rien (l'iframe
  garde son repli `prefers-color-scheme`).

### 5. `src/components/profile/EmbedModal.tsx` (réécrit)
- **Deux onglets** : « Vignette » / « Pleine page ».
- **Sélecteur de thème** : Clair / Sombre / Auto.
- Génère le snippet correspondant (src avec `view` + `theme`, hauteur de repli inline,
  `data-flwsh-embed`, + la ligne `<script src="https://flw.sh/embed.js" async>`).
- Mini-aperçu visuel par onglet + bouton « Copier » + lien « Voir en vrai »
  (`/@slug/embed?view=…`).
- Réutilise le pattern modale existant (`profile-qr-*`).

### 6. `netlify.toml` (modifié)
Ajout d'un override **avant** la règle `for = "/*.js"` immutable :
```toml
[[headers]]
  for = "/embed.js"
  [headers.values]
    Cache-Control = "public, max-age=3600"
```
→ les améliorations de `embed.js` se propagent sous 1 h au lieu d'être figées 1 an.
(`/embed.js` est un chemin plus spécifique que `/*.js` : Netlify lui donne la priorité.)

## Contrats postMessage

**Hauteur (iframe → parent), toujours actif :**
```js
window.parent.postMessage({ source: 'flwsh-embed', type: 'resize', height: <number> }, '*')
```
Émis au montage, à chaque changement de taille (`ResizeObserver` sur le conteneur) et au
`load` des images. Hauteur = donnée non sensible → cible `'*'` acceptable.

**Ready + thème (handshake), seulement si `theme=auto` :**
```
iframe  ──▶  { source:'flwsh-embed', type:'ready' }           (à parent, au montage)
parent  ──▶  { source:'flwsh-embed', type:'theme', theme }    (à iframe.contentWindow)
```
L'iframe valide `event.origin === 'https://flw.sh'` sur le message entrant `theme`.

## Snippets livrés

**Vignette, thème auto :**
```html
<iframe src="https://flw.sh/@rune-de-chene/embed?view=mini&theme=auto"
        data-flwsh-embed style="width:100%;border:0;height:360px"
        loading="lazy" title="Calendrier Rune de Chêne"></iframe>
<script src="https://flw.sh/embed.js" async></script>
```

**Pleine page, thème clair :**
```html
<iframe src="https://flw.sh/@rune-de-chene/embed?view=full&theme=light"
        data-flwsh-embed style="width:100%;border:0;height:600px"
        loading="lazy" title="Calendrier Rune de Chêne"></iframe>
<script src="https://flw.sh/embed.js" async></script>
```
Hauteurs de repli : `mini ≈ 360px`, `full ≈ 600px` (utilisées si `embed.js` est absent/bloqué).

## Sécurité

- `embed.js` ne fait confiance qu'aux messages `origin === 'https://flw.sh'` + `source === 'flwsh-embed'`.
- La page embed valide l'origine du message `theme` entrant.
- Aucune donnée sensible n'est échangée (hauteur, thème).
- `frame-ancestors *` déjà en place sur `/*/embed` (netlify.toml) — pas de changement.
- **Pas de Subresource Integrity (`integrity=`) sur le `<script src=embed.js>`** : c'est un
  script first-party volontairement mutable (cache 1 h, amélioration sans re-collage client).
  Un hash SRI casserait le script à chaque mise à jour. Décision assumée — ne pas « corriger ».

## Tests

- **Unitaire (pur)** : `embed-params.test.ts` — défauts par `view`, clamps `max`, validation
  `accent`, valeurs de `theme`/`view` invalides → défauts.
- **Manuel** :
  - `/@rune-de-chene/embed?view=mini` et `?view=full` (rendu).
  - `?theme=dark`, `?theme=light`, `?theme=auto` (+ `prefers-color-scheme` OS).
  - Page-hôte de test `embed-test.html` (hors build) : iframe + `embed.js`, vérifier
    l'auto-resize réel et la détection de fond clair vs sombre, et plusieurs iframes sur une
    même page.
  - Modale : copie des snippets, bascule d'onglets, sélecteur de thème, lien « voir en vrai ».

## Hors périmètre (YAGNI)

- Mode `view=auto` responsive selon la largeur du conteneur.
- Nouveaux paramètres de personnalisation (couleurs custom au-delà de `accent`, polices…).
- Vrai rendu calendrier en grille mensuelle (l'embed reste une liste d'escales).
- Tout changement backend / RPC.
