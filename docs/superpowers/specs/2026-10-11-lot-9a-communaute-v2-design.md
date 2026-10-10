# Lot 9a — La page Communauté (V2)

> 11/10/2026. Première partie du lot 9 (Communauté et réglages). Les Réglages sont nés avec le
> lot 8e (section Notifications) ; leurs autres sections viendront ensuite. Design et maquette
> validés par Uriel le 10-11/10/2026.

## Pourquoi

Fellowship est aussi le lieu de la communauté des exposants (`_État.md`, 08/10/2026). L'entrée
« Communauté » de la barre latérale est inerte depuis le début de la V2. La page doit d'abord
dire **ce que vit la tribu** de l'exposant, ensuite l'aider à **agrandir son réseau** tant que
la communauté est jeune.

## Décisions (Uriel, 10/10/2026)

1. **D'abord le fil** (ce que fait sa tribu), **ensuite les comptes à suivre** (agrandir son
   réseau). Trouver avec qui faire ses festivals reste servi par la fiche, « À venir » et
   « Pour toi ».
2. **Le fil** montre les **comptes suivis**, plus deux choses de **tout Fellowship** : les
   **arrivées** et les **nouveaux festivals**.
3. **Tous les nouveaux avis** de Fellowship entrent dans le fil : l'auteur est nommé pour un
   ami, « Un exposant » sinon. **Les avis ne sont pas réservés au Pro** : étoiles et commentaire
   pour tous. Le détail par critère reste dans la fiche, pour le Pro, comme le vend l'offre.
4. **Tout est gratuit** (« on fait payer ce qui vaut pour soi seul, jamais ce qui fait
   circuler »).
5. L'encart de comptes s'appelle **« À suivre »** — « Suggestions pour toi » est déjà le bloc de
   festivals du tableau de bord (lot 8d).

## La maquette — elle fait foi

`2027 — Communauté (10/10/2026)` (`2212:2`), copie à jour de `2027 — Communauté` (`2093:2`) :
barre latérale actuelle (Tableau de bord, Explorer, Calendrier, Communauté, Réglages), encart
« À suivre » et ses raisons.

## Ce que le lot livre

### 1. Le fil — `community_feed(p_actor uuid)`

Une fonction SQL (`SECURITY DEFINER`, `SET search_path = public`, `STABLE`), gardée par
`coalesce(can_act_as(p_actor), false)` (sinon erreur `42501`), révoquée de `PUBLIC` et `anon`,
accordée à `authenticated`. Elle rend au plus **80 lignes**, les **30 derniers jours**, de la plus
récente à la plus ancienne :

`(id text, kind text, occurred_at timestamptz, who_id uuid, who_name text, who_avatar text,
who_slug text, target_id uuid, target_name text, target_slug text, event_id uuid, event_name text,
event_city text, event_department text, event_start date, event_end date, event_image text,
stars int, comment text, detail text, companions jsonb)` — les `*_slug` ouvrent la vitrine.

| `kind` | Source | Qui | Champs |
|---|---|---|---|
| `arrival` | `actors.created_at` d'une **enseigne** exposant | tout Fellowship | `who_*`, `detail` = « maroquinerie, Nantes » (`craft_type`, `city`) |
| `going` | `participations.created_at`, statut programmé (`inscrit`, `confirme`, `en_cours`), `public`, ou `amis` pour un **ami** seulement (suivi dans les deux sens) | comptes suivis | `who_*`, `event_*` |
| `added` | `events.created_at`, festival public | tout Fellowship ; le créateur nommé s'il a un profil public (`actor_public`), sinon « Quelqu'un » | `who_*`, `event_*` |
| `review` | `reviews.created_at` | tout Fellowship | `event_*`, `stars` (moyenne des trois notes, arrondie), `comment` ; `who_*` **seulement** si l'avis n'est pas anonyme, que le lecteur n'est pas un compte festival, et que l'auteur est son **ami** (`are_friends`) — sinon NULL, et l'écran dit « Un exposant » |
| `follow` | `follows.created_at` | comptes suivis qui suivent quelqu'un | `who_*` (le suiveur), `target_id`, `target_name` (le suivi) |

**Jamais** : un festival privé, une participation `prive`, une participation `amis` montrée à un simple abonné (revue de sécurité du 11/10/2026), ni les gestes de l'acteur lui-même ou
de ses enseignes (`can_act_as(who_id)`), ni une arrivée de l'acteur lui-même. `id` est stable
(`kind || ':' || id source`), pour les clés de liste.

### 2. « Ça se rassemble » — dans la même lecture

Une ligne à part (`kind = 'gathering'`, hors du compte des 80) : le festival **public à venir**
où vont le plus de **comptes suivis** (participation programmée, `public`, ou `amis` pour un ami), que
l'acteur n'a **pas encore repéré** (aucune participation). Champs : `event_*`, `detail` = le
nombre de compagnons, et les 4 premiers compagnons (`companions jsonb` : `[{id, name, avatar}]`).
Au moins **2** compagnons, sinon rien. Égalité : le plus proche dans le temps.

### 3. « Où vous vous croiserez » — `crossing_dates(p_actor uuid)`

Les **3 prochaines dates programmées** de l'acteur où vont aussi des comptes suivis (même règle
de visibilité) : `event_*`, `companions` (le nombre). Rien → la carte ne s'affiche pas.

### 4. « À suivre » — `accounts_to_follow(p_actor uuid)`

**3 enseignes** que l'acteur ne suit pas, jamais lui-même ni ses enseignes, avec leur raison, de
la plus forte à la plus faible :

1. `followed_by` — suivies par des comptes qu'il suit (source : `get_follow_suggestions`) :
   « suivi par Tom » / « suivi par Tom et 2 autres » (le premier nom par ordre alphabétique) ;
2. `shared_dates` — croisées sur les mêmes festivals publics (source :
   `get_coevent_suggestions`) : « 8 dates en commun » ;
3. `nearby` — à défaut, les **arrivées des 60 derniers jours** du même département (code à deux
   chiffres, `department_code` du lot 8d) : « nouveau sur Fellowship ».

Champs : `id`, `name`, `avatar`, `city`, `reason jsonb`. Le **+** suit le compte (insert dans
`follows`, politique existante) ; la ligne s'efface et l'écran relit pour la remplacer.

### 5. L'écran `/communaute`

- Titre « Communauté », sous-titre « Ce que vit ta tribu, et les nouveaux festivals sur
  Fellowship. », filtres **Tout · Où ils vont · Avis · Réseau** dans l'adresse (`?voir=ou`,
  `?voir=avis`, `?voir=reseau` ; sans paramètre : Tout). Où ils vont = `going` + `added` ; Avis =
  `review` ; Réseau = `arrival` + `follow`.
- « Ça se rassemble » en tête (filtre Tout et Où ils vont), avec **Repérer** (participation
  `interesse`, comme ailleurs dans la V2).
- Le fil groupé **Aujourd'hui · Cette semaine · Plus tôt** (le groupement de la cloche), une
  ligne par `kind` comme la maquette ; un festival s'ouvre sur sa fiche ; un compte nommé ouvre
  sa vitrine quand il en a une ; **Suivre** sur une arrivée et sur la cible d'un `follow` (caché
  si déjà suivi).
- Colonne de droite : « Où vous vous croiserez », « À suivre ».
- Fil vide : « Suis des exposants pour voir ce qu'ils préparent. » au-dessus de « À suivre ».
  Erreur de lecture : « La communauté n'a pas pu être chargée. » (jamais un fil vide qui ment).
- Entrée **Communauté** active dans la barre latérale et la barre du bas.

### 6. « Activité du réseau » (barre latérale)

Elle lit désormais `community_feed` (les 4 premières lignes **hors avis**, comme aujourd'hui) et
gagne son **« Tout voir → »** vers `/communaute`. L'assemblage côté navigateur
(`useNetworkActivity`, `lib/activity.ts` s'il ne sert plus) est supprimé dans le même lot.

## Comment c'est construit

- **SQL** : une migration avec `community_feed`, `crossing_dates`, `accounts_to_follow`. Les
  sources V1 (`get_follow_suggestions`, `get_coevent_suggestions`) sont lues, pas modifiées.
- **`lib/community.ts`** (pur, testé) : lire les lignes (`readFeed`), filtrer par onglet
  (`feedFor`), dire une ligne (`feedPhrase` : « vient de rejoindre Fellowship — … », « va à »,
  « a ajouté un festival sur Fellowship », « a noté », « suit maintenant »), dire une raison de
  compte (`followReason`).
- **`features/community/`** : `CommunityPage.tsx`, `useCommunity.ts`, et un composant par carte
  (`Gathering`, `FeedItem`, `CrossingCard`, `ToFollowCard`).
- **CSS** : `3-components/community.css`, jetons dans `2-semantic.css`.

## Vérification

- Tests Vitest : `readFeed` (ligne mal formée ignorée), `feedFor` (chaque onglet), `feedPhrase`
  (chaque `kind`, avis sans auteur → « Un exposant », créateur inconnu → « Quelqu'un »),
  `followReason` (un, plusieurs, dates, nouveau).
- En base, **sans écrire** : `community_feed` lue pour Runes de Chêne et un compte neuf ; **aucun
  nom d'auteur d'avis hors amis** ; aucune participation `prive` ; la garde refuse un acteur
  étranger ; `accounts_to_follow` ne rend ni un compte déjà suivi ni soi-même.
- Dans le navigateur : les quatre onglets, Suivre, Repérer, le + d'« À suivre », « Tout voir »
  de la barre latérale ; capture à côté de `2212:2`.

## Hors de ce lot

- Le mobile de la page (avec le mobile des écrans restants).
- « Charger plus » au-delà de 80 lignes.
- Les messages privés et le covoiturage (ouverts dans `_État.md`).
- Les festivaliers.
- Les autres sections des Réglages (lot 9b).
