# Lot 8b — Les éditions d'un festival (V2)

> 09/10/2026. Deuxième partie du lot 8 (notifications et alertes), après 8a (la cloche et les
> discussions, livré). Design validé par Uriel le 09/10/2026.

## Pourquoi

Chaque année d'un festival est une fiche à part, sans lien avec la précédente (seul
`events.edition`, un numéro, existe). Or deux choses en dépendent :

- **l'alerte « nouvelle édition »** du Pro (Dev.md, 07/10/2026) ;
- **l'idée du retour client du 08/10/2026** : « tu postules à Yggdrasil 2026 et sur la fiche
  s'affiche ton bilan de l'an passé, comme ça tu sais directement si tu as envie de le refaire ».

## Décisions (Uriel, 09/10/2026)

1. **Le lien se pose à la création.** La recherche de doublons de « Ajouter une date » propose,
   pour un festival semblable déjà passé, « C'est sa nouvelle édition ». Celui qui ajoute sait.
2. **Rattrapage des festivals existants** : les paires probables (même nom, même ville, années
   qui se suivent) sont présentées à Uriel ; **rien n'est écrit avant sa validation**.
3. **L'alerte va aux Pro qui étaient inscrits à l'édition précédente** (inscrit, confirmé). Un
   gratuit ne la reçoit pas. Dans la cloche, elle porte le bouton **« Repérer »**. Pas d'e-mail
   avant le lot 8c.
4. **Le bilan de l'an passé** s'affiche sous le statut de la fiche d'une nouvelle édition, si
   l'édition précédente a un bilan **rempli** pour l'enseigne ; flouté en gratuit.

## Les maquettes — elles font foi

| Ce qui | Cadre Figma |
|---|---|
| Le bilan de l'an passé sur la fiche | `2027 — Fiche · ton bilan de l'an passé` (`2177:2`), validé le 09/10/2026 |
| La notification « Nouvelle édition » et son « Repérer » | `2027 — Notifications` (`2088:6`) |

## Ce que le lot livre

### 1. En base

- **`events.previous_edition_id`** (`uuid`, référence `events(id)`, `ON DELETE SET NULL`, index) :
  l'édition précédente du même festival. Une édition ne pointe que vers une seule précédente.
- **Type de notification `new_edition`** (migration seule, comme `thread_question`).
- **Déclencheur `notify_new_edition`**, AFTER INSERT sur `events`, quand `previous_edition_id`
  est posé, sur le modèle des déclencheurs du lot 8a (`SECURITY DEFINER`, `search_path`, garde
  `is_private`) : une notification par **enseigne Pro** (`plan = 'pro'` ou `comped_pro_until`
  dans le futur) qui avait une participation `inscrit` ou `confirme` à l'édition précédente, sauf
  le créateur. `data` : `event_id` (la nouvelle), `event_name`, `start_date`, `end_date`,
  `previous_event_id`, `previous_year`.
- Le déclencheur ne réagit **qu'à l'insertion** : le rattrapage (des `UPDATE`) ne prévient
  personne — piège des notifications en masse (`docs/db/gotchas.md`). `notify_event_updated` ne
  regarde pas cette colonne.

### 2. À la création d'une date

Dans l'avertissement de doublons (« Un événement ressemble »), un festival semblable **déjà
passé** porte « C'est sa nouvelle édition » ; choisi, il devient « Nouvelle édition de
{nom} {année} ✓ » (un second clic l'annule) et l'événement est créé avec `previous_edition_id`.
Un semblable à venir garde son conseil actuel (l'ouvrir plutôt que d'en créer un second).

### 3. Dans la cloche

`new_edition` : « Nouvelle édition » en surtitre, « **{event_name}** revient du {dates}. Tu y étais
en {previous_year}. », et le bouton **« Repérer »**, qui pose la nouvelle édition en « Intéressé »
pour l'enseigne destinataire de la notification (pas forcément l'acteur actif), puis devient
« Repérée ». Le clic sur la notification ouvre la fiche.

### 4. Sur la fiche

Si l'événement a une édition précédente et que l'acteur actif y a un **bilan rempli**
(`isFilled`, lot 7a) : la carte « Ton bilan {année} » sous le statut — bénéfice, chiffre
d'affaires, frais, objectif s'il y en avait un, étiquettes « Ce qui a marché » et « À
améliorer », « Ouvrir le bilan → » vers `/bilans/{id de l'édition précédente}`. En gratuit, la
carte passe sous le voile (`ProVeil`) avec « Tes bilans avec le Pro → » et sans le lien.

### 5. Le rattrapage

Une requête en **lecture seule** liste les paires candidates (nom normalisé identique, même
ville, débuts espacés de 300 à 430 jours, aucune déjà liée) ; je les présente à Uriel ; seules les
paires validées entrent dans une migration d'`UPDATE`.

## Comment c'est construit

- Migrations : `previous_edition_id`, valeur d'enum, déclencheur ; plus tard, celle du
  rattrapage.
- `lib/notifications.ts` : le type `new_edition` (phrase, surtitre, action « Repérer »).
- `features/notifications` : le bouton « Repérer » (upsert de `participations` pour l'acteur de
  la notification ; la lecture de la cloche rapporte aussi `actor_id`).
- `features/event-create` : le choix « C'est sa nouvelle édition » dans `DuplicateWarning`,
  `previousEditionId` dans le brouillon et l'insertion.
- `features/event` : `useLastEditionReport` (charge l'édition précédente et son bilan pour
  l'acteur actif) et `LastEditionReport` (la carte, Pro ou voilée).
- Types régénérés.

## Vérification

- Tests : la phrase `new_edition` ; le choix de l'édition dans le brouillon (fonction pure).
- Après migration, lecture seule : colonne, valeur d'enum, déclencheur présents.
- `pnpm lint`, tests, build ; la carte comparée à `2177:2`.
- Uriel teste : ajouter l'édition suivante d'un festival où son enseigne Pro était inscrite →
  l'alerte arrive, « Repérer » fonctionne, la fiche montre son bilan de l'an passé.

## Hors de ce lot

- Relier ou délier des éditions après coup (modification d'un événement) : lot 10.
- L'e-mail de l'alerte : lot 8c.
