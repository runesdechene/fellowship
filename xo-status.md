---
updated: 2026-07-21T17:15:00Z
summary: "Grosse session : le module Discussion du festival (onglet Questions) est en prod (v0.7.380, avec avatars), ET les avis de festival ont une identité protégée COMPLÈTE, verrou final inclus (v0.7.382) — ton nom n'est visible que de tes amis pro, jamais des organisateurs, option anonymat total, et la fuite est définitivement fermée côté base. Tout est déployé."
next_step: "Tester en vrai : (1) la Discussion (poser/répondre/élire une meilleure réponse, avatars, toggles) ; (2) les avis (un non-ami voit « Un exposant vérifié », un ami voit ton nom, la case anonymat, le formulaire bloqué si pas inscrit, et vérifier que les notes moyennes + le fil Communauté s'affichent toujours). Puis : revue sécu RLS live (`set role`) sur les deux features, à faire ensemble. Ensuite, prochain chantier : onglet Rencontres."
---

<!-- `summary` et `next_step` (ci-dessus) sont lues PAR UN HUMAIN sur le tableau de bord :
  français clair, sans jargon ni détail technique. Sous le frontmatter = mémoire de travail
  de Claude, jamais affichée. Les tâches affichées viennent de la note Obsidian reliée (✎). -->

## Mémoire de session

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
