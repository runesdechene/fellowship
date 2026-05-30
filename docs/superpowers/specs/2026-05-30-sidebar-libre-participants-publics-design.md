# Sidebar libérée + participants acceptés publics — Design

**Date :** 2026-05-30
**Statut :** Validé (Uriel), prêt pour plan d'implémentation
**Objectif business :** Briser la solitude du nouvel arrivant et donner le sentiment que
« la plateforme vit », sans casser la pudeur des exposants — tout en gardant la valeur Pro intacte.

## Le modèle qui émerge : « Découverte ouverte, réseau payant »

Rencontrer / suivre des gens = **gratuit et ouvert**. Avoir le **fil vivant de son réseau** = **Pro**.

Ce design **renverse consciemment** une décision figée (mémoire `project_visibility_model` :
« on ne voit que ses abonnés ; les noms sont réservés au réseau »). Désormais : un exposant
**accepté** à un événement est nommé **publiquement**. La pudeur est préservée par le périmètre
(seuls les *acceptés* sont publics ; jamais un dossier en cours, repéré ou refusé).

## Périmètre

Deux features contenues. **Hors scope assumé :** la page Communauté ne bouge pas ; pas de fix
cold-start des suggestions. On réévaluera après avoir mesuré l'effet de ces deux leviers.

---

## Feature 1 — Sidebar libérée (gratuit, followers-only)

### État actuel (vérifié)
- `src/components/community/SidebarNetworkActivity.tsx` est le **seul** bloc d'activité monté
  dans la sidebar (`src/components/layout/Sidebar.tsx:98`).
- Il est **gaté Pro** : `if (!isPro) return null` (ligne 22). Un gratuit ne voit rien.
- Sa donnée est **déjà followers-only** : `useNetworkActivityMini` → `useCommunityFeed`
  (`src/hooks/use-community.ts`), qui part de la table `follows` et renvoie un feed vide si tu
  ne suis personne.
- Quand `items.length === 0`, il `return null` (rien).

### Changements
1. **Retirer le gate Pro.** Le bloc s'affiche pour tous les utilisateurs connectés.
2. **Garder le périmètre followers-only.** Aucune ouverture platform-wide. (Décision Uriel :
   le « ça vit » passe par la page event, pas par la sidebar.)
3. **Conserver le garde-fou perf** `!collapsed` : on ne lance `useCommunityFeed` que quand la
   sidebar est déployée. (Avant : `isPro && !collapsed`. Après : `!collapsed`.)
4. **État vide → placeholder** (au lieu de `return null`) : carte douce
   *« Suivez des pages créateurs pour voir leurs contenus »* + lien vers `/explorer`.
   Cet état couvre les deux cas : zéro follow, et follows sans activité récente.
5. `Tout voir →` continue de pointer vers `/communaute` (qui **reste Pro** = l'upsell est intact :
   le gratuit goûte le fil dans la sidebar, le mur Pro l'attend sur la page complète).

### Boucle produit
Gratuit suit des créateurs (le suivi est gratuit) → leur activité apparaît dans sa sidebar →
il clique `Tout voir` → mur Pro Communauté → conversion.

### Note perf
Désormais tout utilisateur connecté avec sidebar déployée déclenche `useCommunityFeed`
(plusieurs requêtes Supabase). Acceptable. Le garde-fou `!collapsed` limite la casse. Ne pas
sur-optimiser tant qu'on n'a pas mesuré.

---

## Feature 2 — Page event : participants acceptés publics (vecteur de rencontre)

### État actuel (vérifié)
- `src/components/events/ParticipantsModal.tsx` **liste déjà TOUS les participants** d'un
  événement (pas seulement les abonnés) : requête `participations` sans filtre `friendIds`
  (lignes 62-65), split en *« Tes compagnons »* / *« Autres participants »*, noms cliquables
  vers `/@slug`. Commentaire : *« RLS: inscrit is public »*.
- **MAIS la porte d'entrée est cachée au cold-start** : le bloc « Tes compagnons sur cette date »
  (`src/pages/EventPage.tsx:531`) ne s'affiche que `if (friendCount > 0)`, et `friendCount` vient
  de `useFriendsOnEvent` (`src/hooks/use-participations.ts:113`) = **abonnés uniquement**
  (via RPC `get_friend_ids`). Donc le nouveau qui ne suit personne ne voit jamais le bouton qui
  ouvrirait la liste complète.
- **La modale affiche tous les statuts** : `STATUS_LABELS` mappe `interesse` (Repéré),
  `en_cours` (Dossier envoyé), `inscrit` (Accepté), `refuse` (Refusé). Or seul *accepté* doit
  être public.
- **Modèle de statuts** (`src/lib/explorer.ts:136,166-172`) : *accepté* = `confirme` (canonique)
  ou `inscrit` (legacy). Les non-acceptés : `interesse`, `en_cours`, `refuse`, etc.

### Changements
1. **Découpler la porte d'entrée du `friendCount`.** Afficher l'accès à la liste des participants
   dès qu'il existe ≥1 participant **accepté** sur l'événement, même si l'utilisateur ne suit
   personne (et même s'il n'est pas connecté, si la page event est publique).
   - Nouvelle donnée légère : un **compte d'acceptés public** par événement (count des
     participations `confirme`/`inscrit`). Réutiliser/étendre une requête existante plutôt que
     d'en ajouter une lourde.
2. **Copy cold-start** : quand l'utilisateur n'a aucun compagnon mais l'event a des acceptés,
   afficher un hook de rencontre : *« N exposants Fellowship sont acceptés ici — voir qui »*
   (au lieu de masquer le bloc). Quand il a des compagnons, garder la formulation actuelle
   « Tes compagnons sur cette date » enrichie.
3. **Liste publique = acceptés uniquement.** Dans `ParticipantsModal`, ne lister publiquement
   que les statuts acceptés (`confirme` + `inscrit`). Les abonnés (`isFriend`) restent mis en
   avant en tête. (Pour un abonné, on peut tolérer d'afficher son statut plus riche puisqu'il y a
   relation — à confirmer en build ; le défaut sûr = acceptés only pour tout le monde.)
4. **Aligner le mapping de statut** : `STATUS_LABELS` / `KNOWN_STATUSES` doivent reconnaître
   `confirme` (= Accepté), pas seulement `inscrit`. Corriger l'incohérence.

### Point sécurité — à VALIDER en build (bloquant)
Vérifier la **policy RLS Supabase** sur `participations` : confirmer qu'un utilisateur tiers
(non-propriétaire, non-abonné, voire non-connecté) ne peut lire que les lignes au statut
**accepté**. Le commentaire code dit *« inscrit is public »* mais il faut le prouver sur la base
(et couvrir `confirme` aussi, pas seulement le legacy `inscrit`). Si la RLS laisse fuiter des
statuts non-acceptés, c'est un correctif DB prioritaire avant de rendre la liste plus visible.

---

## Critères de succès
- Un gratuit voit l'activité de son réseau dans la sidebar ; sans follow, il voit le placeholder
  qui l'invite à suivre des créateurs.
- Sur une page event, n'importe qui (même cold-start, même non connecté) peut voir la liste des
  exposants **acceptés** et cliquer vers leur page pour les suivre.
- Aucun statut non-accepté d'un inconnu n'est jamais exposé (vérifié RLS + filtre UI).
- La page Communauté reste Pro ; l'upsell est intact.

## Tests
- **Sidebar** : test pur sur la logique d'état (gate retiré ; placeholder quand feed vide ;
  feed rendu quand items présents). Suivre `reference_react_test_infra` (pas de `render()` qui
  flush ; tester les fonctions pures / la décision d'affichage).
- **Participants** : test pur sur le filtre « acceptés only » (`confirme` + `inscrit` inclus ;
  `interesse`/`en_cours`/`refuse` exclus) et sur la condition d'affichage de la porte d'entrée
  (≥1 accepté, indépendant du `friendCount`).
- **RLS** : vérification manuelle/SQL sur la base (un acteur tiers ne lit que les acceptés).

## Fichiers touchés (estimé)
- `src/components/community/SidebarNetworkActivity.tsx` (gate + placeholder)
- `src/pages/EventPage.tsx` (porte d'entrée découplée du friendCount + copy cold-start)
- `src/hooks/use-participations.ts` (compte d'acceptés public ; éventuel ajustement)
- `src/components/events/ParticipantsModal.tsx` (filtre acceptés only + mapping `confirme`)
- Migration Supabase RLS **si** la vérification révèle une fuite de statuts non-acceptés.
