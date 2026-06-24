# Calendrier — refonte bespoke DA « sci-fi chaud »

**Date :** 2026-06-24
**Statut :** Design validé (compagnon visuel, nuit). Prêt pour le plan d'implémentation.
**Parents :** `2026-06-24-da-sci-fi-chaud-design.md` (langage visuel) · `2026-06-24-da-fondation-primitives-design.md` (primitives `.da-*`, `--accent-app`).

## Intention

1ʳᵉ refonte bespoke de la propagation DA. Appliquer le langage « sci-fi chaud » au
Calendrier en **repensant la hiérarchie** (pas un simple recolor), tout en
**préservant la vue saison** — la grille 12 mois a été **explicitement demandée par
les utilisateurs**, c'est un acquis à ne pas casser.

Cibles de la refonte (problèmes actuels) : 12 cartes-mois de poids égal sans point
focal, boîtes imbriquées, bannières mensuelles décoratives bruyantes, pilules de
statut trop chargées, **deux systèmes de statut divergents**, et 100 % de vieux
tokens (`hsl(var(--card))`, `--copper`, hex en dur).

## Structure validée (grille saison, ancre légère)

**On garde la grille 12 mois glissants** (mois courant → +11, sur 2 années).
Desktop = grille responsive (1 col → 2 col @760px → 3 col @1200px). Mobile = agenda
vertical (sections par mois). Pas de héros plein façon cockpit (ferait doublon) ;
à la place une **ancre saison légère**.

### Haut de page (ordre vertical)
1. **Barre d'outils** : `h1 "Calendrier"` + sous-titre mono (plage de saison, ex.
   « juin 2026 — mai 2027 ») à gauche ; à droite **nav année** (`‹ 2026 ›`, slide
   conservé) + état quota/Pro (`3 / 5 dates · Pro = illimité` en free,
   `Pro · dates illimitées` en Pro).
2. **Ancre « saison »** (bandeau léger, pas un héros) : **gros chiffre mono** = total
   de dates de la saison (couleur `--accent-app`) + eyebrow « dates cette saison » +
   ligne muette « prochaine dans X jours — {nom} ». Séparée par une hairline.
3. **Bandeau teaser Pro** — **uniquement en free** (voir Gating).
4. **Barre de filtres** : chips `Mes dates` (toujours actif), `Amis pro`, `Visiteurs`.
5. **Grille des mois**.

## Carte-mois (traitement « sobre + picto saison »)

- Base = **`.glass-card`** (verre + grain hérités de la primitive globale — **ne pas
  re-cloner** le verre/grain). Padding ~12-14px.
- En-tête : **petit picto saisonnier monochrome** (icône `--muted`, jeu hiver/
  printemps/été/automne selon le mois) + **nom du mois** (heading) + **compteur**
  eyebrow mono à droite (« 2 dates », « 1 · 2 amis » en Pro, « libre » si vide).
- **Mois courant** : **barre verticale 2.5px `--accent-app` à gauche** (+ léger glow,
  même signal que sidebar/cockpit).
- **Mois vides** : carte atténuée (`opacity ~.4`), label « libre », **cliquable →
  `/explorer` filtré sur ce mois** (comportement actuel conservé). La saison entière
  reste visible, trous compris (valeur produit : repérer les mois à remplir).
- **Suppression** des bannières mensuelles décoratives SVG (`MonthBanner`) — c'était
  le bruit principal.

### Lignes d'événement
- **Mes dates** : vignette affiche (poster) + **nom** (`--name`) + méta mono/muette
  (`date · ville`) + **statut = `.da-dot` coloré (`--status-*`) + court label mono**
  (« Inscrit », « À payer », « Dossier »…). Remplace les pilules colorées bruyantes.
- **Compagnons sur ma date** : petite **pile d'avatars** sur la ligne → ouvre la
  modale amis (au lieu d'un bloc séparé sous la date).
- Clic sur une ligne = navigation vers la fiche event (`state {from:'/calendrier'}`),
  inchangé.

## Réseau « où vont mes amis » — fusion chronologique (Pro)

En Pro, dans chaque mois, **tes dates et celles de tes amis sont entremêlées par
date** (ordre du mois). Lignes amis = **avatar** + nom + « {ami} y va » / « N amis »
+ date + petit **tag « amis »**, visuellement **atténuées** (opacity ~.72), **sans
point de statut** (ce ne sont pas tes dossiers). Les chips `Amis pro` / `Visiteurs`
activent/désactivent ces couches (les visiteurs = abonnés non-pro).

## Gating free / Pro

- **Free** : tes dates + compagnons sur tes dates + chip quota. La couche réseau est
  verrouillée : chips `🔒 Amis pro` / `🔒 Visiteurs` (clic → `/boutique`) **ET** un
  **bandeau teaser dédié** sous l'ancre saison (« Vois où vont tes amis et les
  festivaliers — tes dates restent gratuites » + CTA « Passer Pro » → `/boutique`).
  Les events amis n'entrent pas dans le dataset free (inchangé).
- **Pro** : chips actifs, fusion chronologique, pas de teaser.

## Unification des statuts (dette à solder ici)

Aujourd'hui deux systèmes : `participationChip` (variants colorés + emoji, dans
`lib/explorer.ts`) **et** une map inline `STATUS_COLORS`/`STATUS_LABELS` (HSL en dur)
dans la modale amis. **Unifier sur une seule source** : tokens `--status-*` +
primitives `.da-dot` / `.da-status`. Le libellé court vient de `participationChip`
(on garde sa logique statut→label, on jette ses aplats colorés ; le point porte la
couleur via `--dot-color`). La modale consomme la même chose.

→ **Solde les 2 minors différés de la Fondation** : (1) documenter/consommer le
contrat `--dot-color` de `.da-dot` (la modale et les lignes le posent en inline
`style`); (2) retirer le `font-size:13px` no-op de `.da-btn-sm` si un bouton DA est
utilisé ici.

## Migration DA & nettoyage

- `Calendar.css` migré **off** vieux tokens → DA : `.glass-card`, `--accent-app`,
  `--name`, `--faint`, `--field`, `--hair`, `--status-*`, `.da-*`. Fond de page =
  `--app-bg` (`background-attachment:fixed`). Plus aucun hex/HSL en dur dans le TSX
  (modale comprise). Garde-fou : ne PAS toucher `--copper`/`--primary`/`--page-backdrop`.
- **Supprimer le code mort** : `YearView.tsx`, `MonthCell.tsx` (non importés) + CSS
  legacy (`.calendar-presence-*`, `.calendar-month-header{display:none}`,
  `.calendar-title*` inutilisés par le TSX) + `MonthBanner` si plus consommé.
- ⚠️ **Scroll** : scroll de page unique, jamais de scroll interne imbriqué
  (cf. préférence). ⚠️ Pièges jour/nuit DA (ombres douces en jour, pas de `#fff` en
  dur, svg `fill:none`) à vérifier.

## Mobile (agenda)

Mêmes principes appliqués à `MobileAgenda` : sections par mois (picto + nom + compteur,
plus de bannière décorative), **fusion chronologique** mine/amis, statut `.da-dot` +
label, mois vide « libre » cliquable, bandeau teaser en free. Le switch JS
`matchMedia('(max-width:639px)')` actuel est conservé.

## Données & interactions (inchangées)

Hooks consommés tels quels : `useMyParticipations(year)` ×2, `useCalendarYear`,
`useFriendsParticipations`, `useDateQuota`. Pas de nouvelle RPC, pas de nouvelle
feature data. **Pas d'affordance « ajouter une date »** sur cette page (l'ajout passe
par Explorer / la barre de recherche) — inchangé. Modale amis restylée `.glass-card`.

## Hors scope / YAGNI

- Pas de vue grille-jour ni de héros plein façon cockpit.
- Pas de modification de la logique des hooks ni de RPC.
- Pas de feature « ajouter une date » ici.
- Landing / vitrine publique / `--copper` / `--primary` : intouchés.
- Pas de changement de polices.

## Référence visuelle (maquettes validées)
`.superpowers/brainstorm/21902-1782302373/content/` : `structure.html` (grille A choisie),
`month-card.html` (sobre+picto choisi), `page-top.html` (ancre B choisie),
`network.html` (fusion chrono + teaser b), `full-page.html` (page assemblée validée).
