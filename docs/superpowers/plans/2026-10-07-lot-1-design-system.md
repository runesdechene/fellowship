# Lot 1 — Design system « 2027 » — plan

> Spec : `docs/superpowers/specs/2026-10-07-design-system-2027-design.md`. Plan directeur :
> `2026-10-07-v2-2027-plan-directeur.md`. Exécuté en autonomie la nuit du 07/10/2026.

**But** : l'existant de la V2 prend le langage « 2027 » sans changer de fonction.

**Garde-fous** : stylelint (aucune valeur en dur hors des couches 0-2), en-têtes, build, tests ;
chaque écran comparé à son cadre Figma.

## Tâches

1. **Polices** — `apps/web-v2/index.html` : Inter (400, 500, 600, 700) et Instrument Serif (400, italique)
   depuis Google Fonts, à la place de Plus Jakarta Sans.
2. **Couche 1** — `1-primitives.css` : nouvelle matière (neutres chauds, encres, dégradé terre du logo,
   familles), échelle d'arrondis complétée ; les primitives orphelines retirées en fin de lot.
3. **Couche 2** — `2-semantic.css` : chaque jeton pointe vers la nouvelle matière, en gardant les noms ;
   nouveaux jetons `--brand-gradient`, `--family-display`, `--line-card`, `--type-display-*`.
   Plus d'olive / blé / argile / électrique : statuts neutres, la terre pour « acquis », liens à l'encre.
4. **Cartes bordées** — les composants qui posent `--surface-card` gagnent un filet `--line-card`.
5. **Pastilles** — `chip.css` : gélules, 12 px ; « acquis » en dégradé et encre blanche ; les autres
   blanches bordées. Tags : liseré dans leur couleur.
6. **Grands titres en serif** — titre de la fiche, nom de la prochaine date, question de l'atelier.
7. **Vérification** — lint, tests, build ; captures dev comparées aux cadres « 2027 » ; corrections.
8. **Doc** — `docs/v2/DESIGN-SYSTEM.md` réécrit pour le langage « 2027 ».
9. **Déploiement** de la V2 ; lot coché dans le plan directeur.

## Carnet

(une ligne par tâche terminée : commit, vérification)
