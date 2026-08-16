---
updated: 2026-08-16T17:35:00Z
summary: "La refonte V2 est lancée sur sa propre branche : le tableau de bord de la maquette est intégré avec les vraies données, et tout le design est piloté par des variables classées en trois couches."
next_step: "Ouvrir l'app en local et comparer écran à écran avec la maquette Figma, puis me dire ce qui décroche."
---

## Tâches

- [ ] Comparer le rendu local à la maquette Figma et relever les écarts
- [ ] Trancher : garder l'emoji 🫡 dans l'accroche ou non
- [ ] Décider du comportement du bouton « Ajouter une date » (aucune action pour l'instant)
- [ ] Décider du comportement de la cloche (aucune action pour l'instant)
- [ ] Décider quand l'écran Explorer entre dans la V2
- [ ] Choisir le mode de déploiement de la branche v2 (preview Netlify ?)

## Mémoire

**Décisions du 16 août 2026**
- La V2 vit sur la branche `v2` du repo. La V1 reste lisible côte à côte dans
  le worktree `../fellowship-legacy` (figé sur `main`).
- Le WIP qui traînait sur `main` (SidebarV2, TopbarV2, app2.css) a été commité
  localement avant de brancher — **jamais poussé**, pour ne pas déclencher Netlify.
- Design : **CSS natif en trois couches**, un fichier par composant. Tailwind
  retiré. Doc d'usage : `docs/v2/DESIGN-SYSTEM.md`.
- Périmètre : uniquement l'écran maquetté + la connexion. Explorer figure dans
  la barre mais ne mène nulle part (rendu comme libellé, pas comme lien).
- Base de données inchangée, aucune migration.

**Cadre de travail posé par Uriel**
- Le design est le sien. Je n'améliore pas la maquette de moi-même : j'intègre.
  Les propositions graphiques se discutent avant, elles ne se codent pas d'office.
- On travaille élément par élément, pas par refontes globales.

**Écarté**
- Tailwind (rendait les valeurs invisibles depuis les fichiers CSS).
- Un dossier ou un repo séparé pour la V2 : c'est une branche.
- Ajouter l'écran Explorer : il n'est pas maquetté, ce serait l'inventer.

**Points restés ouverts côté maquette**
- Dans la maquette, l'icône « Explorer » est décalée de 12 px par rapport à
  « Tableau de bord ». Les deux ont été alignées dans l'intégration.
- La maquette écrit « dates programmés » et « Aout » ; l'app affiche
  « dates programmées » et « Août ».
