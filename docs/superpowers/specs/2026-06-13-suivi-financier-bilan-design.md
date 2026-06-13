# Suivi financier des festivals — registre de lignes + capture au moment du paiement

**Date :** 2026-06-13
**Statut :** Design validé (Uriel OK 2026-06-13)
**Auteur :** Claude (XO) + Uriel

## Problème

Aujourd'hui deux briques vivent en silo :

1. **Statut de paiement** (`participations.payment_status`) : stepper `À payer → Acompte versé → Payé`, affiché à l'exposant quand sa participation est *Accepté/Inscrit*. **Aucun montant n'est capturé** — juste l'étape.
2. **Bilan post-événement** (`event_reports`, Pro) : 3 champs rigides *Coût emplacement / Charges / Chiffre d'affaires* + *Bénéfice* calculé, plus note/photos/points-à-améliorer.

Conséquence : l'exposant pose son statut « Payé » sans trace du montant, puis **oublie le prix du stand** au moment de faire son bilan des mois plus tard. Et le modèle à 3 champs ne colle pas à la réalité (essence, péages, hébergement, repas, remboursements, cachets…).

Par ailleurs, « Payé » est **ambigu** : certains exposants *paient* leur place (artisans, marchés), d'autres sont *payés* pour venir (cachet — musiciens, invités, performeurs). Le même bouton mélange deux sens d'argent opposés.

## Objectif

Transformer le bilan en **registre de lignes financières dans les deux sens**, alimenté **sans friction** par la capture du montant au moment où l'exposant pose son statut de paiement. Aider l'exposant à *gérer son dossier* : son P&L par festival se construit tout seul à partir de gestes qu'il fait déjà.

Garde-fous non négociables :
- **Ne pas devenir une app de compta.** Liste de catégories *fixe et courte*, pas de taxonomie configurable.
- **Ne pas surcharger le stepper avec le sens.** Le stepper porte uniquement « ma place / mon cachet ». Tout le reste vit dans le registre.

## Modèle conceptuel

### 1. Orientation par festival (seul concept nouveau)
Un toggle dans le bloc paiement de l'EventDashboard : **« Je paie ma place » / « On me paie pour venir »** (défaut = `payeur`). Persisté sur la participation. Il fait trois choses :
- **relabelle le stepper** : `À payer → Acompte versé → Payé` *ou* `À recevoir → Acompte reçu → Reçu` ;
- **fixe le sens et la catégorie** de la ligne auto-créée (`out`/`emplacement` vs `in`/`cachet`) ;
- devient un **attribut filtrable** (cockpit : « cachets reçus / emplacements payés »).

### 2. Le bilan devient un registre de lignes
Chaque ligne = *libellé + montant + sens (in/out) + catégorie*. Catégories fixes :
`emplacement`, `cachet`, `essence`, `peage`, `hebergement`, `repas`, `remboursement`, `ventes`, `autre`.
Chaque catégorie a un **sens par défaut** (emplacement/essence/peage/hebergement/repas → `out` ; cachet/remboursement/ventes → `in` ; autre → `out`, modifiable). Libellé libre en secours.

**Bénéfice = somme(in) − somme(out)**, calculé en live.

Le reste du bilan (note libre, points à améliorer, photos souvenir privées) est **inchangé**.

### 3. Capture sans friction (le tournant)
Au clic sur « Acompte versé »/« Payé » (ou « Acompte reçu »/« Reçu »), mini-prompt inline **« Prix total ? »** (un seul chiffre — le prix total de la place/cachet ; l'acompte n'est qu'un état de règlement, pas un 2e montant). À la validation :
- maj du `payment_status` ;
- **upsert d'UNE ligne** `source='stepper'` dans le registre (catégorie `emplacement` si payeur / `cachet` si payé, sens par défaut), idempotente par participation : ré-éditer le montant met à jour la même ligne, ne l'empile pas.

## Architecture & composants

### Base de données (migration Supabase)

**Nouvelle table `event_ledger_entries`** :
```
id           uuid pk default gen_random_uuid()
report_id    uuid not null references event_reports(id) on delete cascade
actor_id     uuid not null references actors(id) on delete cascade
event_id     uuid not null references events(id) on delete cascade
label        text                       -- null = libellé dérivé de la catégorie
amount       numeric not null check (amount >= 0)
direction    text not null check (direction in ('in','out'))
category     text not null check (category in ('emplacement','cachet','essence','peage','hebergement','repas','remboursement','ventes','autre'))
source       text not null default 'manual' check (source in ('stepper','manual'))
created_at   timestamptz not null default now()
```
- **Index unique partiel** garantissant une seule ligne stepper par bilan :
  `unique (report_id) where source = 'stepper'`.
- **RLS** : owner-only via `can_act_as(actor_id)`, calqué sur `event_reports_write_actor` (un seul policy `FOR ALL`). Pas d'accès admin (les chiffres perso restent privés, cf. `20260602160001_fix_event_reports_private`).
- **Migration des données existantes** : pour chaque `event_reports` avec un montant non-null, créer les lignes correspondantes (`booth_cost`→`emplacement`/out, `charges`→`autre`/out, `revenue`→`ventes`/in). Les colonnes `booth_cost/charges/revenue` sont **laissées dormantes** (pas de DROP — dump préalable conforme à la préférence « backup avant DROP »). Le code cesse de les lire/écrire.

**Colonne `participations.payment_orientation`** :
```
payment_orientation text not null default 'payeur' check (payment_orientation in ('payeur','paye'))
```

> Note enum : `payment_status`/`category`/`direction`/`orientation` sont des colonnes **texte avec CHECK** (pas des types enum PG) — cohérent avec l'existant (`payment_status` est déjà texte libre + CHECK), donc pas de piège `ALTER TYPE ... ADD VALUE` en transaction.

### Lib (`src/lib/`)
- **`ledger.ts`** (nouveau) : catalogue des catégories (`LEDGER_CATEGORIES` : clé, label FR, sens par défaut, emoji optionnel) ; helpers `ledgerProfit(entries)` (= somme in − somme out), `defaultDirectionFor(category)`. Testable purement.
- **`cockpit-bilans.ts`** : `bilanProfit` rebranché sur les lignes du registre au lieu des 3 colonnes. `PastBilan.profit` = `ledgerProfit(entries)` (null si aucune ligne). Charger les lignes par event dans l'agrégation cockpit.
- **Hook reports** (`use-reports.ts`) : étendre pour charger/écrire les lignes du registre avec le bilan.

### UI
- **`EventDashboard.tsx`** (bloc paiement) :
  - toggle orientation (relabel `PAYMENT_STEPS` selon `payment_orientation`) ;
  - au clic stepper sur acompte/payé → ouverture d'un mini-champ montant inline (pas une modale lourde) → `handlePaymentChange` met à jour le statut **et** upsert la ligne stepper.
  - `EventDashboardMobile.tsx` : même comportement.
- **`EventReportForm.tsx`** : remplacer la grille 3 champs par l'**éditeur de registre** (liste de lignes + bouton « Ajouter une ligne » → choix catégorie dans la liste fixe, montant, sens pré-rempli/éditable, libellé optionnel). La ligne `stepper` apparaît déjà, éditable. Bénéfice recalculé en live. Note/photos/améliorations inchangés.
- **`MesBilans.tsx` / cockpit** : agrégation sur le registre + bloc bonus « cachets reçus / emplacements payés » (split par `payment_orientation`).

### Types
Régénérer `src/types/supabase.ts` (ou cast `as any` ponctuel pour les nouvelles tables/RPC selon précédent projet) ; exposer `LedgerEntry`/`LedgerEntryInsert` dans `src/types/database.ts`.

## Gating freemium (décision validée)

- **Capture du montant au stepper = accessible à TOUS** (gratuit inclus). C'est le hameçon et ça capture la donnée tôt. La ligne `emplacement`/`cachet` est créée même pour un gratuit.
- **Registre complet + bénéfice + bilan = Pro.** Chez le gratuit, la ligne captée s'affiche **en lecture seule** comme teaser Pro (« Débloque ton bilan complet »).

Cohérent avec la matrice freemium (`project_freemium_matrix` : bilan/cockpit = Pro teasés).

## Flux de données (résumé)

```
Stepper (acompte/payé) ──montant──▶ upsert ledger line (source=stepper)
                                          │
participations.payment_orientation ──────┤ (sens + catégorie de la ligne auto)
                                          ▼
        event_ledger_entries ──ledgerProfit()──▶ Bénéfice (bilan + cockpit)
                                          ▲
        Bilan : ajout/édition de lignes manuelles (liste fixe)
```

## Gestion des cas limites
- **Acompte puis Payé** : même ligne stepper mise à jour (le prix total ne change pas ; seul `payment_status` évolue). Pas de doublon.
- **Changement d'orientation après capture** : la ligne stepper existante est **ré-orientée en place** — catégorie et sens recalculés selon la nouvelle orientation (`emplacement`/out ↔ `cachet`/in), **montant préservé**. Reste une seule ligne `source=stepper`.
- **Suppression de la participation / du bilan** : `on delete cascade` nettoie les lignes.
- **Montant vidé** : si l'exposant efface le montant au stepper, on garde le statut mais on supprime la ligne stepper (pas de ligne à 0).
- **Bilan sans aucune ligne** : `profit = null` (affiché « — », comme aujourd'hui quand le bilan n'est pas rempli).

## Tests
- `ledger.ts` : `ledgerProfit` (mix in/out, vide, null), `defaultDirectionFor` par catégorie. Pur, suit le pattern de test du projet (fonctions pures, cf. `reference_react_test_infra`).
- `cockpit-bilans.test.ts` : profit rebranché sur lignes, split cachets/emplacements.
- Test d'idempotence de l'upsert stepper (une seule ligne `source=stepper` par bilan).

## Hors périmètre (YAGNI v1)
- Catégories personnalisables / configurables.
- Acompte + restant dû suivis séparément (on stocke le prix total uniquement).
- Multi-devise.
- Export comptable (CSV/PDF) — candidat v2 si demandé.
- Mode « payé » avec stepper inversé poussé plus loin que le relabel + le sens de la ligne.

## Périmètre = un seul plan d'implémentation
Cohérent et borné : 1 migration DB + 1 lib + branchements UI existants. Découpable en phases (DB+migration data → lib+types → UI dashboard → UI bilan → cockpit) mais reste un seul spec → un seul plan.
