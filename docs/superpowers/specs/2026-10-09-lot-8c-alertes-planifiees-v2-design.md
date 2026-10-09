# Lot 8c — Les alertes planifiées (V2)

> 09/10/2026. Troisième partie du lot 8 (notifications et alertes), après 8a (la cloche et les
> discussions) et 8b (les éditions d'un festival), livrés. Design validé par Uriel le 09/10/2026.

## Pourquoi

La cloche ne reçoit aujourd'hui que ce que déclenche un geste (une question, une inscription, une
nouvelle édition). Trois alertes demandent autre chose :

- **le rappel de clôture des candidatures**, promis par l'offre Pro (« ne rate plus une
  candidature ») — le type `deadline_reminder` existe en base depuis le début, rien ne le crée ;
- **« ton ami a ajouté un événement »**, tout de suite (Uriel, 09/10/2026) ;
- **le récapitulatif de la semaine** : « X nouveaux événements sur Fellowship » (Uriel,
  09/10/2026).

## Décisions (Uriel, 09/10/2026)

1. **Les recherches sauvegardées sortent du lot** : elles deviennent le **lot 8d**, avec leur
   maquette (aucune n'existe).
2. **Pas d'e-mail pour l'instant.** Resend (Uriel a un compte) viendra plus tard.
3. **De vraies notifications sur le téléphone** (push web, comme l'appli Runes de Chêne Explore),
   mais **après** la revue de la maquette des Réglages, où vit leur activation : lot **8e**. 8c
   n'écrit que dans la cloche ; 8e enverra sur le téléphone tout ce qui y arrive.
4. **Le rappel de clôture est Pro**, et suit l'interrupteur « Me rappeler la clôture des
   candidatures » de la maquette. Il **s'allume tout seul quand on repère** un festival : par
   défaut, seuls les festivals repérés (pas encore candidatés) sont rappelés. Plus tard, les
   festivals recommandés pourront l'être aussi.
5. **« Ton ami a ajouté un événement »** : pour tout le monde, gratuit compris, au moment même.
6. **Le récapitulatif** : pour tout le monde, **le mardi matin** (le lundi, les exposants roulent
   pour rentrer), **toute la France** (les exposants font beaucoup de kilomètres). Rien n'est
   envoyé s'il n'y a aucune date nouvelle.

## Les maquettes — elles font foi

| Ce qui | Cadre Figma |
|---|---|
| L'interrupteur du rappel, sur la fiche | `2027 — Points de contact du Pro` (`2086:2`) — sous-titre ramené à « 7 jours avant le 7 juillet — par notification » le 09/10/2026 |
| Le rappel dans la cloche | `2027 — Notifications` (`2088:6`), ligne « Notification — clôture » |
| L'ami qui ajoute une date, le récapitulatif | `2027 — Notifications · nouveaux événements` (`2182:2`), validé le 09/10/2026 |

## Ce que le lot livre

### 1. En base

- **`participations.remind_deadline`** (`boolean NOT NULL DEFAULT false`). Un déclencheur
  `BEFORE INSERT` le met à `true` quand le statut est `interesse`. Rattrapage : `true` pour toutes
  les participations `interesse` existantes.
- **Deux types de notification**, chacun dans sa propre migration (piège des valeurs d'énumération
  ajoutées) : `friend_added_event` et `weekly_new_events`.
- **`pg_cron`** activé, et deux tâches planifiées qui appellent chacune une fonction SQL
  (`SECURITY DEFINER`, `SET search_path = public`) :
  - `send_deadline_reminders()`, **chaque jour à 7 h UTC** (9 h en été, 8 h en hiver) ;
  - `send_weekly_new_events()`, **le mardi à 7 h UTC**.
  « Aujourd'hui » se calcule à l'heure de Paris : `(now() AT TIME ZONE 'Europe/Paris')::date`.

### 2. Le rappel de clôture

`send_deadline_reminders()` écrit une notification `deadline_reminder` pour chaque participation
qui remplit **toutes** ces conditions :

- `remind_deadline = true` ;
- l'événement est public, et sa `registration_deadline` est entre aujourd'hui et aujourd'hui + 7
  jours (bornes comprises) — une date limite saisie tard est rappelée le lendemain matin ;
- l'acteur est une enseigne Pro ce jour-là (`plan = 'pro'` ou `comped_pro_until > now()`) ;
- aucune notification `deadline_reminder` n'a déjà été écrite pour cet acteur et cet événement
  (une seule fois par festival et par enseigne).

Données : `event_id`, `event_name`, `deadline` (la date limite), `days_left` (jours restants).
La V1 sait déjà afficher ce type (`Inscription pour … bientôt`) : elle continue de le faire.

**Dans la cloche** (icône horloge) : « Plus que **7 jours** pour candidater à **Plane'R Fest** —
clôture le 14 octobre. » Au singulier : « Plus que **1 jour** ». Le jour même : « **Dernier jour**
pour candidater à **X**. » Elle ouvre la fiche.

### 3. L'interrupteur sur la fiche

Dans « Pour candidater », sous la date limite, **seulement si la date limite est à venir** :
« Me rappeler la clôture des candidatures » · pastille Pro · « 7 jours avant le {date limite} —
par notification ».

- **Pro** : l'interrupteur lit et écrit `remind_deadline` de la participation de l'acteur actif.
  L'allumer sur un festival **pas encore repéré** le repère (participation `interesse`, rappel
  allumé). L'éteindre ne change pas le statut.
- **Gratuit** : grisé ; un clic ouvre la même bulle du Pro que dans l'Explorer.

### 4. « Ton ami a ajouté un événement »

Un déclencheur `AFTER INSERT ON events` : si l'événement est **public**, une notification
`friend_added_event` va à chaque **ami** (suivi dans les deux sens, vue `friends`) de
`created_by_actor`, sauf aux enseignes dont le créateur (`created_by_actor` ou
`acted_by_user_id`) est membre.

Données : `actor_id`, `actor_name` (via `actor_public`), `event_id`, `event_name`, `city`,
`start_date`, `end_date`.

**Dans la cloche** (icône ami) : « **Gautier** a ajouté **Fort Fort Lointain**, à Lyon du 3 au
5 juillet 2027. » Sans ville : « … a ajouté **X**, du 3 au 5 juillet 2027. » Elle ouvre la fiche.

### 5. Le récapitulatif du mardi

`send_weekly_new_events()` compte les événements **publics** créés pendant les 7 derniers jours.
S'il y en a au moins un, une notification `weekly_new_events` (données : `count`) va à **chaque
personne** (`actors.kind = 'person'`) — une seule par personne, même si elle a des enseignes.

**Dans la cloche** (icône télescope) : « **38 nouveaux événements** sur Fellowship cette
semaine. » Au singulier : « **1 nouvel événement** ». Elle ouvre l'Explorer.

## Comment c'est construit

- **SQL** : les deux fonctions et le déclencheur suivent le modèle de `notify_new_edition` et
  `notify_friend_going` ; aucune fonction en ligne à déployer.
- **`lib/notifications.ts`** : trois phrases de plus (`deadline_reminder`, `friend_added_event`,
  `weekly_new_events`), ajoutées à `KNOWN_TYPES`, et deux icônes (`deadline`, `explore`).
- **La fiche** : l'interrupteur dans `Applying.tsx`, son état et son écriture dans un petit hook à
  part (modèle de `useDiscussionMute` : verrou pendant l'écriture).
- **La V1** : elle ne lit que les types qu'elle connaît (`NOTIFICATION_TYPES`) — les deux nouveaux
  n'y apparaissent pas.

## Vérification

- Tests Vitest des trois phrases (pluriel, singulier, dernier jour, sans ville, donnée manquante →
  rien).
- En base, **sans écrire de faux rappels en production** : lecture des tâches de `cron.job`, et un
  `EXPLAIN`/`SELECT` à blanc des requêtes des deux fonctions (qui recevrait quoi), avant la
  première exécution.
- Dans le navigateur : l'interrupteur (Pro, gratuit, festival non repéré), puis le premier rappel
  réel du lendemain matin et le premier récapitulatif du mardi.

## Hors de ce lot

- Les recherches sauvegardées : **8d**, après leur maquette.
- Les notifications sur le téléphone : **8e**, après la revue des Réglages.
- Les e-mails (Resend), les préférences par type : plus tard, avec les Réglages.
- Le rappel des festivals recommandés : quand les recommandations existeront.
