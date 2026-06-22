# SIREN + raison sociale sur les factures — design

**Date :** 2026-06-22
**Statut :** validé (brainstorm), à planifier
**Auteur :** XO + Uriel

## Problème

Un prospect veut souscrire au Pro et cherche un champ pour son numéro SIREN/SIRET :
il ne le trouve pas. Constats :

1. Notre Checkout Stripe a déjà `tax_id_collection: enabled`, mais ce champ est
   **caché** derrière un lien « Add tax ID » peu visible, **et surtout** Stripe ne
   collecte pour la France que le **n° de TVA intracommunautaire** (`eu_vat`). Il
   **n'existe pas** de type `fr_siren`/`fr_siret` chez Stripe. La majorité de nos
   clients (artisans, micro-entreprises en franchise de TVA) n'ont **pas** de n° de
   TVA → rien à saisir.
2. La réforme **facturation électronique** rend le **SIREN du client** obligatoire
   sur les factures B2B. Échéances qui nous concernent : *réception* au 1ᵉʳ sept 2026
   (toutes entreprises), *émission* au 1ᵉʳ sept **2027** pour TPE/PME/micro (nous +
   quasi tous nos clients). Le **SIRET de l'émetteur** (14 chiffres) doit aussi figurer.

**Conclusion :** on ne peut pas s'appuyer sur Stripe pour collecter le SIREN. On le
collecte nous-mêmes et on le pousse sur les factures Stripe (champ personnalisé).

## Périmètre

**Dans ce lot :**
- Collecte du **SIREN** (9 chiffres) + **raison sociale** (nom légal) du client.
- Saisie **avant le checkout** (modale sur la Boutique), **obligatoire** avec une case
  d'échappement « Je n'ai pas de SIREN (étranger/particulier) ».
- Section **éditable dans la page Abonnement** pour que les abonnés existants se
  mettent en règle.
- Synchro vers le **Customer Stripe** : `name` = raison sociale + `invoice_settings.custom_fields`
  = `[{ name: 'SIREN', value: <siren> }]` → le SIREN s'imprime sur chaque facture.
- **SIRET émetteur** (Fellowship) : à renseigner dans le **Dashboard Stripe** (manuel,
  hors code) → s'imprime en tête de facture.

**Hors périmètre (repoussé) :**
- Conformité e-invoicing complète (**Factur-X / UBL via plateforme agréée**) →
  chantier ~2027 (échéance émission TPE/PME). Stripe n'est pas encore PDP.
- Collecte du n° de TVA intracommunautaire (déjà géré par `tax_id_collection` Stripe
  pour ceux qui en ont un).

## Données

Migration ajoutant 3 colonnes nullable à `entities` :

| Colonne | Type | Sens |
|---|---|---|
| `legal_name` | `TEXT` | Raison sociale légale (ex. « Uriel Lahoussaye EI »), distincte de `brand_name` (la marque). |
| `siren` | `TEXT` | 9 chiffres normalisés (sans espaces). `NULL` si `billing_no_siren`. |
| `billing_no_siren` | `BOOLEAN DEFAULT false` | Case d'échappement : client sans SIREN (étranger/particulier). |

- Aucune n'est une colonne « plan/abonnement » → vérifier que le trigger
  `protect_entity_plan` **ne les bloque pas** (il ne garde que les colonnes plan/Stripe).
  Si besoin, l'étendre n'est PAS requis ici (on ne protège pas ces champs).
- **RLS** : le propriétaire de l'entité doit pouvoir lire/écrire ces colonnes via la
  policy owner-update existante sur `entities`. À vérifier (sinon la synchro passe de
  toute façon par l'edge function en service-role).

## Validation (lib pure, TDD)

`src/lib/siren.ts` :
```
validateSiren(input: string): { valid: boolean; normalized: string }
```
- Retire espaces/séparateurs, exige **exactement 9 chiffres**, vérifie la **clé de Luhn**
  (le SIREN est un nombre de Luhn valide).
- Tests unitaires : SIREN réels valides, longueur ≠ 9, Luhn KO, caractères non numériques,
  entrée vide. Fonction pure, sans dépendance React.

## UX — modale Boutique (avant checkout)

Dans `Boutique.tsx`, `handleClick(interval)` :
1. Si l'entité a déjà (`siren` **ou** `billing_no_siren`) **et** `legal_name` → checkout
   direct (comportement actuel).
2. Sinon → ouvre une **modale « Informations de facturation »** :
   - **Raison sociale** (préremplie avec `brand_name`, éditable, requise).
   - **SIREN** (9 chiffres, validé Luhn en direct, message d'erreur inline).
   - Case **« Je n'ai pas de SIREN (étranger/particulier) »** → masque/neutralise le
     champ SIREN et débloque.
   - Bouton **« Continuer vers le paiement »** désactivé tant que `legal_name` vide
     OU (SIREN invalide ET case non cochée).
3. À la validation → on passe `legalName`, `siren`, `noSiren` dans le body de
   `startCheckout` (qui les relaie à l'edge function).

La modale réutilise la coquille modale existante (tokens DA, pas de nouvelles classes
globales génériques — cf. pièges CSS du projet).

## UX — section éditable « Facturation » (Abonnement)

Dans `Abonnement.tsx`, une carte **« Informations de facturation »** (visible quel que
soit l'état d'abonnement de l'entité) :
- Affiche raison sociale + SIREN actuels, bouton « Modifier ».
- Même formulaire que la modale (raison sociale, SIREN+Luhn, case sans SIREN).
- À l'enregistrement → appelle l'edge function de synchro (cf. ci-dessous), qui persiste
  sur `entities` **et** met à jour le Customer Stripe si `stripe_customer_id` existe.
- Couvre les **abonnés existants** (ex. 1ʳᵉ cliente) qui n'ont jamais vu la modale.

## Synchro Stripe

**Helper partagé** `_shared/billing.ts` (ou inline) — `syncCustomerBilling(stripe, customerId, { legalName, siren, noSiren })` :
- `customers.update(customerId, { name: legalName, invoice_settings: { custom_fields: siren ? [{ name: 'SIREN', value: siren }] : [] }, metadata: { siren: siren ?? '' } })`.

**`stripe-checkout-session`** (modifié) :
- Body étendu : `{ entityId, billingInterval, legalName?, siren?, noSiren? }`.
- Persiste `legal_name`/`siren`/`billing_no_siren` sur `entities` (admin).
- À la création du Customer : passe `name: legalName` au lieu de rien ; sinon `customers.update`.
- **Retire `name: 'auto'`** de `customer_update` (sinon Stripe écrase la raison sociale
  par ce que tape l'utilisateur au Checkout). **Garde `address: 'auto'`** (l'adresse de
  facturation reste collectée par Stripe).
- Applique `syncCustomerBilling` (custom_fields SIREN + metadata).

**Nouvelle edge function `stripe-update-billing`** (pour le path Abonnement) :
- Body : `{ entityId, legalName, siren?, noSiren }`. Auth `verify_jwt` + `can_act_as`.
- Persiste sur `entities` (admin).
- Si `stripe_customer_id` existe → `syncCustomerBilling`. Sinon, no-op Stripe (la synchro
  se fera au checkout). Renvoie `{ ok: true }`.
- Client : `src/lib/stripe-client.ts` → `updateBillingInfo(entityId, payload)`.

## SIRET émetteur (Fellowship) — manuel, hors code

Dans le **Dashboard Stripe** : Coordonnées de l'entreprise + **Account tax ID** (SIRET
14 chiffres) → s'imprime en tête de chaque facture/reçu. Aucun déploiement requis.
Checklist à dérouler avec Uriel une fois le SIRET Fellowship sous la main.

## Erreurs & cas limites

- SIREN invalide → bloqué côté client (Luhn). Pas de revalidation serveur stricte
  (best-effort : si un SIREN passe le Luhn mais n'existe pas, on l'accepte — pas
  d'appel API INSEE en V1).
- `custom_fields` Stripe : `value` ≤ 30 caractères (SIREN 9 chiffres OK), max 4 champs.
- Customer déjà créé sans `name` → `customers.update` le fixe rétroactivement.
- Entité gratuite qui édite dans Abonnement sans `stripe_customer_id` → on persiste, pas
  d'appel Stripe ; synchro différée au checkout.

## Tests

- **`src/lib/siren.ts`** : tests unitaires Luhn (pur).
- Modale Boutique : test de la logique d'activation du bouton (helper pur si extrait).
- Edge functions : non testées automatiquement (pattern projet) ; recette live manuelle.

## Recette live (à dérouler par Uriel, Stripe test mode)

1. Entité gratuite → Boutique → clic essai → modale SIREN → saisie valide → checkout →
   vérifier `entities.siren`/`legal_name` peuplés + Customer Stripe `name` + custom field
   « SIREN » sur la facture d'essai/1ʳᵉ facture.
2. Case « pas de SIREN » → checkout passe sans SIREN, pas de custom field.
3. Abonné existant → Abonnement → section Facturation → saisie → vérifier maj Customer
   Stripe immédiate.
4. SIRET émetteur visible en tête de facture après config Dashboard.
