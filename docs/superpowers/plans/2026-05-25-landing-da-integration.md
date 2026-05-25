# Landing « Nuit de Festival » — Intégration maquette — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la landing actuelle (mono-audience) par la maquette « Nuit de Festival » complète : switcher 3 audiences (Festivalier / Exposant par défaut / Organisateur *Soon*), marquee de tags, sections par audience, tiers de prix **sans chiffres** (« tarifs bientôt »), teaser + **waitlist organisateur fonctionnelle**, navbar verre dépoli + toggle de thème.

**Architecture :** S'appuie sur le socle DA déjà en place (branche `feat/da-nuit-festival-socle` : tokens triplets-HSL nuit/jour, `bgfx` global, `ThemeProvider`, `ThemeToggle`, variant `light:`). La landing est portée en `Landing.tsx` (structure + état `audience` React) + `Landing.css` (styles bespoke de la maquette adaptés aux tokens DA, pattern existant des `.css` par composant qui consomment `hsl(var(--token))`). Le `bgfx` global fournit déjà les halos (ne pas le redupliquer). La waitlist organisateur insère un lead dans une nouvelle table Supabase `organizer_waitlist` (insert anon via RLS).

**Tech Stack :** React 19 + TS, Tailwind v4 (tokens DA), CSS-modules-like `.css` par composant, Supabase (table + RLS), Vitest.

**Référence visuelle FIGÉE :** `docs/decisions/assets/landing-founding-theme.html` (décision 0001 §9). **Décisions produit (2026-05-25) :** prix **cachés** (tiers/features sans chiffre, mention « tarifs bientôt ») ; waitlist organisateur **fonctionnelle** (stockage email).

**Hors périmètre :** autres pages (onboarding/login/explorer…) ; asset logo définitif (on utilise le wordmark Jakarta + ✦ de la maquette) ; activation paiement.

---

## File Structure

- **Create** `supabase/migrations/20260525120009_organizer_waitlist.sql` — table + RLS (insert anon).
- **Create** `src/pages/Landing.css` — styles bespoke de la maquette adaptés aux tokens DA.
- **Rewrite** `src/pages/Landing.tsx` — structure complète + switcher d'audience + sections + waitlist.
- **Create** `src/hooks/use-waitlist.ts` — petit hook d'insertion waitlist (états idle/submitting/success/error).

Le `FeatureCard` interne actuel de `Landing.tsx` est remplacé par le rendu maquette (`.feat`/`.ico`). `ThemeToggle` (existant) est réutilisé dans la navbar.

---

## Task 1: Migration Supabase — table `organizer_waitlist` + RLS

**Files:**
- Create: `supabase/migrations/20260525120009_organizer_waitlist.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Leads organisateurs captés depuis la landing (waitlist V1).
create table if not exists public.organizer_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing',
  created_at timestamptz not null default now()
);

-- Un même email ne s'inscrit qu'une fois.
create unique index if not exists organizer_waitlist_email_key
  on public.organizer_waitlist (lower(email));

alter table public.organizer_waitlist enable row level security;

-- N'importe qui (visiteur anonyme inclus) peut s'inscrire ; personne ne peut lire via l'API publique.
create policy "anyone can join the organizer waitlist"
  on public.organizer_waitlist
  for insert
  to anon, authenticated
  with check (true);
```

- [ ] **Step 2: Appliquer la migration au projet distant**

Utiliser l'outil MCP Supabase `apply_migration` avec `name: "organizer_waitlist"` et le SQL ci-dessus (le projet n'a pas de stack locale ; les changements vont au projet distant). Si `apply_migration` n'est pas disponible, utiliser le binaire CLI Supabase (`supabase db push`) — cf. mémoire « Supabase CLI setup » (chemin binaire direct sur Windows, `pnpm exec` ne marche pas).

- [ ] **Step 3: Vérifier la table et la policy**

Via MCP `list_tables` (ou `execute_sql`) : confirmer que `public.organizer_waitlist` existe avec RLS activé et la policy d'insert. Faire un insert de test puis le supprimer :

```sql
insert into public.organizer_waitlist (email, source) values ('test@flw.sh', 'plan-check');
delete from public.organizer_waitlist where email = 'test@flw.sh';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525120009_organizer_waitlist.sql
git commit -m "feat(landing): organizer_waitlist table + anon-insert RLS"
```

---

## Task 2: Hook d'insertion waitlist (`use-waitlist.ts`)

**Files:**
- Create: `src/hooks/use-waitlist.ts`

> La table n'est pas dans `@/types/supabase` (types générés) → on caste l'accès en `any` (précédent projet : voir mémoire « New Supabase RPC types »). Alternative plus propre : régénérer les types ; non requise ici.

- [ ] **Step 1: Implémenter le hook**

```ts
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useWaitlist() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(email: string) {
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setError('Adresse email invalide.')
      setStatus('error')
      return
    }
    setStatus('submitting')
    setError(null)
    // La table organizer_waitlist n'est pas dans les types générés → cast (précédent projet).
    const { error: insertError } = await (supabase as any)
      .from('organizer_waitlist')
      .insert({ email: trimmed, source: 'landing' })
    if (insertError) {
      // 23505 = violation d'unicité : déjà inscrit, on traite comme un succès silencieux.
      if (insertError.code === '23505') {
        setStatus('success')
        return
      }
      setError("Une erreur est survenue. Réessaie dans un instant.")
      setStatus('error')
      return
    }
    setStatus('success')
  }

  return { status, error, submit }
}
```

- [ ] **Step 2: Vérifier les types**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur (le cast `as any` évite l'erreur de table inconnue).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-waitlist.ts
git commit -m "feat(landing): useWaitlist hook (anon insert + validation + dup-as-success)"
```

---

## Task 3: `Landing.css` — port des styles maquette vers les tokens DA

**Files:**
- Create: `src/pages/Landing.css`

> **Source :** porter les blocs `<style>` de `docs/decisions/assets/landing-founding-theme.html` (lignes 9-148), SAUF `:root` (les tokens viennent déjà du socle), SAUF `.bgfx` (déjà global), SAUF le bloc `body{}` global. On garde les styles **spécifiques à la landing** et on remplace les variables locales de la maquette par les tokens DA.

**Table de correspondance (à appliquer à TOUTES les valeurs portées) :**
| Maquette | Remplacer par |
|---|---|
| `var(--surface)` | `hsl(var(--card))` |
| `var(--soft)` | `hsl(var(--secondary))` |
| `var(--text)` | `hsl(var(--foreground))` |
| `var(--muted)` | `hsl(var(--muted-foreground))` |
| `var(--line)` | `hsl(var(--border))` |
| `var(--bg)` | `hsl(var(--background))` |
| `var(--copper)` / `--copper-d` / `--amber` / `--forest` | inchangés (tokens DA existants) |
| `var(--indigo)` / `--indigo-d` | `var(--lime)` / `var(--lime-d)` |
| `var(--h)` | `var(--font-heading)` |
| `var(--b)` | `var(--font-body)` |
| sélecteur `body.light X` | `.light X` |
| sélecteur `body[data-aud="..."]` | `[data-aud="..."]` (on pose `data-aud` sur l'élément racine `.landing`) |

- [ ] **Step 1: Créer `src/pages/Landing.css` en portant ces blocs de la maquette (avec la table ci-dessus)**

Porter, dans cet ordre, en **préfixant la portée par `.landing`** là où c'est un style global de la maquette (pour ne pas fuiter hors de la landing) :
- `.wrap` (max-width 1080px, padding) → `.landing .wrap`
- `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-white` (utiliser `var(--gradient-primary)` pour `.btn-primary` au lieu du `linear-gradient(...)` en dur)
- `nav` + `nav.scrolled` (verre dépoli : `background: color-mix(in srgb, hsl(var(--background)) 70%, transparent); backdrop-filter: blur(14px)`) + `.light nav.scrolled`
- `.nav-in`, `.logo`, `.logo .mark`, `.nav-links`, `.nav-links a.link`
- `.switch-wrap`, `.seg`, `.seg button`, `.seg button.on` + les règles `[data-aud="..."] .seg button[data-a="..."].on` (dégradé copper pour exposant/festivalier, dégradé `var(--lime)→var(--lime-d)` pour organisateur), `.seg .mini`
- `.hero`, `.glow`, `.g-a/.g-b/.g-c`, `.dot` + `@keyframes tw`, `.hero h1`, `.grad` (+ `.light .grad`), `.hero p.lead`, `.hero-cta`, `.proof`, `.avatars`
- `.eyebrow` (+ `.eyebrow.f`, `.eyebrow.o`) (+ leurs variantes `.light`)
- `.v` (`display:none`) + `@keyframes fadeUp` + les règles de visibilité `[data-aud="..."] .v.<audience>` (display:block + animation fadeUp)
- `.marquee`, `.mtrack`, `.marquee:hover .mtrack`, `@keyframes scrollx`, `.etag` (+ `.etag:hover`) (+ `.light .etag`)
- `section.block`, `.sec-head`, `.features`, `.two`, `.feat`, `.feat .ico`, `.ico.copper/.forest/.indigo`(→ `.ico.lime`), `.feat h3`, `.feat p`, `.soon`
- `.tiers`, `.tier`, `.tier.pro` (utiliser `var(--gradient-pro)`), `.ttl`, `.price`, `.per`, `.tier ul/li/.ck`, `.pop`
- `.org-card` (+ `::before`), `.org-card h2/p`, `.soon-tag`, `.em-input`
- `footer`
- la media-query `@media(max-width:820px)` (grilles en 1 colonne, masquer `.nav-links a.link`, padding seg)
- `.theme-toggle` est DÉJÀ stylé globalement (socle) — ne pas le redéfinir.

Adapter `svg` de la maquette (taille 22px, stroke currentColor) en le **scopant** `.landing svg` pour ne pas affecter les icônes globales de l'app.

- [ ] **Step 2: Vérifier le build CSS**

Run: `pnpm exec vite build`
Expected: build OK, aucune erreur CSS. Grep `dist/assets/*.css` pour `hsl(#` / `hsl(hsl(` → AUCUN (preuve que la table de correspondance a bien produit du `hsl(var())` valide).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Landing.css
git commit -m "feat(landing): port maquette styles to DA tokens (Landing.css)"
```

---

## Task 4: `Landing.tsx` — structure, switcher d'audience, sections (prix cachés)

**Files:**
- Rewrite: `src/pages/Landing.tsx`

- [ ] **Step 1: Réécrire `Landing.tsx`**

Exigences de structure (fidèle à la maquette, en React) :
- `import './Landing.css'`, `import { Link } from 'react-router-dom'`, `import { ThemeToggle } from '@/components/theme-toggle'`, `import { useWaitlist } from '@/hooks/use-waitlist'`, `useState`, `useEffect`.
- État : `const [audience, setAudience] = useState<'festivalier'|'exposant'|'organisateur'>('exposant')`. Élément racine `<div className="landing" data-aud={audience}>`.
- **Navbar** `<nav>` : wordmark `<span className="mark">✦</span> Fellowship` (PAS `logo.png`), liens « À propos »/« Tarifs » (ancres `#`), `<ThemeToggle />`, et `<Link to="/login">` bouton ghost « Se connecter ». Listener scroll : ajouter/retirer la classe `scrolled` sur le `<nav>` quand `window.scrollY > 16` (via `useEffect` + ref, nettoyer le listener au démontage ; `{ passive: true }`).
- **Switcher** `.seg` : 3 boutons (`festivalier`, `exposant` défaut, `organisateur` + `<span className="mini">Soon</span>`). `onClick` → `setAudience(a)` puis `window.scrollTo({ top: 0, behavior: 'smooth' })`. La classe `on` suit `audience`.
- **Hero** : 3 blocs `.v.<audience>` avec les textes EXACTS de la maquette (h1 + `.grad`, `p.lead`, `.hero-cta`, `.proof`). CTAs `.btn-primary` → `<Link to="/login">`. Garder les `.dot` décoratifs et `.glow` du hero.
- **Marquee** : tags statiques de la maquette (la liste exacte, dupliquée ×2 pour la boucle), chacun avec `style={{ '--c': '<couleur>' } as React.CSSProperties}`.
- **Sections par audience** (`section.block.v.<audience>`) : features exposant (6 `.feat`), festivalier (2 `.feat`), organisateur (3 `.feat`) — textes + icônes SVG de la maquette. Les icônes : reprendre les `<svg>` inline de la maquette (classes `.ico.copper`/`.ico.forest`/`.ico.lime`).
- **Pricing (DÉCISION : prix cachés)** : garder les 2 `.tier` (Découverte / Pro `.tier.pro` avec `.pop` « ★ POPULAIRE ») MAIS **sans aucun chiffre** : remplacer le bloc `.price`/`.per` par une mention `<div className="per">Tarifs bientôt</div>` (pas de « 0€ », pas de « 9,99€ »). Garder les listes de features (`✓`). Le ruban Pro = « Pour vivre de ton art » (cf. 0001). CTAs → `<Link to="/login">`. Le pricing festivalier reste « Gratuit. Pour toujours. » (pas un prix Pro, donc OK de l'afficher).
- **Organisateur** : (a) section exposant `.org-card` teaser « Vous organisez un festival ? » avec un CTA qui bascule `setAudience('organisateur')` ; (b) section organisateur `.v.organisateur` avec le formulaire waitlist (Task 5 le câble — pour CE step, poser le markup `.em-input` + bouton).
- **Footer** : wordmark + « Le réseau qui fait tourner les festivals · flw.sh · © 2026 ».
- Supprimer l'ancien composant interne `FeatureCard` (remplacé par le markup `.feat`).

Tester la compile : `pnpm exec tsc --noEmit` (typage du `--c` via `React.CSSProperties` + cast au besoin).

- [ ] **Step 2: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: vert. Le switcher compile, pas de `dark:`, pas de couleur en dur réintroduite (utiliser les classes `.landing`).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "feat(landing): full maquette structure + audience switcher (prices hidden)"
```

---

## Task 5: Câbler la waitlist organisateur (fonctionnelle)

**Files:**
- Modify: `src/pages/Landing.tsx` (section organisateur)

- [ ] **Step 1: Brancher le formulaire sur `useWaitlist`**

Dans la section `.v.organisateur` (et/ou le bloc waitlist), gérer un `useState` local `email` et appeler `const { status, error, submit } = useWaitlist()`. Le formulaire :
- `<form onSubmit>` (preventDefault) → `submit(email)`.
- Input `.em-input` contrôlé (`value`/`onChange`), `type="email"`, `placeholder="votre@email.fr"`, `disabled={status==='submitting'||status==='success'}`.
- Bouton `.btn-primary` (dégradé lime via le style maquette organisateur) : label « Je m'inscris » ; `status==='submitting'` → « Envoi… » ; `disabled` pendant submit/success.
- `status==='success'` → remplacer le formulaire par un message « Merci ! On te prévient au lancement. ✓ ».
- `status==='error'` → afficher `error` sous le champ (texte rouge discret), formulaire réutilisable.

- [ ] **Step 2: Test manuel de bout en bout**

Run: `pnpm dev`, ouvrir `/`, basculer sur « Organisateur », saisir un email valide, soumettre → message de succès. Vérifier l'insertion réelle via MCP `execute_sql` : `select email, created_at from organizer_waitlist order by created_at desc limit 3;` (puis nettoyer la ligne de test). Tester un email invalide → message d'erreur, pas d'insert.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "feat(landing): wire organizer waitlist form to useWaitlist (functional)"
```

---

## Task 6: Vérification finale + bump version

**Files:**
- Modify: `package.json` (version)

- [ ] **Step 1: Comparaison visuelle à la maquette (nuit ET jour)**

`pnpm dev` ouvert. Ouvrir `docs/decisions/assets/landing-founding-theme.html` en parallèle. Vérifier pour chaque audience (festivalier/exposant/organisateur) :
- Navbar transparente en haut → verre dépoli au scroll ; wordmark ✦ Fellowship ; toggle bascule nuit/jour et la landing reste cohérente dans les deux thèmes.
- Switcher : changement d'audience avec fondu, scroll-to-top, onglet actif en dégradé (copper expo/festi, lime orga).
- Marquee qui défile, tags colorés, pause au survol.
- Halos `bgfx` visibles derrière (fournis par le socle).
- Pricing **sans chiffres** (« Tarifs bientôt »), ruban « Pour vivre de ton art ».
- Lisibilité en jour ET nuit.

- [ ] **Step 2: Bump version (patch)**

Incrémenter la version dans `package.json` (ex. 0.7.9 → 0.7.10).

- [ ] **Step 3: Vérification finale**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: tout vert.

- [ ] **Step 4: Commit (NE PAS push — la branche reste locale, décision Uriel)**

```bash
git add -A
git commit -m "chore(landing): bump version after landing DA integration"
```

---

## Self-Review

**Couverture de la maquette / décisions :**
- Switcher 3 audiences + fondu + scroll-to-top → Task 4. ✓
- Navbar verre dépoli + wordmark + toggle → Task 4 (+ socle pour le toggle). ✓
- Marquee tags colorés → Task 4 (statique, fidèle maquette). ✓
- Sections features par audience (icônes SVG maquette) → Task 4. ✓
- **Prix cachés** (décision) → Task 4 (tiers/features sans chiffre, « Tarifs bientôt »). ✓
- **Waitlist organisateur fonctionnelle** (décision) → Tasks 1, 2, 5 (table + RLS anon + hook + form). ✓
- Halos → fournis par le socle (pas de duplication). ✓
- Styles via tokens DA (pas de hex bruts cassant `hsl(var())`) → Task 3 + table de correspondance + check dist `hsl(#`. ✓ (leçon socle appliquée, cf. [[feedback_css_token_audit]]).

**Dépendances/cohérence des types :** `organizer_waitlist` (Task 1) consommée par `useWaitlist` (Task 2, cast `as any`) appelée dans `Landing.tsx` (Task 5). `ThemeToggle`/tokens/`bgfx`/variant `light:` viennent du socle (déjà mergeables sur cette branche). `data-aud` posé sur `.landing` (Task 4) pilote les sélecteurs `[data-aud=...]` portés en Task 3.

**Placeholders :** SQL et hooks/React donnés en entier ; le port CSS est spécifié par fichier-source + table de correspondance déterministe + liste exhaustive des blocs (reproductible sans ambiguïté).

**Hors périmètre confirmé :** autres pages, logo définitif, activation paiement.
