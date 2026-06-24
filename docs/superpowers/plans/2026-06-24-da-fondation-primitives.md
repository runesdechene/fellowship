# DA Fondation — fix token + primitives — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réparer la collision du token `--accent` (bug subtil en prod) et exposer les primitives DA manquantes (boutons, eyebrow mono, statut point+label) comme classes globales réutilisables, en dédupliquant le Cockpit.

**Architecture:** Trois tâches séquentielles, CSS-first. (1) Renommer l'accent DA en `--accent-app`/`--accent-app-ink` et restaurer `--accent` à son sens HSL ; migrer les consommateurs hex. (2) Ajouter `.da-btn*`, `.da-eyebrow`, `.da-status`/`.da-dot` dans `src/index.css` à côté des primitives déjà présentes (`.glass-card`, `.grain`, `.num`). (3) Migrer le Cockpit pour consommer ces primitives et supprimer les duplications, vérifié sans régression visuelle.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS v4 (CSS-first via `@theme inline` dans `src/index.css`), Vite. Pas de framework de test CSS — la vérification se fait par grep d'assertion, `pnpm build`, `pnpm lint` et comparaison visuelle (jour + nuit).

## Global Constraints

- Ne JAMAIS toucher `--copper`, `--primary`, `--page-backdrop` ni `Landing.css`/`Vitrine.css` (Landing + vitrine publique gardent le copper festif).
- Mode **nuit = défaut** (`:root`), mode **jour** via `.light`. Toute valeur DA doit avoir sa déclinaison jour.
- Accent DA : `#d6896a` (nuit) / `#b65f3f` (jour). Encre sur accent : `#fff` (nuit et jour).
- **Règle de migration accent** : `hsl(var(--accent))` = ancien sens (survol neutre) → **laisser intact** ; `var(--accent)` **nu** (hors `hsl(...)`) = DA → migrer en `var(--accent-app)` ; `var(--accent-ink)` → `var(--accent-app-ink)`.
- Le hook sécurité `PreToolUse` bloque l'écriture brute d'un data-URI SVG `feTurbulence`. Aucune tâche ici n'écrit de nouveau SVG (le grain existe déjà dans `.glass-card`/`.grain`) — ne pas en réintroduire.
- Primitives DA = classes globales dans `src/index.css` section « Utilitaires pro » (PAS de nouveau fichier `da.css` : `.glass-card`/`.grain`/`.num`/`.eyebrow` y vivent déjà).
- Commits fréquents (un par tâche min). Conventional commits. Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>.

---

### Task 1: Fix collision `--accent` → `--accent-app`

**Files:**
- Modify: `src/index.css` (l.62-63 nuit, l.107-108 jour)
- Modify: `src/pages/Cockpit.css` (tous les `var(--accent)` nus + `var(--accent-ink)`)
- Modify: `src/components/layout/Sidebar.css` (idem)
- Modify: `src/components/layout/SearchBar.css` (3 spots ciblés + 2 ink — PAS le `hsl(var(--accent))` l.384)

**Interfaces:**
- Produces: tokens `--accent-app` (hex terracotta nuit/jour) et `--accent-app-ink` (#fff), consommés par les Tasks 2 & 3. Le token `--accent` redevient des canaux HSL (`9 18% 12%` nuit / `36 33% 88%` jour).

- [ ] **Step 1: Snapshot visuel avant (ground truth)**

But : pouvoir comparer après migration. Lancer le dev server et noter l'état attendu.

Run: `pnpm dev` (laisser tourner). Ouvrir le Cockpit en nuit ET jour. Repère visuel à conserver : bouton « Voir la fiche » et « + Ajouter » = terracotta plein, texte blanc ; barre verticale active sidebar = terracotta ; J-X géant = terracotta.

- [ ] **Step 2: Remplacer les définitions de token dans `src/index.css`**

Remplacer (bloc nuit, l.62-63) :

```css
  --accent: #d6896a;                 /* terracotta (NUIT) — ne PAS confondre avec --copper festif */
  --accent-ink: #fff;                /* texte sur bouton plein accent (nuit) — blanc, raccord jour */
```

par :

```css
  --accent-app: #d6896a;             /* terracotta DA app (NUIT) — distinct de --accent (survol neutre HSL) et de --copper festif */
  --accent-app-ink: #fff;            /* texte sur bouton plein accent DA (nuit & jour) */
```

Remplacer (bloc jour `.light`, l.107-108) :

```css
  --accent: #b65f3f;                 /* terracotta assombri (lisible sur clair) */
  --accent-ink: #fff;
```

par :

```css
  --accent-app: #b65f3f;             /* terracotta DA app (JOUR, assombri pour lisibilité) */
  --accent-app-ink: #fff;
```

Effet : `--accent` n'est plus redéfini en hex → il garde ses canaux HSL (`:root` l.18 `9 18% 12%`, `.light` l.84 `36 33% 88%`), donc `@theme` `--color-accent: hsl(var(--accent))` et tous les `hsl(var(--accent))` redeviennent valides.

- [ ] **Step 3: Migrer `Cockpit.css` (aucun `hsl(var(--accent))` présent → remplacement global sûr)**

Vérifier d'abord qu'aucun `hsl(var(--accent))` n'existe :

Run: `rg "hsl\(var\(--accent" src/pages/Cockpit.css`
Expected: aucun résultat.

Puis remplacer dans `src/pages/Cockpit.css` TOUTES les occurrences :
- `var(--accent)` → `var(--accent-app)`
- `var(--accent-ink)` → `var(--accent-app-ink)`

(Concerne les lignes 14,15,45,46,47,85,139,140,144,146,147,148,149,151,173,174,183,186,195,196,208,210 pour `--accent` et 14,45 pour `--accent-ink`.)

- [ ] **Step 4: Migrer `Sidebar.css` (aucun `hsl(var(--accent))` → remplacement global sûr)**

Run: `rg "hsl\(var\(--accent" src/components/layout/Sidebar.css`
Expected: aucun résultat.

Remplacer dans `src/components/layout/Sidebar.css` TOUTES les occurrences :
- `var(--accent)` → `var(--accent-app)`
- `var(--accent-ink)` → `var(--accent-app-ink)`

- [ ] **Step 5: Migrer `SearchBar.css` (ciblé — NE PAS toucher le `hsl(var(--accent))` l.384)**

`SearchBar.css` contient à la fois l'ancien pattern (`hsl(var(--accent))` l.384, à garder) et le DA. Éditer uniquement ces 3 emplacements :

`:focus-within` (border) — remplacer :
```css
  border-color: color-mix(in srgb, var(--accent) 45%, var(--hair));
```
par :
```css
  border-color: color-mix(in srgb, var(--accent-app) 45%, var(--hair));
```

`.search-bar-add-btn` — remplacer :
```css
  background: var(--accent);
  color: var(--accent-ink);
```
par :
```css
  background: var(--accent-app);
  color: var(--accent-app-ink);
```

`.notif-bell-badge` — remplacer :
```css
  background: var(--accent);
  color: var(--accent-ink);
```
par :
```css
  background: var(--accent-app);
  color: var(--accent-app-ink);
```

NE PAS modifier `.search-result-icon.profile { background: hsl(var(--accent) / 0.12); color: hsl(var(--accent-foreground)); }` (l.384) — c'est le survol neutre, désormais réparé.

- [ ] **Step 6: Vérifier qu'il ne reste aucun `var(--accent)` nu ni `var(--accent-ink)` hors `hsl()` dans les 3 fichiers migrés**

Run: `rg --pcre2 "(?<!hsl\()var\(--accent\)|var\(--accent-ink\)" src/pages/Cockpit.css src/components/layout/Sidebar.css src/components/layout/SearchBar.css`
Expected: aucun résultat (tout est passé en `--accent-app`/`--accent-app-ink`, sauf `hsl(var(--accent))` qui est exclu par le lookbehind).

Run: `rg "hsl\(#" src/`
Expected: aucun résultat (plus aucun `hsl(<hex>)` invalide nulle part).

- [ ] **Step 7: Build + lint**

Run: `pnpm build`
Expected: succès (TypeScript check + Vite build OK).

Run: `pnpm lint`
Expected: pas de nouvelle erreur.

- [ ] **Step 8: Vérification visuelle (nuit + jour)**

Recharger le dev server. Confirmer :
- Cockpit / Sidebar / bouton Ajouter / badge cloche : terracotta **inchangé** nuit ET jour.
- Survols restaurés : items de `NotificationItem`, `MonthCell`, `AddressAutocomplete`, `QRCodeModal`, `toast`, `LocationField` (Tailwind `hover:bg-accent`) ré-affichent un fond de survol ; `Calendar.css` l.410-411, `FollowButton.css` l.48-49 ré-affichent fond/texte de survol.

- [ ] **Step 9: Commit**

```bash
git add src/index.css src/pages/Cockpit.css src/components/layout/Sidebar.css src/components/layout/SearchBar.css
git commit -m "fix(da): résout la collision --accent (hsl invalide) via --accent-app dédié

--accent était redéfini en hex dans :root, cassant hsl(var(--accent)) sur
~13 survols (Tailwind bg-accent + 3 CSS). On restaure --accent en canaux HSL
et on déplace l'accent DA vers --accent-app/--accent-app-ink.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Primitives DA — boutons, eyebrow mono, statut point+label

**Files:**
- Modify: `src/index.css` (section « Utilitaires pro », après `.grain` ~l.198)

**Interfaces:**
- Consumes: `--accent-app`, `--accent-app-ink` (Task 1) ; `--field`, `--hair`, `--faint`, `--status-*`, `--font-mono`, `--font-body` (existants).
- Produces: classes globales `.da-btn`, `.da-btn-flat`, `.da-btn-ghost`, `.da-btn-2`, `.da-btn-sm`, `.da-eyebrow`, `.da-status`, `.da-dot` (+ keyframes `da-pulse`). Réutilisées par la Task 3 et par les futures refontes de page.

- [ ] **Step 1: Ajouter les primitives dans `src/index.css`**

Insérer après le bloc `.grain > * { ... }` (l.198), avant `h1, h2, h3, .font-display` :

```css
/* ── Boutons DA (plein mat / fantôme / neutre) — ZÉRO dégradé ── */
.da-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  font-family: var(--font-body); font-weight: 600; font-size: 13px;
  border-radius: 11px; padding: 10px 18px; border: none; cursor: pointer;
  text-decoration: none; white-space: nowrap;
  transition: filter .15s, transform .1s, border-color .15s, background .15s;
}
.da-btn svg { width: 16px; height: 16px; }
.da-btn:active { transform: translateY(1px); }
.da-btn-flat { background: var(--accent-app); color: var(--accent-app-ink); }
.da-btn-flat:hover { filter: brightness(1.08); }
.light .da-btn-flat { box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-app) 26%, transparent); }
.da-btn-ghost { background: transparent; border: 1px solid color-mix(in srgb, var(--accent-app) 48%, transparent); color: var(--accent-app); }
.da-btn-ghost:hover { background: color-mix(in srgb, var(--accent-app) 12%, transparent); }
.da-btn-2 { background: var(--field); border: 1px solid var(--hair); color: hsl(var(--muted-foreground)); }
.da-btn-2:hover { color: hsl(var(--foreground)); }
.da-btn-sm { padding: 6px 11px; font-size: 13px; }

/* ── Eyebrow mono (en-tête de section panneau de contrôle) ── */
.da-eyebrow {
  font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  letter-spacing: .2em; text-transform: uppercase; color: var(--faint);
  display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
}

/* ── Statut : point coloré + label mono neutre (pas d'aplat coloré) ── */
.da-status { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 12px; color: hsl(var(--muted-foreground)); }
.da-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--dot-color, hsl(var(--muted-foreground))); box-shadow: 0 0 7px color-mix(in srgb, var(--dot-color, transparent) 70%, transparent); }
.light .da-dot { box-shadow: 0 0 4px color-mix(in srgb, var(--dot-color, transparent) 45%, transparent); }
.da-dot.pulse { animation: da-pulse 2.6s ease-in-out infinite; }
@keyframes da-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
```

Note d'usage (pour les pages consommatrices) : la couleur du point se règle via `style={{ '--dot-color': 'var(--status-accepte)' }}` sur l'élément `.da-dot` (ou une classe utilitaire par statut ajoutée plus tard). Le composant React `<StatusDot>` est **différé** à la première page qui en a besoin (Calendrier), quand l'ensemble des statuts/libellés sera concret — YAGNI ici.

- [ ] **Step 2: Build + lint**

Run: `pnpm build`
Expected: succès.

Run: `pnpm lint`
Expected: pas de nouvelle erreur.

- [ ] **Step 3: Vérification visuelle isolée**

Ajouter temporairement dans le Cockpit (ou une page de test) un `<button className="da-btn da-btn-flat">Test</button>`, `da-btn-ghost`, `da-btn-2`, un `<span className="da-eyebrow">Section</span>`, et un `<span className="da-status"><span className="da-dot" style={{['--dot-color']:'var(--status-accepte)'}} />Accepté</span>`. Confirmer rendu nuit + jour (flat terracotta texte blanc ; ghost bord/texte terracotta ; neutre field+hairline ; eyebrow mono espacé faint ; point coloré + glow + label mono). Retirer le test avant commit.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(da): primitives globales — boutons, eyebrow mono, statut point+label

.da-btn(-flat/-ghost/-2/-sm), .da-eyebrow, .da-status/.da-dot dans index.css
à côté de .glass-card/.grain/.num déjà présents. Réutilisables par toutes les
pages. <StatusDot> différé à la 1re page consommatrice.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Migrer le Cockpit pour consommer les primitives (dédup + non-régression)

**Files:**
- Modify: `src/pages/Cockpit.css` (supprimer le verre/grain dupliqué de `.ck-card` ; supprimer `.ck-eyebrow` et les `.ck-btn*`)
- Modify: les 7 composants cockpit qui portent `ck-card`/`ck-btn*`/`ck-eyebrow` :
  `src/components/cockpit/ProchainFestival.tsx`, `SaisonFrise.tsx`, `AReglerFinaliser.tsx`,
  `CompagnonsDeRoute.tsx`, `MesBilans.tsx`, `BilanBanner.tsx`, `DossiersRefuses.tsx`

**Interfaces:**
- Consumes: `.glass-card`, `.grain` (existants) ; `.da-btn*`, `.da-eyebrow` (Task 2).
- Produces: aucun nouveau symbole. `.ck-card` ne porte plus que `padding`.

- [ ] **Step 1: Recenser les sites de classe à migrer**

Run: `rg -n "ck-card|ck-btn|ck-eyebrow" src/components/cockpit/`
Expected: ~20 occurrences sur 7 fichiers. Garder cette liste sous les yeux.

Table de correspondance (TSX) :
- `ck-card` → `glass-card ck-card` (on garde `ck-card` pour le seul `padding`)
- `ck-eyebrow` → `da-eyebrow`
- `ck-btn ck-btn-p` → `da-btn da-btn-flat`
- `ck-btn ck-btn-ghost` → `da-btn da-btn-ghost`
- `ck-btn ck-btn-g` → `da-btn da-btn-2`
- `ck-btn-sm` → `da-btn-sm`

- [ ] **Step 2: Slim `.ck-card` dans `src/pages/Cockpit.css`**

Remplacer les lignes 32-36 :

```css
.ck-card { border-radius: 18px; padding: 22px; position: relative; overflow: hidden; background: var(--glass); border: 1px solid var(--hair); backdrop-filter: blur(16px); box-shadow: 0 18px 44px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.05); }
.light .ck-card { box-shadow: 0 4px 14px rgba(120,90,60,.06), inset 0 1px 0 rgba(255,255,255,.55); }
.ck-card::before { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: .18; mix-blend-mode: overlay; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.light .ck-card::before { opacity: .05; mix-blend-mode: multiply; }
.ck-card > * { position: relative; z-index: 1; }
```

par (le verre + grain + z-index viennent désormais de `.glass-card`) :

```css
/* .ck-card n'ajoute QUE le padding ; le verre/grain vient de .glass-card (cf. index.css). */
.ck-card { padding: 22px; }
```

⚠️ Ne pas réécrire le data-URI SVG ailleurs (hook sécurité) — on le SUPPRIME ici, c'est sans risque.

- [ ] **Step 3: Supprimer `.ck-eyebrow` et les `.ck-btn*` de `src/pages/Cockpit.css`**

Supprimer la ligne 39 (`.ck-eyebrow { ... }`) — remplacée par `.da-eyebrow`. Garder `.ck-seeall` (l.40, layout cockpit).

Supprimer le bloc boutons (lignes 42-49) :
```css
.ck-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-weight: 600; font-size: 13px; border-radius: 11px; padding: 10px 18px; border: none; cursor: pointer; text-decoration: none; white-space: nowrap; font-family: var(--font-body); }
.ck-btn svg { width: 16px; height: 16px; }
.ck-btn-p { background: var(--accent-app); color: var(--accent-app-ink); }
.light .ck-btn-p { box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-app) 26%, transparent); }
.ck-btn-ghost { background: transparent; border: 1px solid color-mix(in srgb, var(--accent-app) 48%, transparent); color: var(--accent-app); }
.ck-btn-g { background: var(--field); border: 1px solid var(--hair); color: hsl(var(--muted-foreground)); }
.ck-btn-sm { padding: 6px 11px; font-size: 13px; }
```
(Ces déclarations sont reproduites à l'identique par `.da-btn*` de la Task 2.)

- [ ] **Step 4: Migrer les classes dans les 7 composants TSX**

Dans chacun des 7 fichiers listés, appliquer la table de correspondance du Step 1. Exemple concret dans `ProchainFestival.tsx` :
```tsx
<Link to={eventPath(ev)} className="ck-btn ck-btn-p"><FileText strokeWidth={2} /> Voir la fiche</Link>
```
devient :
```tsx
<Link to={eventPath(ev)} className="da-btn da-btn-flat"><FileText strokeWidth={2} /> Voir la fiche</Link>
```
Et tout `className="ck-card"` → `className="glass-card ck-card"`, tout `ck-eyebrow` → `da-eyebrow`.

- [ ] **Step 5: Vérifier qu'il ne reste aucune classe morte**

Run: `rg -n "ck-btn|ck-eyebrow" src/`
Expected: aucun résultat (toutes migrées). `ck-card` ne doit subsister que combiné à `glass-card`.

Run: `rg -n "className=\"ck-card\"" src/`
Expected: aucun résultat (toujours `glass-card ck-card`).

- [ ] **Step 6: Build + lint**

Run: `pnpm build`
Expected: succès.

Run: `pnpm lint`
Expected: pas de nouvelle erreur.

- [ ] **Step 7: Vérification visuelle de non-régression (jour + nuit)**

Recharger le dev server, ouvrir le Cockpit. Comparer au snapshot du Step 1 de la Task 1 : cartes (verre + grain), boutons (Voir la fiche / Ajouter / secondaires), eyebrows de section doivent être **identiques** nuit ET jour. Aucune différence perceptible attendue (les `.da-*` reproduisent les `.ck-*` à l'identique). En cas de doute, capture headless via Edge (cf. mémoire « Capture headless via Edge »).

- [ ] **Step 8: Commit**

```bash
git add src/pages/Cockpit.css src/components/cockpit/
git commit -m "refactor(da): le Cockpit consomme les primitives globales (dédup)

.ck-card -> glass-card (+ padding), .ck-eyebrow -> .da-eyebrow,
.ck-btn* -> .da-btn*. Supprime le verre/grain/boutons dupliqués.
Aucune régression visuelle (jour + nuit).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage :**
- Fix collision `--accent` → `--accent-app` : Task 1 ✓ (suppression redéfs, restauration HSL, migration consommateurs selon la règle, vérif `hsl(#` + build + visuel).
- Extraction primitives source unique : Task 2 ✓ (boutons, eyebrow mono, statut). Déviation assumée vs spec : primitives ajoutées à `index.css` (où `.glass-card`/`.grain`/`.num` vivent déjà) plutôt qu'un nouveau `da.css` — évite de fragmenter la source de vérité. Carte verre + grain **déjà existants** → non recréés.
- `<StatusDot>` : explicitement **différé** à la 1re page consommatrice (décision tranchée, conforme au « décider dans le plan » du spec).
- Migration Cockpit = test de non-régression : Task 3 ✓ (dédup `.ck-card`/`.ck-btn`/`.ck-eyebrow`, vérif visuelle jour+nuit).
- Garde-fous (ne pas toucher copper/primary/Landing/vitrine ; grain non réécrit ; hook sécurité) : Global Constraints ✓.

**Placeholder scan :** aucun TBD/TODO ; tout le code CSS est fourni en entier ; commandes de vérif explicites avec sortie attendue.

**Type consistency :** noms de classes cohérents entre tâches (`.da-btn-flat`/`-ghost`/`-2`/`-sm`, `.da-eyebrow`, `.da-status`/`.da-dot`, `--accent-app`/`--accent-app-ink`). La table de correspondance de la Task 3 référence exactement les classes définies en Task 2.
