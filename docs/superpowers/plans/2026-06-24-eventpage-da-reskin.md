# EventPage — re-skin DA « sci-fi chaud » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repeindre l'EventPage (`/e/:slug`) de l'ancienne DA « Nuit de Festival » vers la DA « sci-fi chaud » (verre, billes, `--accent-app`, `--hair`/`--field`), en conservant l'ambiance immersive « affiche floutée » posée sur le nouveau fond `--app-bg`, **sans toucher structure ni fonctions**.

**Architecture:** Re-skin CSS/markup pur, tâche par zone visuelle (fond → héros/compagnons → sidebar/cockpit → stepper → contenu → modales → nettoyage). Aucune logique nouvelle : on swappe les tokens festifs (`--copper`/`--amber`/`--gradient-primary`/`--primary`/`--secondary`) vers les primitives Fondation globales (`.glass-card`, `.da-*`, `--accent-app`, `--hair`, `--field`, `--name`, `--status-*`). Spec : `docs/superpowers/specs/2026-06-24-eventpage-da-reskin-design.md`.

**Tech Stack:** React 19 + TypeScript, Tailwind v4 CSS-first, Vite. CSS bespoke `src/pages/EventPage.css` (+ `EventCard.css`, `ParticipantsModal.css`). Pas de Vitest ici (re-skin).

## Global Constraints

- **Re-skin uniquement.** Structure, ordre des sections, hooks, handlers, données, routes : INCHANGÉS. Aucune extraction de composant, aucune refacto du monolithe `EventPage.tsx` (817 lignes). Les composants morts `EventHero`/`EventDashboardMobile`/`HeroBanner`/`FriendRow` : ni utilisés ni supprimés.
- **Primitives Fondation réutilisées, jamais re-clonées** : carte verre = classe globale **`.glass-card`** (NE PAS re-déclarer verre/grain) ; boutons = `.da-btn`/`-flat`/`-ghost`/`-2`/`-sm` ; statut = **`.da-status` + `.da-dot`** (couleur via `style={{ ['--dot-color']: 'var(--status-xxx)' }}`) ; eyebrow mono = `.da-eyebrow`.
- **Tokens DA uniquement** : `--accent-app`, `--accent-app-ink`, `--app-bg`, `--name`, `--faint`, `--field`, `--hair`, `--status-*`, `hsl(var(--muted-foreground))`, `hsl(var(--foreground))`. Plus aucun `--copper`/`--amber`/`--forest`/`--lime`/`--gradient-primary`/`--primary` ni `hsl(var(--secondary))` **comme surface**. `--status-*`/`--name`/`--faint` conservés. Couleurs de tags (`--tag-accent`/`getTagColor`) conservées (hors DA festive).
- **Garde-fous** : ne PAS toucher `--copper`/`--primary`/`--page-backdrop` **globaux** (`index.css`, Landing/Vitrine), ni `Landing.css`/`Vitrine.css`, ni `--glass` global.
- **Mapping de référence** (cf. spec §Mapping) : `--page-backdrop`→`--app-bg` ; surfaces carte→`.glass-card` ou `--field` ; `--gradient-primary`→`.da-btn-flat`/`--accent-app` ; `--primary`/`--copper`(accent)→`--accent-app` ; `--copper`(bordure)→`--hair` ; `--amber`→`hsl(var(--muted-foreground))` ou `--accent-app` ; `hsl(var(--border))`→`--hair`.
- **Leçon Calendrier (compositing)** : sur un élément verre **compact et empilé**, retirer `box-shadow` ET `backdrop-filter` de `.glass-card` (sinon artefact gris au survol). Appliquer si un cas se présente (ex. lignes du cockpit, items de modale).
- **Leçon Calendrier (cascade)** : toute règle re-déclarant une classe legacy doit venir APRÈS le bloc legacy dans le fichier (legacy non supprimé pendant le re-skin).
- **Jour + nuit** : chaque valeur a sa déclinaison `.light` ; ombres douces en jour ; pas de `#fff` en dur (sauf lettres d'avatar) ; `svg fill:none`. Conserver les overrides `.light` existants en les re-tokenisant.
- **Deux contextes** : exposant connecté (AppLayout + dashboard) ET anonyme (page nue hors AppLayout, sans navbar). Le re-skin doit tenir dans les deux.
- Vérif par tâche = `pnpm build` (tsc+vite) vert + `pnpm lint` 0 nouvelle erreur. Recette visuelle jour+nuit × (anonyme, exposant) = contrôleur/Uriel.
- Commits fréquents, conventional commits. `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Pas de bump/push par les implémenteurs (le contrôleur s'en charge).

---

### Task 1: Fond, ambiance & shell de page

Porter le fond de page sur `--app-bg`, conserver `.event-ambient` (affiche floutée) re-posée dessus, neutraliser les surfaces `--page-backdrop`/`--secondary` du conteneur. AUCUN passage sur `cockpit-stage` (l'app-bg opaque masquerait l'affiche sous la navbar — on veut l'immersion).

**Files:**
- Modify: `src/pages/EventPage.css` (sélecteurs `.event-page`/conteneur racine, `.event-ambient` `:21-69`, `.fest-grid` `:`…)
- Modify si besoin: `src/pages/EventPage.tsx` (si un style de fond inline existe)

**Interfaces:**
- Consumes: tokens globaux `--app-bg`, `--hair` (index.css). `.event-ambient` markup existant (`EventPage.tsx:328-332`).
- Produces: page sur fond `--app-bg` + ambient conservé ; aucune autre tâche n'en dépend structurellement.

- [ ] **Step 1: Repérer le fond actuel**

Run: `rg -n "page-backdrop|--secondary|background" src/pages/EventPage.css | head -30`
Identifier la règle de fond de la racine de page + `.event-ambient` (overlay) + tout `background: hsl(var(--secondary))`/`--page-backdrop`.

- [ ] **Step 2: Fond racine → `--app-bg`**

Sur le conteneur racine de la page (la classe la plus haute, ex. `.event-page`/`.fest-page` ; vérifier le nom réel dans le TSX au rendu de la page), poser :
```css
background: var(--app-bg);
background-attachment: fixed;
min-height: 100%;
```
Retirer tout `--page-backdrop`. Garder `.event-ambient` (affiche floutée) tel quel — il se superpose au fond. Vérifier qu'il reste **sombre-only** (pas d'ambient lourd en `.light` : en jour, fond = app-bg clair seul).

- [ ] **Step 3: Build + lint**

Run: `pnpm build` → succès. `pnpm lint` → pas de nouvelle erreur.

- [ ] **Step 4: Commit**

```bash
git add src/pages/EventPage.css src/pages/EventPage.tsx
git commit -m "refactor(da): EventPage sur fond --app-bg + ambient affiche conservé"
```

---

### Task 2: Héros + bande compagnons

Re-skin du héros (statut festival en bille, eyebrow édition, titre, méta, boutons d'action) et de la bande compagnons + bouton rally.

**Files:**
- Modify: `src/pages/EventPage.tsx` (`:539-643` : `.fest-hero` + `.fest-companions`/rally)
- Modify: `src/pages/EventPage.css` (`.fest-statpill`, `.fest-tag-chip`, `.fest-edition`, `.fest-title`, `.fest-hmeta`, `.fest-hactions`, `.fest-iconbtn`, `.fest-org`, `.fest-rally`, piles d'avatars)

**Interfaces:**
- Consumes: `.da-status`/`.da-dot`/`.da-eyebrow`/`.da-btn-2` (globaux) ; `--status-inscrit`/`--muted-foreground`/`--accent-app`/`--field`/`--hair`/`--name`.
- Produces: héros + compagnons en DA. Réutilisé visuellement par les tâches suivantes (mêmes tokens).

- [ ] **Step 1: Statut festival ouvert/fermé → bille**

Dans le héros (`EventPage.tsx:541`), remplacer `.fest-statpill` par une bille :
```tsx
<span className="da-status" style={{ ['--dot-color' as string]: isOpen ? 'var(--status-inscrit)' : 'var(--muted-foreground)' }}>
  <span className="da-dot" />{isOpen ? 'Inscriptions ouvertes' : 'Inscriptions fermées'}
</span>
```
(reprendre le libellé exact existant). Retirer le CSS `.fest-statpill` festif (ou le re-tokeniser si réutilisé ailleurs — grep d'abord).

- [ ] **Step 2: Eyebrow, titre, méta, actions**

- `.fest-edition` → ajouter la classe `.da-eyebrow` (mono), retirer la couleur festive.
- `.fest-title` (CSS `:216`) → `color: hsl(var(--foreground))` (garder police/letter-spacing).
- Badge privé → fond `color-mix(in srgb, var(--accent-app) 15%, transparent)` + texte `--accent-app` (au lieu de `--primary`).
- `.fest-hmeta` icônes : `color: var(--amber)` → `hsl(var(--muted-foreground))`.
- `.fest-iconbtn` (partage/web/signaler, CSS `:`…) → fond `var(--field)`, bordure `1px solid var(--hair)`, icône `hsl(var(--muted-foreground))` (≈ `.da-btn-2` carré). Adapter `.event-edit-btn`/`.event-review-btn` de la topbar pareil.
- `.fest-org` (créateur) → fond `var(--field)`/bordure `--hair`, nom `--name`.

- [ ] **Step 3: Bande compagnons + rally**

- Pile d'avatars compagnons : bordure `2px solid hsl(var(--card))`, `--hair`, lettres `#fff` (pattern existant). Reprendre le style des piles du Calendrier (`.calendar-pav-item`-like) si cohérent.
- `.fest-rally` (CSS `:374`, mix `--copper`) → `.da-btn-ghost` ou fond `color-mix(in srgb, var(--accent-app) 12%, transparent)` + bordure `color-mix(--accent-app 40%)` + texte `--accent-app`.

- [ ] **Step 4: Build + lint + commit**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur.
```bash
git add src/pages/EventPage.tsx src/pages/EventPage.css
git commit -m "feat(da): héros EventPage + bande compagnons (bille statut, eyebrow, boutons neutres)"
```

---

### Task 3: Sidebar — affiche + cockpit

Re-skin de la colonne `aside.fest-side` : carte cockpit en verre, lignes info, J-x, deadline, CTA « Candidater ». L'`EventDashboard` rendu dedans est traité en Task 4.

**Files:**
- Modify: `src/pages/EventPage.tsx` (`:715-776` : `.event-poster`, `.fest-cockpit`, `.fest-ckrow`, CTA)
- Modify: `src/pages/EventPage.css` (`.event-poster`, `.fest-cockpit` `:489-490`, `.fest-ckrow`, `.fest-jx`/countdown, `.fest-deadline`, `.fest-btn.primary` `:573`)

**Interfaces:**
- Consumes: `.glass-card`, `.da-btn-flat` (globaux) ; `--field`/`--hair`/`--accent-app`/`muted-foreground`.
- Produces: sidebar en DA.

- [ ] **Step 1: Carte cockpit → `.glass-card`**

`EventPage.tsx` : ajouter `glass-card` à la className de `.fest-cockpit`. Dans `EventPage.css:489-490`, retirer `background: linear-gradient(165deg, hsl(var(--secondary)), hsl(var(--card)))` + `border: …var(--copper)` (le verre/grain vient de `.glass-card`). ⚠️ Si la carte cockpit est compacte/longue avec contenu empilé et qu'un artefact gris apparaît au survol d'éléments internes, retirer `box-shadow`/`backdrop-filter` sur les sous-éléments verre concernés (leçon Calendrier).

- [ ] **Step 2: J-x, deadline, lignes info**

- Countdown J-x : chiffre en `--accent-app` (au lieu de `--copper`/`--amber`), label mono `--faint`.
- `.fest-deadline` (`:731-736`) : fond `var(--field)`, bordure `--hair`, texte `muted-foreground` ; accent éventuel `--accent-app`.
- `.fest-ckrow` (emplacement, candidature `:755`, itinéraire `:760`) : séparateurs `--hair`, icônes/texte `muted-foreground`, la ligne « candidature » d'alerte (`--amber`) → `--accent-app`.

- [ ] **Step 3: Affiche + CTA Candidater**

- `.event-poster` (`:715`) : ombre portée → douce en tokens (`.light` douce `rgba(120,90,60,.06)` ; nuit `rgba(0,0,0,.32)`), bordure `--hair`.
- CTA « Candidater » (`.fest-btn.primary`, `:768`) → classes `da-btn da-btn-flat`. Idem CTA acquisition « Découvrir Fellowship » s'il est dans cette zone (sinon Task 5).

- [ ] **Step 4: Build + lint + commit**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur.
```bash
git add src/pages/EventPage.tsx src/pages/EventPage.css
git commit -m "feat(da): sidebar EventPage (cockpit verre, J-x accent, CTA da-btn)"
```

---

### Task 4: EventDashboard — stepper participation + paiement

Re-skin du stepper (mécanique inchangée) : états de participation, sous-stepper paiement, capture montant, note de refus. Statut affiché en billes.

**Files:**
- Modify: `src/components/events/EventDashboard.tsx` (classes ; markup statut)
- Modify: `src/pages/EventPage.css` (`.event-stepper-btn`, `.pay-active.*` `:682-696`, `.event-orient-btn`, `.event-amount-*`)

**Interfaces:**
- Consumes: `participationChip`/`participationDot` (existants, `src/lib/explorer.ts`), `.da-status`/`.da-dot` ; `--status-apayer`/`--status-acompte`/`--status-inscrit`/`--field`/`--hair`.
- Produces: stepper en DA. Aucune autre tâche n'en dépend.

- [ ] **Step 1: Boutons d'étape (stepper)**

`.event-stepper-btn` + état actif `.pay-active.*` (CSS `:682-696`) : fond inactif `var(--field)` + bordure `--hair` + texte `muted-foreground` ; **état actif** = `background: color-mix(in srgb, var(--status-xxx) 18%, transparent)` + `color: var(--status-xxx)` + bordure `color-mix(--status-xxx 40%)`, où `--status-xxx` = la couleur du chip (`participationChip(...).variant` → token). Reprendre exactement le pattern `.calendar-evst.*` du Calendrier.

- [ ] **Step 2: Sous-stepper paiement + capture montant**

- `.event-orient-btn` (toggle « Je paie / On me paie ») → `var(--field)`/`--hair`, actif `--accent-app`.
- `.event-amount-*` (copper/lime/green, `EventDashboard.tsx:188-306`) → `--status-apayer` (à payer/orange), `--status-acompte` (acompte/lime), `--status-inscrit` (payé/vert). Champ montant inline : bordure `--hair`, focus `--accent-app`.
- Bloc « Acompte versé : X € » / « Payé : X € » : texte dans la teinte du statut, **sans bordure** (piège du liseré blanc en jour, déjà connu).

- [ ] **Step 3: Statut en bille + note de refus**

- Là où le dashboard affiche le statut courant en texte/pastille, utiliser `.da-status` + `.da-dot` via `participationDot(status, payment, kind, {isPast})`.
- Textarea note de refus (`refusal_note`) : fond `var(--field)`, bordure `--hair`, focus `--accent-app`.

- [ ] **Step 4: Build + lint + commit**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur.
```bash
git add src/components/events/EventDashboard.tsx src/pages/EventPage.css
git commit -m "feat(da): EventDashboard stepper + paiement (états --status-*, billes)"
```

---

### Task 5: Contenu principal — cartes & placeholders

Re-skin des cartes de la colonne principale : À propos, Infos pratiques (`FestivalFacts`), Notes privées, Avis (`ReviewSummary`), Bilan (`BilanCard`), Discussion (placeholder), CTA acquisition.

**Files:**
- Modify: `src/pages/EventPage.tsx` (`:645-710` : À propos, FestivalFacts wrap, notes, avis, bilan, acquisition CTA)
- Modify: `src/pages/EventPage.css` (cartes `.fest-card`/sections, `.fest-facts`…)
- Modify: `src/components/events/FestivalFacts.tsx` (classes cellules)
- Modify: `src/components/events/DiscussionTeaser.tsx` (coquille placeholder en tokens DA)

**Interfaces:**
- Consumes: `.glass-card`, `.da-btn-2`/`.da-btn-flat` ; `--field`/`--hair`/`muted-foreground`/`--accent-app`.
- Produces: contenu principal en DA. La Discussion **reste un placeholder** (juste re-skin de la coquille).

- [ ] **Step 1: Cartes de section → `.glass-card`**

Pour chaque carte de section (À propos `:645`, conteneur FestivalFacts `:653`, Notes privées `:673`, coquilles Avis `:698`/Bilan `:710`) : remplacer le fond `hsl(var(--secondary))`/`--card` + bordures festives par la classe `.glass-card` (sur le wrapper) ou `--field`/`--hair`. Titres de section → `.da-eyebrow` ou `--name`.

- [ ] **Step 2: FestivalFacts (cellules)**

`FestivalFacts.tsx` : cellules de faits → fond `var(--field)`, bordure `--hair`, label `--faint` (mono), valeur `--name`, icône `hsl(var(--muted-foreground))` ou `--accent-app`. Pas de `--amber`.

- [ ] **Step 3: Discussion placeholder + CTA acquisition**

- `DiscussionTeaser.tsx` : coquille floutée + badge « Bientôt » → tokens DA (`--field`/`--hair`/`muted-foreground` ; badge `--accent-app`). Garder `inert`, aucune donnée.
- CTA acquisition « Découvrir Fellowship » (`:666`, anon) → `da-btn da-btn-flat`.

- [ ] **Step 4: Build + lint + commit**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur.
```bash
git add src/pages/EventPage.tsx src/pages/EventPage.css src/components/events/FestivalFacts.tsx src/components/events/DiscussionTeaser.tsx
git commit -m "feat(da): contenu EventPage (cartes verre, facts, discussion placeholder)"
```

---

### Task 6: Modales — Participants, Comment candidater, Quota

Re-skin des coquilles de modale (verre + tokens), statuts en billes. Fonctions inchangées.

**Files:**
- Modify: `src/components/events/ParticipantsModal.tsx` + `src/components/events/ParticipantsModal.css`
- Modify: `src/components/events/HowToApplyModal.tsx`
- Modify: `src/components/mes-dates/DateQuotaModal.tsx` (si rendu depuis EventPage)

**Interfaces:**
- Consumes: `.glass-card`, `.da-status`/`.da-dot`, `participationDot` ; `--field`/`--hair`/`muted-foreground`/`--accent-app`.
- Produces: modales en DA.

- [ ] **Step 1: ParticipantsModal**

Coquille (overlay + panneau) → overlay `rgba(0,0,0,.5)`, panneau `.glass-card`. Lignes participant : avatar (gradient/letter pattern), nom `--name`, statut → bille `.da-status`/`.da-dot` via `participationDot`. Retirer `GRADIENTS`/`hashName` dupliqués si triviaux à mutualiser, SINON laisser (hors scope refacto). Re-tokeniser `ParticipantsModal.css`.

- [ ] **Step 2: HowToApplyModal**

Coquille → `.glass-card`/tokens. Bouton copier email / lien inscription / « Marquer comme candidaté » → `.da-btn-2`/`.da-btn-flat`. Note d'alerte `--amber` → `--accent-app`.

- [ ] **Step 3: DateQuotaModal**

Si rendu depuis EventPage : coquille → `.glass-card`/tokens, CTA → `.da-btn-flat`. (Sinon, noter qu'il est traité ailleurs et ne pas le toucher.)

- [ ] **Step 4: Build + lint + commit**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur.
```bash
git add src/components/events/ParticipantsModal.tsx src/components/events/ParticipantsModal.css src/components/events/HowToApplyModal.tsx src/components/mes-dates/DateQuotaModal.tsx
git commit -m "feat(da): modales EventPage (verre + billes statut)"
```

---

### Task 7: Boutons restants, nettoyage & audit non-régression

Convertir tout `.fest-btn`/`.event-*` restant en `.da-btn*`, supprimer le CSS festif devenu mort, et vérifier par grep qu'il ne reste aucun token festif comme surface.

**Files:**
- Modify: `src/pages/EventPage.tsx`, `src/pages/EventPage.css`, sous-composants touchés.

- [ ] **Step 1: Boutons restants**

Run: `rg -n "fest-btn|gradient-primary|var\(--copper\)|var\(--amber\)" src/pages/EventPage.tsx src/pages/EventPage.css src/components/events/`
Convertir chaque `.fest-btn.primary`→`da-btn da-btn-flat`, `.fest-btn.ghost`→`da-btn da-btn-ghost`, neutres→`da-btn-2`. Retirer les déclarations `.fest-btn*` devenues inutilisées.

- [ ] **Step 2: Audit non-régression tokens**

Run: `rg -n "\-\-copper|\-\-amber|\-\-forest|\-\-lime|gradient-primary|page-backdrop|hsl\(var\(--secondary\)\)" src/pages/EventPage.css`
Expected: **0 hit comme surface/accent**. Tout hit restant doit être justifié (ex. couleur de tag) ou converti. Vérifier aussi `EventPage.tsx` (className/style inline, ex. `accent-[var(--copper)]` `:519` → `accent-[var(--accent-app)]`).

- [ ] **Step 3: Audit jour/nuit**

Run: `rg -n "\.light" src/pages/EventPage.css | head -40`
Vérifier que chaque override `.light` re-tokenisé est cohérent (ombres douces, pas de `#fff` en dur hors avatars, `svg fill:none`).

- [ ] **Step 4: Build + lint final**

Run: `pnpm build` → succès. `pnpm lint` → 0 nouvelle erreur, pas d'import/classe inutilisée.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(da): EventPage — boutons da-btn restants + nettoyage CSS festif mort"
```

---

## Self-Review

**Couverture spec :**
- §1 Fond/ambiance (app-bg + ambient conservé, pas de cockpit-stage) → Task 1 ✓.
- §3 Héros (bille statut, eyebrow, titre, méta, actions neutres, tag chip conservé) → Task 2 ✓.
- §Compagnons → Task 2 ✓.
- §Sidebar affiche + cockpit (glass-card, J-x, deadline, ckrows, Candidater) → Task 3 ✓.
- §EventDashboard stepper + paiement (états `--status-*`, billes) → Task 4 ✓.
- §Contenu (À propos, Infos/FestivalFacts, Notes, Avis, Bilan, Discussion placeholder, acquisition CTA) → Task 5 ✓.
- §Modales (Participants, HowToApply, DateQuota) → Task 6 ✓.
- §Mapping tokens + boutons da-btn + grep non-régression + jour/nuit → réparti T2-T6, soldé Task 7 ✓.
- §Non-goals (pas de refacto monolithe, Discussion reste placeholder, pas d'éditions/contacts/distance) → respecté (aucune tâche ne les ajoute) ✓.
- §Contextes (anon + exposant) → vérif visuelle finale (les deux) par Uriel ; le re-skin ne touche pas le gating ✓.

**Placeholder scan :** aucun TBD. Chaque tâche cite les sélecteurs réels (lignes de la carte d'exploration) + le mapping de token exact. Pas de test inventé (re-skin sans logique — vérif = build/lint/visuel, annoncé).

**Type/classe consistency :** `.glass-card`, `.da-btn*`, `.da-status`/`.da-dot` (avec `--dot-color`), `.da-eyebrow` utilisés à l'identique partout. `participationChip`/`participationDot` consommés en T4/T6 avec la signature existante. Mapping de tokens identique d'une tâche à l'autre (cf. Global Constraints).
