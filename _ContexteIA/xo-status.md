---
updated: 2026-08-19T00:45:00Z
summary: "Fiche d'événement debout : suivi, discussion, palette à deux couleurs."
next_step: "Maquetter avant de coder — Uriel veut dessiner, pas corriger du code livré."
---

## Tâches

- [x] Trancher : créer un événement inscrit-il automatiquement l'exposant dessus ? → « intéressé »
- [x] Écran d'un événement — ossature V1 + design V2, cockpit fonctionnel
- [x] Brancher la discussion du festival — questions, réponses, meilleure réponse
- [ ] **Maquetter la suite avant de coder** (demande d'Uriel du 19 août)
- [ ] Brancher les avis des exposants (notation 3 axes + fil de réponses)
- [ ] Écran d'édition d'un événement — débloque l'ajout au clic sur une info manquante
- [ ] Renouveler le jeton Supabase, régénérer les types, retirer le client sans schéma
- [ ] Vérifier en vrai : cocher un cran, poser une question (rien testé contre la base)
- [ ] Confirmer l'orange du logo (`#c0642a` est-il le bon ?)
- [ ] Brancher « Remplir mon bilan » sur un écran de saisie
- [ ] Décider du comportement de la cloche (sans action pour l'instant)
- [ ] Décider quand l'écran Explorer entre dans la V2
- [ ] Reprendre l'autocomplétion d'adresse de la V1 (service externe)
- [ ] Trancher : « année en cours » = année civile ou saison août→juillet ?
- [ ] Choisir le mode de déploiement de la branche v2 (preview Netlify ?)
- [ ] Deux enseignes s'appellent « Runes de Chêne » en base — vérifier si c'est voulu

## Mémoire

**19 août 2026 — la fiche d'événement est debout, et la méthode change.**
Livré : deux colonnes (structure V1, design V2), suivi en CASES À COCHER,
saisie du montant, discussion du festival, infos pratiques sans carte avec
icônes Lucide, tags aux couleurs de l'administration.

**Décisions de DA prises par Uriel ce jour-là :**
- **DEUX couleurs d'app, pas trois** : l'orange du logo et le violet
  électrique. L'olive `#84aa3c` a été RETIRÉ de la palette — il traînait
  depuis le premier commit V2, jamais décidé. « Acquis » porte désormais
  l'électrique, partout, tableau de bord compris.
- Le suivi = des cases à cocher. Une barre pleine ressemble à un bouton
  sélectionné : on ne sait pas si elle affiche ou si elle commande.
- Les infos pratiques : pas de carte, libellé en micro-capitales avec son
  icône, valeur en grand.
- Un paragraphe se lit à pleine encre (`--ink-body`), pas en encre douce.

**Ce qu'il faut retenir de la séance :** trop d'allers-retours sur du code
déjà livré. Uriel a demandé de **maquetter d'abord**. On ne code plus un
écran sans une maquette validée — et une maquette montre de VRAIES icônes,
pas des caractères Unicode.

**Pièges du jour, à ne pas refaire :**
- Les maquettes portent une COPIE des tokens : un changement de palette dans
  l'app ne les suit pas. Les aligner à la main, sinon elles montrent une DA
  morte.
- Réutiliser une classe existante (`.tag`) parce que le nom colle : celle de
  l'atelier est un bouton de 32 px en gras. Un tag qui décrit ≠ un tag qui se
  choisit.
- Les événements de la V1 stockent le SLUG d'un tag, la V2 le NOM. Indexer
  les deux.
- Des organisateurs écrivent toute leur description avec le bouton « titre »
  de l'éditeur : les `<h1>` doivent être APLATIS, sinon tout est en gras.
- Le lint refuse un `setState` synchrone atteint depuis un effet. Sortir la
  lecture du hook, comme dans `useEvent.ts`.
- Une requête Supabase est un builder, pas une `Promise` : typer `PromiseLike`.

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
