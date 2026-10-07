# Fellowship V2 — Le design, et comment le changer

> **Langage « 2027 »** depuis le 07/10/2026 : les maquettes de la rangée « 2027 » du Figma font
> foi. Ce qu'elles demandent au code : `docs/v2/maquettes-2027.md`.

## 0. Le langage « 2027 » en dix règles

1. **Fond blanc à peine chaud** (`--sand-50`) ; la barre latérale garde le beige d'Uriel et son panneau à arrondi inversé.
2. **Les plans se lisent au filet** (`--line-card`), plus à l'aplat beige : une carte est blanche et bordée. Aucune ombre.
3. **Deux polices** : Inter pour tout ; **Instrument Serif** pour les grands moments seulement — nom d'un festival, d'une enseigne, d'un mois, chiffre phare (`--type-display-*`, `--type-event-title`).
4. **Deux encres** (`--ink-950`, `--ink-600`) et un tertiaire (`--ink-350`). La hiérarchie vient de la taille et de la graisse.
5. **La couleur vient des affiches et des tags.** Un tag porte toujours sa couleur (réglée dans l'administration).
6. **La terre du logo dit « acquis »** et rien d'autre (`--brand-gradient`) : inscrit, payé, bénéfice. Exceptions assumées : l'onglet actif sur mobile, l'action principale de la landing.
7. **Les statuts se lisent par la forme** : intéressé = cercle vide, dossier envoyé = cercle à moitié plein, inscrit = dégradé. Le gris pour ce qui n'est pas acquis.
8. **Plus de vert**, sauf le point « en direct » de l'activité du réseau.
9. **Le bouton principal est noir** ; un lien est à l'encre, avec une flèche.
10. **Le Pro se signale par une petite pastille noire « Pro »**, jamais par un cadenas.

Ce document s'adresse à toi, pas à un développeur. Il dit **où aller** pour
modifier quoi que ce soit de l'apparence, sans jamais toucher au code React.

---

## 1. Le principe

Tout le style vit dans `apps/web-v2/src/styles/`. Rien d'autre. Aucun fichier `.tsx` ne
contient de couleur, de taille ou d'espacement.

```
apps/web-v2/src/styles/
├── index.css              l'ordre des imports. Ne pas y toucher.
├── 0-reset.css            neutralise le navigateur. Ne pas y toucher.
├── 1-primitives.css       LA MATIÈRE : les couleurs, tailles, espaces bruts.
├── 2-semantic.css         LE SENS : à quoi sert chaque valeur.  ← 90 % du temps
└── 3-components/          UN FICHIER PAR COMPOSANT.
    ├── app-shell.css
    ├── sidebar.css
    ├── topbar.css
    ├── dashboard.css
    ├── season-chart.css
    ├── next-date-card.css
    ├── upcoming-card.css
    ├── avatar.css
    ├── chip.css
    ├── button.css
    └── login.css
```

Une règle, une seule : **une couche ne lit que la couche juste au-dessus.**

- La couche 3 (composants) utilise les variables de la couche 2.
- La couche 2 utilise les variables de la couche 1.
- La couche 1 est la seule à contenir des vraies valeurs (`#f2f0ec`, `14px`).

Si tu écris `#f2f0ec` directement dans `sidebar.css`, ça marche — mais tu
viens de créer une valeur que personne ne retrouvera. C'est exactement ce que
cette architecture évite.

---

## 2. Les trois couches, concrètement

### Couche 1 — `1-primitives.css` : la matière

On y nomme les choses par **ce qu'elles sont**, jamais par leur usage.

```css
--sand-200: #f2f0ec; /* une teinte, point */
--ink-950: #1f1d1b;
--size-26: 26px;
--space-23: 23px;
--round-15: 15px;
```

**Quand y toucher :** pour changer la palette elle-même, ou ajouter une teinte
qui n'existe pas encore.

### Couche 2 — `2-semantic.css` : le sens ← **c'est ici qu'on joue**

On y dit **à quoi sert** chaque valeur brute.

```css
--surface-card: var(--sand-0);      /* le fond des cartes */
--ink-title: var(--ink-950);      /* la couleur des titres */
--radius-card: var(--round-15);     /* l'arrondi des cartes */
```

**Quand y toucher :** tout le temps. C'est la couche des décisions.
Changer une ligne ici change l'app entière, d'un coup, partout.

### Couche 3 — `3-components/` : l'assemblage

Un fichier par composant. Chaque fichier commence par un commentaire qui dit
quel fichier `.tsx` l'utilise. On y trouve la structure (flex, grille,
positions), jamais de valeur en dur.

```css
.upcoming {
  width: var(--card-width);
  padding: var(--space-17) var(--card-padding);
  background: var(--surface-card);
  border-radius: var(--radius-card);
}
```

**Quand y toucher :** pour modifier la mise en page d'UN composant précis,
sans toucher aux autres.

---

## 3. Recettes

### Changer un neutre, une encre, la terre
`1-primitives.css` → la palette SABLE (`--sand-*`), l'ENCRE (`--ink-*`), la TERRE (`--terre-700` et
`--terre-400`, le départ et l'arrivée du dégradé du logo). Toute l'app suit.

### Rendre toutes les cartes un peu teintées
`2-semantic.css` → `--surface-card: var(--sand-100);` (et garder `--line-card`, sinon elles se fondent).

### Adoucir les titres
`2-semantic.css` → `--ink-title: var(--ink-600);`

### Coins moins arrondis partout
`2-semantic.css` → `--radius-card`, `--radius-nav`, `--radius-panel`.

### Interface plus dense / plus aérée
`2-semantic.css` → `--gap-section` (entre les grands blocs),
`--page-gutter` / `--page-padding-top` (marges du panneau),
`--page-max-width` (largeur de la colonne centrée),
`--card-padding` (intérieur des cartes).

### Changer la police
`1-primitives.css` → `--family-sans` (l'interface) ou `--family-display` (les grands titres en serif).
**Puis** déclarer la police dans `apps/web-v2/index.html` (le `<link>` Google Fonts).

### Changer une taille de texte précise
Chaque texte a un **rôle** en couche 2 : `--type-page-title`, `--type-event-title`,
`--type-display-m`, `--type-list-name`… Format : `graisse taille/interligne famille`.
Si la taille voulue n'existe pas, l'ajouter d'abord en couche 1.

### Régler le graphe de saison
`2-semantic.css`, bloc « GRAPHE DE SAISON » :
- `--chart-bar-min` : hauteur d'une barre à zéro
- `--chart-bar-max` : hauteur du mois le plus chargé
- `--chart-column-gap` : écart entre les colonnes (leur largeur n'est pas
  réglable : la frise remplit toute la largeur du contenu et les douze mois
  se la partagent également, comme les blocs du dessous)
- `--chart-label-gap` : distance entre la barre et le nom du mois

La hauteur de chaque barre est calculée entre ces deux bornes, proportionnellement
au nombre de dates. Aucun nombre n'est écrit dans le code.

### La couleur de ce qui est acquis
`2-semantic.css` → `--brand-gradient` (le dégradé), `--status-ok-*` (l'encre et le fond quand la
mention n'est pas en dégradé). Les autres statuts (`--status-todo-*`, `--status-pending-*`) sont
volontairement neutres : la forme de l'icône dit l'état.

### Élargir la colonne de gauche
`2-semantic.css` → `--shell-sidebar-width`, puis `--sidebar-padding-x` pour
réaligner la carte de compte et la navigation.

### Régler le repli de la colonne de gauche
Le bouton en haut à droite replie la colonne en un rail d'icônes. Tout est
piloté par la classe `.app-shell--collapsed`, qui ne fait que **redéfinir
quelques variables** (`app-shell.css`) — aucun composant n'est démonté :

- `--shell-sidebar-width-collapsed` : largeur du rail (88 px)
- `--sidebar-collapse-motion` : vitesse et courbe de l'animation
- dans `.app-shell--collapsed` : `--sidebar-padding-x` et `--sidebar-logo-top`
  se resserrent pour centrer les icônes et dégager le bouton

Le réglage est mémorisé (`localStorage`, clé `flwsh-sidebar-collapsed`) : la
colonne se rouvre dans l'état où on l'a laissée.

---

## 4. Ce que contient la V2, et rien d'autre

Écrans intégrés :

| Écran | Chemin | Contenu |
|---|---|---|
| Tableau de bord | `/` | Exactement la maquette : accroche, graphe 12 mois, carte « Ma prochaine date », liste « À venir » |
| Connexion | `/connexion` | Hors maquette. Email → code à six chiffres. Aucune création de compte. |

L'entrée **Explorer** existe dans la colonne de gauche mais ne mène à aucun
écran : elle est rendue comme un libellé, pas comme un lien. Le jour où
l'écran existe, il suffit de renseigner son chemin dans `Sidebar.tsx`
(`NAV_ITEMS`, champ `to`).

---

## 5. D'où viennent les données

La base est celle de la V1, inchangée. Aucune migration nouvelle.

| Élément de la maquette | Source |
|---|---|
| Nom + avatar dans la colonne de gauche | `entities` (l'enseigne active) via `memberships` |
| « Tu as encore N dates programmées » | `participations` de statut `inscrit`, `confirme` ou `en_cours`, sur des événements non terminés |
| Barres du graphe | les mêmes participations, regroupées par mois de début |
| Ma prochaine date | la participation dont l'événement commence le plus tôt |
| À venir | les trois suivantes |
| « 3 amis » + avatars | abonnements **réciproques** (`follows` dans les deux sens) présents sur la même date |
| À régler | dates **à venir** dont le dossier est parti sans réponse (`en_cours`), ou qui sont inscrites sans être soldées (`payment_status` = `a_payer` ou `acompte_verse`). Le montant est **la** ligne d'emplacement du registre (`source = stepper`, `direction = out`) — jamais une somme, qui mélangerait la dette et les frais. |
| Mes bilans | **toutes** les dates passées confirmées **de l'année en cours** — il n'existe pas d'écran d'historique, tout vit sur le tableau de bord et la rangée passe à la ligne. Montants calculés depuis `event_ledger_entries` : recette = somme des entrants, net = entrants − sortants. Aucune ligne de registre = bilan à remplir. Les années précédentes attendent un écran d'historique. |
| Total de saison | net cumulé des dates passées de l'année en cours, sous le titre du bloc |

Les colonnes `revenue` / `booth_cost` / `charges` de `event_reports` sont un
reliquat de l'ancien modèle : **elles ne sont plus alimentées, ne pas les lire.**

`interesse` et `refuse` ne comptent jamais comme une date programmée.

---

## 6. L'ancien code

La V1 vit à côté, dans `apps/web` du même dépôt (monorepo depuis le 07/10/2026). On la relit pour
comprendre un comportement, jamais pour en copier le code.
