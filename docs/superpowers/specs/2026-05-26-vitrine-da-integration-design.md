# Vitrine exposant — DA « Nuit de Festival » + données réelles — Design

> **Statut :** validé (brainstorm 2026-05-26). 5ᵉ page DA après landing / onboarding / explorer / calendrier. Sur la branche `feat/da-nuit-festival-socle` (main = prod, pas mergé). Maquette de référence : `docs/decisions/assets/vitrine-exposant.html`.

## Contexte & problème

La vitrine publique d'un exposant **existe déjà** : `src/pages/PublicProfile.tsx`, route `/:slug` (ex. `/terres-et-flammes`), rendue avec `AppLayout` si connecté, nue sinon. Elle a header (`ProfileHeader`), stats réseau (`ProfileNetworkStats` : abonnés/compagnons), carrousel d'événements `inscrit` (`EventCarousel`), modales QR + embed calendrier, footer (`FellowshipFooter`). Mais : (1) elle n'a **pas la DA** (`Profile.css` encore en `rgba(61,48,40,…)` brun clair-only) ; (2) la maquette ajoute des sections **sans données en base**.

Décision Uriel : **reproduire la maquette à 100% avec de vraies données** — on construit le backend manquant et l'édition. Édition **inline sur la vitrine** (WYSIWYG : le propriétaire édite ce qu'il voit).

## Décisions actées (brainstorm)

1. **Modèle de données** : galerie = table dédiée `entity_gallery` ; le reste = colonnes sur `entities` (`specialties text[]`, `links jsonb`, `verified boolean`).
2. **Stockage galerie** : nouveau bucket Supabase dédié **`entity-gallery`** (public en lecture, écriture RLS propriétaire).
3. **Édition inline** quand `isOwner` (pas de page d'édition séparée).
4. **Sous-titre header** = `{craft_type} · {city} ({department})` — **pas** le nom de la personne (sobre, données sûres, pas de question vie privée).
5. **Galerie** = **6 pièces max**, sans légende, réordonnables.
6. **Vérifié** = colonne `verified` + affichage du badge ; **toggle admin différé** (on set en DB pour les tests). Protégé contre l'auto-vérification par trigger.
7. Build en **4 phases shippables** (cf. plan).

## Modèle de données & sécurité

### Migration — colonnes sur `entities`
```sql
ALTER TABLE entities
  ADD COLUMN specialties text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN links       jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN verified     boolean NOT NULL DEFAULT false;
```
- `links` : tableau d'objets `{ type, label, url }`, `type` ∈ `'website' | 'shop' | 'instagram' | 'facebook' | 'other'` (pilote l'icône lucide). Validé/normalisé côté client (helper testé).
- `specialties` : chips texte libre (ex. `{'Grès','Raku','Émaux maison'}`), max 6 côté UI.
- Les colonnes `specialties`/`links` sont éditables par le propriétaire via la **policy existante** `entities_update_member` (`can_act_as(actor_id)`).

### Protéger `verified` de l'auto-vérification
La policy `entities_update_member` autorise l'UPDATE de **toute** colonne → un propriétaire pourrait se mettre `verified=true`. Trigger garde-fou :
```sql
CREATE OR REPLACE FUNCTION protect_entity_verified() RETURNS trigger AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified AND NOT is_admin() THEN
    NEW.verified := OLD.verified;  -- ignore silencieusement la tentative
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_protect_entity_verified BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION protect_entity_verified();
```
> `is_admin()` : réutiliser le helper admin existant s'il existe (sinon `EXISTS (SELECT 1 FROM users WHERE actor_id = auth.uid() AND role = 'admin')`). À vérifier à l'implémentation.

### Migration — table `entity_gallery`
```sql
CREATE TABLE entity_gallery (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_actor_id uuid NOT NULL REFERENCES entities(actor_id) ON DELETE CASCADE,
  image_url       text NOT NULL,
  position        int  NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_entity_gallery_entity ON entity_gallery(entity_actor_id, position);

ALTER TABLE entity_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY gallery_select_all  ON entity_gallery FOR SELECT USING (true);
CREATE POLICY gallery_write_owner ON entity_gallery FOR ALL TO authenticated
  USING (can_act_as(entity_actor_id)) WITH CHECK (can_act_as(entity_actor_id));
```

### Bucket `entity-gallery`
- Public en lecture. Écriture/suppression réservée au propriétaire via chemin préfixé `{(storage.foldername(name))[1] = entity_actor_id}` :
```sql
-- lecture publique
CREATE POLICY "entity-gallery read"  ON storage.objects FOR SELECT
  USING (bucket_id = 'entity-gallery');
-- écriture propriétaire (dossier = actor_id de l'entité)
CREATE POLICY "entity-gallery write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'entity-gallery' AND can_act_as(((storage.foldername(name))[1])::uuid));
CREATE POLICY "entity-gallery delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'entity-gallery' AND can_act_as(((storage.foldername(name))[1])::uuid));
```
- Upload réutilise le pattern de compression de `src/lib/event-image.ts` (extrait/généralisé si besoin). Chemin : `{entity_actor_id}/{uuid}.webp`.

### Régénération de types
Après migrations, régénérer `src/types/supabase.ts` (ou caster `as any` selon précédent projet — cf. [[reference_supabase_rpc_types]]). `EntityRow` gagne `specialties`/`links`/`verified`.

## Vue publique (re-skin maquette)

Refonte de `PublicProfile.tsx` au layout maquette. **Nouveau `src/pages/Vitrine.css`** (tokens DA : triplets `hsl(var())`, statuts/marque en `var()`), `Profile.css` n'est plus utilisé par cette page (laissé pour les autres surfaces s'il y en a). Sous-composants focalisés dans `src/components/vitrine/` :

- **`VitrineCover`** : `banner_url` plein-largeur + fondu vers le fond ; fallback dégradé si absent.
- **`VitrineHeader`** : avatar (`avatar_url`, fallback dégradé+initiales), `brand_name` + **badge vérifié** (si `verified`), sous-titre `{craft_type} · {city} ({department})`, chips `specialties`, actions. Actions visiteur connecté non-propriétaire : **Suivre/Suivi** + Partager + QR. Actions propriétaire : contrôles d'édition + Partager + QR + « Intégrer mon calendrier » (existant).
- **`VitrineStats`** : abonnés (count + avatars), compagnons (count + avatars), festivals {année}. Réutilise les données déjà chargées (`followers`/`friends`) ; restyle de `ProfileNetworkStats`.
- **`VitrineGallery`** : grille 3 colonnes des `entity_gallery` (max 6).
- **`VitrineLinks`** : liste des `links` (icône selon `type`, label, host affiché, ouverture nouvel onglet).
- **`VitrineSeason`** (« Où me rencontrer ») : participations `inscrit` scindées à venir / passés (helper pur testé), liste `.fest` maquette. Réutilise la donnée déjà fetchée.
- **Nudge « Ne rate plus ses dates »** : affiché au visiteur connecté non-propriétaire **non-abonné** ; bouton Suivre.
- Footer flw.sh (`FellowshipFooter` restylé).
- Grille 2 colonnes desktop (`1fr 340px`) / empilée < 1080px (maquette).

**Suivre/Suivi** : action `follow`/`unfollow` sur `follows` (`follower_actor = currentActor.id`, `following_actor = entity.actor_id`). Réutiliser une action existante si présente (la page `/suivis` existe), sinon insert/delete. Met à jour le count abonnés en optimiste.

## Édition inline (propriétaire, WYSIWYG)

Quand `isOwner`, chaque section porte une affordance d'édition :
- **Cover & avatar** : bouton « Modifier » → upload. Cover (`banner_url`) et avatar (`avatar_url`) restent dans le bucket **`avatars`** existant — **réutiliser le flux de `Settings.tsx`** (qui upload déjà avatar/bannière là). Le bucket `entity-gallery` est réservé aux pièces de la galerie.
- **Marque / bio / métier** : édition inline (champ ou petite modale), `UPDATE entities`.
- **Specialties** : ajout/suppression de chips (input + `×`), `UPDATE entities.specialties`.
- **Links** : ajouter/éditer/supprimer une ligne (type + label + url, validation), `UPDATE entities.links`.
- **Galerie** : « + Ajouter une pièce » → upload bucket `entity-gallery` + `INSERT entity_gallery` ; supprimer (DELETE + remove storage) ; réordonner (drag ou flèches → met à jour `position`). Max 6.
- **Sections vides** : cachées pour le public ; pour le propriétaire, état d'invitation (« Ajoute tes premières pièces », « Ajoute un lien »).

> Édition = mutations Supabase directes (RLS garantit l'autorisation), puis refetch/maj optimiste de l'état local de la page. Pas de state-management global.

## Build en 4 phases (→ plan)
1. **Migrations + bucket + types** : colonnes, trigger `verified`, table `entity_gallery`, policies, bucket `entity-gallery`, régénération types. Vérif RLS.
2. **Vue publique re-skin (lecture seule)** : `Vitrine.css` + composants, lecture des vraies données, états vides, follow/unfollow, **sans** édition. Shippable (la vitrine est belle et à jour).
3. **Édition inline** : cover/avatar, marque/bio/métier, specialties, links, galerie (upload/suppr/réordon).
4. **Toggle vérifié admin** (petit) : bouton dans l'admin pour basculer `entities.verified`.

## Acté en plus
- **Rebrancher le lien nav « Ma vitrine »** : il pointe aujourd'hui sur `/profil` → le faire pointer vers la vitrine publique du propriétaire **`/{public_slug}`** (fallback `/profil` si l'entité n'a pas encore de slug). Petit ajustement dans `navModel.ts` / le calcul du lien (le `to` de `vitrine` peut devenir dynamique selon l'acteur courant, ou résolu au rendu de la nav). Inclus en Phase 2.

## Hors périmètre
- Refonte des **autres** pages profil (`/profil` `ProfilePage`, Settings) — on ne touche que `PublicProfile` (la vitrine publique `/:slug`).
- Légendes de galerie, liens illimités, « par {personne} », nom de domaine custom — différés.
- Migration paiement / merge en prod (au merge de branche).

## Pièges à vérifier (checklist DA jour/nuit — [[reference_da_daynight_gotchas]])
- Tokens : triplets `hsl(var(--token))`, marque/statuts `var()` brut. Aucun `rgba(61,48,40)` ni `#fff` en dur (sauf texte sur dégradés d'avatars, motif établi).
- Cover : fondu vers `hsl(var(--background))`.
- SVG icônes lucide (pas de blobs).
- Ombres `.light` douces.
- Bucket : **demander avant de créer** (fait — `entity-gallery` validé) — cf. [[feedback_storage_buckets]].
- Tests : RTL ne flush pas en synchrone sur cette stack → on teste les **fonctions pures** (validation/normalisation de links, split saison, ordering galerie), pas le rendu — cf. [[reference_react_test_infra]].

## Vérification
- `pnpm build && pnpm lint && pnpm vitest run` verts.
- RLS : un non-propriétaire ne peut pas écrire `entity_gallery` ni modifier les colonnes d'une autre entité ; `verified` non modifiable par un non-admin (trigger).
- `grep` : zéro `rgba(61, 48, 40` dans `Vitrine.css`.
- Visuel `/:slug` (entité Pro et non-Pro, propriétaire ET visiteur, connecté ET déconnecté), **nuit ET jour** : cover, header+badge+chips, stats, galerie, liens, « Où me rencontrer », nudge Suivre, footer ; édition inline propriétaire ; états vides côté visiteur.
