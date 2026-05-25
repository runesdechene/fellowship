# Onboarding « Nuit de Festival » — Intégration maquette — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Habiller l'onboarding existant (déjà fonctionnel) avec le chrome de la maquette `onboarding.html` (carte centrée + wordmark + dots stylés + eyebrows + bouton retour + cartes de choix emoji + champs labellisés), et **ajouter les écrans de succès** (festivalier « Bienvenue <prénom> » ; exposant carte d'entité « rattachée à <prénom> ») — le tout sur les tokens DA, **sans toucher à la logique de flux testée**.

**Architecture :** Re-skin de `src/pages/Onboarding.tsx` + nouveau `src/pages/Onboarding.css` (styles maquette portés sur les tokens DA, pattern des `.css` par page). La logique de flux vit dans `src/lib/onboarding.ts` (`slugify`, `deriveDepartment`, `resolveOnboardingFlow`, `resolveUniqueHandle`) + le `handleSubmit`/slug-check du composant : **inchangés**. Les écrans de succès sont gérés par un nouvel état local `submitted` dans le composant (PAS d'ajout de step dans `resolveOnboardingFlow` → les tests Vitest existants restent verts). Les halos `bgfx` sont déjà globaux (montés dans `main.tsx`, donc présents sur `/onboarding`) ; on ne met PAS de photo de fond (pas d'asset ; point ouvert 0001 §10). Le toggle jour/nuit est ajouté discrètement (décision 0001 §9 : toggle partout, y compris onboarding).

**Décisions produit (2026-05-25) :** écrans de succès **ajoutés** ; uploads photo/logo **omis** (texte only, comme aujourd'hui ; upload = Plan 6).

**Tech Stack :** React 19 + TS, Tailwind v4 tokens DA, `.css` par page, Supabase (déjà câblé), Vitest (tests purs existants).

**Référence visuelle :** `docs/decisions/assets/onboarding.html`. **Spec flux :** `docs/superpowers/specs/2026-05-25-onboarding-branche-design.md`.

**Hors périmètre :** upload images, page profil festivalier `/u/<handle>`, sélecteur multi-entités, toute modif de `src/lib/onboarding.ts` ou de la logique d'écriture DB.

---

## File Structure
- **Create** `src/pages/Onboarding.css` — chrome maquette porté sur tokens DA, scopé sous `.onboarding`.
- **Rewrite** `src/pages/Onboarding.tsx` — même logique (états, flow, handleSubmit, slug-check) avec markup re-skinné + état `submitted` + écrans de succès.
- **Untouched** `src/lib/onboarding.ts`, `src/lib/onboarding.test.ts` (logique pure + tests).

---

## Task 1: `Onboarding.css` — port du chrome maquette vers les tokens DA

**Files:**
- Create: `src/pages/Onboarding.css`

> **Source :** `<style>` de `docs/decisions/assets/onboarding.html` (lignes 8-87). Porter les styles, SAUF `:root`, `html/body` global, et les blocs `.avup*` (upload — OMIS) et `.crafts/.craft` (chips non utilisées). Scoper sous `.onboarding`.

**Table de correspondance (appliquer partout) :**
| Maquette | Remplacer par |
|---|---|
| `var(--surface)` | `hsl(var(--card))` |
| `var(--surface2)` | `hsl(var(--secondary))` *(léger inset — déviation mineure assumée : la maquette voulait une surface un peu plus claire, le socle n'a pas ce token ; inset reste lisible)* |
| `var(--text)` | `hsl(var(--foreground))` |
| `var(--muted)` | `hsl(var(--muted-foreground))` |
| `var(--line)` | `hsl(var(--border))` |
| `var(--bg)` | `hsl(var(--background))` |
| `var(--cop)`, `var(--cop-d)` | `var(--copper)`, `var(--copper-d)` |
| `.btn-p { background: linear-gradient(135deg,var(--cop),var(--cop-d)) }` | `background: var(--gradient-primary)` |
| `var(--green)` | `var(--lime)` |
| `var(--amber)` | `var(--amber)` (inchangé) |
| `var(--h)` / `var(--b)` | `var(--font-heading)` / `var(--font-body)` |
| literals `hsl(... / ...)`, hex (`#fff`, `#2a1810`, `#ffd9a8`, entitycard gradients) | inchangés |
| `color-mix(... var(--cop) ...)` | remplacer `var(--cop)` par `var(--copper)` à l'intérieur |

- [ ] **Step 1: Créer `src/pages/Onboarding.css`** en portant ces blocs (scopés `.onboarding`), dans l'ordre maquette :
  - `.onboarding .ob-wrap` (max-width 480px, relative, z-index 1)
  - `.onboarding .ob-logo` + `.ob-logo .mark` (wordmark ✦ + dégradé copper→amber)
  - `.onboarding .ob-card` (surface, bordure, radius 22px, ombre `0 30px 80px rgba(0,0,0,.55)`, min-height 380px, flex column)
  - `.onboarding .ob-back` (+ `:hover`, `svg`) — bouton retour en coin
  - `.onboarding .ob-dots` + `.dot` + `.dot.on` (amber, élargi 22px) + `.dot.done` (lime)
  - `.onboarding .step` (les `.step`/`.step.active`/`@keyframes fade` ne sont pas nécessaires car React monte/démonte — MAIS garder `@keyframes fade` et l'appliquer au conteneur d'étape courant pour le fondu ; voir Task 2). Porter `.eyb` (eyebrow), `.step h2`, `.step .sub`.
  - `.onboarding .choice` + `.cc` (+ `:hover`) + `.cc .cic` (icône emoji) + `.cc .ct b/span` + `.cc .carr`
  - `.onboarding .field` + `label` + `input` (+ `:focus` border amber) + `.hint`, `.row2` (grid 1fr/110px), `.slug-field` + `.pfx` + `input` (texte amber, weight 600)
  - `.onboarding .spacer` (flex:1), `.btn` + `.btn-p` (→ `var(--gradient-primary)`, ombre) + `:hover` + `.btn svg`
  - Succès : `.done-ic` (cercle lime translucide), `.entitycard` + `.eav` (initiales) + `.et b/span`, `.person-line` (+ `b`), `.addhint` (+ `svg`)
  - NE PAS porter : `.ob-bg`/`.ob-bg img/::after` (pas de photo — les halos `bgfx` globaux suffisent), `.avup*`, `.crafts`/`.craft`.

- [ ] **Step 2: Vérifier**
Run: `pnpm exec vite build` → OK. `grep -rEn "hsl\(#|hsl\(hsl\(" dist/assets/*.css` → vide. `grep -n "var(--card)\|var(--secondary)\|var(--foreground)\|var(--muted-foreground)\|var(--border)\|var(--background)" src/pages/Onboarding.css` → chaque occurrence wrappée dans `hsl(...)`. `pnpm lint` clean.

- [ ] **Step 3: Commit**
```bash
git add src/pages/Onboarding.css
git commit -m "feat(onboarding): port maquette chrome to DA tokens (Onboarding.css)"
```

---

## Task 2: `Onboarding.tsx` — re-skin du chrome + bascule du markup (logique inchangée)

**Files:**
- Modify: `src/pages/Onboarding.tsx`

> **RÈGLE ABSOLUE :** ne PAS changer la logique. Conserver à l'identique : les `useState` (`chosenPath`, `stepIndex`, `form`, `slugStatus`, `saving`, `error`, `slugTouched`), `resolveOnboardingFlow`/`flow`/`steps`/`currentStep`/`isLastInputStep`, les deux `useEffect` (pré-remplissage slug + vérif live débouncée), `choose`/`goNext`/`goBack`, et `handleSubmit` (sauf la navigation finale, modifiée en Task 3). On remplace UNIQUEMENT le JSX de présentation et les classes. Les `import` de helpers restent. Remplacer les `Button`/`inputClass` Tailwind par les classes maquette (`.btn.btn-p`, `.field input`, etc.).

- [ ] **Step 1: Restructurer le JSX**
- `import './Onboarding.css'` ; `import { ThemeToggle } from '@/components/theme-toggle'`. Retirer l'import `Button` s'il n'est plus utilisé ; garder `Store, Eye` seulement si on garde des icônes lucide — SINON utiliser les emoji de la maquette (🎪 exposant, 🎟️ festivalier) et retirer l'import lucide.
- Racine : `<div className="onboarding">` (le fond/halo vient du body + bgfx globaux ; ajouter `min-height:100vh; display:flex; align-items:center; justify-content:center; padding` via une règle `.onboarding` dans le CSS Task 1 OU classes Tailwind `min-h-screen flex items-center justify-center p-6`). Placer un `<ThemeToggle />` discret en haut-droite (ex. `<div className="onboarding-toggle">` positionné `fixed top-4 right-4 z-10`, style minimal).
- À l'intérieur : `<div className="ob-wrap">` → `<div className="ob-logo"><span className="mark">✦</span> Fellowship</div>` + `<div className="ob-card">`.
- Dans `.ob-card` :
  - **Bouton retour** `.ob-back` (svg chevron-left) affiché selon la condition de retour ACTUELLE (`currentStep !== 'choice' && (stepIndex > 0 || entities.length === 0)` et pas en succès), `onClick={goBack}`.
  - **Dots** `.ob-dots` : afficher si `currentStep !== 'choice'` et pas en succès. Pour chaque index `i` de `steps` : classe `dot` + `on` si `i === stepIndex`, + `done` si `i < stepIndex`. (Reproduit le style maquette : actif ambre élargi, faits en lime.)
  - **error** : conserver l'affichage de `error` (ex. `<p>` rouge centré, ou réutiliser une classe). 
  - **Étapes** : un conteneur `.step active` (avec l'animation `fade`) par `currentStep`. Porter chaque étape existante au markup maquette :
    - `choice` : `.eyb`="Bienvenue", h2 "Tu viens pour quoi ?", `.sub`, `.choice` avec deux `.cc` (exposant `data`→`choose('exposant')`, emoji 🎪, titre + desc, `.carr` chevron ; festivalier `choose('festivalier')`, emoji 🎟️) + `.addhint` "Tu pourras devenir exposant plus tard…".
    - `name` : `.eyb` = (exposant: "Toi · 1 / N" ; sinon "Festivalier" / "Bienvenue") , h2 = `nameTitle` existant, `.sub` = `nameSub` existant (exposant) ou la sous-phrase festivalier. `.field` label "Prénom" + input (lié à `form.prenom`/`update`). PAS de bloc `.avup`. Bouton `.btn.btn-p` (texte selon `isLastInputStep`/`saving` comme aujourd'hui), `disabled` identique, `onClick={isLastInputStep ? handleSubmit : goNext}`.
    - `postal` (festivalier) : `.eyb`="Festivalier", h2 "Tu es où ?", `.sub`, `.field` label "Code postal" + input + `.hint` "On ne montre jamais ton adresse exacte." Bouton `handleSubmit` (texte/disabled identiques).
    - `brand` : `.eyb`="Ton entité exposant · 2 / 5", h2 "Ta marque", `.field` (PAS d'avup). Bouton `goNext`.
    - `craft` : `.eyb`="…· 3 / 5", h2 "Ton métier ?", `.field` + `.hint` "Champ libre…". Bouton `goNext`.
    - `location` : `.eyb`="…· 4 / 5", h2 "Où es-tu basé ?", `.row2` (Ville | Code postal). Bouton `goNext`.
    - `slug` : `.eyb`="…· 5 / 5", h2 "Ton lien public", `.slug-field` (`.pfx` "flw.sh/" + input amber lié à `form.slug`, `slugTouched.current=true` + `update({slug: slugify(...)})` comme aujourd'hui). Indicateurs `slugStatus` (checking/available/taken) sous le champ (réutiliser un petit `.hint`/texte coloré : available → lime, taken → rouge). Bouton `handleSubmit`, disabled identique.
  - Les eyebrows à compteur "· i / N" : calculer N = nombre d'étapes de saisie du flux exposant (5) ; pour l'étape `name` exposant l'eyebrow = "Toi · 1 / 5". Garder simple : dériver depuis `steps.indexOf(currentStep)` + 1 et `steps.length` côté exposant.
- Le `nameTitle`/`nameSub` existants sont conservés.

- [ ] **Step 2: Vérifier (la logique n'a pas régressé)**
Run: `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm lint`, `pnpm vitest run` (les tests de `onboarding.test.ts` doivent rester verts — on n'a pas touché `onboarding.ts`). Tous GREEN. Confirmer qu'aucun import n'est inutilisé (retirer `Button`/lucide si remplacés).

- [ ] **Step 3: Commit**
```bash
git add src/pages/Onboarding.tsx
git commit -m "feat(onboarding): re-skin wizard chrome to maquette (logic unchanged)"
```

---

## Task 3: Écrans de succès (état `submitted`, sans toucher au flow helper)

**Files:**
- Modify: `src/pages/Onboarding.tsx`

> On ajoute un état local `submitted` + les données nécessaires à la carte d'entité. `handleSubmit` ne navigue plus immédiatement : en cas de succès, il passe `submitted=true` (et mémorise le `case`). L'écran de succès affiche un bouton qui fait la navigation. La logique d'écriture DB (users/RPC/switchActor/refreshProfile) est INCHANGÉE — seul le `navigate('/explorer')` final devient déclenché par le bouton de succès.

- [ ] **Step 1: Ajouter l'état + différer la navigation**
- Ajouter `const [submitted, setSubmitted] = useState(false)`.
- Dans `handleSubmit`, conserver TOUTES les écritures (users update / festivalier update / RPC create_owned_entity / switchActor) et `await refreshProfile()`. REMPLACER la ligne `navigate('/explorer', { replace: true })` par `setSubmitted(true)` (laisser `saving` repasser à false, ou le gérer pour que le bouton final soit actif). Garder la gestion d'erreur identique (collision slug → retour étape slug ; catch → message + saving=false ; pas de navigation).
- Les infos d'affichage de la carte exposant viennent du `form` (brand, craft, city) et `form.prenom` ; les initiales = 2 premières lettres significatives de `form.brand` en majuscules (helper inline simple, ex. `form.brand.trim().slice(0,2).toUpperCase()` ou initiales des 2 premiers mots).

- [ ] **Step 2: Rendu de l'écran de succès**
Quand `submitted === true`, rendre (à la place des étapes, dans `.ob-card`, sans dots ni back) :
- **Festivalier OU completion** (`flow.case !== 'exposant'`) : `.done-ic` (✓), h2 `Bienvenue, {form.prenom} !`, `.sub` "Ton espace est prêt. Découvre les festivals et suis tes créateurs préférés.", `.spacer`, bouton `.btn.btn-p` "Explorer les festivals" → `onClick={() => navigate('/explorer', { replace: true })}`.
- **Exposant** (`flow.case === 'exposant'`) : `.done-ic` (✓), h2 "Ta vitrine est prête !", `.sub` "Voici ton entité. Tu pourras candidater, gérer ta saison et la faire vivre.", `.entitycard` (`.eav` initiales, `.et` → `<b>{form.brand}</b><span>Exposant · {form.craft} · {form.city}</span>`), `.person-line` `rattachée à <b>{form.prenom}</b> · ton compte`, `.spacer`, bouton `.btn.btn-p` "Entrer dans Fellowship" → `navigate('/explorer', { replace: true })`, puis `.addhint` "Tu pourras ajouter d'autres entités via le sélecteur.".
- Masquer dots + back + eyebrow quand `submitted`.

- [ ] **Step 3: Vérifier**
Run: `pnpm build && pnpm lint && pnpm vitest run` → tous GREEN. tsc clean.

- [ ] **Step 4: Commit**
```bash
git add src/pages/Onboarding.tsx
git commit -m "feat(onboarding): success screens (welcome / entity card) via submitted state"
```

---

## Task 4: Vérification + bump version

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Test manuel (dev server actif)**
`/onboarding` (se connecter d'abord en magic link, ou simuler `needsOnboarding`). Vérifier les 2 parcours :
- **Festivalier** : choix → prénom → CP → écran « Bienvenue <prénom> » → bouton → `/explorer`.
- **Exposant** : choix → prénom (eyebrow "Toi · 1/5") → marque → métier → ville/CP → slug (vérif live « disponible »/« déjà pris », input amber) → carte d'entité « rattachée à <prénom> » → bouton → `/explorer`. Vérifier qu'une entité est bien créée et qu'on entre « en tant que » la marque (sélecteur).
- Dots stylés (ambre actif / lime faits), bouton retour en coin, halos derrière, toggle nuit/jour présent et fonctionnel. Lisibilité nuit ET jour.
- Cas migré (exposant sans display_name) : une seule étape prénom → succès → /explorer (pas de 2e entité créée).

- [ ] **Step 2: Bump version (patch)** dans `package.json`.

- [ ] **Step 3: Gates finales**
Run: `pnpm build && pnpm lint && pnpm vitest run` → tout vert (incl. `onboarding.test.ts` intact).

- [ ] **Step 4: Commit (NE PAS push automatiquement au-delà de la branche ; pousser la branche est OK car déjà trackée)**
```bash
git add -A
git commit -m "chore(onboarding): bump version after onboarding DA integration"
git push
```

---

## Self-Review
**Couverture maquette / décisions :**
- Chrome (carte/logo/dots/eyebrow/back/choice emoji/champs/slug amber) → Task 1+2. ✓
- **Écrans de succès** (welcome festivalier + carte entité exposant « rattachée à <prénom> ») → Task 3 (décision : ajoutés). ✓
- **Uploads omis** (pas de `.avup`) → décision respectée. ✓
- Toggle jour/nuit présent (0001 §9) → Task 2. ✓
- Halos via `bgfx` global, pas de photo (point ouvert imagerie) → assumé. ✓

**Préservation logique (risque #1) :** `src/lib/onboarding.ts` et ses tests **non touchés** ; `resolveOnboardingFlow`/`handleSubmit`/slug-check conservés ; succès géré par état `submitted` séparé (pas de step ajouté au helper). Vitest doit rester à l'identique.

**Régression tokens (leçon socle/landing) :** Task 1 impose la table de correspondance `hsl(var())` + check `dist` `hsl(#` vide. Déviation mineure assumée : `--surface2`→`hsl(var(--secondary))` (inset au lieu de raised).

**Placeholders :** SQL n/a ; le port CSS est spécifié par fichier-source + table + liste de blocs ; le TSX est spécifié étape par étape avec préservation explicite de la logique.

**Hors périmètre confirmé :** upload images, `/u/<handle>`, multi-entités, toute modif de la couche logique/DB.
