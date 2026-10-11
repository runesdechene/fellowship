# Lot 10a — La connexion et l'arrivée d'un exposant (V2)

> 11/10/2026. Premier des trois sous-lots du lot 10 (10a connexion et arrivée, 10b ajouter une
> date, 10c modifier un événement). Conception et maquettes validées par Uriel le 11/10/2026.

## Pourquoi

La V2 ne sait pas accueillir quelqu'un de nouveau. Sa connexion refuse toute adresse inconnue
(`shouldCreateUser: false`) : seule la V1 crée des comptes, et c'est elle qui demande le prénom et
crée l'enseigne. Tant que la V2 n'a pas sa porte d'entrée, elle ne peut pas remplacer la V1 (lot 12),
et « Créer un compte exposant » manque dans les Réglages (lot 9b).

## Décisions (Uriel, 11/10/2026)

1. **Le même e-mail connecte un habitué ou crée le compte d'un nouveau venu.** Un code à 6 chiffres,
   pas de mot de passe. L'écran du code ne dit pas sa durée de validité.
2. **Deux comptes, une seule démarche.** Le compte personnel naît au premier code (déclencheur
   `handle_new_user`, déjà en place) ; l'arrivée crée ensuite l'enseigne, accrochée à lui, et en fait
   le compte actif.
3. **L'arrivée demande la marque d'abord, puis le prénom** (« Et toi, qui tiens le stand ? »), avec
   l'aperçu de la façon dont on apparaît dans le réseau : « Uriel de Atelier Sauvage ».
4. **Les comptes existants sans enseigne (anciens festivaliers) entrent tels quels.** Seul un prénom
   manquant est demandé.
5. **Le code de parrainage reste**, facultatif, à la dernière étape.
6. **Le mur de la connexion montre de vrais chiffres**, arrondis.
7. **« Créer un compte exposant »** reprend l'arrivée, sans le prénom.

## Les maquettes — elles font foi

- `2027 — Connexion` (`2100:2`) et `… · code` (`2100:38`) : formulaire à gauche, mur d'affiches à
  droite, « Le réseau qui fait tourner les festivals » et ses deux chiffres.
- `2027 — Bienvenue · ta marque (étape 1)` (`2102:72`), `… · ton prénom (étape 2)` (`2244:2`),
  `… · ton adresse` (`2244:53`) : « Retour » (sauf à l'étape 1), la barre de 5 étapes, « Ton enseigne
  · étape N sur 5 », un titre en serif, un champ, « Continuer » ; à droite, « Ta vitrine, en direct ».
- Les étapes 3 (métier) et 4 (ville) suivent le gabarit de l'étape 1, sans maquette propre.

## Ce que le lot livre

### 1. La connexion (`/connexion`)

**Étape e-mail** : « Bienvenue sur Fellowship », « Ton e-mail suffit : on t'envoie un code, pas de
mot de passe à retenir. », champ « E-mail », bouton « Recevoir mon code → », « Nouveau ? Le même
e-mail crée ton compte en quelques secondes. » En pied de page : « En continuant, tu acceptes les CGU
et la Politique de confidentialité » (liens vers les pages légales).
`signInWithOtp` passe à `shouldCreateUser: true`.

**Étape code** : « ‹ Changer d'e-mail », « Ton code », « Envoyé à {e-mail}. » ; six cases — chaque
chiffre avance d'une case, Retour arrière recule, un code collé remplit toutes les cases, et le code
complet se vérifie seul. « Pas reçu ? Regarde dans tes indésirables, ou renvoie un code dans {N} s »
(décompte de 60 s, puis le lien « renvoie un code »). Un code faux : « Ce code ne marche pas.
Vérifie-le, ou renvoie-en un. », les cases se vident, le focus revient à la première.

**Le mur** : les affiches des festivals publics à venir (au plus 12, triés par date de début, ceux qui
ont une affiche), en colonnes qui défilent lentement (immobiles avec `prefers-reduced-motion`).
Dessous : « Le réseau qui fait tourner les festivals » et « {N} festivals et marchés · {M} exposants
indépendants », comptés en base à l'affichage : les événements publics, les enseignes de type
exposant. **Arrondi** : à la dizaine inférieure sous 1 000, à la centaine inférieure au-delà
(110 → « 110 », 44 → « 40 », 1 234 → « 1 200 »). La page est vue sans compte : la lecture passe par
ce que le rôle anonyme peut déjà lire (`anon_read_events`, colonne `type` des enseignes) ; si ce
n'est pas suffisant, une fonction `login_wall()` qui ne rend que ces affiches et ces deux nombres.
Une lecture ratée : le mur reste uni, sans chiffres (jamais « 0 »).

Sur téléphone, le mur disparaît ; le formulaire prend toute la largeur.

### 2. L'arrivée (`/bienvenue`)

**Qui y passe** : après la connexion, tout compte **sans prénom** (`users.display_name` vide) y est
envoyé avant d'entrer, quelle que soit l'adresse demandée (on y revient après).
- **Pas d'enseigne** (un nouveau compte) : les 5 étapes.
- **Une enseigne déjà là** : la seule étape du prénom.
- **Un prénom déjà là** : on n'y passe jamais (anciens festivaliers compris).

**Les 5 étapes** (« Ton enseigne · étape N sur 5 », sauf l'étape 2 : « Toi · étape 2 sur 5 ») :

| Étape | Titre | Champ(s) | Règle |
| --- | --- | --- | --- |
| 1 | Comment s'appelle ta marque ? | Nom de la marque | obligatoire, 60 caractères au plus |
| 2 | Et toi, qui tiens le stand ? | Ton prénom | obligatoire, 60 au plus ; aperçu « C'est ainsi qu'on te verra dans le réseau : » + une ligne d'activité « **{prénom} de {marque}** a ajouté Les Aventuriales » |
| 3 | Que fabriques-tu ? | Ton métier (« Maroquinerie », « Céramique »…) | facultatif, 60 au plus |
| 4 | Où est ton atelier ? | Ville, Code postal | ville facultative ; code postal 5 chiffres ou vide ; le département se déduit du code postal |
| 5 | Ton adresse sur Fellowship | Ton adresse (`flw.sh/…`), Un code de parrainage ? Facultatif | l'adresse se pré-remplit depuis la marque tant qu'on ne l'a pas touchée ; règles de l'éditeur de vitrine (`lib/vitrine-edit.ts` : `cleanSlug`, `slugProblem`, adresses réservées) ; vérifiée pendant la frappe (« ✓ Libre — tu pourras la changer plus tard » / « Déjà prise ») ; bouton « Créer ma vitrine → » |

« Continuer » ne s'allume que si l'étape est valable ; Entrée continue. « Retour » revient à l'étape
d'avant sans rien perdre. Les réponses vivent dans l'adresse de la page (`?etape=N`) et en mémoire
de session : un rechargement garde l'étape et les réponses.

**La vitrine, en direct** (à droite) : bannière en filigrane, rond aux initiales de la marque, nom
de la marque (pâle tant qu'il est vide), « {métier} · {ville} ({département}) » dès qu'ils existent,
sinon « Ton métier et ta ville viendront aux étapes suivantes », et `flw.sh/{adresse}` sous la carte.
Le composant de vitrine existant n'est pas réutilisé tel quel (il lit une vitrine en base) ; c'est
un aperçu dédié, `WelcomePreview`.

**À la fin** (« Créer ma vitrine ») :
1. le prénom s'écrit dans `users.display_name` (si l'étape existait) ;
2. l'enseigne se crée d'un seul coup par `create_owned_entity` (type exposant, marque, métier,
   ville, département, code postal, adresse) — la fonction existe et crée aussi l'appartenance
   « owner » ;
3. le parrainage s'attribue s'il y a un code (`attribute_referral`, sans bloquer s'il échoue) ;
4. l'identité est relue, l'enseigne devient le compte actif ;
5. on arrive sur le tableau de bord (ou l'adresse demandée au départ).

Une adresse prise entre-temps (erreur 23505) ramène à l'étape 5 avec « Déjà prise ». Tout autre
échec : « La création n'a pas abouti. Réessaie. », rien n'est perdu.

**Seulement le prénom** (une enseigne existe déjà) : un écran unique sur le gabarit de l'étape 2,
avec l'aperçu sous le nom de l'enseigne active, et « Entrer → ».

### 3. Créer un compte exposant

`/bienvenue?nouvelle-enseigne` : les étapes 1, 3, 4 et 5 (le prénom est déjà connu), « Ton enseigne
· étape N sur 4 ». On y arrive par une ligne « + Créer un compte exposant » en bas de la section
« Enseignes et abonnement » des Réglages (maquette `2206:691`), et par une entrée du menu « Moi » sur
téléphone. À la fin, la nouvelle enseigne devient le compte actif, retour aux Réglages.

### 4. Ce qui ne change pas

La V2 reste réservée aux admins jusqu'à la bascule (lot 12) : un nouveau venu qui n'est pas admin
est renvoyé vers la V1 une fois connecté. Le lot prépare la porte ; elle s'ouvre au lot 12.
La V1 continue de créer des comptes de son côté.

## Comment c'est construit

- `pages/Login.tsx` réécrit (deux étapes, même page) + `components/ui/CodeInput.tsx` (les six cases)
  + `features/login/PosterWall` (le mur, sa lecture) ; `login.css` réécrit.
- `features/welcome/` : `WelcomePage` (les étapes), `useWelcomeDraft` (réponses, étape, adresse de
  la page), `WelcomePreview` (la vitrine en direct), `ActivityPreview` (la ligne « X de Y »).
- `lib/welcome.ts` (pur, testé) : les étapes selon le cas (`welcomeSteps`), la validité d'une étape,
  le département d'un code postal, l'arrondi des chiffres du mur, les initiales.
- Le garde d'arrivée vit dans `ProtectedRoute` (`App.tsx`) : personne connue sans prénom →
  `/bienvenue?retour=<adresse demandée>`.
- Pas de `users.handle` : la V2 ne s'en sert pas (la V1 le pose à son arrivée ; la colonne accepte le
  vide).

## Vérification

- Tests : `welcomeSteps` (nouveau compte, prénom seul, nouvelle enseigne), validité de chaque
  étape, département d'un code postal (Corse, DOM), arrondi du mur, initiales.
- Navigateur, en local : le parcours complet sur un **compte de test jetable**, marqué admin le
  temps de l'essai (la V2 est réservée aux admins), puis supprimé par `delete-account` ; vérification
  en base de l'enseigne, de l'appartenance, du prénom et du parrainage. Les six cases (frappe, collage,
  retour arrière). « Créer un compte exposant » sur le compte de test. Jamais sur un compte réel.
- Mur : chiffres réels, lecture sans compte (fenêtre privée).

## Hors de ce lot

- Ajouter une date (10b), modifier un événement (10c).
- La photo de profil et le logo à l'arrivée (ils se règlent ensuite : Réglages, vitrine).
- Les comptes festivaliers nouveaux : il n'y en a plus (décision du 07/10/2026).
- Ouvrir la V2 aux non-admins (lot 12).
