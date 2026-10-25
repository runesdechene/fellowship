# Les fiches pour Google — conception

> 23/10/2026. Plan de bataille (vault, `Plan de bataille.md`), Front 1, étapes 2 et 3.

## Pourquoi

Le relevé du 23/10/2026 : zéro impression en Search Console, une seule fiche indexée (une adresse
de la V1). Chaque fiche sert à Google **le même HTML** : le titre et la description de la landing,
puis une `div` vide que React remplit. `robots.txt` et `sitemap.xml` n'existent pas : Netlify rend la
page de l'app à leur place. Or sur « festival fantastique bretagne exposant » ou « fenrir festival
avis exposants », la première page de Google ne montre **aucun annuaire** : le terrain est libre, et
nos fiches ont ce que personne n'a (les avis d'exposants).

**Réussi quand** : chaque fiche publique a sa propre adresse lisible, et Google reçoit, dès la
première réponse du serveur, son titre, sa description, son adresse canonique et ses données
d'événement ; toutes les fiches publiques sont listées dans un sitemap déclaré par `robots.txt`.

## Décidé avec Uriel

- **L'adresse** : `/evenements/<slug>` — au pluriel (Uriel, 23/10/2026).
- **Le slug** : `nom-annee`, par exemple `terres-de-rohan-2027`. La ville ne s'ajoute qu'en cas de
  collision (deux fiches du même nom la même année). Une année déjà présente à la fin du nom
  (« Fenrir 2027 ») n'est pas doublée.
- **Le slug ne suit pas le nom** : une nouvelle édition est une nouvelle fiche, une fiche ne se
  renomme pas (Uriel : « pourquoi il renommerait la fiche de l'année précédente ? »).
- **Le slug suit toujours l'année de la date de l'événement** (Uriel, 23/10/2026) : si
  `start_date` change d'année, le slug est recalculé (`fenrir-2027` → `fenrir-2028`), et l'ancien
  redirige en 301 vers le nouveau.
- **Tous les slugs existants sont régénérés** au nouveau format.
- **Titre visé** (plan de bataille) : « Nom Année · avis d'exposants et candidature · Fellowship ».
- **Ce que la fiche montre sans compte** : décision du 23/10/2026 (maquette 2482:878) — la page
  servie à Google ne montre rien de plus que ce que voit le visiteur.

## Non-buts

- Pas de rendu serveur de toute l'app : React reste maître de la page ; le serveur ne fait que
  remplir la tête du document (titre, description, canonique, Open Graph, JSON-LD).
- Pas de pages par univers × région : étape 4, un chantier à part. Le fil d'Ariane reste sans liens.
- Pas de vitrines d'exposants dans le sitemap pour l'instant.
- Rien de privé ne sort : une fiche privée n'a pas de tête remplie, n'est pas dans le sitemap.

## Anti-buts

- **Du contenu différent pour Google et pour le visiteur** (cloaking) : la tête décrit ce que la
  page affiche, rien d'autre ; pas de détection de robot.
- **Une adresse qui casse** : tout lien existant (`/evenement/<id>`, `/e/<ancien-slug>`) continue
  d'aboutir à la fiche, en redirection permanente (301) vers la nouvelle adresse.
- Des données structurées qui mentent : `aggregateRating` seulement si la note est visible sur la
  page sans compte (elle l'est depuis le 23/10/2026), avec le même nombre d'avis.

## Comment (choix techniques de Claude, à relire)

1. **Base** : nouvelle règle de slug dans le trigger existant `events_set_slug`
   (`supabase/migrations/20260602190000_event_slug.sql`, définition live copiée entière). Une
   migration régénère les slugs de toutes les fiches. Le trigger recalcule aussi le slug quand
   l'année de `start_date` change. **Tout slug qu'une fiche a porté est conservé** (une table
   d'historique, ancien slug → fiche) : `/e/<ancien-slug>` et `/evenements/<ancien-slug>` redirigent
   en 301 vers le slug actuel.
   Unicité garantie par un index unique sur `slug`.
2. **App (V2)** : la route devient `/evenements/:slug`. `/evenement/:id` et `/e/:slug` deviennent des
   redirections vers elle. Tous les liens internes vers une fiche passent par un seul helper
   (`eventPath(event)`), qui n'existe nulle part ailleurs.
3. **Netlify Edge Function** sur `/evenements/*` : lit la fiche publique (Supabase, clé publique,
   lecture seule), et réécrit la tête de `index.html` — `<title>`, `meta description`,
   `link rel=canonical`, Open Graph (affiche en image), JSON-LD `Event` (nom, dates, lieu, image,
   description, `aggregateRating` si avis). Fiche introuvable ou privée : `index.html` inchangé, et
   l'app dit « introuvable ».
4. **Redirections 301** côté serveur pour Google : `/evenement/<id>` → `/evenements/<slug>`, et
   `/e/<slug>` → idem, par la même Edge Function (ou une seconde), pas seulement par React.
5. **`sitemap.xml`** : une Edge Function (ou une fonction Supabase) qui liste toutes les fiches
   publiques, avec `lastmod`. **`robots.txt`** : un fichier statique dans `public/` qui déclare le
   sitemap. Le sitemap se déclare ensuite dans la Search Console (Uriel, ou Claude par son Chrome).

## Réglé après la relecture du constructeur (choix de Claude)

- **Les sous-pages suivent** : `/evenements/<slug>/modifier`, `/historique`, `/historique/<version>`,
  `/avis`. `eventPath(event, sous-page?)` les produit toutes ; `/evenement/<id>/<reste>` redirige en
  301 vers `/evenements/<slug>/<reste>`, ancre comprise côté app. `/evenement/nouveau` (la création)
  n'est pas un identifiant : il devient `/evenements/nouveau`, et aucun slug ne peut valoir
  « nouveau » (il finit toujours par une année).
- **L'année** est celle de `start_date`, obligatoire en base : une fiche a toujours une année.
- **« Publique » = `NOT is_private`** : c'est le seul indicateur de visibilité d'une fiche.

## Laissé au constructeur

La description de la fiche dans la `meta` (premières phrases de la description, sinon une phrase
composée des dates et du lieu) ; l'emplacement exact des Edge Functions dans `apps/web-v2/` ; le
cache (court) des réponses de l'Edge Function ; la forme de la conservation des anciens slugs.
