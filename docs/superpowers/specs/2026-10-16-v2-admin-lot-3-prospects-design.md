# V2 — Administration, lot 3 : les Prospects

> Validé en conversation avec Uriel le 16/10/2026. Maquettes : `Admin — Prospects` (`2343:2`) et le
> bloc « Prospect d'origine » de `Admin — Fiche d'une personne` (`2344:2`), fichier Figma
> `9CmmBD3t5rAk4tD583cdN3`. Suite du lot 2 (`2026-10-15-v2-admin-lot-2-comptes-design.md`).

## Pourquoi

Les commerciaux (des admins, pour commencer) démarchent des exposants et des festivals : sur les
salons, par Instagram, par e-mail depuis ProtonMail. Aujourd'hui rien ne garde la trace de qui a été
contacté, qui a répondu, qui s'est finalement inscrit. Le succès : un commercial ajoute ses contacts
au fil des jours (ou importe une liste), les travaille **sans jamais quitter le tableau**, et voit
qui finit par s'inscrire **sans le reporter à la main**.

## Ce qui est tranché

- **Un prospect n'est jamais un compte** : il vit dans sa propre liste. Pas d'inscription préremplie.
- **Pas de fiche prospect** : tout se modifie dans le tableau.
- Les e-mails partent de ProtonMail : **le statut de l'e-mail et le contact se saisissent à la main**.
- Le commercial crée les prospects **un par un** ; l'**import CSV** existe en plus.
- **La relance est un état** « À relancer », une case — pas une date.
- **Rapprochement** : automatique à l'inscription par e-mail ; un bandeau montre les autres
  correspondances (e-mail ou téléphone), confirmées d'un clic.
- **La suppression** : une corbeille au survol, en bout de ligne, avec confirmation (hors maquette,
  validée par Uriel).

## L'adresse

`/admin/prospects`, avec `?q=…&filtre=…&source=…&page=…`. Dans la barre latérale en mode admin,
« Prospects » (icône cible) vient sous « Comptes » (`ADMIN_ITEMS`, `Sidebar.tsx`).

## L'écran

**En tête** : « Prospects », « Les contacts à démarcher, et ceux qui ont déjà franchi le pas. »,
les boutons « Importer un fichier » (secondaire) et « Ajouter un prospect » (principal). Puis quatre
chiffres :

| Chiffre | Valeur | Dessous |
| --- | --- | --- |
| Prospects | le total | « +N cette semaine » (ajoutés depuis 7 jours) |
| Contactés | statut ≠ `pas_envoye` **ou** une date de contact | « N % » du total |
| Ont répondu | statut `repondu` | « N % des contactés » |
| Ont créé leur compte | reliés à un compte | « dont N en Pro » (une de ses enseignes est Pro, `lib/offer`) |

La maquette dit « +40 depuis le salon de Rennes » : ça ne se calcule pas de façon générique, on compte
par semaine.

**Le bandeau** n'apparaît que s'il y a des correspondances non rapprochées : « N prospects ont le
même e-mail ou téléphone qu'un compte Fellowship » · « Rapprocher coche « Compte créé » et relie le
prospect à la fiche de la personne. » · bouton « Voir et rapprocher ».

**Outils** : la recherche (nom, marque, e-mail, téléphone — sans accents ni casse, la même que les
Comptes), les filtres avec leur nombre, le menu « Source : toutes » (les sources existantes).

| Filtre | Règle |
| --- | --- |
| Tous | — |
| À contacter | ni contacté (voir ci-dessus) ni relié |
| Contactés | contacté |
| Ont répondu | statut `repondu` |
| Ont un compte | relié |
| À relancer | `a_relancer` coché |

50 lignes, triées par date d'ajout décroissante puis `id`, puis « Voir les suivants ».

**Colonnes** : Personne (nom, marque dessous) · Activité (activité · ville) · E-mail · Téléphone ·
Source · Contact (« Mail · 10 oct. ») · Statut e-mail (pastille : Pas envoyé gris creux, Envoyé gris,
Ouvert bleu, Répondu vert, Rebond brique) · Compte créé (case ; cochée, une icône lien mène à la
fiche de la personne) · Note (tronquée) · Relance (case « À relancer » ; cochée, le texte « À
relancer » en brique) · la corbeille au survol.

**Modifier dans le tableau** : un clic ouvre la cellule. Texte → un champ ; statut et canal → une
liste ; date du contact → un sélecteur de date ; « À relancer » → coché directement. On enregistre en
quittant le champ ou par Entrée ; Échap annule. Un échec rend l'ancienne valeur et dit pourquoi.
« Compte créé » : décocher défait le lien (confirmation) ; cocher n'est possible que depuis le
bandeau, qui sait à quel compte relier.

**Ajouter un prospect** insère une ligne vide en tête, le curseur dans le nom. Quittée sans aucun
champ rempli, elle disparaît sans rien écrire.

**Importer un fichier** : une fenêtre. On choisit un CSV (Excel ou Google Sheets) ; Papa Parse le lit
dans le navigateur. Les colonnes se reconnaissent à leur titre, sans accents ni casse : nom / prénom
/ personne, marque / enseigne, activité / métier, ville, e-mail / mail / courriel, téléphone / tel /
portable, source, note / commentaire. Une source commune peut être saisie pour tout le fichier (elle
ne remplace pas une source déjà présente dans une ligne). Un aperçu : « 42 prospects à ajouter, 3
déjà dans la liste (même e-mail), 1 ligne sans nom ni e-mail ignorée », puis « Importer ». Une ligne
garde au moins un nom, une marque ou un e-mail.

**Voir et rapprocher** : une fenêtre qui liste chaque correspondance — le prospect, le compte trouvé
(nom, e-mail), la raison (« même e-mail » ou « même téléphone ») — et un bouton « Rapprocher » par
ligne.

**Fiche d'une personne** : le bloc « Prospect d'origine » (icône lien, teinte bleue), seulement si un
prospect lui est relié : « Rapprochée par e-mail le 13 mars 2026 » (ou « par téléphone »), puis
« Source : … · contactée le … ». Il se place sous les Notes internes, comme sur la maquette.

## La base

Une migration additive. En tête, le pourquoi.

**Table `prospects`** (RLS : tout pour `is_admin()`, rien pour les autres ; `EXECUTE`/droits à
`authenticated` seulement)

| Colonne | Type |
| --- | --- |
| `id` | uuid, clé |
| `name`, `brand`, `activity`, `city`, `source`, `note` | text, null |
| `email` | text, null — index unique sur `lower(email)` quand non nul |
| `phone` | text, null |
| `contact_channel` | text, null — `mail`, `appel`, `salon`, `message` (check) |
| `contacted_on` | date, null |
| `email_status` | text, non nul, défaut `pas_envoye` — `pas_envoye`, `envoye`, `ouvert`, `repondu`, `rebond` (check) |
| `a_relancer` | boolean, non nul, défaut false |
| `user_id` | uuid, null → `users(actor_id)`, `on delete set null` |
| `linked_at` | timestamptz, null |
| `linked_by` | text, null — `email` ou `telephone` (check) |
| `created_at` | timestamptz, défaut `now()` |
| `created_by` | uuid, défaut l'appelant |

**Le téléphone se compare chiffres seuls** : une fonction `phone_key(text)` (immuable) garde les
chiffres, ramène `33…` à `0…` ; `06 41 22 18 90`, `+33 6 41 22 18 90` et `0641221890` donnent la même
clé. La même règle existe en TypeScript pour l'import, testée.

**Fonctions** — `SECURITY DEFINER`, `search_path` fixé, erreur si `not is_admin()`, triées :

- `admin_prospects(p_q, p_filtre, p_source, p_page)` — une page de 50, le total, et pour un prospect
  relié le nom de la personne.
- `admin_prospects_chiffres()` — les quatre chiffres et les nombres de chaque filtre.
- `admin_prospects_sources()` — les sources distinctes, triées.
- `admin_prospects_a_rapprocher()` — les correspondances non reliées : même `lower(email)` qu'un
  `users.email`, ou même `phone_key` qu'un `users.phone` ; le prospect, la personne, la raison.
- `admin_rapprocher(p_prospect, p_user, p_par)` — pose `user_id`, `linked_at`, `linked_by`.
- `admin_prospect_de(p_user)` — le prospect relié à une personne, pour la fiche. Si plusieurs
  prospects mènent au même compte (deux fiches pour la même personne), le premier rapproché
  (`linked_at`, puis `id`).

Les écritures de cellule, l'ajout, la suppression et l'import passent par la table elle-même
(`insert`, `update`, `delete` sous RLS) ; l'import par un seul `insert` avec
`onConflict` ignoré sur l'e-mail.

**Le déclencheur d'inscription** : à l'insertion dans `users` (posée par `handle_new_user`), relier le
prospect non relié dont `lower(email)` est égal, `linked_by = 'email'`. `SECURITY DEFINER`, et son
échec ne doit jamais bloquer une inscription (`exception when others` → rien).

## Le code

- `features/admin-prospects/` : la page, ses chiffres, ses outils, le tableau et ses cellules, la
  fenêtre d'import, la fenêtre de rapprochement, le hook de lecture.
- `lib/prospect-list.ts` (l'état de la liste dans l'adresse), `lib/prospect-import.ts` (titres
  reconnus, lignes gardées, doublons), `lib/phone.ts` (`phoneKey`) — fonctions pures, testées.
- On réutilise : `AdminCard`, `IconTile`, `Segmented`, les pastilles (`type-chip`), la recherche et le
  pied de page des Comptes, `DeletionDialog` si sa forme convient, sinon une confirmation simple.
- Dépendance ajoutée : `papaparse` (+ ses types).
- Types Supabase de la V2 régénérés après la migration.

## Vérifier

- **Tests** : `phoneKey`, la lecture du CSV (titres avec ou sans accents, doublons, lignes vides,
  source commune), l'état de la liste dans l'adresse.
- **Base** : un appel sans être admin échoue ; un appel admin rend les bonnes lignes ; une
  inscription de test avec l'e-mail d'un prospect de test le relie — sur des adresses de test, jamais
  un vrai client, et effacées ensuite.
- **À l'œil**, sur le compte d'Uriel : ajouter, modifier chaque type de cellule, importer un petit
  CSV, rapprocher, défaire, supprimer ; l'écran à côté de la maquette `2343:2`.

## Ordre de livraison

1. Migration : table, RLS, `phone_key`, fonctions de lecture, rapprochement, déclencheur.
2. L'écran en lecture : chiffres, bandeau, filtres, recherche, source, pages ; l'entrée dans la barre.
3. La modification dans le tableau, l'ajout, la suppression.
4. L'import CSV.
5. « Voir et rapprocher », le décochage, le bloc « Prospect d'origine » de la fiche.
6. Déploiement de la V2.

## Hors de ce lot

L'envoi d'e-mails depuis Fellowship, l'historique des échanges, l'export, une fiche prospect, et les
sections Signalements, Événements, Catégories, Témoignages (lot 4).
