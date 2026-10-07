# styles — tout le design de la V2

Trois couches, et une couche ne lit que celle du dessus. Guide complet, écrit pour Uriel :
`docs/v2/DESIGN-SYSTEM.md`.

- `index.css` — l'ordre des imports.
- `0-reset.css` — neutralise le navigateur.
- `1-primitives.css` — la matière : couleurs, tailles, espaces, durées et courbes, en valeurs brutes.
- `2-semantic.css` — le sens : à quoi sert chaque valeur. On y touche 90 % du temps.
- `3-components/` — un fichier par composant. **Aucune valeur en dur ici**, que des variables.

Aucun style dans les `.tsx`. Chaque fichier CSS dit en tête quel composant il habille.
