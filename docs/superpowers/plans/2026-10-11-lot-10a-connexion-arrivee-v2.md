# Lot 10a — La connexion et l'arrivée d'un exposant (V2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à la V2 sa porte d'entrée : une connexion qui crée aussi les comptes, une arrivée en 5 étapes qui crée l'enseigne, et « Créer un compte exposant ».

**Architecture:** Les règles (étapes selon le cas, validité, département, arrondi, initiales, chiffres du code) vivent dans `lib/welcome.ts`, pur et testé. La connexion (`pages/Login.tsx`) devient deux écrans sur la maquette, avec `CodeInput` et le mur `LoginWall`. L'arrivée vit dans `features/welcome/` ; un garde dans `App.tsx` y envoie tout compte sans prénom. L'écriture finale réutilise ce qui existe : `users.update`, la fonction `create_owned_entity`, `attribute_referral`.

**Tech Stack:** React 19, React Router 7 (`BrowserRouter`), supabase-js, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-11-lot-10a-connexion-arrivee-v2-design.md`

## Global Constraints

- Maquettes qui font foi : `2100:2`, `2100:38` (connexion), `2102:72` (étape 1 marque), `2244:2` (étape 2 prénom), `2244:53` (étape 5 adresse). Étapes 3-4 sur le gabarit de l'étape 1.
- Aucune valeur en dur dans `styles/3-components/` ; aucun style dans les `.tsx` (sauf variables `'--nom'`). Jetons dans `2-semantic.css`. Mouvements : `--duration-fast`, `--duration-medium`, `--ease-out` ; `prefers-reduced-motion` respecté.
- En-tête `QUOI / POURQUOI / (ATTENTION)` sur chaque fichier ; `README.md` par dossier.
- `pnpm --filter web-v2 lint` (400 lignes max par fichier, pas de `any`/`!`, pas de promesse jetée dans un `onClick`) avant chaque commit.
- Toute adresse publique passe par `import.meta.env.BASE_URL`.
- Une lecture ratée ne passe jamais pour un vide (le mur sans chiffres, jamais « 0 »).
- Règles d'adresse : celles de `lib/vitrine-edit.ts` (`cleanSlug`, `slugProblem`, `isSlugTaken`) — réutilisées, jamais recopiées.
- Textes exacts : « Bienvenue sur Fellowship », « Recevoir mon code », « Nouveau ? Le même e-mail crée ton compte en quelques secondes. », « Changer d'e-mail », « Ton code », « Pas reçu ? Regarde dans tes indésirables, ou renvoie un code dans {N} s », « Le réseau qui fait tourner les festivals », « Ton enseigne · étape N sur 5 », « Toi · étape 2 sur 5 », « Comment s'appelle ta marque ? », « Et toi, qui tiens le stand ? », « Que fabriques-tu ? », « Où est ton atelier ? », « Ton adresse sur Fellowship », « Créer ma vitrine », « ✓ Libre — tu pourras la changer plus tard ».
- La base est la production : aucun essai sur un compte réel ; le compte de test est jetable et supprimé par `delete-account`.
- Avant tout commit : `git checkout -- graphify-out`. Commits en français, Conventional Commits, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Un code collé avec des espaces ou des tirets** (« 482 913 », « 482-913 ») : les six cases se remplissent, le code part.
2. **Un rechargement au milieu de l'arrivée** : on retombe sur la même étape avec ses réponses, jamais sur l'étape 1 vide.
3. **L'adresse prise entre la vérification et « Créer ma vitrine »** : retour à l'étape 5 avec « Déjà prise », la marque et le reste intacts.
4. **Un compte qui a déjà une enseigne mais pas de prénom** : seul l'écran du prénom, jamais une seconde enseigne créée.
5. **Le garde qui boucle** : `/bienvenue` ne doit jamais se rediriger vers lui-même, et un compte qui a un prénom n'y est jamais envoyé.

---

### Task 1: Les règles de l'arrivée (`lib/welcome.ts`)

**Files:**
- Create: `apps/web-v2/src/lib/welcome.ts`, `apps/web-v2/src/lib/welcome.test.ts`
- Modify: `apps/web-v2/src/lib/README.md`

**Interfaces:**
- Consumes: `cleanSlug`, `slugProblem` (`lib/vitrine-edit.ts`).
- Produces:
  - `type WelcomeStep = 'brand' | 'firstName' | 'craft' | 'place' | 'address'`
  - `type WelcomeKind = 'new' | 'nameOnly' | 'newEntity'`
  - `welcomeSteps(kind: WelcomeKind): WelcomeStep[]`
  - `interface WelcomeDraft { brand: string; firstName: string; craft: string; city: string; postalCode: string; slug: string; slugTouched: boolean; referral: string }`
  - `EMPTY_DRAFT: WelcomeDraft`
  - `stepProblem(step: WelcomeStep, draft: WelcomeDraft): string | null`
  - `slugFor(draft: WelcomeDraft): string` — l'adresse tapée, ou celle tirée de la marque tant qu'on ne l'a pas touchée.
  - `departmentOf(postalCode: string): string | null`
  - `wallCount(n: number): number`
  - `initialsOf(name: string): string`
  - `codeDigits(text: string): string` — les chiffres d'un texte collé, 6 au plus.

- [ ] **Step 1: Tests (RED)**

```ts
/**
 * QUOI     — tests des règles de l'arrivée : les étapes selon le cas, la validité de chaque étape,
 *            l'adresse tirée de la marque, le département, l'arrondi du mur, les initiales, le code.
 * POURQUOI — lot 10a : une enseigne mal formée ou une seconde enseigne créée par erreur ne se
 *            rattrapent pas ; un chiffre du mur faux se voit dès la porte.
 */
import { describe, expect, test } from 'vitest'
import {
  codeDigits,
  departmentOf,
  EMPTY_DRAFT,
  initialsOf,
  slugFor,
  stepProblem,
  wallCount,
  welcomeSteps,
} from './welcome'

describe('welcomeSteps', () => {
  test('un nouveau compte : la marque, puis le prénom, le métier, la ville, l’adresse', () => {
    expect(welcomeSteps('new')).toEqual(['brand', 'firstName', 'craft', 'place', 'address'])
  })
  test('une enseigne existe déjà : le prénom seul', () => {
    expect(welcomeSteps('nameOnly')).toEqual(['firstName'])
  })
  test('créer un compte exposant : tout sauf le prénom', () => {
    expect(welcomeSteps('newEntity')).toEqual(['brand', 'craft', 'place', 'address'])
  })
})

describe('stepProblem', () => {
  const draft = { ...EMPTY_DRAFT, brand: 'Atelier Sauvage', firstName: 'Uriel' }
  test('la marque et le prénom sont obligatoires, 60 caractères au plus', () => {
    expect(stepProblem('brand', { ...draft, brand: '  ' })).toBe('Le nom de ta marque')
    expect(stepProblem('brand', { ...draft, brand: 'a'.repeat(61) })).toBe('60 caractères au plus')
    expect(stepProblem('firstName', { ...draft, firstName: '' })).toBe('Ton prénom')
    expect(stepProblem('brand', draft)).toBeNull()
  })
  test('le métier est facultatif', () => {
    expect(stepProblem('craft', draft)).toBeNull()
    expect(stepProblem('craft', { ...draft, craft: 'a'.repeat(61) })).toBe('60 caractères au plus')
  })
  test('le code postal : cinq chiffres ou rien', () => {
    expect(stepProblem('place', { ...draft, postalCode: '6300' })).toBe('Cinq chiffres')
    expect(stepProblem('place', { ...draft, postalCode: '63000' })).toBeNull()
    expect(stepProblem('place', draft)).toBeNull()
  })
  test('l’adresse suit les règles de la vitrine', () => {
    expect(stepProblem('address', { ...draft, slug: 'ab', slugTouched: true })).toBe(
      'Au moins 3 caractères',
    )
    expect(stepProblem('address', draft)).toBeNull()
  })
})

describe('slugFor', () => {
  test('tirée de la marque tant qu’on ne l’a pas touchée, sans tiret final', () => {
    expect(slugFor({ ...EMPTY_DRAFT, brand: 'Atelier Corne & Cuir ' })).toBe('atelier-corne-cuir')
    expect(slugFor({ ...EMPTY_DRAFT, brand: 'Atelier', slug: 'mon-atelier', slugTouched: true })).toBe(
      'mon-atelier',
    )
  })
})

describe('departmentOf', () => {
  test('les deux premiers chiffres ; la Corse et les outre-mer à part', () => {
    expect(departmentOf('63000')).toBe('63')
    expect(departmentOf('06390')).toBe('06')
    expect(departmentOf('20000')).toBe('2A')
    expect(departmentOf('20200')).toBe('2B')
    expect(departmentOf('97400')).toBe('974')
    expect(departmentOf('')).toBeNull()
    expect(departmentOf('6300')).toBeNull()
  })
})

describe('wallCount', () => {
  test('à la dizaine sous 1 000, à la centaine au-delà ; exact sous 10', () => {
    expect(wallCount(110)).toBe(110)
    expect(wallCount(44)).toBe(40)
    expect(wallCount(1234)).toBe(1200)
    expect(wallCount(7)).toBe(7)
  })
})

describe('initialsOf', () => {
  test('les initiales des deux premiers mots', () => {
    expect(initialsOf('Atelier Sauvage')).toBe('AS')
    expect(initialsOf('runes de chêne')).toBe('RD')
    expect(initialsOf('Bilskirnir')).toBe('B')
    expect(initialsOf('  ')).toBe('')
  })
})

describe('codeDigits', () => {
  test('les chiffres d’un code collé, six au plus', () => {
    expect(codeDigits('482 913')).toBe('482913')
    expect(codeDigits('482-913-77')).toBe('482913')
    expect(codeDigits('abc')).toBe('')
  })
})
```

- [ ] **Step 2: RED** — `pnpm --filter web-v2 exec vitest run src/lib/welcome.test.ts` → FAIL (import introuvable).

- [ ] **Step 3: `lib/welcome.ts`**

```ts
/**
 * QUOI     — les règles de l'arrivée d'un exposant : les étapes selon le cas, la validité de chaque
 *            étape, l'adresse tirée de la marque, le département d'un code postal, l'arrondi des
 *            chiffres du mur de connexion, les initiales, les chiffres d'un code collé.
 * POURQUOI — lot 10a (Uriel, 11/10/2026) : la marque d'abord, puis le prénom. Les écrans
 *            affichent ; ce qui se décide se teste ici.
 */
import { cleanSlug, slugProblem } from './vitrine-edit'

export type WelcomeStep = 'brand' | 'firstName' | 'craft' | 'place' | 'address'
export type WelcomeKind = 'new' | 'nameOnly' | 'newEntity'

const STEPS: Record<WelcomeKind, WelcomeStep[]> = {
  new: ['brand', 'firstName', 'craft', 'place', 'address'],
  nameOnly: ['firstName'],
  newEntity: ['brand', 'craft', 'place', 'address'],
}

export function welcomeSteps(kind: WelcomeKind): WelcomeStep[] {
  return STEPS[kind]
}

export interface WelcomeDraft {
  brand: string
  firstName: string
  craft: string
  city: string
  postalCode: string
  slug: string
  slugTouched: boolean
  referral: string
}

export const EMPTY_DRAFT: WelcomeDraft = {
  brand: '',
  firstName: '',
  craft: '',
  city: '',
  postalCode: '',
  slug: '',
  slugTouched: false,
  referral: '',
}

const MAX_TEXT = 60

function tooLong(value: string): string | null {
  return value.trim().length > MAX_TEXT ? `${String(MAX_TEXT)} caractères au plus` : null
}

export function slugFor(draft: WelcomeDraft): string {
  return draft.slugTouched ? draft.slug : cleanSlug(draft.brand.trim()).replace(/-$/, '')
}

export function stepProblem(step: WelcomeStep, draft: WelcomeDraft): string | null {
  switch (step) {
    case 'brand':
      return draft.brand.trim() === '' ? 'Le nom de ta marque' : tooLong(draft.brand)
    case 'firstName':
      return draft.firstName.trim() === '' ? 'Ton prénom' : tooLong(draft.firstName)
    case 'craft':
      return tooLong(draft.craft)
    case 'place': {
      const postal = draft.postalCode.trim()
      if (postal !== '' && !/^\d{5}$/.test(postal)) return 'Cinq chiffres'
      return tooLong(draft.city)
    }
    case 'address':
      return slugProblem(slugFor(draft))
  }
}

/** « 63000 » → « 63 » ; la Corse en 2A / 2B, les outre-mer sur trois chiffres. */
export function departmentOf(postalCode: string): string | null {
  const postal = postalCode.trim()
  if (!/^\d{5}$/.test(postal)) return null
  if (postal.startsWith('20')) return Number(postal) < 20200 ? '2A' : '2B'
  if (postal.startsWith('97') || postal.startsWith('98')) return postal.slice(0, 3)
  return postal.slice(0, 2)
}

/** Les chiffres du mur : exacts sous 10, à la dizaine sous 1 000, à la centaine au-delà. */
export function wallCount(n: number): number {
  if (n < 10) return n
  if (n < 1000) return Math.floor(n / 10) * 10
  return Math.floor(n / 100) * 100
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

export function codeDigits(text: string): string {
  return text.replace(/\D/g, '').slice(0, 6)
}
```

- [ ] **Step 4: GREEN** — même commande → PASS.
- [ ] **Step 5: README** (`- \`welcome.ts\` — les règles de l'arrivée : étapes, validité, département, chiffres du mur.`), lint, commit `feat(v2): les règles de l'arrivée d'un exposant`.

---

### Task 2: La connexion (deux écrans, les six cases)

**Files:**
- Create: `apps/web-v2/src/components/ui/CodeInput.tsx`, `apps/web-v2/src/styles/3-components/code-input.css`
- Modify: `apps/web-v2/src/pages/Login.tsx` (réécrit), `apps/web-v2/src/styles/3-components/login.css` (réécrit), `apps/web-v2/src/lib/auth.tsx:171-177` (`shouldCreateUser: true`), `apps/web-v2/src/styles/index.css`, `apps/web-v2/src/styles/2-semantic.css`, `apps/web-v2/src/components/ui/README.md`

**Interfaces:**
- Consumes: `codeDigits` (Task 1) ; `useAuth().signIn`, `.verifyOtp`.
- Produces: `CodeInput({ value: string; onChange: (code: string) => void; disabled?: boolean; autoFocus?: boolean })` — six cases ; `onChange` reçoit la chaîne des chiffres (0 à 6).

- [ ] **Step 1: `CodeInput`** — six `<input inputMode="numeric" autoComplete="one-time-code" maxLength={1} aria-label={`Chiffre ${i+1}`}>` ; à la frappe d'un chiffre : `onChange` puis focus de la case suivante ; Retour arrière sur une case vide : focus et vidage de la précédente ; `onPaste` : `codeDigits(texte collé)` remplit tout et met le focus sur la dernière case remplie. Une case ne garde qu'un chiffre (`codeDigits(value).slice(-1)`).

- [ ] **Step 2: `Login.tsx`** — mise en page en deux colonnes (`.login__side` formulaire, `.login__wall` emplacement du mur, rempli à la Task 3). Étape e-mail et étape code selon les textes de la spec. Quand `code.length === 6` → `verifyOtp` (une seule fois par code : garder le dernier code envoyé dans un `useRef`). Échec : « Ce code ne marche pas. Vérifie-le, ou renvoie-en un. », `setCode('')`. Décompte de renvoi : `useState(60)` + `setInterval` d'une seconde nettoyé au démontage, réarmé à chaque envoi ; à zéro, le texte devient le bouton « renvoie un code » qui rappelle `signIn`. « ‹ Changer d'e-mail » revient à l'étape e-mail. Liens CGU / Confidentialité vers `/cgu` et `/confidentialite` de la V1 (`<a href="/cgu">`).

- [ ] **Step 3: `auth.tsx`** — `shouldCreateUser: true` ; mettre à jour l'en-tête de `Login.tsx` (la V2 crée désormais les comptes) et le commentaire de `signIn`.

- [ ] **Step 4: CSS** — `login.css` réécrit sur la maquette `2100:2` (relever les mesures avec `get_design_context` sur `2100:2` et `2100:38` : largeur du formulaire, titre serif `--type-…`, champ, bouton noir pleine largeur, mur arrondi à droite) ; `code-input.css` (cases de la maquette `2100:38`). Sous 760 px : `.login__wall` caché.

- [ ] **Step 5: Vérifier** — `pnpm --filter web-v2 dev` : déconnecté (fenêtre privée), la page ressemble à la maquette ; frappe d'un code, collage « 482 913 » (les cases se remplissent ; un faux code donne le message et vide les cases). Ne pas se connecter avec le compte d'Uriel ailleurs que dans son navigateur habituel.

- [ ] **Step 6: Lint, test, commit** — `feat(v2): la connexion sur la maquette, et elle crée aussi les comptes`.

---

### Task 3: Le mur de la connexion

**Files:**
- Create: `apps/web-v2/src/features/login/LoginWall.tsx`, `apps/web-v2/src/features/login/useLoginWall.ts`, `apps/web-v2/src/features/login/README.md`, `apps/web-v2/src/styles/3-components/login-wall.css`
- Modify: `apps/web-v2/src/pages/Login.tsx`, `apps/web-v2/src/styles/index.css`, `apps/web-v2/src/styles/2-semantic.css`

**Interfaces:**
- Consumes: `wallCount` (Task 1) ; `todayIso` (`lib/dates.ts`).
- Produces: `useLoginWall(): { posters: string[]; events: number | null; exposants: number | null }`.

- [ ] **Step 1: Vérifier ce que lit un visiteur anonyme** (lecture seule, clé anonyme) — un script jetable dans le dossier temporaire qui, avec `VITE_SUPABASE_ANON_KEY`, lit `events` (`id, image_url` publics à venir avec affiche, 12, triés par `start_date`), compte les événements publics (`count: 'exact', head: true`) et les enseignes `type = 'exposant'`. Expected : trois réponses sans erreur. Si l'une échoue, ajouter une migration `login_wall()` (`SECURITY DEFINER`, `STABLE`, `GRANT EXECUTE … TO anon`) qui rend `{ posters: text[], events: int, exposants: int }`, et la lire à la place — ledger : Ruling.

- [ ] **Step 2: `useLoginWall`** — patron du dépôt (chargement qui rend son résultat, effet qui l'applique une fois). Les trois lectures en `Promise.all` ; un échec des chiffres → `null` (le texte des chiffres ne s'affiche pas) ; un échec des affiches → `[]`.

- [ ] **Step 3: `LoginWall`** — trois colonnes d'affiches (`<img src alt="">`), qui défilent lentement en boucle (animation CSS `translate` sur une colonne doublée, durée en jeton, arrêtée sous `prefers-reduced-motion`) ; voile sombre en bas ; « Le réseau qui fait tourner les festivals » en serif ; « {wallCount(events)} festivals et marchés · {wallCount(exposants)} exposants indépendants » si les deux nombres sont connus. Sans affiches : le cadre sombre seul.

- [ ] **Step 4: Vérifier** — fenêtre privée sur `/v2/connexion` : les affiches et « 110 festivals et marchés · 40 exposants indépendants » (valeurs du jour).

- [ ] **Step 5: Lint, commit** — `feat(v2): le mur d'affiches de la connexion, avec les vrais chiffres`.

---

### Task 4: L'arrivée (`features/welcome/`)

**Files:**
- Create: `apps/web-v2/src/features/welcome/WelcomePage.tsx`, `useWelcomeDraft.ts`, `WelcomeStepFields.tsx`, `WelcomePreview.tsx`, `ActivityPreview.tsx`, `useSlugFree.ts`, `README.md` ; `apps/web-v2/src/styles/3-components/welcome.css`
- Modify: `apps/web-v2/src/styles/index.css`, `apps/web-v2/src/styles/2-semantic.css`

**Interfaces:**
- Consumes: tout `lib/welcome.ts` (Task 1) ; `isSlugTaken` (`lib/vitrine-edit.ts`) ; `useAuth()` (`user`, `person`, `entities`, `actor`, `reloadIdentity`, `switchActor`) ; `supabase`.
- Produces: `WelcomePage({ kind: WelcomeKind })` ; `useWelcomeDraft(kind)` → `{ draft, set(patch), step, index, steps, next(), back() }`.

- [ ] **Step 1: `useWelcomeDraft`** — le brouillon en `sessionStorage` (`flwsh-welcome`, lu au démarrage dans un `try/catch`), l'étape dans l'adresse (`?etape=N`, `useSearchParams`, bornée aux étapes du cas). Le code de parrainage se pré-remplit depuis `?r=` puis depuis `localStorage['flwsh.referralCode']` (clé que la V1 pose déjà, même origine), en majuscules sans espaces.

- [ ] **Step 2: `useSlugFree(slug)`** — 400 ms après la dernière frappe, `supabase.from('entities').select('actor_id', { count: 'exact', head: true }).eq('public_slug', slug)` ; rend `'checking' | 'free' | 'taken' | 'unknown'` (`unknown` si la lecture rate : on ne bloque pas, la création tranchera).

- [ ] **Step 3: L'écran** (`WelcomePage` + `WelcomeStepFields`) — gabarit des maquettes : logo en haut à gauche (`BASE_URL`), colonne formulaire (« ‹ Retour » sauf à la première étape, barre d'étapes, sur-titre, titre serif, sous-titre, champ(s), « Continuer → » qui ne s'allume que si `stepProblem` est nul — et à l'étape 5 si l'adresse n'est pas `taken`), Entrée continue. Textes de la spec, tableau des 5 étapes. Étape 2 : `ActivityPreview` sous le champ. Étape 5 : `flw.sh/` gris devant l'adresse, état « ✓ Libre — tu pourras la changer plus tard » / « Déjà prise » / message de `slugProblem`, puis le champ parrainage et « Le parrain et toi gagnez un mois de Pro. » ; le bouton dit « Créer ma vitrine » (ou « Entrer » pour `nameOnly`). Le titre de chaque étape prend le focus à l'arrivée sur l'étape.

- [ ] **Step 4: `WelcomePreview`** — « Ta vitrine, en direct », carte : bannière en filigrane, rond aux `initialsOf(marque)`, la marque (pâle et « Ta marque » si vide), « {métier} · {ville} ({departmentOf}) » si l'un existe sinon « Ton métier et ta ville viendront aux étapes suivantes », `flw.sh/{slugFor(draft)}` dessous. Pour `nameOnly`, la carte montre l'enseigne active (nom, logo).

- [ ] **Step 5: `ActivityPreview`** — « C'est ainsi qu'on te verra dans le réseau : », une ligne blanche bordée : avatar (photo de la personne ou initiale), « **{prénom} de {marque}** a ajouté Les Aventuriales » (marque de l'enseigne active pour `nameOnly`).

- [ ] **Step 6: La création** (dans `WelcomePage`, fonction `finish`) —
  1. si l'étape `firstName` fait partie du cas : `users.update({ display_name: firstName.trim() }).eq('actor_id', user.id)` ;
  2. si le cas crée une enseigne : `rpc('create_owned_entity', { p_type: 'exposant', p_brand_name, p_craft_type: craft || undefined, p_city: city || undefined, p_postal_code: postal || undefined, p_department: departmentOf(postal) ?? undefined, p_public_slug: slugFor(draft) })` ; `isSlugTaken(error)` → étape 5 avec « Déjà prise » ; autre erreur → « La création n'a pas abouti. Réessaie. » ;
  3. si un code de parrainage : `rpc('attribute_referral', { p_code, p_filleul_entity_id: newId })`, échec ignoré ;
  4. `await reloadIdentity()`, `switchActor(newId)`, effacer `sessionStorage` et `localStorage['flwsh.referralCode']` ;
  5. `go(retour ?? (kind === 'newEntity' ? '/reglages' : '/'))`, `retour` lu dans `?retour=` et accepté seulement s'il commence par `/` et pas par `//`.
  Le bouton dit « Création… » pendant l'écriture ; un second clic ne relance rien.

- [ ] **Step 7: CSS** — `welcome.css` sur les mesures de `2102:72` / `2244:2` / `2244:53` (`get_design_context`) : deux colonnes, panneau d'aperçu à droite, barre d'étapes (courante plus longue), champ, aperçu d'activité. Sous 760 px : l'aperçu passe sous le formulaire en version réduite.

- [ ] **Step 8: Lint, commit** — `feat(v2): l'arrivée d'un exposant, sa vitrine en direct`.

---

### Task 5: Le garde d'arrivée et les routes

**Files:**
- Modify: `apps/web-v2/src/App.tsx`
- Create: `apps/web-v2/src/lib/welcome-guard.ts`, `apps/web-v2/src/lib/welcome-guard.test.ts`

**Interfaces:**
- Produces: `welcomeKind(person: { display_name: string | null } | null, entityCount: number, asked: 'nouvelle-enseigne' | null): WelcomeKind | null` — `null` = pas d'arrivée à faire.

- [ ] **Step 1: Tests (RED)**

```ts
import { expect, test } from 'vitest'
import { welcomeKind } from './welcome-guard'

test('sans prénom ni enseigne : l’arrivée complète', () => {
  expect(welcomeKind({ display_name: null }, 0, null)).toBe('new')
  expect(welcomeKind({ display_name: '  ' }, 0, null)).toBe('new')
})
test('une enseigne mais pas de prénom : le prénom seul', () => {
  expect(welcomeKind({ display_name: null }, 1, null)).toBe('nameOnly')
})
test('un prénom : rien à faire, sauf une nouvelle enseigne demandée', () => {
  expect(welcomeKind({ display_name: 'Uriel' }, 0, null)).toBeNull()
  expect(welcomeKind({ display_name: 'Uriel' }, 2, 'nouvelle-enseigne')).toBe('newEntity')
})
test('identité pas encore lue : on n’envoie nulle part', () => {
  expect(welcomeKind(null, 0, null)).toBeNull()
})
```

- [ ] **Step 2: RED**, puis **Step 3:** `lib/welcome-guard.ts` :

```ts
/**
 * QUOI     — quelle arrivée faire, selon la personne et ses enseignes.
 * POURQUOI — lot 10a : sans prénom, on passe par l'arrivée avant d'entrer ; avec une enseigne déjà
 *            là, seul le prénom ; « Créer un compte exposant » est une arrivée sans le prénom.
 * ATTENTION — une identité pas encore lue rend null : le garde n'envoie personne tant qu'il ne sait pas.
 */
import type { WelcomeKind } from './welcome'

export function welcomeKind(
  person: { display_name: string | null } | null,
  entityCount: number,
  asked: 'nouvelle-enseigne' | null,
): WelcomeKind | null {
  if (!person) return null
  const named = (person.display_name ?? '').trim() !== ''
  if (named) return asked === 'nouvelle-enseigne' ? 'newEntity' : null
  return entityCount > 0 ? 'nameOnly' : 'new'
}
```

- [ ] **Step 4: GREEN.**
- [ ] **Step 5: `App.tsx`** — `ProtectedRoute` : après `allow`, si `welcomeKind(person, entities.length, null)` n'est pas nul → `<Navigate to={`/bienvenue?retour=${encodeURIComponent(location.pathname + location.search)}`} replace />`. Nouvelle route `/bienvenue` sous un garde d'accès sans le test du prénom (`AccessRoute`, extrait de `ProtectedRoute` : la vérification admin seule), qui rend `WelcomePage` avec `kind = welcomeKind(person, entities.length, params.has('nouvelle-enseigne') ? 'nouvelle-enseigne' : null)` ; s'il est nul → `<Navigate to="/" replace />`. Tant que `person` n'est pas lu (`loading`), ne rien rendre.

- [ ] **Step 6: Lint, test, commit** — `feat(v2): un compte sans prénom passe par l'arrivée avant d'entrer`.

---

### Task 6: « Créer un compte exposant »

**Files:**
- Modify: `apps/web-v2/src/features/settings/EntitiesSection.tsx`, `apps/web-v2/src/components/layout/TabBar.tsx`, `apps/web-v2/src/styles/3-components/settings.css`

- [ ] **Step 1: Réglages** — en bas de la carte de « Enseignes et abonnement » (maquette `2206:691`), une ligne-bouton « + Créer un compte exposant » qui mène à `/bienvenue?nouvelle-enseigne`. La section s'affiche désormais aussi sans enseigne (titre, note, et cette seule ligne) — ce qui règle au passage le lien mort de la colonne de navigation relevé au lot 9b.

- [ ] **Step 2: Menu « Moi »** — une entrée « Créer un compte exposant » (icône `Plus`) avant « Réglages ».

- [ ] **Step 3: Vérifier, lint, commit** — `feat(v2): créer un compte exposant depuis les Réglages et le menu Moi`.

---

### Task 7: L'essai de bout en bout (au GO d'Uriel)

**Files:** aucun dans le dépôt (script jetable dans le dossier temporaire de la session ; mot de passe du compte de test dans un fichier d'état, jamais affiché).

- [ ] **Step 1: Compte de test** — `admin.auth.admin.createUser({ email: 'test-arrivee-<horodatage>@flw.test', password, email_confirm: true })` ; `users.update({ role: 'admin' })` sur ce seul compte (la V2 est réservée aux admins) ; vérifier qu'il n'a ni prénom ni enseigne.
- [ ] **Step 2: Le parcours** — dans le navigateur, se connecter avec ce compte n'est pas possible par mot de passe (la V2 n'a que le code) : générer un lien magique (`admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: 'http://localhost:5174/v2/' } })`) et l'ouvrir dans un onglet sur `localhost:5174` : la session locale d'Uriel y sera remplacée le temps de l'essai (sa session de `flw.sh` n'est pas touchée, autre origine) ; il se reconnectera en local ensuite. Expected : arrivée sur `/bienvenue`, les 5 étapes, la vitrine en direct, « Créer ma vitrine », puis le tableau de bord avec la nouvelle enseigne active.
- [ ] **Step 3: En base** — `users.display_name`, l'enseigne (marque, métier, ville, département, adresse), l'appartenance `owner`.
- [ ] **Step 4: « Créer un compte exposant »** sur ce compte : une seconde enseigne, active, retour aux Réglages.
- [ ] **Step 5: Effacer** — `delete-account` avec la session du compte de test ; vérifier qu'il ne reste rien.

---

## Après les tâches

Relecture fraîche de toute la branche (modèle le plus capable), corrections Critiques et Importantes en TDD, puis : déploiement de la V2 au GO (2.32.0), docs (plan directeur : 10a ☑ ; `maquettes-2027.md` : connexion et arrivée intégrées ; `_État.md`), push.
