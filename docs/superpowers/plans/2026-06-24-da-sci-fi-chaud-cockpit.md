# DA « Sci-fi chaud » — Cockpit (implémentation) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer la DA « sci-fi chaud » validée (spec `2026-06-24-da-sci-fi-chaud-design.md`) au **Cockpit** et à la **Sidebar**, en jour et en nuit, sans toucher aux surfaces publiques (Landing/vitrine).

**Architecture:** On **n'écrase pas** `--copper`/`--primary`/`--page-backdrop` (partagés avec les surfaces publiques). On **ajoute** un jeu de tokens DA (`--accent`, `--glass`, `--hair`, `--field`, `--name`, `--faint`, `--app-bg`) + des utilitaires (`.glass-card`, grain) dans `src/index.css`, puis on réécrit `Cockpit.css` + la structure de `Cockpit.tsx` + les accents de `Sidebar.css` pour consommer ces tokens. Les autres pages app migreront plus tard (hors scope ici).

**Tech Stack:** React 19 + TS, Tailwind v4 (CSS-first dans `src/index.css`), CSS modules par page (`Cockpit.css`, `Sidebar.css`). Polices Plus Jakarta Sans (titres) + Inter (corps) + Geist Mono (data) déjà chargées.

**Maquettes = source de vérité visuelle** (ouvrir dans le navigateur comme référence pixel) :
- Nuit : `.superpowers/brainstorm/11234-1782257114/content/cockpit-terracotta-v2.html`
- Jour : `.superpowers/brainstorm/11234-1782257114/content/cockpit-jour.html`

## Global Constraints

- Branche de travail : `da/finesse-pro` (NE PAS merger sur `main` sans le GO d'Uriel).
- **Interdit absolu** : modifier `--copper`, `--copper-d`, `--primary`, `--gradient-primary`, `--gradient-pro`, `--page-backdrop` dans `:root`/`.light`, ou toucher `src/components/ui/button.tsx`, `Landing.css`, `Vitrine.css`, `EventPage.css`, `Embed*`, `Profile.css`. Ces surfaces gardent le cuivre festif.
- **Accent terracotta** : `#d6896a` (nuit) / `#b65f3f` (jour). Texte sur bouton plein : `#1c1109` (nuit) / `#fff` (jour).
- **Grain** : SVG `feTurbulence fractalNoise baseFrequency=0.9 numOctaves=2` ; **nuit `opacity:.18; mix-blend-mode:overlay`**, **jour `opacity:.05; mix-blend-mode:multiply`**.
- **Ombres** : nuit `0 18px 44px rgba(0,0,0,.32)` ; jour douces `0 4px 14px rgba(120,90,60,.06)`. Toujours `inset 0 1px 0` top-highlight (blanc .05 nuit / .55 jour).
- **Statuts** = point coloré + label mono neutre. Les points réutilisent les tokens **existants** `--status-repere/dossier/accepte/apayer/acompte/inscrit/refuse` (déjà jour/nuit-aware), PAS de verts en dur.
- **Pièges jour/nuit** (cf. mémoire) : pas de `#fff` en dur cassant, `svg{fill:none}` sur les icônes lucide, grain en `multiply` le jour, ombres douces le jour. Vérifier les DEUX modes à chaque tâche.
- **Vérif visuelle** : capture headless Edge sur `pnpm dev`/`preview` (outillage `playwright-core` + `channel:'msedge'`, cf. mémoire). DA = pas de tests unitaires (CSS) ; la porte de chaque tâche = `pnpm build` ✅ + `pnpm lint` 0 err + capture jour+nuit conforme à la maquette.
- Après le lot complet : bump `APP_VERSION` (patch) dans `src/changelog.ts`, commit conventional, push sur la branche.
- Commits fréquents (1 par tâche).

---

### Task 1 : Tokens DA + utilitaire `.glass-card` (fondations additives)

**Files:**
- Modify: `src/index.css` (bloc `:root` ~L6-60, bloc `.light` ~L62-95, et zone utilitaires après L154)

**Interfaces:**
- Produces (consommés par toutes les tâches suivantes) : tokens CSS `--accent`, `--accent-ink`, `--app-bg`, `--glass`, `--hair`, `--field`, `--name`, `--faint` (définis nuit dans `:root`, jour dans `.light`) ; classe `.glass-card` (verre + grain + ombre, gère jour/nuit toute seule) ; classe `.grain` (overlay grain seul, pour bandes non-cartes).

- [ ] **Step 1 : Ajouter les tokens nuit dans `:root`**

Dans `src/index.css`, à la fin du bloc `:root { … }` (avant la `}` de fin, ~L59), ajouter :

```css
  /* ── DA « sci-fi chaud » (tokens additifs, app de travail uniquement) ── */
  --accent: #d6896a;                 /* terracotta (NUIT) — ne PAS confondre avec --copper festif */
  --accent-ink: #1c1109;             /* texte sur bouton plein accent (nuit) */
  --app-bg: radial-gradient(120% 70% at 30% 0%, #1d1a18, #0f0e0d 64%);
  --glass: linear-gradient(180deg, rgba(46,43,40,.52), rgba(28,26,25,.42));
  --hair: rgba(255,255,255,.085);    /* hairline verre */
  --field: rgba(255,255,255,.04);    /* cellule/champ interne */
  --name: #d3c5b3;                   /* noms/titres de listes (moins blancs que --foreground) */
  --faint: #6f6258;                  /* micro-labels mono très discrets */
```

- [ ] **Step 2 : Ajouter les overrides jour dans `.light`**

À la fin du bloc `.light { … }` (avant sa `}`, ~L94), ajouter :

```css
  /* ── DA « sci-fi chaud » — overrides JOUR ── */
  --accent: #b65f3f;                 /* terracotta assombri (lisible sur clair) */
  --accent-ink: #fff;
  --app-bg: radial-gradient(120% 70% at 30% 0%, #f6efe4, #e8dfd0 64%);
  --glass: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.40));
  --hair: rgba(60,40,25,.11);
  --field: rgba(60,40,25,.045);
  --name: #4a3c31;
  --faint: #9a8b7d;
```

- [ ] **Step 3 : Ajouter les utilitaires `.glass-card` et `.grain`**

Après le bloc `.num { … }` (~L154) dans `src/index.css`, ajouter :

```css
/* ── Carte de verre DA (sci-fi chaud) ── */
.glass-card {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background: var(--glass);
  border: 1px solid var(--hair);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 44px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.05);
}
.light .glass-card {
  box-shadow: 0 4px 14px rgba(120,90,60,.06), inset 0 1px 0 rgba(255,255,255,.55);
}
.glass-card > * { position: relative; z-index: 1; }
/* Grain : overlay réutilisable (cartes via ::before, bandes via .grain::before) */
.glass-card::before, .grain::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  opacity: .18; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.light .glass-card::before, .light .grain::before { opacity: .05; mix-blend-mode: multiply; }
.grain { position: relative; }
.grain > * { position: relative; z-index: 1; }
```

- [ ] **Step 4 : Vérifier build + lint (rien d'autre ne doit bouger)**

Run: `pnpm build && pnpm lint`
Expected: build ✅, lint 0 erreur. Les tokens sont additifs : aucune page existante ne les consomme encore → **aucun changement visuel** sur l'app actuelle (vérité à confirmer Step 5).

- [ ] **Step 5 : Vérifier visuellement la non-régression**

Lancer `pnpm dev`, ouvrir n'importe quelle page (ex. `/explorer`) en jour ET nuit. Attendu : strictement identique à avant (les tokens ne sont pas encore utilisés). Si quoi que ce soit bouge → un nom de token entre en collision, renommer.

- [ ] **Step 6 : Commit**

```bash
git add src/index.css
git commit -m "feat(da): tokens « sci-fi chaud » + utilitaire .glass-card (additifs, app)"
```

---

### Task 2 : Réécriture `Cockpit.css` (verre, accent, mono, hiérarchie)

**Files:**
- Modify (réécriture quasi complète) : `src/pages/Cockpit.css`

**Interfaces:**
- Consumes : tokens + `.glass-card`/`.grain` de Task 1.
- Produces : classes restylées consommées par Tasks 3-5 — `ck-page`, `ck-topbar`/`ck-avatar`/`ck-sub`, **nouvelles** `ck-hero`/`ck-strip`, `ck-cols`/`ck-col`, et les classes existantes des composants (`ck-next*`, `ck-jx-big`, `ck-badge*`, `ck-btn*`, `ck-list*`, `ck-conv*`, `ck-season*`/`ck-sm*`, `ck-bilan*`, `ck-refuses*`, `ck-bilan-banner`, `ck-ic`, `ck-empty-txt`) re-mappées sur le verre/accent/mono.

> Source de vérité : reproduire **exactement** les valeurs des maquettes `cockpit-terracotta-v2.html` (nuit) et `cockpit-jour.html` (jour). Le jour se gère **tout seul** via les tokens `--accent/--glass/--hair/--field/--name/--faint` (qui basculent sous `.light`) ; n'écrire des règles `.light .ck-*` que pour les cas non couverts (ombres déjà dans `.glass-card`).

- [ ] **Step 1 : Page, backdrop, topbar**

Remplacer le haut de `Cockpit.css` par :

```css
.ck-page { padding: 34px 48px 80px; display: flex; justify-content: center; background: var(--app-bg); background-attachment: fixed; min-height: 100%; }
.ck-page-inner { max-width: 1200px; width: 100%; margin: 0 auto; }   /* nouveau conteneur centré */
.ck-topbar { display: flex; align-items: center; gap: 15px; margin-bottom: 30px; }
.ck-avatar { width: 52px; height: 52px; border-radius: 15px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 75%, #000), color-mix(in srgb, var(--accent) 40%, #000)); color: var(--accent-ink); font-family: var(--font-heading); font-weight: 800; font-size: 18px; box-shadow: 0 8px 22px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.15); }
.ck-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ck-sub { color: hsl(var(--muted-foreground)); margin-top: 6px; font-size: 12px; font-family: var(--font-mono); letter-spacing: .1em; text-transform: uppercase; }
```

(Note Task 3 ajoutera `.ck-page-inner` + `.page-title` resize dans le TSX.)

- [ ] **Step 2 : Layout — hero, strip, colonnes**

Ajouter / remplacer :

```css
.ck-hero { display: grid; grid-template-columns: 1.7fr 1fr; gap: 18px; margin-bottom: 18px; }
@media (max-width: 1180px) { .ck-hero { grid-template-columns: 1fr; } }
.ck-strip { margin: 18px 0; display: flex; align-items: center; gap: 18px; padding: 14px 20px; border-radius: 14px; overflow-x: auto; }
.ck-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; align-items: start; }
@media (max-width: 1180px) { .ck-cols { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px)  { .ck-cols { grid-template-columns: 1fr; } }
.ck-col { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
```

- [ ] **Step 3 : Carte de base + en-têtes + eyebrow + boutons**

Re-mapper la carte sur le verre, virer le dégradé glossy des boutons :

```css
.ck-card { /* hérite du verre */ border-radius: 18px; padding: 22px; position: relative; overflow: hidden; background: var(--glass); border: 1px solid var(--hair); backdrop-filter: blur(16px); box-shadow: 0 18px 44px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.05); }
.light .ck-card { box-shadow: 0 4px 14px rgba(120,90,60,.06), inset 0 1px 0 rgba(255,255,255,.55); }
.ck-card::before { content:""; position:absolute; inset:0; pointer-events:none; z-index:0; opacity:.18; mix-blend-mode:overlay; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.light .ck-card::before { opacity:.05; mix-blend-mode:multiply; }
.ck-card > * { position: relative; z-index: 1; }
/* eyebrow mono (remplace les h3 + ck-ic colorés) */
.ck-eyebrow { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: var(--faint); display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.ck-seeall { margin-left: auto; font-size: 11px; color: hsl(var(--muted-foreground)); text-decoration: none; font-family: var(--font-body); letter-spacing: 0; text-transform: none; }
/* boutons : plein mat (CTA) + fantôme — ZÉRO dégradé */
.ck-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-weight: 600; font-size: 13px; border-radius: 11px; padding: 10px 18px; border: none; cursor: pointer; text-decoration: none; white-space: nowrap; font-family: var(--font-body); }
.ck-btn svg { width: 16px; height: 16px; }
.ck-btn-p { background: var(--accent); color: var(--accent-ink); }
.light .ck-btn-p { box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 26%, transparent); }
.ck-btn-ghost { background: transparent; border: 1px solid color-mix(in srgb, var(--accent) 48%, transparent); color: var(--accent); }
.ck-btn-g { background: var(--field); border: 1px solid var(--hair); color: hsl(var(--muted-foreground)); }
.ck-btn-sm { padding: 6px 11px; font-size: 13px; }
.ck-ic { display: none; }  /* on remplace les pastilles d'icône colorées par des eyebrows mono */
```

- [ ] **Step 4 : Statuts (point + label mono), héros, saison, listes, bilans, refusés, bandeau**

Re-mapper le reste **en suivant les maquettes** (valeurs exactes). Points clés à appliquer (reproduire `cockpit-terracotta-v2.html`) :
- `ck-badge` → chip mono discret : `background:var(--field); color:var(--foreground via hsl); border:1px solid var(--hair); font-family:var(--font-mono)`. La pastille colorée devient un **point** `.ck-dot` : `width:7px;height:7px;border-radius:50%;background:var(--chip);box-shadow:0 0 8px color-mix(in srgb,var(--chip) 65%,transparent)`. Garder les `--chip: var(--status-*)` existants par variante.
- Héros `ck-next` : `ck-jx-big` → `font-family:var(--font-mono); font-size:52px; line-height:.85; color:var(--accent)`. `ck-next-name` → `color:var(--name)`. Statut héros = chip visible vert : `.ck-status-hero` (fond `color-mix(var(--status-inscrit) 15%)`, bord 34%, point qui pulse).
- `ck-season-head b` / `ck-sm-ct` / `ck-jx-big` / `ck-bilan-stat` / montants : `font-family:var(--font-mono)`. `ck-sm.full` fond `color-mix(var(--accent) 22%)`, `ck-sm.gap` bord pointillé `color-mix(var(--accent) 50%)`, `ck-sm-ct` couleur accent en gap.
- `ck-list-row b`, `ck-conv-txt b`, `ck-bilan-bd > b` → `color:var(--name)`. `small`/meta → `font-family:var(--font-mono); color:hsl(var(--muted-foreground))`.
- `ck-strip` items : `font-size:12.5px; color:var(--name)`, séparateurs `.ck-strip .sep{width:1px;height:22px;background:var(--hair)}`, label `font-family:var(--font-mono); color:var(--faint); letter-spacing:.2em`.
- `ck-bilan-banner` → `.glass-card` look + petit halo accent discret (`::after` radial `var(--accent)`, `opacity:.14`, `mix-blend:screen` nuit / `multiply` jour) ; bouton `ck-btn-p`.
- `ck-refuses` : header `.ck-eyebrow`-like, chevron `hsl(var(--muted-foreground))`, lignes séparées par `1px solid var(--hair)`.
- Pulse : `@keyframes ck-pulse {0%,100%{opacity:1}50%{opacity:.5}}` ; `.ck-dot.live{animation:ck-pulse 2.6s infinite ease-in-out}`.
- Mobile `@media (max-width:560px)` : `.ck-page{padding:20px 16px 56px}`, `.ck-next{flex-direction:column}`, `.ck-next-poster{width:100%;height:160px}`.

- [ ] **Step 5 : Build + lint**

Run: `pnpm build && pnpm lint`
Expected: ✅ / 0 err. (Le rendu sera partiellement faux tant que Task 3 n'a pas restructuré le TSX — normal ; on valide visuellement à la fin de Task 5.)

- [ ] **Step 6 : Commit**

```bash
git add src/pages/Cockpit.css
git commit -m "feat(da): Cockpit.css — verre/grain/accent terracotta, boutons mat, statuts point+mono"
```

---

### Task 3 : Restructurer `Cockpit.tsx` (hero / à venir / colonnes / centré)

**Files:**
- Modify: `src/pages/Cockpit.tsx` (le `return`, L67-102)

**Interfaces:**
- Consumes : classes de Task 2 (`ck-page-inner`, `ck-hero`, `ck-strip`, `ck-cols`).
- Produces : nouvel ordre DOM consommé par Tasks 4-5 ; props inchangées des composants.

- [ ] **Step 1 : Envelopper + nouvel ordre**

Dans le `return`, garder `<div className="ck-page">` mais ajouter le conteneur centré et réordonner :
1. `<div className="ck-page-inner">` enveloppe tout l'intérieur.
2. Topbar inchangée.
3. `BilanBanner` (inchangé, juste restylé en Task 5).
4. **`<div className="ck-hero">`** : `<ProchainFestival …/>` + `<SaisonFrise …/>` (côte à côte — 1.7fr/1fr).
5. **`<ProchainsFestivals …/>`** rendu en bande (Task 4 le transforme ; ici il vit juste après le hero, AVANT les colonnes).
6. **`<div className="ck-cols">`** : 3 `<div className="ck-col">` contenant respectivement `AReglerFinaliser`, `CompagnonsDeRoute`, `MesBilans`.
7. `DossiersRefuses` en bas (inchangé).

Code exact :

```tsx
return (
  <div className="ck-page">
    <div className="ck-page-inner">
      <div className="ck-topbar">
        <div className="ck-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials(name)}</span>}
        </div>
        <div>
          <h1 className="page-title">Bonjour {name}</h1>
          <p className="ck-sub">Ta prochaine action</p>
        </div>
      </div>

      {loading ? (
        <div className="ck-skel">{[0, 1, 2].map(i => <div key={i} className="ck-skel-col" />)}</div>
      ) : (
        <>
          <BilanBanner prompt={bilanPrompt} onSaved={() => { refetch(); refetchReports() }} onSnooze={onSnooze} />
          <div className="ck-hero">
            <ProchainFestival participation={nextFestival} />
            <SaisonFrise season={season} />
          </div>
          <ProchainsFestivals participations={upcoming} />
          <div className="ck-cols">
            <div className="ck-col"><AReglerFinaliser participations={aRegler} /></div>
            <div className="ck-col"><CompagnonsDeRoute /></div>
            <div className="ck-col"><MesBilans participations={participations} entriesByEvent={entriesByEvent} onSaved={() => { refetchReports(); refetchLedger() }} /></div>
          </div>
          <DossiersRefuses participations={refused} onUpdated={refetch} />
        </>
      )}
    </div>
  </div>
)
```

- [ ] **Step 2 : Build + lint**

Run: `pnpm build && pnpm lint`
Expected: ✅ / 0 err.

- [ ] **Step 3 : Commit**

```bash
git add src/pages/Cockpit.tsx
git commit -m "feat(da): Cockpit.tsx — hiérarchie héros / à venir / colonnes, contenu centré"
```

---

### Task 4 : Héros — `ProchainFestival` + `SaisonFrise`

**Files:**
- Modify: `src/components/cockpit/ProchainFestival.tsx`
- Modify: `src/components/cockpit/SaisonFrise.tsx`

**Interfaces:**
- Consumes : classes Task 2 (`ck-card`, `ck-jx-big`, `ck-eyebrow`, `ck-dot`, `ck-status-hero`, `ck-sm*`, `ck-btn-p`/`ck-btn-ghost`).
- Produces : le bloc hero conforme aux maquettes.

- [ ] **Step 1 : `ProchainFestival` — héros J-X géant + statut chip + actions**

Remplacer les en-têtes `h3`/`ck-ic` par `ck-eyebrow`. Structure cible (cf. maquette `.hero-next`) : `ck-card ck-next` → `ck-next-poster` + `ck-next-body` contenant `ck-eyebrow` (« PROCHAIN · DANS »), `ck-next-when` > `ck-jx-big` (le nombre de jours, mono, accent) + unité, `ck-next-name`, `ck-next-meta` (date · lieu, mono), `<span className="ck-status-hero"><span className="ck-dot live" />Inscrit</span>`, `ck-next-actions` → `ck-btn ck-btn-p` (Voir la fiche) + `ck-btn ck-btn-ghost` (Itinéraire). Le badge de statut existant (`ck-badge {variant}`) devient `ck-status-hero` avec `--chip: var(--status-{variant})`. Conserver l'état vide (`ck-next-empty`, `ck-empty-txt`, CTA `ck-btn-p`).

- [ ] **Step 2 : `SaisonFrise` — gros total mono + frise**

En-tête → `ck-eyebrow` (« SAISON {année} »). `ck-season-head b` = total en mono. `ck-season-months` > `ck-sm`(+`full`/+`gap`) inchangés structurellement (restylés en Task 2). `ck-season-note` garde le lien « explorer des dates » en `var(--accent)`.

- [ ] **Step 3 : Build + lint + capture nuit/jour du hero**

Run: `pnpm build && pnpm lint` ✅. Puis `pnpm dev`, `/tableau-de-bord`, capturer le hero en **nuit ET jour** ; comparer à `cockpit-terracotta-v2.html` / `cockpit-jour.html`. Attendu : J-X terracotta géant = point focal, statut « Inscrit » en chip vert lisible, saison à droite.

- [ ] **Step 4 : Commit**

```bash
git add src/components/cockpit/ProchainFestival.tsx src/components/cockpit/SaisonFrise.tsx
git commit -m "feat(da): hero Cockpit — Prochain (J-X géant) + Saison en verre"
```

---

### Task 5 : Bande « À venir » + colonnes secondaires + bandeau

**Files:**
- Modify: `src/components/cockpit/ProchainsFestivals.tsx` (carte → bande `ck-strip`)
- Modify: `src/components/cockpit/AReglerFinaliser.tsx`
- Modify: `src/components/cockpit/CompagnonsDeRoute.tsx`
- Modify: `src/components/cockpit/MesBilans.tsx`
- Modify: `src/components/cockpit/DossiersRefuses.tsx`
- Modify: `src/components/cockpit/BilanBanner.tsx`

**Interfaces:**
- Consumes : classes Task 2. Produces : colonnes élaguées + bande conformes maquette.

- [ ] **Step 1 : `ProchainsFestivals` → bande `ck-strip`**

Transformer la carte-liste en bande horizontale pleine largeur (cf. maquette `.strip`) : `<div className="ck-strip grain">` > `<span className="ck-strip-lab">À VENIR</span>` puis, pour chaque festival à venir : `<span className="ck-strip-it"><span className="ck-dot" style={{'--chip': statusColor}} /> {nom} <small>J-{n}</small></span>` séparés par `<span className="ck-strip-sep" />`. Terminer par `+{N} autres ›` si la liste est tronquée (garder un cap, ex. 3-4 visibles + lien « tout voir »). Vide → ne rien rendre (ou message discret).

- [ ] **Step 2 : `AReglerFinaliser`, `CompagnonsDeRoute`, `MesBilans` — colonnes élaguées**

Pour chacune : en-tête `ck-eyebrow` + `ck-seeall` (« N › » / « tout › »), listes limitées à **2-3 lignes** (le reste derrière « tout voir »). `AReglerFinaliser` : montants en mono (`ck-list-amt`, couleur `var(--status-*)` selon À payer/Acompte). `CompagnonsDeRoute` : avatars groupés `ck-av`, label `ck-conv-txt b` en `var(--name)`, sous-texte mono. `MesBilans` : stats CA/ventes en mono, statut « Fait » = chip mono + point `var(--status-inscrit)`, « À compléter » = lien `var(--accent)`.

- [ ] **Step 3 : `DossiersRefuses` — repliée, hairlines**

En-tête repliable restylé (eyebrow-like, chevron `hsl(var(--muted-foreground))`), lignes séparées par `1px solid var(--hair)`, textarea note sur `var(--field)`/`var(--hair)`, focus `border-color: var(--accent)`.

- [ ] **Step 4 : `BilanBanner` — verre + halo discret**

Wrapper `ck-bilan-banner` restylé en verre (Task 2 Step 4), icône `ck-bilan-ic` sur `var(--field)`, bouton principal `ck-btn ck-btn-p`, bouton « Plus tard » `ck-btn ck-btn-g`, croix `ck-bilan-x` en `hsl(var(--muted-foreground))`.

- [ ] **Step 5 : Build + lint + capture COMPLÈTE nuit/jour**

Run: `pnpm build && pnpm lint` ✅. `pnpm dev`, `/tableau-de-bord`, capturer **toute la page** en nuit ET jour. Comparer point par point aux maquettes. Vérifier : ordre héros→à venir→colonnes, statuts lisibles (point coloré + mono), aucun aplat criard, aucun dégradé glossy, jour reposant (ombres douces, grain discret).

- [ ] **Step 6 : Commit**

```bash
git add src/components/cockpit/
git commit -m "feat(da): Cockpit — bande À venir, colonnes élaguées, bandeau bilan en verre"
```

---

### Task 6 : Sidebar — panneau de verre + accent terracotta

**Files:**
- Modify: `src/components/layout/Sidebar.css`
- (si besoin) Modify: `src/components/layout/Sidebar.tsx` (aucune nouvelle classe requise a priori)

**Interfaces:**
- Consumes : tokens Task 1. Produces : sidebar conforme maquette (logo accent, item actif barre terracotta).

> ⚠️ La sidebar est partagée par TOUTES les pages app. La restyler maintenant crée une cohabitation transitoire (sidebar terracotta + pages encore cuivre) — **assumé** (Uriel a demandé à voir la sidebar). Les autres pages migreront ensuite.

- [ ] **Step 1 : Panneau + logo + switcher**

`.sidebar` : fond verre discret `linear-gradient(180deg, rgba(255,255,255,.022), rgba(255,255,255,.008))` (jour : `.5`/`.22`), `border-right:1px solid var(--hair)`, `backdrop-filter:blur(10px)`. `.sidebar-logo .brand-dot` → `var(--accent)`. `.sidebar-logo .mark` ou avatar entité : dégradé `var(--accent)` (remplace les `#6b4a2e/#3c2a1a` en dur de `.entity .av` → tokens).

- [ ] **Step 2 : Nav — item actif barre terracotta**

`.sidebar-nav a.active` : `color: var(--accent)`, `background: color-mix(in srgb, var(--accent) 12%, transparent)`, et **barre verticale gauche** :

```css
.sidebar-nav a { position: relative; }
.sidebar-nav a.active::before { content:""; position:absolute; left:0; top:9px; bottom:9px; width:2.5px; border-radius:3px; background: var(--accent); box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 60%, transparent); }
.light .sidebar-nav a.active::before { box-shadow: none; }
```

Remplacer tous les `var(--amber)`/`var(--copper)` d'accent **dans Sidebar.css uniquement** par `var(--accent)` (compteur actif, referral, upsell, `.sa-all`, `.sidebar-legal a:hover`, `.entity-dropdown-create`). Pills referral/upsell : gradient `var(--accent), color-mix(in srgb, var(--accent) 65%, #000)`. Retirer les overrides `.light` qui pointaient `hsl(22 78% 42%)` (le token `--accent` gère déjà le jour).

- [ ] **Step 3 : Build + lint + capture sidebar nuit/jour**

Run: `pnpm build && pnpm lint` ✅. Capturer la sidebar sur `/tableau-de-bord` en nuit ET jour, comparer aux maquettes (`.sidebar` des fichiers cockpit-*). Vérifier l'équilibre de poids sidebar↔contenu (la nav ne doit pas voler la vedette).

- [ ] **Step 4 : Commit**

```bash
git add src/components/layout/Sidebar.css src/components/layout/Sidebar.tsx
git commit -m "feat(da): Sidebar — panneau de verre, item actif barre terracotta"
```

---

### Task 7 : Recette jour/nuit finale, gotchas, bump version

**Files:**
- Modify: `src/changelog.ts` (bump `APP_VERSION` patch + entrée)

- [ ] **Step 1 : Checklist gotchas jour/nuit (cf. mémoire `reference_da_daynight_gotchas`)**

Parcourir le Cockpit + Sidebar en jour ET nuit et vérifier : aucun `#fff` en dur cassant un fond clair ; `svg { fill: none }` respecté sur les icônes ; ombres **douces** en jour (pas l'ombre nuit) ; grain en `multiply`/.05 en jour ; pas de liseré blanc parasite sur les boutons colorés en jour (piège connu) ; contrastes terracotta `#b65f3f` suffisants sur clair. Corriger inline ce qui décroche.

- [ ] **Step 2 : Capture headless de référence (preuve)**

`pnpm build && pnpm preview`, capture Edge headless du Cockpit en nuit ET jour (outillage `playwright-core` + `channel:'msedge'`). Conserver/joindre les 2 captures comme preuve de recette. Attendu : conforme aux maquettes, lisible, reposant dans les deux modes.

- [ ] **Step 3 : Bump version + changelog**

Dans `src/changelog.ts` : bump `APP_VERSION` (patch) + entrée « DA sci-fi chaud : Cockpit & Sidebar (accent terracotta, surfaces de verre, hiérarchie clarté) — jour & nuit ».

- [ ] **Step 4 : Build + lint final**

Run: `pnpm build && pnpm lint`
Expected: ✅ / 0 err.

- [ ] **Step 5 : Commit + push**

```bash
git add src/changelog.ts
git commit -m "chore(da): bump version — Cockpit & Sidebar sci-fi chaud (jour+nuit)"
git push origin da/finesse-pro
```

- [ ] **Step 6 : Handoff recette Uriel**

Annoncer : Cockpit + Sidebar livrés sur `da/finesse-pro` (PAS sur prod). Recette live attendue d'Uriel : naviguer le Cockpit en jour et nuit, valider le ressenti « pro/clair/reposant » en usage réel avant de décider (a) d'ajuster, (b) de propager aux autres pages, (c) de merger sur `main`.

---

## Self-Review

**Couverture spec :**
- Tokens nuit+jour → Task 1 ✅ · Verre/grain/ombres → Task 1 (.glass-card) + Task 2 ✅ · Accent terracotta app-only (garde-fou) → Task 1 (additif) + interdits Global Constraints ✅ · Eyebrow mono / chiffres mono → Task 2 ✅ · Statut point+mono → Task 2/4/5 ✅ · Boutons mat/fantôme sans glossy → Task 2 ✅ · Architecture clarté (héros/à venir/colonnes/centré) → Task 3 ✅ · Sidebar → Task 6 ✅ · Périmètre app-only (Landing/vitrine intactes) → Global Constraints + tokens additifs ✅ · Déploiement Cockpit-first + recette jour/nuit → Tasks 5/6/7 ✅.
- **Hors scope assumé** : propagation aux autres pages app (Calendar, Explorer, Réglages…) — lots futurs, non couverts ici (conforme à la stratégie « Cockpit d'abord »).

**Placeholders :** les valeurs de tokens, boutons, grain, layout sont données verbatim. Le détail pixel des composants renvoie explicitement aux 2 maquettes committées comme source de vérité (légitime : ce sont les artefacts validés), avec les classes/valeurs clés listées par composant — pas de « TODO » ni « add error handling ».

**Cohérence des types/classes :** noms de classes cohérents entre tâches (`ck-page-inner`, `ck-hero`, `ck-strip`, `ck-cols`, `ck-eyebrow`, `ck-dot`, `ck-status-hero`, `ck-btn-p`/`ck-btn-ghost`, `--accent`/`--glass`/`--hair`/`--field`/`--name`/`--faint`). Props composants inchangées (vérifié contre `Cockpit.tsx`).

**Note méthode :** DA = pas de tests unitaires pertinents (CSS) ; la porte de chaque tâche est build+lint+capture visuelle jour/nuit, conforme à l'esprit « vérification avant de déclarer fait ».
