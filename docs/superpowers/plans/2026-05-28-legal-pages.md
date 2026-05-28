# Pages légales Fellowship — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre Fellowship en conformité juridique (LCEN, RGPD, Code conso B2B) en livrant 5 pages publiques (Mentions légales, Confidentialité, CGU, CGV, Charte communautaire), leurs accès dans la sidebar et l'AccountSheet, plus les cross-links contextuels (ReportContentModal, Landing footer, consentement Onboarding).

**Architecture :** 5 routes publiques `/legal/*` hors `<AuthenticatedApp>` (accessibles non-connecté). Toutes les pages utilisent un `LegalLayout` partagé. Constantes éditeur centralisées dans `src/lib/legal.ts`. Liens text minimal en pied de sidebar (variant A : « Mentions · Confidentialité · CGV »), pas de popover. CGU et Charte accessibles via cross-links contextuels (sidebar interne du layout, modal signalement, onboarding).

**Tech Stack :** React 19 + TypeScript 5.9 + React Router v7, Tailwind v4 (CSS-first) + CSS modules de composant, tokens HSL (`hsl(var(--...))`). Pas de dépendance nouvelle requise.

**Spec source :** `docs/superpowers/specs/2026-05-28-legal-pages-design.md` (commit `a1b5810`). Contient tous les textes juridiques verbatim — chaque task de page renvoie à la section concernée pour le contenu rédactionnel.

**Pièges à connaître (lus depuis memory) :**
- `reference_da_daynight_gotchas` — uniquement tokens HSL, pas de `#fff` en dur, vérifier mode jour + mode nuit.
- `reference_applayout_route_guard` — les routes `/legal/*` doivent rester **hors** de `<AuthenticatedApp>`, sinon `AppLayout` les vire.
- `feedback_css_token_audit` — avant d'introduire un nouveau token CSS, grep `hsl(var(...))` pour confirmer le format en usage.
- `reference_security_hook_innerhtml` — pas de chaîne contenant `<` suivi de `script` dans les sources (le hook PreToolUse bloque).
- `reference_react_test_infra` — `RTL.render()` ne flush pas le rendu sync sur ce stack ; tester via fonctions pures uniquement.

---

## File Structure

**Nouveaux fichiers :**
- `src/lib/legal.ts` — constantes éditeur + tableau `LEGAL_DOCS` + helper `getOtherLegalDocs(currentSlug)`
- `src/components/legal/LegalLayout.tsx` — layout commun (header, body, sidebar interne, footer)
- `src/components/legal/LegalLayout.css` — styles (incl. print-friendly)
- `src/pages/legal/MentionsLegales.tsx`
- `src/pages/legal/Confidentialite.tsx`
- `src/pages/legal/CGU.tsx`
- `src/pages/legal/CGV.tsx`
- `src/pages/legal/Charte.tsx`
- `src/lib/__tests__/legal.test.ts` — unit test du helper `getOtherLegalDocs`

**Fichiers modifiés :**
- `src/App.tsx` — 5 nouvelles routes `/legal/*` insérées avant `/:slug`
- `src/lib/navModel.ts` — ajout `'legal'` dans `RESERVED_TOP`
- `src/components/layout/Sidebar.tsx` — bloc `sidebar-legal` après `side-foot`
- `src/components/layout/Sidebar.css` — règles `.sidebar-legal`
- `src/components/layout/AccountSheet.tsx` — bloc `sheet-legal` après `sheet-logout`
- `src/components/layout/AccountSheet.css` — règles `.sheet-legal`
- `src/components/reports/ReportContentModal.tsx` — lien « Voir la charte » avant les actions
- `src/components/reports/ReportContentModal.css` — règle pour le lien
- `src/pages/Landing.tsx` — 3 liens légaux dans le `<footer>`
- `src/pages/Landing.css` — règle pour le rang de liens
- `src/pages/Onboarding.tsx` — checkbox de consentement bloquante sur l'étape `choice`
- `src/pages/Onboarding.css` — règle pour la checkbox de consentement
- `package.json` — bump `version`

---

## Task 1 : Constantes éditeur & helper

**Files:**
- Create: `src/lib/legal.ts`
- Test: `src/lib/__tests__/legal.test.ts`

- [ ] **Step 1 : Écrire le test du helper**

Créer `src/lib/__tests__/legal.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { getOtherLegalDocs, LEGAL_DOCS } from '../legal'

describe('getOtherLegalDocs', () => {
  it('renvoie les 4 autres docs en excluant celui passé en paramètre', () => {
    const others = getOtherLegalDocs('cgu')
    expect(others).toHaveLength(4)
    expect(others.find(d => d.slug === 'cgu')).toBeUndefined()
  })

  it('renvoie les 5 docs si le slug ne correspond à rien', () => {
    const all = getOtherLegalDocs('inconnu')
    expect(all).toHaveLength(5)
  })

  it('préserve l\'ordre déclaré dans LEGAL_DOCS', () => {
    const others = getOtherLegalDocs('mentions-legales')
    expect(others.map(d => d.slug)).toEqual([
      'confidentialite',
      'cgu',
      'cgv',
      'charte-communautaire',
    ])
  })

  it('LEGAL_DOCS contient les 5 documents attendus', () => {
    const slugs = LEGAL_DOCS.map(d => d.slug)
    expect(slugs).toEqual([
      'mentions-legales',
      'confidentialite',
      'cgu',
      'cgv',
      'charte-communautaire',
    ])
  })
})
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
pnpm test src/lib/__tests__/legal.test.ts
```

Attendu : ÉCHEC (module `../legal` n'existe pas).

- [ ] **Step 3 : Écrire `src/lib/legal.ts`**

```ts
export const LEGAL = {
  company: 'LAHOUSSAYE EI',
  rcs: '844 256 537 00011 RCS NICE',
  vat: 'FR04844256537',
  address: '421 Chemin du Baudaric, 06390 Contes, France',
  email: 'contact@runesdechene.com',
  brand: 'FELLOWSHIP (marque déposée à l\'INPI)',
  director: 'Uriel Lahoussaye',
  hosting: {
    name: 'Netlify, Inc.',
    address: '512 2nd Street, Suite 200, San Francisco, CA 94107, USA',
    privacy: 'https://www.netlify.com/privacy/',
  },
  database: {
    name: 'Supabase, Inc.',
    address: 'Delaware, USA — instance européenne hébergée à Francfort',
    privacy: 'https://supabase.com/privacy',
  },
  payment: {
    name: 'Stripe Payments Europe, Limited',
    address: '1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irlande',
    privacy: 'https://stripe.com/fr/privacy',
  },
  lastUpdated: '2026-05-28',
} as const

export type LegalDoc = { slug: string; label: string; short: string }

export const LEGAL_DOCS: readonly LegalDoc[] = [
  { slug: 'mentions-legales',      label: 'Mentions légales',                    short: 'Mentions' },
  { slug: 'confidentialite',       label: 'Politique de confidentialité',        short: 'Confidentialité' },
  { slug: 'cgu',                   label: "Conditions d'utilisation (CGU)",      short: 'CGU' },
  { slug: 'cgv',                   label: 'Conditions de vente (CGV)',           short: 'CGV' },
  { slug: 'charte-communautaire',  label: 'Charte communautaire',                short: 'Charte' },
] as const

/** Renvoie les documents légaux autres que celui dont le slug est passé en paramètre.
 *  Si le slug ne correspond à rien, renvoie l'intégralité. Utilisé par LegalLayout
 *  pour générer la sidebar interne « Autres documents ». */
export function getOtherLegalDocs(currentSlug: string): LegalDoc[] {
  return LEGAL_DOCS.filter(d => d.slug !== currentSlug)
}

/** Format français d'une date ISO (YYYY-MM-DD → 28 mai 2026). */
export function formatLegalDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
                  'août', 'septembre', 'octobre', 'novembre', 'décembre']
  return `${d} ${months[m - 1]} ${y}`
}
```

- [ ] **Step 4 : Vérifier que le test passe**

```bash
pnpm test src/lib/__tests__/legal.test.ts
```

Attendu : 4 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/legal.ts src/lib/__tests__/legal.test.ts
git commit -m "feat(legal): constantes éditeur + helper getOtherLegalDocs (TDD)"
```

---

## Task 2 : LegalLayout (composant + CSS)

**Files:**
- Create: `src/components/legal/LegalLayout.tsx`
- Create: `src/components/legal/LegalLayout.css`

- [ ] **Step 1 : Écrire le composant**

```tsx
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { LEGAL, getOtherLegalDocs, formatLegalDate } from '@/lib/legal'
import './LegalLayout.css'

interface Props {
  title: string
  /** Slug courant (ex: 'mentions-legales') — sert à filtrer la sidebar « Autres documents ». */
  slug: string
  children: React.ReactNode
}

export function LegalLayout({ title, slug, children }: Props) {
  const others = getOtherLegalDocs(slug)
  const { pathname } = useLocation()
  // breadcrumb : si l'user est entré depuis l'app, on retourne sur /explorer ; sinon /
  const backHref = pathname.startsWith('/legal') ? '/explorer' : '/'

  return (
    <div className="legal-page">
      <div className="legal-shell">
        <main className="legal-main">
          <Link to={backHref} className="legal-back">
            <ArrowLeft strokeWidth={1.8} /> Retour à Fellowship
          </Link>

          <header className="legal-head">
            <h1>{title}</h1>
            <p className="legal-updated">
              Dernière mise à jour : {formatLegalDate(LEGAL.lastUpdated)}
            </p>
          </header>

          <article className="legal-body">{children}</article>

          <footer className="legal-foot">
            <p>
              Pour toute question : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
            </p>
            <button type="button" className="legal-print" onClick={() => window.print()}>
              <Printer strokeWidth={1.8} /> Imprimer / sauvegarder en PDF
            </button>
          </footer>
        </main>

        <aside className="legal-aside" aria-label="Autres documents légaux">
          <div className="legal-aside-label">Autres documents</div>
          <nav>
            {others.map(d => (
              <Link key={d.slug} to={`/legal/${d.slug}`}>{d.label}</Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Écrire le CSS**

Créer `src/components/legal/LegalLayout.css` :

```css
/* Layout commun des pages légales — DA Fellowship, tokens HSL, day/night safe. */
.legal-page {
  min-height: 100vh;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: var(--font-body);
}

.legal-shell {
  max-width: 1080px;
  margin: 0 auto;
  padding: 48px 24px 96px;
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 48px;
  align-items: start;
}
@media (max-width: 1023px) { .legal-shell { grid-template-columns: 1fr; gap: 32px; padding: 32px 18px 64px; } }

.legal-main { min-width: 0; }

.legal-back {
  display: inline-flex; align-items: center; gap: 6px;
  color: hsl(var(--muted-foreground)); text-decoration: none;
  font-size: 13px; margin-bottom: 24px;
}
.legal-back:hover { color: var(--amber); }
.legal-back svg { width: 14px; height: 14px; }

.legal-head { margin-bottom: 36px; padding-bottom: 18px; border-bottom: 1px solid hsl(var(--border)); }
.legal-head h1 { font-family: var(--font-heading); font-size: 32px; font-weight: 800; margin: 0 0 8px; color: hsl(var(--foreground)); }
.legal-updated { color: hsl(var(--muted-foreground)); font-size: 13px; margin: 0; }

.legal-body { font-size: 15.5px; line-height: 1.7; color: hsl(var(--foreground) / .92); max-width: 720px; }
.legal-body h2 { font-family: var(--font-heading); font-size: 20px; margin: 32px 0 12px; color: hsl(var(--foreground)); }
.legal-body h3 { font-family: var(--font-heading); font-size: 16px; margin: 22px 0 8px; color: hsl(var(--foreground)); }
.legal-body p { margin: 0 0 14px; }
.legal-body ul, .legal-body ol { margin: 0 0 16px; padding-left: 22px; }
.legal-body li { margin-bottom: 6px; }
.legal-body a { color: var(--amber); text-decoration: underline; text-underline-offset: 2px; }
.legal-body a:hover { text-decoration-thickness: 2px; }
.legal-body strong { color: hsl(var(--foreground)); font-weight: 700; }
.legal-body blockquote {
  margin: 20px 0; padding: 14px 18px;
  background: hsl(var(--secondary)); border-left: 3px solid var(--amber);
  border-radius: 6px; font-style: italic; color: hsl(var(--foreground) / .9);
}
.legal-body code {
  background: hsl(var(--muted)); padding: 1px 6px; border-radius: 4px;
  font-family: ui-monospace, monospace; font-size: 90%;
}

.legal-foot {
  margin-top: 48px; padding-top: 24px; border-top: 1px solid hsl(var(--border));
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
}
.legal-foot p { margin: 0; color: hsl(var(--muted-foreground)); font-size: 13.5px; }
.legal-foot a { color: var(--amber); }
.legal-print {
  display: inline-flex; align-items: center; gap: 7px;
  background: hsl(var(--secondary)); color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border)); padding: 8px 14px; border-radius: 8px;
  font-size: 13px; cursor: pointer; font-family: var(--font-body);
}
.legal-print:hover { background: hsl(var(--muted)); }
.legal-print svg { width: 14px; height: 14px; }

.legal-aside { position: sticky; top: 48px; }
.legal-aside-label {
  font-size: 10.5px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase;
  color: hsl(var(--muted-foreground)); padding: 0 4px 10px;
}
.legal-aside nav { display: flex; flex-direction: column; gap: 2px; }
.legal-aside a {
  padding: 9px 12px; border-radius: 8px;
  color: hsl(var(--muted-foreground)); text-decoration: none; font-size: 13px;
}
.legal-aside a:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }

/* Print : sidebar/header/footer/breadcrumb cachés, contenu plein cadre A4. */
@media print {
  .legal-page { background: #fff; color: #000; }
  .legal-back, .legal-aside, .legal-print { display: none !important; }
  .legal-shell { display: block; max-width: none; padding: 0; }
  .legal-body { max-width: none; font-size: 11pt; }
  .legal-body a { color: #000; }
  .legal-body h1, .legal-body h2, .legal-body h3 { color: #000; }
  .legal-foot { display: block; }
}
```

- [ ] **Step 3 : Vérifier le typecheck**

```bash
pnpm build
```

Attendu : `tsc -b` PASS (la build complète peut échouer car les routes ne sont pas encore ajoutées, mais aucune erreur ne doit pointer vers `LegalLayout.tsx` ou `legal.ts`).

- [ ] **Step 4 : Commit**

```bash
git add src/components/legal/
git commit -m "feat(legal): LegalLayout — layout partagé pour les 5 pages légales"
```

---

## Task 3 : Garde RESERVED_TOP

**Files:**
- Modify: `src/lib/navModel.ts`

- [ ] **Step 1 : Ajouter `'legal'` à `RESERVED_TOP`**

Edit dans `src/lib/navModel.ts` ligne 69-73 :

Remplacer :
```ts
const RESERVED_TOP = new Set([
  'explorer', 'calendrier', 'communaute', 'tableau-de-bord', 'dashboard',
  'mes-dates', 'mes-createurs', 'profil', 'reglages', 'suivis',
  'notifications', 'evenement', 'admin', 'onboarding', 'login', 'auth',
])
```

Par :
```ts
const RESERVED_TOP = new Set([
  'explorer', 'calendrier', 'communaute', 'tableau-de-bord', 'dashboard',
  'mes-dates', 'mes-createurs', 'profil', 'reglages', 'suivis',
  'notifications', 'evenement', 'admin', 'onboarding', 'login', 'auth',
  'legal',
])
```

- [ ] **Step 2 : Commit**

```bash
git add src/lib/navModel.ts
git commit -m "feat(legal): réserver 'legal' dans RESERVED_TOP (catch-all /:slug)"
```

---

## Task 4 : Page Mentions légales

**Files:**
- Create: `src/pages/legal/MentionsLegales.tsx`

- [ ] **Step 1 : Écrire la page**

Contenu : transcription verbatim de `docs/superpowers/specs/2026-05-28-legal-pages-design.md` §5.1.

```tsx
import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL } from '@/lib/legal'

export function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" slug="mentions-legales">
      <h2>1. Éditeur du site</h2>
      <p>
        <strong>{LEGAL.company}</strong>, entreprise individuelle.<br />
        Siège social : {LEGAL.address}<br />
        RCS : {LEGAL.rcs}<br />
        TVA intracommunautaire : {LEGAL.vat}
      </p>

      <h2>2. Directeur de la publication</h2>
      <p>{LEGAL.director}</p>

      <h2>3. Contact</h2>
      <p>
        Pour toute question relative au présent site ou aux services Fellowship :
        {' '}<a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
      </p>

      <h2>4. Marque</h2>
      <p>
        {LEGAL.brand}, propriété de {LEGAL.company}. Toute reproduction, imitation
        ou usage non autorisé de la marque, du logo ou des éléments graphiques de
        Fellowship expose à des poursuites au titre des articles L713-2 et suivants
        du Code de la propriété intellectuelle.
      </p>

      <h2>5. Hébergement du site</h2>
      <p>
        Hébergement front : <strong>{LEGAL.hosting.name}</strong>, {LEGAL.hosting.address}.<br />
        Politique de confidentialité de l'hébergeur :{' '}
        <a href={LEGAL.hosting.privacy} target="_blank" rel="noopener noreferrer">{LEGAL.hosting.privacy}</a>.
      </p>
      <p>
        Hébergement base de données et authentification : <strong>{LEGAL.database.name}</strong>, {LEGAL.database.address}.<br />
        Politique :{' '}
        <a href={LEGAL.database.privacy} target="_blank" rel="noopener noreferrer">{LEGAL.database.privacy}</a>.
      </p>

      <h2>6. Statut juridique de Fellowship</h2>
      <p>
        Fellowship est à la fois <strong>éditeur d'un service de communication
        au public en ligne</strong> au sens de l'article 6-III de la loi du 21 juin
        2004 pour la confiance dans l'économie numérique (LCEN), et{' '}
        <strong>hébergeur</strong> au sens de l'article 6-I-2 de cette même loi
        pour les contenus mis en ligne par ses utilisateurs (events, profils,
        bilans publics, commentaires, vitrines).
      </p>
      <p>
        À ce titre, l'éditeur n'est pas soumis à une obligation générale de
        surveillance des contenus mais agit promptement, dès qu'il en a connaissance,
        pour retirer tout contenu manifestement illicite qui lui aurait été signalé.
      </p>

      <h2>7. Signalement de contenu illicite</h2>
      <p>
        Tout contenu publié sur Fellowship peut être signalé via le bouton
        « Signaler » présent sur chaque profil, événement ou commentaire. Un
        signalement peut également être adressé par courriel à{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> en précisant la nature
        du contenu, son URL et la motivation du signalement.
      </p>

      <h2>8. Loi applicable</h2>
      <p>
        Les présentes mentions légales sont régies par le droit français.
      </p>
    </LegalLayout>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/pages/legal/MentionsLegales.tsx
git commit -m "feat(legal): page Mentions légales (LCEN art. 6 III-1)"
```

---

## Task 5 : Page Politique de confidentialité

**Files:**
- Create: `src/pages/legal/Confidentialite.tsx`

- [ ] **Step 1 : Écrire la page**

Contenu basé sur spec §5.2.

```tsx
import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL } from '@/lib/legal'

export function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité" slug="confidentialite">
      <p>
        La présente politique décrit la manière dont {LEGAL.company} traite les
        données personnelles des utilisateurs de Fellowship, conformément au
        Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés.
      </p>

      <h2>1. Responsable de traitement</h2>
      <p>
        <strong>{LEGAL.company}</strong>, {LEGAL.address}.<br />
        Point de contact pour les questions relatives à la protection des données :
        {' '}<a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.<br />
        Aucun délégué à la protection des données (DPO) n'est désigné, la
        désignation n'étant pas obligatoire pour {LEGAL.company} au regard de son
        activité et de son volume de traitement.
      </p>

      <h2>2. Données collectées et finalités</h2>
      <ul>
        <li><strong>Adresse email</strong> — création de compte (authentification
          par lien magique), communications transactionnelles. Base légale :
          exécution du contrat (CGU).</li>
        <li><strong>Profil personnel</strong> — nom d'affichage, avatar, biographie.
          Base légale : consentement.</li>
        <li><strong>Entité exposante</strong> — marque, slug public, vitrine,
          informations commerciales. Base légale : consentement.</li>
        <li><strong>Contenus publiés</strong> — événements, descriptions, photos,
          bilans publics. Base légale : consentement.</li>
        <li><strong>Bilans privés</strong> — données strictement personnelles du
          créateur, <strong>jamais partagées sans son action explicite</strong>.
          Base légale : consentement.</li>
        <li><strong>Participations et relations</strong> — événements suivis,
          abonnements à d'autres exposants. Base légale : exécution contractuelle.</li>
        <li><strong>Signalements émis et reçus</strong> — modération et sécurité
          de la communauté. Base légale : intérêt légitime.</li>
        <li><strong>Logs techniques</strong> — adresse IP de connexion (conservée
          par Supabase Auth à des fins de sécurité), navigateur. Base légale :
          intérêt légitime.</li>
      </ul>

      <h2>3. Géolocalisation</h2>
      <p>
        Aucune donnée de localisation n'est transmise ni stockée sur les serveurs
        de Fellowship. Lorsque la fonctionnalité « distance » sera disponible, le
        calcul sera effectué <strong>exclusivement côté navigateur</strong> à partir
        d'une saisie volontaire de l'utilisateur, et la position obtenue ne quittera
        jamais le terminal.
      </p>

      <h2>4. Durées de conservation</h2>
      <ul>
        <li>Compte actif : pendant toute la durée de vie du compte.</li>
        <li>Après suppression du compte : conservation 30 jours dans les sauvegardes
          techniques (en vue d'un éventuel rollback), puis purge complète.</li>
        <li>Logs d'authentification Supabase : 90 jours.</li>
        <li>Signalements résolus : 2 ans, à des fins de preuve en cas de
          contestation de modération.</li>
        <li>Documents comptables (factures Pro) : 10 ans (obligation légale,
          art. L123-22 du Code de commerce).</li>
      </ul>

      <h2>5. Sous-traitants</h2>
      <ul>
        <li><strong>{LEGAL.database.name}</strong> ({LEGAL.database.address}) —
          authentification, base de données, stockage des contenus. Politique :{' '}
          <a href={LEGAL.database.privacy} target="_blank" rel="noopener noreferrer">{LEGAL.database.privacy}</a>.</li>
        <li><strong>{LEGAL.hosting.name}</strong> ({LEGAL.hosting.address}) —
          hébergement front. Certifié Data Privacy Framework (DPF). Politique :{' '}
          <a href={LEGAL.hosting.privacy} target="_blank" rel="noopener noreferrer">{LEGAL.hosting.privacy}</a>.</li>
        <li><strong>{LEGAL.payment.name}</strong> ({LEGAL.payment.address}) —
          traitement des paiements de l'abonnement Pro. Conforme PCI-DSS.
          Fellowship n'accède jamais aux numéros de carte. Politique :{' '}
          <a href={LEGAL.payment.privacy} target="_blank" rel="noopener noreferrer">{LEGAL.payment.privacy}</a>.</li>
      </ul>

      <h2>6. Transferts hors Union européenne</h2>
      <p>
        Netlify (États-Unis) opère sous le cadre <em>Data Privacy Framework</em>
        approuvé par la Commission européenne. Les données structurées sont
        traitées par Supabase sur son instance située à Francfort (Allemagne) et
        ne quittent pas l'Union européenne dans le cadre du fonctionnement
        nominal du service. Stripe Payments Europe est établie en Irlande (UE).
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Conformément aux articles 15 à 22 du RGPD, vous disposez d'un droit
        d'accès, de rectification, d'effacement, à la portabilité, à la limitation
        du traitement et d'opposition. Pour exercer ces droits, écrivez à{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Une réponse vous sera
        adressée sous un délai d'un mois.
      </p>

      <h2>8. Réclamation auprès de la CNIL</h2>
      <p>
        Si vous estimez, après nous avoir contactés, que vos droits ne sont pas
        respectés, vous pouvez adresser une réclamation à la CNIL (Commission
        nationale de l'informatique et des libertés), 3 Place de Fontenoy, 75007
        Paris, ou via{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Fellowship utilise uniquement des <strong>cookies essentiels</strong> au
        fonctionnement du service :
      </p>
      <ul>
        <li>Cookies de session Supabase Auth — maintenir votre connexion.</li>
        <li>Cookies Stripe — sécurité du paiement lorsqu'une transaction
          d'abonnement Pro est en cours.</li>
      </ul>
      <p>
        Aucun cookie tiers de mesure d'audience, de traçage publicitaire ou de
        profilage n'est déposé. Les cookies essentiels sont dispensés du recueil
        du consentement préalable au titre de l'article 82 de la loi
        Informatique et Libertés.
      </p>

      <h2>10. Modification de la présente politique</h2>
      <p>
        Toute modification substantielle de la présente politique sera notifiée
        par courriel et par bannière in-app au moins 30 jours avant son entrée
        en vigueur.
      </p>
    </LegalLayout>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/pages/legal/Confidentialite.tsx
git commit -m "feat(legal): politique de confidentialité (RGPD art. 13-14)"
```

---

## Task 6 : Page CGU

**Files:**
- Create: `src/pages/legal/CGU.tsx`

- [ ] **Step 1 : Écrire la page**

Contenu basé sur spec §5.3.

```tsx
import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL } from '@/lib/legal'

export function CGUPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" slug="cgu">
      <p>
        Les présentes Conditions Générales d'Utilisation (« CGU ») encadrent
        l'usage gratuit de l'application Fellowship, éditée par {LEGAL.company}.
        L'utilisation du service implique l'acceptation pleine et entière des
        présentes CGU ainsi que de la <a href="/legal/confidentialite">Politique de confidentialité</a>.
      </p>

      <h2>1. Objet</h2>
      <p>
        Les présentes CGU ont pour objet de définir les modalités d'accès et
        d'usage du service Fellowship par les utilisateurs particuliers et
        professionnels, dans son périmètre gratuit.
      </p>

      <h2>2. Inscription et compte</h2>
      <p>
        L'inscription requiert d'avoir au moins 18 ans. L'utilisateur s'engage à
        fournir des informations exactes et à les tenir à jour. L'authentification
        s'effectue par lien magique (sans mot de passe) reçu par courriel. Le
        compte est strictement personnel et incessible.
      </p>

      <h2>3. Acteurs personnels et entités professionnelles</h2>
      <p>
        Un utilisateur peut, en plus de son profil personnel, créer une ou
        plusieurs entités professionnelles (exposants). L'abonnement Pro de
        Fellowship est attaché à l'entité, et non à la personne. Une même
        personne peut donc administrer plusieurs entités, chacune avec son
        propre plan.
      </p>

      <h2>4. Comportements interdits</h2>
      <p>L'utilisateur s'interdit notamment :</p>
      <ul>
        <li>de publier ou diffuser tout contenu illicite, en particulier des
          contenus à caractère haineux, discriminatoire, portant atteinte à des
          mineurs, à la dignité humaine, à la vie privée ou aux droits d'autrui ;</li>
        <li>de porter atteinte à la marque {LEGAL.brand} ou aux droits de
          propriété intellectuelle de tiers ;</li>
        <li>d'effectuer du <em>spam</em> ou des sollicitations commerciales non
          consenties via les fonctions de messagerie ou de commentaire ;</li>
        <li>de procéder à toute extraction automatisée (<em>scraping</em>),
          ingénierie inverse, ou tentative d'altération du fonctionnement du
          service ;</li>
        <li>d'usurper l'identité d'une autre personne, d'une marque ou d'une
          structure.</li>
      </ul>

      <h2>5. Statut d'hébergeur</h2>
      <p>
        Fellowship n'opère pas de contrôle <em>a priori</em> sur les contenus
        publiés par ses utilisateurs. Conformément à l'article 6-I-2 de la loi
        n° 2004-575 du 21 juin 2004 (LCEN), l'éditeur n'est pas tenu d'une
        obligation générale de surveillance mais agit promptement pour retirer
        tout contenu manifestement illicite qui lui aurait été signalé.
      </p>

      <h2>6. Modération</h2>
      <p>
        Fellowship applique la{' '}
        <a href="/legal/charte-communautaire">Charte communautaire</a> à
        l'ensemble des contenus publiés. Les sanctions sont graduées :
      </p>
      <ol>
        <li>Avertissement par courriel.</li>
        <li>Suspension temporaire du compte.</li>
        <li>Suppression définitive du compte.</li>
      </ol>
      <p>
        Chaque décision est documentée par une note administrative et reste
        consultable par l'utilisateur concerné sur simple demande. Tout recours
        peut être adressé à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        La marque {LEGAL.brand}, le logo, l'interface, le code source et les
        textes éditoriaux de Fellowship sont la propriété exclusive de{' '}
        {LEGAL.company}.
      </p>
      <p>
        Les contenus publiés par l'utilisateur (événements, photos, descriptions,
        vitrines, bilans publics) restent sa propriété. L'utilisateur accorde
        toutefois à {LEGAL.company} une <strong>licence non-exclusive, mondiale,
        gratuite et pour la durée d'existence de son compte</strong>, à des fins
        d'affichage, de reproduction technique nécessaire au fonctionnement du
        service, et de promotion du service Fellowship lui-même. Cette licence
        cesse à la suppression du compte.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        Le service est fourni « en l'état », en phase de développement actif.
        {LEGAL.company} s'engage à une obligation de moyens, non de résultat,
        s'agissant de la disponibilité, de la conformité et de l'exactitude des
        fonctionnalités. La responsabilité de l'éditeur ne saurait être engagée
        au-delà des pertes directes prévisibles, et dans la limite autorisée par
        la loi applicable.
      </p>

      <h2>9. Suspension et résiliation du compte</h2>
      <p>
        L'utilisateur peut supprimer son compte à tout moment depuis les
        Réglages. {LEGAL.company} peut suspendre ou supprimer un compte en cas
        de manquement grave aux présentes CGU ou à la Charte communautaire,
        avec notification motivée par courriel.
      </p>

      <h2>10. Modification des CGU</h2>
      <p>
        Toute modification substantielle des présentes CGU sera notifiée par
        courriel et par bannière in-app au moins 30 jours avant son entrée en
        vigueur. La poursuite de l'usage du service après ce délai vaut
        acceptation de la nouvelle version.
      </p>

      <h2>11. Loi applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le droit français. Tout litige relatif
        à leur formation, leur exécution ou leur interprétation sera soumis au
        Tribunal Judiciaire de Nice, dans le ressort duquel se situe le siège de{' '}
        {LEGAL.company}.
      </p>
    </LegalLayout>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/pages/legal/CGU.tsx
git commit -m "feat(legal): CGU — usage gratuit + statut hébergeur LCEN + modération"
```

---

## Task 7 : Page CGV (B2B Pro)

**Files:**
- Create: `src/pages/legal/CGV.tsx`

- [ ] **Step 1 : Écrire la page**

Contenu basé sur spec §5.4.

```tsx
import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL } from '@/lib/legal'

export function CGVPage() {
  return (
    <LegalLayout title="Conditions générales de vente" slug="cgv">
      <p>
        Les présentes Conditions Générales de Vente (« CGV ») régissent la
        fourniture par {LEGAL.company} de l'abonnement Pro de l'application
        Fellowship.
      </p>

      <h2>1. Identification de l'éditeur</h2>
      <p>
        <strong>{LEGAL.company}</strong>, {LEGAL.address}.<br />
        RCS : {LEGAL.rcs} — TVA intracommunautaire : {LEGAL.vat}.<br />
        Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>2. Objet</h2>
      <p>
        Les présentes CGV ont pour objet de définir les conditions dans lesquelles{' '}
        {LEGAL.company} fournit à ses clients professionnels l'abonnement Pro de
        Fellowship.
      </p>

      <h2>3. Public visé — clause expresse</h2>
      <blockquote>
        Les présentes Conditions Générales de Vente s'adressent{' '}
        <strong>exclusivement à des clients professionnels</strong> au sens de
        l'article liminaire du Code de la consommation. À ce titre, les dispositions
        du Code de la consommation relatives au droit de rétractation
        (articles L221-18 et suivants) ne s'appliquent pas.
      </blockquote>

      <h2>4. Description du service Pro</h2>
      <p>
        L'abonnement Pro donne accès, pour l'entité professionnelle qui en
        bénéficie, à l'ensemble des fonctionnalités marquées « Pro » dans
        l'application : Calendrier complet, Communauté, Tableau de bord, et
        toute fonctionnalité Pro qui pourrait être publiée ultérieurement par
        l'éditeur. Le plan Pro est attaché à l'entité professionnelle, non à
        la personne qui la gère.
      </p>

      <h2>5. Prix</h2>
      <p>
        <strong>9,99 € HT par mois</strong>, soit <strong>11,99 € TTC</strong>
        {' '}après application de la TVA française au taux de 20 %. Les prix
        peuvent évoluer ; toute modification fera l'objet d'un préavis d'au
        moins 30 jours par courriel. Des tarifs annuels, packs spéciaux ou
        promotions ponctuelles peuvent être proposés par l'éditeur.
      </p>

      <h2>6. Souscription et paiement</h2>
      <p>
        La souscription s'effectue directement dans l'application. Le paiement
        est traité par <strong>{LEGAL.payment.name}</strong> ({LEGAL.payment.address}),
        prestataire de paiement conforme à la norme PCI-DSS. {LEGAL.company}{' '}
        n'a jamais accès aux données de carte bancaire du client.
      </p>

      <h2>7. Reconduction et résiliation</h2>
      <p>
        L'abonnement est mensuel et reconduit tacitement à chaque échéance. Le
        client peut résilier à tout moment depuis les Réglages de son compte ;
        la résiliation prend effet à la fin de la période en cours. Aucun
        remboursement au prorata n'est dû.
      </p>

      <h2>8. Facturation</h2>
      <p>
        Une facture est émise automatiquement et envoyée par courriel à chaque
        échéance. L'éditeur conserve les factures pendant 10 ans conformément
        à l'article L123-22 du Code de commerce.
      </p>

      <h2>9. Suspension pour incident de paiement</h2>
      <p>
        En cas d'échec de prélèvement, l'éditeur pourra suspendre l'accès aux
        fonctionnalités Pro après notification écrite et un délai de 15 jours
        pour régularisation. Le compte de l'entité reste actif en plan gratuit
        pendant cette suspension.
      </p>

      <h2>10. Disponibilité du service</h2>
      <p>
        L'éditeur s'engage à une obligation de moyens quant à la disponibilité
        du service. Aucun engagement de niveau de service chiffré (SLA) n'est
        consenti à ce stade de développement. Les maintenances programmées
        seront notifiées par courriel et/ou par message in-app.
      </p>

      <h2>11. Résiliation pour manquement</h2>
      <p>
        L'éditeur peut résilier l'abonnement Pro en cas de manquement grave du
        client aux présentes CGV, aux CGU ou à la Charte communautaire, avec
        préavis de 15 jours notifié par courriel. Aucun remboursement n'est dû
        en cas de résiliation pour manquement.
      </p>

      <h2>12. Sort des données après résiliation</h2>
      <p>
        À la résiliation de l'abonnement Pro, les données de l'entité sont
        conservées 30 jours (période permettant une réactivation), puis le
        compte retombe en plan gratuit. Si le client supprime intégralement son
        compte, ses données sont purgées dans les conditions définies par la{' '}
        <a href="/legal/confidentialite">Politique de confidentialité</a>. Les
        factures sont conservées 10 ans conformément à la loi.
      </p>

      <h2>13. Loi applicable et juridiction</h2>
      <p>
        Les présentes CGV sont régies par le droit français. Toute contestation
        relative à leur formation, exécution ou interprétation est soumise, en
        application de la clause attributive de compétence librement convenue
        entre professionnels, au <strong>Tribunal Judiciaire de Nice</strong>.
      </p>
    </LegalLayout>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/pages/legal/CGV.tsx
git commit -m "feat(legal): CGV B2B Pro — exclusion rétractation, Stripe, juridiction Nice"
```

---

## Task 8 : Page Charte communautaire

**Files:**
- Create: `src/pages/legal/Charte.tsx`

- [ ] **Step 1 : Écrire la page**

Contenu basé sur spec §5.5.

```tsx
import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL } from '@/lib/legal'

export function ChartePage() {
  return (
    <LegalLayout title="Charte communautaire" slug="charte-communautaire">
      <blockquote>
        Chez Fellowship, on est convaincus qu'un bon outil pro repose sur une
        communauté saine. Voici les règles qu'on applique — courtes, claires,
        et qu'on fait respecter.
      </blockquote>

      <h2>Les six principes</h2>

      <h3>1. Pas de haine, pas de harcèlement, pas de discrimination</h3>
      <p>
        Aucune tolérance pour les contenus visant une personne ou un groupe en
        raison de son origine, de son genre, de son orientation sexuelle, de sa
        religion, de son handicap ou de tout autre critère discriminatoire.
      </p>

      <h3>2. Pas de pub déguisée hors de ta vitrine</h3>
      <p>
        Ta vitrine est faite pour mettre en avant ton activité. Les autres
        espaces (commentaires, fil d'actualité, messagerie) ne sont pas des
        panneaux d'affichage.
      </p>

      <h3>3. Pas d'usurpation d'identité</h3>
      <p>
        Ne te fais pas passer pour une autre marque, une autre personne ou une
        autre structure exposante.
      </p>

      <h3>4. Pas de spam</h3>
      <p>
        Commentaires, messages et signalements doivent être de bonne foi.
        Sollicitations répétitives, contenus dupliqués massivement et faux
        signalements relèvent du spam.
      </p>

      <h3>5. Reste dans ta thématique</h3>
      <p>
        Fellowship est un outil pour les artisans, les créateurs et les
        organisateurs d'événements. Les contenus hors-sujet seront retirés.
      </p>

      <h3>6. Respecte le droit d'auteur</h3>
      <p>
        Ne publie que des photos, textes et œuvres que tu as le droit de
        partager. En cas de contestation, le contenu sera retiré à première
        demande motivée.
      </p>

      <h2>Comment ça se passe quand quelqu'un sort des clous</h2>

      <ol>
        <li>
          <strong>Avertissement par courriel.</strong> La plupart des dérapages
          s'arrêtent là.
        </li>
        <li>
          <strong>Suspension temporaire du compte.</strong> Durée variable selon
          la gravité.
        </li>
        <li>
          <strong>Suppression définitive du compte.</strong> Réservée aux cas
          graves ou en cas de récidive.
        </li>
      </ol>

      <p>
        Chaque décision est documentée (note d'administration consultable par
        l'utilisateur concerné sur simple demande). Tout recours peut être
        adressé à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>Plutôt signaler qu'attaquer</h2>
      <p>
        Si un contenu te paraît violer la présente charte, utilise le bouton
        <strong> « Signaler »</strong> présent sur chaque profil, événement ou
        commentaire. C'est plus efficace, et tu protèges la communauté sans
        t'exposer.
      </p>

      <p>
        La présente charte fait partie intégrante des{' '}
        <a href="/legal/cgu">Conditions générales d'utilisation</a> de Fellowship.
      </p>
    </LegalLayout>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/pages/legal/Charte.tsx
git commit -m "feat(legal): charte communautaire — 6 principes + gradation sanctions"
```

---

## Task 9 : Routes dans App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1 : Ajouter les imports**

Insérer après la ligne `import { CommunautePage } from '@/pages/Communaute'` (ligne 21) :

```tsx
import { MentionsLegalesPage } from '@/pages/legal/MentionsLegales'
import { ConfidentialitePage } from '@/pages/legal/Confidentialite'
import { CGUPage } from '@/pages/legal/CGU'
import { CGVPage } from '@/pages/legal/CGV'
import { ChartePage } from '@/pages/legal/Charte'
```

- [ ] **Step 2 : Ajouter les routes**

Insérer dans `<Routes>`, **avant** la ligne `<Route path="/:slug" element={<ProfileWithLayout />} />` (ligne 126), un bloc :

```tsx
          {/* Pages légales — publiques, hors AuthenticatedApp */}
          <Route path="/legal/mentions-legales" element={<MentionsLegalesPage />} />
          <Route path="/legal/confidentialite" element={<ConfidentialitePage />} />
          <Route path="/legal/cgu" element={<CGUPage />} />
          <Route path="/legal/cgv" element={<CGVPage />} />
          <Route path="/legal/charte-communautaire" element={<ChartePage />} />

```

- [ ] **Step 3 : Vérifier la build**

```bash
pnpm build
```

Attendu : build réussit (`tsc -b` + `vite build`). Si erreur, la corriger avant de commit.

- [ ] **Step 4 : Vérifier manuellement chaque route**

```bash
pnpm dev
```

Ouvrir successivement dans le navigateur (déconnecté de préférence) :
- http://localhost:5173/legal/mentions-legales
- http://localhost:5173/legal/confidentialite
- http://localhost:5173/legal/cgu
- http://localhost:5173/legal/cgv
- http://localhost:5173/legal/charte-communautaire

Pour chaque page :
- Vérifier que le titre s'affiche
- Vérifier que le contenu est présent et lisible
- Vérifier que la sidebar interne « Autres documents » liste les 4 autres
- Vérifier qu'il n'y a pas de couleurs en dur en mode jour (toggle thème)
- Vérifier que le bouton « Imprimer / sauvegarder en PDF » lance bien `window.print()` (Ctrl+P doit aussi marcher)
- Vérifier que le breadcrumb « Retour à Fellowship » fonctionne

- [ ] **Step 5 : Commit**

```bash
git add src/App.tsx
git commit -m "feat(legal): 5 routes /legal/* publiques + vérification visuelle OK"
```

---

## Task 10 : Liens en pied de Sidebar (desktop)

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Sidebar.css`

- [ ] **Step 1 : Ajouter le bloc de liens**

Edit `src/components/layout/Sidebar.tsx`. Repérer ce bloc (lignes 97-106) :

```tsx
      <div className="sidebar-bottom">
        <SidebarNetworkActivity collapsed={collapsed} />
        <div className="side-foot">
          <Link to="/reglages" className="av" aria-label="Mon compte">
            {personalAvatar ? <img src={personalAvatar} alt="" /> : <span className="av-initial">{personalInitial}</span>}
          </Link>
          {!collapsed && <Link to="/reglages" className="nm"><b>{accountName}</b><span>Mon compte</span></Link>}
          <ThemeToggle />
        </div>
      </div>
```

Remplacer par :

```tsx
      <div className="sidebar-bottom">
        <SidebarNetworkActivity collapsed={collapsed} />
        <div className="side-foot">
          <Link to="/reglages" className="av" aria-label="Mon compte">
            {personalAvatar ? <img src={personalAvatar} alt="" /> : <span className="av-initial">{personalInitial}</span>}
          </Link>
          {!collapsed && <Link to="/reglages" className="nm"><b>{accountName}</b><span>Mon compte</span></Link>}
          <ThemeToggle />
        </div>
        {!collapsed && (
          <div className="sidebar-legal">
            <Link to="/legal/mentions-legales">Mentions</Link>
            <span className="sep">·</span>
            <Link to="/legal/confidentialite">Confidentialité</Link>
            <span className="sep">·</span>
            <Link to="/legal/cgv">CGV</Link>
          </div>
        )}
      </div>
```

- [ ] **Step 2 : Ajouter le CSS**

Append à la fin de `src/components/layout/Sidebar.css` :

```css
/* Pied de sidebar — liens légaux minimalistes (Mentions · Confidentialité · CGV) */
.sidebar-legal {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 12px 6px 2px;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground) / .65);
  letter-spacing: .02em;
}
.sidebar-legal a {
  color: inherit; text-decoration: none;
  border-bottom: 1px dotted hsl(var(--muted-foreground) / .35);
}
.sidebar-legal a:hover { color: var(--amber); border-bottom-color: var(--amber); }
.sidebar-legal .sep { opacity: .4; }
.sidebar.collapsed .sidebar-legal { display: none; }
```

- [ ] **Step 3 : Vérification visuelle**

```bash
pnpm dev
```

- Ouvrir http://localhost:5173 connecté
- Vérifier que les 3 liens « Mentions · Confidentialité · CGV » apparaissent en pied de sidebar
- Cliquer sur chacun : doit naviguer vers la page correspondante
- Replier la sidebar : les liens doivent disparaître
- Tester en mode jour (`.light`) ET en mode nuit

- [ ] **Step 4 : Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/Sidebar.css
git commit -m "feat(legal): liens Mentions·Confidentialité·CGV en pied de sidebar desktop"
```

---

## Task 11 : Liens dans AccountSheet (mobile)

**Files:**
- Modify: `src/components/layout/AccountSheet.tsx`
- Modify: `src/components/layout/AccountSheet.css`

- [ ] **Step 1 : Ajouter l'import Link**

Edit `src/components/layout/AccountSheet.tsx` ligne 2. Remplacer :

```tsx
import { useNavigate } from 'react-router-dom'
```

Par :

```tsx
import { useNavigate, Link } from 'react-router-dom'
```

- [ ] **Step 2 : Ajouter le bloc en fin de sheet**

Repérer la fin de la sheet (lignes 97-103) :

```tsx
        <button className="sheet-item sheet-logout" onClick={() => { onClose(); signOut() }}>
          <LogOut strokeWidth={1.8} />
          <span className="sheet-item-lbl">Déconnexion</span>
        </button>
      </div>
    </div>
  )
}
```

Insérer le bloc légal juste avant la fermeture `</div>` de la sheet :

```tsx
        <button className="sheet-item sheet-logout" onClick={() => { onClose(); signOut() }}>
          <LogOut strokeWidth={1.8} />
          <span className="sheet-item-lbl">Déconnexion</span>
        </button>

        <div className="sheet-divider" />
        <div className="sheet-legal">
          <Link to="/legal/mentions-legales" onClick={onClose}>Mentions</Link>
          <span>·</span>
          <Link to="/legal/confidentialite" onClick={onClose}>Confidentialité</Link>
          <span>·</span>
          <Link to="/legal/cgv" onClick={onClose}>CGV</Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Ajouter le CSS**

Append à la fin de `src/components/layout/AccountSheet.css` :

```css
/* Liens légaux en bas de l'AccountSheet — pendant mobile des liens en pied de Sidebar */
.sheet-legal {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 8px 4px;
  font-size: 12px;
  color: hsl(var(--muted-foreground) / .75);
}
.sheet-legal a {
  color: inherit; text-decoration: none;
  border-bottom: 1px dotted hsl(var(--muted-foreground) / .35);
}
.sheet-legal a:active { color: var(--amber); border-bottom-color: var(--amber); }
.sheet-legal span { opacity: .4; }
```

- [ ] **Step 4 : Vérification visuelle mobile**

```bash
pnpm dev
```

- DevTools → toggle device toolbar → smartphone (iPhone 12 par ex.)
- Ouvrir l'app, cliquer sur l'avatar pour ouvrir l'AccountSheet
- Vérifier que les 3 liens apparaissent en bas, sous Déconnexion
- Cliquer sur un lien : navigation OK + sheet se ferme

- [ ] **Step 5 : Commit**

```bash
git add src/components/layout/AccountSheet.tsx src/components/layout/AccountSheet.css
git commit -m "feat(legal): liens légaux en pied d'AccountSheet (mobile)"
```

---

## Task 12 : Lien vers Charte dans ReportContentModal

**Files:**
- Modify: `src/components/reports/ReportContentModal.tsx`
- Modify: `src/components/reports/ReportContentModal.css`

- [ ] **Step 1 : Ajouter l'import Link**

Edit `src/components/reports/ReportContentModal.tsx` lignes 1-7. Remplacer :

```tsx
import { useState } from 'react'
import { X, Flag, Check, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from '@/lib/content-reports'
import { createContentReport } from '@/hooks/use-content-reports'
import './ReportContentModal.css'
```

Par :

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Flag, Check, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from '@/lib/content-reports'
import { createContentReport } from '@/hooks/use-content-reports'
import './ReportContentModal.css'
```

- [ ] **Step 2 : Insérer le lien charte au-dessus des actions**

Repérer le bloc actions (lignes 97-102) :

```tsx
            <div className="report-modal-actions">
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button onClick={submit} disabled={state === 'sending'}>
                {state === 'sending' ? 'Envoi…' : 'Envoyer le signalement'}
              </Button>
            </div>
```

Insérer le lien charte juste avant :

```tsx
            <p className="report-modal-charte">
              Avant d'envoyer, jette un œil à la{' '}
              <Link to="/legal/charte-communautaire" target="_blank" rel="noopener noreferrer">
                charte communautaire
              </Link>.
            </p>
            <div className="report-modal-actions">
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button onClick={submit} disabled={state === 'sending'}>
                {state === 'sending' ? 'Envoi…' : 'Envoyer le signalement'}
              </Button>
            </div>
```

- [ ] **Step 3 : Ajouter le CSS**

Append à la fin de `src/components/reports/ReportContentModal.css` :

```css
.report-modal-charte {
  font-size: 12.5px;
  color: hsl(var(--muted-foreground));
  margin: 6px 0 12px;
  text-align: center;
}
.report-modal-charte a {
  color: var(--amber);
  text-decoration: underline;
  text-underline-offset: 2px;
}
```

- [ ] **Step 4 : Vérification visuelle**

```bash
pnpm dev
```

- Naviguer vers une page Festival ou un profil public
- Cliquer sur le bouton « Signaler »
- Vérifier que la mention « Avant d'envoyer, jette un œil à la charte communautaire » apparaît au-dessus des actions
- Cliquer sur le lien : doit ouvrir `/legal/charte-communautaire` dans un nouvel onglet

- [ ] **Step 5 : Commit**

```bash
git add src/components/reports/ReportContentModal.tsx src/components/reports/ReportContentModal.css
git commit -m "feat(legal): lien vers charte dans ReportContentModal"
```

---

## Task 13 : Liens légaux dans footer Landing

**Files:**
- Modify: `src/pages/Landing.tsx`
- Modify: `src/pages/Landing.css`

- [ ] **Step 1 : Étendre le footer existant**

Edit `src/pages/Landing.tsx` lignes 487-494. Remplacer :

```tsx
      <footer>
        <div className="wrap">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '8px' }}>
            <span className="mark">✦</span> Fellowship
          </div>
          <p>Le réseau qui fait tourner les festivals · flw.sh · © 2026</p>
        </div>
      </footer>
```

Par :

```tsx
      <footer>
        <div className="wrap">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '8px' }}>
            <span className="mark">✦</span> Fellowship
          </div>
          <p>Le réseau qui fait tourner les festivals · flw.sh · © 2026</p>
          <nav className="landing-legal" aria-label="Informations légales">
            <Link to="/legal/mentions-legales">Mentions légales</Link>
            <span>·</span>
            <Link to="/legal/confidentialite">Confidentialité</Link>
            <span>·</span>
            <Link to="/legal/cgu">CGU</Link>
            <span>·</span>
            <Link to="/legal/cgv">CGV</Link>
            <span>·</span>
            <Link to="/legal/charte-communautaire">Charte</Link>
          </nav>
        </div>
      </footer>
```

Note : `Link` est déjà importé en haut du fichier (ligne 2 `import { Link } from 'react-router-dom'`).

- [ ] **Step 2 : Ajouter le CSS**

Append à la fin de `src/pages/Landing.css` :

```css
/* Footer landing : rang de liens légaux (les 5 docs visibles ici) */
.landing-legal {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 8px; margin-top: 16px;
  font-size: 12px;
  color: hsl(var(--muted-foreground) / .8);
}
.landing-legal a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.landing-legal a:hover { color: var(--amber); }
.landing-legal span { opacity: .4; }
```

- [ ] **Step 3 : Vérification visuelle**

```bash
pnpm dev
```

- Ouvrir http://localhost:5173 (landing publique)
- Scroll en bas, vérifier que les 5 liens légaux apparaissent
- Cliquer chacun → navigation OK

- [ ] **Step 4 : Commit**

```bash
git add src/pages/Landing.tsx src/pages/Landing.css
git commit -m "feat(legal): liens légaux dans footer Landing (obligation accessibilité)"
```

---

## Task 14 : Consentement bloquant dans Onboarding

**Files:**
- Modify: `src/pages/Onboarding.tsx`
- Modify: `src/pages/Onboarding.css`

**Approche :** ajouter une case à cocher `acceptedTerms` dans l'état du composant. La case est affichée sous les boutons de choix de l'étape `choice`. Les boutons « Je suis exposant » et « Je découvre des festivals » sont **désactivés** tant que la case n'est pas cochée. L'état est ensuite conservé pour la durée de l'onboarding.

- [ ] **Step 1 : Ajouter `Link` aux imports**

Edit `src/pages/Onboarding.tsx` ligne 2. Remplacer :

```tsx
import { useNavigate } from 'react-router-dom'
```

Par :

```tsx
import { useNavigate, Link } from 'react-router-dom'
```

- [ ] **Step 2 : Ajouter `acceptedTerms` à l'état**

Repérer ligne 23 (`const [error, setError] = useState<string | null>(null)`) et ajouter juste après :

```tsx
  const [acceptedTerms, setAcceptedTerms] = useState(false)
```

- [ ] **Step 3 : Désactiver les boutons de choix + insérer la checkbox**

Repérer l'étape `choice` (lignes 201-235). Remplacer le bloc :

```tsx
              <div className="choice">
                <button type="button" className="cc" onClick={() => choose('exposant')}>
                  <div className="cic">🎪</div>
                  <div className="ct">
                    <b>Je suis exposant / créateur</b>
                    <span>Gérer ma saison, ma vitrine, candidater aux festivals.</span>
                  </div>
                  <span className="carr" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                  </span>
                </button>
                <button type="button" className="cc" onClick={() => choose('festivalier')}>
                  <div className="cic">🎟️</div>
                  <div className="ct">
                    <b>Je découvre des festivals</b>
                    <span>Suivre des créateurs, repérer où aller, planifier mes sorties.</span>
                  </div>
                  <span className="carr" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                  </span>
                </button>
              </div>
              <div className="addhint">
```

Par :

```tsx
              <div className="choice">
                <button
                  type="button"
                  className="cc"
                  onClick={() => choose('exposant')}
                  disabled={!acceptedTerms}
                  aria-disabled={!acceptedTerms}
                >
                  <div className="cic">🎪</div>
                  <div className="ct">
                    <b>Je suis exposant / créateur</b>
                    <span>Gérer ma saison, ma vitrine, candidater aux festivals.</span>
                  </div>
                  <span className="carr" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                  </span>
                </button>
                <button
                  type="button"
                  className="cc"
                  onClick={() => choose('festivalier')}
                  disabled={!acceptedTerms}
                  aria-disabled={!acceptedTerms}
                >
                  <div className="cic">🎟️</div>
                  <div className="ct">
                    <b>Je découvre des festivals</b>
                    <span>Suivre des créateurs, repérer où aller, planifier mes sorties.</span>
                  </div>
                  <span className="carr" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                  </span>
                </button>
              </div>

              <label className="terms-consent">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>
                  J'accepte les{' '}
                  <Link to="/legal/cgu" target="_blank" rel="noopener noreferrer">CGU</Link>
                  {' '}et la{' '}
                  <Link to="/legal/confidentialite" target="_blank" rel="noopener noreferrer">Politique de confidentialité</Link>
                  {' '}de Fellowship.
                </span>
              </label>

              <div className="addhint">
```

- [ ] **Step 4 : Ajouter le CSS**

Append à la fin de `src/pages/Onboarding.css` :

```css
/* Consentement CGU + Confidentialité, étape choice de l'onboarding */
.terms-consent {
  display: flex; align-items: flex-start; gap: 10px;
  margin: 18px 4px 6px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  line-height: 1.45;
}
.terms-consent input[type="checkbox"] {
  flex-shrink: 0;
  width: 18px; height: 18px;
  margin-top: 1px;
  accent-color: var(--amber);
  cursor: pointer;
}
.terms-consent a { color: var(--amber); text-decoration: underline; text-underline-offset: 2px; }
.terms-consent a:hover { text-decoration-thickness: 2px; }

/* Boutons de choix désactivés tant que la case n'est pas cochée */
.cc:disabled {
  opacity: .5;
  cursor: not-allowed;
  pointer-events: none;
}
```

Note : si une règle `.cc:disabled` existait déjà dans `Onboarding.css`, fusionner les deux plutôt que dupliquer.

- [ ] **Step 5 : Vérification visuelle**

```bash
pnpm dev
```

- Aller sur `/onboarding` (créer un user de test si nécessaire)
- À l'étape « Tu viens pour quoi ? » : vérifier que les 2 boutons sont visuellement désactivés
- Vérifier que cliquer dessus ne fait rien
- Cocher la case « J'accepte les CGU et la Politique de confidentialité »
- Vérifier que les boutons deviennent actifs
- Cliquer sur les liens CGU et Confidentialité : ouvrent dans un nouvel onglet, l'onboarding ne perd pas son état
- Décocher la case : les boutons redeviennent désactivés

- [ ] **Step 6 : Commit**

```bash
git add src/pages/Onboarding.tsx src/pages/Onboarding.css
git commit -m "feat(legal): consentement CGU+Confidentialité bloquant dans Onboarding"
```

---

## Task 15 : Build, lint, vérification finale jour/nuit

**Files:** aucun nouveau fichier — vérification du tout.

- [ ] **Step 1 : Build complète**

```bash
pnpm build
```

Attendu : `tsc -b` PASS + `vite build` PASS, aucun warning bloquant.

- [ ] **Step 2 : Lint**

```bash
pnpm lint
```

Attendu : 0 erreur. Corriger toute erreur (notamment hooks-deps si présentes, cf. memory `project_react_hooks_lint_gotchas`).

- [ ] **Step 3 : Tests unitaires**

```bash
pnpm test
```

Attendu : tous les tests existants PASS + les 4 nouveaux tests de `legal.test.ts` PASS.

- [ ] **Step 4 : Audit jour/nuit sur les 5 pages**

```bash
pnpm dev
```

Pour chacune des 5 pages `/legal/*` :

1. En mode **nuit** (default) :
   - Texte lisible sur fond `--card` ?
   - Liens en `var(--amber)` visibles ?
   - Sidebar interne droite alignée et lisible ?
2. Toggler en mode **jour** (`.light`) via le `ThemeToggle` :
   - Pas de texte blanc sur fond blanc ?
   - Pas de couleur en dur qui jure ?
   - Bouton « Imprimer / sauvegarder en PDF » a un fond visible ?

- [ ] **Step 5 : Test impression PDF**

Sur chaque page `/legal/*` :
- Ctrl+P (ou cliquer « Imprimer / sauvegarder en PDF »)
- Vérifier en aperçu :
  - Sidebar interne **non affichée** (CSS `@media print`)
  - Pas de breadcrumb « Retour à Fellowship »
  - Pas de bouton « Imprimer »
  - Texte noir sur blanc
  - Contenu propre, A4-friendly

- [ ] **Step 6 : Test responsive mobile**

- DevTools → device toolbar → iPhone 12
- Naviguer sur chaque page `/legal/*` : la sidebar interne droite doit basculer sous le contenu (grid-template-columns: 1fr)
- Vérifier la fluidité de scroll

- [ ] **Step 7 : Test cross-links bout-en-bout**

- Connecté, sidebar visible → cliquer « Mentions » → page s'ouvre → cliquer « Confidentialité » dans la sidebar interne → page change → breadcrumb retour à Fellowship → retour explorer OK
- Sur explorer → ouvrir un Festival → bouton signaler → vérifier le lien « charte communautaire » → ouvre nouvel onglet
- Sur Landing (déconnecté) → footer → cliquer les 5 liens → chaque navigation OK

---

## Task 16 : Bump version + commit final + push

**Files:**
- Modify: `package.json` (champ `version`)

- [ ] **Step 1 : Bumper la version**

Edit `package.json`. Repérer :

```json
"version": "0.7.167",
```

Remplacer par (incrémenter le patch — vérifier le dernier numéro effectif au moment de l'exécution avec `cat package.json | grep version`) :

```json
"version": "0.7.168",
```

- [ ] **Step 2 : Commit du bump**

```bash
git add package.json
git commit -m "chore: bump 0.7.168 — pages légales (mentions, confidentialité, CGU, CGV, charte)"
```

- [ ] **Step 3 : Push**

```bash
git push
```

Attendu : push réussi vers la branche courante (vérifier qu'on n'est PAS sur `main` avant — cf. CLAUDE.md préférence globale : push uniquement sur la branche courante, jamais directement sur `main`).

```bash
git branch --show-current
```

Doit retourner une feature branch (ex. `feat/da-nuit-festival-socle`), pas `main`.

---

## Self-Review

**Couverture de la spec :**

| Section spec                                    | Tâche couvrante               |
|-------------------------------------------------|-------------------------------|
| §2.1 — 5 routes `/legal/*`                       | Task 9                        |
| §2.2 — RESERVED_TOP                              | Task 3                        |
| §2.3 — Arborescence fichiers                     | Tasks 1-2, 4-8                |
| §2.4 — `src/lib/legal.ts`                        | Task 1                        |
| §3 — LegalLayout                                 | Task 2                        |
| §4.1 — Sidebar (desktop)                         | Task 10                       |
| §4.2 — AccountSheet (mobile)                     | Task 11                       |
| §4.3 — Cross-links ReportContentModal            | Task 12                       |
| §4.3 — Landing footer                            | Task 13                       |
| §4.3 — Onboarding consentement                   | Task 14                       |
| §4.3 — Checkout Pro CGV (hors scope)             | Documenté §8 spec, non livré  |
| §5.1 — Mentions légales                          | Task 4                        |
| §5.2 — Confidentialité                           | Task 5                        |
| §5.3 — CGU                                       | Task 6                        |
| §5.4 — CGV                                       | Task 7                        |
| §5.5 — Charte communautaire                      | Task 8                        |
| §6 — Phases 1-6 implémentation                   | Tasks 1-16                    |
| §7 — Pièges anti-régression                      | Préambule du plan + vérifs    |
| §8 — Hors scope                                  | Documenté, non livré          |

**Pièges potentiels :**

- L'imprimable PDF dépend de la prise en compte du media query `@media print` par le navigateur — testé à la Task 15 Step 5.
- Sur Onboarding, si le composant `.cc:disabled` existait déjà avec un style différent : merger les règles plutôt que dupliquer (cf. Task 14 Step 4 note).
- Le `Link` dans `AccountSheet.tsx` doit garder le `onClick={onClose}` pour que la sheet se ferme après navigation — sinon UX étrange.
- Le `RESERVED_TOP` mis à jour empêche `legal` d'être interprété comme un slug vitrine ; en l'absence de cette modification, une URL fantôme `/legal` (un seul segment) pourrait être routée sur `<ProfileWithLayout />`.

**Conformité juridique :**

- LCEN art. 6 III-1 → Mentions légales (Task 4)
- LCEN art. 6 I-2 (statut hébergeur) → mentionné dans Mentions légales + CGU (Tasks 4, 6)
- RGPD art. 13-14 → Confidentialité complète (Task 5)
- Code conso L221-18 (rétractation) → exclusion explicite B2B dans CGV (Task 7)
- L123-22 Code commerce (conservation factures 10 ans) → CGV §8 (Task 7)

---

## Notes pour l'exécutant (relance en session neuve)

- **Branche** : `feat/da-nuit-festival-socle` (au moment de l'écriture). Vérifier en début de session.
- **Spec source** : `docs/superpowers/specs/2026-05-28-legal-pages-design.md`.
- **Memory à relire** avant de toucher au CSS : `feedback_css_token_audit`, `reference_da_daynight_gotchas`, `feedback_light_button_shadow`.
- **Memory à relire** avant de toucher à AppLayout / routes : `reference_applayout_route_guard`.
- **TDD** : seul le helper `getOtherLegalDocs` justifie un test pur (Task 1). Le reste est UI/contenu et est vérifié visuellement aux Tasks 9, 10, 11, 12, 13, 14, 15.
- **Auto-commit + push** : actif au niveau global, déjà inclus à la Task 16.
- **Stripe** : sera intégré séparément. La présente livraison prépare le terrain (CGV + Confidentialité mentionnent Stripe comme sous-traitant) mais n'implémente pas le checkout.
- **Tests Vitest** : la stack utilise Vitest (présent dans `package.json`). Si la commande `pnpm test` n'existe pas dans `package.json`, vérifier le script exact et l'utiliser.
