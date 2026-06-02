# Bilan enrichi + section « Mes bilans » — design

- **Date :** 2026-06-02
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `validé` (maquette approuvée, prêt pour plan d'implémentation)
- **Maquette :** validée en compagnon visuel (`.superpowers/brainstorm/.../bilans-v2.html`)
- **Lié à :** [Cockpit V1](2026-06-02-cockpit-exposant-build-design.md) · décision [0002](../../decisions/0002-cockpit-exposant.md) (rentabilité PAR festival, jamais d'agrégat)

## Objectif

Deux chantiers liés qui transforment le bilan d'une fiche compta en **mémoire du festival**,
et le rendent enfin **consultable** :

1. **Bilan enrichi** : ajouter au bilan une **note libre** et des **photos souvenir privées**.
2. **Section « Mes bilans »** dans le Cockpit : voir ses festivals passés et leurs bilans.

## Décisions de périmètre (cette session)

1. **Par festival uniquement, aucun agrégat** (réaffirme 0002 : un CA/bénéfice cumulé est
   trompeur — autres sources de revenus, ventes hors festival).
2. **Photos seules en V1** (réutilise `compress-image.ts`). **Vidéos → V1.1** (fichiers
   lourds, pas de compression auto, lecteur à gérer).
3. **Bucket privé dédié `bilan-media`** (le bilan est « visible uniquement par toi »).
4. **Champs du bilan** : Revenus/Coûts (existant) · **À améliorer** (`improvements`, gardé) ·
   **Note libre** (`note`, nouveau) · **Photos** (nouveau). On **retire « Points forts »**
   (`wins`) de l'UI — la note libre absorbe les impressions positives. Colonne `wins`
   conservée en base (non destructif), simplement plus lue/écrite.
5. **Placement** : module « Mes bilans » en **colonne 3 du Cockpit, sous « Ta saison »**.

## Réalités data (vérifiées)

- `event_reports` (table existante, RLS `event_reports_owner_only`) : `actor_id`, `event_id`,
  `booth_cost`, `charges`, `revenue` (DECIMAL), `wins TEXT[]`, `improvements TEXT[]`.
- La **note en étoiles** (affluence/organisation/rentabilité) vit dans `reviews`, PAS dans le
  bilan — hors périmètre ici.
- Storage : buckets créés via `INSERT INTO storage.buckets`. Pattern de policy acteur :
  `can_act_as(((storage.foldername(name))[1])::uuid)` (cf. `entity-gallery`). Buckets
  existants tous **publics** ; `bilan-media` sera le **premier privé**.
- `compress-image.ts` + `useEventReport`/`saveEventReport` (`src/hooks/use-reports.ts`) et
  `BilanModal`/`BilanCard` (`src/components/reports/`) existent et sont réutilisés.

## Données

### Migration `event_reports`
```sql
ALTER TABLE event_reports ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE event_reports ADD COLUMN IF NOT EXISTS media_paths TEXT[] NOT NULL DEFAULT '{}';
```
`media_paths` = chemins **dans le bucket** (`{actor_id}/{event_id}/{uuid}.jpg`), pas des URLs
(les URLs signées sont générées à l'affichage et expirent).

### Bucket privé `bilan-media`
```sql
INSERT INTO storage.buckets (id, name, public)
  VALUES ('bilan-media', 'bilan-media', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
```
Policies *owner-only* sur `storage.objects` (modèle acteur, comme `entity-gallery`), pour
SELECT / INSERT / UPDATE / DELETE :
```
bucket_id = 'bilan-media' AND can_act_as(((storage.foldername(name))[1])::uuid)
```
Bucket **privé** → pas de lecture publique : l'affichage passe par `createSignedUrl(path, ttl)`.

## Formulaire de bilan (`BilanModal`)

Champs, dans l'ordre :
1. **Revenus / Coûts** : `revenue`, `booth_cost`, `charges` (existant, inchangé).
2. **À améliorer la prochaine fois** : `improvements` (liste, existant — conservé).
3. **Note libre** : `note` (textarea, nouveau).
4. **Photos souvenir** : upload multi-fichiers images → compression (`compress-image.ts`) →
   upload `bilan-media/{actor_id}/{event_id}/{uuid}.jpg` → push le chemin dans `media_paths`.
   Vignettes avec suppression possible. Mention **🔒 « Privées — visibles uniquement par toi »**.
   Affichage des photos déjà présentes via URLs signées.

« Points forts » (`wins`) : **retiré du formulaire**.

`saveEventReport` upsert inchangé côté mécanique ; il persiste désormais aussi `note` et
`media_paths`.

## Section « Mes bilans » (Cockpit)

- **Source** : participations **passées confirmées** (`status = 'inscrit'`,
  `events.end_date < now`), jointes à leur `event_reports` éventuel (par `event_id`).
- **Tri** : `end_date` décroissant (le plus récent en haut).
- **Ligne bilanée** : vignette affiche + nom + dates/lieu + **CA** + **Bénéfice**
  (`revenue − booth_cost − charges`, vert si ≥ 0 sinon rouge) + extrait de **note** +
  **bande photos** (URLs signées, « +N » au-delà de 3). Clic → ouvre `BilanModal` (édition).
- **Ligne non bilanée** : pointillé + « **+ Remplir le bilan** » → ouvre `BilanModal`.
- **Pas d'agrégat.** Affiche jusqu'à ~5 entrées + « **Tout voir** » (page dédiée = plus tard,
  hors V1 ; le lien peut être inactif/masqué tant que la page n'existe pas).
- **Vide** (aucun festival passé) : module **masqué** (pas de carte vide).

## Architecture (composition)

- **Migration** `supabase/migrations/<ts>_bilan_note_media.sql` : colonnes + bucket + policies.
- **`src/lib/bilan-media.ts`** : helpers `uploadBilanPhoto(file, actorId, eventId)` (compress +
  upload + retourne le path), `signedUrlsFor(paths)` (batch `createSignedUrls`),
  `removeBilanPhoto(path)`. Une responsabilité : la plomberie storage du bilan.
- **`src/hooks/use-reports.ts`** : étendre. Ajouter `useMyReports()` → `Map<event_id,
  EventReport>` (reports complets de l'acteur). `useMyReportedEventIds` reste (le bandeau).
- **`src/lib/cockpit-bilans.ts`** (pur, testé TDD) : `buildPastBilans(participations,
  reportsByEvent, now)` → liste triée d'items `{ participation, report | null, profit | null }`.
- **`BilanModal`** : champs note + photos (et retrait de wins).
- **`src/components/cockpit/MesBilans.tsx`** : le module, monté dans `Cockpit.tsx` (col 3).

## Tests (TDD — fonctions pures)

- `buildPastBilans` : ne garde que les `inscrit` passés ; joint le bon report ; calcule
  `profit = revenue − booth_cost − charges` (null si pas de report) ; tri `end_date` desc ;
  liste vide si aucun passé.
- Le profit et le formatage restent des fonctions pures testables ; l'upload/signed-URL
  (effets) est isolé dans `bilan-media.ts` et vérifié au build + manuellement (contrainte
  `reference_react_test_infra`).

## Explicitement différé (V1.1)

Vidéos souvenir · page dédiée « Tous mes bilans » · partage public d'une photo (la vitrine).

## Risques / points d'attention

- **Premier bucket privé** du projet → bien tester les policies (un acteur ne lit QUE ses
  médias) et l'expiration des URLs signées (TTL raisonnable, ex. 1 h).
- **Multi-entité** : le path est préfixé par l'`actor_id` de l'entité active ; `can_act_as`
  garantit qu'une personne ne voit que les médias des entités qu'elle gère.
- Cohérent avec [[feedback_storage_buckets]] (bucket demandé et justifié) et
  [[reference_da_css_tokens]] (styles sur les vrais tokens).
