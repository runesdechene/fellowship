# Pro par entité (contextuel à la structure active) — Design

> **Statut :** validé (brainstorm 2026-05-26). Corrige une incohérence d'architecture du gating Pro. Lié à la décision [[../../decisions/0001-fondations-vision-packs-da]] (packs/pricing) et à la matrice freemium. S'applique au **schéma actors** (branche `feat/da-nuit-festival-socle`, non mergée — prod n'a pas encore `entities`).

## Contexte & problème

L'abonnement Pro est aujourd'hui rattaché à la **personne** : la colonne `plan` (`user_plan`) vit sur la table `users`, et le gating le lit via `person.plan` :
- `src/components/layout/ProGate.tsx:9` → `person?.plan === 'pro'`
- `src/components/layout/Sidebar.tsx:22` → `person?.plan === 'pro' ? 'pro' : 'free'`
- (et `BottomBar.tsx` de même)

C'est incohérent avec le modèle métier : le Pro (« pour vivre de ton art ») est l'abonnement d'une **structure exposant**, pas d'un compte personnel. Conséquences du modèle actuel : un **festivalier** peut être « Pro » (absurde), et une personne gérant **plusieurs structures** aurait un Pro global au lieu d'un abonnement par structure.

Bonne nouvelle : la nav est **déjà actor-aware** (`navModel.navItemsFor` : entité → `EXPOSANT_NAV`, personne → `PERSON_NAV`), et les surfaces Pro (dashboard, calendrier, communauté) sont déjà réservées à la nav exposant. `entryState(key, plan)` est déjà une fonction pure paramétrée par `plan`. Le correctif est donc ciblé : **déplacer `plan` sur l'entité** et faire lire le plan de **l'acteur actif**.

## Principe

L'abonnement Pro appartient à une **entité**. On y accède en étant **en contexte de cette structure** (`currentActor.kind === 'entity'`). Une personne / un festivalier n'a aucune notion de Pro.

## Données (migration)

> S'applique au schéma actors (local / post-merge). Pas de `db push` prod ici (prod n'a pas `entities`).

1. **Ajouter** la colonne plan sur `entities` :
   ```sql
   ALTER TABLE public.entities ADD COLUMN plan public.user_plan NOT NULL DEFAULT 'free';
   ```
2. **Backfill** : une entité dont le·la propriétaire (`memberships.role = 'owner'`) est actuellement `users.plan = 'pro'` devient `'pro'` :
   ```sql
   UPDATE public.entities e SET plan = 'pro'
   WHERE e.actor_id IN (
     SELECT m.entity_actor_id FROM public.memberships m
     JOIN public.users u ON u.actor_id = m.user_actor_id
     WHERE u.plan = 'pro' AND m.role = 'owner'
   );
   ```
3. **Supprimer** `users.plan` (après que le code ne le lit plus) :
   ```sql
   ALTER TABLE public.users DROP COLUMN plan;
   ```
4. **Régénérer** les types (`UserRow` perd `plan`, `EntityRow` gagne `plan`).

`memberships` = `user_actor_id` / `entity_actor_id` / `role` (enum, valeur `owner`). `user_plan` enum existant (`free` | `pro`).

## Architecture logicielle

### Résolution du plan actif — helper pur (testable)
Dans `src/lib/navModel.ts` :
```ts
export function planForActor(
  actor: { kind: string } | null,
  entityRow: { plan?: Plan | null } | null,
): Plan {
  if (actor?.kind === 'entity') return entityRow?.plan === 'pro' ? 'pro' : 'free'
  return 'free'
}
```
- `entryState(key, plan)` (déjà pur) **inchangé**. `navItemsFor` **inchangé**.

### Lecture côté UI — les 5 consommateurs de `person.plan`
`useAuth()` expose déjà `currentActor` (acteur actif) et `currentActorRow` (la ligne `UserRow | EntityRow` de l'acteur actif). Tous remplacent leur lecture de `person.plan` par `planForActor(currentActor, currentActorRow)` :
- **`ProGate.tsx:9`** : `planForActor(...) === 'pro'`.
- **`Sidebar.tsx:22`** : `const plan = planForActor(currentActor, currentActorRow)`.
- **`BottomBar.tsx:17`** : idem.
- **`use-reviews.ts:37`** : `canSeeDetails = planForActor(currentActor, currentActorRow) === 'pro'` (le check `kind === 'entity'` est désormais encapsulé dans `planForActor`).
- **`components/reports/EventReportForm.tsx:34`** : `if (planForActor(currentActor, currentActorRow) !== 'pro')`.

> `currentActorRow` est l'`EntityRow` quand on agit en tant qu'entité (porte `plan`), sinon la `UserRow` (personne — `planForActor` renvoie `'free'`).

### Types
- `src/lib/auth.tsx` : `UserRow` perd `plan` ; `EntityRow` gagne `plan` (via régénération `supabase.ts` + types dérivés). Aucune logique d'auth à changer (les champs `person`/`entities`/`currentActorRow` existent déjà).

## Comportement

| Acteur actif | Plan résolu | Surfaces Pro |
|---|---|---|
| Entité `plan = 'pro'` | `pro` | débloquées |
| Entité `plan = 'free'` | `free` | teaser ProGate (par structure) |
| Personne / festivalier | `free` | non présentes dans sa nav ; teaser en backstop si route forcée |

Multi-entités : chaque structure a son `plan` indépendant ; le switch d'acteur (`switchActor`) change le contexte et donc le plan résolu.

## Hors périmètre
- Le **moyen** de devenir Pro (paiement / Stripe / page abonnement dans Réglages) — chantier séparé ultérieur.
- L'UX du teaser (déjà en place).

## Tests & vérification
- **TDD** sur `planForActor` : entité pro → pro ; entité free → free ; entité plan null → free ; personne (toute valeur) → free ; actor null → free.
- `pnpm build && pnpm lint && pnpm vitest run` verts.
- `grep` : plus aucune lecture de `person.plan` / `users.plan` / `.plan` côté `users` dans `src/`.
- Visuel (local, stack Docker) : en tant qu'**entité Pro** → calendrier/dashboard accessibles ; bascule entité **free** (via DB) → teaser ; en tant que **personne** → pas d'items Pro en nav.

## Risques
- **Ordre de migration** : backfill AVANT `DROP COLUMN users.plan` (la suite lit `users.plan`). Et le **code doit cesser de lire `users.plan` avant** que la colonne soit droppée en prod au merge — mais en dev local on applique tout d'affilée ; le code est repointé dans le même lot.
- Régénération de types : `EntityRow.plan` doit apparaître pour que `planForActor` type-check sans cast. Régénérer après la migration locale.
- Prod : rien n'est appliqué (schéma actors absent de prod) ; cette migration partira avec le merge de la branche.
