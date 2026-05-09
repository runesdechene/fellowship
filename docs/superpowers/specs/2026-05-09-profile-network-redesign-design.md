# Profile Network Redesign — Design Spec

**Date:** 2026-05-09
**Status:** Approved, ready for implementation plan

## Context

La page `PublicProfile.tsx` affiche actuellement les sections "Amis" et "Abonnés" tout en bas, après `EventCarousel`, sous forme de listes verticales complètes. Retours utilisateurs : peu intuitif, on ne perçoit pas le volume du réseau d'un coup d'œil, et — bug — les avatars ne s'affichent jamais (toujours l'initiale en gradient, alors que `profile.avatar_url` est bien dispo en data).

Le pattern de "stats cliquables avec preview avatars + modal détaillée" est familier (Instagram, GitHub) et résout les trois problèmes en un.

## Goal

Promouvoir le réseau (amis / abonnés) en haut du profil, sous forme de deux pastilles cliquables affichant **compteur + 3 avatars récents** en preview. Clic → modal listant tout le groupe, triée par récence. Bonus : depuis la modal abonnés sur son propre profil, "Suivre en retour" en un clic pour transformer un abonné en ami.

## Out of scope

- Refonte de `ProfileHeader` (banner / avatar / nom / bio / website inchangés)
- Notifications push lors d'un follow-back
- Pagination des modals (volume faible en alpha — on revisite si liste >100)
- Suppression de `ProfileHeader.css` / `Profile.css` legacy non utilisés
- Refonte du `FollowButton` standalone affiché dans `ProfileHeader` (reste en place)

## Design

### Composants

```
PublicProfile.tsx
├── ProfileHeader                       (inchangé)
├── ProfileNetworkStats   ← NOUVEAU     (le bloc de stats)
│   ├── StatPill (×2)                   (sous-composant interne)
│   └── ouvre :
│       ├── FriendsModal   ← NOUVEAU
│       └── FollowersModal ← NOUVEAU
│           └── NetworkListItem         (sous-composant partagé entre les deux modals)
├── (embed btn / signup placeholder / divider — inchangés)
└── EventCarousel                       (inchangé)
```

L'ancien bloc `<div className="profile-network">` (lignes 187-238 de `PublicProfile.tsx`) est **supprimé**, ainsi que les classes CSS associées (`profile-network*`) dans `Profile.css`.

### Disposition — `ProfileNetworkStats`

Placé entre `ProfileHeader` et le bouton `profile-embed-btn` / `EmailSignupPlaceholder` (donc tout en haut du `profile-content`). Format **pills inline** côte-à-côte :

```
┌────────────────────────────┐  ┌────────────────────────────┐
│ [a][m][l]   47   amis      │  │ [p][s][j]   128  abonnés   │
└────────────────────────────┘  └────────────────────────────┘
```

- Container flex, `gap: 8px`
- Chaque pill : `flex: 1`, padding `10px 12px`, fond `card`, bord léger, radius `12px`
- À gauche : 3 avatars empilés (overlap `-8px`), bord blanc 2px pour la séparation
- Au centre/droite : chiffre en `font-weight: 700` puis label "amis" / "abonnés" en plus petit
- Tap target : la pill entière (cursor pointer, hover bg `muted`)
- Empty state : `0 amis` / `0 abonnés` avec une bulle vide à la place des avatars (modal ouvrable mais vide)

### Modals — `FriendsModal` / `FollowersModal`

Pattern visuel calqué sur `ParticipantsModal.tsx` (overlay `bg-black/40 backdrop-blur-sm`, card `max-w-md max-h-[70vh]`, header avec icône + titre + bouton X, liste scrollable).

- Header : icône Lucide (`Users` pour amis, `UserCheck` pour abonnés) + `"Amis (47)"` ou `"Abonnés (128)"`
- Liste : `NetworkListItem` répété, triée par date décroissante
- État vide : message centré ("Pas encore d'amis" / "Aucun abonné" / "Personne ne te suit encore" pour owner)
- État chargement : skeleton léger

### `NetworkListItem` (sous-composant partagé)

Une ligne cliquable :

```
[avatar 36px]  Nom Prenom        [optionnel: bouton "Suivre en retour"]
               Forgeron
```

- `<Link to={/@slug ?? id}>` autour de l'avatar + texte (clic sur la ligne → profil)
- Avatar : si `avatar_url` → `<img>`, sinon fallback gradient hashé (helper `hashName` + `GRADIENTS` réutilisés depuis le pattern existant)
- Nom : `brand_name ?? display_name ?? 'Utilisateur'`
- Sous-ligne : `craft_type` si présent
- À droite, optionnellement, un bouton inline (utilisé seulement par `FollowersModal` pour le follow-back)

### Suivre en retour (FollowersModal + isOwner uniquement)

**Conditions d'affichage du bouton** :
- `isOwner === true` (la modal est sur mon propre profil)
- ET le follower n'est pas dans `friendIds` (set précalculé au fetch)

**Comportement** :
- Bouton compact à droite du `NetworkListItem`, icône `UserPlus` + "Suivre"
- Click :
  1. INSERT optimiste dans `follows` (`follower_id: me, following_id: that user`)
  2. Le composant met à jour son state local : ce follower devient ami
  3. Le bouton disparaît (la personne est maintenant amie, plus besoin de CTA)
- Le clic est `e.preventDefault() + e.stopPropagation()` pour ne pas naviguer vers le profil

Sur les profils des autres ou pour les visiteurs non connectés : bouton jamais affiché.

### Données — fetch et tri

#### Followers (abonnés)

Requête côté `PublicProfile` (modifiée) :

```ts
const { data } = await supabase
  .from('follows')
  .select('created_at, profiles!follows_follower_id_fkey(*)')
  .eq('following_id', profileData.id)
  .order('created_at', { ascending: false })
```

Mapping → `Array<Profile & { followedAt: string }>`. Le `followedAt` permet le tri stable et l'affichage potentiel d'une date dans la modal (pas dans MVP).

#### Friends (amis) — nouveau RPC

Le RPC actuel `get_friend_ids(user_id)` ne retourne que des UUIDs sans timestamp. On crée un nouveau RPC :

```sql
CREATE OR REPLACE FUNCTION get_friends_with_dates(p_user_id UUID)
RETURNS TABLE(friend_id UUID, friended_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    f1.following_id AS friend_id,
    GREATEST(f1.created_at, f2.created_at) AS friended_at
  FROM follows f1
  INNER JOIN follows f2
    ON f1.follower_id = f2.following_id
   AND f1.following_id = f2.follower_id
  WHERE f1.follower_id = p_user_id
$$;
```

`friended_at` = date où l'amitié est devenue mutuelle (le second follow). Côté client, on fetch ensuite les profils complets via `IN(friend_id, ...)` puis on attache `friendedAt` dans le mapping pour permettre le tri.

#### Migration

Nouveau fichier `supabase/migrations/<timestamp>_get_friends_with_dates.sql` contenant uniquement le `CREATE OR REPLACE FUNCTION` ci-dessus. Pas de modification de schéma, pas de breaking change. À appliquer via `supabase db push` (CLI direct, cf. memory `reference_supabase_cli`).

### Preview (3 avatars dans la pill)

`StatPill` reçoit `recent: Profile[]` (déjà tronqué à 3 par le parent). Pour chaque profil :
- Si `avatar_url` → `<img>`
- Sinon → fallback gradient (même helper que partout ailleurs)

Si `recent.length === 0` → une bulle vide grise (placeholder).

### État, ré-fetch

Aucun cache global. Les données réseau sont fetchées dans `PublicProfile.tsx` au montage (déjà le cas), passées en props à `ProfileNetworkStats`. Ouvrir une modal n'entraîne pas de re-fetch — la modal lit la liste déjà chargée.

Quand un follow-back se produit dans `FollowersModal` :
- Le state local de la modal est mis à jour immédiatement (le bouton disparaît)
- Le compteur "amis" affiché dans `ProfileNetworkStats` ne se met pas à jour automatiquement (decision : acceptable en MVP, l'utilisateur ferme/rouvre ou navigue pour voir le nouveau total). Si feedback négatif post-livraison → on remontera le state ou on ajoutera un callback.

### Mobile

Les pills passent en pleine largeur empilées verticalement quand `< 480px` :

```
┌──────────────────────────────────┐
│ [a][m][l]   47   amis            │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ [p][s][j]   128  abonnés         │
└──────────────────────────────────┘
```

Modal : largeur écran moins padding, hauteur max `80vh` sur mobile.

## Bug fix — avatars manquants

Bug actuel dans `PublicProfile.tsx:201-203` et `:226-228` : la JSX rend toujours `(friend.brand_name ?? friend.display_name ?? '?')[0].toUpperCase()` sans regarder `avatar_url`. Comme l'ancien bloc disparaît complètement (remplacé par `ProfileNetworkStats` + modals), le bug est résolu de facto par la nouvelle implémentation, qui utilise systématiquement le pattern correct `avatar_url ? <img> : <fallback gradient>`.

## Files touched (preview)

**Nouveaux** :
- `src/components/profile/ProfileNetworkStats.tsx` (+ co-located CSS si besoin)
- `src/components/profile/FriendsModal.tsx`
- `src/components/profile/FollowersModal.tsx`
- `src/components/profile/NetworkListItem.tsx` (sous-composant partagé)
- `supabase/migrations/<timestamp>_get_friends_with_dates.sql`

**Modifiés** :
- `src/pages/PublicProfile.tsx` — supprime l'ancien bloc + utilise nouveau RPC + place `ProfileNetworkStats` en haut
- `src/pages/Profile.css` — supprime classes `profile-network*`
- `src/types/database.ts` ou `supabase.ts` — type pour le nouveau RPC (si typé)

## Testing strategy

- **Unit** : `NetworkListItem` rend bien `<img>` quand `avatar_url` présent, fallback sinon (test simple Vitest + Testing Library)
- **Unit** : tri par récence sur les 3 avatars de preview (donner 5 profils avec dates, vérifier les 3 retournés)
- **Manuel** : 4 scénarios à valider en navigateur
  1. Mon profil avec 0 amis / 0 abonnés (état vide)
  2. Profil d'un autre avec amis et abonnés (clic → modals normales, pas de bouton follow-back)
  3. Mon profil avec abonnés non amis (clic abonnés → bouton "Suivre en retour" visible)
  4. Click "Suivre en retour" → bouton disparaît, l'utilisateur devient ami (vérif en DB ou en re-naviguant)

## Dependencies / risks

- Le nouveau RPC `get_friends_with_dates` doit être migré avant le déploiement front, sinon erreur runtime. À séquencer dans le plan : migration d'abord, code ensuite.
- Le pattern d'avatar gradient (`GRADIENTS` + `hashName`) est dupliqué 4-5 fois dans le codebase. Tentation de le factoriser, mais hors scope ici (YAGNI).
