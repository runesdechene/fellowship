# 3A — Recâblage cœur : sélecteur + nav cible + gating — Design

- **Date :** 2026-05-25
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `validé` (design approuvé, prêt pour writing-plans)
- **Branche :** `feat/accounts-foundation` (fondation + onboarding déjà dessus ; 3A s'y enchaîne)
- **Specs produit de référence :** [`docs/decisions/0001`](../../decisions/0001-fondations-vision-packs-da.md) (matrice gratuit/Pro §5) + [`docs/decisions/0002`](../../decisions/0002-cockpit-exposant.md) (nav, sélecteur d'entité)
- **Dépend de :** fondation (`actors/users/entities/memberships`, `actor_id`/`*_actor`/`acted_by_user_id`, `AuthContext` : `person`/`entities`/`currentActor`/`currentActorRow`/`switchActor`/`can`) + onboarding (Plan 2).

> **Position dans la série :** Plan 3 (recâblage app) a été décomposé en sous-projets : **3A** (ce doc), 3C (invitations), 3D (admin), puis Plan 4 (contract). Le gating gratuit/Pro (initialement « 3B ») est **absorbé dans 3A** car la nav cible et ses cadenas forment un seul système visuel (décision Uriel 2026-05-25).

> **But :** faire fonctionner l'app **« au nom de l'acteur courant »** : poser la **nav cible** pilotée par `currentActor` (avec sélecteur d'entité, cadenas Pro, placeholders), et recâbler **toute la couche data** sur `actor_id`/`*_actor`. Tout reste dans le **style actuel** de l'app (la DA « Nuit de Festival » est une refonte globale séparée).

---

## 1. Décisions de cadrage (tranchées avec Uriel, 2026-05-25)

1. **Nav cible complète maintenant** (pas la nav minimale) : la structure de menu décidée (0002) est posée dès 3A, pilotée par `currentActor`.
2. **Sélecteur d'entité visible seulement si `entities.length ≥ 1`** ; sinon on affiche juste le nom/avatar du compte (un festivalier pur n'a pas de sélecteur).
3. **Gating absorbé dans 3A** : les surfaces Pro (Calendrier, Communauté, Tableau de bord) sont cadenassées pour l'exposant gratuit (« teaser, pas cacher »). Plan lu = `person.plan` (l'utilisateur connecté = le Chef/owner dans le cas courant ; le cas « membre non-owner » sera raffiné en 3C).
4. **Pages non construites** (Mes dates, Mes créateurs, Communauté) → **placeholder « Bientôt disponible »** (stub léger). Documents → omis (feature reportée V1).
5. **Vues/RPC sociales réécrites en place** sur `*_actor` (mêmes noms ; relations entre **acteurs** = compagnons) ; les appelants passent `currentActor.id`.
6. **Au switch d'acteur**, si la route courante est invalide pour le nouvel acteur → redirection `/explorer` (surface partagée).
7. **Style :** style actuel de l'app. DA refonte = hors périmètre.

---

## 2. Partie 1 — Sélecteur + nav cible + gating

### Nav par type d'acteur
| Acteur actif | Items de nav |
|---|---|
| **Personne** (festivalier) | Explorer · **Mes dates** *(Bientôt)* · **Mes créateurs** *(Bientôt)* · Profil · Réglages |
| **Entité exposant** | Explorer · **Tableau de bord** · **Calendrier** · **Communauté** · Ma vitrine · Réglages |
| (Entité festival/orga) | N/A en V1 (aucune entité festival créée — V2) |
| **Admin** (`users.role==='admin'`) | + lien **Admin** (internes recâblés en 3D) |

### États des entrées (exposant)
| Entrée | Existe ? | Gating | État en 3A |
|---|---|---|---|
| Explorer | oui | gratuit | actif |
| Ma vitrine | oui (PublicProfile vue owner) | gratuit | actif |
| Tableau de bord | oui (basique) | **Pro** | cadenas si gratuit ; page basique si Pro |
| Calendrier | oui | **Pro** | cadenas si gratuit ; actif si Pro |
| Communauté | **non** | **Pro** | cadenas si gratuit ; **« Bientôt »** si Pro |
| Mes dates (personne) | **non** | gratuit | **« Bientôt »** |
| Mes créateurs (personne) | **non** | gratuit | **« Bientôt »** |

### Sélecteur d'entité
- Emplacement : haut de `Sidebar` (desktop) + équivalent dans `BottomBar`/menu mobile.
- Visible si `entities.length ≥ 1`. Liste : **Personne** (nom + « Festivalier ») puis chaque **entité** (brand_name + type). Sélection → `switchActor(actorId)` (persisté, déjà géré par le contexte).
- Au switch : si la route courante n'est pas dans la nav du nouvel acteur → `navigate('/explorer')`.

### Gating (cadenas Pro)
- Un helper pur décide, pour un acteur + un plan, l'état d'une entrée : `actif` | `lock-pro` | `bientot`.
- `lock-pro` : l'entrée reste **visible** avec une icône cadenas ; au clic → écran/teaser « Passe en Pro » (réutilise/étend l'existant ; le détail floutté riche = Plans 5-8). Plan source = `person.plan`.

### Placeholder « Bientôt disponible »
- Page stub réutilisable (titre de la surface + « Bientôt disponible ») pour Mes dates, Mes créateurs, Communauté(Pro). Routes ajoutées si absentes.

---

## 3. Partie 2 — Recâblage data layer sur `actor_id`

### Principe
Toute action est effectuée **au nom de `currentActor.id`** et **tracée** par `acted_by_user_id = auth.uid()`. Les hooks lisent `currentActor.id` du contexte et **re-fetchent au changement d'acteur** (clé de requête = id de l'acteur courant).

### Tables & colonnes cibles
| Domaine | Lecture / écriture passe de → à |
|---|---|
| participations | `user_id` → `actor_id` (+ `acted_by_user_id`) ; unicité `(actor_id, event_id)` |
| follows | `follower_id`/`following_id` → `follower_actor`/`following_actor` |
| reviews | `user_id` → `actor_id` (+ audit) ; conflit upsert `(actor_id, event_id)` |
| notes | `user_id` → `actor_id` (+ audit) ; ownership UI via `acted_by_user_id`/`actor_id` |
| event_reports | `user_id` → `actor_id` (+ audit) ; conflit `(actor_id, event_id)` |
| notifications | `user_id` → `actor_id` (destinataire) |
| events (création) | `created_by` → `created_by_actor` (+ `acted_by_user_id`) |

### Vues / RPC sociales (réécriture en place sur `*_actor`)
- `friends`, `event_scores`, `get_friend_ids`, `get_friends_with_dates`, `are_friends`, `are_friends_of_friends` : réécrites pour opérer sur `follower_actor`/`following_actor`/`actor_id`. **Mêmes noms.** Sémantique : compagnons = follow mutuel entre **acteurs**. Les appelants passent `currentActor.id` (au lieu de `user.id`).
- Migration SQL dédiée (`CREATE OR REPLACE VIEW` / `FUNCTION`).

### Résolution slug vitrine
- `PublicProfile` / `Embed` résolvent le slug via `entities.public_slug` (au lieu de `profiles.public_slug`) ; les participations/abonnés de la vitrine se lisent via l'`actor_id` de l'entité.

### Lectures « profil » d'affichage
- Les jointures qui affichaient `profiles(display_name/avatar/type)` passent sur l'acteur correspondant. **Décision :** on ajoute une vue SQL **`actor_public(actor_id, kind, label, avatar_url, entity_type)`** qui agrège `users` (label=display_name, entity_type=null) et `entities` (label=brand_name, entity_type=type). Les affichages « qui » (compagnons, participants, auteurs de notes/avis) joignent cette vue sur l'`actor_id` — un seul point de lecture, kind-agnostique.

---

## 4. Découpage build (à l'écriture du plan)

Deux sous-plans indépendamment testables :
- **3A.1 — Sélecteur + nav cible + gating + placeholders** (couche UI/nav, pilotée par `currentActor`).
- **3A.2 — Recâblage data layer + vues sociales + slug** (couche données).

Ordre conseillé : 3A.2 d'abord (la couche data correcte sous l'acteur courant, personne par défaut), puis 3A.1 (sélecteur qui rend le multi-casquette visible). Ou l'inverse — à trancher au plan ; les deux convergent vers « l'app agit en tant qu'acteur courant ».

---

## 5. Composants & unités

- **Helpers purs** (`src/lib/navModel.ts` ou étendre `actorModel.ts`) + tests Vitest :
  - `navItemsFor(actor)` → liste d'items de nav selon le type d'acteur.
  - `entryState(item, actor, plan)` → `'active' | 'lock-pro' | 'bientot'`.
  - `isRouteValidFor(route, actor)` → bool (pour la redirection au switch).
- **Sélecteur** : nouveau composant `EntitySwitcher` (consomme `person`/`entities`/`currentActor`/`switchActor`).
- **Placeholder** : composant `ComingSoon` réutilisable + routes.
- **Data layer** : modifier les hooks (`use-participations`, `use-follows`, `use-following-ids`, `use-reviews`, `use-notes`, `use-reports`, `use-notifications`, `use-events`/EventForm) pour lire/écrire `actor_id`/`*_actor` + `acted_by_user_id` depuis `currentActor`.
- **Migration SQL** : réécriture des vues/RPC sociales sur `*_actor` + nouvelle vue `actor_public` (users+entities unifiés pour les affichages « qui »).

---

## 6. Erreurs / edge cases
- **Switch d'acteur en cours de mutation** : on n'interrompt pas une écriture en vol ; le re-fetch suit le nouvel acteur. Acceptable (rare).
- **Membre non-owner & plan** : 3A lit `person.plan` (cas courant = owner). Le cas « employé agissant sur l'entité d'un owner Pro » est raffiné en 3C (invitations). Noté comme simplification assumée.
- **Acteur courant supprimé/retiré** (entité dont on n'est plus membre) : `pickCurrentActor` retombe déjà sur la personne (fondation) → pas de blocage.

## 7. Tests
- Vitest sur les helpers purs (`navItemsFor`, `entryState`, `isRouteValidFor`) : personne vs exposant, gratuit vs Pro, route valide/invalide.
- Smoke API : en agissant comme une entité (acteur courant = entité), une écriture (ex. participation) porte le bon `actor_id` **et** `acted_by_user_id = auth.uid()` ; les vues sociales renvoient les compagnons par `*_actor`.
- Build + lint verts.

## 8. Hors périmètre 3A
DA « Nuit de Festival » · invitations multi-gérants (3C) · recâblage interne des pages admin (3D) · contract / drop legacy + `SET NOT NULL` participations + retrait alias `profile` (Plan 4) · construction réelle des pages « Bientôt » (Plans 5-8) · teasers Pro floutés riches (Plans 5-8 ; 3A = cadenas + écran « Passe en Pro » simple).

## 9. Risques
| Risque | Mitigation |
|---|---|
| 3A trop gros pour un seul plan | Split 3A.1 / 3A.2 à l'écriture ; tasks bite-sized. |
| Re-fetch non déclenché au switch d'acteur | `currentActor.id` en dépendance des hooks/queries ; vérifié au smoke. |
| Régression des vues sociales (legacy → actor) | Réécriture en place + smoke compagnons ; colonnes legacy conservées jusqu'au contract (rollback possible). |
| Affichage « qui » (nom/avatar) cassé après bascule | Vue `actor_public` unifiée users+entities (à préciser au plan). |
| Gating incorrect pour un membre non-owner | Assumé en 3A (person.plan) ; raffiné en 3C. |
