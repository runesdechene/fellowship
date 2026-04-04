# Fellowship — Design Refonte Spec

> Objectif : passer d'un prototype "année 2010" à une app premium inspirée de Lu.ma, adaptée à l'univers artisan/festival de Fellowship.

## Philosophie

Lu.ma = clean, minimal, systémique. Leur force : discipline typographique, spacing cohérent, transitions douces, backdrop blur partout. Leur faiblesse : froid, corporate, pas d'âme.

Fellowship doit prendre leur rigueur technique mais injecter de la chaleur. On vise **"carnet de marché premium"** : chaud, organique, mais aussi net et moderne.

---

## 1. Typographie

### Actuel
- Nunito partout — rond, enfantin, pas pro.

### Cible
- **Titres** : `DM Serif Display` ou `Playfair Display` — serif élégante avec caractère. Évoque l'artisanat, les affiches de marché.
- **Corps** : `Inter` — le standard Lu.ma, lisibilité parfaite, system font stack en fallback.
- **Tailles** (scale Lu.ma adaptée) :
  - Hero h1 : `3.5rem` → `2.5rem` mobile, `font-weight: 500`, `letter-spacing: -1px`
  - h2 section : `1.5rem`
  - h3 card : `1.125rem`
  - Body : `1rem`
  - Small/meta : `0.875rem`
  - XS : `0.75rem`

### Implémentation
```css
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
h1, h2, h3, .font-display {
  font-family: 'DM Serif Display', Georgia, serif;
}
```

---

## 2. Palette de couleurs

### Actuel
- Violet (`270 40% 50%`) + orange accent. Froid, générique.

### Cible — "Terre & Feu"
Inspiré des marchés artisanaux : terres cuites, bois, lin, cuivre.

**Light mode :**
```
--background:    40 20% 97%      /* lin très clair */
--foreground:    30 10% 15%      /* brun quasi-noir */
--card:          40 15% 99%      /* blanc chaud */
--primary:       25 75% 45%      /* terre cuite / cuivre */
--primary-fg:    0 0% 100%       /* blanc */
--secondary:     40 30% 93%      /* sable */
--secondary-fg:  30 10% 15%
--muted:         40 15% 91%      /* lin */
--muted-fg:      30 8% 45%       /* gris chaud */
--accent:        150 35% 40%     /* vert forêt */
--accent-fg:     0 0% 100%
--border:        35 12% 85%      /* beige border */
--ring:          25 75% 45%      /* = primary */
```

**Dark mode :**
```
--background:    30 12% 10%      /* brun nuit */
--foreground:    35 15% 90%      /* lin clair */
--card:          30 12% 14%      /* brun card */
--primary:       25 70% 55%      /* cuivre lumineux */
--secondary:     30 12% 18%
--muted:         30 10% 20%
--muted-fg:      30 8% 55%
--accent:        150 30% 50%     /* vert clair */
--border:        30 8% 22%
```

### Brand accent
- **Primary (Cuivre)** : `hsl(25 75% 45%)` — `#C2662A` — CTA, liens, actions
- **Accent (Forêt)** : `hsl(150 35% 40%)` — `#428C6B` — badges, succès, tags nature
- **Warm gray** : base beige/sable au lieu de gris neutre

---

## 3. Spacing & Layout (calqué Lu.ma)

### Container
```
--max-width: 820px          /* standard */
--max-width-wide: 960px     /* explorer */
--max-width-extra-wide: 1080px
--horizontal-padding: 1rem
```

### Spacing scale
```
4px / 8px / 12px / 16px / 24px / 32px / 48px / 64px
(0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 / 4 rem)
```

### Cards
```
padding: 0.75rem 1rem
gap interne: 0.5rem
border-radius: 0.75rem (squircle feel)
border: 1px solid var(--border)
```

### Grille events (Explorer)
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
gap: 1rem;
```

---

## 4. Components

### Navigation (inspirée Lu.ma)
- **Sticky** avec `backdrop-filter: blur(16px)` + `bg-background/80`
- **Border** qui apparaît au scroll (pas visible en haut)
- Logo à gauche, liens au centre (desktop), actions à droite
- **Boutons nav** : pill shape (`rounded-full`), fond translucide au hover
- La BottomBar mobile reste, mais stylée pill/backdrop-blur

### Boutons
- **Primary** : fond cuivre, texte blanc, pill shape (`rounded-full`), `font-weight: 500`
- **Secondary/Light** : fond translucide `bg-foreground/5`, border transparent, pill
- **Ghost** : pas de fond, texte cuivre au hover
- **Tailles** : small (`h-7`), default (`h-9`), large (`h-11`)
- **Transition globale** : `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`

### Event Cards
Pattern Lu.ma : image à droite, info à gauche (layout list). OU card verticale image-top (layout grid).

**Layout List (Dashboard/Following) :**
```
[Info .......................... | Image]
 Date/heure                      120x120 squircle
 Titre (h3, serif)
 Lieu (icon + texte muted)
 Avatars participants stacked
```

**Layout Grid (Explorer) :**
```
[        Image 16:9            ]
 Titre (h3, serif)
 Date + Lieu
 Tag badge + participant count
```

**Hover** : `border-color` transition + subtle shadow. Pas de transform/scale.

### Event Page
- Hero image pleine largeur, **gradient overlay** en bas (`linear-gradient(transparent, background)`)
- Tags en pills colorées au-dessus du titre
- Titre en serif grande taille
- Metadata (date, lieu) avec icônes Lucide alignées
- Sections en tabs comme actuellement mais avec meilleur styling

### Landing Page
- Hero immersif : grande baseline serif + sous-titre + CTA pill
- Pas de form dans le hero — juste un bouton "Découvrir les événements" + "Je suis exposant"
- Section features avec icônes/illustrations
- Social proof (nombre d'exposants, d'événements)
- Footer minimal

---

## 5. Micro-interactions & Polish

### Transition globale
```css
--transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```
Appliqué à : boutons, cards, liens, nav, inputs.

### Backdrop blur
Utilisé sur : nav sticky, modales, bottom bar, cards sur fond coloré.
```css
backdrop-filter: blur(16px);
```

### Skeleton loading
Shimmer rectangles aux bons aspect-ratios pendant le chargement des events/profils. Remplace les spinners Loader2 partout sauf auth.

### Hover states
- Cards : `border-color` change + `box-shadow` subtle
- Boutons : `background-color` shift
- Liens : `color` transition
- Pas de `transform: scale()` — ça fait cheap

### Scroll
- Smooth scroll natif
- Timeline sticky headers avec backdrop blur (comme Lu.ma)

---

## 6. Dark Mode

Pas un simple "inverser" — un vrai dark mode avec :
- Fond brun nuit (pas gris/noir pur)
- Cards légèrement plus claires que le fond
- Primary cuivre qui reste lisible (luminosité augmentée)
- Images avec léger `brightness(1.1)` pour compenser
- Borders plus subtiles (`opacity: 0.1` du foreground)

---

## 7. Priorité d'implémentation

1. **index.css** — nouvelle palette + typo (impact maximal, effort minimal)
2. **Boutons** — pill shape, nouvelles couleurs
3. **Nav** — backdrop blur sticky
4. **Event cards** — nouveau layout grid/list
5. **Landing page** — hero immersif
6. **Event page** — hero gradient, serif titles
7. **Dark mode** — ajustement des variables
8. **Skeleton loaders** — remplacer les spinners
9. **Micro-interactions** — transitions, hover states

---

## 8. Fonts à charger

```html
<!-- Dans index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## Résumé visuel

| Aspect | Avant | Après |
|--------|-------|-------|
| Typo titres | Nunito (ronde) | DM Serif Display (élégante) |
| Typo corps | Nunito | Inter (clean) |
| Couleur primaire | Violet froid | Cuivre/terre cuite chaud |
| Couleur accent | Orange | Vert forêt |
| Fond | Gris neutre | Lin/sable chaud |
| Boutons | Carrés | Pills (rounded-full) |
| Cards | Basiques | Blur + squircle + hover states |
| Nav | Statique | Sticky blur |
| Transitions | Aucune | 0.3s ease-out partout |
| Loading | Spinner | Skeleton shimmer |
