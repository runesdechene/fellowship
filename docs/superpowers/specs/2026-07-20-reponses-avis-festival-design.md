# Réponses aux avis de festival — design

**Date** : 2026-07-20
**Statut** : validé (Uriel), prêt pour plan d'implémentation
**Auteur** : XO (Claude) + Uriel

## Contexte & problème

Aujourd'hui un exposant peut laisser un **avis** sur un festival passé
(affluence / organisation / rentabilité + commentaire libre, table `reviews`,
modèle acteur). Ces avis sont visibles entre exposants, mais **on ne peut pas y
réagir** : pas de dialogue possible.

Uriel veut pouvoir **répondre à un avis** posté par un autre exposant.

Distinction importante posée en brainstorming :
- Les **notes privées** d'événement (`notes`) sont strictement privées et le
  restent — elles sont hors périmètre.
- La **Discussion du festival** (espace d'échange général sur l'événement) est un
  chantier distinct, attendu, qui fera l'objet de **sa propre spec** ensuite. Ce
  présent chantier défriche le *pattern* (fil + notif + édition/suppression +
  signalement) qui sera réutilisé, mais **pas la même table**.

## Périmètre (ce qu'on fait ce soir)

Sous chaque **avis de festival**, un **fil de réponses plat** :
- fil **plat** : on répond *à l'avis*, jamais à une autre réponse (pas de
  sous-fils imbriqués) ;
- **tout exposant** (entité, gratuit ou Pro) peut lire les avis et y répondre ;
- notification à l'auteur de l'avis quand quelqu'un y répond.

### Hors périmètre
- Notes privées : inchangées.
- Discussion générale du festival : spec séparée.
- Réponses imbriquées / @mentions : plus tard si besoin.
- Notifier tout le fil (seulement l'auteur de l'avis en v1).

## Décision de positionnement (freemium)

Ouvrir le fil aux exposants gratuits impose de leur **ouvrir la lecture des avis**
(sinon ils répondraient à l'aveugle). On **retire donc le lock Pro sur la lecture
des avis**. Le Pro conserve ses autres leviers (Calendrier, Communauté, Dashboard,
badge Certifié). Les avis deviennent un bien commun exposants — ce qui rend aussi
le fil vivant dès le départ.

→ Cette décision modifie la matrice freemium : à consigner dans `docs/decisions/`
et dans la mémoire projet (`project_freemium_matrix`).

Note technique : la RLS des avis autorise déjà la lecture à tout authentifié
(`reviews_select_scores USING (true)`). Le gating Pro est **purement côté client**
(`canSeeDetails = plan === 'pro'` dans `use-reviews.ts`). L'ouverture est donc
essentiellement un changement front.

## Modèle de données

Nouvelle table dédiée `review_replies` (pas de table `comments` générique
polymorphe : garder la RLS propre et lisible ; la Discussion aura sa propre
`event_messages`).

```sql
CREATE TABLE review_replies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id        uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  actor_id         uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  acted_by_user_id uuid REFERENCES users(actor_id) ON DELETE SET NULL,
  body             text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_replies_review ON review_replies(review_id, created_at);
```

`acted_by_user_id` : audit, cohérent avec `reviews` / `participations` (qui a agi
au nom de l'entité). `ON DELETE SET NULL` pour survivre à une suppression de compte.

### RLS
- **SELECT** : `TO authenticated USING (true)` — cohérent avec `reviews`.
- **INSERT** : l'acteur `actor_id` doit être une **entité** contrôlée par
  `auth.uid()` (l'utilisateur agit bien au nom de cet exposant). Réutiliser le
  helper de contrôle d'acteur existant s'il y en a un (à vérifier : fonction type
  `user_controls_actor(actor_id)` / pattern des policies acteur récentes) ; sinon
  `EXISTS` sur le lien user→entité + `actors.kind = 'entity'`.
- **UPDATE** : réponse dont `actor_id` est contrôlé par `auth.uid()` (édition de
  sa propre réponse). Met à jour `updated_at`.
- **DELETE** : sa propre réponse **OU** `public.is_admin()` (modération admin,
  `SECURITY DEFINER`, cf. mémoire `reference_storage_rls_security_definer`).

> ⚠️ Vérifier le pattern RLS acteur réellement en place (les policies initiales de
> `20260404120001` sont en `user_id = auth.uid()` legacy et ont été réécrites par
> les migrations acteur `20260525*`). S'aligner sur le pattern courant, pas sur le
> legacy.

## Notifications

Réutilise l'infra existante (`notifications`, modèle acteur).

- Nouveau type d'enum `notification_type` : `review_reply`.
- Trigger `AFTER INSERT ON review_replies` → fonction `notify_review_reply()`
  (`SECURITY DEFINER SET search_path = public`) :
  - récupère l'auteur de l'avis (`reviews.actor_id` via `NEW.review_id`) ;
  - **garde anti-auto-notif** : si `review.actor_id = NEW.actor_id`, ne rien
    envoyer (on répond à son propre avis) ;
  - **garde `is_private`** : si l'event de l'avis est privé, ne pas notifier
    (cohérence avec `notify_friend_going` / `notify_friend_note`) ;
  - insère une notif `review_reply` pour l'auteur de l'avis, `data` =
    `{ actor_id (répondeur), actor_name, actor_avatar_url, event_id, event_name,
    review_id }`.
- Front : ajouter `review_reply` à `NOTIFICATION_TYPES` (`use-notifications.ts`) et
  une entrée `TYPE_CONFIG` dans `NotificationItem.tsx` (icône `MessageSquare`,
  libellé « a répondu à ton avis sur <event> », lien vers `/evenement/<id>`).

> Rappel : le type `friend_note` a été retiré du front (notes privées). Ne pas le
> ré-introduire ; `review_reply` est un type distinct.

## Édition & modération

- L'auteur d'une réponse peut l'**éditer** (met à jour `body` + `updated_at`,
  afficher « modifié ») et la **supprimer**.
- **Signalement** : réponses signalables via le système `content-reports`
  existant. Ajouter le type de cible `review_reply` (vérifier la forme de
  `content_reports` : colonne `target_type` / `target_id` ou équivalent, cf.
  `20260529120000_content_reports.sql` et `src/lib/content-reports.ts`).
- **Admin** : suppression via la policy DELETE `is_admin()`.

## UI

Point d'ancrage : `ReviewList` (liste d'avis dépliée, Pro-only aujourd'hui →
ouverte à tout exposant après cette feature). Sous chaque avis :
- un **compteur repliable** « N réponse(s) » (replié par défaut) ;
- le **fil** déplié : chaque réponse = avatar acteur + libellé + corps + « il y a
  … » + actions **éditer / supprimer** pour ses propres réponses ;
- un **champ « Répondre »** (textarea + bouton envoyer, compteur 1000 max),
  visible pour les exposants.

Composants pressentis (à confirmer au plan) :
- `ReviewReplies` (fil + composer d'un avis donné),
- `ReviewReplyItem` (une réponse + actions),
- hook `use-review-replies.ts` (fetch par `review_id`, `createReply`,
  `updateReply`, `deleteReply`).

Réutiliser `ReviewAvatar` pour l'avatar acteur. Respecter la DA verre/app
(`.glass-card`, tokens `--app-bg`, `da-btn*`) — cf. mémoire
`reference_da_css_tokens` / `reference_theming_knobs`. Pas de scroll interne
imbriqué (mémoire `feedback_no_inner_scroll`).

## Tests

- **Fonctions pures** en tests unitaires (contrainte infra RTL du projet, cf.
  `reference_react_test_infra`) :
  - regroupement/tri du fil par `created_at` ;
  - logique `canReply(actor)` (entité exposant vs perso vs non connecté) ;
  - `canEditReply` / `canDeleteReply` (auteur vs admin).
- **RLS** : vérification manuelle en SQL (`set role`, tentatives cross-acteur) —
  cf. mémoire `reference_pg_column_grant_revoke` pour la méthode.
- **Trigger notif** : test d'insertion (auteur ≠ répondeur → notif ; auteur =
  répondeur → pas de notif ; event privé → pas de notif).

## Déploiement (rappel prod)

Le Supabase du MCP = **prod live** (mémoire `reference_supabase_mcp_is_prod`).
Migrations rétro-compatibles à pousser **avant** le front qui en dépend. L'OAuth
MCP étant actuellement cassé, appliquer via le **CLI lié** (`db push`, historique
désormais synchro). Prévenir Uriel avant d'appliquer.

## Séquencement d'implémentation (esquisse pour le plan)

1. Migration : table `review_replies` + RLS + index.
2. Migration : enum `review_reply` + trigger/fonction `notify_review_reply`.
3. (option) `content_reports` : type de cible `review_reply`.
4. Hook `use-review-replies` + fonctions CRUD.
5. UI : `ReviewReplies` / `ReviewReplyItem` branchés dans `ReviewList`.
6. Ouverture lecture des avis à tout exposant (retrait lock Pro client).
7. Front notifs : `review_reply` dans `NOTIFICATION_TYPES` + `TYPE_CONFIG`.
8. Décision freemium consignée (`docs/decisions/`) + maj mémoire.
9. Tests + revue sécu (RLS) avant merge.
