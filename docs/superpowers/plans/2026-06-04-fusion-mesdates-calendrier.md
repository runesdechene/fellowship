# Fusion Mes dates → Calendrier — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fusionner « Mes dates » et « Calendrier » en une seule surface « Calendrier » accessible à tous, avec un palier gratuit nerfé (overlay réseau verrouillé), et supprimer la page Mes dates.

**Architecture:** `navModel` rend `calendrier` gratuit et remplace `mes-dates` dans les navs ; `/calendrier` perd son mur `ProTeaser` et verrouille en interne ses filtres réseau pour le gratuit (via `planForActor`) ; `/mes-dates` redirige ; la page MesDates et ses dépendances exclusives sont supprimées.

**Tech Stack:** React 19 + TS, react-router v7, vitest. Spec : `docs/superpowers/specs/2026-06-04-fusion-mesdates-calendrier-design.md`.

---

## File Structure

- Modify: `src/lib/navModel.ts` — calendrier gratuit, mes-dates retiré des navs.
- Test: `src/lib/navModel.test.ts` — assertions mises à jour (pilotent T1).
- Modify: `src/App.tsx` — /calendrier sans ProTeaser, /mes-dates → redirect.
- Modify: `src/components/layout/Sidebar.tsx` — badge compteur sur calendrier.
- Modify: `src/pages/Calendar.tsx` + `src/pages/Calendar.css` — quota, filtres verrouillés, empty hint.
- Delete: `src/pages/MesDates.tsx`, `src/pages/MesDates.css`, `src/components/mes-dates/DateRow.tsx`, `src/lib/mes-dates.ts`, `src/lib/mes-dates.test.ts`.
- Keep: `src/components/mes-dates/DateQuotaModal.tsx` (utilisé par EventPage + Explorer).

---

### Task 1: navModel — calendrier gratuit, mes-dates hors nav (TDD)

**Files:** Modify `src/lib/navModel.ts` · Test `src/lib/navModel.test.ts`

- [ ] **Step 1: Mettre à jour les assertions (RED)** dans `navModel.test.ts`

Remplacer les lignes concernées par :

```ts
// navItemsFor
it('personne → festivalier', () => expect(navItemsFor(person)).toEqual(['explorer','calendrier','mes-createurs','reglages']))
it('entité exposant → cockpit', () => expect(navItemsFor(exposant)).toEqual(['explorer','dashboard','calendrier','communaute','vitrine','reglages']))
```
```ts
// entryState : calendrier devient gratuit
it('calendrier gratuit construit → active', () => expect(entryState('calendrier','free')).toBe('active'))
it('calendrier (pro plan) → active', () => expect(entryState('calendrier','pro')).toBe('active'))
```
```ts
// isRouteValidFor : calendrier valide pour les deux ; tableau-de-bord reste bloqué pour personne
it('calendrier valide pour exposant', () => expect(isRouteValidFor('/calendrier', exposant)).toBe(true))
it('calendrier valide pour personne (désormais gratuit)', () => expect(isRouteValidFor('/calendrier', person)).toBe(true))
it('route Pro réservée reste bloquée pour personne', () => expect(isRouteValidFor('/tableau-de-bord', person)).toBe(false))
```
```ts
// mobilePrimaryFor / mobileSecondaryFor
it('visiteur : 3 primaires = Explorer/Calendrier/Mes créateurs', () => {
  expect(mobilePrimaryFor(person)).toEqual(['explorer', 'calendrier', 'mes-createurs'])
})
it('secondaire exposant = nav moins primaires', () => {
  expect(mobileSecondaryFor(exposant)).toEqual(['communaute', 'vitrine', 'reglages'])
})
```

Supprimer les anciennes assertions devenues fausses : `entryState('calendrier','free')→lock-pro` (l.14), `entryState('mes-dates','free')` (l.18, garder OK car mes-dates reste dans NAV_DEFS — **conserver**), `isRouteValidFor('/calendrier',person)→false` (l.24 ancienne + l.38), `mes-dates valide` (l.25-26), ancien `mobilePrimaryFor(person)` (l.48), ancien `mobileSecondaryFor` (l.52).

- [ ] **Step 2: Run RED** — `pnpm vitest run src/lib/navModel.test.ts`
Expected: FAIL (navItemsFor person contient encore 'mes-dates', calendrier encore lock-pro, etc.)

- [ ] **Step 3: Modifier `navModel.ts`**

`NAV_DEFS.calendrier` :
```ts
  calendrier:      { key: 'calendrier',      to: '/calendrier',      label: 'Calendrier',     icon: 'CalendarDays',    pro: false, built: true },
```
Listes de nav :
```ts
const PERSON_NAV: NavKey[] = ['explorer', 'calendrier', 'mes-createurs', 'reglages']
const EXPOSANT_NAV: NavKey[] = ['explorer', 'dashboard', 'calendrier', 'communaute', 'vitrine', 'reglages']

const PERSON_PRIMARY: NavKey[] = ['explorer', 'calendrier', 'mes-createurs']
const EXPOSANT_PRIMARY: NavKey[] = ['dashboard', 'calendrier', 'explorer']
```
(Laisser `NAV_DEFS['mes-dates']` et `'mes-dates'` dans `RESERVED_TOP` : la redirection en a besoin.)

- [ ] **Step 4: Run GREEN** — `pnpm vitest run src/lib/navModel.test.ts` → PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/navModel.ts src/lib/navModel.test.ts
git commit -m "feat(nav): Calendrier gratuit, retrait de Mes dates des navs (#9 lot 1)"
```

---

### Task 2: Routing — /calendrier libre, /mes-dates redirige

**Files:** Modify `src/App.tsx`

- [ ] **Step 1: Remplacer la route /calendrier** (retirer `<ProTeaser>`)
```tsx
          <Route path="/calendrier" element={<AuthenticatedApp><CalendarPage /></AuthenticatedApp>} />
```

- [ ] **Step 2: Remplacer la route /mes-dates** par une redirection
```tsx
          <Route path="/mes-dates" element={<Navigate to="/calendrier" replace />} />
```

- [ ] **Step 3: Retirer l'import devenu inutile**
Supprimer `import { MesDatesPage } from '@/pages/MesDates'` (ligne 20). Garder l'import `ProTeaser` SI encore utilisé ailleurs (vérifier : `grep -n "ProTeaser" src/App.tsx` — s'il ne reste qu'une occurrence d'import, le retirer aussi).

- [ ] **Step 4: Build** — `pnpm build` → OK (aucune référence cassée)

- [ ] **Step 5: Commit**
```bash
git add src/App.tsx
git commit -m "feat(routing): /calendrier sans mur Pro, /mes-dates redirige (#9 lot 1)"
```

---

### Task 3: Sidebar — badge compteur sur Calendrier

**Files:** Modify `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Déplacer le compteur** (ligne 61)
```tsx
            const showCount = key === 'calendrier' && myDatesCount > 0
```
(Le commentaire l.24 « Compteur Mes dates » peut être laissé ou reformulé « Compteur Calendrier ».)

- [ ] **Step 2: Build** — `pnpm build` → OK

- [ ] **Step 3: Commit**
```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(nav): badge compteur dates sur l'entrée Calendrier (#9 lot 1)"
```

---

### Task 4: CalendarPage — palier gratuit nerfé

**Files:** Modify `src/pages/Calendar.tsx` · `src/pages/Calendar.css`

- [ ] **Step 1: Imports** — ajouter en tête de `Calendar.tsx`
```tsx
import { Link, useNavigate } from 'react-router-dom'
import { planForActor } from '@/lib/navModel'
import { useDateQuota } from '@/hooks/use-date-quota'
```
(Si `Users` de lucide reste utilisé pour les filtres, garder ; aucun retrait ici.)

- [ ] **Step 2: Dérivés free/quota** — après `const { currentActor } = useAuth()`, remplacer par :
```tsx
  const { currentActor, currentActorRow } = useAuth()
  const navigate = useNavigate()
  const isFree = planForActor(currentActor, currentActorRow) !== 'pro'
  const quota = useDateQuota()
```

- [ ] **Step 3: Valeurs effectives des filtres** — juste après les `useState` showMine/showPro/showVisiteurs :
```tsx
  // Le gratuit ne peut pas activer l'overlay réseau : valeurs effectives forcées à false.
  const effShowPro = !isFree && showPro
  const effShowVisiteurs = !isFree && showVisiteurs
```
Puis remplacer dans `friendEventsByMonth` et `mergeWithFriends` (et leurs tableaux de deps) tous les usages de `showPro` → `effShowPro` et `showVisiteurs` → `effShowVisiteurs`. (Les `setShowPro`/`setShowVisiteurs` des boutons restent inchangés mais ne seront atteignables que pour le Pro — cf. Step 5.)

- [ ] **Step 4: Quota dans le header** — dans `.calendar-header`, après le bloc `<div><h1>…</h1><p>…</p></div>` :
```tsx
        {quota.isFreeEntity && (
          <Link to="/reglages" className={'calendar-quota' + (quota.atLimit ? ' at-limit' : '')}>
            <b>{quota.used} / {quota.limit}</b> dates · Pro = illimité
          </Link>
        )}
```

- [ ] **Step 5: Filtres verrouillés** — remplacer les boutons « Amis pro » et « Visiteurs » :
```tsx
        <button
          onClick={() => { if (isFree) { navigate('/boutique'); return } const next = !showPro; setShowPro(next); localStorage.setItem('fellowship-calendar-pro', String(next)) }}
          className={`calendar-filter-btn ${effShowPro ? 'active' : ''} ${isFree ? 'locked' : ''}`}
        >
          {isFree ? <Lock strokeWidth={1.5} /> : <Users strokeWidth={1.5} />}
          Amis pro
        </button>
        <button
          onClick={() => { if (isFree) { navigate('/boutique'); return } const next = !showVisiteurs; setShowVisiteurs(next); localStorage.setItem('fellowship-calendar-visiteurs', String(next)) }}
          className={`calendar-filter-btn ${effShowVisiteurs ? 'active' : ''} ${isFree ? 'locked' : ''}`}
        >
          {isFree ? <Lock strokeWidth={1.5} /> : <Users strokeWidth={1.5} />}
          Visiteurs
        </button>
```
Ajouter `Lock` à l'import lucide : `import { ChevronLeft, ChevronRight, Users, Lock } from 'lucide-react'`.

- [ ] **Step 6: Empty hint** — juste après l'ouverture de `<div className="calendar-page">` (avant `.calendar-topbar`) :
```tsx
      {!loading && participations.length === 0 && partsNext.length === 0 && (
        <div className="calendar-empty-hint">
          Aucune date pour l'instant — <Link to="/explorer">Explorer les festivals</Link>
        </div>
      )}
```

- [ ] **Step 7: CSS** — ajouter à `Calendar.css`
```css
.calendar-quota {
  font-size: 12.5px; color: hsl(var(--muted-foreground)); text-decoration: none;
  border: 1px solid hsl(var(--border)); border-radius: 99px; padding: 5px 12px; white-space: nowrap;
}
.calendar-quota b { color: hsl(var(--foreground)); }
.calendar-quota.at-limit { border-color: var(--copper); color: var(--copper); }
.calendar-filter-btn.locked { opacity: 0.65; }
.calendar-empty-hint {
  text-align: center; color: hsl(var(--muted-foreground)); font-size: 14px;
  padding: 14px; margin-bottom: 8px;
}
.calendar-empty-hint a { color: var(--copper); font-weight: 600; }
```

- [ ] **Step 8: Vérif** — `pnpm vitest run` (vert) ; `pnpm lint` (0 nouveau) ; `pnpm build` (OK)

- [ ] **Step 9: Commit**
```bash
git add src/pages/Calendar.tsx src/pages/Calendar.css
git commit -m "feat(calendrier): palier gratuit (quota + overlay réseau verrouillé + empty) (#9 lot 1)"
```

---

### Task 5: Nettoyage — suppression de la page Mes dates

**Files:** Delete fichiers MesDates exclusifs

- [ ] **Step 1: Vérifier l'absence de référence résiduelle**
```bash
grep -rn "MesDates\|mes-dates'\|from '@/lib/mes-dates'\|components/mes-dates/DateRow\|groupParticipationsByMonth" src --include=*.tsx --include=*.ts | grep -v "DateQuotaModal\|navModel\|RESERVED_TOP\|App.tsx"
```
Expected: aucune ligne (hors `navModel.ts` qui garde l'entrée + la redirection).

- [ ] **Step 2: Supprimer les fichiers**
```bash
git rm src/pages/MesDates.tsx src/pages/MesDates.css src/components/mes-dates/DateRow.tsx src/lib/mes-dates.ts src/lib/mes-dates.test.ts
```

- [ ] **Step 3: Vérif** — `pnpm vitest run` (vert) ; `pnpm build` (OK, aucune référence cassée)

- [ ] **Step 4: Commit**
```bash
git commit -m "chore(cleanup): suppression page Mes dates + DateRow + lib mes-dates (#9 lot 1)"
```

---

### Task 6: Version + changelog + push

- [ ] **Step 1: Bump** `package.json` `0.7.218 -> 0.7.219`

- [ ] **Step 2: Changelog** — nouvelle entrée en tête de `src/changelog.ts`
```ts
  {
    version: '0.7.219',
    date: '2026-06-04',
    title: 'Un seul Calendrier, plus clair',
    changes: [
      '« Mes dates » et « Calendrier » fusionnent : une seule page Calendrier pour tout le monde',
      'En gratuit : tes dates, tes compagnons et ton quota ; Pro débloque la vue réseau (amis pro, visiteurs)',
    ],
  },
```

- [ ] **Step 3: Vérif finale** — `pnpm vitest run` ; `pnpm lint` ; `pnpm build`

- [ ] **Step 4: Commit + push**
```bash
git add package.json src/changelog.ts
git commit -m "chore: bump v0.7.219 (fusion Mes dates -> Calendrier)"
git push
```

---

## Self-Review

- **Spec coverage :** nav (T1), routing + redirect (T2), Sidebar badge (T3), quota + filtres verrouillés + empty hint (T4), suppression MesDates en gardant DateQuotaModal (T5). ✓
- **Route guards :** T1 écrit les tests `isRouteValidFor`/`navItemsFor` en premier → garde-fou avant la modif. ✓
- **Type consistency :** `effShowPro`/`effShowVisiteurs` définis T4 Step 3 et utilisés Step 3/5 ; `isFree`/`quota` définis Step 2. ✓
- **Placeholders :** aucun — code complet. ✓
- **DA jour/nuit :** styles en tokens `hsl(var(--…))` / `var(--copper)`. ✓
- **Risque résiduel :** vérifier au build que `ProTeaser` (T2) n'est plus importé à vide ; `Users` lucide encore utilisé (oui, branche Pro des filtres). ✓
