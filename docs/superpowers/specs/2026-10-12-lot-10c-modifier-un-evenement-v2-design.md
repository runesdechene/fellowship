# Lot 10c — Modifier un événement (V2)

> 12/10/2026. Dernier des trois sous-lots du lot 10 (10a connexion et arrivée, 2.32.0 ; 10b ajouter
> une date, 2.33.0 ; 10c modifier un événement). Conception validée par Uriel le 12/10/2026.

## Pourquoi

La fiche d'un événement est partagée : c'est l'annuaire de tous, et une date limite ou une adresse
fausse coûte un dossier raté à quelqu'un. La V2 ne sait pas encore modifier une fiche. En base,
aucune trace de qui a changé quoi : une fiche abîmée ne se répare pas, une bonne contribution ne se
voit pas. Uriel veut la méthode des lieux de Runes de Chêne : **un historique où l'on voit ce que
chacun a ajouté ou retiré**.

## Décisions (Uriel, 12/10/2026)

1. **Qui modifie** : une fiche **publique**, tout compte connecté (festivaliers compris) ; une fiche
   **privée**, son seul créateur. La revendication d'une fiche par son organisateur viendra plus tard.
2. **Un journal de versions**, comme les lieux de Runes de Chêne : chaque enregistrement garde une
   copie complète de la fiche, son auteur, sa date et un mot facultatif. Rien ne se perd.
3. **Revenir à une version** : réservé aux admins ; revenir crée une nouvelle version.
4. **Un mot sur sa modification** : un champ facultatif en bas de la page de modification, affiché
   dans l'histoire à côté du nom.
5. **Sur la fiche** : un vrai bouton « Modifier la fiche » à côté du titre ; la ligne « Tenu à jour par
   les exposants · modifié par X, il y a… » ouvre l'histoire ; une info manquante se montre en ligne
   grise avec « + Ajouter ».
6. **La carte géographique** (aperçu « Carte », carte sur la fiche, distance) n'est pas dans ce lot :
   elle devient le lot 13. L'aperçu de la modification ne montre que la fiche.
7. **La V2 devient la version de tous** : la modification directe des fiches est fermée en base, la V1
   ne pourra plus modifier une fiche une fois la migration appliquée (elle part avec la bascule).

## Les maquettes — elles font foi

- `2027 — Modifier un événement` (`2117:2`) : « ‹ {nom} », titre serif « Modifier l'événement »,
  ligne « Tenu à jour par les exposants · dernière modification par {X}, il y a… » ; sections
  L'événement (Nom), Où et quand (Adresse ou lieu, Ville, Département, Début, Fin), Catégories
  (pastilles « × », « + Ajouter »), Affiche (vignette, nom du fichier, « Remplacer », « Retirer »),
  Pour candidater (Date limite d'inscription, Comment candidater, Lien d'inscription, E-mail de
  contact, Site de l'événement), À propos (Description), « Un mot sur ta modification » ; un champ
  manquant encadré « Il manquait cette info — merci de compléter la fiche pour tous » ; « Annuler » et
  « Enregistrer les modifications » en haut à droite ; à droite « Aperçu en direct » (la fiche en
  miniature) et « Tes modifications sont visibles de tous les exposants dès l'enregistrement. ». La
  bascule Fiche / Carte est masquée (lot 13).
- `2027 — L'histoire de la fiche` (`2253:2`) et `… · une version` (`2253:299`).
- `2027 — Fiche · modifier et infos manquantes` (`2256:2`) : le bouton et la ligne sous le titre, une
  info manquante dans « Pour candidater ».

Ce qui n'est pas sur ces maquettes n'existe pas : ni passage en privé, ni édition, horaires,
affluence, taille ou prix du stand, ni lien vers l'édition précédente.

## Ce que le lot livre

### 1. En base

- **Table `event_versions`** : `id`, `event_id` (→ events, supprimée avec lui), `author_user`
  (l'acteur personne, `null` si son compte est supprimé), `author_entity` (l'enseigne au nom de
  laquelle il agissait, `null` sinon), `created_at`, `note` (140 caractères au plus), et la copie des
  champs modifiables : `name`, `address`, `city`, `department`, `latitude`, `longitude`,
  `geo_precision`, `start_date`, `end_date`, `tags`, `image_url`, `registration_deadline`,
  `registration_note`, `registration_url`, `contact_email`, `external_url`, `description`.
  Aucun accès direct (RLS sans policy, droits retirés) : tout passe par les fonctions ci-dessous.
- **La version d'origine** s'écrit au premier changement d'une fiche, avec son créateur et sa date de
  création : les fiches existantes n'ont rien à reprendre.
- **`modifier_evenement(p_event, p_fields jsonb, p_expected_version, p_note, p_as_entity)`** —
  `SECURITY DEFINER`, seule porte d'écriture d'une modification :
  - refuse si la fiche est privée et que l'appelant n'en est pas le créateur ; une fiche publique
    s'ouvre à tout compte connecté ;
  - refuse si `p_expected_version` n'est plus la dernière version (« {X} vient de modifier la fiche »)
    — personne n'écrase sans le savoir le travail d'un autre ;
  - refuse si rien n'a changé (« Rien n'a changé ») ; au-delà de 50 modifications par jour et par
    personne ;
  - vérifie les règles de la création (nom de 3 lettres au moins, ville et département, début, fin
    pas avant le début) ;
  - écrit la version d'origine si besoin, met à jour `events`, écrit la nouvelle version, et rend
    son identifiant. Le déclencheur `notify_event_updated` existant prévient les inscrits, inchangé.
- **`revenir_a_version_evenement(p_version)`** : admins seulement ; repasse par
  `modifier_evenement` avec la copie de la version et la note « Retour à la version du {date} ».
- **Lecture** : `histoire_evenement(p_event)` (les versions, de la plus récente à la plus ancienne :
  id, date, auteur — prénom, enseigne, photo —, note, champs changés par rapport à la précédente) et
  `version_evenement(p_version)` (la version et la précédente, pour la comparaison). Une fiche privée
  ne se lit que par qui peut la voir.
- **Policies** : la modification directe d'`events` est fermée (`events_update_exposant` supprimée ;
  `events_write_actor` ne garde que la création et la suppression). La création d'une date (10b) et
  la suppression par un admin sont inchangées.

### 2. La page de modification — `/evenement/:id/modifier`

- Les sections et champs de la maquette, réutilisant ceux de la création (10b) : `AddressField` et
  ses suggestions, la position remise à zéro quand l'adresse, la ville ou le département changent, la
  position de la ville retrouvée à l'enregistrement si besoin, l'affiche réduite avant l'envoi.
- Les catégories : pastilles retirables, « + Ajouter » ouvre la liste des catégories ; la première
  reste la principale.
- `?champ=<nom>` : ce champ est encadré « Il manquait cette info — merci de compléter la fiche pour
  tous », placé à l'écran et activé.
- « Annuler » : retour à la page d'avant, rien n'est écrit. « Enregistrer les modifications » : la
  porte d'écriture, puis la fiche. Une erreur (fiche modifiée entre-temps, rien n'a changé, champ
  manquant, limite) se dit au-dessus du bouton, la saisie reste.
- L'aperçu en direct : la fiche en miniature, mise à jour à la frappe.
- « Un mot sur ta modification », facultatif.
- Pas de brouillon gardé dans le navigateur : la page part toujours de la fiche en base.

### 3. Sur la fiche

- **« Modifier la fiche »** à côté du titre, pour qui peut la modifier.
- **La ligne sous les amis présents** : « Tenu à jour par les exposants · modifié par {prénom}, il y
  a… » (ou « ajouté par {prénom}… » tant qu'aucune modification n'existe), qui ouvre l'histoire.
- **Les infos manquantes** : dans « Pour candidater », une ligne grise « {champ} · Pas encore
  renseigné » avec « + Ajouter » pour la date limite, la façon de candidater, le lien d'inscription,
  l'e-mail de contact et le site ; « À propos » vide dit la même chose. « + Ajouter » ouvre
  `/evenement/:id/modifier?champ=…`. Seulement pour qui peut modifier.

### 4. L'histoire — `/evenement/:id/historique` et `/evenement/:id/historique/:version`

- La liste (`2253:2`) : une ligne par version, photo, « **{prénom} de {enseigne}** a changé {champs} »
  (« a ajouté l'événement » pour l'origine), date, mot ; « Actuelle » en vert validé sur la plus
  récente, « Voir › » sur les autres.
- Une version (`2253:299`) : qui, quand, le mot ; un bloc par champ changé — un champ court en
  « avant → après » (« vide » quand il n'y avait rien), la description et « Comment candidater » mot à
  mot, l'ajouté souligné en vert, le retiré barré ; la légende ; « Revenir à cette version » pour les
  admins.
- La comparaison mot à mot passe par la bibliothèque `diff` (jsdiff), comme Runes de Chêne.

## Comment c'est construit

- `features/event-edit/` (nouveau) : la page, ses sections, l'aperçu ; reprend les champs et
  fonctions pures de `features/event-create/` (déplacés dans un dossier partagé s'ils servent aux
  deux, sans copie).
- `features/event-history/` (nouveau) : la liste et la version.
- `lib/event-edit.ts` (pur, testé) : fiche → formulaire, formulaire → champs envoyés (seulement ceux
  qui changent), infos manquantes d'une fiche.
- `lib/event-history.ts` (pur, testé) : la phrase d'une version, les blocs d'une comparaison.
- Migration : la table, les quatre fonctions, les policies (définitions live reprises entières).

## Vérification

- Tests : fiche ↔ formulaire, champs envoyés, infos manquantes, phrase d'une version (un, deux,
  plusieurs champs ; origine), blocs de comparaison (vide → valeur, texte mot à mot).
- En base, avec un compte jetable : une fiche publique modifiée par un festivalier sans enseigne ; une
  fiche privée refusée à un autre compte ; « Rien n'a changé » ; la modification concurrente refusée ;
  la mise à jour directe refusée ; un retour de version refusé à un non-admin.
- Navigateur : modifier, l'histoire, une version, « + Ajouter » depuis la fiche. Une seule fiche de
  test, **privée**, créée puis effacée avec le compte — jamais une fausse modification d'une vraie
  fiche publique.

## Hors de ce lot

- La carte géographique (lot 13), la revendication par l'organisateur, les champs absents de la
  maquette.
