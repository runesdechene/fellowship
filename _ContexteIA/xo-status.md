---
updated: 2026-08-20T13:30:00Z
summary: "Le mur d'affiche part vraiment vers la droite, il ne s'éteint plus."
next_step: "Regarder le mur s'en aller : je ne peux pas voir les pixels bouger."
---

## Tâches

- [x] Trancher : créer un événement inscrit-il automatiquement l'exposant dessus ? → « intéressé »
- [x] Écran d'un événement — ossature V1 + design V2, cockpit fonctionnel
- [x] Brancher la discussion du festival — questions, réponses, meilleure réponse
- [x] **Maquetter la suite avant de coder** — méthode adoptée, ça marche
- [x] Ranger la palette chaude d'Uriel en variables
- [x] Refonte de la fiche : mur d'affiche + suivi dans la grille
- [x] Déverrouiller le suivi sur une date passée — un exposant est payé APRÈS
- [x] Les coins du panneau restent au bord de l’écran, et se posent sur l’affiche
- [x] La flèche de retour monte en haut à gauche, à côté du compte à rebours
- [x] Les boutons réagissent au survol — il n'existait nulle part dans l'app
- [x] Le mur d'affiche repart vers la droite quand on quitte la fiche
- [ ] **Regarder de visu la sortie du mur** — l'onglet piloté gèle les animations
- [ ] **Trancher : le blé OU la terre pour « il reste un geste à faire »** (les deux le disent aujourd'hui)
- [ ] Revoir « Acompte versé » sur le tableau de bord — il s'affiche en acquis alors qu'il reste le solde
- [ ] Brancher les avis des exposants (notation 3 axes + fil de réponses)
- [ ] Écran d'édition d'un événement — débloque l'ajout au clic sur une info manquante
- [ ] Renouveler le jeton Supabase, régénérer les types, retirer le client sans schéma
- [ ] Vérifier en vrai : changer un statut, saisir un montant (écritures pas testées contre la base)
- [ ] Confirmer l'orange du logo (`#c0642a` est-il le bon ?)
- [ ] Brancher « Remplir mon bilan » sur un écran de saisie
- [ ] Décider du comportement de la cloche (sans action pour l'instant)
- [ ] Décider quand l'écran Explorer entre dans la V2
- [ ] Reprendre l'autocomplétion d'adresse de la V1 (service externe)
- [ ] Trancher : « année en cours » = année civile ou saison août→juillet ?
- [ ] Choisir le mode de déploiement de la branche v2 (preview Netlify ?)
- [ ] Deux enseignes s'appellent « Runes de Chêne » en base — vérifier si c'est voulu

## Mémoire

**20 août 2026 — le survol manquait partout, et le mur n'avait qu'une moitié
de geste.**

Uriel a demandé un fond au bouton de retour, « comme la cloche », et un léger
survol sur les trois. En allant le poser j'ai découvert que **le survol
n'existait NULLE PART dans l'app** : aucun bouton ne réagissait. La règle vit
donc sur `.button`, pas sur la barre du haut — un bouton qui ne réagirait
qu'à un endroit serait un mensonge de plus qu'un réglage de moins.

Du coup la flèche ne ressemble plus à la cloche : elle EST `Button
variant="icon"`. **Deux voisins identiques qui ne se ressemblent pas se
remarquent** — ma règle « un chemin n'est pas une commande, donc pas de
surface » valait tant qu'il vivait dans le contenu, plus une fois monté dans
le châssis.

**Piège de cascade à retenir** : `.button:hover:not(:disabled)` pèse trois
classes. Une variante qui veut son propre survol doit reprendre le
`:not(:disabled)` **même sans en avoir besoin**, sinon elle pèse moins lourd
et se fait repeindre en crème.

**Piège d'observation** : `getComputedStyle` rend la valeur d'AVANT pendant
une transition CSS. J'ai cru le survol cassé sur le bouton sombre ; c'est la
capture d'écran qui a tranché. Sur un effet animé, la capture fait foi.

**Le mur d'affiche repart vers la droite** — au deuxième essai. Le premier
confiait le geste à la photographie du navigateur : nommer le mur suffisait à
faire glisser l'ancienne image. Uriel : « elle disparaît sans partir. »

**Sa cause, mesurée** : en quittant la fiche, dans le rappel de
`startViewTransition`, la route est déjà passée à « / » mais `.poster-wall`
est ENCORE dans le DOM. Le mur figurait donc sur les **deux** photos, le
navigateur les appariait, et l'ancienne glissait sous la nouvelle restée
immobile. Son hypothèse était juste à l'envers : démonté trop **tard**, pas
trop tôt.

**`useLayoutEffect` ne suffit pas** (testé) : le nettoyage part tout de suite,
mais l'état qu'il repose n'est rendu qu'APRÈS la sortie du `flushSync`. À
retenir comme règle : **ne jamais compter sur l'instant où une page retire son
décor.** Ce qui doit lui survivre doit se tenir tout seul.

Le mur **tient donc son affiche lui-même** et ne la lâche qu'une fois sorti.
Plus de dépendance ni à React, ni aux transitions de vue. Effet de bord
heureux : l'entrée et la sortie vivent enfin au même endroit.

Trois détails qui mordent : l'état dérivé s'ajuste PENDANT le rendu ;
`animationend` remonte depuis les enfants, donc **filtrer sur le nom** sinon
la fin de l'entrée démonte le mur à peine arrivé ; et en mouvement réduit la
sortie garde 1 ms d'animation au lieu de `none`, parce que c'est sa FIN qui
dit au mur de lâcher.

⚠️ **Ce que je ne peux PAS voir, et c'est structurel** : l'onglet piloté est
en arrière-plan (`visibilityState: "hidden"`). Chrome y saute **toutes les
transitions de vue** et **gèle l'horloge des animations** (`currentTime` à 0
après 1,1 s). C'est la même cause qui fait mentir `getComputedStyle` sur un
survol. Je peux vérifier la logique — classes, montage, événements — jamais
les pixels en mouvement. Ceux-là, c'est Uriel qui les regarde.

**19 août 2026, tard — la sortie n'était pas au bon étage.**

Uriel ne cliquait jamais la flèche de retour posée au-dessus du titre : la
main la cherche dans le coin, pas dans le texte. Son instinct disait « près
de la date » — et c'était la bonne raison sans le savoir : **sortir d'un
écran est du CHÂSSIS, pas du contenu**, au même titre que la cloche. Posée en
tête de la colonne, elle faisait s'ouvrir la page sur un petit contrôle gris.
Elle a rejoint le coin gauche de la barre, juste avant le compte à rebours.

`PageChrome` porte donc un troisième champ, `back` — **un chemin, jamais une
fonction** : le décor est comparé champ à champ en dépendances d'effet, et
une fonction reconstruite à chaque rendu relancerait la déclaration en
boucle. Même raison que les deux contextes séparés.

Deux détails qui se réutiliseront : la marge automatique appartient au COIN,
pas à l'accroche (pendant un chargement il n'y a pas encore de compte à
rebours, la flèche doit rester calée quand même) ; et une zone de clic plus
large que son dessin **désaligne** l'élément du bord — une marge négative du
même calcul le rattrape.

Le libellé est tombé exprès : `back` ne connaît qu'un chemin, donc aucun mot
ne peut promettre où l'on retombe quand le calendrier arrivera.

**19 août 2026, soir — un verrou posé pour une jolie phrase.**

Le suivi était gelé sur un événement passé, au nom de « après la date, ça ne
se pilote plus, ça se constate ». Uriel l’a découvert en voulant noter son
débit. La phrase sonnait juste et elle était fausse : un exposant est payé
APRÈS, il note son cachet APRÈS, il solde son acompte APRÈS. **Se méfier des
règles qui tiennent surtout parce qu’elles se formulent bien.**

Il a aussi retourné le geste des rayons : ce n’est plus l’affiche qui est la
dalle posée sur le crème, c’est le contenu qui est la feuille du dessus.


**19 août 2026, nuit — la fiche d'événement change de forme, et la méthode
« maquette d'abord » fait ses preuves.**

Uriel a dessiné dans Figma pendant que je codais. Sa proposition a battu la
mienne et je l'ai dit : je réparais le symptôme (trois contrôles voisins de
30 / 26 / 30 px sur trois fonds différents), il a retiré la cause — il ne
devrait pas y avoir de couloir de 200 px à droite. **Un vide se règle en
supprimant son contenant, pas en le remplissant.**

**Ce qui est en place :**
- l'affiche est le MUR de droite, du haut au bas de l'écran, coupée en cover
  (parti pris assumé d'Uriel)
- le suivi est remonté dans la grille principale, sous le titre
- le compte à rebours est monté dans la barre du haut
- le paragraphe de description est sorti de son cadre

**Les décisions de DA de la séance :**
- **La couleur ne sert qu'aux STATUTS.** Aucune action n'est colorée : le
  bouton principal se distingue par le contraste, pas par une teinte. C'était
  déjà écrit en couche 2 — Uriel l'a appliqué jusqu'au bout.
- **L'olive est revenu** (`#84aa3c`, exactement celui retiré l'avant-veille).
  Son œil l'a redemandé. Il dit « c'est acquis ».
- **Le violet électrique est parti** pour de bon : il ne tenait plus qu'une
  seule ligne et n'apparaît sur aucune maquette validée.
- **Une couleur, trois clartés.** La règle qui débloque tout : une pastille
  de 8 px posée à côté d'un mot déjà lisible ne porte aucun sens seule, donc
  elle garde la teinte BELLE. Ce n'est que quand la couleur PORTE du texte
  qu'elle doit descendre à 4,5:1. On ne perd la teinte nulle part.
- **La subtilité est une affaire de CLARTÉ, pas de teinte.** Le vert qui
  gênait Uriel était à 55 % de clarté — un aplat. Les fonds de statut qui
  marchent sont à 81–88 % — des lavis. La couleur ne pèse plus.

**Pièges du jour :**
- **`filter: blur()` coûte le prix de la couche AFFICHÉE**, pas de la source.
  Flouter 737 × 1291 a figé le moteur de rendu (les captures expiraient). La
  sortie : redessiner l'image dans un canevas de 40 px de large et la laisser
  se ré-agrandir — le lissage FAIT le flou, gratuitement, et l'aperçu pèse
  1 Ko. Les couleurs du voile sortent du même canevas.
- **`--ink-soft` était à 2,25:1 sur une carte**, posé 60 fois dans 17
  composants : toute la couche d'information secondaire de l'app était sous
  le seuil de lisibilité. Relevé à `--brown-600` (4,91:1). La hiérarchie se
  fait par la taille et la graisse, pas par la pâleur — la pâleur marche sur
  un écran calibré, pas sur celui d'un exposant en plein soleil.
- **Deux contextes, pas un**, pour « la page déclare son décor » : mélanger le
  lecteur et l'écrivain fait boucler l'effet, puisque déclarer change la
  valeur du contexte donc l'identité de la fonction.
- **État dérivé d'une prop : ajuster PENDANT le rendu**, pas dans un effet.
  Le lint le refuse et le patron React est meilleur (pas de rendu de trop).
- Les scripts `node -e` en shell : les gabarits de chaîne et les backticks se
  font manger. Passer par un fichier dès qu'il y a plus de deux lignes.
- Les fichiers du repo sont en **CRLF** : normaliser avant tout remplacement
  de bloc multi-lignes, sinon l'ancre est introuvable.
- Retirer des tokens à la ligne casse les **déclarations multi-lignes** et
  laisse des fragments orphelins que PostCSS refuse. Vérifier après coup.
- Les apostrophes du CSS de ce projet sont **droites**, pas typographiques.

**Maquettes.** `public/maquettes/fiche-evenement-v2.html` porte les trois
axes comparables en un clic (module de statut, traitement de l'affiche,
couleur du « à faire »). Publiée aussi en lien permanent :
https://claude.ai/code/artifact/869887e7-9f98-45fb-bf1b-4f9a667a6604

**18 août 2026 — la discipline est écrite.** `docs/xo-discipline.md` réécrit
pour Fellowship, `docs/db/` créé. Canal DB tranché : **MCP Supabase en
lecture libre, écriture par `db push` uniquement**.

**Où on en est.** Branche `v2`. La V1 reste lisible dans le worktree
`../fellowship-legacy`. Serveur de dev : `pnpm dev` → localhost:5173.
Écrans : connexion, tableau de bord, création d'événement, fiche d'événement.
