# Lot 8e — Les notifications sur le téléphone (V2)

> 09/10/2026. Cinquième partie du lot 8 (notifications et alertes), après 8a (la cloche), 8b (les
> éditions) et 8c (les alertes planifiées), livrés. 8d (recherches sauvegardées) vient après.
> Maquettes revues et conception validées par Uriel le 09/10/2026.

## Pourquoi

La cloche ne prévient que celui qui ouvre Fellowship. Uriel veut de vraies notifications sur le
téléphone, comme l'appli Runes de Chêne Explore : le rappel de clôture, l'ami qui ajoute une date,
le récapitulatif du mardi doivent arriver dans la poche, appli fermée.

## Décisions (Uriel, 09/10/2026)

1. **Push web**, sur le modèle de Runes de Chêne. L'e-mail (Resend) viendra plus tard, en seconde
   colonne des Réglages.
2. **Une seule colonne « Téléphone »** dans les Réglages : la cloche reçoit toujours tout ; chaque
   ligne décide si elle sonne aussi sur le téléphone.
3. **Six lignes** : Clôture des candidatures (Pro), Nouvelle édition d'un festival que tu as fait
   (Pro), Tes amis, Discussions, Nouveaux abonnés, Le récapitulatif du mardi. **Tout allumé d'office
   sauf « Nouveaux abonnés ».** « Recherches sauvegardées » revient avec le lot 8d.
4. **Trois endroits pour activer** : la carte en tête de la section Notifications des Réglages, une
   ligne discrète au bas de la cloche, et une **carte d'invitation sur le tableau de bord** (pas de
   fenêtre). Sur iPhone sans l'appli à l'écran d'accueil : l'explication à la place du bouton.
5. **La demande du navigateur ne part jamais d'office** : seulement au clic sur « Activer ». Un
   « non » donné au navigateur est définitif ; « Plus tard » ne grille rien.

## Les maquettes — elles font foi

| Ce qui | Cadre Figma |
|---|---|
| Les Réglages, notifications activées | `2027 — Réglages · notifications sur le téléphone` (`2189:302`) |
| Avant activation, et l'iPhone sans écran d'accueil | `2027 — Réglages · notifications, avant activation` (`2189:982`) |
| L'invitation du tableau de bord | `2027 — Tableau de bord · invitation au téléphone` (`2189:625`) |
| La ligne au bas de la cloche | `2027 — Cloche · recevoir sur le téléphone` (`2189:900`) |

L'ancien cadre des Réglages (`2096:2`) est renommé « avant le téléphone, remplacé » : il ne fait
plus foi pour la section Notifications.

## Ce que le lot livre

### 1. Sur le téléphone : le service worker et le manifeste de la V2

- **Un service worker propre à la V2**, servi à `/v2/sw.js`, portée `/v2/`. Il ne fait que deux
  choses : afficher une notification reçue (titre, phrase, icône, `tag`) et, au toucher, amener
  devant une fenêtre déjà ouverte et la mener au bon écran, ou en ouvrir une. Pas de précache : la
  V2 reste servie par le réseau.
- **Un manifeste** (`/v2/manifest.webmanifest`) : nom « Fellowship », `start_url` et `scope`
  `/v2/`, affichage `standalone`, les icônes existantes. C'est lui qui permet à l'iPhone de mettre
  la V2 sur l'écran d'accueil.
- **La V1 n'est pas touchée.** Son service worker (portée `/`) exclut déjà `/v2` de son repli ; la
  portée `/v2/`, plus précise, l'emporte sur les pages de la V2.
- À la bascule, le service worker de la V2 prendra la portée `/` (comme Runes de Chêne) : les
  téléphones abonnés d'ici là réactiveront une fois. D'ici là, seuls les admins voient la V2 : ce
  lot est leur banc d'essai.

### 2. Ce que permet ce téléphone

Une fonction pure, testée, sur le modèle de `quelPush` de Runes de Chêne :

- iPhone (ou iPad) **hors** de l'écran d'accueil → `installer-d-abord` ;
- push disponible (`serviceWorker`, `PushManager`, `Notification`) → `possible` ;
- sinon → `impossible` : la carte des Réglages le dit (« Ce navigateur ne reçoit pas les
  notifications »), la ligne de la cloche et l'invitation ne s'affichent pas ;
- permission déjà **refusée** au navigateur → la carte le dit et explique de la rouvrir dans les
  réglages du téléphone ; pas de bouton « Activer », qui ne pourrait rien.

### 3. Activer, couper

- **Activer** : demande la permission (au clic), abonne le service worker avec la clé publique
  VAPID (`VITE_VAPID_PUBLIC_KEY`), puis inscrit l'adresse en base par la RPC
  `register_push_subscription`. La carte devient « Activées sur ce téléphone » / « Couper ».
- **Couper** : RPC `unregister_push_subscription`, puis désabonnement du service worker. La carte
  revient à « Notifications sur ce téléphone » / « Activer ».
- « Activé » se juge **sur ce téléphone** (un abonnement existe dans son service worker), jamais
  en base : un autre téléphone de la même personne ne compte pas.

### 4. Les Réglages : la section Notifications

Selon `2189:302` et `2189:982` :

- en tête, la carte d'activation (Activer / Activées · Couper / l'explication iPhone / le refus) ;
- la liste des six lignes, chacune avec son interrupteur « Téléphone », **grisée et inactive tant
  que ce téléphone n'est pas activé** ;
- les deux lignes Pro sont grisées, avec la pastille Pro, si la personne n'a **aucune enseigne
  Pro** ; un clic ouvre la bulle du Pro ;
- chaque interrupteur s'enregistre aussitôt (verrou pendant l'écriture, retour en arrière en cas
  d'échec, comme l'interrupteur du rappel de clôture).

### 5. Les deux autres portes

- **La cloche** (`2189:900`) : sous « Régler mes notifications », la ligne « Recevoir ces
  notifications sur ton téléphone · Activer ». Elle n'apparaît que si ce téléphone peut recevoir
  (`possible`) et n'est pas activé. « Activer » active directement.
- **Le tableau de bord** (`2189:625`) : sous « Bonjour », la carte « **Ne rate plus une clôture.**
  Reçois tes alertes sur ton téléphone : clôtures des candidatures, nouvelles éditions, ce que font
  tes amis. » · « Plus tard » · « Activer ». Mêmes conditions que la cloche, et **pas affichée
  pendant 30 jours après « Plus tard »** — retenu sur ce téléphone (stockage local, une commodité :
  vide, la carte revient, rien ne casse).

### 6. En base

- **`push_subscriptions`** existe (vide, jamais servie) : `user_id` (l'acteur de la personne),
  `endpoint`, `keys` (`p256dh`, `auth`), `created_at`. On y ajoute l'unicité de `endpoint` (un
  téléphone = une ligne ; s'y réinscrire la rattache à la personne connectée).
- **`register_push_subscription(p_endpoint, p_p256dh, p_auth)`** et
  **`unregister_push_subscription(p_endpoint)`** : `SECURITY DEFINER`, la personne est celle de la
  session (`users.auth_id = auth.uid()`), jamais un paramètre.
- **Les lignes coupées** : `users.push_muted text[] NOT NULL DEFAULT '{new_followers}'`, par
  personne (valable pour tous ses téléphones). Les valeurs : `deadline`, `new_edition`, `friends`,
  `discussions`, `new_followers`, `weekly`. La personne lit et écrit sa propre ligne.
- **`pg_net`** activé ; un déclencheur `AFTER INSERT ON notifications` appelle la fonction en
  ligne `send-push` avec l'identifiant de la notification et un secret d'en-tête. Le secret et
  l'adresse de la fonction vivent dans le **Vault** de Supabase (lus par le déclencheur), jamais en
  clair dans une migration.

### 7. L'envoi : la fonction `send-push`

Pour chaque notification reçue :

1. vérifie le secret d'en-tête, sinon 401 ;
2. relit la notification (type, données, `actor_id`) ;
3. trouve sa **ligne** (tableau ci-dessous) ; un type sans ligne n'est pas envoyé ;
4. trouve les **personnes** : l'acteur lui-même si c'est une personne, sinon les membres de
   l'enseigne (`memberships`) ;
5. écarte celles qui ont coupé cette ligne ;
6. écrit le texte : titre « Fellowship », corps = **la phrase de la cloche** (sans le gras), lien =
   l'écran où mène la cloche, `tag` = ce lien (deux nouvelles identiques, à la personne et à son
   enseigne, n'en font qu'une sur le téléphone) ;
7. envoie avec `web-push` à chacun de leurs téléphones ; une adresse morte (410, 404) est effacée.

| Ligne | Types de notification |
|---|---|
| `deadline` — Clôture | `deadline_reminder` |
| `new_edition` — Nouvelle édition | `new_edition` |
| `friends` — Tes amis | `friend_added_event`, `friend_going` |
| `discussions` — Discussions | `thread_question`, `thread_reply`, `best_reply`, `review_reply` |
| `new_followers` — Nouveaux abonnés | `new_follower` |
| `weekly` — Récapitulatif | `weekly_new_events` |

`event_updated` et les types de la V1 restent dans la cloche seulement.

**Une seule source pour les phrases** : la fonction se sert du même code que la cloche
(`apps/web-v2/src/lib/notifications.ts`, pur, sans dépendance hors `dates.ts`). Si l'empaquetage de
la fonction ne peut pas l'importer, le plan tranche une autre voie qui garde **une** source et la
teste ; jamais deux copies écrites à la main.

### 8. Les clés

- Les clés VAPID sont générées pour Fellowship (`web-push generate-vapid-keys`), jamais reprises
  de Runes de Chêne. La publique va dans le `.env` (`VITE_VAPID_PUBLIC_KEY`), la privée dans le
  `.env` et dans les secrets de la fonction (`supabase secrets set`), avec le sujet
  (`mailto:` de Fellowship).
- Le secret d'en-tête est tiré au hasard, rangé dans le `.env`, les secrets de la fonction et le
  Vault.

## Vérification

- Tests Vitest : ce que permet un téléphone (iPhone hors écran d'accueil, push absent, possible) ;
  la ligne de chaque type ; le texte envoyé (phrase sans gras, lien, `tag`) ; une donnée manquante
  → rien envoyé ; l'invitation « Plus tard » (cachée 30 jours, puis revient).
- En base, **sans écrire de fausse notification en production** : lecture du déclencheur, des
  RPC et des droits ; un appel de la fonction sans secret → 401.
- Sur le vrai téléphone d'Uriel (iPhone, la V2 sur l'écran d'accueil) : activer depuis les
  Réglages, recevoir la prochaine vraie notification (le rappel du matin, le récapitulatif du
  mardi, une question), la toucher → le bon écran ; couper une ligne → plus rien pour elle.

## Hors de ce lot

- Les e-mails (Resend), et leur colonne dans les Réglages.
- Les recherches sauvegardées et leur ligne : **8d**.
- Les applis des stores : le push web servira la version Android ; l'iPhone des stores demandera
  autre chose, plus tard.
- Le service worker à la racine : à la bascule de la V2.
