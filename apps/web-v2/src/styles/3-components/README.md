# styles/3-components — un fichier par composant

Chaque fichier habille un composant (son en-tête dit lequel) et ne lit que les variables de
`2-semantic.css`. Aucune valeur en dur : une couleur, une taille ou une durée qui manque
s'ajoute d'abord à `1-primitives.css`, prend son sens dans `2-semantic.css`, puis s'utilise ici.

`page-transition.css` porte les animations de changement d'écran (`lib/navigation.ts`).
