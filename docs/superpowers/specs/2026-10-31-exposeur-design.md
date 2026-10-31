# L'exposeur : brancher un agent ou un tableau de bord sur son Fellowship

> Spec du 31/10/2026. Décision d'Uriel : un exposeur générique, offert aux comptes Pro, pour qu'un
> agent ou un tableau de bord interroge son Fellowship par une clé personnelle. Premier usage : la
> Timeline du plugin Accueil (objectif « CA minimal mensuel »).

## Ce que l'exposeur rend

`GET https://<projet>.supabase.co/functions/v1/exposeur?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ`
avec l'en-tête `Authorization: Bearer <clé>`.

```json
{ "debut": "2026-11-01", "fin": "2026-11-30", "ca": 2900, "ca_reel": 1800, "ca_projete": 2100, "dates": 3, "bilans": 2 }
```

- **Les dates comptées** : les participations confirmées (`inscrit`, `confirme`) de l'enseigne
  de la clé, dont l'événement **commence** dans la fenêtre. Un festival à cheval sur deux mois
  compte pour le mois où il commence.
- **`ca`** (Uriel, 31/10/2026) : par date, le **CA espéré** (`participation_dossiers.revenue_goal`)
  dès qu'il existe, toujours prioritaire ; sinon le **CA réel complet**, toutes les entrées du bilan
  (`event_ledger_entries`, `direction = 'in'`). Jamais les colonnes mortes `revenue` d'`event_reports`.
- **`ca_reel`** : le CA réel des bilans remplis seuls ; **`ca_projete`** : la somme des CA espérés.
- **`bilans`** : le nombre de dates dont le bilan est rempli (une ligne `manual`, comme `isFilled()`).
- **`dates`** : leur nombre.
- **`cle`** et **`secrets`** (recettes chiffrées, migration `20261031150000`) : `cle` = `{ "salt", "iterations" }`
  de l'enseigne (`null` sans phrase), `secrets` = `[{ "payload", "dans_ca" }]`, un par date comptée qui a des
  recettes chiffrées. Le serveur ne peut pas les sommer : `ca` et `ca_reel` n'y comptent donc **pas** ces
  recettes. `dans_ca` vaut vrai quand la date n'a pas de CA espéré (le réel y compte dans `ca`).
  Le client les déchiffre avec la phrase et ajoute Carte + Espèces à `ca_reel`, et à `ca` si `dans_ca`
  (algorithme : `apps/web-v2/src/lib/cipher.ts`). `cle` ne porte pas `check` : une mauvaise phrase se
  reconnaît à l'échec d'AES-GCM.

Lecture seule. Aucune donnée d'une autre enseigne, aucun nom de festival dans cette première
version (les chiffres suffisent au tableau de bord ; un détail par date pourra venir).

## La clé

- Une table `api_keys` : `id`, `actor_id` (l'enseigne), `created_by`, `label`, `prefix` (les
  8 premiers caractères, pour la reconnaître), `hash` (SHA-256 de la clé), `created_at`,
  `last_used_at`, `revoked_at`. La clé en clair n'est **jamais** stockée.
- RLS activée sans politique : fermée à `anon` et `authenticated`. L'écran apportera la lecture
  de ses clés par le propriétaire (jamais `hash`).
- Créer et révoquer une clé : par le service role pour l'instant ; les RPC `create_api_key` et
  `revoke_api_key` viendront avec l'écran, pas avant (pas de code sans usage).
- La fonction `exposeur` (edge, `verify_jwt = false`) hache la clé reçue et appelle
  `exposeur_chiffres` (SECURITY DEFINER, service role seul) : ligne non révoquée → enseigne
  Pro (`plan = 'pro'` ou `comped_pro_until > now()`) → chiffres. Sinon 401, sans dire pourquoi.
  Met à jour `last_used_at`.
- Un compte qui perd le Pro garde ses clés, qui répondent 403 jusqu'au retour du Pro.

## L'écran

Une carte « Brancher un outil » dans les réglages de l'enseigne (côté Pro) : créer une clé (un
nom, puis la clé affichée une fois avec « Copier »), la liste des clés (nom, début, dernière
utilisation), « Révoquer ». **Rien n'est intégré sans maquette Figma validée par Uriel**
(périmètre de la V2 = la maquette).

## Côté plugin Accueil

Un connecteur « Requête JSON » `fellowship` : adresse
`…/functions/v1/exposeur?debut={debut}&fin={fin}`, la clé dans le coffre d'Obsidian, mesures
`ca = ca`, `ca_reel = ca_reel` et `ca_projete = ca_projete`. Le champ « Phrase des recettes » nomme le secret
du coffre qui garde la phrase de l'enseigne : le plugin déchiffre alors `secrets` et les ajoute (sans phrase,
une erreur « phrase des recettes absente du coffre » ne tombe que si la réponse porte des secrets). L'objectif devient
`[mesure:: boutique.ca + fellowship.ca]`, la carte montre la part de chacun.

## En attendant l'écran

Pour Runes de Chêne seulement, la clé peut être créée par Claude avec le service role (une ligne
dans `api_keys`), donnée à Uriel une fois, à coller dans le coffre d'Obsidian. Même table, même
fonction : l'écran viendra par-dessus sans rien changer.

## Tranché par Uriel (31/10/2026)

1. `ca` : le CA espéré dès qu'il existe, sinon le CA réel complet.
2. Un festival compte pour le mois où il **commence** (proposé, sans objection).
3. La maquette de la carte « Brancher un outil » : à faire dans Figma, plus tard.

## Livraison

Migration horodatée (table, RLS, deux RPC) appliquée en production par `db push`, fonction
`exposeur` déployée, tests de la fonction (clé fausse, révoquée, sans Pro, autre enseigne,
somme correcte), vérification en ligne. Puis la clé de Runes de Chêne, puis le connecteur.

## Portée plateforme (31/10/2026)

Le plan de Fellowship mesure l'application entière (nouveaux comptes, festivals ajoutés, abonnés Pro).
Une clé porte une `portee` : `enseigne` (défaut) ou `plateforme`. Avec `&vue=plateforme`, `exposeur`
appelle `exposeur_plateforme` (SECURITY DEFINER, service role seul), qui ne répond qu'à une clé de
portée plateforme et rend, sur la fenêtre (jours de Paris, bornes incluses) :
`comptes` (users créés), `enseignes` (entities créées), `festivals` (events créés) ; et l'état du jour :
`pro` (même règle qu'`admin_offre`, mois offerts compris), `pro_payants` (abonnement `active`),
`essais` (`trialing`). Mêmes définitions que /admin. Clés plateforme données à la main, équipe seulement.
Migration `20261031190000_exposeur_plateforme.sql`.
