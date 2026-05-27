# Vitrine exposant — Phase 3 : édition inline WYSIWYG

> Spec validée le 2026-05-27. Branche `feat/da-nuit-festival-socle`.
> Suite des Phases 1-2 (backend données + vue publique DA en lecture, livrées v0.7.85).

## Objectif

Permettre à l'exposant de remplir et modifier sa vitrine **directement sur sa vitrine**,
sans formulaire séparé. Tout ce qu'un visiteur voit, le propriétaire peut l'éditer sur place
(WYSIWYG). **Phase 3 = pur frontend** : le backend (colonnes, RLS, bucket) est déjà en place
depuis la migration `20260526140000_vitrine.sql`. Aucune migration nouvelle.

## Modèle d'interaction

### Mode édition par toggle
- Bouton `✏ Modifier ma vitrine` visible **uniquement si `isOwner`** (`currentActor.id === entity.actor_id`).
- Il bascule un state local `editing: boolean`.
- En mode édition : crayons, boutons `+ Ajouter`, et éditeurs inline apparaissent par bloc.
- Bouton `✓ Terminé` repasse en vue visiteur — strictement identique au rendu public.
- Par défaut (hors édition), le propriétaire voit sa vitrine **exactement** comme ses visiteurs.

### Commit par bloc, explicite
- Un champ texte (bio, identité, label/url d'un lien) → éditeur inline avec `✓ valider` / `✕ annuler`.
- **Rien n'est écrit en base tant que `✓` n'est pas cliqué.** Pas de save-on-blur sournois.
- Chaque bloc se valide **indépendamment** : état local par bloc, pas de brouillon global à gérer,
  pas de risque de perte croisée.

### Actions atomiques = commit immédiat
- Upload photo galerie / cover / avatar, suppression d'une photo ou d'un lien, réordonnancement
  par drag-and-drop : l'action **est** le commit (écriture directe), confirmée par un toast `✓`.

## Périmètre des champs éditables

Tous portés par la table `entities` (le propriétaire édite l'entité, pas le profil personnel) :

| Champ | Colonne | Éditeur |
|---|---|---|
| Cover | `banner_url` | ImageDrop |
| Avatar | `avatar_url` | ImageDrop |
| Nom de marque | `brand_name` | InlineText (input) |
| Métier | `craft_type` | InlineText (input) |
| Ville / département | `city`, `department` | InlineText (input) |
| Bio (À propos) | `bio` | InlineText (textarea) |
| Spécialités | `specialties text[]` | ChipEditor |
| Liens | `links jsonb` | LinkEditor |
| Galerie | table `entity_gallery` | grid d'édition propre |

**Hors périmètre :**
- `verified` — protégé par le trigger `protect_entity_verified` (anti auto-vérification), non
  modifiable côté client. On ne l'affiche pas en édition.
- `entity.website` — colonne legacy **non affichée** sur la vitrine. Source de vérité des liens
  vitrine = `links` jsonb. On n'y touche pas.

## Structure du code

**On ne duplique pas les composants Vitrine existants.** On ajoute à chacun une prop
`editing: boolean` + des callbacks. Chaque composant rend soit son mode lecture actuel,
soit ses affordances d'édition.

Composants existants modifiés (`src/components/vitrine/`) :
- `VitrineCover` — overlay « ✏ Changer la cover » en édition
- `VitrineHeader` — avatar cliquable, nom/métier/ville éditables, ChipEditor pour spécialités
- bloc « À propos » (dans `PublicProfile.tsx`) — InlineText textarea ; en édition, affiché même si bio vide (placeholder « + Ajouter une présentation »)
- `VitrineLinks` — LinkEditor ; en édition, affiché même si vide
- `VitrineGallery` — grid d'édition (ajout/suppression/DnD) ; en édition, affiché même si vide

`PublicProfile.tsx` orchestre : détient `editing`, le bouton toggle, passe `editing` + callbacks
aux enfants, branche le hook `useVitrineEdit`.

### Primitives d'édition réutilisables — `src/components/vitrine/edit/`
- **`InlineText`** — input ou textarea + `✓/✕`. Props : valeur initiale, multiline, placeholder,
  onCommit(value). Échap = annuler, Entrée = valider (input) / Cmd+Entrée (textarea).
- **`ChipEditor`** — spécialités. Taper + Entrée = ajoute un chip ; `✕` retire. Texte libre,
  **cap 8**, dédoublonnage, trim. Pas de liste préfixée.
- **`LinkEditor`** — liste de liens. Chaque ligne : sélecteur de type (icône website/shop/instagram/
  facebook/other), label, URL. Boutons `+ Ajouter` / éditer / supprimer. `https://` ajouté
  automatiquement si l'URL n'a pas de schéma. **Pas de réordonnancement** (ordre = ordre du tableau).
- **`ImageDrop`** — cover & avatar. Clic → file picker, preview optimiste, upload, commit `banner_url`/`avatar_url`.

### Galerie (édition)
- `+ Ajouter` (sélection **multi-fichiers**) → upload séquentiel, `position` auto-incrémentée.
- `✕` par photo → suppression (DB + storage best-effort).
- **Drag-and-drop natif HTML5** (`draggable`, `onDragStart/Over/Drop`) pour réordonner →
  recalcul des `position` et update batch. Pas de dépendance externe.

## Couche données — hook `useVitrineEdit(entity)`

`src/hooks/use-vitrine-edit.ts`. Expose :
- `updateEntity(patch: Partial<EntityRow>)` → `supabase.from('entities').update(patch).eq('actor_id', …)`.
  RLS `entities_update_member` déjà en place. `(supabase as any)` si besoin de caster un champ jsonb.
- `addGalleryImages(files: File[])` / `removeGalleryImage(id)` / `reorderGallery(orderedIds: string[])`
  → upload bucket + CRUD `entity_gallery`.
- `uploadImage(file, kind: 'cover' | 'avatar' | 'gallery')` → upload bucket `entity-gallery`.
- État local **optimiste** (l'UI reflète le changement avant la confirmation serveur) ; **rollback +
  toast erreur** si l'écriture échoue.

### Bucket unique `entity-gallery`
Cover, avatar **et** galerie vont tous dans le bucket `entity-gallery`. La policy
`entity-gallery write/delete` autorise via `can_act_as((storage.foldername(name))[1]::uuid)` —
le **premier segment du chemin doit donc être l'`actor_id`**. Préfixes retenus :
- `<actor_id>/cover/<file>`, `<actor_id>/avatar/<file>`, `<actor_id>/gallery/<file>`

Ainsi `foldername[1] = actor_id` et la policy passe.

Raison du bucket unique : le bucket `avatars` écrit sur `foldername = auth.uid()`, ce qui
**ne marche pas** pour une entité (dont `actor_id ≠ uid` du membre). Un seul bucket, RLS déjà
correcte, zéro migration.

### Helpers purs (TDD, testés dans `src/lib/vitrine.test.ts`)
- `normalizeLinkUrl(raw)` → ajoute `https://` si pas de schéma, trim.
- `addChip(list, raw)` → trim, ignore vide, dédoublonne, respecte cap 8 → nouvelle liste.
- `reorderPositions(orderedIds)` → renvoie `[{id, position}]` après drag.

## Pièges & qualité

- **DA jour/nuit** : crayons, boutons `+`, éditeurs inline, overlays cover/avatar doivent passer la
  checklist jour/nuit — `svg { fill: none }`, **aucun `#fff` en dur**, ombres douces en `.light`.
  Réutiliser les tokens CSS existants de `Vitrine.css`.
- **Vue visiteur intacte** : hors `editing`, le DOM/rendu doit rester identique à aujourd'hui
  (les blocs vides—bio/liens/galerie—restent masqués comme en lecture publique).
- **Ne pas régresser** les fixes committés sur la branche (cover en haut, scroll pleine hauteur,
  footer maquette, guard nav). `git diff HEAD` avant d'éditer un fichier sale.
- **Tests** : helpers purs en unit. Pas de test RTL de rendu (contrainte connue de la stack —
  `render()` ne flush pas le sync ; pattern « test de fonction pure » à la place).
- **Auto-commit + bump version + push** sur la branche après chaque incrément validé.

## Out of scope (Phase 3.1+ si le test le justifie)
- Réordonnancement des liens.
- Recadrage / crop d'image à l'upload.
- Liste préfixée de métiers/spécialités.
- Édition multi-acteurs concurrente.
