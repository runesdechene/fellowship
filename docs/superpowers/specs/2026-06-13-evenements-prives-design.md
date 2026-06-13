# Événements privés (non répertoriés) — suivi perso solo

**Date :** 2026-06-13
**Statut :** Design validé (Uriel OK 2026-06-13)
**Auteur :** Claude (XO) + Uriel

## Problème

Des exposants vont à de **petits événements non publics** (marchés confidentiels, dates privées). Aujourd'hui Fellowship ne sait gérer que des événements **publics** : toute création entre au répertoire (Explorer, Carte, recherche, embed, vitrines) et déclenche notifications + fil Communauté. Du coup l'exposant ne peut pas tracker ces petites dates ici — il garde un carnet à part, et **son agenda Fellowship est à trous**.

## Objectif

Permettre de créer un **événement privé** : une date que **seul son créateur voit** (plus toute personne disposant du lien, en lecture). Invisible partout ailleurs. Objectif business : faire de Fellowship **l'agenda complet** de l'exposant — toutes ses dates, publiques ET privées, au même endroit. La feature se branche directement sur le suivi financier (`event_ledger_entries` + bilan) livré le même jour : un event privé porte sa participation, son paiement, son bilan, comme n'importe quel event.

## Décisions cadrantes (validées)

1. **Nature = suivi perso solo.** Un event privé = une ligne `events` normale flaggée privée, avec **la seule participation du créateur** dessus. Pas de participations de tiers, pas de notifs, pas de dédup, pas de suggestions.
2. **Gratuit pour tout exposant.** Création + capture de paiement = gratuites (maximise le wedge « agenda complet »). Le levier Pro reste le **bilan/registre complet + l'analyse cockpit**, inchangé.
3. **Modèle « non répertorié »** (unlisted, façon YouTube). La RLS lecture reste permissive (nécessaire à l'accès par lien anonyme). La confidentialité = **absence de listage partout + slug non devinable**, PAS un secret cryptographique. Le bilan/paiement, eux, restent privés au créateur via leur propre RLS (`can_act_as`).

## Architecture & composants

### Donnée (migration Supabase)

```sql
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Requêtes du créateur sur ses events privés (calendrier/cockpit).
CREATE INDEX IF NOT EXISTS idx_events_private_creator
  ON public.events (created_by_actor) WHERE is_private = true;
```

- C'est le **seul nouveau champ**. Participation, `payment_status`, `payment_orientation`, `event_ledger_entries`, `event_reports` fonctionnent tels quels (clés sur `event_id`).
- **RLS inchangée** : `events_select_authenticated` (et l'accès anon des pages publiques) restent permissifs — l'accès par lien en dépend. L'exclusion se fait au niveau **applicatif + RPC** (voir §« Surfaces »).

### Slug non devinable (privés)

- À la création d'un event privé, le slug reçoit un **suffixe aléatoire à forte entropie** : `petit-marche-<32 hex>` (~122 bits, UUID v4 sans tirets). C'est la **capability** du lien (le modèle unlisted repose entièrement dessus) — il doit être infaisable à deviner/brute-forcer. **Jamais** de compteur prévisible pour les privés.
- Réalisé **côté serveur dans le trigger `events_set_slug`** (le slug y est déjà généré), pas via un helper JS — évite tout `Math.random` et garde la logique slug en un seul endroit. `gen_random_uuid()` est core (pas de dépendance pgcrypto). Le slug public reste inchangé.

### Création (gratuite, tout exposant)

- Réutilise **`EventForm`** + un **toggle « 🔒 Privé »** en tête de formulaire (état `isPrivate`).
- En mode privé : **tags optionnels** (un event non listé n'a pas besoin de catégorie de découverte) ; le reste des champs requis inchangé (nom, ville, département, dates — nécessaires à l'affichage calendrier/page). Image facultative comme aujourd'hui.
- À l'insert : `is_private: true`, slug suffixé. **Puis création immédiate de la participation du créateur** (`status='inscrit'`, `visibility='amis'`) → le stepper paiement + le bilan sont dispo tout de suite, sans « se rejoindre » soi-même.
- **Aucune notification ni entrée fil Communauté.** Le(s) trigger(s) qui annoncent les nouveaux events (`created_by_actor`, fil communauté) sont **conditionnés à `NEW.is_private = false`** (recréer le trigger/fonction avec le garde).

### Convertibilité

- Le flag `is_private` est **éditable** (édition d'event, `EventPage` `handleSaveEdit`).
- **Privé → public** : l'event entre au répertoire. Le slug **reste** celui suffixé (pas de re-slug pour ne pas casser les liens partagés). Avertissement UI à l'activation publique : « il deviendra visible de tous ».
- **Public → privé** : avertissement « il disparaîtra de l'Explorer, de la Carte, des recherches et de ta vitrine ». Comme c'est solo, aucun conflit de participations tierces (s'il y en avait — cas legacy d'un event public déjà rejoint par d'autres — on **bloque** la bascule public→privé si `count(participations) > 1` pour ne pas faire disparaître l'event sous les pieds d'autres exposants).

## Surfaces — l'invariant central : **un event privé n'apparaît dans AUCUN listing ni AUCUNE recherche**

Règle unique : **toute lecture d'`events` qui n'est ni une surface de suivi perso du créateur, ni un accès direct par slug/id, doit exclure `is_private = true`.**

### Visible (les seules exceptions)
- **Calendrier du créateur** et **Cockpit du créateur** (ses surfaces de suivi perso) — incluent ses events privés.
- **Page lien `/e/:slug`** — lecture, pour qui a le lien (créateur ou tiers, authentifié ou anon). Affiche les infos de l'event ; **jamais** le bilan/paiement (déjà privés par RLS).
- Cadenas **🔒** affiché sur l'event partout où le créateur le voit (calendrier, cockpit, en-tête de page) pour signaler le statut privé.

### Exclu — chaque chemin à filtrer explicitement
1. **Explorer** — requête de liste des events → `+ is_private = false`.
2. **Carte** (`use-map-events`) → `+ is_private = false`.
3. **Recherche Explorer/Carte** (`composeFilter` opère sur la liste déjà filtrée — OK si la source exclut le privé).
4. **Recherche globale** (barre de recherche) — n'expose que les **entités** (`isSearchableActor`, `kind='entity'`), PAS les events → déjà OK, **vérifier** qu'aucun chemin event n'y entre.
5. **Dédup à la création** — RPC **`search_similar_events`** (`SECURITY DEFINER`, scanne tous les events) → **recréer avec `AND e.is_private = false`**. ⚠️ Sinon créer un event public homonyme **révélerait** un event privé. (C'est la fuite que cette feature doit absolument fermer.)
6. **Embed** (`/:slug/embed`, vitrine d'un exposant) → `+ is_private = false`.
7. **Vitrine publique** du créateur (`use-vitrine`, dates montrées aux abonnés) → `+ is_private = false`. **Même le créateur ne l'expose pas** sur sa vitrine publique.
8. **RPC de dates du réseau** (fuite indirecte via la participation du créateur) — `get_followers_with_dates`, `get_following_with_dates`, `get_friends_with_dates`, `get_coevent_suggestions`, et l'agrégation « X compagnons sur cette date » du calendrier : **exclure les events privés** (`JOIN events ... WHERE is_private = false`). La participation du créateur à un event privé ne doit JAMAIS remonter à ses abonnés.
9. **AdminEvents** (back-office) — décision : l'admin **ne voit pas** les events privés des exposants (cohérent avec « aucun admin n'accède aux données perso », cf. bilans privés). Filtrer `is_private = false` côté admin aussi. (À confirmer au plan ; défaut = exclus.)

### Surfaces SUPPLÉMENTAIRES trouvées en revue adversariale finale (le plan initial les avait ratées)
10. **Triggers de notification DB** `notify_friend_going` / `notify_friend_note` (`AFTER INSERT` participations/notes) : fan-out du **nom + lien** de l'event aux abonnés du créateur. L'auto-participation à la création d'un event privé les déclenchait → **fuite haute gravité**. Garde `IF event_is_private THEN RETURN NEW` (migration `20260613140000`).
11. **Embed public** (`Embed.tsx`, widget Shopify) — jumeau public de la vitrine, à filtrer (select imbriqué + client-side).
12. **« Où vont mes amis »** sur le Calendrier (`useFriendsParticipations`) — la participation d'un ami à son event privé y remontait → `.eq('events.is_private', false)`.
13. **Recherche globale** (`SearchBar.tsx`) — cherchait bien dans les events (≠ hypothèse initiale « entités only ») → filtre ajouté.
14. **Badge « nouveaux festivals »** (`use-community-badge`) + **autocomplétion de tags** (`TagInput`) — filtres ajoutés.

> Leçon : l'invariant « aucune fuite » doit énumérer **toutes** les lectures d'`events` (y compris triggers DB et nested selects), pas seulement les hooks de listing évidents. Une revue adversariale dédiée est indispensable pour une feature de confidentialité.

### Implémentation de l'invariant
- Centraliser dans un helper/commentaire : tout `from('events').select()` de découverte ajoute `.eq('is_private', false)`. Les RPC concernées sont recréées avec le garde SQL.
- Test de non-régression : un event privé créé par A n'apparaît pas dans (a) `search_similar_events`, (b) les dates réseau vues par un follower B, (c) la vitrine de A. Ces trois là sont les chemins « non évidents » — les couvrir en priorité.

## Durcissement anti-énumération — CONSIDÉRÉ PUIS ÉCARTÉ (décision Uriel 2026-06-13)

On a évalué une option de durcissement (resserrer la RLS table à `is_private=false OR can_act_as(created_by_actor)` + RPC `get_event_by_slug` `SECURITY DEFINER` pour l'accès par lien, le slug devenant la capability). **Écartée** : on reste sur l'**unlisted pur** — plus simple, moins de surface DB touchée.

**Conséquence assumée :** le filtrage applicatif + les RPC gardées couvrent **toutes les recherches et tous les listings** (le besoin exprimé). Le seul résidu accepté : un utilisateur authentifié techniquement averti pourrait énumérer via l'API directe (`from('events').eq('is_private', true)`) les noms/dates/lieux des events privés d'autrui (**jamais** le bilan/paiement, eux restant privés par RLS `can_act_as`). Risque jugé acceptable au regard du besoin (de petits événements non sensibles). Réouvrir le durcissement si un cas d'usage sensible apparaît.

## Flux de données (résumé)

```
Création (toggle 🔒) ──▶ events{is_private:true, slug suffixé}
                          │  └─ pas de notif / pas de fil communauté (trigger gardé)
                          └─▶ participation(créateur, 'inscrit') ──▶ stepper paiement + registre + bilan
Lecture :
  surfaces perso créateur (Calendrier, Cockpit)  ── voient is_private=true (created_by_actor=moi)
  page /e/slug                                    ── accès par lien (infos publiques only)
  TOUT le reste (Explorer/Carte/recherche/dédup/  ── filtre is_private=false
    embed/vitrine/RPC réseau/admin)
```

## Cas limites
- **Event privé sans tags** : autorisé (tags optionnels en privé). Les surfaces de découverte ne le lisent pas, donc l'absence de tag est sans effet.
- **Bascule public→privé d'un event déjà rejoint par d'autres** : bloquée (`participations > 1`) — on ne fait pas disparaître un event sous d'autres exposants.
- **Lien partagé d'un event ensuite repassé privé** : le lien continue de fonctionner (accès par slug toujours permis) ; c'est voulu (unlisted).
- **Suppression** : `on delete cascade` existant nettoie participation + ledger + report.

## Tests (fonctions pures + garde-fous, cf. contrainte infra de test du projet)
- `privateSlugSuffix()` / construction du slug privé (source d'aléa injectée).
- Helper `excludePrivate(query)` ou la cohérence des filtres : tests purs sur la fonction qui décide « cette surface lit-elle le privé ? ».
- Non-régression recherche : test ciblé que `search_similar_events` (via mock/contrat) et les sélecteurs de listing excluent `is_private`.
- Le reste (RPC SQL) vérifié par revue + smoke test (pas de test runtime DB sur ce stack).

## Hors périmètre (YAGNI v1)
- Participations de tiers sur un event privé (c'est le modèle « solo » ; viendra si demandé).
- Invitations / gestion de co-exposants par lien.
- Tokens de partage signés / révocables (le modèle unlisted suffit au besoin exprimé).
- Re-slug à la bascule de visibilité (on garde le slug pour ne pas casser les liens).
- Chiffrement / vrai secret (explicitement non — modèle non répertorié assumé).

## Périmètre = un seul plan
Cohérent et borné : 1 migration (colonne + triggers gardés + RPC recréées) + helper slug + toggle création + participation auto + filtrage des surfaces de lecture. Découpable en phases (DB/RLS/RPC → création → filtrage des surfaces → convertibilité) mais reste un seul spec → un seul plan.
