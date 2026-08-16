# Témoignages : gestion admin + rendu marquee

**Date :** 2026-06-25
**Statut :** Design validé, prêt pour plan d'implémentation

## Problème

Les témoignages de la Landing vivent dans un fichier TS statique
(`src/data/testimonials.ts`) avec 6 placeholders inventés. Uriel veut :

1. **Les gérer depuis l'admin** (ajouter / éditer / retirer) sans toucher au code.
2. **Changer le rendu** : passer de la grille 3 colonnes à **une seule ligne qui
   défile horizontalement avec un fondu sur les bords**, comme le marquee des tags
   d'événements déjà présent sur la Landing.

## Décisions (validées en brainstorming)

| Sujet | Décision |
|---|---|
| Source de données | Table Supabase `testimonials` (remplace le fichier TS) |
| Seed initial | **Table vide.** Aucun placeholder migré. |
| Avatar | **Upload** vers un **nouveau bucket public `testimonials`** |
| Section vide (0 actif) | **Masquée entièrement** sur la Landing |
| Lecture Landing | Anonyme (RLS lecture publique des actifs) |
| Écriture | Admin uniquement (même prédicat que les policies de `tags`) |
| Rendu | Marquee une ligne (défilement auto + fondu bords + pause survol) |

## Modèle de données

### Table `public.testimonials`

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, `default gen_random_uuid()` | |
| `name` | `text not null` | Prénom (ou prénom + initiale) |
| `craft` | `text not null` | Phrase qui décrit la personne. Ex: « Céramiste — Provence » |
| `quote` | `text not null` | Paragraphe mélioratif (1-2 phrases, gain concret) |
| `avatar_url` | `text null` | URL publique Storage. `null` → fallback initiales |
| `entity_slug` | `text null` | Optionnel : slug vitrine Fellowship pour linker la carte |
| `is_active` | `boolean not null default true` | Décoché → caché de la Landing, gardé en base |
| `sort_order` | `int not null default 0` | Ordre d'affichage croissant |
| `created_at` | `timestamptz not null default now()` | |

### RLS

- **SELECT public** : `using (is_active = true)` pour les rôles `anon` + `authenticated`.
  La Landing lit en anonyme, ne doit voir que les actifs.
- **ALL admin** : `using (<prédicat admin existant>) with check (<prédicat admin existant>)`.
  Réutiliser exactement le prédicat d'admin des policies de la table `tags`
  (à confirmer en implémentation : helper `is_admin()` ou check `users.role = 'admin'`).
  L'admin doit voir et écrire **tous** les témoignages, actifs ou non.

### Bucket Storage `testimonials`

- Nouveau bucket **public** (lecture anonyme, la Landing affiche les images sans auth).
- Upload réservé aux admins (policy storage : insert/update/delete si admin).
- Convention de chemin : `testimonials/<timestamp>.<ext>` (pas d'actor_id, ce ne sont
  pas des avatars utilisateurs). Mirroir du pattern `Settings.tsx` :
  `upload(path, file, { upsert:true })` puis `getPublicUrl(path)`.

## Architecture front

### Hook `useAdminTestimonials` (`src/hooks/use-admin.ts`)

Calqué sur `useAdminTags`. Expose :
`{ testimonials, loading, refetch, createTestimonial, updateTestimonial, deleteTestimonial }`.

- `fetch` : `from('testimonials').select('*').order('sort_order')` (tous, actifs ou non).
- `create` : insert, `sort_order = testimonials.length + 1`.
- `update(id, partial)` : update partiel.
- `delete(id)` : delete dur.
- Helper `uploadTestimonialAvatar(file): Promise<string>` : upload bucket + retourne l'URL
  publique (réutilisable par le composant admin).

### Type

Ajouter `Testimonial` aux types DB (ou réutiliser/migrer l'interface existante de
`src/data/testimonials.ts`). Si les nouveaux champs (`id`, `is_active`, `sort_order`)
font que la RPC/table n'est pas encore typée, caster `as any` selon le précédent projet.

### Composant `AdminTestimonials` (`src/components/admin/AdminTestimonials.tsx`)

Copie structurelle de `AdminTags.tsx` :
- Bouton « Nouveau témoignage » → formulaire (name, craft, quote, entity_slug optionnel,
  upload avatar avec aperçu, toggle actif).
- Liste des témoignages (carte glass) avec édition inline + suppression (confirm).
- Aperçu de la carte témoignage telle qu'elle apparaîtra (réutiliser le markup
  `.testimonial`).
- Upload avatar : `<input type=file>` masqué + bouton, état `uploading`, aperçu de l'image.
- Réordonnancement : champ `sort_order` éditable (simple), pas de drag&drop en v1 (YAGNI).

### Câblage admin

- `AdminLayout.tsx` : ajouter l'onglet `{ to:'/admin/testimonials', icon: <icône>, label:'Témoignages' }`
  (icône `lucide-react`, ex: `Quote` ou `MessageSquareQuote`).
- `App.tsx` : `lazy` import + `<Route path="testimonials" .../>` dans le bloc admin.

### Landing : lecture + rendu marquee

**Lecture** — nouveau hook `useTestimonials` (ou étendre `use-landing-stats`) :
`from('testimonials').select('*').eq('is_active', true).order('sort_order')`.
Lecture anonyme. Retourne `{ testimonials, loading }`.

**Rendu** — remplacer la grille par un marquee une ligne :
- Si `loading` → ne rien rendre (ou skeleton léger).
- Si `testimonials.length === 0` → **ne pas rendre la section du tout** (return null
  pour ce bloc). Section masquée si vide.
- Sinon : conteneur `.t-marquee` (overflow hidden + `mask: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)`),
  piste `.t-mtrack` (flex, `width:max-content`, `animation: scrollx <durée> linear infinite`),
  **liste dupliquée ×2** pour la boucle sans couture (comme `.mtrack` des tags).
- Pause au survol (`:hover .t-mtrack { animation-play-state: paused }`).
- `prefers-reduced-motion: reduce` → animation en pause (a11y).
- Chaque carte garde le markup `.testimonial` existant, **largeur fixe** (ex. `min/max-width
  320–360px`) pour une ligne homogène. Carte wrappée dans `<Link to={/${entity_slug}}>`
  si `entity_slug` présent.
- Réutiliser la durée proportionnelle au nombre de cartes (le translateX(-50%) suppose
  que la 2nde moitié duplique la 1re — durée ≈ `n * facteur`).

**CSS** : nouveau bloc `.t-marquee / .t-mtrack` dans `Landing.css`, jumeau de
`.marquee / .mtrack`. Conserver les styles `.testimonial*` existants (déjà DA).

## Nettoyage

- Supprimer `src/data/testimonials.ts` une fois la lecture DB en place (plus de source TS).
- Retirer l'import et l'usage de `testimonials` statique dans `Landing.tsx`.
- La classe de section reste `block v exposant testimonials` (correctif de visibilité déjà
  en place) — mais le rendu interne du bloc devient conditionnel (null si vide).

## Edge cases

- **1–2 témoignages seulement** : la piste dupliquée ×2 peut ne pas remplir le viewport →
  léger « vide » avant la reprise de boucle. Acceptable en v1 ; si gênant, dupliquer
  davantage ou centrer en statique sous un seuil. À noter, pas à sur-ingénierer.
- **Avatar manquant** : fallback initiales (déjà géré par le markup `.testimonial`).
- **entity_slug invalide** : lien 404 → l'admin est responsable de la saisie ; pas de
  validation cross-table en v1.

## Hors scope (YAGNI)

- Drag & drop de réordonnancement (champ `sort_order` numérique suffit).
- Recadrage / compression d'image à l'upload.
- Modération / workflow de validation.
- Internationalisation.

## Critères de succès

1. Depuis `/admin/testimonials`, Uriel ajoute un témoignage (avec photo uploadée),
   l'édite, le désactive, le supprime — sans toucher au code.
2. La Landing (anonyme) affiche les témoignages actifs en **une ligne qui défile avec
   fondu sur les bords**, pause au survol.
3. Table vide → la section n'apparaît pas du tout sur la Landing.
4. `pnpm build` vert, RLS testée (un anon ne lit que les actifs, ne peut pas écrire).
