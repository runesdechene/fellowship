# V2 — Administration, lot 4 : Signalements, Événements, Catégories, Témoignages

> Demandé par Uriel le 19/10/2026 (« aller chantier 2, tu me le boucles au réveil ») : c'est le
> chantier 2 de la bascule de la V2 à la racine (`_État.md`). Écrit et codé de nuit, sans lui.
> Lots précédents : `2026-10-15-v2-admin-lot-2-comptes-design.md`, lot 3 (Prospects).

## Pourquoi

L'administration de la V2 doit se suffire à elle-même avant la bascule : Uriel ne doit plus
ouvrir la V1 pour faire son travail d'admin. Il manque les quatre écrans que la V1 a encore :
signalements, événements, catégories, témoignages.

## La maquette — ce qui existe et ce qui n'existe pas

- **La navigation** de l'administration (maquettes `2338:2` et suivantes) montre déjà les quatre
  sections, dans cet ordre, avec leurs icônes : drapeau, calendrier, étiquette, bulle. Signalements
  porte une pastille sombre avec le nombre en attente.
- **La vitrine** (`2076:2`) a « Signaler ce profil », avec un drapeau, à droite du pied de page.
- **Aucun écran du lot 4 n'est maquetté.** Ils sont composés **uniquement** des briques de
  l'administration déjà validées (en-tête de page, recherche, filtres segmentés, tableau en carte
  blanche, pagination, fenêtre de confirmation) — aucune nouvelle couleur, aucun nouveau motif.
  **À relire par Uriel** : c'est une composition, pas un design validé.

## Les adresses

| Adresse                                   | Écran                                              |
| ----------------------------------------- | -------------------------------------------------- |
| `/admin/signalements?statut=…`            | `a-traiter` (défaut), `resolus`, `rejetes`         |
| `/admin/evenements?q=…&page=…`            | tous les événements, privés compris, 50 par page   |
| `/admin/categories`                       | les catégories dans leur ordre                     |
| `/admin/temoignages`                      | les témoignages dans leur ordre                    |

## Signalements

- **Liste** : signalé le, ce qui est visé (une vitrine, une fiche, une question ou une réponse
  d'une discussion — menant à la vitrine ou à la fiche), le motif, le commentaire, qui signale ;
  pour les traités, la note de l'admin et la date.
- **Traiter** : une fenêtre avec une note facultative, puis **Résoudre** ou **Rejeter**
  (`status = resolved | dismissed`, `resolved_at`, `resolved_by_actor_id`). La politique admin
  d'`update` existe déjà.
- **La pastille** de la navigation : le nombre de signalements en attente, relu à l'ouverture.
- **Signaler ce profil** (vitrine, pied de page, sauf sur sa propre vitrine) : une fenêtre — le
  motif (les quatre de la V1 : spam, contenu inapproprié, information erronée, doublon) et un
  commentaire facultatif — puis « Merci, on regarde. ». Insertion directe : la politique d'insert
  (`reporter_auth_id = auth.uid() and can_act_as(reporter_actor_id)`) existe déjà.
- Lecture par une fonction `admin_signalements(p_statut)` (garde admin) qui rend chaque
  signalement avec le nom de qui signale et le nom et le lien de ce qui est visé : une seule
  requête au lieu de quatre lectures côté client.

## Événements

- **Liste** : l'événement (nom, ville, « Privée » le cas échéant), les dates, les catégories, qui
  l'a créé, le nombre d'exposants inscrits, créé le. Recherche sur le nom et la ville (sans accents
  ni casse, `admin_cherche`). Tri : les plus récents. Une ligne mène à la fiche.
- **Supprimer** : fenêtre de confirmation qui dit ce qui part avec (inscriptions, avis, discussions,
  bilans : toutes les tables liées sont en `on delete cascade`). Suppression directe : la politique
  `admin_delete_events` existe déjà.
- Lecture par `admin_evenements(p_q, p_page)` (garde admin), même forme que `admin_enseignes`.

## Catégories

- **Liste** : l'aperçu (la catégorie dans ses deux couleurs, comme partout dans l'app), le nom,
  l'adresse (slug), le nombre d'événements qui la portent, l'ordre.
- **Ajouter / Modifier** : nom, slug, couleur de fond, couleur du texte (sélecteur de couleur du
  navigateur), ordre. **Renommer** met aussi à jour les événements : `events.tags` contient le nom
  (V2) ou le slug (V1), sinon les fiches perdraient leur catégorie. D'où une fonction
  `admin_categorie_enregistrer(...)` (garde admin) qui écrit la catégorie et remplace l'ancien nom
  et l'ancien slug dans `events.tags`. Ce remplacement ne déclenche aucune notification (le
  déclencheur `notify_event_updated` ignore `tags`) et n'écrit pas de version dans l'histoire des
  fiches : c'est une correction d'administration, pas une modification de fiche.
- **Supprimer** : confirmation qui dit combien d'événements la portent ; ils gardent le libellé,
  qui s'affiche alors en gris.
- Lecture par `admin_categories()` (garde admin) : les catégories et leur usage.

## Témoignages

- **Liste** : la photo, le prénom, le métier, la phrase, la vitrine reliée, actif ou non, l'ordre.
- **Ajouter / Modifier** : prénom, métier, phrase, photo (envoyée dans le seau `testimonials`,
  comme la V1), l'adresse de la vitrine reliée (`flw.sh/…` : le slug se résout en `actor_id` à
  l'enregistrement), actif, ordre. Les politiques admin existent déjà.
- **Supprimer** : confirmation.

## La base

- Quatre fonctions de lecture `SECURITY DEFINER`, `search_path` fixé, `perform admin_garde()`,
  `EXECUTE` à `authenticated` seulement, chaque liste **triée**.
- Une fonction d'écriture, `admin_categorie_enregistrer`.
- Tout est additif : le code déployé survit.
- **Dette notée, pas réglée ici** : les politiques admin de `content_reports`, `tags` et
  `testimonials` relisent `users` par sous-requête au lieu de `is_admin()` (piège du 18/10 dans
  `.claude/rules/supabase.md`). Elles marchent aujourd'hui ; elles vont au registre de purge.

## Hors du lot

- Les chiffres du tableau de bord de la V1 (événements actifs, participations du mois) : pas sur la
  maquette.
- « Signaler » sur une fiche ou dans une discussion : pas sur la maquette de la V2. La liste des
  signalements sait quand même les afficher (la V1 en crée encore).
- Le téléphone : l'administration est faite pour l'ordinateur (lot 2).

## Vérifier

- **Tests** : la lecture de l'adresse (statut des signalements) et le libellé d'une cible, en
  fonctions pures.
- **Base** : chaque fonction appelée sans être admin échoue ; appelée en admin, rend les bonnes
  lignes (transaction annulée).
- **À l'œil** : chaque écran sur `flw.sh/v2/admin` dans le navigateur d'Uriel, une fois déployé.
