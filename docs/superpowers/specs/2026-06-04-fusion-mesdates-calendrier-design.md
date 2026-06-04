# Fusion Mes dates → Calendrier — design (#9, lot 1)

- **Date :** 2026-06-04
- **Auteurs :** Uriel (CEO) · Claude (XO)
- **Statut :** `validé` (design approuvé, prêt pour le plan)
- **Source :** roadmap `docs/decisions/0003-roadmap-retours-cliente-1.md` retour #9 (lisibilité « une info = un endroit canonique »). Décision d'Uriel : « Mes dates » est inutile, le gratuit devrait être le Calendrier nerfé.

## Problème

Deux surfaces montrent « tes dates » : **Mes dates** (page gratuite, liste par mois) et
**Calendrier** (page Pro, grille 12 mois glissants + overlay réseau). C'est exactement le
dédoublement que le retour stratégique #9 dénonce. En prime, « Mes dates » ne ressemble pas au
produit Pro, donc c'est un mauvais teaser de conversion.

## Décision

Fusionner en **une seule surface, le Calendrier**, accessible à tous, avec un palier gratuit
nerfé. Le Calendrier nerfé devient le meilleur teaser Pro (le gratuit voit le vrai produit avec
l'overlay réseau verrouillé en place).

**C'est le lot 1 de #9.** Le reste de l'audit lisibilité (dates sur la page compte, dédoublonnage
Cockpit ↔ Calendrier) fera l'objet d'autres lots — hors périmètre ici.

## Décisions de cadrage (validées)

| Sujet | Décision |
|-------|----------|
| Ligne gratuit / Pro | **Inchangée**, exprimée dans une seule surface : GRATUIT = tes dates en vue calendrier + compagnons sur TES dates + quota ; PRO = overlay réseau « Amis pro / Visiteurs » (verrouillé en place pour le gratuit) |
| Nom dans la nav | **« Calendrier » pour tous** |
| Dates passées | **Navigation par année suffit** ; on retire l'onglet « Passées » de l'ancienne page |

## Architecture

### A. Nav & routing

**`src/lib/navModel.ts` :**
- `NAV_DEFS.calendrier` passe `pro: false` (la page devient libre ; le nerf est interne, pas un mur de page).
- `PERSON_NAV` : `['explorer', 'calendrier', 'mes-createurs', 'reglages']` (remplace `mes-dates`).
- `EXPOSANT_NAV` : `['explorer', 'dashboard', 'calendrier', 'communaute', 'vitrine', 'reglages']` (retrait de `mes-dates`).
- `PERSON_PRIMARY` (BottomBar) : `['explorer', 'calendrier', 'mes-createurs']`.
- `EXPOSANT_PRIMARY` : inchangé (contient déjà `calendrier`).
- L'entrée `NAV_DEFS['mes-dates']` et `'mes-dates'` dans `RESERVED_TOP` sont **conservées** (la route de redirection en a besoin).

**`src/App.tsx` :**
- `/calendrier` : retirer l'enveloppe `<ProTeaser>` → `<AuthenticatedApp><CalendarPage /></AuthenticatedApp>`.
- `/mes-dates` : devient `<Route path="/mes-dates" element={<Navigate to="/calendrier" replace />} />` (anciens liens/bookmarks). Placée hors `AuthenticatedApp` (simple redirection, pas de garde).

**`src/components/layout/Sidebar.tsx` :** le badge compteur (`myDatesCount`) passe de la clé `mes-dates` à `calendrier`.

### B. CalendarPage — palier gratuit nerfé

`src/pages/Calendar.tsx`, gardé par `planForActor(currentActor, currentActorRow)` :

- **Quota gratuit** : porter l'indicateur de MesDates via `useDateQuota` dans le header (`quota.isFreeEntity` → `X / Y dates · Pro = illimité`, lien `/reglages`).
- **Filtres overlay verrouillés (gratuit)** : « Amis pro » et « Visiteurs » rendus avec une icône 🔒 ; `showPro`/`showVisiteurs` forcés à `false` ; le clic navigue vers `/boutique` au lieu de toggler. « Mes dates » reste actif. Les compagnons sur tes propres dates restent affichés (déjà indépendants de ces filtres dans `CalendarMonth`/`MobileAgenda`).
- **Empty hint global** : si l'acteur n'a aucune date (à venir comme passée sur la fenêtre), afficher un petit bandeau en tête « Aucune date — Explorer les festivals » (lien `/explorer`), pour conserver le nudge d'onboarding qu'offrait MesDates.

### C. Nettoyage

- **Supprimer** : `src/pages/MesDates.tsx`, `src/pages/MesDates.css`, `src/components/mes-dates/DateRow.tsx`, `src/lib/mes-dates.ts`, `src/lib/mes-dates.test.ts`.
- **Conserver** : `src/components/mes-dates/DateQuotaModal.tsx` (utilisé par EventPage + Explorer).

### D. Tests (TDD)

- `src/lib/navModel.test.ts` : mettre à jour les assertions pour refléter la nouvelle nav — `navItemsFor(person)`/`navItemsFor(exposant)`, `mobilePrimaryFor(person)`, `mobileSecondaryFor`, `entryState('calendrier','free') === 'active'`, `isRouteValidFor('/calendrier', person) === true`. Ces tests **pilotent** la modif de `navModel` (RED puis GREEN).
- Pas de nouvelle logique pure ailleurs : le nerf est de l'UI conditionnée par `planForActor` (vérif build + visuel jour/nuit).

## Risques & vérification

- **Route guards** : ne pas casser `isRouteValidFor` (le `useEffect` d'AppLayout redirige toute route hors nav). Les tests navModel couvrent ce point → écrits en premier.
- **Liens internes** : `/mes-dates` couvert par la redirection ; aucun autre lien dur vers `/mes-dates` hors nav (vérifié).
- Vérif : `pnpm vitest run`, `pnpm lint`, `pnpm build` ; contrôle visuel jour/nuit du Calendrier gratuit (quota + filtres verrouillés) cf. [reference_da_daynight_gotchas].

## Hors périmètre (YAGNI / autres lots #9)

- Onglet/affordance « passées » dédiée (nav année suffit).
- Retrait des dates de la page compte ; dédoublonnage Cockpit ↔ Calendrier.
- Changement de la ligne freemium (on garde la frontière actuelle).
- Toute refonte visuelle du Calendrier au-delà du quota + verrous.

## Lié à

- `docs/decisions/0003-roadmap-retours-cliente-1.md` (#9)
- Mémoire : matrice gratuit/Pro, Pro par entité, Mes dates page, Réglages vs Vitrine.
