# V2 — Administration : la messagerie de prospection (lots 3b et 3c)

> Validé en conversation avec Uriel le 16/10/2026. Maquettes dans Figma (`9CmmBD3t5rAk4tD583cdN3`) :
> `Admin — Prospects avec la messagerie` (`2356:522`), `Admin — Fiche d'un prospect` (`2355:2`),
> `Admin — Prospect · premier contact et modèles` (`2355:273`), `Admin — Modèles et expéditeurs`
> (`2356:2`). Suite du lot 3 (`2026-10-16-v2-admin-lot-3-prospects-design.md`, livré en V2 2.48.0).

## Pourquoi

Les commerciaux vont envoyer **des dizaines d'e-mails par jour** (Uriel). Tenir la prospection dans
ProtonMail et reporter les statuts à la main dans le tableau ne tient pas à ce volume. La prospection
se fait donc dans Fellowship : on y écrit, on envoie, on suit le fil des réponses, et les statuts se
tiennent tout seuls. Le succès : un prospectant travaille sa journée sans quitter Fellowship, sans
copier-coller entre deux outils, et voit chaque réussite.

## Ce qui est tranché

- **Remplace** la décision du 15/10 « les mails de prospection partent de ProtonMail, pas de fiche
  prospect » : chaque prospect a désormais sa page, son fil.
- **Resend** envoie et reçoit, sur un **sous-domaine dédié : `equipe.flw.sh`** — `flw.sh` garde sa
  réputation pour les codes de connexion.
- **Chaque prospectant a son adresse** (`uriel@equipe.flw.sh`, `matheo@equipe.flw.sh`), son nom affiché
  et sa signature ; les adresses se gèrent dans l'administration.
- **Modèles + retouche, envoi un par un.** Pas d'envoi groupé. Au moins deux modèles de premier
  contact au choix ; des modèles de relance ; un modèle de bienvenue.
- **Relance proposée, envoyée à la main** : rien ne part sans le prospectant.
- **Les réponses arrivent dans Fellowship**, et une copie part dans la boîte personnelle du
  suiveur. On répond depuis Fellowship.
- **« Suivi par »** : chaque prospect a un suiveur ; le relais se prend en changeant le suiveur, et le
  message suivant part de l'adresse du nouveau suiveur, dans le même fil. Jamais d'envoi au nom d'un
  autre.
- **Le rapprochement avec un compte se confirme à la main** (Uriel : l'automatique « va nous effacer
  la réussite ») : Fellowship repère les inscriptions, le bandeau les annonce, un admin confirme, et la
  confirmation propose un message de bienvenue. **Remplace** le rapprochement automatique à
  l'inscription du lot 3.
- **Pas de suivi d'ouverture** : le statut « Ouvert » disparaît (la CNIL demande un consentement pour
  le pixel, et ProtonMail ne le donnait pas non plus).
- **Désinscription** : un lien dans chaque e-mail ; un prospect désinscrit ne peut plus recevoir
  d'e-mail.

## Les adresses

| Adresse | Écran |
| --- | --- |
| `/admin/prospects` | la liste (maquette `2356:522`) |
| `/admin/prospects/:id` | la page d'un prospect : son fil et l'écriture (`2355:2`, `2355:273`) |
| `/admin/prospects/modeles` | modèles et expéditeurs (`2356:2`) |
| `/admin/prospects/non-classes` | les réponses qu'on n'a pas su rattacher |
| `/desinscription/:jeton` (V2, publique) | la confirmation d'une désinscription |

## La liste (changements)

- Bouton **« Modèles et expéditeurs »** dans l'en-tête.
- Filtre **« À répondre »** (le dernier message du fil vient du prospect) ; menu **« Suivi par : moi /
  tous / un prospectant »** à côté des sources.
- Colonne **« Suivi par »** à la place du téléphone (il reste sur la page du prospect) ; **« Contact »
  devient « Dernier échange »**, tenu par le fil (canal « Mail » et date du dernier message), ou saisi
  à la main pour un échange hors e-mail (Salon, Appel).
- **Statut** en lecture : Pas envoyé, Envoyé, Répondu, Rebond ; « **À répondre** » en brique quand le
  prospect attend une réponse. Plus de liste à choisir.
- **Relance** : « À relancer » en brique ou « — ». La case se coche seule après le délai, et reste
  modifiable.
- **Le bandeau** : « N prospects viennent de créer leur compte » · « Confirme chacun : « Compte créé » se
  coche, et tu peux lui écrire un mot de bienvenue. » · **« Voir et confirmer »**. Les correspondances
  par téléphone y restent aussi.
- Un clic sur le nom ouvre la page du prospect. Les autres cellules restent modifiables sur place.

## La page d'un prospect

- **En-tête** : retour « Prospects », le nom (Instrument Serif), la pastille du statut, la ligne
  « marque · activité · ville · dans la liste depuis le … · source : … » ; à droite **« Suivi par … »**
  (un menu des prospectants actifs).
- **Échanges** : les messages dans l'ordre ; les nôtres à droite (fond sable), les siens à gauche
  (blancs bordés). Chacun : expéditeur, adresse, date et heure, état (« délivré », « rebond »), objet
  pour le premier, texte. Sans message : « Aucun e-mail pour l'instant. Choisis un modèle de premier
  contact ci-dessous. »
- **Écrire** (« Premier contact avec … », « Répondre à … ») : **Modèle** (menu groupé par usage, chaque
  modèle avec ses envois et son taux de réponse ; « Aucun — réponse libre »), **De** (l'adresse du
  suiveur ; un admin sans adresse active ne peut pas envoyer), **À**, **Objet** (« Re : … » en réponse),
  **Texte** (le modèle rempli, modifiable), « Un lien de désinscription est ajouté au bas de chaque
  e-mail. », **Envoyer**. En relais (le dernier message sortant vient d'un autre expéditeur), le texte
  s'ouvre sur une accroche modifiable : « Je prends le relais de {ancien suiveur}… ».
- **Informations** (modifiables, « Corriger ») et **Notes internes**, comme sur les autres fiches.
- Prospect désinscrit : la zone d'écriture est remplacée par « Désinscription le … : plus aucun
  e-mail ne peut partir vers {nom}. » (formulé sans genre). Rebond : un avertissement au-dessus du
  bouton.

## Modèles et expéditeurs

- **Expéditeurs** : une ligne par adresse — prénom, adresse `@equipe.flw.sh`, signature, envoyés
  aujourd'hui et palier conseillé, état (Actif / Désactivé), « Modifier ». « Ajouter un expéditeur » :
  le compte admin, la partie avant `@`, le nom affiché, la signature. Une adresse désactivée n'envoie
  plus mais **reçoit toujours** (une réponse tardive retrouve son fil). Désactiver propose de
  réattribuer ses prospects à un autre suiveur.
- **Modèles** groupés par usage : **Premier contact**, **Relance**, **Bienvenue** ; chacun avec son objet
  en aperçu, ses envois et son taux de réponse ; « Nouveau modèle », « Modifier ».
- **L'éditeur** : nom, usage (contrôle segmenté), objet, texte, « Insérer : {prénom} {marque}
  {activité} {ville} {source} », « La signature de l'expéditeur et le lien de désinscription s'ajoutent
  seuls. », Annuler / Enregistrer. Un modèle utilisé n'est jamais supprimé, il s'archive.
- **Le palier conseillé** : pour un domaine neuf, 20 par jour par expéditeur la première semaine, puis
  40, puis 80 (affiché, jamais bloquant).

## Non classés

Les réponses reçues qu'on n'a pas su rattacher : expéditeur, objet, date, extrait. Chacune se range
sous un prospect existant (recherche) ou devient un nouveau prospect (nom et e-mail préremplis).

## Les e-mails

- **Envoi** : texte brut et HTML simple (paragraphes, liens), `From: "{nom affiché}"
  <{alias}@equipe.flw.sh>`, `Reply-To` identique, un `Message-ID` à nous, et pour une réponse
  `In-Reply-To` et `References` du fil. La signature du suiveur, puis le pied : « Tu ne veux plus
  recevoir nos e-mails ? Se désinscrire » (lien à jeton), et les en-têtes `List-Unsubscribe` et
  `List-Unsubscribe-Post` (désinscription en un clic des messageries).
- **Remplissage d'un modèle** : `{prénom}` est le premier mot du nom ; un emplacement sans valeur
  s'efface proprement (pas de « Bonjour , ») — règle pure, testée.
- **Réception** : Resend reçoit le courrier de `equipe.flw.sh` et prévient Fellowship (webhook
  `email.received`). Le message se rattache, dans l'ordre : par `In-Reply-To` / `References` à un
  message connu ; sinon par l'adresse de l'expéditeur égale à l'e-mail d'un prospect ; sinon « Non
  classés ». On garde le texte de la réponse (la partie citée de l'ancien message repliée à
  l'affichage) ; les pièces jointes ne sont pas gardées, le message le signale.
- **Copie au suiveur** : chaque réponse rattachée part aussi, par Resend depuis
  `notifications@equipe.flw.sh`, vers l'e-mail du compte du suiveur : « {prospect} t'a répondu », le
  texte, et le lien vers la page du prospect.
- **États de livraison** : webhooks `email.delivered`, `email.bounced`, `email.complained` (une plainte
  pour spam désinscrit le prospect).
- **Sécurité** : chaque webhook de Resend est **signé** ; la fonction vérifie la signature avant toute
  écriture (secret dans les variables des fonctions, jamais dans le dépôt). Personne ne peut forger
  une fausse réponse ni un faux rebond.

## Les statuts, tirés du fil

| Statut | Règle |
| --- | --- |
| Pas envoyé | aucun message sortant |
| Envoyé | au moins un message sortant, aucune réponse |
| Répondu | au moins un message reçu |
| Rebond | le dernier message sortant a rebondi |
| À répondre | le dernier message du fil est reçu (s'affiche à la place de « Répondu ») |

`email_status` reste la colonne lue par les filtres et les chiffres ; elle est tenue par les fonctions
serveur à chaque envoi, réception ou rebond (plus par le tableau). « À relancer » se coche quand le
dernier message est sortant, sans réponse, depuis **5 jours** (une tâche quotidienne), et ne se
recoche pas après qu'un admin l'a décochée pour ce même message.

## La base

Additif, sauf le retrait du déclencheur de rapprochement automatique (`prospect_relier_inscription`).

**Tables** (RLS : tout pour `is_admin()`, rien pour les autres, sauf mention)

- `prospect_senders` : `id`, `user_id → users(actor_id)`, `alias` (unique, minuscules, `[a-z0-9.-]`),
  `display_name`, `signature`, `active`, `created_at`.
- `prospect_templates` : `id`, `kind` (`premier_contact`, `relance`, `bienvenue`), `name`, `subject`,
  `body`, `archived_at`, `created_by`, `created_at`.
- `prospect_messages` : `id`, `prospect_id → prospects` (nul pour un non classé), `direction` (`out`,
  `in`), `sender_id → prospect_senders` (sortant), `from_email`, `to_email`, `subject`, `body_text`,
  `message_id` (unique), `in_reply_to`, `references_ids text[]`, `resend_id`, `template_id`,
  `delivery` (`envoye`, `delivre`, `rebond`, `plainte`), `has_attachments`, `sent_at` / `received_at`,
  `created_at`.
- `prospects` gagne : `owner_id → users(actor_id)` (« Suivi par »), `unsubscribed_at`,
  `unsubscribe_token` (unique, aléatoire), `relance_vue_pour` (le message sortant dont la relance a été
  décochée).

**Fonctions** (`admin_garde()`, `security definer`, `search_path` fixé, triées)

- `admin_prospect(p_id)` — la page : le prospect, son suiveur, ses messages.
- `admin_prospect_modeles()` — les modèles avec envois et taux de réponse (un envoi « répondu » = un
  message reçu dans le même fil après lui).
- `admin_prospect_expediteurs()` — les expéditeurs, envoyés aujourd'hui, palier conseillé.
- `admin_prospects_non_classes()`, `admin_ranger_message(p_message, p_prospect)`.
- `admin_prospects_a_rapprocher()` existe déjà ; elle sert désormais aux inscriptions aussi.
- `admin_prospects` et les chiffres : la colonne « Suivi par », le filtre `a_repondre`, le paramètre
  `p_suivi` (moi / tous / un expéditeur).
- `prospects_relancer()` — la tâche quotidienne (pg_cron) qui coche « À relancer ».

**Fonctions serveur (Edge)**

- `prospect-send` (admin) : vérifie le suiveur, l'adresse active, le prospect non désinscrit ; remplit
  et envoie par Resend ; enregistre le message ; tient `email_status`.
- `prospect-inbound` (publique, signature Resend vérifiée) : rattache, enregistre, tient le statut,
  envoie la copie au suiveur.
- `prospect-events` (publique, signature vérifiée) : délivré, rebond, plainte.
- `prospect-unsubscribe` (publique, par jeton) : désinscrit ; répond aussi au `List-Unsubscribe-Post`.

## Ce qui ne bouge pas

Le tableau du lot 3 (cellules modifiables, ajout, import CSV, corbeille, notes) reste ; seul le statut
de l'e-mail passe en lecture, et « Contact » devient « Dernier échange ».

## Vérifier

- **Tests (fonctions pures)** : remplir un modèle (emplacements, valeur absente, `{prénom}`),
  rattacher une réponse (en-têtes, sinon adresse, sinon non classé), le statut tiré du fil, le délai
  de relance, l'accroche de relais, l'alias valide.
- **Base** : chaque fonction refuse un non-admin ; la RLS des nouvelles tables.
- **Webhooks** : une signature fausse est refusée sans rien écrire.
- **Vrais envois, entre nos adresses seulement** : `uriel@equipe.flw.sh` vers la boîte ProtonMail
  d'Uriel, sa réponse, le rebond d'une adresse inexistante, la désinscription. Vérifier l'arrivée en
  boîte de réception (pas en spam) et la note DKIM/SPF/DMARC de l'e-mail reçu.
- **À l'œil**, chaque écran à côté de sa maquette.

## Livrer en deux lots

**Lot 3b — écrire et envoyer**
1. Le domaine `equipe.flw.sh` chez Resend (envoi et réception), ses enregistrements DNS (Uriel les
   pose comme le 16/10, ou via Netlify) ; les secrets des fonctions.
2. La base : expéditeurs, modèles, messages, colonnes des prospects ; retrait du rapprochement
   automatique.
3. Modèles et expéditeurs (écran et écritures).
4. La page d'un prospect : fil (sortant), écriture, envoi par `prospect-send`, relais, « Suivi par ».
5. Désinscription (jeton, page publique, en-têtes) ; états de livraison par `prospect-events`.
6. La liste : statut en lecture, « Suivi par », « Dernier échange », filtre et menu ; le bandeau « viennent
   de créer leur compte » et la bienvenue à la confirmation.
Entre les lots, les réponses à `@equipe.flw.sh` sont transférées vers la boîte du suiveur.

**Lot 3c — recevoir et répondre**
1. `prospect-inbound` : réception, rattachement, statut, copie au suiveur.
2. Le fil complet, « À répondre », Non classés.
3. La relance proposée (tâche quotidienne) avec son modèle.

## Hors de ces lots

L'envoi groupé, les séquences automatiques, le suivi d'ouverture, les pièces jointes (envoi et
affichage), un éditeur de texte riche, l'export, la statistique avancée des modèles au-delà des envois
et du taux de réponse.

## À la charge d'Uriel

Ajouter le domaine `equipe.flw.sh` dans Resend et poser ses enregistrements (comme le 16/10) ; passer
l'abonnement Resend à l'offre payante avant la montée en charge.
