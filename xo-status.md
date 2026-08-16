---
updated: 2026-08-16T00:00:00Z
summary: "Le nouveau tableau de bord est entièrement construit, relu et fonctionne : rien n'est cassé, l'ancienne version reste intacte pour tout le monde, et le travail attend sur la machine sans avoir été mis en ligne. Ce qui bloque n'est plus technique mais visuel : l'habillage ne plaît pas. Une longue série d'essais sur les couleurs et les fonds n'a rien donné de convaincant, et la conclusion de la soirée est qu'il faut repartir d'une maquette dessinée à la main plutôt que de continuer à régler des teintes une par une. Uriel va la faire lui-même."
next_step: "Attendre la maquette qu'Uriel dessine, puis reporter ses valeurs dans l'application — l'habillage se pilote depuis un seul fichier, donc l'intégration est rapide une fois la direction arrêtée."
---

<!-- `summary` et `next_step` (ci-dessus) sont lues PAR UN HUMAIN sur le tableau de bord :
  français clair, sans jargon ni détail technique. Sous le frontmatter = mémoire de travail
  de Claude, jamais affichée. Les tâches affichées viennent de la note Obsidian reliée (✎). -->

## Mémoire de session

--- 🔴 HABILLAGE DU COCKPIT : REJETÉ, ON REPART D'UNE MAQUETTE D'URIEL (2026-08-16) ---
Le lot technique est fini et relu. Ce qui bloque est visuel, et une longue série de réglages à
chaud n'a rien donné. Ce qui a été appris, à ne pas refaire :
• **JAMAIS de serif dans l'app.** Testée sur les chiffres et les titres, rejetée net :
  « personne ne va payer pour une application en serif ». Le sans reste la règle.
• **Ne pas régler les teintes une par une en direct.** Six propositions, six rejets. Chaque
  correction ponctuelle ajoutait une couche (rail, sol, panneau, blocs) et le résultat a fini
  par être jugé « bordélique, pas reposant » — l'inverse de ce que 0007 demandait.
• **Ne pas juger sur une maquette dépouillée.** J'avais retiré halos, icônes et logo d'une
  maquette pour isoler la question des teintes ; Uriel a cru que l'app avait perdu son
  identité. Toujours dire explicitement qu'un banc d'essai n'est pas censé être beau.
• **Le vrai grief : « trop de terracotta, trop de marron, je voulais du professionnel ».**
  C'est le prix d'un arbitrage écrit dans 0007 (« accent terracotta partout, app comme
  vitrine — marque unifiée > lisibilité fonctionnelle »). À rouvrir avec lui : une piste
  testée était encre presque-noire + sol neutre chaud + terracotta réservé aux actions.
• **Cabin n'a toujours pas été embarquée**, alors que 0007 la désigne comme la porteuse de la
  reconnaissance de marque. Piste jamais essayée.
• Références utiles : Vowen (coins arrondis vers le contenu — la seule chose validée ce
  soir-là). Maquettes d'essai : `assets/v3-cockpit-tons.html`, `assets/v4-cockpit.html`.
**Prochaine étape : Uriel dessine sa maquette. On reporte ses valeurs, on n'invente plus.**
Non poussé : 13 commits d'avance sur `main`. Mes retouches de style de la soirée sont NON
COMMITÉES dans 4 fichiers (`styles/app2.css`, `layout/SidebarV2.css`, `layout/AppLayoutV2.css`,
`layout/TopbarV2.css`) — un `git checkout` dessus revient à l'état relu et validé.
Fait au passage : bascule admin V1/V2 dans le pied des deux rails (commit 5f48bf5) ; l'entité
`runesdechene` passée en `plan=pro` en base de prod (le doublon `runes-de-chene`, 0 participation,
n'a pas été touché et mériterait un nettoyage).

--- RECETTE COCKPIT V2 « PARCHEMIN » — Tâche 8 (2026-08-15) ---
Garde anti-régression complète au vert : lint 0 erreur, 464 tests passés, build OK, aucune
couleur hsl() mal formée dans le CSS compilé. V1 confirmée intacte par diff contre la base du
chantier : seuls App.tsx, theme.ts, theme.test.ts, landing-v2.ts, use-theme.tsx et index.html —
déjà existants avant le chantier — ont été touchés ; tout le reste (composants, pages, styles du
nouveau Cockpit, sidebar/barre du haut V2) est neuf. Aucune régression détectée.
Captures jour/nuit/mobile produites via un harnais statique HORS du dépôt (navigateur Edge
piloté automatiquement, feuille de style compilée du build reliée telle quelle) — PAS un vrai
navigateur sur l'app réelle avec connexion (non automatisable ici). Jour et nuit lisibles, aucun
trait blanc parasite en sombre, aucune icône noire, logo entier sans coin arrondi, pas de
débordement horizontal. **Défaut repéré sur téléphone (390px)** : la ligne « Comment s'est
passé... / Remplir mon bilan / Plus tard » ne s'empile pas sous les grands écrans — le texte est
écrasé sur une soixantaine de pixels de large et casse un mot par ligne, illisible. Confirmé par
la mesure (pas juste un rendu qui a mal tourné). Cas limites relus dans le code (pas exécutables
ici, pas de navigateur réel) : compte sans aucune date à venir → rien n'est cassé ni vide-avec-
cadre, mais le bloc « À régler » affiche quand même un état « tout est à jour » et « Compagnons »
son propre état vide — des états volontaires, pas juste le bandeau + la carte vide + l'invitation
de la frise comme décrit au départ, mais rien de cassé pour autant ; événement sans affiche →
aplat teinté confirmé, jamais de cadre vide ; retour arrière par lien → efface bien la mémoire du
navigateur et repasse à l'ancienne version ; navigation privée sans aucun stockage → ancienne
version par défaut, en thème sombre, protégé par un filet qui avale les erreurs.
Rien n'a été envoyé en ligne : c'est volontaire (personne pour juger le rendu réel en ce moment),
le travail reste local en attente d'un feu vert.
Reste ouvert : les huit autres écrans de l'application sont encore dans l'ancien thème sombre ;
la barre du haut n'a pas de recherche globale dans ce lot ; la carte « Prochain festival » a
perdu le cadenas d'événement privé et le raccourci itinéraire qu'avait l'ancienne version.

--- 🔴 RETOURNEMENT DE FIN DE SESSION : LE PAYEUR, C'EST LE GROS FESTIVAL ---
Contexte vital : Uriel a **6 mois**, plancher **1 500 €/mois**, Runes de Chêne rapporte **700 €/mois**
et décline. Trou = 800 €/mois. **Salariat exclu catégoriquement** (ne plus le proposer).
Prestation projet morte (ses clients la font eux-mêmes avec Claude Code, il l'a constaté).
Il trouve 19 €/mois trop cher **pour ses propres clients exposants** → le côté exposant ne paiera pas.
**Sa correction, décisive** : les gros festivals brassent des MILLIONS et galèrent sur leurs
dossiers exposants (mail, Google Forms, interfaces PHP maison que les exposants détestent).
→ **Deux marchés orga** : petits/moyens = visibilité (annuaire gratuit) ; **gros = outillage, et
ils paient tout**. Ils n'ont aucun besoin de notre audience.
**Tarif arrêté : 1,5 % du tarif d'emplacement par dossier VALIDÉ, plancher 4 €, plafond 30 €.**
(Les emplacements vont de 300 € à 2 400 € selon les festivals — un forfait plat ratait le haut.)
**Verrou de facturation = l'OFFRE D'EMPLACEMENT acceptée dans Fellowship, pas l'encaissement.**
Le tarif n'est pas déclaré, il est transacté → sous-déclaration structurellement impossible.
L'encaissement (Stripe Connect) n'est **plus nécessaire** au modèle.
Avantage imbattable : le formulaire est côté orga, **le dossier est côté exposant** (pré-rempli).
Ordre de grandeur : ~7 festivals comblent le trou, ~15 couvrent le plancher entier.
**Qui paie les frais : l'orga choisit** (répercuté sur le tarif d'emplacement ou absorbé) —
standard du métier, ça supprime l'objection prix. Défaut = répercuté. Calcul sur le prix de
base, choix à la création de l'événement. **Transparent obligatoire** : « 406 € · dont 6 € de
frais de dossier ». Bénéfice : l'exposant identifie Fellowship et le réclame au festival suivant.
Mise sur le marché : **prévente de 2-3 pilotes** « saison 2027, tarif fondateur gelé 2 ans ».
📌 **Uriel doit encore fournir le contenu réel d'un dossier de candidature** (il le connaît par
cœur, il le donnera plus tard). Bloquant pour spécifier le formulaire configurable.
⚠️ Honnêteté due : **ça ne fait pas 1 500 €/mois en 6 mois.** Le pont de trésorerie reste non résolu.
⚠️ Ne pas re-proposer : salariat, prestation de projet aux festivals, hausse du prix Pro exposant.

--- PAGE D'ACCUEIL V2 « ANNUAIRE » — VALIDÉE (2026-08-11) ---
Maquette : `assets/v2-landing-annuaire.html`. Structure retenue : l'annuaire d'abord
(recherche en héros + compteurs + grille filtrable), **sélecteur d'audience conservé et
FONCTIONNEL** (festivalier / exposant / organisateur — il change ce que la fiche montre :
créateurs attendus / état des candidatures / exposants qui suivent), bandeau des 19 univers
en couleurs, les 6 avantages exposant de l'ancienne page, le bloc gratuit puis le Pro dit
franchement, « fait par un exposant » (Runes de Chêne), les portes orga, les témoignages,
une bande de dernier appel, et un pied de page à 4 colonnes (PAR UNIVERS / PAR RÉGION =
portes SEO longue traîne).
⚠️ **Règles de marque apprises à la dure — ne pas les refaire :**
• Le logo = `public/icon.png` (pictogramme SEUL, 458x389). **Jamais** `pwa-192x192.png`
  (c'est l'icône PWA, carrée et rembourrée). Hauteur fixée, largeur libre, **JAMAIS de
  border-radius ni de recadrage**. Le nom est du texte à côté.
• **Pas d'illustrations SVG dessinées à la main** : rendu naïf, rejeté (« on dirait un dessin
  d'enfant »). Les vignettes d'événement sont des emplacements neutres → vraies photos/affiches.
  À demander à Uriel : ses propres photos de festivals.
• **Boutons à plat** : pas de liseré blanc en surimpression ni d'ombre colorée (« vieillot »).
  Le relief `--lift` des cartes reste, lui.
• Barre de navigation transparente en haut, fond au défilement, **sans filet**.
Reste à décider : les vrais compteurs à afficher, le texte Runes de Chêne à valider,
et l'onglet Organisateur (« Soon » ou « Référencez votre festival »).

--- DA V2 « PARCHEMIN » — décision 0007 (2026-08-11) ---
Validée par Uriel après ~8 itérations. Maquettes : `assets/v2-app-clair.html` (Cockpit /
Calendrier / Explorer navigables, jour-nuit, halos commutables, 4 accents) et
`assets/v2-landing-parchemin.html` (comparateur avant/après sur le rendu RÉEL de flw.sh).
Le calque prêt à fusionner : `assets/landing-parchemin.css`.
Le langage : parchemin `#F4EEE1` / `#171414`, encre `#594848` (jamais de noir), titres en
graisse **500** à interlettrage négatif, **blocs séparés par la teinte (`--block`) et non par
le trait**, seules les images ont rayon + ombre douce, halos à 17 %, statuts en billes
colorées, accent **terracotta** (acté « pour l'instant »).
⚠️ **Clair par défaut, aucune bascule auto sur `prefers-color-scheme`.**
⚠️ Livraison **V2 commutable sur `main`**, jamais une branche longue.
Erreurs commises et corrigées, à ne pas refaire : (1) minimal ≠ plat — le premium vient de la
matière maîtrisée, pas de son absence ; (2) trames tissées = effet grillagé, rejetées ;
(3) un `inset 0 1px 0 rgba(255,255,255,…)` en dur se voit comme un trait blanc en sombre —
tout liseré passe par un jeton par thème ; (4) en clair, un halo bleu ou vert trop présent
grise le parchemin.
Bug prod repéré : en mode jour, les maquettes d'appareils du hero restaient SOMBRES.
Reste : embarquer **Cabin**, maquetter Carte/Communauté/Vitrine/Réglages, réauditer le
vocabulaire médiéval (« Guilde »).

--- VIRAGE ANNUAIRE — décision 0006 (2026-08-11), commit e984d1d ---
Brainstorm de fond, déclencheur : « Fellowship est trop social, si ça n'aboutit pas on abandonne ».
Décision figée dans `docs/decisions/0006-virage-annuaire-homme-du-milieu.md` (à relire par Uriel).
Points saillants à ne pas perdre :
• **Le Bilan existe déjà** (`event_reports` + `event_ledger_entries`) et est verrouillé privé par
  `20260602160001_fix_event_reports_private.sql` → la machine à fossé est construite, le fil est coupé.
• **Niche PROFESSIONNELLE, pas thématique** — Uriel a explicitement rejeté le cadrage médiéval/geek
  (il fait métal + tatouage). Critère : « accueille des exposants indépendants vivant de la vente
  sur stand ». Exclut B2B/congrès/foires.
• **Facturation orga aux dossiers VALIDÉS, jamais reçus** (correction d'Uriel, il a raison).
  Lock-in = les outils aval (frais, plans d'emplacement) → doivent arriver AVEC la facturation.
• **Mediefest est rempli par les orgas et visiteurs eux-mêmes** → l'annuaire est aussi le canal
  d'acquisition ORGA, entrant et gratuit. Le plafond « 2-3 orgas » est levé.
• **Retours terrain enthousiastes (les seuls) : calendrier embarqué + threads de périple.**
  Point commun : ça sort de l'app et ça touche le réel → critère de tri des features.
  L'embed est aussi l'arme SEO (backlinks depuis les sites des exposants).
• **Anti-scope explicite** : pas de groupes de discussion, pas de DM, pas de feed de posts,
  pas de feature covoiturage, Rencontres déprioritisé.
⚠️ Deux coûts cachés du chantier 1 : **prérendu/SSG obligatoire** (SPA React mal indexée) et
**réaudit des surfaces de fuite events privés** avant d'ouvrir l'Explorer au public.
Reste ouvert : le contenu réel d'un dossier de candidature (Uriel n'a pas encore raconté sa
dernière candidature — BLOQUANT pour le chantier 2) ; acceptabilité du partage des chiffres ;
tarif orga ; audit du vocabulaire médiéval (« Guilde ») qui ne passe pas en convention tatouage.

--- AVIS À IDENTITÉ PROTÉGÉE (front déployé v0.7.381, 2026-07-21) — VERROU FINAL DIFFÉRÉ ---
Spec `docs/superpowers/specs/2026-07-21-avis-identite-protegee-design.md`, plan
`docs/superpowers/plans/2026-07-21-avis-identite-protegee.md`, décision 0005 (addendum).
Déclencheur : une exposante craint qu'un orga voie son avis attribué (représailles). Fondé :
la RLS laissait tout compte lire les avis attribués.
Modèle livré : **contenu public / identité protégée**. Nom révélé aux **amis pro** (follow
mutuel) uniquement, **jamais à un compte type `festival`** (carve-out orga par type d'acteur),
sinon « Un exposant vérifié · présent à cette édition ». **Opt-in anonymat total** (caché même
des amis). **Gate participation** : écrire un avis exige `participations.status='inscrit'`.
DB EN PROD (migrations 160000 + 160100) : colonne `reviews.anonymous`, policies d'écriture
gatées, RPC `get_event_reviews` / `get_review_replies` (SECURITY DEFINER, masquent l'actor_id,
anti-usurpation via `can_act_as(p_viewer_actor)`). Front (use-reviews/use-review-replies via RPC,
`lib/review-visibility.ts`, UI anonyme + case + gate) EN PROD.
Revue finale opus : **0 Critical/Important**. Minor : un auteur en anonyme-total qui répond dans
le fil révèle son nom à ses amis sur cette réponse (limitation documentée).
✅ **VERROU FINAL POUSSÉ** (feu vert Uriel, v0.7.382, migration `170100_reviews_lock_direct_read`) :
`drop reviews_select_scores` + `reviews_select_own` (can_act_as). La fuite d'`actor_id` d'autrui
est fermée ; l'identité ne passe plus que par les RPC gatées. **Piège évité au contrôle sécu** :
`use-community` lisait `reviews` en direct (aurait cassé) → migré sur une RPC dédiée
`get_network_reviews` (identité gatée, ami mutuel + non-anonyme, règle A validée, migration `170000`).
`event_scores` (vue) contourne la RLS → notes moyennes publiques intactes.

--- MODULE DISCUSSION FESTIVAL — onglet Questions (prod v0.7.379, avatars v0.7.380) ---
Spec/plan `...discussion-festival-questions...`. Q&R multi-publics (festivalier/exposant, orga
réservé), mono-événement, meilleure réponse verte, notifs thread_reply/best_reply, signalement,
gratuit. Avatars des participants ajoutés (v0.7.380, `ReviewAvatar`). Revue opus : 0 Critical.
⚠️ À tester : smoke réel 2 comptes + revue sécu RLS live (`set role`) pas encore passée.
Prochain gros chantier attendu : **onglet Rencontres** (spec 2).

--- À VÉRIFIER / DÉFÉRÉ (récap global) ---
1. Tester Discussion + Avis identité en conditions réelles (2 comptes, canaux, jour/nuit, mobile).
2. Feu vert pour le VERROU final des avis (voir ci-dessus).
3. Revue sécu RLS live (`set role`) : Discussion + Avis (RPC role-sim) — pas encore faite en base.
4. Vérifs restées ouvertes sur les réponses aux avis (v0.7.377) : idem smoke 2 comptes.
Rappels infra : OAuth MCP Supabase KO → CLI (`db push`) ; régén types Supabase KO (token) → `as any`.
Dette : gitignore graphify-out/cache + committer la migration event_ledger non suivie.
