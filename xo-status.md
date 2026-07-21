---
updated: 2026-07-21T16:00:00Z
summary: "Grosse session : le module Discussion du festival (onglet Questions) est en prod (v0.7.380, avec avatars), ET les avis de festival ont maintenant une identité protégée (v0.7.381) — ton nom n'est visible que de tes amis pro, jamais des organisateurs, avec une option anonymat total. Tout est déployé et prêt à tester."
next_step: "Tester en vrai : (1) la Discussion (poser/répondre/élire une meilleure réponse, avatars, toggles de canaux) ; (2) les avis à identité protégée (un non-ami voit « Un exposant vérifié », un ami voit ton nom, la case anonymat, le formulaire bloqué si pas inscrit). Puis me donner le feu vert pour poser le DERNIER verrou DB des avis (que j'ai gardé exprès en attente)."
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
⚠️ **VERROU FINAL NON POUSSÉ** (Task 8 du plan) : migration `160200_reviews_lock_direct_read`
qui coupe la lecture directe de `reviews` (via policy RLS `reviews_select_own`, PAS un revoke
SELECT brut — sinon `useMyReview` casse). Je l'ai gardée exprès : à pousser SEULEMENT après que
tu as vérifié les avis en prod, pour ne pas risquer de casser une feature revenue-critique en ton
absence. Avant ce verrou : protection UI active, mais un client technique peut encore lire
`actor_id` en direct (bypass DB). C'est ce verrou qui ferme définitivement la fuite.

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
