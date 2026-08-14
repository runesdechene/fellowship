# Cockpit V2 « Parchemin » — contour + premier écran — design

**Date** : 2026-08-14
**Statut** : à valider (Uriel), puis plan d'implémentation
**Auteur** : XO (Claude) + Uriel
**Applique** : [décision 0007 — DA V2 « Parchemin »](../../decisions/0007-da-v2-parchemin.md)
**Précédent utile** : [plan landing V2 annuaire](../plans/2026-08-11-landing-v2-annuaire.md) — même mécanique d'interrupteur, même calque scopé

---

## Contexte & problème

La DA « Parchemin » est actée depuis le 2026-08-11 (décision 0007) et **vit aujourd'hui sur la
seule page d'accueil V2**, derrière `/?v2=1`. L'application connectée n'a pas bougé : Cockpit,
Calendrier, Explorer et les six autres écrans sont toujours en « Nuit de Festival ».

0007 disait « le calque de la landing d'abord, la DA de l'app ensuite ». C'est ce lot-ci.

Le diagnostic qui a produit 0007 vaut d'abord pour l'app : *« le design est trop brouillon, trop
d'infos partout, pas assez minimaliste »*. Le sujet n'est donc pas de repeindre — c'est de
**baisser la densité** en même temps qu'on change la matière.

## Décisions prises en brainstorming (2026-08-14)

| Question | Tranché |
|---|---|
| Périmètre | **Écran par écran, à fond** — pas de retint global de l'app |
| Le contour partagé | **Contour + premier écran dans le même lot**, derrière un interrupteur |
| Premier écran | **Le Cockpit** |
| Jour/nuit | **Clair par défaut dans la V2 seulement** ; la V1 reste nuit par défaut |
| Approche technique | **Calque scopé `.app2` + écrans V2 dédiés** (le modèle `.lv2`, éprouvé) |
| Les 3 blocs absents de la maquette | **On garde les trois, en plus discret** |
| L'image de « Prochain festival » | **La vraie affiche**, aplat teinté en repli |

### Approches écartées, et pourquoi

- **Drapeau `html.da2` sur les composants existants.** Pas de duplication, mais chaque règle CSS
  existante réclame sa jumelle : les fichiers doublent de volume et deviennent illisibles. Surtout,
  un drapeau CSS ne sait repeindre que la couleur — la baisse de densité voulue par 0007 demande de
  changer le balisage.
- **Refonte en place, sans interrupteur.** Plus rapide, mais on valide sur une prod déjà basculée et
  le retour arrière devient un `git revert` sur plusieurs commits. 0007 dit « commutable ».
- **Branche longue.** Exclue par la règle « main = atelier » : sur Fellowship `main` est la prod, une
  branche n'isole rien (la base est partagée) et fait diverger.

---

## Architecture

### L'interrupteur

`?app2=1` allume et mémorise, `?app2=0` éteint et oublie, sinon on relit la mémoire — défaut V1.
C'est la mécanique de `src/lib/landing-v2.ts`, déjà en prod et testée.

Elle est généralisée en `src/lib/v2-switch.ts` : une fonction pure `resolveV2Switch(param, search,
stored)` et un lecteur `readV2Switch(param, storageKey)`. `landing-v2.ts` s'y branche **sans changer
de comportement** (mêmes clé, mêmes cas, mêmes tests).

**Deux clés distinctes** : `flwsh-landing-v2` et `flwsh-app-v2`. Allumer la vitrine V2 n'allume pas
l'app V2, et inversement.

### Le contour

Le choix se fait au-dessus de la mise en page, dans la route. `AppLayout` V1 n'est pas modifié.

| Nouveau | Rôle |
|---|---|
| `src/components/layout/AppLayoutV2.tsx` | pose `.app2`, les halos, le fond parchemin |
| `src/components/layout/SidebarV2.tsx` + `.css` | le rail crème 232 px de la maquette |
| `src/components/layout/TopbarV2.tsx` + `.css` | la barre du haut |
| `src/components/layout/BottomBarV2.tsx` + `.css` | la barre du bas mobile |

Un composant réutilisable = un fichier CSS à côté de lui. Pas de Tailwind en ligne sur ces
composants, pas de styles logés dans le CSS d'un parent.

### Le thème — la dette qu'on répare ici

Aujourd'hui `applyTheme` écrit `flwsh-theme` **même quand l'utilisateur n'a rien choisi**. Tant que
c'est le cas, « clair par défaut dans la V2 seulement » est intenable : une seule visite V2
imposerait le clair à la V1. C'est l'arbitrage n°3 resté ouvert depuis la landing V2.

On sépare donc trois états là où il n'y en avait que deux :

| État | V1 | V2 |
|---|---|---|
| Aucun choix mémorisé | nuit (défaut historique) | **clair** |
| Choix explicite « jour » | jour | jour |
| Choix explicite « nuit » | nuit | nuit |

Concrètement : `applyTheme` n'écrit en mémoire que sur un geste de l'utilisateur ; la résolution du
thème initial prend le contexte (V1 / V2) en entrée. `src/lib/theme.ts` a déjà sa batterie de tests
(`theme.test.ts`) — elle est étendue, pas remplacée.

**Aucune bascule automatique sur `prefers-color-scheme`**, conformément à 0007. Uriel navigue avec un
système en thème sombre : toute règle qui suivrait la préférence système lui montrerait du sombre et
lui ferait croire que le clair est raté. C'est déjà arrivé une fois.

### Le calque de jetons

Un bloc `.app2` qui définit ses **propres** noms parchemin — `--parchment`, `--ink`, `--ink-soft`,
`--block`, `--hairline`, `--lift`, `--rail-bg`, `--accent-app2`, `--halo-*`, `--photo-a` / `--photo-b`
— clair d'abord, sombre sous `html:not(.light) .app2`. Repris du calque `.lv2` en prod, pas
réinventé.

**Ce qu'il ne fait jamais : toucher aux jetons de `src/index.css`.** L'app consomme ~224
`hsl(var(--x))` écrits à la main dans 17 fichiers CSS. Les jetons parchemin sont en hex ; réécrire le
format des jetons existants produirait `hsl(#F4EEE1)`, du CSS invalide, et casserait les couleurs de
toute l'application. Le bug a déjà été commis ici une fois, rattrapé de justesse en revue de branche.
Les deux systèmes cohabitent : l'un scopé sous `.app2`, l'autre partout ailleurs.

---

## L'écran

### Les blocs, et ce qu'ils deviennent

Les six blocs de l'écran actuel sont tous portés. Les trois que la maquette ne montrait pas sont
conservés mais **remis au régime** — ils sont déjà conditionnels dans le code (ils ne s'affichent que
s'il y a de quoi), ce qui limite naturellement la densité.

| Bloc | V1 | V2 |
|---|---|---|
| Bonjour + « Ta prochaine action » | bandeau avec avatar | inchangé dans l'esprit, typographie 0007 |
| Prochain festival | carte | **carte maîtresse, grande image** (voir ci-dessous) |
| Ta saison | frise 12 mois | frise, billes colorées, halo doux |
| À régler · Compagnons de route · Mes bilans | 3 colonnes | 3 colonnes, blocs séparés par la teinte |
| Bandeau « Comment s'est passé X ? » | bandeau coloré + 3 boutons | **une ligne calme**, une action principale, « plus tard » discret |
| Bande « À VENIR » | bande `ck-strip grain` | **liste sobre** — la classe `grain` disparaît (0007 bannit les trames) |
| Dossiers refusés | liste dépliée avec zone de note | **replié par défaut**, s'ouvre à la demande |

### La carte « Prochain festival »

La maquette `v2-app-clair.html` (11 août, 18h47) porte des **illustrations SVG dessinées** — donjon,
tentes, oriflammes. Le même soir à 19h20, sur la landing, ce procédé a été explicitement rejeté
(*« on dirait un dessin d'enfant »*) et remplacé par de vraies affiches. **Le rejet est postérieur à
la maquette de l'app : la maquette porte encore le procédé écarté.**

La carte affiche donc **l'affiche réelle de l'événement** quand elle existe, et un **aplat teinté
neutre** (`--photo-a` / `--photo-b`) quand elle manque. C'est le traitement de la landing V2, et il
sert les principes 2 et 4 de 0007 : seules les images portent rayon et ombre, et une carte peut vivre
d'une grande image et de deux lignes de texte.

### Les données

**Ce lot ne touche ni la base, ni les hooks, ni les sélecteurs.** `CockpitV2` consomme exactement les
mêmes sources que `Cockpit` : `useMyParticipations`, `useMyReports`, `useMyLedger`, et les sélecteurs
purs de `src/lib/cockpit.ts` (`selectNextFestival`, `selectUpcomingFestivals`, `selectAReglerItems`,
`aggregateSeason`, `detectBilanPrompt`, `selectRefusedDossiers`). Le snooze du bandeau bilan garde sa
persistance existante (`bilan-snooze`).

Les composants de bloc sont en revanche dupliqués sous `src/components/cockpit-v2/`, parce que leur
balisage change et que la V1 doit rester intacte à l'octet près.

### États limites

- **Chargement** : squelette au régime parchemin (blocs teintés, pas de bordure).
- **Rien à afficher** : chaque bloc conditionnel rend `null`, comme aujourd'hui. Un Cockpit d'exposant
  sans aucune date affiche le bandeau du haut et rien d'autre — cet état doit être relu, il n'a jamais
  été maquetté.
- **Affiche manquante** : aplat teinté, jamais de cadre vide ni de logo étiré.
- **Avatar manquant** : initiales, comme en V1.

---

## Pièges connus, à ne pas re-découvrir

1. **Les CSS de ce projet sont globaux, pas des modules.** Une classe nue (`.card`, `.rail`, `.av`,
   `.list`) fuit d'un composant à l'autre — c'est déjà arrivé (v0.7.271). Toute classe V2 est
   préfixée : `ck2-`, `sd2-`, `tb2-`, `bb2-`.
2. **Icônes SVG.** Poser `.app2 svg { fill: none; stroke: currentColor; stroke-linecap: round;
   stroke-linejoin: round }` en règle de base, sinon les icônes portées deviennent des taches noires
   dans les deux thèmes.
3. **Le liseré de lumière.** Un `inset 0 1px 0 rgba(255,255,255,…)` écrit en dur se voit comme un
   trait blanc en thème sombre. Il passe par `--lift`, redéfini par thème.
4. **Texte clair codé en dur.** Jamais de `#fff` pour du texte sur surface — invisible en clair. Le
   blanc en dur n'est valable que sur un fond coloré fixe.
5. **Le `theme-toggle` est un composant partagé** qui porte les jetons de l'app. Il n'est pas
   modifié : il est **repeint sous `.app2`**, comme la landing l'a fait sous `.lv2`.
6. **Les halos.** ~17 % d'opacité, le chaud domine et le froid ponctue. Un halo bleu ou vert trop
   présent grise le parchemin et le fait paraître sale.

---

## Ce qui n'est pas dans ce lot

- Les huit autres écrans (Calendrier, Explorer, Carte, Communauté, Vitrine, Réglages, Abonnement,
  Boutique). Ils restent en « Nuit de Festival », dans le contour V2 quand l'interrupteur est allumé.
  **Conséquence assumée et visible : l'app est à deux vitesses pendant tout le chantier.**
- **La police Cabin.** 0007 la veut embarquée « seule, dans un second temps, pour mesurer son effet
  sans le mélanger au reste ». Elle ne rentre pas ici.
- **Le choix définitif de l'accent.** Terracotta est acté « pour l'instant » ; bordeaux, violet et
  bleu électrique restent sous la main dans les maquettes.
- **L'audit du vocabulaire médiéval** (« Guilde »), qui appartient à un autre chantier.
- Toute modification de la base, des RLS ou des hooks de données.

---

## Vérification

Rien n'est déclaré fait sans la sortie de commande sous les yeux.

1. `pnpm test` — logique pure : `v2-switch`, `theme` (les trois états), sélecteurs du Cockpit
   inchangés donc toujours verts.
2. `pnpm lint` puis `pnpm build` (qui enchaîne `tsc -b` et `vite build`), et
   **`grep "hsl(#\|hsl(hsl(" dist/assets/*.css` doit être vide** — la garde anti-régression du format
   des jetons.
3. **`git diff` à chaque tâche** : aucun fichier V1 modifié hors des trois points d'entrée prévus
   (`App.tsx`, `lib/theme.ts`, `lib/landing-v2.ts`).
4. **Captures headless** jour et nuit, desktop et mobile, interrupteur allumé et éteint.
5. **Uriel ouvre la page en vrai** et tranche. C'est le seul verdict qui compte.

---

## Ce qui reste ouvert

- **L'état « Cockpit vide »** (un exposant sans aucune date) n'a jamais été maquetté. À regarder au
  moment de l'intégration.
- **La bascule par défaut.** Ce lot n'allume rien pour personne : l'interrupteur reste éteint. La
  question « quand la V2 devient-elle le défaut de l'app » se pose quand assez d'écrans sont passés,
  pas maintenant.
