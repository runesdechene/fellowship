# Les sujets et Messages — conception

> Maquette validée par Uriel le 04/11/2026 : Figma, page **Story** (`2727:291`).
> Décision dans le vault : `_État.md` de Fellowship, *Tranché*.

## Pourquoi

Les exposants ne savent jamais à qui s'adresser sur WhatsApp quand ils veulent parler d'un
festival, et ils n'utilisent pas la discussion des fiches. Ils veulent lancer un sujet en un geste,
le voir en haut de Fellowship, et en parler sur place, comme dans un vrai tchat qui remplace
WhatsApp. Le même tchat sert ensuite aux conversations à deux et aux groupes.

## Ce que voit l'exposant

- **La barre des sujets**, en haut de chaque écran connecté : un avatar par sujet ouvert, cerclé de
  la couleur de la catégorie du festival lié (filet gris une fois lu, ou sans festival), le mot en
  bulle au-dessus, une pastille « personne + nombre » de participants. Une photo ou une vidéo prend
  la place du visage dans l'anneau. En premier : « Toi », avec un **+** pour lancer un sujet.
- **Lancer un sujet** : un mot (80 caractères), une photo ou une vidéo facultative, qui le voit
  (**Amis**, **Abonnés**, **Public**), à propos de quelle date (ses prochaines dates, ou rien).
  Bureau : une fenêtre sous « Toi ». Téléphone : plein écran sur le papier décoré.
- **Le tchat** : bulles des autres en blanc sur le papier (motif du logo), noms colorés dans les
  groupes, les siennes à la couleur de la conversation (catégorie du festival pour un sujet, brun
  chaud `--terre-850` sinon ; voile translucide la nuit). Photos et vidéos dans le fil. Sur un sujet,
  le bureau l'ouvre dans un tiroir à droite, le téléphone en plein écran.
- **Messages** : une icône à côté de la cloche, avec le nombre de non-lus. La boîte mêle les sujets
  où l'on a écrit, les conversations à deux et les groupes. « Nouveau » : on choisit une ou
  plusieurs personnes ; à deux et plus, c'est un groupe, son nom est facultatif.
- **Membres d'un groupe** : ajouter, renommer, sourdine, quitter.
- **Vitrine** : un bouton **Écrire** ouvre la conversation à deux.

## Règles métier

- Un sujet dure **7 jours**, ou moins si son auteur le **clôture**. Ensuite il quitte la barre ; son
  fil reste lisible dans Messages pour ceux qui y ont écrit, plus personne n'y écrit.
- **Qui voit un sujet** (relativement à l'acteur actif, comme partout) :
  - Amis : suivi dans les deux sens avec l'auteur (définition de `lib/friends.ts`) ;
  - Abonnés : l'acteur suit l'auteur ;
  - Public : tout compte connecté.
  L'auteur voit toujours le sien. Voir un sujet, c'est pouvoir y répondre.
- **Participants** d'un sujet = ceux qui y ont écrit, auteur compris. Écrire dans un sujet en fait
  un membre : il apparaît alors dans sa boîte Messages.
- Une conversation à deux entre deux acteurs est **unique** : « Écrire » rouvre l'existante.
- Un groupe n'est lu et écrit que par ses membres. Tout membre peut ajouter et renommer ; chacun
  peut quitter.
- On agit toujours **au nom de l'acteur actif** (`can_act_as`), jamais du compte connecté.

## Données

Tout est additif : aucune table lue par le code déployé ne change.

- `conversations` : `id`, `kind` (`sujet` · `direct` · `groupe`), `title` (groupe), `created_by`
  (acteur), `created_at`, `last_message_at` ; pour un sujet : `mot`, `audience`, `event_id`,
  `media_path`, `media_kind`, `expires_at`, `closed_at`.
- `conversation_members` : `conversation_id`, `actor_id`, `joined_at`, `last_read_at`, `muted`.
- `messages` : `id`, `conversation_id`, `author_actor`, `body`, `media_path`, `media_kind`,
  `created_at`. Le mot d'un sujet est aussi son premier message (avec son média).
- `sujet_views` : qui a vu quel sujet, pour l'anneau gris.
- Lectures et écritures par des RPC `SECURITY DEFINER` qui vérifient `can_act_as(p_actor)`, comme
  le reste de la base ; les policies SELECT passent par un helper (`can_see_conversation`) pour
  que le temps réel de Supabase filtre les messages.
- Le temps réel : `messages` rejoint la publication `supabase_realtime`.
- Médias : bucket **privé** `discussions`, chemin `<acteur>/<uuid>.<ext>`, lu par URL signée.
  **Le bucket se crée à la main** (règle `docs/db/gotchas.md`) ; ses policies sont dans la migration.
  Photo réduite à 1600 px ; vidéo de 50 Mo au plus.

## Hors de ce lot

- Notifications (cloche et téléphone) des nouveaux messages : une ligne « Messages » dans les
  réglages du téléphone, à concevoir avec Uriel (risque de bruit dans la cloche).
- Retirer un membre d'un groupe, supprimer un message, signaler un message.
- La landing : la section maquettée s'intègre quand la fonction est en ligne.

## Vérifier que c'est juste

- Tests purs : délai restant d'un sujet, regroupement des bulles, couleur d'une conversation,
  libellés de public, validation du mot.
- En base, après migration : un sujet « Amis » n'est pas lu par un non-ami (`set role` + `select`),
  une conversation à deux est unique, un sujet expiré refuse un message.
- Dans le navigateur : publier un sujet, le voir dans la barre, y répondre, le retrouver dans
  Messages, créer un groupe, écrire depuis une vitrine.
