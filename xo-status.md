---
updated: 2026-08-16T19:00:00Z
summary: "La V2 tourne sur sa branche : tableau de bord complet avec la frise des mois, la prochaine date, les dates à venir, les bilans de l'année et la bande qui réclame le bilan manquant — le tout piloté par des variables de style classées en trois couches."
next_step: "Décider ce qui entre ensuite : rendre le sélecteur d'enseigne fonctionnel, ou ouvrir l'écran de saisie du bilan derrière le bouton « Remplir mon bilan »."
---

## Tâches

- [ ] Rendre le sélecteur d'enseigne fonctionnel (le compte gère 3 enseignes, le chevron est inerte)
- [ ] Brancher « Remplir mon bilan » sur un écran de saisie
- [ ] Décider du comportement du bouton « Ajouter une date » (sans action pour l'instant)
- [ ] Décider du comportement de la cloche (sans action pour l'instant)
- [ ] Décider quand l'écran Explorer entre dans la V2
- [ ] Trancher : « année en cours » = année civile ou saison août→juillet ?
- [ ] Choisir le mode de déploiement de la branche v2 (preview Netlify ?)
- [ ] Deux enseignes s'appellent « Runes de Chêne » en base — vérifier si c'est voulu

## Mémoire

**Où on en est (16 août 2026)**

La V2 vit sur la branche `v2`. La V1 reste lisible côte à côte dans le worktree
`../fellowship-legacy` (figé sur `main`). Serveur de dev : `pnpm dev` → localhost:5173.

Écrans : connexion + tableau de bord. Rien d'autre.

**Cadre de travail posé par Uriel**
- Le design est le sien. Je n'améliore pas la maquette de moi-même : j'intègre.
  Les propositions graphiques se discutent avant, elles ne se codent pas d'office.
- On travaille élément par élément, pas par refontes globales.
- Les captures qu'il envoie sont souvent zoomées : ne JAMAIS en déduire des
  tailles en pixels sans lui demander l'échelle.

**Décisions de style**
- CSS natif en trois couches, un fichier par composant, zéro Tailwind.
  Doc d'usage : `docs/v2/DESIGN-SYSTEM.md`.
- Aucune ombre nulle part. Les plans se distinguent par le fond.
- Navigation : icônes alignées verticalement, le fond change au survol et à
  l'état actif — même couleur pour les deux (`#E4E1DB`).
- Le bouton d'action principal se distingue par le CONTRASTE (surface sombre),
  pas par une couleur vive. Le terracotta plein a été écarté.
- Les grands titres de bloc sont posés au-dessus des cartes, jamais dedans.
- Contenu de la page centré ; la barre du haut reste calée au bord (c'est du
  châssis, pas du contenu).

**Pièges rencontrés, à ne pas refaire**
- **Un seul serveur Vite à la fois.** Deux instances sur le même dossier ont
  servi une version figée pendant une heure et fait chercher un bug inexistant.
- Les montants de bilan viennent de `event_ledger_entries`, PAS des colonnes
  `revenue`/`booth_cost`/`charges` de `event_reports` (reliquat non alimenté).
- Toute requête dont on prend « le premier résultat » doit être TRIÉE. Sans tri,
  l'enseigne active basculait toute seule et vidait le tableau de bord.
- Ne pas graver un choix que l'utilisateur n'a pas fait (l'enseigne par défaut).
- Un rejet d'alerte persistant sans moyen de revenir en arrière est un cul-de-sac.
- En CSS, un composant ne réécrit pas `width` sur une classe partagée : il
  redéfinit la variable. Sinon l'ordre des imports décide du gagnant.

**Écarté**
- Tailwind, un repo séparé pour la V2, l'écran Explorer (pas maquetté),
  le dégradé de bord sur les bilans, la pile d'affiches « +X », le lien
  « Tout voir », le plafond à 5 bilans.
