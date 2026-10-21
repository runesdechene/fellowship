# L'arrivée d'une enseigne en sept étapes

> 21/10/2026 — maquettes validées par Uriel : `2391:65`, `2391:126` (étape 4), `2391:187`, `2391:260`
> (étape 5), `2392:65` (étape 6), `2392:271` (étape 7). Fichier Figma `9CmmBD3t5rAk4tD583cdN3`.

## Pourquoi

Une enseigne qui arrive repart aujourd'hui avec une vitrine sans visage, sans personne à suivre et un
« Pour toi » vide. Les trois nouvelles étapes la font entrer habillée, reliée et ciblée, et le code de
parrainage dit enfin s'il est bon.

## Le parcours

| Cas         | Étapes                                                                          |
| ----------- | ------------------------------------------------------------------------------- |
| `newEntity` | marque · métier · atelier · adresse · **design** · **festivals** · **exposants** |
| `new`       | marque · prénom · métier · atelier · adresse · design · festivals · exposants    |
| `nameOnly`  | prénom (inchangé)                                                               |

**La création a lieu en quittant l'étape design** (« Créer ma vitrine »). Les deux étapes suivantes
travaillent sur l'enseigne créée.

> **Révisé le 21/10/2026 (Uriel)** : les festivals passent avant les exposants — « un fest sert à
> croiser les gens ». Les exposants proposés sont ceux des mêmes festivals (« 2 festivals en commun »),
> puis du même métier, de la même région, et à défaut les inscrits récents (« Nouveau sur
> Fellowship ») : migration `20261021150000`. Sur l'étape festivals, le lien devient « Aucun de ces
> festivals ne m'intéresse, passer cette étape » ; « Commencer » termine l'étape exposants.

## Ce que fait chaque étape

### Adresse : le code de parrainage vérifié en direct

- Dès que le code a au moins 3 caractères, il est vérifié (avec un délai comme `useSlugFree`) par une
  nouvelle RPC `referral_owner(p_code text) RETURNS text`. Elle rend le nom de l'enseigne du parrain,
  ou `null`. Elle ne fait aucune écriture.
- Code inconnu : en rouge (`welcome__note--problem`), « Aucun code de parrainage trouvé. ». **Ça ne
  bloque pas** : le code reste facultatif.
- Code reconnu : en vert (`welcome__note--free`), « ✓ Code de {parrain} : ton essai Pro passe à 30
  jours si tu l'actives dans tes réglages. » Texte d'Uriel ; il décrit l'essai Stripe de 30 jours au
  lieu de 14.
- Code vide : la phrase actuelle, inchangée.
- Le bouton dit « Continuer » : ce n'est plus la dernière étape avant la création.

### Design : la photo et la bannière (avant la création)

- Deux cadres de dépôt « Déposer une image, ou cliquer pour choisir », marqués « facultatif ». Une
  image choisie devient une ligne : vignette, nom du fichier, « Changer ».
- La vitrine en direct (`WelcomePreview`) affiche tout de suite la photo et la bannière, par une URL
  locale (`URL.createObjectURL`).
- Les fichiers restent en mémoire : un rechargement les perd, et c'est accepté (un fichier ne se garde
  pas en `sessionStorage`).
- « Créer ma vitrine » crée l'enseigne (`create_owned_entity`), attribue le parrainage, envoie les
  images, écrit le prénom. L'envoi reprend ce que fait le mode édition de la vitrine : `upload` de
  `useVitrineEdit.ts` (bucket `entity-gallery`, réduction `resizeImage`, contrôle `imageProblem`), sorti
  dans `lib/` pour servir aux deux. Puis `entities.avatar_url` et `banner_url` sont écrits.
- Une image qui échoue ne bloque pas la création : l'enseigne existe, la vitrine se complète plus tard.

### Exposants : « Tu les connais peut-être »

- Jusqu'à 12 exposants, rendus par une nouvelle RPC
  `welcome_exhibitors(p_actor uuid) RETURNS TABLE(id uuid, name text, avatar text, slug text, city text, craft text, reason text)`,
  dans cet ordre : même métier (`craft_type`, comparé sans casse ni accents), puis même département.
  On exclut l'enseigne elle-même et les comptes déjà suivis.
- La raison sous le nom : « Même métier », ou « Près de chez toi ».
- « Suivre » ↔ « Suivi ✓ » insère ou retire une ligne de `follows`, comme la Communauté. Le suivi part
  au clic, pas à la fin.
- « Continuer » passe à l'étape suivante, qu'on ait suivi ou non. Pas de « Retour » : l'enseigne existe
  déjà.

### Festivals : « Ces festivals t'intéressent ? »

- Jusqu'à 12 festivals publics (`is_private = false`) des douze prochains mois, rendus par une nouvelle
  RPC `welcome_festivals(p_actor uuid)` : ceux du département d'abord, puis les plus repérés ou
  inscrits.
- « Ça m'intéresse » ↔ « Intéressé ✓ » écrit ou retire une participation `interesse`, l'upsert déjà
  utilisé par l'Explorer : le festival devient **repéré** et nourrit « Pour toi ».
- Deux sorties : « Commencer », et le lien « Aucun de ces festivals ne m'intéresse, commencer quand
  même ». Les deux terminent l'arrivée.

### La fin

Comme aujourd'hui : `reloadIdentity`, `switchActor` sur la nouvelle enseigne, `clearWelcome`, puis
`retour` ou la page par défaut. **Ce n'est fait qu'à la fin de l'étape festivals** : relire l'identité
plus tôt ferait sortir `WelcomeRoute` de l'arrivée (l'enseigne existe), et les étapes 6 et 7
disparaîtraient.

## Mise en page

- Étapes 1 à 5 : le gabarit actuel, formulaire à gauche et vitrine en direct à droite.
- Étapes 6 et 7 : pas de vitrine en direct ; la grille de cartes prend la largeur.
- Deux composants nouveaux et réutilisables, **dessinés sur les maquettes `2363:2` et `2363:14`**
  (« Carte personne », « Carte date ») : `PersonCard` et `DateCard` dans `components/ui/`, chacun avec
  son CSS. `DateCard` affiche l'affiche par `Poster`.
- Sur téléphone, les grilles se replient (deux colonnes). Il n'y a pas de maquette téléphone : c'est
  mon choix, à montrer à Uriel.

## Hors périmètre

- Aucune liste de goûts ni table nouvelle : l'intérêt passe par les participations existantes.
- Pas de recadrage de la bannière à l'arrivée : il reste en mode édition de la vitrine.
- Pas de nouvelle mécanique de parrainage : seulement la vérification et la phrase.

## Base de données

Une migration, trois fonctions `SECURITY DEFINER` (`search_path = public`), accordées à
`authenticated` :

- `referral_owner(p_code)` : même normalisation que `attribute_referral` (majuscules, sans espaces),
  `referral_codes` joint au nom de l'enseigne. N'expose qu'un nom d'enseigne déjà public.
- `welcome_exhibitors(p_actor)` et `welcome_festivals(p_actor)` : gardées par `can_act_as(p_actor)`.

Les colonnes et les jointures se vérifient sur la définition live (`information_schema`, graphe), pas de
mémoire.

## Ce qui se vérifie

- `lib/welcome.ts` : les nouvelles étapes et leur validité, testées (`welcome.test.ts`).
- Le parcours entier dans le navigateur, sur `/bienvenue?nouvelle-enseigne`, avec une vraie création :
  le code faux et le bon, deux images, un suivi, deux festivals, puis l'enseigne relue en base.
