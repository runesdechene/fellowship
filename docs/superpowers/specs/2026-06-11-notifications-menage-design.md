# Ménage notifications — deux maisons

**Date :** 2026-06-11
**Statut :** design validé (en attente de revue de la spec)
**Auteur :** Uriel + Claude (XO)

## Problème

L'histoire des notifications est éclatée sur 5 surfaces qui se chevauchent, sans
frontière claire entre « ce qui me concerne » et « la vie du réseau » :

| Surface | Source | Contenu | Gated |
|---|---|---|---|
| 🔔 Cloche (haut-droite, `SearchBar`) | table `notifications` | perso uniquement | non |
| `/notifications` (2 onglets) | table `notifications` | perso **+** activité globale | non |
| Page Communauté | `useCommunityFeed` | vie du réseau | **Pro** |
| Mini-feed sidebar (`SidebarNetworkActivity`) | `useCommunityFeed` | vie du réseau | **Pro** |
| `NotificationSlidePanel`, `SidebarActivity` | — | **code mort** (jamais importés) | — |

Constats clés :
- La taxonomie existe déjà dans le code (`NOTIFICATION_TYPES` perso vs `ACTIVITY_TYPES`
  global) mais est mal exploitée.
- Côté « Activité », le seul trigger encore vivant est `event_created` qui **insère une
  notification pour CHAQUE utilisateur** à chaque event créé (fan-out N×M — bruit + dette
  de scaling). `new_exposant` est déjà mort ; les triggers photo le sont probablement aussi.
- L'utilisateur veut : (1) auto-read de la cloche à l'ouverture, (2) une distinction nette
  entre notifs importantes et activité globale, (3) un badge rouge chiffré sur la ligne
  Communauté de la leftbar.

## Modèle retenu : deux maisons, frontière par « qui ça concerne »

- **🔔 Cloche = « ça TE concerne, maintenant »** — perso, actionnable, file finie.
  Toujours accessible (gratuit inclus).
- **👥 Communauté = « la vie du réseau + nouveautés Fellowship »** — ambiant, qu'on
  parcourt. Réservé au Pro.

On NE fusionne PAS l'important dans Communauté : la page est gated Pro, et les exposants
gratuits ont besoin de leurs notifs critiques (nouveau follower, deadline, ami va à ton
event). La distinction voulue est résolue **par l'emplacement** (cloche = toi ; leftbar /
Communauté = réseau).

## Décisions validées

1. **Auto-read cloche** : à l'ouverture du pop-up, tout le perso passe « lu » → badge à 0.
   Le surlignage « nouveau » reste affiché jusqu'à la fermeture (snapshot local). Bouton
   « Tout lire » supprimé.
2. **Badge leftbar Communauté** : compteur rouge = nb de nouveautés depuis la dernière
   visite. Mémorisé en **localStorage** par `actor_id`. Remis à 0 à l'ouverture de
   `/communaute`. **Pro uniquement** (la ligne est lockée pour les gratuits).
3. **« Un exposant a ajouté un festival »** apparaît dans Communauté, **portée
   plateforme entière** (pas seulement le réseau), pour faire vivre le feed malgré le
   cold-start. Implémenté comme **item du feed dérivé** (requête bornée), pas comme notif
   → zéro fan-out.
4. **`event_created` broadcast tué** côté DB (on retire le trigger + la fonction).
5. **Onglet « Activité » de `/notifications` supprimé** → page = liste perso unique.
6. **Code mort supprimé** : `NotificationSlidePanel` (+ CSS), `SidebarActivity`.

## Design détaillé

### A. Migration DB — couper le broadcast

Nouvelle migration `supabase/migrations/<ts>_drop_event_created_broadcast.sql` :
- `DROP TRIGGER IF EXISTS on_event_created ON events;`
- `DROP FUNCTION IF EXISTS notify_event_created();`
- Vérifier `20260406120001_participant_notification_triggers.sql` : si des triggers
  `event_image_added` / `event_info_added` y vivent encore, les dropper aussi (ils
  alimentaient l'onglet Activité qui disparaît).
- Optionnel : `DELETE FROM notifications WHERE type = 'event_created';` pour purger les
  lignes broadcast déjà accumulées (allège la table ; à confirmer avec Uriel).

Aucune table/colonne nouvelle. `events.created_by_actor` existe déjà.

### B. Feed Communauté — nouvelle source « event_created »

**`src/lib/community.ts`**
- `FeedKind` : ajouter `'event_created'`.
- `filterBySegment` : `event_created` n'apparaît que sous `'tout'` (comportement par
  défaut, déjà le cas puisque les autres segments filtrent par kind précis).

**`src/hooks/use-community.ts`**
- Ajouter une 5ᵉ requête dans le `Promise.all`, **portée plateforme** (pas `.in(followingIds)`) :
  ```ts
  supabase.from('events')
    .select('id, name, city, start_date, end_date, image_url, slug, created_by_actor, created_at')
    .gte('created_at', since)               // fenêtre 30j existante
    .neq('created_by_actor', me)            // ne pas s'afficher soi-même
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT)
  ```
- Fusionner ces events dans `eventMap` (on a déjà toutes leurs colonnes) et ajouter les
  `created_by_actor` à `actorIds` pour résoudre le nom/avatar du créateur.
- Construire des `FeedItem` `kind: 'event_created'`, `occurredAt: created_at`,
  `actor: créateur`, `event: l'event`. `sortFeed` les classe par date sans changement.

**`src/components/community/ActivityItem.tsx`**
- Ajouter le rendu du kind `event_created` : « **{exposant}** a ajouté **{festival}** »,
  avec vignette + lien vers la fiche event. Réutiliser le style des items existants.

### C. Header Communauté

**`src/pages/Communaute.tsx`** — reformuler `comm-sub` pour ne plus promettre *uniquement*
le réseau, p.ex. : « Ce que vit ta tribu, et les nouveaux festivals sur Fellowship. »

### D. Cloche — auto-read + suppression « Tout lire »

**`src/components/notifications/NotificationItem.tsx`**
- Ajouter une prop optionnelle `forceUnreadStyle?: boolean`. Le style « non lu »
  (`bg-primary/5`, `font-medium`, point bleu) s'applique si `!notification.read ||
  forceUnreadStyle`. Découple l'affichage « nouveau » de l'état `read` en base.

**`src/components/layout/SearchBar.tsx`**
- À l'ouverture du pop-up (`bellOpen` passe à `true`) : capturer un snapshot
  `unreadSnapshot = new Set(personalNotifs.filter(n => !n.read).map(n => n.id))`, puis
  appeler `markAllAsRead()`. Le badge (`personalUnread`) tombe à 0.
- Passer `forceUnreadStyle={unreadSnapshot.has(n.id)}` à chaque `NotificationItem`.
- Réinitialiser le snapshot à la fermeture.
- **Supprimer le bouton « Tout lire »** (`notif-dropdown-mark-all`).

### E. Page /notifications — liste perso unique

**`src/pages/Notifications.tsx`**
- Retirer les onglets (`Notifications` / `Activité`) et l'état `tab`.
- Afficher uniquement `personalNotifs`.
- `markAllAsRead()` au montage (cohérent avec l'auto-read de la cloche) ; retirer le
  bouton « Tout lire ».

### F. Badge leftbar Communauté

**`src/hooks/use-community-badge.ts`** (nouveau) — hook léger, **Pro only** :
- Lit `lastSeen` = `localStorage['fellowship-communaute-seen-<actorId>']` (0 si absent).
- Compte (head: true) les events `created_at > lastSeen` et `created_by_actor != me` :
  ```ts
  supabase.from('events').select('id', { count: 'exact', head: true })
    .gt('created_at', lastSeenIso).neq('created_by_actor', me)
  ```
- Retourne `count`. Ne lance rien si non-Pro.
- Note honnête : le badge compte les **nouveaux festivals** (signal dominant, requête O(1)),
  pas chaque micro-activité réseau. Choix assumé pour rester cheap ; extensible plus tard.

**`src/pages/Communaute.tsx`** — au montage, écrire
`localStorage['fellowship-communaute-seen-<actorId>'] = new Date().toISOString()` (badge → 0).

**`src/components/layout/Sidebar.tsx`** — sur l'entrée nav `communaute` à l'état `active`,
afficher `<span className="navbadge">{count}</span>` quand `count > 0` (réutilise le style
rouge existant de l'entrée Admin).

### G. Suppression du code mort

- Supprimer `src/components/notifications/NotificationSlidePanel.tsx` + son `.css`.
- Supprimer `src/components/notifications/SidebarActivity.tsx`.
- Dans `src/hooks/use-notifications.ts` : `ACTIVITY_TYPES` n'a plus de producteur. Garder
  le filtrage `personalNotifs` (défensif vis-à-vis des vieilles lignes), mais retirer les
  exports devenus inutiles (`activities`, et `unreadCount` si plus consommé après la
  refonte de `/notifications`). À confirmer à l'implémentation par recherche d'usages.

## Hors scope (notés pour plus tard)

- Re-scoper les events du feed sur le réseau quand la plateforme sera dense (aujourd'hui :
  plateforme entière pour le cold-start).
- Badge leftbar côté serveur (sync multi-appareils) si le besoin émerge.
- Réintroduire `new_exposant` (prévu « Phase 5 » sur `entities`).

## Tests

- **Pur / unitaire** (testable sans réseau) : `filterBySegment` avec un item
  `event_created` → présent sous `'tout'`, absent des autres segments. `sortFeed` ordonne
  un `event_created` parmi reviews/participations par `occurredAt`.
- **Vérif manuelle** (donnée derrière login) : ouvrir la cloche → badge tombe à 0, items
  restent surlignés ; recharger → surlignage parti. Ajouter un event → apparaît dans
  Communauté + incrémente le badge leftbar ; ouvrir Communauté → badge à 0.
- **Build** : `pnpm build` (tsc + vite) vert avant commit.

## Fichiers touchés (récap)

- `supabase/migrations/<ts>_drop_event_created_broadcast.sql` (nouveau)
- `src/lib/community.ts`
- `src/hooks/use-community.ts`
- `src/hooks/use-community-badge.ts` (nouveau)
- `src/components/community/ActivityItem.tsx`
- `src/pages/Communaute.tsx`
- `src/components/notifications/NotificationItem.tsx`
- `src/components/layout/SearchBar.tsx`
- `src/pages/Notifications.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/hooks/use-notifications.ts`
- Suppressions : `NotificationSlidePanel.tsx` (+`.css`), `SidebarActivity.tsx`
