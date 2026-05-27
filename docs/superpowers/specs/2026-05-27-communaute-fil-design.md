# Communauté — le fil du réseau (v1) — design

- **Date :** 2026-05-27
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `validé` (design approuvé 2026-05-27)
- **Maquette de référence :** [`docs/decisions/assets/communaute-fil.html`](../../decisions/assets/communaute-fil.html) — **à suivre fidèlement**
- **Décision stratégique parente :** [`docs/decisions/0001-fondations-vision-packs-da.md`](../../decisions/0001-fondations-vision-packs-da.md) §5 (matrice gratuit/Pro), §61-62 (teaser, levier émotionnel)

---

## 1. Pourquoi (le « job »)

Communauté est la surface Pro la plus **désirable** : « payer pour se relier à sa tribu » (0001 §62).
C'est le **levier émotionnel de conversion** vers le Pro. Aujourd'hui la route `/communaute`
est une coquille `ComingSoon` derrière un `ProGate` générique. Ce v1 livre :
1. le **fil réel** pour les Pro (la valeur),
2. le **teaser flouté** pour les gratuits (la conversion).

Sans le teaser, bâtir Communauté en premier perd son sens — il fait partie du v1.

## 2. Périmètre v1 (verrouillé)

**Dans le v1 :**
- Fil d'activité anti-chronologique : **convergences**, **va à / expose à**, **avis** (★), **réseau** (nouveaux follows).
- Carte « Convergences à venir » (colonne droite) + **item roi** convergence en tête de fil.
- Carte « Suggestions pour toi » (heuristique simple, colonne droite uniquement).
- **Teaser flouté** pour les gratuits (vraies convergences floutées + CTA Pro).
- Segments (Tout / Où ils vont / Avis / Réseau), pagination, état vide, responsive.

**Reporté v1.1 (assumé) :**
- Mini-fil « Activité du réseau » dans la sidebar (relève du chantier sidebar).
- Barre de recherche d'exposant dans le fil (recouvre Explorer).
- Groupage « +N dates » d'un même acteur sur une fenêtre.
- Vrai moteur de recommandation (au-delà de l'heuristique).

## 3. Sémantique réseau & confidentialité (cœur de la feature)

- « Compagnon » = **qui tu suis** (`follows`, one-way) — réseau large.
- **Chaque item respecte sa visibilité**, filtré **côté SQL** (jamais côté client) :
  - un item entre dans le fil si **tu suis l'acteur** ET :
    - `public` → toujours visible ;
    - `amis` → visible seulement si `are_friends(viewer, acteur)` (follow réciproque) ;
    - `prive` → jamais.
- Cette règle vaut pour `participations` (colonne `participation_visibility`) et, **si elle existe**,
  pour la visibilité des `reviews`. ⚠️ **À vérifier en implé** : colonne visibilité sur `reviews` ;
  à défaut, les avis sont **publics par nature** (notation d'un festival).

## 4. Couche données

### 4.1 `get_community_feed(p_actor_id uuid, p_limit int, p_before timestamptz)`
Retourne une liste d'activité **triée anti-chrono** (curseur sur `occurred_at`), fenêtre ~**30 jours**,
pages de ~**20** items. Chaque ligne porte un `kind` et les champs nécessaires au rendu :

| `kind` | source | charge utile |
|---|---|---|
| `review` | `reviews` | note (★), extrait du commentaire, festival (nom, dates, ville) |
| `participation` | `participations` | statut, festival (nom, affiche, dates, ville) |
| `follow` | `follows.created_at` | acteur suivi (nom, métier, ville), nb compagnons communs |

Champs communs : acteur source (id, nom, slug, avatar/initiale, couleur), `occurred_at`.
Filtrage visibilité appliqué dans le RPC (cf. §3).

### 4.2 `get_community_convergences(p_actor_id uuid)`
Festivals **à venir** (`start_date >= today`) où **≥ 2** de tes abonnements ont une participation
**visible** (cf. §3). Classés par **nombre décroissant** puis **date la plus proche**.
Retourne : festival (id, nom, dates, ville, affiche), `compagnons_count`, échantillon d'avatars (~5).
- **Item roi** en tête de fil = résultat #1.
- Carte « Convergences à venir » = top ~5.

### 4.3 `get_follow_suggestions(p_actor_id uuid)` (heuristique)
Exposants **non suivis**, classés par `(nb de tes abonnements qui les suivent)` + `(festivals en commun avec toi)`.
Vivent **uniquement** dans la carte « Suggestions pour toi » (colonne droite). **Pas** injectées dans le fil en v1.

> Architecture : **agrégation à la volée** (RPC). Pas d'event-sourcing / table d'activité (YAGNI à
> l'échelle alpha ; le fil reste toujours frais). Réutilise `get_friend_ids` / `are_friends` pour le scoping.

## 5. UI & composants

- **`CommunautePage`** (`/communaute`) — lit le plan de **l'entité active** (pro-par-entité, cf.
  `project_pro_per_entity`) → branche **Pro** (fil complet) ou **gratuit** (teaser). Orchestre le layout.
- **`use-community-feed`** (hook) — charge fil + convergences + suggestions ; pagination curseur ; expose le filtre segment.
- Composants de présentation :
  - `ConvergenceCard` — item roi (affiche, eyebrow « 🎪 Ça se rassemble », pile d'avatars, « N compagnons y seront », CTA « Voir le festival »).
  - `ActivityItem` — variantes `review` / `participation` / `follow` (mise en page maquette : avatar carré, texte, ★/chips/sous-ligne selon le type, bouton Suivre pour `follow`).
  - `ConvergenceList` + `SuggestionsCard` — cartes colonne droite.
  - `CommunauteTeaser` — préview gratuite.
- **Layout** : sidebar (existante/chantier sidebar) + `stage` ; grille `1fr 330px` ; colonne droite `sticky`.
- **CSS** : `Communaute.css` sur le modèle Explorer/Vitrine (tokens DA, pas de styles inline).

### États
- **Teaser gratuit** : lance la **vraie** requête convergences (chiffres réels de l'utilisateur),
  affiche 2-3 items lisibles puis **dégradé + flou CSS** sur noms/détails + CTA « Passer en Pro dès 9,99 € ».
  (Soft paywall présentational, pas une mesure de sécurité.)
- **Vide** (réseau petit/calme — le vrai risque produit) : pas de fil triste → Suggestions en grand
  + lien Explorer (« suis des compagnons pour voir où va ton monde »).
- **Chargement** : skeletons. **Erreur** : message + retry.

### Responsive
- `< 1080px` (comme la maquette) : sidebar + colonne droite masquées, fil pleine largeur, segments conservés.

### Segments (filtre client sur le lot chargé)
- **Tout** = tout · **Où ils vont** = participations + convergences · **Avis** = reviews · **Réseau** = follows + suggestions.

## 6. DA — port nuit/jour

La maquette est **nuit-only**. Port vers le système 2-thèmes selon la checklist habituelle
(`reference_da_daynight_gotchas`, 0001 §163) :
1. SVG : règle scopée `fill:none; stroke:currentColor; stroke-linecap/linejoin:round`.
2. Pas de `#fff` en dur hors fonds colorés fixes (boutons dégradé, avatars gradient) → `hsl(var(--foreground))`.
3. Ombres : override `.light` chaud très basse opacité (cartes ≈ `rgba(60,45,35,.07)`).
- Tokens en triplets-HSL + `hsl(var())`. Variante `light:` pour les overrides jour côté composant.

## 7. Tests

Contrainte infra connue (`reference_react_test_infra`) : RTL `render()` ne flush pas en synchrone sur ce stack.
→ Tester la **logique pure en isolat** :
- assemblage + tri anti-chrono du fil ;
- filtre par segment ;
- classement des convergences (count desc, puis date) ;
- heuristique de suggestions.
Pas de test de rendu RTL. RPC validés manuellement / via `execute_sql`.

## 8. Risques & garde-fous

- **Fil vide au lancement** → état vide soigné orienté Suggestions (cf. §5). C'est LA condition pour que la feature « donne envie ».
- **Fuite de confidentialité** → filtrage visibilité **dans le SQL**, jamais côté client (cf. §3).
- **Coût requête pour les gratuits** (teaser lance la vraie requête convergences) → acceptable à l'échelle alpha ; cache court possible plus tard si besoin.
