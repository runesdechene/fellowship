# Lot 9b — Les Réglages (V2)

> 11/10/2026. Suite du lot 8e, qui a ouvert la page `/reglages` avec la seule section Notifications.
> Conception validée par Uriel le 11/10/2026 (« nickel chrome »).

## Pourquoi

La page Réglages de la V2 ne règle que les notifications. Il manque tout le reste : son profil, se
déconnecter (aucun bouton ne le permet dans la V2), ses enseignes et leur abonnement, écrire à
l'équipe — et surtout **supprimer son compte pour de vrai**. En V1, « Supprimer mon compte » ne fait
que déconnecter : rien n'est effacé, alors que les CGU (§10) et la page Confidentialité promettent
la suppression depuis les Réglages. C'est un problème RGPD.

## Décisions (Uriel, 11/10/2026)

1. **Les enseignes dont on est seul propriétaire sont supprimées avec le compte** : vitrine, dates,
   bilans, abonnés ; leur abonnement Stripe est résilié aussitôt. Les enseignes partagées restent à
   leurs autres membres. La confirmation nomme les enseignes qui vont disparaître.
2. **La suppression est immédiate et définitive**, après une confirmation où l'on tape
   « SUPPRIMER ». Pas de délai de grâce. Les festivals créés par la personne restent dans
   l'annuaire, sans auteur.
3. **« Créer un compte exposant » attend le lot 10** : un seul formulaire d'arrivée, pas deux.
4. **Les colonnes d'abonnement Stripe des enseignes sont verrouillées dans ce lot**, comme le plan
   Pro (registre de purge, ligne « `entities_update_member` »).

## La maquette — elle fait foi

`2027 — Réglages · ligne Suggestions pour toi` (`2206:691`), dernière version du cadre Réglages :
colonne de navigation à gauche (Profil, Compte, Notifications, Enseignes et abonnement, Contact),
mention « Chaque changement s'enregistre aussitôt » en haut à droite, une carte bordée par section,
la carte « Supprimer mon compte » seule en bas de page.

Ce qui n'est pas sur la maquette n'existe pas : ni changement d'adresse e-mail, ni mot de passe, ni
interrupteur de thème, ni gestion des membres d'une enseigne, ni SIREN ou raison sociale (ils se
règlent au paiement, page `/pro`).

## Ce que le lot livre

### 1. La page

Une seule page `/reglages`. La colonne de gauche fait défiler jusqu'à la section (ancres, comme
aujourd'hui pour Notifications) et allume la section visible. Une section = un composant de
`features/settings/`.

### 2. Profil — `users`, la personne

| Ligne | Ce qu'elle fait |
| --- | --- |
| Photo (« JPG ou PNG, 5 Mo au plus ») | « Changer » choisit une image, réduite avant l'envoi, déposée dans `avatars/{actor_id}/{horodatage}.{ext}` (chemin de la V1), puis écrite dans `users.avatar_url`. |
| Nom affiché | `users.display_name`, obligatoire, 60 caractères au plus. |
| Ville | `users.city`. |
| Code postal (« Sert à « Près de chez toi » dans l'Explorer ») | `users.postal_code`, 5 chiffres ou vide. |
| Genre (« Facultatif ») | `users.sex` : Non précisé / Femme / Homme (valeurs de l'énumération `user_sex`). |
| Ma vitrine (« L'enseigne, sa présentation, ses liens, sa bannière ») | « Ouvrir ma vitrine » → la vitrine de l'enseigne active ; ligne cachée sans enseigne. |

**Enregistrement** : chaque champ s'écrit quand on le quitte (ou au choix, pour la liste et la
photo), si sa valeur a changé et qu'elle est valable. La mention de l'en-tête dit « Enregistré » un
instant ; un échec la remplace par « Pas enregistré — réessaie » et le champ garde la saisie. Après
écriture, `reloadIdentity()` met à jour la barre latérale (nom, photo).

### 3. Compte

- **E-mail** (« Tu te connectes avec un code reçu à cette adresse ») : l'adresse de la session, en
  lecture seule.
- **Se déconnecter** : `signOut()` (qui désabonne aussi le téléphone), puis retour à la connexion.

### 4. Notifications

Inchangé (lot 8e, puis 8d).

### 5. Enseignes et abonnement (« Chaque enseigne a sa vitrine et son propre abonnement. »)

Une ligne par enseigne dont la personne est membre : logo, nom, pastille Pro si Pro, et une phrase.

- **Pro payé** : « Pro mensuel » ou « Pro annuel », « renouvelé le {date} » (ou « se termine le
  {date} » si l'abonnement est résilié en fin de période, « essai jusqu'au {date} » pendant l'essai,
  « paiement en attente » si `past_due`), puis « facture au nom de {raison sociale} » si elle existe.
  Bouton **Gérer** → portail Stripe (`openPortal`, déjà en place).
- **Pro offert** (`comped_pro_until`) : « Pro offert jusqu'au {date} ». Pas de bouton.
- **Gratuit** : « Gratuit · {N} dates sur tes 6 prochains mois ». Bouton noir **Passer Pro** :
  l'enseigne devient le compte actif, puis `/pro`.

Pas de « Créer un compte exposant » (lot 10).

### 6. Contact

« Une question, une idée, un souci ? — On lit tout et on répond vite » ; **Écrire à l'équipe** ouvre
un e-mail vers `appfellowship@pm.me`.

### 7. Supprimer mon compte

Carte seule en bas : « Efface ton profil, tes dates et tes bilans. Tes enseignes partagées restent
à leurs autres membres. » Bouton **Supprimer…** (encre rouge).

Il ouvre une fenêtre de confirmation qui charge **l'aperçu** de la suppression et dit :
- ce qui disparaît : ton profil, tes dates, tes bilans, tes avis ;
- **les enseignes supprimées avec**, nommées, et pour chacune « son abonnement Pro est résilié » si
  elle en a un ;
- les enseignes qui restent à leurs autres membres, nommées ;
- un champ « Tape SUPPRIMER pour confirmer » ; le bouton rouge « Supprimer définitivement » ne
  s'allume qu'avec ce mot exact.

Pendant l'effacement, la fenêtre ne se ferme pas et le bouton dit « Suppression… ». Réussi : la
session se ferme et l'on arrive sur l'accueil public. Échoué : « La suppression n'a pas abouti.
Rien n'a été perdu de ce qui reste ; réessaie ou écris-nous. » (voir l'ordre ci-dessous : ce qui
est déjà effacé ne revient pas, mais le compte reste utilisable et l'opération se relance).

### 8. Mobile

Sous 760 px : la colonne de navigation disparaît, les sections s'empilent, les lignes passent
libellé au-dessus, contrôle dessous. « Réglages » entre dans le menu du compte (« Moi »), comme le
prévoyait le lot 8e.

## La suppression, côté serveur

Nouvelle fonction `supabase/functions/delete-account` (JWT vérifié, client admin), la seule à
pouvoir effacer la connexion et parler à Stripe. Corps : `{ "confirm": false }` rend l'aperçu,
`{ "confirm": true }` exécute. **Un seul code calcule l'aperçu et exécute** : l'aperçu est le plan
que l'exécution suit.

**Le plan** (fonction pure `deletionPlan`, testée) : à partir des appartenances de la personne et
des membres de chacune de ses enseignes —
- une enseigne **dont elle est le seul membre** → supprimée ;
- une enseigne **partagée** → reste ; si la personne en était le seul propriétaire, le membre le plus
  ancien (`memberships.created_at`) devient propriétaire.

**L'exécution**, dans cet ordre (chaque étape peut être rejouée si la suivante échoue) :
1. Promouvoir les héritiers des enseignes partagées.
2. Pour chaque enseigne supprimée : résilier son abonnement Stripe tout de suite s'il en a un
   (`subscriptions.cancel`), effacer ses fichiers (logo, bannière, galerie), supprimer sa ligne
   `actors` — la base efface en cascade l'enseigne, ses appartenances, ses dates, ses bilans, ses
   abonnés, sa galerie, ses parrainages.
3. Effacer les fichiers de la personne : `avatars/{actor_id}/`, ses médias de bilan.
4. Supprimer la ligne `actors` de la personne — cascade sur `users`, participations, avis, bilans,
   notes, abonnements, notifications, discussions, dossiers, appareils. Les festivals qu'elle a
   créés passent `created_by_actor = NULL` (déjà le cas), ses traces `acted_by_user_id` aussi.
5. Supprimer la connexion (`auth.admin.deleteUser`).

Le webhook Stripe qui reçoit ensuite `customer.subscription.deleted` ne trouve plus l'enseigne : il
ne doit pas échouer (à vérifier dans le plan).

## La sécurité Stripe

Une migration étend le déclencheur `protect_entity_plan` (définition **live** reprise entière) aux
colonnes `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `billing_interval`,
`current_period_end`, `trial_end`, `discount_end`, `discount_label` : un membre qui écrit sur son
enseigne (session utilisateur) ne peut plus les changer ; les fonctions serveur (client admin, sans
`auth.uid()`) le peuvent toujours. `legal_name` et `siren` restent modifiables (voulu, synchronisés
par `stripe-update-billing`). La ligne du registre de purge est close dans le même commit.

## Comment c'est construit

- `features/settings/` : `SettingsPage` (navigation + sections), `ProfileSection`, `AccountSection`,
  `EntitiesSection`, `ContactSection`, `DeleteAccount` (carte + fenêtre), `NotificationSettings`
  (existant). Chaque section garde ses règles de forme dans `lib/` : `lib/settings.ts` (validation
  des champs du profil, phrase d'une enseigne) avec ses tests.
- Une ligne de réglage (libellé, aide, contrôle) est **un seul composant** réutilisé par toutes les
  sections (règle du 11/10/2026 : une chose qui se répète devient un composant) ; les lignes de
  Notifications le reprennent.
- La photo : la réduction d'image existe déjà pour la vitrine (`useVitrineEdit`) — la sortir dans
  `lib/` et la partager plutôt que la recopier.
- La fonction `delete-account` : `index.ts` (requête, autorisation, exécution) et `plan.ts`
  (`deletionPlan`, pur, testé par Deno ou recopié en test Vitest selon ce qui existe déjà pour
  `send-push`).
- Styles : `settings.css` étendu, jetons dans `2-semantic.css`.

## Vérification

- Tests : validation du profil, phrase de chaque état d'abonnement, `deletionPlan` (seul, partagé
  avec et sans autre propriétaire, plusieurs enseignes).
- Navigateur, en local : chaque champ du profil s'enregistre et se relit ; « Se déconnecter » ;
  « Gérer » et « Passer Pro » ; mobile. **Sur le compte d'Uriel, toute modification de profil est
  remise à l'identique.**
- La suppression : sur un **compte de test créé pour l'occasion** (une personne et une enseigne
  gratuite, aucun abonnement réel), aperçu puis exécution, puis vérification en base qu'il ne reste
  rien (actors, users, memberships, entities, auth). Jamais sur un compte réel.
- Le verrou Stripe : en prod, en lecture seule (définition du déclencheur), et par une écriture
  simulée dans une transaction annulée.
- Déploiement de la fonction `delete-account` et de la V2 : au GO d'Uriel.

## Hors de ce lot

- Créer une enseigne (lot 10). Gérer les membres d'une enseigne. Supprimer une seule enseigne sans
  supprimer son compte.
- Changer d'adresse e-mail. Le thème dans les Réglages.
- Le bouton « Supprimer mon compte » de la V1 (il reste une déconnexion jusqu'à la bascule).
