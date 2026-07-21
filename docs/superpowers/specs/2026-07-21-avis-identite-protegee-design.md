# Avis de festival — identité protégée (anti-représailles) — design

**Date** : 2026-07-21
**Statut** : validé (Uriel), prêt pour plan d'implémentation
**Auteur** : XO (Claude) + Uriel

## Contexte & problème

Une exposante refuse de laisser un avis honnête : elle craint qu'un **organisateur**
(ou une « taupe » parmi eux) voie son avis attribué et ne la réinvite pas.

**La peur est fondée techniquement.** Aujourd'hui :
- RLS `reviews_select_scores ON reviews USING (true)` → **tout compte authentifié**,
  y compris une entité de type `festival` (organisateur), lit les avis **attribués**
  (l'app joint `actor_public` pour afficher nom + avatar + slug).
- Aucun contrôle de participation : la policy `reviews_insert_exposant` a été droppée
  (`20260602150000`), il ne reste que `reviews_write_actor USING (can_act_as(actor_id))`.
  → **n'importe quel exposant peut noter n'importe quel festival, sans y avoir été.**

C'est existentiel pour la stratégie **« avis = bien commun exposants »** (décision 0005) :
si les exposants s'autocensurent, les avis deviennent tièdes et le moat s'effondre.

## Principe retenu (validé en brainstorming)

**Séparer le contenu de l'identité.**

1. **Le contenu de l'avis (notes affluence/organisation/rentabilité + commentaire) reste
   visible par tous** — c'est ce qui préserve la valeur de découverte pour un exposant
   qui n'a jamais fait le festival (le cas que les avis aident le plus).
2. **Le nom de l'auteur n'est révélé qu'aux amis pro** (follow **mutuel**).
3. **Un compte organisateur (entité type `festival`) ne voit jamais l'identité** d'un
   auteur, sur aucun avis — même s'il est « ami » (carve-out anti-taupe).
4. Pour tous les autres (inconnus, organisateurs), l'avis s'affiche **anonyme** :
   **« Un exposant vérifié · présent à cette édition »** + pastille neutre pro (ton sobre,
   pas de pseudo fantaisie).
5. **Vérification** : écrire un avis exige une **participation `inscrit`** sur cette
   édition — rend « vérifié » vrai **et** coupe le trashing anonyme (garde-fou de l'anonymat).
6. **Opt-in anonymat total** : une case « publier en anonyme total » sur le formulaire
   d'avis cache le nom **même de tes amis**. Défaut = **nom visible par tes amis**.

### Rendu selon le lecteur (récap)

| Lecteur | Voit le contenu | Voit le nom |
|---|---|---|
| L'auteur lui-même | ✅ | ✅ (+ indicateur « qui voit quoi ») |
| Ami pro (follow mutuel), avis non-anonyme-total | ✅ | ✅ |
| Ami pro, mais avis en **anonyme total** | ✅ | ❌ « Un exposant vérifié » |
| Non-ami (exposant lambda) | ✅ | ❌ « Un exposant vérifié » |
| **Compte organisateur** (type festival) | ✅ | ❌ « Un exposant vérifié » (même si ami) |

## Décision technique : carve-out organisateur = par **type d'acteur**, pas par event

`events` n'a **pas** de lien fiable « organisateur du festival » : `created_by_actor`
= qui a *ajouté* l'event (souvent un exposant de la communauté, pas l'orga). Baser le
carve-out sur cet event serait bancal.

→ On applique une règle **par type d'acteur du lecteur** : **quand l'acteur actif du
lecteur est une entité `type = 'festival'`, il ne voit jamais l'identité des auteurs**
(sur n'importe quel avis). C'est plus robuste (couvre l'orga de *ce* festival ET tout
compte organisateur « mole »), plus simple, et sans coût pour la découverte
(l'organisateur voit toujours le contenu). Un organisateur multi-casquettes peut
basculer sur sa casquette exposant : le seul recours contre ça reste l'**opt-in
anonymat total** de l'auteur + le fait de ne pas suivre la taupe en retour (assumé).

## Modèle de données

Ajout minimal sur `reviews` :

```sql
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;
```

`anonymous = true` → l'opt-in « anonyme total » : le nom est caché même des amis.

Rien d'autre : l'`actor_id` reste sur `reviews` (nécessaire aux notifs, à l'unicité
`actor_id,event_id`, et à l'auteur pour retrouver son propre avis). Ce qui change, c'est
**qui a le droit de le lire**.

## Enforcement (le cœur)

Aujourd'hui le front lit `reviews` en direct et joint `actor_public` côté client →
l'`actor_id` fuit. On passe par une **RPC de lecture** qui décide de révéler ou non
l'identité, et on **verrouille la lecture directe** ensuite.

### RPC `get_event_reviews(p_event_id uuid, p_viewer_actor uuid)`

`SECURITY DEFINER SET search_path = public`. `p_viewer_actor` = l'acteur actif du
lecteur, **validé par `can_act_as(p_viewer_actor)`** (sinon on refuse / on traite en
non-identifié — empêche l'usurpation d'identité pour sonder les amitiés d'un autre).

Pour chaque avis de l'event, renvoie toujours : `id, event_id, <scores>, comment,
created_at, updated_at`, un booléen `is_self` = `can_act_as(reviews.actor_id)`, et un
booléen `identity_visible` calculé ainsi :

```
identity_visible :=
     is_self
  OR ( reviews.anonymous = false
       AND NOT EXISTS (SELECT 1 FROM entities e WHERE e.actor_id = p_viewer_actor AND e.type = 'festival')  -- carve-out orga
       AND are_friends(p_viewer_actor, reviews.actor_id) )                                                   -- follow mutuel
```

- Si `identity_visible` : renvoyer aussi `author_actor_id, author_label,
  author_avatar_url, author_slug` (via `actor_public`).
- Sinon : ces champs à `NULL` (l'app affiche « Un exposant vérifié »).

> `are_friends(a, b)` existe déjà (`20260525120006`, `SECURITY DEFINER`). La vue
> `friends` = follow mutuel entre acteurs.

Prévoir aussi une RPC/`select` pour **l'avis de l'auteur lui-même** (`get_my_review`
ou filtre `is_self`) — le front en a besoin pour préremplir le formulaire (déjà fait
via `.eq('actor_id', currentActor.id)`, à conserver ou passer en RPC).

### Verrouillage de la lecture directe

Une fois le front bascule sur la RPC (déployé) : **révoquer la lecture directe qui
laisse fuir `actor_id`**. Deux options, à trancher au plan selon ce qui est le plus
propre sans casser d'autres lectures (`event_scores`, agrégats) :
- soit **révoquer `SELECT` sur `reviews` pour `authenticated`** et router 100% via RPC ;
- soit garder `SELECT` mais **révoquer la colonne `actor_id`** (revoke table puis grant
  des colonnes sûres — cf. `reference_pg_column_grant_revoke` : le revoke par colonne
  seul est inopérant).

**Ordre prod impératif** (`reference_supabase_mcp_is_prod`) : livrer la RPC + le front
qui l'utilise **AVANT** de révoquer la lecture directe, sinon le front déployé casse.

## Gate de vérification (participation)

Renforcer l'INSERT (et l'UPDATE) des avis : l'auteur doit avoir une **participation
`inscrit`** sur l'event.

```sql
-- Remplace/complète reviews_write_actor pour l'écriture.
-- (SELECT reste géré à part ; ici on parle d'INSERT/UPDATE.)
... WITH CHECK (
  can_act_as(actor_id)
  AND EXISTS (
    SELECT 1 FROM public.participations p
    WHERE p.actor_id = reviews.actor_id
      AND p.event_id = reviews.event_id
      AND p.status = 'inscrit'
  )
)
```

- Vérifier le nom exact de la table/colonnes de participation et la valeur de statut
  « présence acquise » (le Cockpit utilise `status = 'inscrit'`, cf. `cockpit.ts`).
- Côté front : n'ouvrir le formulaire d'avis que si l'exposant est `inscrit` (message
  clair sinon : « laisse un avis une fois ta participation confirmée »).

## Réponses aux avis (cohérence)

La même logique nom→amis + carve-out orga s'applique à l'affichage des **réponses aux
avis** (`review_replies`). Nuance : les réponses **ne sont pas** gatées sur la
participation (tout exposant peut discuter) → une réponse anonymisée s'affiche
**« Un exposant »** (sans le badge « présent à cette édition », réservé aux auteurs
d'avis vérifiés). Prévoir la même RPC-isation pour `review_replies` (ou une RPC
`get_review_replies` calquée).

## UI

- **Rendu anonyme** : avatar neutre (pastille pro, pas de photo, pas d'emoji) + « Un
  exposant vérifié » + micro-badge « ✓ présent à cette édition ». Réutiliser le style
  existant `ReviewAvatar` avec un mode « anonyme » (label générique, pas de slug donc
  non cliquable).
- **Rendu ami** : nom + avatar + lien vitrine comme aujourd'hui, éventuellement un
  discret marqueur « ami » (optionnel).
- **Formulaire d'avis** : case à cocher **« Publier en anonyme total (caché même de mes
  amis) »**, décochée par défaut. Texte d'aide court expliquant le modèle.
- **Vue de l'auteur sur son propre avis** : indicateur « qui voit quoi » — p. ex.
  « Visible sous ton nom par tes amis pro · anonyme pour les autres » (ou « anonyme
  pour tous » si la case est cochée).
- **Formulaire fermé si non-inscrit** : message d'invitation clair.
- DA : tokens app, verre, pas de scroll interne. Pas d'affichage « détails » derrière
  un clic « afficher les avis » — les avis (anonymisés) sont visibles directement
  (l'ouverture de la lecture à tout exposant, décision 0005, est déjà actée).

## Architecture front

- `src/hooks/use-reviews.ts` : basculer `fetchReviews` sur la RPC `get_event_reviews`
  (passer l'acteur actif), remplacer le join `actor_public` client par les champs
  renvoyés (nullables). Ajouter le champ `anonymous` au type d'avis + à l'upsert.
- Fonctions **pures testables** (cf. `reference_react_test_infra`) dans un
  `src/lib/review-visibility.ts` :
  - `reviewerDisplay(review, viewer)` → `{ mode: 'named' | 'anonymous' | 'self',
    label, avatarUrl, slug }` à partir des booléens renvoyés par la RPC (logique
    d'affichage centralisée + testée) ;
  - `canReview(participationStatus)` → gate front.
- Composant d'avis : mode anonyme vs nommé ; case anonymat ; indicateur de visibilité.

## Tests

- **Fonctions pures** : `reviewerDisplay` (self / ami non-anon → named ; ami + anon →
  anonymous ; non-ami → anonymous ; viewer festival → anonymous même si ami) ;
  `canReview`.
- **RLS / RPC (SQL manuel, `set role`, cf. `reference_pg_column_grant_revoke`)** :
  - un non-ami ne reçoit jamais `author_*` de la RPC ;
  - un ami mutuel reçoit `author_*` (si non-anonyme) ;
  - un acteur festival ne reçoit jamais `author_*` ;
  - un `p_viewer_actor` non contrôlé par `auth.uid()` est refusé/neutralisé ;
  - après verrouillage : `SELECT ... actor_id FROM reviews` en direct **échoue/renvoie nul**
    pour `authenticated` ;
  - INSERT d'un avis sans participation `inscrit` → **rejeté**.

## Déploiement (ordre prod)

`reference_supabase_mcp_is_prod` — prod live. **Séquence non négociable** :
1. Migration : colonne `anonymous` + gate participation à l'écriture + RPC(s) de lecture.
2. Front : lecture via RPC + case anonymat + gate participation + rendu anonyme.
   **Déployer et vérifier.**
3. **Ensuite seulement** : migration de verrouillage (revoke lecture directe / colonne
   `actor_id`).
4. Régénérer/typer les RPC (`supabase.rpc as any` en attendant, précédent projet).
Appliquer via le **CLI lié** (OAuth MCP cassé). Prévenir Uriel avant chaque push.

## Décision produit à consigner

Mettre à jour **`docs/decisions/0005`** (avis = bien commun) : les avis restent ouverts
et publics **en contenu**, mais **l'identité de l'auteur est protégée** (visible amis
pro uniquement, jamais des organisateurs, opt-in anonymat total), adossée à une
**vérification de participation**. Ajouter une note mémoire projet.

## Hors périmètre (v1)

- Pseudonymes stables par festival (écartés : ton trop joueur).
- Lien fiable event→organisateur (le carve-out par type d'acteur suffit).
- Signalement d'un avis abusif anonyme (le système `content_reports` existe déjà pour
  les avis ; la modération admin voit l'identité réelle — inchangé).
- Notifications : inchangées (l'`actor_id` reste en base ; répondre à un avis anonyme
  notifie toujours son auteur).
