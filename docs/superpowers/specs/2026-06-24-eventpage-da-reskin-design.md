# EventPage — re-skin DA « sci-fi chaud » — Design

> Spec d'un **re-skin DA pur** : on porte l'EventPage (`/e/:slug`, `/evenement/:id`) de l'ancienne DA « Nuit de Festival » vers la nouvelle DA « sci-fi chaud », **sans toucher à la structure ni aux fonctions**. 2ᵉ page de la propagation DA (après le Calendrier).

## Goal

L'EventPage est aujourd'hui à ~100 % l'ancienne DA festive (45 usages de `--copper`/`--amber`/`--forest`/`--lime`/`--gradient-primary`/`hsl(var(--secondary))`, 0 usage de la nouvelle DA). On la repeint avec les primitives Fondation (`.glass-card`, `.da-*`, `--accent-app`, `--hair`, `--field`, `--name`, `--status-*`) **en conservant** son ambiance immersive « affiche du festival floutée », mais posée sur la nouvelle couleur de fond `--app-bg`.

Décision produit : l'EventPage est **à la fois une vitrine publique** (visiteurs anonymes, liens partagés) **et un cockpit de travail** pour l'exposant connecté. On garde donc l'immersif (touche vitrine) tout en alignant la DA sur le reste de l'app.

## Global Constraints

- **Scope = re-skin uniquement.** Structure de page, ordre des sections, hooks, handlers, données, routes : **inchangés**. Aucune extraction de composant, aucune refacto du monolithe `EventPage.tsx` (817 lignes) même si le smell existe — **hors scope** (à traiter dans un chantier dédié plus tard).
- **Primitives Fondation réutilisées, jamais re-clonées** : carte verre = classe globale `.glass-card` (verre + grain via `::before`, ne PAS re-déclarer) ; boutons = `.da-btn`/`-flat`/`-ghost`/`-2`/`-sm` ; statut = `.da-status` + `.da-dot` (couleur via `style={{ ['--dot-color']: 'var(--status-xxx)' }}`) ; eyebrow mono = `.da-eyebrow`.
- **Tokens DA uniquement** : `--accent-app`, `--accent-app-ink`, `--app-bg`, `--name`, `--faint`, `--field`, `--hair`, `--status-*`, `hsl(var(--muted-foreground))`, `hsl(var(--foreground))`. Plus aucun `--copper`/`--amber`/`--forest`/`--lime`/`--gradient-primary`/`--primary` ni `hsl(var(--secondary))` comme surface dans `EventPage.css` / le markup. On garde `--status-*` (déjà partagés, non festifs).
- **Garde-fous** : ne PAS toucher `--copper`/`--primary`/`--page-backdrop` **globaux** (consommés par Landing/Vitrine festives), ni `Landing.css`/`Vitrine.css`. Ne pas toucher `--glass` global (l'éclaircir avait cassé le Cockpit — leçon Calendrier).
- **Jour + nuit** : chaque valeur a sa déclinaison `.light` ; ombres douces en jour ; pas de `#fff` en dur (sauf lettres d'avatar, pattern existant) ; `svg fill:none`.
- **Leçons Calendrier** :
  - `.glass-card` est conçu pour de **grandes cartes**. Sur des items **compacts empilés**, sa grosse `box-shadow` + son `backdrop-filter: blur` créent des artefacts de compositing au survol (zone grise). Si un élément verre re-skinné est compact et empilé → retirer `box-shadow`/`backdrop-filter` sur cet élément.
  - Quand on ajoute une règle CSS qui re-déclare une classe legacy, la placer **après** le bloc legacy (cascade) tant que le legacy n'est pas supprimé.
- **Scroll** : scroll de page unique, jamais de scroll interne imbriqué.
- **Deux contextes à recetter** (cf. §Contextes) : visiteur **anonyme** (page nue, hors AppLayout) ET **exposant connecté** (dans AppLayout, dashboard complet).
- Vérif : `pnpm build` + `pnpm lint` verts. Recette visuelle jour+nuit × (anonyme, exposant) par le contrôleur/Uriel.
- Commits fréquents, conventional commits, `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Fond & ambiance (§1)

- **Base de fond** = `--app-bg` (radial DA) au lieu du `--page-backdrop` festif. La page **n'est PAS mise sur `cockpit-stage`** : l'app-bg opaque du stage masquerait l'affiche floutée sous la navbar, or on veut justement l'immersion en haut. La navbar n'ayant plus de bande (`::before { content:none }` tué globalement, leçon Calendrier), elle est transparente → l'affiche floutée transparaît sous elle. ✅
- **`.event-ambient`** (affiche floutée fixée derrière le héros, `EventPage.css:21-69`) = **conservée** comme couche immersive, re-posée sur `--app-bg`. Reste **sombre-only** (comme aujourd'hui) ; en **jour**, fond = `--app-bg` clair propre, sans ambient (précédent Calendrier — pas d'ambient lourd en jour).
- Aucune autre surface ne doit rester en `--page-backdrop`/`--secondary`.

## Re-skin section par section

> Référence de structure : grille 2 colonnes `.fest-grid` (contenu + `aside.fest-side`). Cf. carte d'exploration.

1. **Topbar** (`EventPage.tsx:334-357`) — Retour, (exposant) « Laisser mon avis » + crayon édition : boutons → `.da-btn-2`/`.da-btn-ghost` ; icônes en `muted-foreground`.
2. **Héros** (`:539-605`) :
   - Statut festival **ouvert/fermé** (`.fest-statpill`) → bille `.da-status` + `.da-dot` (ouvert = `--status-inscrit`, fermé = `--muted-foreground`).
   - Tag chip coloré (`--tag-accent`) **conservé** (couleurs de tags, hors DA festive).
   - Label édition (`.fest-edition`) → `.da-eyebrow` (mono).
   - Titre `h1.fest-title` → couleur `hsl(var(--foreground))`/`--name`, police titre conservée.
   - Badge privé → pill teintée `--accent-app` (au lieu de `--primary`).
   - Méta (date, lieu) : icônes `--amber` → `hsl(var(--muted-foreground))`.
   - Actions carrées (partage / site / signaler) `.fest-iconbtn` → `.da-btn-2` (neutre `--field`/`--hair`).
   - « Ajouté par » créateur : carte/lien en tokens DA.
3. **Compagnons** (`:608-643`, si `friendCount>0`) : bande d'avatars + bouton « rally ». Pile d'avatars = pattern `.calendar-pav`-like (réutiliser le style des piles, `--card`/`--hair`) ; bouton rally `.fest-rally` (mix `--copper`) → `.da-btn-ghost`/teinte `--accent-app`. Ouvre `ParticipantsModal` (inchangé fonctionnellement).
4. **À propos** (`:645-650`) : carte description rich-text → `.glass-card`.
5. **Infos pratiques** (`FestivalFacts`, `:653`) : grille de faits → `.glass-card` ou cellules `--field`/`--hair` ; icônes en `muted-foreground`/`--accent-app`.
6. **Discussion** (`DiscussionTeaser`, `:656`) : **reste placeholder** ; on re-skin juste la coquille (flou + badge « Bientôt ») en tokens DA. Pas de données, `inert` conservé.
7. **Acquisition CTA** « Découvrir Fellowship » (anon, `:659-670`) : `.fest-btn.primary` → `.da-btn-flat`.
8. **Mes notes privées** (`:673-692`, acteur connecté) : carte → `.glass-card` ; bouton ajout → `.da-btn-2`.
9. **Avis exposants** (`ReviewSummary`, `:698-707`) : coquille → tokens DA (le composant lui-même hors scope sauf classes festives directes).
10. **Bilan** (`BilanCard`, `:710`) : coquille → tokens DA (Pro-lock interne inchangé).
11. **Sidebar — affiche** (`.event-poster`, `:715-723`) : conservée (ratio 2:3) ; ombre adoucie en tokens DA (douce en jour).
12. **Cockpit sidebar** (`.fest-cockpit`, `:725-776`) : carte → `.glass-card` (retirer `linear-gradient(--secondary,--card)` + bordure `--copper`). J-x countdown, deadline, lignes info (emplacement, candidature, itinéraire `.fest-ckrow`) en `--field`/`--hair`/`muted-foreground`. CTA « Candidater » → `.da-btn-flat`. Itinéraire = lien externe (inchangé).
13. **EventDashboard (stepper)** (`EventDashboard.tsx`, rendu dans le cockpit) : **mécanique inchangée**. Re-skin : `.event-stepper-btn` + `.pay-active.*` → fonds `color-mix(--status-* …)` + `--field`/`--hair` ; toggle orientation + capture montant (`.event-orient-btn`, `.event-amount-*` copper/lime/green) → `--status-apayer`/`--status-acompte`/`--status-inscrit`. Statut affiché = billes `.da-status`/`.da-dot`.
14. **Modales** (`ParticipantsModal`, `HowToApplyModal`, `DateQuotaModal`) : coquilles → `.glass-card`/tokens DA ; statuts en billes. Fonctions inchangées.

## Mapping de tokens (ancien → nouveau)

| Ancien (festif) | Nouveau (DA travail) |
|---|---|
| `--page-backdrop` (fond page) | `--app-bg` |
| `hsl(var(--secondary))` / `--card` (surfaces cartes) | `.glass-card` (verre) ou `--field` (cellules) |
| `--gradient-primary` (CTA) | `--accent-app` (`.da-btn-flat`) |
| `--primary` (accents/badges) | `--accent-app` |
| `--copper` (bordures/accents) | `--hair` (bordures) / `--accent-app` (accent) |
| `--amber` (icônes/accents) | `hsl(var(--muted-foreground))` / `--accent-app` |
| `--forest`/`--lime`/`--green` (statuts) | `--status-inscrit`/`--status-acompte`/… (déjà mappés) |
| bordures dures `hsl(var(--border))` | `--hair` |

(`--status-*`, `--name`, `--faint` : déjà DA, conservés.)

## Contextes (à recetter tous les deux)

- **(a) Exposant connecté** (`currentActor.kind === 'entity'`) : topbar crayon + (passé) « Laisser mon avis » ; `EventDashboard` complet (stepper 3 états + Refusé + note ; sous-stepper paiement + capture montant) ; cockpit extras (emplacement, candidature, CTA Candidater) ; deadline, Avis, Bilan. Personne connectée non-entité = stepper court (Repéré / J'y vais).
- **(b) Visiteur anonyme** (`!user`) : **page nue hors AppLayout** (`App.tsx:94`) — pas de navbar, pas de dashboard, pas de notes/avis/bilan ; voit héros + description + infos + Discussion placeholder + CTA acquisition + partage/itinéraire. ⚠️ Vérifier que le re-skin tient **sans la navbar** (la page nue porte son propre fond `--app-bg` + ambient).

## Non-goals (YAGNI)

- Activer la Discussion (reste placeholder).
- Créer une section « éditions précédentes » (n'existe pas ; seul le n° d'édition est affiché — on ne l'ajoute pas).
- Section contacts/distance dédiée (contacts vivent dans `HowToApplyModal`, distance = lien Maps — inchangés).
- Refacto du monolithe `EventPage.tsx`, extraction `EventHero`/`EventCockpit`/`useEventPageData` (les composants morts `EventHero`/`EventDashboardMobile`/`HeroBanner`/`FriendRow` restent tels quels — on ne les supprime pas dans ce chantier, mais on ne les utilise pas non plus).
- Modifier le comportement du stepper, du paiement, des avis, du bilan, des modales.

## Vérification

- `pnpm build` (tsc + vite) vert ; `pnpm lint` 0 erreur, pas d'import inutilisé.
- Grep de non-régression : 0 `--copper`/`--amber`/`--gradient-primary`/`--page-backdrop`/`hsl(var(--secondary))` **comme surface** restant dans `EventPage.css` (hors usages légitimes éventuels documentés).
- Recette visuelle (Uriel) : jour + nuit × (anonyme via lien incognito, exposant connecté), incluant le stepper de participation et les 3 modales.
