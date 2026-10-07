# components — ce qui se réutilise d’un écran à l’autre

- `layout/` — le châssis autour de chaque écran connecté (barre latérale, barre du haut, mur d’affiche).
- `ui/` — les briques : bouton, pastille, sélecteur, champs, avatar…

Un composant d’ici ne connaît aucun écran : ce qui est propre à un écran vit dans `features/`.
