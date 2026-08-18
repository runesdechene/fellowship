---
updated: 2026-08-18T12:00:00Z
summary: "Créer une date la marque « intéressé » : elle apparaît tout de suite dans à venir."
next_step: "Construire l'écran d'un événement — tous les liens morts y mènent."
---

## Tâches

- [x] Trancher : créer un événement inscrit-il automatiquement l'exposant dessus ? → « intéressé »
- [ ] Écran d'un événement (les doublons, les bilans et les dates y mènent tous)
- [ ] Brancher « Remplir mon bilan » sur un écran de saisie
- [ ] Décider du comportement de la cloche (sans action pour l'instant)
- [ ] Décider quand l'écran Explorer entre dans la V2
- [ ] Reprendre l'autocomplétion d'adresse de la V1 (service externe)
- [ ] Trancher : « année en cours » = année civile ou saison août→juillet ?
- [ ] Choisir le mode de déploiement de la branche v2 (preview Netlify ?)
- [ ] Deux enseignes s'appellent « Runes de Chêne » en base — vérifier si c'est voulu

## Mémoire

**18 août 2026 — la discipline est écrite.** `docs/xo-discipline.md` était une
copie du repo Citadelle (il citait `apps/explore-web`, les lieux, les factions).
Réécrit pour Fellowship, et `docs/db/` créé avec `gotchas.md` et
`migrations-workflow.md`. Canal DB tranché : **MCP Supabase en lecture libre,
écriture par `db push` uniquement** — `apply_migration` applique en prod sans
écrire le fichier local, donc le repo perd la migration.
`_ContexteIA/` est enfin commité (il ne l'avait jamais été).

**Où on en est (17 août 2026)**

Branche `v2`. La V1 reste lisible dans le worktree `../fellowship-legacy` (figé sur
`main`). Serveur de dev : `pnpm dev` → localhost:5173.

Écrans : connexion, tableau de bord, création d'événement.

Le tableau de bord contient : accroche, bande d'action « remplir ton bilan », frise
des 12 mois, prochaine date, à venir, à régler, mes bilans de l'année.

**Cadre de travail posé par Uriel**
- Le design est le sien. Je n'améliore pas la maquette de moi-même : j'intègre.
  Les propositions graphiques se discutent avant, elles ne se codent pas d'office.
- On travaille élément par élément, pas par refontes globales.
- Les captures qu'il envoie sont souvent zoomées : ne JAMAIS en déduire des
  tailles en pixels sans lui demander l'échelle.
- Les maquettes se font en HTML avec les tokens réels, servies par le serveur de
  dev (`public/maquettes/`). Pas dans Figma.

**Décisions de style**
- CSS natif en trois couches, un fichier par composant, zéro Tailwind.
  Doc d'usage : `docs/v2/DESIGN-SYSTEM.md`.
- Aucune ombre nulle part. Les plans se distinguent par le fond. Seule exception
  assumée : un liseré sur les menus flottants, qui doivent se décoller du contenu.
- Le bouton d'action principal se distingue par le CONTRASTE (surface sombre),
  jamais par une couleur vive.
- Les grands titres de bloc sont posés au-dessus des cartes, jamais dedans.
- Contenu centré ; la barre du haut reste calée au bord (c'est du châssis).

**Pièges rencontrés, à ne pas refaire**
- **Un seul serveur Vite à la fois.** Deux instances sur le même dossier ont
  servi une version figée pendant une heure et fait chercher un bug inexistant.
- **Vérifier qu'une option de bibliothèque s'applique à NOTRE configuration.**
  `viewTransition` de React Router n'existe que dans le routeur de données ;
  avec `BrowserRouter` elle est ignorée sans rien dire.
- Les montants de bilan viennent de `event_ledger_entries`, PAS des colonnes
  `revenue`/`booth_cost`/`charges` de `event_reports` (reliquat non alimenté).
- Le montant « à régler » est LA ligne d'emplacement (`source = stepper`,
  `direction = out`), jamais une somme.
- Toute requête dont on prend « le premier résultat » doit être TRIÉE. Sans tri,
  l'enseigne active basculait toute seule et vidait le tableau de bord.
- Ne pas graver un choix que l'utilisateur n'a pas fait (l'enseigne par défaut).
- Un rejet d'alerte persistant sans moyen de revenir en arrière est un cul-de-sac.
- En CSS, un composant ne réécrit pas `width` sur une classe partagée : il
  redéfinit la variable. Sinon l'ordre des imports décide du gagnant.
- Deux hexadécimaux de clarté différente ne retombent jamais sur la même teinte.
  Pour une famille de nuances, passer par HSL avec teinte et saturation partagées.
- Raccourcir une transition la rend plus sèche, pas plus douce.

**Écarté**
- Tailwind, un repo séparé pour la V2, l'écran Explorer (pas maquetté),
  le dégradé de bord sur les bilans, la pile d'affiches « +X », le lien
  « Tout voir », le plafond à 5 bilans, la modale pour créer un événement.
