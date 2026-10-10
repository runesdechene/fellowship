# Lot 8d — Les suggestions « Pour toi » (V2)

> 10/10/2026. Quatrième partie du lot 8 (notifications et alertes), après 8a, 8b, 8c et 8e,
> livrés. Design et maquettes validés par Uriel le 10/10/2026.

## Pourquoi

Le plan prévoyait des **recherches sauvegardées** : l'exposant enregistre une recherche de
l'Explorer, et Fellowship le prévient des nouveaux résultats. Uriel l'a remplacé le 10/10/2026 par
plus simple et plus fort : **Fellowship apprend de ce que l'exposant fait déjà** — les festivals
qu'il a repérés, où il s'est inscrit, dont il a fait le bilan — et lui propose **tout seul**, en
continu, des festivals proches. « Il faut que ce soit automatique, pas que le mec aille y
penser. » C'est un argument Pro : le logiciel devient son vrai *sidekick*.

## Décisions (Uriel, 10/10/2026)

1. **Les recherches sauvegardées sont abandonnées** au profit des suggestions automatiques.
2. **« Proche » = le même univers, dans sa zone habituelle** : des tags partagés avec ses
   festivals de référence, à une distance qu'il a l'habitude de faire. Un ami qui y va est un
   signal fort.
3. **Un nouvel inscrit sans historique** part de ce que font ses amis, puis de sa région.
4. **Deux endroits** : un bloc **« Pour toi »** sur le tableau de bord, **et** des notifications
   (cloche et téléphone).
5. **Au plus deux notifications par semaine**, et seulement pour une suggestion **très forte**.
6. **« Pas pour moi »** écarte une suggestion pour de bon ; la suivante prend sa place.
7. **Tout est Pro** : le bloc et les notifications. Un compte gratuit voit seulement **le nombre
   trouvé**, les cartes floutées, et l'invitation au Pro. Rien ne s'affiche s'il n'y a rien.
8. **La mascotte** qui présentera ces suggestions viendra plus tard. Le texte de l'offre Pro
   change.

## Les maquettes — elles font foi

| Ce qui | Cadre Figma |
|---|---|
| Le bloc, compte Pro | `2027 — Tableau de bord · Pour toi (Pro)` (`2206:2`) |
| Le bloc, compte gratuit | `2027 — Tableau de bord · Pour toi (compte gratuit)` (`2206:340`) |
| La ligne du téléphone | `2027 — Réglages · ligne Suggestions pour toi` (`2206:691`) |

Le bloc vit **sous « Ma prochaine date / À venir », au-dessus de « Mes dossiers »**. Il montre
**3 cartes** (à 4 ou 5, les textes se coupaient — écart assumé avec le « 3 à 5 » du design) :
affiche, nom, dates et ville, **la raison**, et « Pas pour moi ».

## Ce que le lot livre

### 1. En base

- **`suggestion_dismissals`** (`actor_id`, `event_id`, `created_at`), clé primaire
  (`actor_id`, `event_id`). RLS : un membre de l'acteur (lui-même, ou membre de l'enseigne via
  `memberships`) lit, ajoute et retire les lignes de cet acteur. Rien d'autre.
- **Le type de notification `suggestion`**, dans sa propre migration (piège des valeurs
  d'énumération ajoutées).
- **`users.push_muted`** : la contrainte accepte la valeur `suggestions`. Pas de rattrapage : la
  ligne est allumée par défaut, donc absente de `push_muted`.
- **Une fonction de distance** `km_between(lat1, lng1, lat2, lng2)` (haversine, `IMMUTABLE`).
  Pas d'extension : la formule tient en une ligne.

### 2. Le calcul — `suggestions_for(p_actor uuid)`

Une fonction SQL (`SECURITY DEFINER`, `SET search_path = public`, `STABLE`) qui rend un `jsonb` :
`{ "count": n, "items": [...] }`.

- **Garde** : l'appelant (`auth.uid()`) est l'acteur lui-même ou membre de l'enseigne ; sinon
  erreur. Révoquée de `PUBLIC` et `anon`, accordée à `authenticated`.
- **Compte gratuit** : `items` est vide, seul `count` est rempli — le gratuit ne reçoit jamais le
  nom d'une suggestion, même en lisant la réponse réseau.

**Les festivals de référence** de l'acteur : ses participations `interesse`, `inscrit`,
`confirme`, `en_cours`, et ses bilans (`event_reports`). Un bilan pèse plus (il y est allé).

**Les candidats** : événements **publics** (`is_private = false`), qui commencent entre
aujourd'hui (heure de Paris) et dans **12 mois**, **sans aucune participation** de l'acteur
(tout statut, `refuse` compris), et **non écartés** (`suggestion_dismissals`).

**La note** de chaque candidat :

- **Univers** — par festival de référence, le nombre de tags partagés ; un bilan compte double.
  On garde le meilleur festival de référence (il donne la raison « Proche de … »).
- **Zone** — le centre de l'acteur est la moyenne des coordonnées de ses festivals de référence ;
  son rayon, le 80e centile de leurs distances au centre, **au moins 100 km**. Un candidat hors du
  rayon, ou sans coordonnées, n'est pas proposé (sauf par les amis, ci-dessous).
- **Amis** — un bonus fort par ami (vue `friends`, des membres de l'enseigne ou de la personne)
  dont la participation à ce festival (la sienne ou celle d'une enseigne dont il est membre, comme
  dans `notify_friend_going`) est **`amis` ou `public`** — jamais `prive`.

**La raison** rendue avec chaque suggestion, la plus forte d'abord :

1. `{ kind: 'friends', friend_name, others }` → « Gautier y va », « Gautier et 2 amis y vont » ;
2. `{ kind: 'similar', ref_name }` → « Proche des Médiévales de Provins » ;
3. `{ kind: 'near' }` → « Près de chez toi ».

**Sans historique** (aucun festival de référence) : les festivals où vont ses amis, puis ceux du
**département** de l'enseigne (`entities.department`, à défaut `users.department`), les plus
proches dans le temps d'abord, raison `near`.

`items` : les **3** meilleurs, chacun avec `event_id`, `name`, `city`, `start_date`, `end_date`,
`image_url`, `reason`. `count` : le nombre total de candidats retenus.

### 3. Les notifications — `send_suggestions()`

Une tâche `pg_cron` **le lundi et le jeudi à 7 h UTC** (`0 7 * * 1,4`), modèle de
`send_deadline_reminders()`.

Pour chaque enseigne **Pro ce jour-là** (`plan = 'pro'` ou `comped_pro_until > now()`), au plus
**une** notification `suggestion`, pour la meilleure suggestion **très forte** :

- même univers (au moins un tag partagé) **et** dans la zone ;
- **et** au moins un ami qui y va, **ou** un tag partagé avec un festival **bilanté** ;
- jamais déjà envoyée à cette enseigne (aucune notification `suggestion` avec ce `event_id`) ;
- non écartée.

Données : `event_id`, `event_name`, `city`, `start_date`, `end_date`, `reason` (même forme que
ci-dessus). Le déclencheur du lot 8e l'envoie ensuite sur le téléphone, sous la ligne
`suggestions`.

**Dans la cloche** (icône étincelle) : « **Fête des Remparts** à Dinan, 12-13 juillet, pourrait
t'intéresser : proche des Médiévales de Provins. » Avec un ami : « … : Gautier y va. » Elle ouvre
la fiche. La V1 ignore ce type (elle ne lit que les siens).

### 4. Le bloc « Pour toi » sur le tableau de bord

- **Pro** : titre « Pour toi », sous-titre « Des festivals proches de ceux que tu fais, trouvés
  par Fellowship », 3 cartes. Un appui ouvre la fiche. **« Pas pour moi »** écrit dans
  `suggestion_dismissals`, retire la carte en l'animant, et relit le calcul pour la remplacer.
- **Gratuit** : les cartes floutées (de fausses cartes : on n'a pas les vraies), la pastille Pro,
  « J'ai trouvé **{count}** festivals faits pour toi » (« 1 festival fait pour toi » au
  singulier), « Proches de ceux que tu fais, dans ta zone. Le Pro te les montre, et te prévient
  quand il en trouve un nouveau. », bouton « Découvrir le Pro » vers l'offre.
- **`count = 0`** : le bloc ne s'affiche pas. **Erreur de lecture** : le bloc ne s'affiche pas
  non plus (c'est une aide, pas une donnée de l'exposant — même exception que la suggestion de
  doublons).

### 5. Réglages et offre Pro

- **Une 7e ligne** pour le téléphone, après « Nouvelle édition » : « **Suggestions pour toi** »
  · Pro · « Un festival fait pour toi, au plus deux fois par semaine ». Clé `suggestions`,
  allumée par défaut, verrouillée sans Pro comme les deux autres lignes Pro.
- **L'offre Pro** (`PlanCard.tsx`) : « Tes recherches sauvegardées t'alertent des nouveaux
  festivals » devient « Fellowship te trouve des festivals faits pour toi, et te prévient ».

## Comment c'est construit

- **SQL** : `suggestions_for` et `send_suggestions` partagent une fonction interne qui note les
  candidats d'un acteur (une seule source pour le bloc et la notification).
- **`lib/suggestions.ts`** (pur, testé) : la phrase de la raison (`reasonText`) et le libellé du
  nombre (`foundLabel`).
- **`lib/notifications.ts`** : la phrase de `suggestion`, ajoutée à `KNOWN_TYPES`, et l'icône.
- **`lib/push-lines.ts`** : la ligne `suggestions` (Pro), `suggestion` → `suggestions` ; puis
  `scripts/sync-push-phrases.mjs` pour recopier dans `send-push`, et **redéployer `send-push`**.
- **`features/dashboard/`** : `SuggestionsSection.tsx` et son hook `useSuggestions.ts` (modèle
  de chargement du dépôt : une fonction qui rend le résultat, l'effet l'applique une fois).
- **CSS** : `3-components/suggestions.css`, jetons dans `2-semantic.css`.

## Vérification

- Tests Vitest : `reasonText` (ami seul, ami et autres, proche de, près de chez toi),
  `foundLabel` (1, plusieurs), la phrase de la notification, `lineOf('suggestion')`.
- En base, **sans écrire en production** : `suggestions_for` lue à blanc pour quelques acteurs
  réels (Runes de Chêne, un compte gratuit, un compte sans historique) — qui recevrait quoi et
  pourquoi ; la garde refuse un acteur étranger ; un `SELECT` à blanc de ce que `send_suggestions`
  enverrait, avant sa première exécution ; la tâche dans `cron.job`.
- Dans le navigateur : le bloc Pro, « Pas pour moi » (la carte part, une autre arrive), le
  compte gratuit, la ligne dans Réglages.

## Hors de ce lot

- La mascotte qui présente les suggestions.
- La raison donnée en écartant une suggestion.
- Les e-mails (Resend).
- Le mobile du bloc (avec le mobile des écrans restants).
