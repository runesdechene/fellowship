# DA « Sci-fi chaud » — langage visuel de l'app de travail

**Date :** 2026-06-24
**Branche :** `da/finesse-pro`
**Statut :** Design validé (nuit + jour) sur le Cockpit. Prêt pour le plan d'implémentation.

## Intention

Donner à l'app de travail de Fellowship (cockpit, calendrier, dashboard, fiches,
réglages, communauté…) un côté **plus pro, plus clair, moins fatigant, moins
brouillon** — un « instrument de précision » inspiré du calme de XO, **sans
refroidir** la chaleur de la marque.

Insight clé issu du brainstorm : XO n'est pas calme *parce qu'il est froid*, il est
calme parce qu'il est **désaturé, aéré, et chuchoté**. On vole ces principes, pas le
froid. On garde une palette chaude désaturée + un accent terracotta.

Deuxième insight : la fatigue venait surtout de **la hiérarchie de l'information**
(7 modules de poids égal), pas de la couleur. La clarté se gagne par un point focal
unique + de l'air + des modules élagués.

## Périmètre

- **Dans le périmètre :** l'app de travail — Cockpit, Calendrier, Explorer, Carte,
  Communauté, Ma vitrine (vue propriétaire/édition), Réglages, Abonnement/Boutique,
  fiches événement (vue connectée), et la **Sidebar**.
- **Hors périmètre (gardent la « nuit de fête » saturée) :** la **Landing** marketing
  et la **vitrine publique** des exposants. Découplage déjà permis par `Landing.css`
  séparé. → L'accent vif copper actuel doit rester sur ces surfaces.

## Le langage visuel

Mode **nuit = défaut**, mode **jour** via `.light`. Valeurs validées sur maquette :

### Couleur — NUIT
| Token | Valeur |
|---|---|
| Fond de page | `radial-gradient(120% 70% at 30% 0%, #1d1a18, #0f0e0d 64%)`, `background-attachment:fixed` |
| Accent (terracotta) | `#d6896a` |
| Texte principal `--fg` | `#e7ddd2` |
| **Noms / titres de listes `--name`** | `#d3c5b3` (volontairement *moins blanc* que `--fg` — moins de contraste = plus reposant) |
| Texte secondaire `--muted` | `#998a7d` |
| Micro-label / faint | `#6f6258` |
| Surface carte (verre) `--glass` | `linear-gradient(180deg,rgba(46,43,40,.52),rgba(28,26,25,.42))` |
| Hairline `--hair` | `rgba(255,255,255,.085)` |
| Champ / cellule `--field` | `rgba(255,255,255,.04)` |
| Statuts | ok `#8fc7a8` · dossier `#86bce8` · ambre `#e0b56a` · lime `#b6cf8e` |

### Couleur — JOUR (`.light`)
| Token | Valeur |
|---|---|
| Fond de page | `radial-gradient(120% 70% at 30% 0%, #f6efe4, #e8dfd0 64%)` |
| Accent (terracotta assombri) | `#b65f3f` |
| `--fg` / `--name` / `--muted` / faint | `#3d3028` / `#4a3c31` / `#7c6f64` / `#9a8b7d` |
| Surface carte (verre clair) `--glass` | `linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.40))` |
| Hairline `--hair` / champ `--field` | `rgba(60,40,25,.11)` / `rgba(60,40,25,.045)` |
| Statuts (assombris) | ok `#2f9d6a` · dossier `#2b6fa8` · ambre `#b07512` · lime `#6f9b3a` |

### Matière & surfaces
- **Carte de verre** : `border-radius:18px`, `backdrop-filter:blur(16px)`, hairline 1px,
  `inset 0 1px 0` top-highlight.
  - Ombre **nuit** : `0 18px 44px rgba(0,0,0,.32)`.
  - Ombre **jour** (douce) : `0 4px 14px rgba(120,90,60,.06)` + `inset 0 1px 0 rgba(255,255,255,.55)`.
- **Grain** : overlay SVG `feTurbulence fractalNoise baseFrequency=0.9 numOctaves=2`,
  via `::before`. **Nuit : `opacity .18`, `mix-blend-mode:overlay`. Jour : `opacity .05`,
  `mix-blend-mode:multiply`** (overlay clair noircirait).
  ⚠️ Le hook sécurité bloque l'écriture brute de balises/contenus type injection HTML —
  le data-URI SVG est inoffensif mais surveiller le pattern lors de l'implémentation.

### Typographie & signaux
- **Eyebrow** : `font-mono`, `10px`, `font-weight:600`, `letter-spacing:.2em`, uppercase,
  couleur faint. (S'appuie sur `.eyebrow`/`.num` déjà introduits en finesse pro #1/#2.)
- **Chiffres / dates / montants** : `font-mono` + `tabular-nums`. Le J-X du héros en
  géant (`~52px`) = unique point focal coloré accent.
- **Statuts** : **point coloré (couleur de statut) + label en mono neutre** — pas
  d'aplats colorés « sapin de Noël ». Exception : le statut du **héros** est un vrai chip
  teinté visible (fond `color-mix(ok 15%)` + bord + point qui pulse).
- **Boutons** : `btn-flat` (CTA n°1 : fond accent ; texte `#1c1109` en nuit, `#fff` +
  halo doux en jour) ; `btn-ghost` (secondaire : bord + texte accent) ; `btn-2` (neutre :
  `--field` + hairline). **Zéro dégradé glossy.**
- **Points de statut** : `box-shadow` glow + animation `pulse` 2.6s (glow atténué en jour).

### Sidebar
- Panneau de **verre très discret** (`rgba(255,255,255,.022)` nuit / `.5` jour), séparé du
  contenu par une simple hairline droite. Il cadre, il ne pèse pas.
- **Item actif** : texte accent + fond `color-mix(accent 12%)` + **barre verticale 2.5px
  accent à gauche** (qui glow en nuit) — même signal que les cartes héros (cohérence).
- Items au repos en `--muted`, s'éclaircissent (`--name`) au survol.
- Logo `Fellowship.` (point accent), entity switcher, Parrainage (pointillé accent +
  pill « 1 mois offert »), pied : compte perso + bascule jour/nuit, liens légaux.

## Architecture clarté du Cockpit (référence d'application)

Ordre vertical validé :
1. **Topbar** : avatar entité + « Bonjour {nom} » + sous-titre mono.
2. **Héros (grille 1.7fr / 1fr)** : `ProchainFestival` (affiche + J-X géant + nom +
   méta + chip statut + actions) | `SaisonFrise` (gros total mono + frise des mois,
   trous en pointillé accent + note).
3. **Bande « À venir »** pleine largeur (slim, mono, points de statut, « +N autres ») —
   **en 2ᵉ position**, marge `18px 0`.
4. **3 colonnes élaguées** (2-3 lignes max + « tout voir ») : `AReglerFinaliser` |
   `CompagnonsDeRoute` | `MesBilans`.
5. **`DossiersRefuses`** : repliée en bas.

Contenu large et **centré** (`max-width:1200px`, `margin:0 auto`).

Principes transférables à toutes les pages : **un point focal par écran**, listes
élaguées + « tout voir », statut = point + label neutre, noms en `--name` (contraste
réduit), beaucoup d'air (gaps ~18, padding ~22).

## Stratégie de déploiement

1. **Cockpit d'abord, en vrai.** Coder la DA complète sur le seul Cockpit (composants
   `src/components/cockpit/*` + `Cockpit.css` + Sidebar), valider **jour ET nuit** dans
   l'app réelle. C'est la preuve avant de généraliser.
2. **Puis propagation page par page**, en réutilisant les primitives.

### Risque & garde-fou (à traiter dans le plan)
- L'accent passe de copper vif à **terracotta** pour l'app, MAIS la Landing/vitrine
  doivent garder le copper festif. `--copper`/`--primary` sont des tokens globaux et
  largement consommés. → Le plan devra décider : **nouveau token d'accent app** (ex.
  `--accent-app`) scopé hors Landing/vitrine, OU re-scoper le copper festif sur ces
  surfaces. **Ne pas** réécrire `--copper` globalement sans audit.
- Auditer `hsl(var(--…))` / `--copper` / `--card` / `--border` avant tout changement de
  token (cf. mémoire « CSS token audit before format change » + « DA day/night gotchas »).
- Vérifier les pièges jour : pas de `#fff` en dur cassant, `svg fill:none`, ombres
  douces, grain en `multiply`.

## Référence visuelle (maquettes validées)
`.superpowers/brainstorm/11234-1782257114/content/` :
- `cockpit-terracotta-v2.html` — Cockpit nuit + sidebar (référence nuit)
- `cockpit-jour.html` — Cockpit jour + sidebar (référence jour)
- `reference-validee.html` — carte étalon + specs

## Hors scope / YAGNI
- Pas de refonte de la Landing ni de la vitrine publique.
- Pas de changement de polices (Plus Jakarta Sans + Inter + Geist Mono conservés).
- Pas de feature produit (uniquement DA).
