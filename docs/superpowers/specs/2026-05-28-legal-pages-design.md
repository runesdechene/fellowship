# Pages légales Fellowship — Design

**Date :** 2026-05-28
**Statut :** Spec validée, prête pour writing-plans
**Scope :** Mise en conformité juridique de Fellowship (LCEN, RGPD, Code de la consommation B2B) — 5 pages publiques + intégration sidebar/AccountSheet/cross-links + page Landing.

---

## 1. Contexte & motivation

Fellowship (édité par **LAHOUSSAYE EI**, RCS Nice 844 256 537 00011, marque INPI déposée) est aujourd'hui une app SaaS sans documents juridiques publiés. Trois risques :

1. **LCEN art. 6 III-1** — Mentions légales obligatoires pour tout service de communication au public en ligne. Sanction théorique : 75 000 € + 1 an de prison (rarement appliquée, mais ouvre flanc en cas de contentieux).
2. **RGPD art. 13-14** — Pas de politique de confidentialité publiée alors que des données personnelles sont collectées (email, profil, contenus). Sanction CNIL : jusqu'à 4 % du CA.
3. **Code conso L121-17** — CGV obligatoires dès qu'on encaisse un euro. L'abonnement Pro 9,99 € HT/mois est en place (sidebar upsell) et Stripe est sur le point d'être intégré.

S'y ajoutent deux risques opérationnels :

4. **Statut hébergeur LCEN art. 6** — Sans CGU déclarant explicitement le statut d'hébergeur et la procédure de signalement, le moindre contenu illicite posté par un utilisateur expose l'éditeur en responsabilité éditoriale pleine. Le système `content_reports` (déjà en place) doit être formalisé juridiquement.
5. **Modération sans assise** — Toute suspension/suppression de compte sans charte préalable est juridiquement fragile (clause abusive, atteinte à la liberté d'expression).

**Décisions de cadrage prises en brainstorm :**

- **Public payant Pro = exclusivement B2B** (artisans, exposants, structures pro). Pas de B2C → pas de droit de rétractation conso, pas de médiateur conso, prix HT + TVA 20%.
- **Niveau de livraison B (Recommandé)** : 5 documents — Mentions légales, Confidentialité, CGU, CGV, Charte communautaire. La charte sort des CGU pour pouvoir être linkée depuis le `ReportContentModal` ; donne du poids juridique aux décisions de modération.
- **Aucun analytics tiers actuellement** (vérifié dans le repo, seul commentaire "// Replace with Sentry/PostHog when graduating from alpha"). Stripe sera intégré dans la foulée → traité dans la spec comme sous-traitant confirmé.
- **Géolocalisation** : calcul côté navigateur uniquement, **jamais** persisté côté serveur (présent ou futur).
- **Bilans privés** (créateurs uniquement) : à documenter explicitement dans la Confidentialité.

---

## 2. Architecture des pages

### 2.1. Routes ajoutées dans `src/App.tsx`

5 routes publiques, **hors `<AuthenticatedApp>`** (accessibles non-connecté, indexables — exigence légale) :

```tsx
<Route path="/legal/mentions-legales" element={<MentionsLegalesPage />} />
<Route path="/legal/confidentialite" element={<ConfidentialitePage />} />
<Route path="/legal/cgu" element={<CGUPage />} />
<Route path="/legal/cgv" element={<CGVPage />} />
<Route path="/legal/charte-communautaire" element={<ChartePage />} />
```

Insérées **avant** les routes catch-all `/:slug` et `/:slug/embed` pour matcher en priorité.

### 2.2. Garde `RESERVED_TOP`

`src/lib/navModel.ts` — ajout défensif de `'legal'` dans `RESERVED_TOP` pour éviter qu'une URL `/legal` (sans sous-segment) soit interprétée comme une vitrine publique par `isPublicProfilePath`.

### 2.3. Arborescence des fichiers

```
src/lib/
  └── legal.ts                   # Constantes (RCS, TVA, adresse, hébergeur…) — single source of truth

src/components/legal/
  ├── LegalLayout.tsx            # Layout commun (titre, MAJ, sidebar interne autres docs, retour)
  └── LegalLayout.css

src/pages/legal/
  ├── MentionsLegales.tsx
  ├── Confidentialite.tsx
  ├── CGU.tsx
  ├── CGV.tsx
  └── Charte.tsx
```

### 2.4. `src/lib/legal.ts` — constantes partagées

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
    address: 'Delaware, USA — instance EU hébergée à Francfort',
    privacy: 'https://supabase.com/privacy',
  },
  payment: {
    name: 'Stripe Payments Europe, Limited',
    address: '1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irlande',
    privacy: 'https://stripe.com/fr/privacy',
  },
  lastUpdated: '2026-05-28',
} as const
```

---

## 3. `LegalLayout` — structure commune des 5 pages

### 3.1. Composition

- **Header** : breadcrumb `← Fellowship` (renvoie à `/explorer` si connecté, `/` sinon), titre H1, ligne "Dernière mise à jour : 28 mai 2026" (formatée FR)
- **Corps** : `max-width: 720px`, marges généreuses, `font-body 15.5px / line-height 1.7`, H2 en `font-heading`
- **Sidebar interne droite (desktop ≥ 1024px)** : section "Autres documents" listant les 4 autres pages légales (couvre l'accès aux CGU et à la Charte qui ne sont pas en pied de sidebar principale)
- **Footer page** : "Pour toute question : `contact@runesdechene.com`" + bouton "Imprimer / sauvegarder en PDF" (`window.print()`)
- **CSS print** : styles dédiés pour génération PDF propre (sidebar interne cachée en print, A4-friendly)
- **Day/night** : uniquement tokens HSL existants (`--card`, `--foreground`, `--muted-foreground`, `--border`), pas de couleur en dur. Conforme à `reference_da_daynight_gotchas`.

### 3.2. Interface

```tsx
type LegalLayoutProps = {
  title: string
  lastUpdated: string  // format ISO YYYY-MM-DD, formaté FR dans le composant
  children: React.ReactNode
}
```

### 3.3. Slug interne pour la sidebar "Autres documents"

Tableau statique des 5 docs dans `legal.ts` :

```ts
export const LEGAL_DOCS = [
  { slug: 'mentions-legales',      label: 'Mentions légales' },
  { slug: 'confidentialite',       label: 'Politique de confidentialité' },
  { slug: 'cgu',                   label: 'Conditions d\'utilisation (CGU)' },
  { slug: 'cgv',                   label: 'Conditions de vente (CGV)' },
  { slug: 'charte-communautaire',  label: 'Charte communautaire' },
] as const
```

`LegalLayout` filtre l'entrée courante via `useLocation` et liste les 4 autres.

---

## 4. Intégration sidebar (desktop) + AccountSheet (mobile)

### 4.1. `src/components/layout/Sidebar.tsx`

**Position** : à l'intérieur de `<div className="sidebar-bottom">`, **après** `<div className="side-foot">`, conditionné sur `!collapsed` (le légal n'apparaît pas en mode replié — accès rare, on accepte de devoir déplier).

```tsx
{!collapsed && (
  <div className="sidebar-legal">
    <Link to="/legal/mentions-legales">Mentions</Link>
    <span className="sep">·</span>
    <Link to="/legal/confidentialite">Confidentialité</Link>
    <span className="sep">·</span>
    <Link to="/legal/cgv">CGV</Link>
  </div>
)}
```

**CSS dans `Sidebar.css`** :

```css
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
.sidebar-legal a:hover {
  color: var(--amber);
  border-bottom-color: var(--amber);
}
.sidebar-legal .sep { opacity: .4; }
```

### 4.2. `src/components/layout/AccountSheet.tsx`

**Position** : à la fin de la sheet, **après** `<button className="sheet-item sheet-logout">`, séparé par un `sheet-divider` léger.

```tsx
<div className="sheet-divider" />
<div className="sheet-legal">
  <Link to="/legal/mentions-legales" onClick={onClose}>Mentions</Link>
  <span>·</span>
  <Link to="/legal/confidentialite" onClick={onClose}>Confidentialité</Link>
  <span>·</span>
  <Link to="/legal/cgv" onClick={onClose}>CGV</Link>
</div>
```

**CSS dans `AccountSheet.css`** : reprend `sidebar-legal` (mêmes tokens), légère adaptation taille pour cohérence mobile (12px).

### 4.3. Cross-links contextuels

- **`src/components/reports/ReportContentModal.tsx`** : ajout en bas du formulaire, après le texte d'avertissement → `<Link to="/legal/charte-communautaire" target="_blank" rel="noopener">Voir la charte communautaire</Link>`. Renforce juridiquement la décision de modération qui suivra.
- **`src/pages/Landing.tsx`** : footer minimal en bas de page (les mêmes 3 liens). Obligation légale : les mentions doivent être accessibles depuis la home.
- **`src/pages/Onboarding.tsx`** : case à cocher bloquante avant validation finale → "J'accepte les [CGU](/legal/cgu) et la [Politique de confidentialité](/legal/confidentialite)" (liens `target="_blank"`).
- **Futur checkout Pro (hors scope, à prévoir)** : case bloquante "J'accepte les [CGV](/legal/cgv)" avant le paiement Stripe. Mentionner que le `LegalLayout` est prêt à recevoir cette intégration.

---

## 5. Contenu juridique des 5 documents

### 5.1. Mentions légales

Sections obligatoires LCEN art. 6 III-1 :

1. **Éditeur** — LAHOUSSAYE EI, entreprise individuelle, 421 Chemin du Baudaric, 06390 Contes, France. RCS NICE 844 256 537 00011. TVA intracom : FR04844256537.
2. **Directeur de la publication** — Uriel Lahoussaye.
3. **Contact** — `contact@runesdechene.com`.
4. **Marque** — FELLOWSHIP, marque déposée à l'INPI, propriété de LAHOUSSAYE EI. Toute reproduction sans autorisation préalable expose à des poursuites (art. L713-2 CPI).
5. **Hébergement front** — Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, USA. Politique de confidentialité : https://www.netlify.com/privacy/
6. **Hébergement données / authentification** — Supabase, Inc., instance européenne (Francfort). Politique : https://supabase.com/privacy
7. **Statut juridique** — Fellowship est à la fois **éditeur de service de communication au public en ligne** (art. 6-III LCEN) et **hébergeur** au sens de l'art. 6-I-2 LCEN pour les contenus publiés par les utilisateurs (events, profils, bilans publics, commentaires). À ce titre, l'éditeur n'est pas soumis à une obligation générale de surveillance mais agit promptement pour retirer tout contenu manifestement illicite signalé.
8. **Signalement de contenu illicite** — Procédure dédiée via le bouton "Signaler" présent sur chaque contenu utilisateur, ou par email à `contact@runesdechene.com` mentionnant la nature, l'URL et la motivation du signalement.

### 5.2. Politique de confidentialité

Structure RGPD complète (art. 13-14) :

1. **Responsable de traitement** — LAHOUSSAYE EI, contact RGPD = `contact@runesdechene.com` (pas de DPO formel, non obligatoire pour une EI sous les seuils).
2. **Données collectées et finalités** :
   - **Email** — création de compte (magic-link Supabase), communication transactionnelle. Base : exécution du contrat (CGU).
   - **Profil personnel** — nom d'affichage, avatar, bio. Base : consentement.
   - **Entité exposante** — marque, slug public, vitrine, informations commerciales. Base : consentement.
   - **Contenus publiés** — events, descriptions, photos, bilans publics. Base : consentement.
   - **Bilans privés** — données strictement personnelles du créateur, **jamais partagées sans son action explicite**. Base : consentement.
   - **Participations & relations** — events suivis, abonnements à d'autres exposants. Base : exécution contractuelle.
   - **Signalements émis et reçus** — modération. Base : intérêt légitime (sécurité de la communauté).
   - **Logs techniques** — IP de connexion (conservée par Supabase Auth pour sécurité, 90 j), navigateur. Base : intérêt légitime (sécurité).
3. **Géolocalisation** — Aucune donnée de localisation n'est transmise ni stockée côté serveur. Lorsque la fonctionnalité "distance" sera disponible, le calcul sera effectué **uniquement côté navigateur** à partir d'une saisie volontaire de l'utilisateur.
4. **Durées de conservation** :
   - Compte actif → durée du compte.
   - Après suppression → conservation 30 jours dans les sauvegardes (rollback technique), puis purge complète.
   - Logs auth Supabase → 90 jours.
   - Signalements résolus → 2 ans (conservation pour preuve en cas de contestation de modération).
   - Données comptables (factures Pro) → 10 ans (obligation légale art. L123-22 Code commerce).
5. **Sous-traitants** :
   - **Supabase, Inc.** — authentification, base de données, stockage. Instance UE (Francfort).
   - **Netlify, Inc.** — hébergement front. USA, certifiée Data Privacy Framework (DPF).
   - **Stripe Payments Europe, Ltd** — traitement des paiements Pro. Irlande (UE). Conforme PCI-DSS. Fellowship n'accède jamais aux numéros de carte.
6. **Transferts hors UE** — Netlify (USA) opère sous DPF. Aucune donnée personnelle structurée ne quitte l'UE pour Supabase (instance Francfort).
7. **Droits RGPD** (art. 15-22) — accès, rectification, effacement, portabilité, opposition, limitation. Exercer ses droits : `contact@runesdechene.com`. Réponse sous 1 mois.
8. **Réclamation CNIL** — droit de réclamation auprès de la CNIL (3 Place de Fontenoy, 75007 Paris — www.cnil.fr).
9. **Cookies** — seuls **cookies essentiels** sont utilisés (session Supabase Auth pour maintenir la connexion, et cookies Stripe pour la sécurité du paiement lorsqu'une transaction Pro est en cours). Aucun cookie tiers de tracking ou de mesure d'audience. Pas de bannière de consentement requise (les cookies essentiels en sont dispensés — art. 82 LIL, exception "strictement nécessaire").

### 5.3. Conditions d'utilisation (CGU)

1. **Objet** — encadrer l'usage gratuit de l'application Fellowship.
2. **Acceptation** — l'inscription vaut acceptation pleine et entière des CGU et de la Politique de confidentialité.
3. **Inscription et compte** — majorité légale (18 ans), véracité des informations, magic-link Supabase, compte personnel non transférable.
4. **Acteurs et entités** — un utilisateur peut créer des entités professionnelles (exposants). Le plan Pro est lié à l'entité, pas à la personne (cf. modèle Fellowship).
5. **Comportements interdits** — contenus illicites (haine, atteinte aux mineurs, contrefaçon, atteinte à la marque FELLOWSHIP), spam, scraping automatisé, ingénierie inverse, usurpation d'identité.
6. **Statut d'hébergeur** — rappel art. 6 LCEN : Fellowship n'est pas tenue d'une obligation générale de surveillance des contenus mis en ligne par les utilisateurs, mais agit promptement pour retirer tout contenu manifestement illicite signalé.
7. **Modération** — Fellowship applique la **Charte communautaire** (lien). Sanctions graduées : avertissement → suspension → suppression. Chaque décision est documentée (note admin dans le système de signalement). Recours possible par email.
8. **Propriété intellectuelle** — la marque FELLOWSHIP, le logo, l'interface, les textes éditoriaux sont la propriété de LAHOUSSAYE EI. Les contenus publiés par l'utilisateur (events, photos, descriptions) restent sa propriété ; il accorde à Fellowship une **licence non-exclusive, mondiale, gratuite, pour la durée du compte**, à des fins d'affichage et de promotion dans le cadre du service.
9. **Responsabilité** — service fourni en l'état (Fellowship est en phase de développement actif). Engagement de moyens, pas de résultat. Limitation de responsabilité aux pertes directes prévisibles, dans la limite autorisée par la loi.
10. **Suspension / suppression** — l'utilisateur peut supprimer son compte à tout moment depuis les Réglages. Fellowship peut suspendre ou supprimer un compte en cas de manquement grave aux CGU ou à la Charte, avec notification motivée par email.
11. **Modification des CGU** — préavis 30 jours par email + bannière in-app. La poursuite de l'usage après ce délai vaut acceptation.
12. **Loi applicable et juridiction** — droit français. Tribunaux compétents : Tribunal Judiciaire de Nice (ressort du siège social).

### 5.4. Conditions générales de vente (CGV) — B2B Pro

1. **Identification de l'éditeur** — idem mentions légales.
2. **Objet** — fournir aux clients professionnels un abonnement Pro à l'application Fellowship.
3. **Public visé — clause expresse** : « Les présentes Conditions Générales de Vente s'adressent **exclusivement à des clients professionnels** au sens de l'article liminaire du Code de la consommation. À ce titre, les dispositions du Code de la consommation relatives au droit de rétractation (art. L221-18 et s.) ne s'appliquent pas. »
4. **Description du service Pro** — accès aux fonctionnalités Pro de l'entité souscrivant (Calendrier complet, Communauté, Tableau de bord, et toute fonctionnalité Pro publiée ultérieurement). Le forfait Pro est lié à l'entité professionnelle, pas à la personne.
5. **Prix** — 9,99 € HT/mois, soit 11,99 € TTC après TVA française de 20 %. Prix susceptibles d'évolution avec préavis de 30 jours par email. Possibilité ponctuelle de tarifs annuels ou packs spéciaux.
6. **Souscription** — via l'application, paiement par carte bancaire via **Stripe Payments Europe, Limited** (prestataire conforme PCI-DSS). Fellowship n'a jamais accès aux données de carte bancaire.
7. **Reconduction et résiliation** — abonnement mensuel à reconduction tacite. Résiliation possible à tout moment depuis les Réglages, avec effet à la fin de la période en cours. Pas de remboursement au prorata.
8. **Facturation** — facture émise automatiquement et envoyée par email à chaque échéance. Conservation 10 ans par l'éditeur (obligation comptable L123-22 Code de commerce).
9. **Suspension pour non-paiement** — en cas d'échec de prélèvement, l'éditeur peut suspendre l'accès Pro après notification et délai de 15 jours pour régularisation. Le compte reste actif en plan gratuit.
10. **Disponibilité du service** — engagement de moyens. Pas de SLA chiffré au stade actuel de développement. Maintenances programmées notifiées par email/in-app.
11. **Résiliation pour manquement** — l'éditeur peut résilier en cas de manquement grave aux CGU ou à la Charte, avec préavis de 15 jours notifié par email. Aucun remboursement dû dans ce cas.
12. **Sort des données après résiliation** — conservation 30 jours (restauration possible), puis suppression. Sauf obligations légales (factures conservées 10 ans).
13. **Loi applicable et juridiction** — droit français. Clause attributive de compétence (valide en B2B) : Tribunal Judiciaire de Nice.

### 5.5. Charte communautaire

Ton court, lisible en 1 minute, premier perso pluriel :

> Chez Fellowship, on est convaincus qu'un bon outil pro repose sur une communauté saine. Voici les règles qu'on applique — courtes, claires, et qu'on fait respecter.

**Six principes :**

1. **Pas de haine, pas de harcèlement, pas de discrimination.** Aucune tolérance — quel que soit le motif (origine, genre, orientation, religion, handicap).
2. **Pas de pub déguisée hors de ta vitrine.** Ta vitrine est faite pour ça. Le reste de l'app n'est pas un panneau d'affichage.
3. **Pas d'usurpation d'identité** — d'une marque, d'une personne ou d'une autre structure exposante.
4. **Pas de spam.** Les commentaires, messages et signalements doivent être de bonne foi.
5. **Reste dans ta thématique** — Fellowship est un outil pour artisans et organisateurs. Contenus hors-sujet = retrait.
6. **Respecte le droit d'auteur** — publie uniquement des photos et textes que tu as le droit de partager.

**Comment ça se passe quand quelqu'un sort des clous :**

- **Étape 1** — Avertissement par email. La plupart des dérapages s'arrêtent là.
- **Étape 2** — Suspension temporaire du compte (durée variable selon la gravité).
- **Étape 3** — Suppression définitive du compte. Réservée aux cas graves ou récidive.

Chaque décision est documentée (note admin visible par toi sur demande). Recours par email à `contact@runesdechene.com`.

**Plutôt signaler qu'attaquer.** Si tu vois un contenu qui viole cette charte, utilise le bouton "Signaler" présent sur chaque profil, event ou commentaire. C'est plus efficace, et tu protèges la communauté.

---

## 6. Plan d'implémentation (résumé pour writing-plans)

### Phase 1 — Infrastructure & layout
1. Créer `src/lib/legal.ts` (constantes + `LEGAL_DOCS`).
2. Créer `src/components/legal/LegalLayout.tsx` + CSS (avec print-friendly).
3. Ajouter `'legal'` dans `RESERVED_TOP` (`src/lib/navModel.ts`).

### Phase 2 — Les 5 pages
4. Créer `src/pages/legal/MentionsLegales.tsx` (utilise `LEGAL` + `LegalLayout`).
5. Créer `src/pages/legal/Confidentialite.tsx`.
6. Créer `src/pages/legal/CGU.tsx`.
7. Créer `src/pages/legal/CGV.tsx`.
8. Créer `src/pages/legal/Charte.tsx`.

### Phase 3 — Routing
9. Ajouter les 5 routes dans `src/App.tsx`, avant `/:slug` et `/:slug/embed`.

### Phase 4 — Intégration sidebar / mobile
10. Insérer le bloc `sidebar-legal` dans `src/components/layout/Sidebar.tsx` + CSS.
11. Insérer le bloc `sheet-legal` dans `src/components/layout/AccountSheet.tsx` + CSS.

### Phase 5 — Cross-links
12. Ajouter le lien "Voir la charte communautaire" dans `src/components/reports/ReportContentModal.tsx`.
13. Ajouter le footer mentions dans `src/pages/Landing.tsx`.
14. Ajouter la case à cocher CGU/Confidentialité bloquante dans `src/pages/Onboarding.tsx`.

### Phase 6 — Vérification
15. Build TypeScript propre (`pnpm build`).
16. Vérification visuelle desktop + mobile, jour + nuit.
17. Test print PDF (Ctrl+P sur chaque page).
18. Bump `APP_VERSION`, commit conventional, push.

---

## 7. Pièges identifiés (anti-régression)

- **AppLayout route guard** — les routes `/legal/*` doivent être **hors** `<AuthenticatedApp>`. Vérifier qu'`AppLayout` ne s'applique pas, sinon le `useEffect` virerait l'utilisateur (cf. `reference_applayout_route_guard`).
- **Day/night** — n'utiliser que des tokens HSL (`hsl(var(--...))`). Aucun `#fff` en dur, aucun SVG sans `fill: none`. Vérifier que les liens en pied de sidebar restent lisibles en mode jour (test `.light`).
- **Security hook innerHTML** — ne pas écrire de string contenant l'expression `<` immédiatement suivi de `script` dans les composants (le hook PreToolUse bloque). Pour les rares cas de markdown brut, utiliser des composants React purs.
- **Routes catch-all** — `/:slug` matche un segment unique, mais `RESERVED_TOP` doit inclure `'legal'` pour défendre contre une éventuelle URL `/legal` toute seule.

---

## 8. Hors scope (à mentionner pour mémoire)

- **Intégration Stripe checkout proprement dite** — la case "J'accepte les CGV" sera branchée dans le futur composant de paiement. Le présent design la prépare mais ne l'implémente pas.
- **Bannière de consentement cookies** — non requise tant qu'on reste sur cookies essentiels. Sera à ajouter le jour où on intègre un analytics tiers (Plausible, PostHog, GA).
- **Version anglaise** — pas de traduction prévue dans cette spec. La marque cible un public francophone artisanal.
- **Page hub `/legal` (index)** — non créée. Si besoin futur d'un point central, ajout simple (`src/pages/legal/Index.tsx` + route `/legal`). Le `RESERVED_TOP` est déjà préparé.
