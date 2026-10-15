# V2 — Administration, lot 2 : la coquille et les Comptes

> Validé en conversation avec Uriel le 15/10/2026. Maquettes validées le même jour dans Figma :
> `Admin — Comptes · par enseigne` (`2338:2`), `Admin — Comptes · par personne` (`2340:2`),
> `Admin — Fiche d'une enseigne` (`2342:2`), `Admin — Fiche d'une personne` (`2344:2`).
> Chantier en quatre lots : 1 (faille des e-mails, livré le 15/10), **2 (ici)**, 3 (Prospects,
> maquette `2343:2`, spec à part), 4 (reprise de Signalements, Événements, Catégories, Témoignages).

## Pourquoi

La V2 n'a plus d'administration ; celle de la V1 ne voit que des personnes, et un bouton
« suspendre » qui ne bloque rien. Uriel veut **bien gérer les informations qu'on a sur les comptes** :
les voir, les corriger, agir sur l'accès et sur l'argent, les annoter. Et c'est l'**enseigne** qu'on
regarde le plus souvent : l'abonnement lui appartient, payé par un de ses comptes.

## Ce qui est tranché

- Les commerciaux sont des admins : un seul niveau d'accès (`users.role = 'admin'`).
- La liste se lit **par enseigne** par défaut, avec une bascule vers **les personnes**.
- Le téléphone n'est saisi que par un admin ; pas de champ dans les Réglages.
- L'administration est faite pour l'ordinateur. Sur téléphone, elle n'est pas maquettée : hors lot.

## Les adresses

| Adresse                       | Écran                                       |
| ----------------------------- | ------------------------------------------- |
| `/admin`                      | renvoie sur `/admin/comptes`                |
| `/admin/comptes`              | la liste par enseigne                       |
| `/admin/comptes?vue=personnes`| la liste par personne                       |
| `…?q=…&filtre=…&page=…`       | recherche, filtre et page dans l'adresse    |
| `/admin/enseignes/:id`        | la fiche d'une enseigne                     |
| `/admin/personnes/:id`        | la fiche d'une personne                     |

## La coquille

- **`AdminShell`** : le cadre de l'app (barre beige, panneau blanc à arrondi), avec sa propre
  navigation : la pastille « Administration · Réservé aux admins », les sections, « Revenir à
  l'application » en bas. Le contenu prend toute la largeur.
- **Les sections montrées sont celles qui existent** : Comptes dans ce lot ; Prospects arrive au
  lot 3, les quatre autres au lot 4. La maquette les montre toutes, le code les ajoute lot par lot.
- **L'entrée** : un lien « Administration » dans la barre latérale de l'app, pour les admins
  seulement (`navFor`, sur `person.role`).
- **La garde** : `AdminRoute`, dans `ProtectedRoute`, laisse passer `person.role === 'admin'` et
  renvoie les autres sur `/`. Elle ne protège que l'affichage : **la vraie garde est en base**, chaque
  fonction `admin_*` lève une erreur si `is_admin()` est faux.

## La liste des comptes

**En tête** : « Comptes », la phrase, la bascule Enseignes / Personnes, puis quatre chiffres —
comptes (+ cette semaine), enseignes Pro (dont offertes), essais en cours (qui finissent sous
3 jours), paiements en échec (`subscription_status = 'past_due'`).

**Outils** : la recherche (nom, enseigne, e-mail, téléphone — sans accents ni casse), les filtres
avec leur nombre, le tri « Les plus récents » (seul tri de la maquette). 50 lignes, puis « Voir les
suivants ».

**Par enseigne** — filtres Toutes, Pro, Essai, Gratuit, Exposants, Festivals. Une ligne :

- **Enseigne** : logo (teinte du type s'il manque), nom, pastille du type, ville.
- **Offre** : pastille noire « Pro » ou bleue « Essai », sinon « Gratuit » ; dessous le détail —
  mensuel / annuel, « offert jusqu'au … · parrainage », « N j restants », « paiement refusé » en
  brique.
- **Comptes reliés** : avatars empilés, le propriétaire, « + N membres » ou « seul compte ».
- **Payée par** : le compte qui paie, « Offert », ou « — ».
- **Activité** : dates suivies, avis.

**Par personne** — filtres Tous, Pro, Essai, Gratuit, Sans enseigne, Admins. Colonnes : Compte
(avatar, nom, e-mail), Enseigne (la première, avec son type), Offre (celle de cette enseigne),
Inscrit, Dernière venue, Activité. « Sans enseigne » = arrivée non finie.

L'offre d'une enseigne se calcule en un seul endroit, une fonction pure `lib/offer.ts`
(`offerOf(entity, now)` → genre + détail), testée : Pro = `plan = 'pro'` ou `comped_pro_until`
futur, la règle de `lib/plan.ts`, réutilisée.

## La fiche d'une enseigne

En-tête : logo, nom en Instrument Serif, pastille Pro, type, ville, date de création, lien de la
vitrine ; « Voir la vitrine », « Modifier ».

- **Abonnement** : l'offre et son prix, le prochain renouvellement, qui paie ; puis parrainage,
  mois offerts, remise, ambassadeur. Actions : **Offrir des mois**, **Poser une remise**,
  **Passer ambassadeur** (ou le retirer). « Ouvrir dans Stripe » mène au client Stripe.
- **Paiements** : les factures Stripe du client (date, montant HT, objet, état), lues **en direct**
  chez Stripe — rien n'est stocké. Les 4 dernières, « Tout voir » montre le reste.
- **Activité** : dates suivies, avis, bilans, fiches créées, abonnés ; les trois derniers gestes.
- **Comptes reliés** : chaque membre, son rôle, qui paie ; mène à sa fiche.
- **Notes internes** : étiquettes, notes datées et signées, « Ajouter une note… ».
- **Informations** : nom, type, ville, vitrine, raison sociale, SIREN, et le téléphone du
  propriétaire. « Corriger » rend les champs modifiables en place.

## La fiche d'une personne

En-tête : avatar, nom, rôle, e-mail, identifiant, inscription, dernière venue ; « Modifier ».

- **Enseignes** : chacune, avec son offre et le rôle de la personne ; mène à la fiche.
- **Activité** : dates suivies, avis, questions et réponses, fiches créées ; les derniers gestes.
- **Accès** :
  - **Rôle** Utilisateur / V2 / Admin — écrit directement (`admin_update_users` et le déclencheur
    `protect_user_role` le permettent déjà à un admin).
  - **Suspendre** — une vraie suspension : la connexion est bloquée chez Supabase (bannissement), et
    `users.suspended_at` la date. Réactiver la lève. Le contenu reste visible.
  - **Supprimer…** — le même effacement que « Supprimer mon compte » des Réglages, sur la personne
    visée ; confirmation en saisissant son nom.
- **Notes internes**, comme pour l'enseigne.
- **Informations** : prénom, e-mail, téléphone, identifiant, code postal, notifications, mode de
  connexion. « Corriger » en place. Corriger l'e-mail change aussi l'adresse de connexion.
- Le bloc **Prospect d'origine** arrive avec le lot 3.

## La couleur

Validée sur les maquettes : le type d'enseigne en pastille (exposant **terre**, festival **prune**,
sans enseigne gris), « Essai » en **bleu doux**, une icône teintée par bloc (abonnement terre,
paiements vert, activité bleu, comptes et enseignes prune, notes **ocre**, accès **brique**,
informations gris). Prune, ocre et brique entrent dans `1-primitives.css` (trois teintes : encre,
fond, filet), prennent leur sens dans `2-semantic.css`. Rien en dur ailleurs.

## La base

Tout est **additif** sauf une ligne : le code déployé survit à chaque migration.

**Colonnes**

- `users.phone text` — lisible par soi et les admins (policy du lot 1).
- `users.suspended_at timestamptz`.
- `entities.paid_by_user uuid` → `users(actor_id)`, `on delete set null` — **qui paie** : la base
  ne le sait pas aujourd'hui. `stripe-checkout-session` met `paid_by_user` dans les métadonnées de la
  session et de l'abonnement ; le webhook l'écrit. Pour les abonnements déjà en cours, la fiche
  montre l'e-mail du client Stripe ; la liste, « — ».

**Tables** (RLS : tout pour `is_admin()`, rien pour les autres)

- `admin_notes (id, actor_id → actors on delete cascade, author_user_id, body, created_at)`.
- `admin_labels (actor_id → actors on delete cascade, label, primary key (actor_id, label))`.

**Fonctions** — `SECURITY DEFINER`, `search_path` fixé, erreur si `not is_admin()`, `EXECUTE`
accordé à `authenticated` seulement. Chaque liste est **triée** (`created_at desc, actor_id`).

- `admin_chiffres()` — les quatre chiffres.
- `admin_enseignes(p_q, p_filtre, p_page)` et `admin_personnes(p_q, p_filtre, p_page)` — une page
  de 50 et le total ; les membres en JSON ; la dernière venue lue dans `auth.users.last_sign_in_at`.
- `admin_enseigne(p_id)` et `admin_personne(p_id)` — tout ce qu'affiche la fiche, sauf Stripe.
- `admin_offrir_mois(p_entity, p_mois)` — `comped_pro_until = greatest(now(), comped_pro_until) + mois`.
- `admin_ambassadeur(p_entity, p_oui)`.
- `admin_corriger_enseigne(p_id, …)` et `admin_corriger_personne(p_id, …)`.

Le déclencheur qui protège `comped_pro_until` et `is_ambassador` contre les écritures du client est
repris **depuis sa définition live** pour passer quand `is_admin()`.

**Fonctions serveur** (Edge, client service, garde `is_admin()` sur le jeton de l'appelant)

- `admin-stripe` : `paiements` (factures d'un client), `coupons` (la liste des coupons Stripe
  existants), `remise` (applique un coupon choisi à l'abonnement ; le webhook remplit ensuite
  `discount_label` comme aujourd'hui).
- `admin-compte` : `suspendre`, `reactiver` (`auth.admin.updateUserById`, `ban_duration`), `email`
  (l'adresse de connexion et `users.email` ensemble).
- `delete-account` accepte `userId` quand l'appelant est admin : un seul effacement, le même que
  celui des Réglages (son plan, `deletion-plan.ts`, est une copie synchronisée de la V2).

## Ce qui sort, ce qui reste

- **Registre de purge** (`docs/v2/purge-back.md`) : la valeur de rôle `'suspended'` écrite par la V1
  (cosmétique), à retirer quand la V1 s'éteint.
- **Hors de ce lot** : les Prospects (lot 3) ; Signalements, Événements, Catégories, Témoignages
  (lot 4) ; la facturation des enseignes lisible par tout compte connecté, et le fait que tout
  **membre** d'une enseigne puisse ouvrir son paiement et son portail Stripe (lot 1b).

## Vérifier

- **Tests** : `offerOf`, la lecture de l'adresse de la liste et le résumé des membres, en fonctions
  pures. La recherche (sans accents ni casse) vit en SQL : elle se vérifie par des appels.
- **Base** : après chaque migration, un appel sans être admin doit échouer, un appel admin rendre
  les bonnes lignes.
- **À l'œil** : chaque écran comparé à sa maquette (`get_screenshot` à côté de la capture), sur
  `flw.sh/v2/admin` dans le navigateur d'Uriel. Les actions qui écrivent (offrir, remise, suspendre,
  supprimer) se testent sur un compte de test, jamais sur un vrai client.

## Ordre de livraison

1. Migrations additives (colonnes, tables, fonctions de lecture).
2. Coquille, garde, liste par enseigne et par personne.
3. Fiche d'une enseigne, puis d'une personne, en lecture.
4. Notes et étiquettes, corrections, rôle.
5. Offrir des mois, ambassadeur ; puis `admin-stripe` (paiements, remise) et `paid_by_user`
   (checkout + webhook redéployés).
6. `admin-compte` : suspendre, supprimer.
