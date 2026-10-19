# V2 — Les Nouveautés

> Validé en conversation avec Uriel le 19/10/2026. Maquettes validées (« … (proposition 19/10/2026) »,
> fichier Figma `9CmmBD3t5rAk4tD583cdN3`) : page Nouveautés `2371:65` (fil recentré par Uriel),
> états de la ligne de version `2371:403`, menu du compte sur téléphone `2371:443` et onglet « Moi »
> `2371:671`, page sur téléphone `2371:707`, administration `2373:65`.
> Inspiré des « Nouveautés » de Runes de Chêne (Hub qui publie, app qui réagit).

## Pourquoi

Fellowship avance vite, et les exposants ne le voient pas. On veut qu'ils suivent le développement
de près : chaque nouveauté annoncée, et un endroit pour y réagir et en parler avec l'équipe.
Exemple fondateur : la sortie de la V2 (3.0.0) — « c'est pas rien », ça mérite un e-mail à tous.

Succès : une grosse mise à jour publiée depuis l'admin arrive sur les téléphones et dans les boîtes
mail, les exposants viennent mettre un cœur et commentent, et Uriel leur répond sous la note.

## Ce qui est tranché (Uriel)

- **Une page dédiée « Nouveautés »**, pas une section de Communauté (« ça prendrait trop de place »).
- **On y entre** par une ligne « 🔔 Fellowship 3.0.0 » en bas de la barre latérale, sous l'activité
  du réseau ; **pastille rouge** tant qu'une mise à jour n'est pas lue. Sur téléphone, par une ligne
  « Nouveautés » du menu du compte (sous Réglages), et la pastille se pose sur l'onglet « Moi ».
- **Un cœur par personne**, qu'on retire d'un second clic (pas la rafale de Runes de Chêne).
- **Commentaires avec réponses** : un mot sous la note, et une vraie conversation qui peut naître.
- **Signature : la personne et son enseigne** — « Uriel (Runes de Chêne) ».
- **Deux poids, choisis dans l'admin** : *petite* = notification sur le téléphone et pastille ;
  *grosse* = la même chose **plus un e-mail à tous les exposants**.
- **Seule la dernière mise à jour est dépliée** ; les précédentes sont repliées en dessous, **le titre
  seul**, et se déplient d'un clic.
- Les festivaliers ne comptent pas : ce sont les comptes exposants qui réagissent.

## Les écrans

### La page `/nouveautes` (maquettes `2371:65`, `2371:707`)

- Titre « Nouveautés », sous-titre « Ce qui change dans Fellowship, version après version. Dis-nous ce
  que tu en penses. »
- **La dernière mise à jour, dépliée.** Grosse : carte avec l'image (si elle existe), étiquette noire
  « Grosse mise à jour », « Version 3.0.0 · 19 oct. », titre en Instrument Serif, texte. Petite : même
  carte, sans image, étiquette claire « Petite mise à jour », titre en Inter.
  Sous le texte : le bouton cœur avec son nombre (fond brique pâle et cœur plein brique quand on l'a
  mis), le nombre de commentaires, puis « Gautier, Lina et 22 autres » (deux prénoms, le reste compté).
  Puis la conversation : commentaires du plus ancien au plus récent, chacun avec ses réponses en
  retrait, « Répondre » sous chacun ; « Voir les N autres commentaires » au-delà de trois ; le champ
  « Écrire un commentaire… » en bas.
- **Les précédentes, repliées** : une ligne par note — le titre, avec version et date en petit
  (*mon choix*, à corriger d'un mot). Un clic la déplie en place, comme la dernière.
- **Ouvrir la page éteint la pastille.**

### La ligne de version (maquette `2371:403`)

En bas de la barre latérale, sous l'activité du réseau, séparée par un filet : cloche + « Fellowship
3.0.0 » — le numéro est celui de la **version servie** (`__APP_VERSION__`). États : non lue (pastille,
texte appuyé), lue (texte doux), active sur `/nouveautes` (fond de l'entrée active), barre repliée
(cloche seule, avec sa pastille).

### Le menu du compte sur téléphone (maquettes `2371:443`, `2371:671`)

Une ligne « Nouveautés » sous « Réglages » : cloche (avec pastille), libellé, « Fellowship 3.0.0 » en
gris à droite. La pastille se répète sur l'avatar de l'onglet « Moi ».

### L'administration `/admin/mises-a-jour` (maquette `2373:65`)

Entrée « Mises à jour » (icône mégaphone) dans `ADMIN_ITEMS`, après « Témoignages ».

- **Nouvelle mise à jour** : Version (préremplie avec la version servie, modifiable), Titre, Texte,
  Image facultative (dépôt), Poids — deux options *Petite* / *Grosse* avec leur effet décrit. Pied :
  pour une grosse, « Un e-mail partira à N exposants. Corriger la note ensuite ne le renvoie pas. »
  (N réel) ; boutons « Aperçu » et « Publier ».
- **Publiées** : étiquette de poids, version · date, titre, cœurs, commentaires, « E-mail envoyé à N »
  pour une grosse, « Modifier ».
- **Modifier** reprend le formulaire sur la note : on corrige version, titre, texte, image. Le poids
  ne change plus après publication ; **rien ne repart** (ni notification, ni e-mail).

## Le comportement

- **Le public** : tout compte connecté voit la page, la ligne de version et la pastille, et peut
  mettre un cœur et commenter (*mon choix*). Les **notifications et l'e-mail** ne vont qu'aux
  personnes membres d'au moins une enseigne `type = 'exposant'` (*mon choix* — les festivaliers ne
  comptent pas, Uriel).
- **Publier** crée la note puis, dans la même transaction : une notification de type nouveau
  (`app_update`) pour **chaque personne** de ce public (pas chaque enseigne — une personne à deux
  enseignes n'en reçoit qu'une), à la manière du récapitulatif du mardi. Le déclencheur existant
  `on_notification_send_push` envoie la notification sur le téléphone. La notification s'affiche aussi
  dans la cloche et mène à `/nouveautes`.
- **Grosse** : en plus, une fonction Edge envoie l'e-mail **une seule fois** (marqué sur la note), par
  Resend, à chaque personne membre d'une enseigne `type = 'exposant'`, dédoublonnée par adresse, sauf
  celles qui s'en sont désinscrites. L'e-mail : titre, l'image si elle existe, les premières lignes
  du texte et un bouton « Voir la nouveauté » vers `https://flw.sh/nouveautes`, avec un lien de
  désinscription en pied.
- **Non lue** : la pastille s'allume si la note la plus récente est plus récente que le moment où la
  personne a ouvert la page pour la dernière fois (un horodatage sur la personne, posé à l'ouverture).
  Un compte neuf part de l'heure de sa création : il ne voit pas la pastille pour les anciennes notes
  (*mon choix*).
- **Un cœur** est propre à la personne (pas à l'enseigne) : un clic le met, un second l'enlève.
- **Un commentaire** est écrit par la personne **au nom de l'enseigne qu'elle incarne** à ce moment :
  on garde les deux, et on affiche « Prénom (Enseigne) ». Sous l'identité « Administration », la
  signature est celle de la personne et de sa première enseigne (*mon choix*).
- **Une réponse** se rattache à un commentaire de premier niveau (un seul niveau de retrait ; répondre
  à une réponse répond au même fil).
- **Qui est prévenu** (Uriel, 19/10/2026) : une réponse prévient **la personne à qui l'on répond**
  (`app_update_reply`) ; un nouveau commentaire de premier niveau prévient **tous les admins**
  (`app_update_comment`), pour qu'Uriel puisse répondre. Ces notifications visent la personne, jamais
  l'enseigne, se rangent dans la ligne « Discussions » des réglages, et on ne se prévient pas soi-même.
- **Supprimer** un commentaire : son auteur ou un admin, avec confirmation. Supprimer un commentaire
  supprime ses réponses.
- Texte d'une note : texte brut, paragraphes séparés par une ligne vide, liens cliquables
  (*mon choix* — pas d'éditeur riche ; la maquette n'en montre pas).

## La base (à vérifier contre le live avant d'écrire)

Noms à confirmer contre `information_schema` ; le principe :

- `app_updates` : version, titre, texte, image, poids (`small` | `big`), auteur, `published_at`,
  `email_sent_at`, `email_count`. Lecture : tout compte connecté. Écriture : `is_admin()`.
- `app_update_hearts` : (note, personne) — clé primaire composée, c'est elle qui garantit le cœur
  unique. Lecture : connectés ; écriture : `can_act_as(personne)`.
- `app_update_comments` : note, `parent_id` (nul au premier niveau), auteur = la personne,
  `entity_actor_id` = l'enseigne incarnée (nullable), texte 1–2000, `created_at`. Lecture :
  connectés ; insertion : `can_act_as` ; suppression : auteur ou `is_admin()`.
- `users.updates_seen_at` (non lue) et `users.updates_email_off` (désinscription des e-mails).
- `notification_type` : `app_update`, `app_update_reply` et `app_update_comment`, chacun **dans sa propre migration**
  avant tout usage (`ALTER TYPE … ADD VALUE IF NOT EXISTS`).
- Une ligne `updates` (« Nouveautés de Fellowship ») dans `PUSH_LINES` / `LINE_OF_TYPE` et dans la
  contrainte `users_push_muted_lines`, pour que la notification parte sur le téléphone et se coupe
  depuis les Réglages comme les autres (*mon choix* : une ligne de plus dans une liste existante).
- Image : un seau public en lecture, écriture `is_admin()`, sur le modèle de `testimonials`.

## L'existant à réutiliser

- Notifications et push : `notifications`, `notify_send_push()`, `send-push`, `notificationPhrase`
  (`lib/notifications.ts`), `push-lines.ts` + `scripts/sync-push-phrases.mjs` (à relancer).
- Fil de conversation : le modèle de `event_threads` / `useEventThreads` / `lib/threads.ts`
  (droits de suppression), `fetchActorProfiles` pour les noms.
- E-mail : l'appel Resend de `prospect-send` et `composeEmail` (`_shared/prospect-mail.ts`), `APP_URL`.
  Expéditeur sur `flw.sh` (domaine vérifié chez Resend ; DMARC en quarantaine — rester sur ce domaine).
- Admin : le patron de `features/admin-testimonials` (hooks sans react-query, `must()`, envoi
  d'image avec `resizeImage`), `AdminRoute`, `ADMIN_ITEMS`.
- Version : `__APP_VERSION__`, `lib/app-version.ts`.

## Hors du périmètre

- Cœurs sur les commentaires.
- Une ligne « e-mails » dans les Réglages : la désinscription passe par le lien de l'e-mail.
- Programmer une publication, brouillons enregistrés, catégories de nouveautés.
- Les nouveautés pour les visiteurs sans compte.

## Ce qui serait un échec, même si ça marche

- Un e-mail envoyé deux fois, ou envoyé en corrigeant une note.
- Une personne à plusieurs enseignes notifiée plusieurs fois.
- La pastille qui reste allumée après avoir lu.
- Un écran qui s'écarte de la maquette sans en avoir parlé avec Uriel.
