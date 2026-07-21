# Discussion du festival — onglet « Questions » (Q&R multi-publics) — design

**Date** : 2026-07-21
**Statut** : validé (Uriel), prêt pour plan d'implémentation
**Auteur** : XO (Claude) + Uriel

## Contexte & problème

La page événement porte un placeholder « Discussion du festival » (`DiscussionTeaser`)
qui promet deux sous-systèmes : **Questions** (Q&R entre publics) et **Rencontres**
(coordination sur place). On construit maintenant le **premier** : les **Questions**.

Le chantier « réponses aux avis » (v0.7.377) a défriché le *pattern* fil plat +
notif + édition/suppression. La Discussion réutilise l'esprit mais **ses propres
tables** (RLS distincte, multi-publics, notion de « meilleure réponse »).

### Décisions de cadrage (validées en brainstorming)

1. **On livre l'onglet Questions uniquement.** « Rencontres » = spec séparée plus tard.
2. **Mono-événement.** Une discussion appartient à **l'event de l'année en cours**,
   point. Pas de série / pas de mémoire cross-édition ici — la dimension
   inter-éditions est un sujet **avis**, traité ailleurs, plus tard.
3. **Format threads (Q&R).** Un thread = une **question** (titre court obligatoire +
   corps optionnel) ; dessous un **fil plat de réponses** (on répond à la question,
   pas à une autre réponse).
4. **Multi-publics cloisonnés à l'affichage, pas à la participation.**
5. **Meilleure réponse** élue par l'auteur de la question → thread « Résolu » (vert).
6. **100 % gratuit**, tous comptes.

## Modèle multi-publics

Chaque thread a un **public** (`audience`) déterminé par le **type de l'acteur actif**
au moment de la création :

| Acteur actif | `actors.kind` / `entities.type` | `audience` du thread |
|---|---|---|
| Compte perso (festivalier) | `kind = 'person'` | `festivalier` |
| Entité exposant | `entities.type = 'exposant'` | `exposant` |
| Entité festival (orga) — **plus tard** | `entities.type = 'festival'` | `organisateur` |

`audience` est un **enum extensible** : on livre `festivalier` + `exposant`, on
prévoit `organisateur` dans l'enum dès maintenant (aucun câblage front en v1).

### Règles de visibilité & de participation

- **Visibilité par défaut** = les canaux dont l'utilisateur possède le type de compte.
  Un **festivalier pur** (aucune entité) ne voit que le canal `festivalier` — le canal
  exposant ne lui est pas proposé. Un exposant a **toujours** aussi un compte perso →
  il dispose des **deux toggles** (façon calendrier « Mes dates / Amis pros »).
- **Participation non cloisonnée** : via les toggles, on peut afficher l'autre canal
  **et y répondre**. Un exposant peut répondre dans un thread festivalier — et c'est
  un *plus* (l'artisan répond au visiteur = crédibilité).
- **Identité de la réponse = acteur actif.** On poste/répond avec l'acteur courant
  (le switch existe déjà). Un micro-rappel UI l'indique (« tu réponds en tant que
  Rune de Chêne »).
- **Le canal (`audience`) est fixé par le thread**, pas par la réponse : une réponse
  n'a pas d'`audience` propre ; elle hérite du thread.

> Note de posture sécurité (assumée) : la RLS SELECT est **ouverte à tout
> authentifié** (cohérent avec `reviews` / `review_replies`). Le cloisonnement par
> canal est un **défaut UI**, pas un mur de confidentialité — un festivalier pur ne
> se voit pas *proposer* le canal exposant, mais le contenu n'est pas secret. C'est
> volontaire : un Q&R de festival est public par nature. Aucune donnée sensible n'y
> transite.

## Modèle de données

Deux tables dédiées (pas de table `comments` polymorphe — RLS propre et lisible,
cf. le précédent `review_replies`).

```sql
-- Enum du public, extensible
CREATE TYPE thread_audience AS ENUM ('festivalier', 'exposant', 'organisateur');

-- La QUESTION
CREATE TABLE event_threads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  actor_id         uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  acted_by_user_id uuid REFERENCES users(actor_id) ON DELETE SET NULL,
  audience         thread_audience NOT NULL,
  title            text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  body             text CHECK (body IS NULL OR char_length(body) <= 2000),
  best_reply_id    uuid,  -- FK ajoutée après event_thread_replies (cycle), voir plus bas
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_threads_event ON event_threads(event_id, created_at DESC);

-- La RÉPONSE (fil plat)
CREATE TABLE event_thread_replies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id        uuid NOT NULL REFERENCES event_threads(id) ON DELETE CASCADE,
  actor_id         uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  acted_by_user_id uuid REFERENCES users(actor_id) ON DELETE SET NULL,
  body             text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_thread_replies_thread ON event_thread_replies(thread_id, created_at);

-- Lien « meilleure réponse » (cycle → ajouté après coup, SET NULL si la réponse est supprimée)
ALTER TABLE event_threads
  ADD CONSTRAINT fk_best_reply
  FOREIGN KEY (best_reply_id) REFERENCES event_thread_replies(id) ON DELETE SET NULL;
```

- **État « Résolu »** = `best_reply_id IS NOT NULL` (dérivé, pas de colonne booléenne).
- `acted_by_user_id` : audit « qui a agi au nom de l'entité » (cohérent `reviews` /
  `participations`). `ON DELETE SET NULL` pour survivre à une suppression de compte.
- Intégrité de `best_reply_id` : la réponse élue doit appartenir **au même thread**.
  Le FK seul ne le garantit pas → **trigger `BEFORE UPDATE`** qui rejette si
  `NEW.best_reply_id` ne référence pas une réponse de `NEW.id`.

### RLS

Réutilise `can_act_as(actor_id)` (owner/membre) et `is_admin()` (`SECURITY DEFINER`).

**`event_threads`**
- **SELECT** : `TO authenticated USING (true)`.
- **INSERT** : `can_act_as(actor_id)` **ET** le couple (audience, type d'acteur)
  concorde :
  ```sql
  WITH CHECK (
    can_act_as(actor_id) AND (
      (audience = 'festivalier'  AND EXISTS (SELECT 1 FROM users    u WHERE u.actor_id = actor_id)) OR
      (audience = 'exposant'     AND EXISTS (SELECT 1 FROM entities e WHERE e.actor_id = actor_id AND e.type = 'exposant')) OR
      (audience = 'organisateur' AND EXISTS (SELECT 1 FROM entities e WHERE e.actor_id = actor_id AND e.type = 'festival'))
    )
  )
  ```
- **UPDATE** : `can_act_as(actor_id)` (l'auteur édite titre/corps **et** élit la
  meilleure réponse via `best_reply_id`). `WITH CHECK` idem ; `updated_at` rafraîchi.
- **DELETE** : `can_act_as(actor_id) OR is_admin()`.

**`event_thread_replies`**
- **SELECT** : `TO authenticated USING (true)`.
- **INSERT** : `can_act_as(actor_id)` **seul** (participation cross-canal autorisée —
  aucune contrainte d'audience sur la réponse).
- **UPDATE** : `can_act_as(actor_id)` (édition de sa propre réponse).
- **DELETE** : `can_act_as(actor_id) OR is_admin()`.

> ⚠️ S'aligner sur le pattern acteur **courant** (`can_act_as`), pas sur d'éventuelles
> policies legacy `user_id = auth.uid()`.

## Notifications

Réutilise l'infra `notifications` (modèle acteur). **Deux** nouveaux types d'enum
`notification_type` :

1. **`thread_reply`** — quelqu'un répond à ta question.
   - Trigger `AFTER INSERT ON event_thread_replies` → `notify_thread_reply()`
     (`SECURITY DEFINER SET search_path = public`).
   - Récupère l'auteur du thread (`event_threads.actor_id` via `NEW.thread_id`).
   - **Garde anti-auto-notif** : si `thread.actor_id = NEW.actor_id`, ne rien envoyer.
   - **Garde event privé** : si l'event du thread est privé, ne pas notifier
     (cohérence `notify_friend_going`).
   - `data` = `{ actor_id (répondeur), actor_name, actor_avatar_url, event_id,
     event_name, thread_id, thread_title }`.

2. **`best_reply`** — ta réponse a été élue « meilleure réponse ».
   - Trigger `AFTER UPDATE ON event_threads` **quand `best_reply_id` change et
     devient non nul** → `notify_best_reply()`.
   - Notifie l'**auteur de la réponse élue** (`event_thread_replies.actor_id`).
   - **Garde anti-auto-notif** : si l'auteur de la réponse = l'auteur du thread
     (il s'élit lui-même), ne rien envoyer.
   - **Garde event privé** : idem.
   - `data` = `{ actor_id (auteur du thread), actor_name, event_id, event_name,
     thread_id, thread_title }`.

Front : ajouter `thread_reply` et `best_reply` à `NOTIFICATION_TYPES`
(`use-notifications.ts`) + entrées `TYPE_CONFIG` dans `NotificationItem.tsx`
(icônes `MessageSquare` / `CheckCircle`, libellés « a répondu à ta question sur
<event> » / « a choisi ta réponse comme la meilleure sur <event> », lien
`/evenement/<id>`).

**Périmètre notif v1** (validé) : on s'arrête là. Pas de « suivre le thread » pour
tous les participants (bruit + complexité) — déféré.

## Édition & modération

- **Édition** : l'auteur édite le titre/corps de sa question et le corps de sa
  réponse (`updated_at` → afficher « modifié »).
- **Suppression** : auteur **ou** admin (`is_admin()`), threads et réponses.
- **Signalement — INCLUS EN V1** (contrairement aux avis où il fut déféré). Raison :
  l'ouverture aux **festivaliers** élargit le public → risque spam/dérapage plus
  élevé qu'entre exposants. Étendre `content_reports` :
  `target_type += 'event_thread'` et `'event_thread_reply'`, câbler `ReportButton`
  sur chaque thread et chaque réponse (vérifier la forme exacte de `content_reports`,
  cf. `20260529120000_content_reports.sql` et `src/lib/content-reports.ts`).

## UI

Remplace `DiscussionTeaser` par le vrai composant dans `EventPage.tsx` (l'emplacement
existe déjà, sous `FestivalFacts`). DA réelle : verre chaud (`.glass-card`), fond
`--app-bg`, **terracotta `--accent-app` pour l'action**, **`--forest` (vert) pour le
« résolu » / meilleure réponse**, canaux Festivaliers (bleu `#8bb5e0`) / Exposants
(cuivre `--copper`). Pas de scroll interne imbriqué (`feedback_no_inner_scroll`).
Maquette haute fidélité validée : `.superpowers/brainstorm/.../discussion-hifi-A.html`.

Structure (feed mono-colonne, « app 2026 ») :

- **En-tête** : titre « Discussion » + compteur de présence vivant
  « N exposants ici cette année » = **nombre de participants `inscrit`** de l'event
  (réutilise le comptage existant ; libellé adaptable au canal actif).
- **Toggles de canaux** (façon calendrier) : `[Festivaliers]` / `[Exposants]`,
  cochables indépendamment ; n'apparaissent que si l'utilisateur possède >1 type.
- **Composer d'accroche** : « Pose ta question sur le festival… » (titre requis,
  corps optionnel) → poste dans le canal de l'acteur actif.
- **Feed de threads** (cartes-verre), chacune portant **son étiquette de canal** :
  - repliée : titre + pile d'avatars + « N réponses » (+ pastille de fraîcheur) ;
  - « Sans réponse » : invite « sois le premier à aider » ;
  - « Résolu » : gélule verte en haut à droite ;
  - dépliée : titre + corps + fil plat de réponses. **Meilleure réponse épinglée en
    tête**, bloc vert + badge « ✓ meilleure réponse ». Sur les autres réponses,
    **l'auteur de la question** voit « ✓ marquer la bonne ». Actions **éditer /
    supprimer** sur ses propres contenus ; **signaler** sur ceux des autres.
  - **Composer de réponse** en bas + micro-rappel « tu réponds en tant que <acteur> ».

Composants pressentis (à confirmer au plan) :
- `DiscussionFestival` (conteneur : toggles + composer + liste, fetch par `event_id`),
- `ChannelToggles`,
- `ThreadComposer` (nouvelle question),
- `ThreadCard` (repliée/dépliée + méta),
- `ThreadReplies` (fil + meilleure réponse épinglée),
- `ReplyItem` (une réponse + actions + « marquer la bonne »),
- `ReplyComposer`.

Réutiliser `ReviewAvatar` (ou l'avatar acteur existant).

## Architecture front

- `src/lib/event-threads.ts` — **fonctions pures** (testables, cf. contrainte RTL
  `reference_react_test_infra`) :
  - `deriveAudience(actor)` → `'festivalier' | 'exposant' | 'organisateur'` ;
  - `visibleChannels(user)` → canaux proposés (toggles) selon les types possédés ;
  - `canAsk(actor)` / `canReply(actor)` (connecté requis) ;
  - `canEdit(content, actor)` / `canDelete(content, actor, isAdmin)` ;
  - `canMarkBest(thread, actor)` (auteur du thread uniquement) ;
  - `isSolved(thread)` = `best_reply_id != null` ;
  - `sortThreads` (récent d'abord) / `sortReplies` (meilleure réponse en tête, puis
    chrono) / filtrage par canaux actifs.
- `src/hooks/use-event-threads.ts` — `threads(eventId)`, `createThread`,
  `updateThread`, `deleteThread`, `markBestReply(threadId, replyId)`.
- `src/hooks/use-thread-replies.ts` — `replies(threadId)`, `createReply`,
  `updateReply`, `deleteReply`. (Regroupement possible au plan.)

> Types Supabase : nouvelles tables/RPC → régénérer les types, ou caster
> `supabase.from(...) as any` en attendant (précédent projet, cf.
> `reference_supabase_rpc_types`).

## Tests

- **Fonctions pures** (unitaires) : `deriveAudience`, `visibleChannels`, `canReply`,
  `canEdit`/`canDelete`, `canMarkBest`, `isSolved`, `sortReplies` (meilleure réponse
  d'abord), filtrage par canaux.
- **RLS** (SQL manuel, `set role`, tentatives cross-acteur, cf.
  `reference_pg_column_grant_revoke`) : insertion avec audience incohérente rejetée ;
  édition/suppression cross-acteur rejetée ; participation cross-canal autorisée ;
  `is_admin()` peut supprimer.
- **Triggers** : `notify_thread_reply` (auteur ≠ répondeur → notif ; auteur =
  répondeur → rien ; event privé → rien) ; `notify_best_reply` (idem gardes) ;
  trigger d'intégrité `best_reply_id` (réponse d'un autre thread → rejet).

## Déploiement (rappel prod)

Le Supabase du MCP = **prod live** (`reference_supabase_mcp_is_prod`). Migrations
rétro-compatibles poussées **avant** le front qui en dépend. L'OAuth MCP étant
cassé, appliquer via le **CLI lié** (`db push`, historique synchro). Prévenir Uriel
avant d'appliquer.

## Séquencement d'implémentation (esquisse pour le plan)

1. Migration : enum `thread_audience` + tables `event_threads` / `event_thread_replies`
   + FK `best_reply_id` + index + trigger d'intégrité `best_reply_id`.
2. Migration : RLS des deux tables (SELECT ouvert, INSERT avec contrainte audience,
   UPDATE/DELETE via `can_act_as` + `is_admin`).
3. Migration : enum `thread_reply` + `best_reply` + triggers/fonctions
   `notify_thread_reply` / `notify_best_reply`.
4. Migration : `content_reports` — cibles `event_thread` / `event_thread_reply`.
5. Régénération des types Supabase.
6. `lib/event-threads.ts` (fonctions pures) + tests.
7. Hooks `use-event-threads` / `use-thread-replies` (CRUD + `markBestReply`).
8. UI : `DiscussionFestival` + sous-composants, branchés dans `EventPage`
   (remplacement de `DiscussionTeaser`).
9. Front notifs : `thread_reply` + `best_reply` (`NOTIFICATION_TYPES` + `TYPE_CONFIG`).
10. Signalement : `ReportButton` sur threads + réponses.
11. Compteur de présence (participants `inscrit`).
12. Tests + revue sécu (RLS) avant merge.

## Hors périmètre (v1)

- Onglet **Rencontres** (spec séparée).
- Mémoire **cross-édition** (sujet avis).
- Canal **organisateur** câblé (enum prêt, UI plus tard).
- Réponses **imbriquées** / @mentions.
- **Suivre un thread** (notifier tous les participants).
