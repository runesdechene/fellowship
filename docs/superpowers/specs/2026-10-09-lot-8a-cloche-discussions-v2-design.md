# Lot 8a — La cloche et les discussions (V2)

> 09/10/2026. Première partie du lot 8 du plan directeur (notifications et alertes), découpé en
> trois, dans cet ordre, validé par Uriel : **8a** la cloche et les discussions, **8b** les
> éditions (lien entre années, « nouvelle édition », bilan de l'an passé sur la fiche), **8c** les
> alertes planifiées et les e-mails. Les **préférences** de notification sortent du lot 8 : elles
> viendront avec les Réglages, dont Uriel veut revoir la maquette après le lot 8.

## Pourquoi

Retour client du 08/10/2026 : « des notifs quand il y a une question sur un event auquel tu
participes, et la possibilité de mute la conv ». La communauté est au cœur de Fellowship
(décision du 08/10/2026) ; aujourd'hui, une nouvelle question ne prévient personne, et la cloche
de la V2 est un bouton vide.

## Décisions (Uriel, 09/10/2026)

1. **Une nouvelle question prévient les exposants engagés sur la date** — dossier envoyé, inscrit,
   confirmé —, pas les « Intéressé », jamais l'auteur.
2. **Toutes les questions comptent**, celles des festivaliers comprises.
3. **La sourdine coupe toute la discussion d'un festival**, pas une seule question. Les réponses à
   ses propres questions continuent d'arriver.
4. **Pas de préférences dans ce lot** : tout le monde reçoit toutes les notifications de l'appli,
   comme dans la V1 ; la sourdine par festival est le seul réglage.

## Les maquettes — elles font foi

| Ce qui | Cadre Figma |
|---|---|
| Le panneau de la cloche | `2027 — Notifications` (`2088:6`) |
| La sourdine sur la fiche | `2027 — Fiche · sourdine de la discussion` (`2173:2`), validé le 09/10/2026 |

Le lien « Régler mes notifications » du panneau n'apparaît pas tant que les Réglages n'existent
pas dans la V2. Sur téléphone, le panneau prend la largeur de l'écran sous la barre du haut.

## Ce que le lot livre

### 1. En base (deux migrations, appliquées par le canal unique, dry-run d'abord)

- **`discussion_mutes`** (`actor_id`, `event_id`, `created_at`, clé primaire sur les deux) : une
  ligne = la discussion de ce festival est en sourdine pour cet acteur. RLS : `can_act_as(actor_id)`
  pour tout.
- **Type de notification `thread_question`** (ajout à l'enum `notification_type`, dans sa propre
  migration : une valeur ajoutée ne s'utilise pas dans la même transaction).
- **Déclencheur `notify_thread_question`**, AFTER INSERT sur `event_threads`, SECURITY DEFINER,
  sur le modèle de `notify_thread_reply` (garde `is_private`, `search_path` fixé) : une
  notification par acteur qui a une participation **engagée** (`en_cours`, `inscrit`, `confirme`)
  à l'événement, **sauf** l'auteur et les acteurs qui ont mis ce festival en sourdine.
  `data` : `event_id`, `event_name`, `thread_id`, `thread_title`, `actor_name`,
  `actor_avatar_url`.

### 2. Le panneau de la cloche

- La cloche de la barre du haut (ordinateur et téléphone) porte un point quand il y a du non-lu.
- Le panneau de la maquette : « Notifications », « Tout marquer comme lu », les notifications
  groupées **Aujourd'hui / Cette semaine / Plus tôt**, chacune avec son icône ou l'avatar, sa
  phrase, son heure (`timeAgo`), un point si non lue.
- Les types affichés : `thread_question` (nouveau), `thread_reply`, `best_reply`,
  `review_reply`, `friend_going`, `new_follower`, `event_updated`. Un type inconnu n'est pas
  affiché (même règle que la V1).
- Un clic sur une notification la marque comme lue et mène où elle parle (la fiche, la discussion
  de la fiche, la vitrine d'un abonné).
- Les notifications lues sont celles de **toutes** les casquettes de l'utilisateur (sa personne et
  ses enseignes), comme dans la V1 ; les plus récentes d'abord, 50 au plus.
- Chargées à l'ouverture de l'app et à chaque ouverture du panneau ; pas de temps réel.

### 3. La sourdine sur la fiche

Bloc « Discussions » de la fiche, pour un exposant **engagé** sur la date : « Mettre en sourdine »
à droite du titre (icône cloche) ; en sourdine : « En sourdine » sur fond sable (icône cloche
barrée) et la phrase de la maquette sous le champ de question. Un clic bascule ; l'écriture
s'enregistre aussitôt, un échec remet l'état d'avant et le dit.

## Comment c'est construit

- `supabase/migrations/<horodatage>_discussion_mutes.sql`,
  `<horodatage>_notification_thread_question_type.sql`,
  `<horodatage>_notify_thread_question.sql` ; en tête de chacune, le POURQUOI.
- `lib/notifications.ts` (pur, testé) : `notificationView(row)` → phrase, icône ou avatar, lien
  (ou `null` pour un type inconnu) ; `groupByDay(rows, now)`.
- `features/notifications/` : `useNotifications` (lecture, marquer lu, tout marquer), `NotificationPanel`,
  `NotificationBell` (la cloche et son point, posée dans `Topbar`).
- `features/event/` : `useDiscussionMute` et le bouton dans `EventDiscussion`.
- `types/supabase.ts` régénéré après les migrations.

## Vérification

- Tests de `lib/notifications.ts` : chaque type, type inconnu, groupement au passage de minuit et
  en début de semaine.
- Après migration, en lecture seule sur la prod : la table, la politique, la fonction et le
  déclencheur existent (`information_schema`, `pg_trigger`). **Aucune question créée pour tester.**
- `pnpm lint`, tests, build ; le panneau et la sourdine comparés à `2088:6` et `2173:2`.
- Uriel teste le parcours : une question posée sur un festival où il est inscrit, depuis un autre
  compte, arrive dans sa cloche ; en sourdine, elle n'arrive plus.

## Hors de ce lot

- Préférences (appli / e-mail) : avec les Réglages, après la revue de leur maquette.
- Nouvelle édition et bilan de l'an passé : **8b**. Rappel de clôture, recherches sauvegardées,
  e-mails : **8c**.
- La V1 n'affiche pas le nouveau type `thread_question` (sa liste blanche l'ignore) : rien ne
  casse côté V1.
