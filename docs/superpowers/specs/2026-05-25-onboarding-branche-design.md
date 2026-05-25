# Onboarding branché (Plan 2) — Design

- **Date :** 2026-05-25
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `validé` (design approuvé, prêt pour writing-plans)
- **Branche :** `feat/accounts-foundation` (la fondation comptes y est déjà, non mergée — ce plan s'y enchaîne)
- **Spec produit de référence :** [`docs/decisions/0001-fondations-vision-packs-da.md`](../../decisions/0001-fondations-vision-packs-da.md) §7 + maquette validée [`assets/onboarding.html`](../../decisions/assets/onboarding.html)
- **Dépend de :** plan fondation comptes [`../plans/2026-05-25-refonte-comptes-fondation.md`](../plans/2026-05-25-refonte-comptes-fondation.md) (modèle acteurs/users/entities/memberships, RPC `create_owned_entity`, `AuthContext` person/entities/currentActor/switchActor)

> **But :** recâbler l'onboarding sur le **nouveau modèle acteur** (personne + entités), en suivant la maquette validée, **sans** ouvrir les chantiers DA / upload d'image. L'onboarding écrit `users`/`entities` (plus jamais `profiles`).

---

## 1. Décisions de cadrage (tranchées avec Uriel, 2026-05-25)

1. **DA :** on construit l'onboarding dans le **style actuel de l'app** (clair chaud), cohérent avec le reste aujourd'hui. La DA « Nuit de Festival » sera appliquée lors d'une **refonte DA globale dédiée** (système 2 thèmes + toggle persistant partout, cf. 0001 §9). **Hors périmètre ici.**
2. **Avatars/logos :** **différés**. L'onboarding ne collecte que du **texte**. L'upload photo perso + logo marque se fera dans Paramètres / Ma vitrine (Plan 6). Pas de question de bucket storage dans ce plan.
3. **Exposant migré** (a déjà une entité issue du backfill, mais `display_name` à NULL) : l'onboarding fait une **complétion personne seule** (prénom uniquement), **sans** écran de choix et **sans** créer de 2e entité (anti-doublon).
4. **Acteur actif après création :** quand un nouvel exposant crée son entité, on **`switchActor(entityId)`** → il entre « en tant que » sa marque (cohérent avec l'écran final « Ta vitrine est prête »).
5. **Unicité du slug entité :** **vérif live débouncée** + indicateur « disponible / déjà pris », filet au submit.
6. **Namespace d'identité :**
   - **Entités** → `flw.sh/<public_slug>` (root, choisi par l'exposant).
   - **Personnes** → `flw.sh/u/<handle>`, **handle auto-généré** (le festivalier ne choisit aucun slug — il n'a pas besoin d'un lien « pur »).
   - On **réserve le namespace + ajoute `users.handle`** maintenant (archi propre, anti-migration), **mais on ne construit pas** de page profil festivalier dans ce plan (route `/u/` réservée pour plus tard).

---

## 2. Modèle de données touché

### Migration additive (sur la branche fondation, non mergée → ajout propre)
- `users.handle TEXT UNIQUE` — identifiant public de la personne. Nullable (généré à l'onboarding quand le prénom est saisi ; les comptes pré-onboarding l'ont NULL).
- Index implicite via la contrainte UNIQUE. RLS : pas de nouvelle policy (lecture déjà couverte par `users_select_all`).

### Écritures à l'onboarding (jamais `profiles`)
| Champ | Cas A (migré) | Cas B (festivalier) | Cas C (exposant) |
|---|---|---|---|
| `users.display_name` | prénom | prénom | prénom |
| `users.handle` | généré | généré | généré |
| `users.postal_code` | — | saisi | — (la loc va sur l'entité) |
| `users.department` | — | dérivé du CP | — |
| `entities` (via RPC + UPDATE) | — (existe déjà) | — | créée puis complétée |

- **Entité (cas C)** : `create_owned_entity('exposant', brand)` → `entityId` ; puis `UPDATE entities SET craft_type, city, department(dérivé), postal_code, public_slug WHERE actor_id = entityId`.
- **`refreshProfile()`** après écriture pour recharger `person`/`entities` dans le contexte.

> Le `department` est **dérivé du code postal** (2 premiers chiffres, cas Corse `2A/2B` et DOM `97x/98x` gérés). Comble un trou actuel : le filtre Explorer « Où » s'appuie sur `department`, que l'ancien onboarding ne renseignait pas.

---

## 3. Logique de flux

Lue à l'entrée depuis `AuthContext` (`person`, `entities`) :

### Cas A — la personne a déjà ≥ 1 entité (exposant migré)
1. **Pas d'écran de choix.** Une seule étape : « Comment on t'appelle ? » → prénom.
2. Submit : `users.display_name = prénom`, `users.handle = généré`, `switchActor(entities[0].actor_id)`.
3. → `/explorer`.

### Cas B — 0 entité, choix « Je découvre des festivals » (festivalier)
1. Prénom → Code postal → écran final « Bienvenue, <prénom> ».
2. Submit : `users` (display_name, handle, postal_code, department dérivé). Reste en **personne**.
3. → `/explorer`.

### Cas C — 0 entité, choix « Je suis exposant / créateur »
1. Prénom (la **personne d'abord**) → Marque → Métier (champ **libre**) → Ville + CP → Slug (`flw.sh/`, **sans `@`**, auto-pré-rempli depuis la marque) → écran final carte d'entité « rattachée à <prénom> ».
2. Submit : `users` (display_name, handle) → `create_owned_entity('exposant', brand)` → `UPDATE entities` (craft_type, city, department, postal_code, public_slug) → `switchActor(entityId)`.
3. → `/explorer`.

> `needsOnboarding` (cf. fondation) se vide dès que `users.display_name` est renseigné — vrai dans les 3 cas.

---

## 4. Composants & unités

### `src/lib/onboarding.ts` — helpers purs (testables ; RTL ne flushe pas le sync sur cette stack → on teste les fonctions pures)
- `slugify(text: string): string` — minuscules, sans accents (NFD), `[^a-z0-9]+` → `-`, trim des `-`. Base des **slugs entité** ET des **handles perso**.
- `deriveDepartment(postalCode: string): string | null` — code département FR depuis le CP (Corse `2A/2B`, DOM `971-976` ; sinon 2 premiers chiffres ; entrée invalide → `null`).
- `resolveOnboardingFlow(entities, chosenPath): OnboardingFlow` — détermine le cas (A/B/C), la liste d'étapes, et si une entité doit être créée. Centralise la logique des 3 cas (testée en isolation).

### `src/pages/Onboarding.tsx` — réécriture
- Wizard : dots de progression + bouton retour (paradigme de la maquette).
- Consomme `useAuth()` (`person`, `entities`, `refreshProfile`, `switchActor`).
- Branche le flux via `resolveOnboardingFlow`.
- Slug entité : input avec préfixe `flw.sh/` (sans `@`), auto-pré-rempli via `slugify(brand)`, vérif live d'unicité.

### Génération du handle (au submit)
- Base = `slugify(prénom)`. Vérif d'unicité sur `users.handle` ; si pris, **suffixe compteur** (`camille`, `camille-2`, `camille-3`…). Boucle bornée. Invisible pour l'utilisateur.

---

## 5. Unicité, erreurs, edge cases

- **Slug entité :** vérif live débouncée (~400 ms) sur `entities.public_slug` (RLS `entities_select_all` = lecture publique, OK). Indicateur « disponible / déjà pris ». Bouton final désactivé si pris/vide. **Filet :** collision au submit (course) → message + retour sur l'étape slug.
- **Handle perso :** résolu au submit (boucle d'unicité). Jamais bloquant pour l'utilisateur.
- **Échec RPC / réseau :** message inline, **pas de navigation**, saisie conservée.
- **Champ vide / invalide :** boutons « Continuer » désactivés tant que le champ requis de l'étape est vide (comme aujourd'hui).
- **CP invalide :** `deriveDepartment` renvoie `null` → on écrit `postal_code` tel quel et `department = null` (pas bloquant).

---

## 6. Tests (Vitest, fonctions pures)
- `slugify` : accents, espaces, caractères spéciaux, casse, trim.
- `deriveDepartment` : métropole, Corse `2A/2B` (CP `20xxx`), DOM (`971xx`…), entrée invalide.
- `resolveOnboardingFlow` : cas A (entité existante → flux prénom seul, pas de création), B (festivalier), C (exposant → création).
- (La génération de handle avec unicité = testée sur sa partie pure `slugify` + revue manuelle de la boucle DB ; pas d'e2e RTL.)

---

## 7. Hors périmètre (assumé)
- **DA « Nuit de Festival »** → refonte globale dédiée (système 2 thèmes + toggle persistant).
- **Upload photo perso / logo marque** → Paramètres / Ma vitrine (Plan 6). Pas de bucket storage ouvert ici.
- **Page profil public festivalier** (`/u/<handle>` ne pointe rien de construit en V1).
- **Sélecteur multi-entités + ajout d'une 2e entité** → Plan 3 (recâblage app).
- **Admin / modération** : pas de surface admin propre à l'onboarding ; la modération entités/slugs viendra avec le recâblage admin (Plan 3).

---

## 8. Risques & notes
| Risque | Mitigation |
|---|---|
| Doublon d'entité pour un exposant migré | Cas A détecté via `entities.length > 0` → complétion personne seule, aucune création. |
| Collision de slug/handle | Slug : vérif live + filet submit. Handle : boucle d'unicité au submit. |
| `department` mal dérivé (Corse/DOM) | `deriveDepartment` gère ces cas ; entrée invalide → `null` non bloquant. |
| Incohérence visuelle si on faisait du dark partiel | Choix tranché : style actuel, DA refonte = effort global séparé. |
