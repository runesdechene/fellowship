---
updated: 2026-08-11T00:00:00Z
summary: "Session de fond : on a redéfini ce qu'est Fellowship. Le constat de départ — trop social, pas assez utile — a débouché sur un virage clair : Fellowship devient l'annuaire de référence des événements où poser son stand, gratuit et ouvert à tous les univers (médiéval, métal, tatouage, créateurs, Noël), avec le calendrier, le carnet de réseau et les threads de périple autour. Les organisateurs entrent par cette porte gratuite et deviennent clients ensuite, facturés uniquement sur les dossiers qu'ils valident. Tout est écrit et figé dans la décision 0006."
next_step: "Écrire la spec du chantier retenu : le meilleur calendrier exposant pour chiner des dates et retrouver ses potes, gratuit. Deux questions à trancher dedans, et elles sont produit et non techniques — quelles informations sont obligatoires quand on ajoute un festival pour que la fiche serve aussi aux autres sans alourdir la saisie, et comment présenter quatre cents événements à quelqu'un qui n'en cherche que dix. Point le plus critique du plan : ajouter un événement doit tenir en trente secondes sur un téléphone."
---

<!-- `summary` et `next_step` (ci-dessus) sont lues PAR UN HUMAIN sur le tableau de bord :
  français clair, sans jargon ni détail technique. Sous le frontmatter = mémoire de travail
  de Claude, jamais affichée. Les tâches affichées viennent de la note Obsidian reliée (✎). -->

## Mémoire de session

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
