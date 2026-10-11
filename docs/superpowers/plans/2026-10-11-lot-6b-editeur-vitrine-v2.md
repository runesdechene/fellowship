# Lot 6b — L'éditeur de la vitrine, en place — plan d'exécution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** le propriétaire modifie sa vitrine sur la page même — bannière (changée, recadrée en la
glissant), logo, nom, métier, ville, présentation, trois liens, adresse — et publie d'un clic.

**Architecture:** un brouillon local (`VitrineDraft`) né de la vitrine chargée ; des composants
« éditables » qui le modifient en place ; à « Enregistrer », les images réduites au navigateur
partent dans `entity-gallery`, puis un seul `update` de `entities`. Logique pure dans
`lib/vitrine-edit.ts`, testée.

**Tech Stack:** React 19, React Router 7 (`BrowserRouter`), supabase-js (base + stockage), canevas
du navigateur, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-11-lot-6b-editeur-vitrine-v2-design.md`

## Global Constraints

- Aucune migration : `entities_update_member` (`can_act_as`) autorise l'écriture ; plan, Pro offert, Ambassadeur, Certifié sont protégés par déclencheur.
- Limites : nom 1–60, métier ≤ 60, ville ≤ 60, département 2–3 caractères, présentation ≤ 255 (compteur dès 200), 3 liens au plus, adresse `^[a-z0-9]+(-[a-z0-9]+)*$` de 3 à 40, jamais `communaute explorer calendrier bilans pro reglages evenement connexion v2 admin api`.
- Liens : `{ type: 'website' | 'instagram' | 'shop', url, label }`, `https://` ajouté s'il manque.
- Images : bannière ≤ 2 000 px de large, logo ≤ 512 px, WebP (repli JPEG), refus au-delà de 15 Mo avant réduction ou si ce n'est pas une image ; chemin `{actor_id}/{cover|avatar}/{horodatage}.webp` dans `entity-gallery` ; rien n'est envoyé avant « Enregistrer ».
- Ordinateur seulement (au-delà de 760 px).
- Copie de la maquette `2231:2` : « Modifier la vitrine », « Mode édition », « Clique sur ce que tu veux changer », « Annuler », « Enregistrer », « Changer la bannière », « Glisser pour recadrer », « Ajouter un lien », « Les anciens liens et QR codes ne marcheront plus. », « Abandonner tes modifications ? », « Vitrine mise à jour », « Cette adresse est déjà prise », « Tes modifications n’ont pas pu être enregistrées. », « Cette image ne peut pas être utilisée. ».
- Lint V2 strict, CSS en trois couches, animations sur les jetons, `prefers-reduced-motion`.
- Vérification dans le navigateur : toute écriture d'essai est remise à l'identique ; mise en ligne avec le GO d'Uriel.

## Review Focus

- **Annuler après des changements** : rien n'est écrit en base ni dans le stockage (Task 4, navigateur).
- **Une adresse déjà prise** : rien n'est publié, la ligne de l'adresse se rouvre avec le message (Task 4, navigateur ; Task 1, test de la détection `23505`).
- **Une adresse qui vaut une page de l'application** (`communaute`) : refusée avant l'envoi (Task 1, test).
- **Une image énorme ou un fichier qui n'est pas une image** : refus clair, la vitrine reste intacte (Task 2, test de `fitWithin` ; Task 4, navigateur).
- **Un autre compte que le propriétaire** : ni bouton, ni mode édition (Task 4, navigateur en visiteur).

---

### Task 1: `lib/vitrine-edit.ts` — le brouillon et ses règles

**Files:** Create `apps/web-v2/src/lib/vitrine-edit.ts`, `vitrine-edit.test.ts` ; Modify `lib/README.md`.

**Interfaces — Produces:**
- `type LinkType = 'website' | 'instagram' | 'shop'` ; `interface VitrineLink { type: LinkType; url: string; label: string }`
- `interface VitrineDraft { name: string; craft: string; city: string; department: string; bio: string; links: VitrineLink[]; slug: string; bannerPosition: number }`
- `cleanSlug(raw: string): string` — minuscules, accents retirés (`normalize('NFD')`), espaces et `_` en tirets, autres caractères retirés, tirets répétés réduits, bords sans tiret.
- `slugProblem(slug: string): string | null` — « Au moins 3 caractères », « 40 caractères au plus », « Cette adresse est réservée », « Lettres, chiffres et tirets seulement ».
- `normalizeUrl(raw: string): string` — `https://` devant si aucun schéma ; espaces retirés.
- `linkType(url: string): LinkType` — `instagram.com` → `instagram` ; `etsy.`, `sumup`, `shopify`, `myshopify`, `boutique`, `shop` dans l'hôte → `shop` ; sinon `website`.
- `linkLabel(link: VitrineLink): string` — Instagram : `@compte` ; sinon l'hôte sans `www.` (+ chemin s'il y en a un).
- `fieldProblem(draft: VitrineDraft): string | null` — nom vide ou > 60, métier/ville > 60, département hors 2–3, présentation > 255.
- `changedColumns(before: VitrineDraft, after: VitrineDraft): Record<string, unknown>` — seulement les colonnes changées : `brand_name`, `craft_type`, `city`, `department`, `bio` (vide → `null`), `links`, `public_slug`, `banner_position`.
- `bannerPositionFrom(startPosition: number, dy: number, travel: number): number` — glisser vers le bas montre le haut de l'image : `start - (dy / travel) * 100`, borné à [0, 100], arrondi.
- `isSlugTaken(error: { code?: string; message?: string } | null): boolean` — `code === '23505'` et message citant `public_slug`.

- [ ] **Step 1: les tests** — un bloc par fonction, au minimum : `cleanSlug('Atelier Corne & Cuir')` → `atelier-corne-cuir` ; `cleanSlug(' --Éla--  ')` → `ela` ; `slugProblem('ab')`, `slugProblem('a'.repeat(41))`, `slugProblem('communaute')`, `slugProblem('a_b')` → les messages ; `slugProblem('runes-de-chene')` → `null` ; `normalizeUrl('runesdechene.com')` → `https://runesdechene.com` ; `normalizeUrl('http://x.fr')` inchangé ; `linkType` sur `https://instagram.com/x`, `https://www.etsy.com/shop/x`, `https://la-bete.sumupstore.com`, `https://runesdechene.com` ; `linkLabel` Instagram → `@x` ; `changedColumns` sans changement → `{}`, nom changé → `{ brand_name }`, présentation vidée → `{ bio: null }` ; `bannerPositionFrom(50, 40, 200)` → `30`, bornes 0 et 100 ; `isSlugTaken({ code: '23505', message: '…entities_public_slug_key…' })` → `true`, autre code → `false`.
- [ ] **Step 2:** `pnpm --filter web-v2 exec vitest run src/lib/vitrine-edit.test.ts` → FAIL (module absent).
- [ ] **Step 3:** écrire le module (fonctions pures, aucune dépendance).
- [ ] **Step 4:** les tests passent ; suite entière verte.
- [ ] **Step 5:** commit `feat(v2): le brouillon de la vitrine et ses règles`.

### Task 2: `lib/image-resize.ts` — réduire une image au navigateur

**Files:** Create `lib/image-resize.ts`, `image-resize.test.ts`.

**Interfaces — Produces:**
- `fitWithin(width: number, height: number, max: number): { width: number; height: number }` — garde la proportion, n'agrandit jamais.
- `imageProblem(file: File): string | null` — pas `image/*`, ou > 15 Mo → « Cette image ne peut pas être utilisée. ».
- `resizeImage(file: File, maxWidth: number): Promise<Blob>` — `createImageBitmap` → canevas à `fitWithin` → `toBlob('image/webp', 0.86)`, repli `image/jpeg` si le WebP n'est pas produit.

- [ ] Tests de `fitWithin` (plus petit : inchangé ; plus large : réduit en gardant le ratio ; portrait) et d'`imageProblem` (type, taille) ; RED, code, GREEN. `resizeImage` (canevas, absent de jsdom) se vérifie dans le navigateur (Task 4).
- [ ] Commit `feat(v2): réduire une image avant de l'envoyer`.

### Task 3: La vitrine lit ses liens et sait se relire

**Files:** Modify `features/vitrine/useVitrine.ts` (champs `links`, `city`, `department` ; `reload()`), `lib/vitrine.ts` (+ test), `VitrineHead.tsx` (affiche les liens).

**Interfaces — Produces:** `Vitrine` gagne `links: VitrineLink[]`, `city: string | null`, `department: string | null` ; `useVitrine` rend `reload(): void` ; `lib/vitrine.ts` : `vitrineLinks(links: unknown, website: string | null): VitrineLink[]` — lit `entities.links` (objets valides seulement, 3 au plus) ; s'il est vide, la colonne `website` en un lien `website`.

- [ ] Test `vitrineLinks` (liens valides, mal formés ignorés, repli sur `website`, rien) ; RED → GREEN.
- [ ] `VitrineHead` : à la place du seul site, la liste des liens, chacun avec son icône (`Globe`, `Instagram`, `ShoppingBag` de lucide) et `linkLabel`.
- [ ] Commit `feat(v2): la vitrine montre ses liens`.

### Task 4: Le mode édition

**Files:** Create `features/vitrine/useVitrineEdit.ts`, `EditBar.tsx`, `EditableText.tsx`, `EditableBanner.tsx`, `EditableLogo.tsx`, `EditableLinks.tsx`, `EditableAddress.tsx`, `VitrineEditor.tsx`, `styles/3-components/vitrine-edit.css` ; Modify `VitrinePage.tsx`, `VitrineHead.tsx` (bouton du propriétaire), `2-semantic.css`, `index.css`, `features/vitrine/README.md`.

**Interfaces:**
- `useVitrineEdit(vitrine: Vitrine, onSaved: (slug: string) => void)` rend `{ draft, set(patch: Partial<VitrineDraft>), banner: PendingImage | null, logo: PendingImage | null, pickBanner(file), pickLogo(file), dirty: boolean, problem: string | null, addressProblem: string | null, saving: boolean, failed: boolean, save(): Promise<boolean>, reset(): void }` où `PendingImage = { file: File; preview: string }` (URL locale, révoquée à l'abandon).
- `save()` : `fieldProblem` / `slugProblem` d'abord (rien n'est envoyé s'il y a un problème) → images (`resizeImage`, `upload` dans `entity-gallery`, `getPublicUrl`) → `update` de `entities` avec `changedColumns` + `avatar_url` / `banner_url` → `isSlugTaken` → `addressProblem = 'Cette adresse est déjà prise'` ; autre erreur → `failed` ; succès → `onSaved(nouvelle adresse)`.

- [ ] **`VitrinePage`** : état `editing`. Le bouton du propriétaire « Modifier la vitrine » (dans `VitrineHead`, à la place du lien vers la V1) l'ouvre ; sous 760 px il n'apparaît pas. En édition : `<EditBar>` + `<VitrineEditor>` au lieu de `<VitrineHead>`, classe `vitrine--editing` (atténue escales, tampons, pied). `onSaved` : `reloadIdentity()`, `reload()`, `navigate('/' + slug, { replace: true })` si l'adresse a changé, puis « Vitrine mise à jour » quelques secondes.
- [ ] **`EditBar`** : « Mode édition · Clique sur ce que tu veux changer », « Annuler » (si `dirty`, `window.confirm('Abandonner tes modifications ?')`), « Enregistrer » (désactivé pendant `saving`), message d'erreur. Glisse du haut (`@starting-style`).
- [ ] **`EditableText`** : un `<input>` ou `<textarea>` stylé comme le texte qu'il remplace (classe passée), cadre pointillé au repos, dégradé du logo + halo au focus ; compteur pour la présentation dès 200.
- [ ] **`EditableBanner`** : l'image en `--banner-y` ; pastilles « Changer la bannière » (input fichier caché) et « Glisser pour recadrer » ; `pointerdown` / `pointermove` / `pointerup` avec `setPointerCapture`, `bannerPositionFrom` ; curseur « grab » / « grabbing ».
- [ ] **`EditableLogo`** : pastille appareil photo ; aperçu immédiat.
- [ ] **`EditableLinks`** : une ligne par lien (icône, champ, ×), « + Ajouter un lien » sous trois ; `normalizeUrl` et `linkType` à la sortie du champ.
- [ ] **`EditableAddress`** : ligne « flw.sh/ » + champ ; `cleanSlug` à la frappe ; avertissement visible dès que l'adresse diffère de l'actuelle ; `addressProblem` dessous.
- [ ] **Quitter avec des changements** : `beforeunload` pendant `dirty` ; un écouteur de clic en capture sur les liens (`a[href]`) de la page demande la même confirmation. **Arbitrage** : le bouton retour du navigateur n'est pas intercepté — `BrowserRouter` n'offre pas `useBlocker` (règle « vérifier qu'une option s'applique à NOTRE configuration ») ; coût : une modification perdue au retour, sans avertissement.
- [ ] **CSS** `vitrine-edit.css` : cadres pointillés (`--vitrine-edit-dash`), sélection (`--brand-gradient` en bordure via `border-image` ou fond double, halo `--vitrine-edit-halo`), barre, pastilles de la bannière, atténuation, transitions sur les jetons, `prefers-reduced-motion`.
- [ ] **Vérifier** : `lint`, `vitest`, `build` verts ; dans le navigateur (local, base réelle, compte d'Uriel) : bascule animée ; chaque champ modifié puis **Annuler** (la base n'a pas bougé) ; une modification de présentation **Enregistrer**, relue, puis **remise à l'identique** ; la bannière recadrée puis remise ; l'adresse `communaute` refusée ; une adresse prise (celle d'une autre enseigne) refusée sans rien publier ; en visiteur (autre vitrine), aucun bouton.
- [ ] Commit `feat(v2): modifier sa vitrine en place`.

### Task 5: Relecture, version, mise en ligne, docs

- [ ] Relecture fraîche (opus) avec la Review Focus ; correctifs Critical / Important.
- [ ] `package.json` → `2.30.0` ; GO d'Uriel → build et déploiement de la V2 (`.claude/rules/deploiement.md`) ; vérification sur `flw.sh/v2/runesdechene`.
- [ ] Docs : plan directeur (lot 6 : éditeur ☑), `docs/v2/maquettes-2027.md` (`2231:2` validé, intégré), `_État.md`. Push.
