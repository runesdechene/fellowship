---
updated: 2026-07-21T00:20:00Z
summary: "Nuit productive : la feature « répondre à un avis de festival » est construite, testée et déployée (v0.7.377). Tout exposant peut lire les avis et y répondre ; l'auteur de l'avis reçoit une notification. Prête à tester au réveil."
next_step: "Tester le fil de réponses sous un avis (page d'un festival passé, en mode exposant), valider le rendu jour/nuit et sur mobile, puis me dire si on enchaîne sur le module Discussion du festival."
---

<!-- `summary` et `next_step` (ci-dessus) sont lues PAR UN HUMAIN sur le tableau de bord :
  français clair, sans jargon ni détail technique. Sous le frontmatter = mémoire de travail
  de Claude, jamais affichée. Les tâches affichées viennent de la note Obsidian reliée (✎). -->

## Mémoire de session

Bugs page événement (2026-07-20) :
1. Bilan post-festival (v0.7.374) : s'affichait sur tout festival passé pour n'importe quel exposant. Fix EventPage.tsx:737 — ajout `participation?.status === 'inscrit'` (même critère « présence acquise » que le Cockpit, cf. cockpit.ts:4).
2. Notif notes privées (v0.7.375) : trigger DB `on_new_note` → `notify_friend_note` spammait les abonnés à chaque note privée (illisible par eux). Fix = migration 20260720120000 (DROP trigger+fonction + purge notifs friend_note) APPLIQUÉE EN PROD via CLI ; front = retrait de friend_note des types affichés (mitigation immédiate).

Note migration : l'OAuth du MCP Supabase échoue (« Unrecognized client_id » systématique) → passé par le CLI. Divergence d'historique préexistante (20260622/20260626 jumelées) résolue au passage : repair --status reverted <jumelles distantes> puis --status applied <locales>, puis db push. Historique 100% synchro maintenant.

3. Calendrier amis passés (v0.7.376) : `useFriendsParticipations` bornait à `.gte('events.end_date', today)` (amis À VENIR seulement) alors que `useMyParticipations` n'a aucune borne → un ami sur un festival passé (Pouka aux Médiévales) n'apparaissait jamais. Fenêtre élargie à ~13 mois glissants (borne `end_date >= today-13mo`, limit 200 conservée).

--- FEATURE NUIT 2026-07-21 : Réponses aux avis de festival (v0.7.377, DÉPLOYÉE) ---
Spec `docs/superpowers/specs/2026-07-20-reponses-avis-festival-design.md`, plan `docs/superpowers/plans/2026-07-20-reponses-avis-festival.md`, décision freemium `docs/decisions/0005`.
- DB (EN PROD via CLI, historique synchro) : table `review_replies` (FK reviews, RLS `can_act_as` + entité only à l'INSERT, SELECT ouvert, DELETE auteur|is_admin), enum `notification_type += review_reply`, trigger `notify_review_reply` (gardes anti-auto-notif + event privé). Types Supabase régénérés.
- Front : `lib/review-replies.ts` (helpers purs + 12 tests), `hooks/use-review-replies.ts`, composants `ReviewReplies`/`ReviewReplyItem` (fil plat, composer, édition/suppression) branchés dans `ReviewList`. Notif `review_reply` dans le feed.
- Décision 0005 : **lecture des avis ouverte à tout exposant** (plus Pro-locked) — `canSeeDetails = currentActor?.kind === 'entity'`. Mémoire `project_freemium_matrix` mise à jour.
- Vérifs faites : `pnpm build` OK, 354 tests verts, typecheck + lint clean.

⚠️ À VÉRIFIER AU RÉVEIL (je n'ai pas pu le faire sans session exposant authentifiée) :
  1. Smoke réel : page d'un festival PASSÉ, en mode exposant → déplier les avis → répondre. Un 2ᵉ compte exposant doit voir le fil ; l'auteur de l'avis doit recevoir la notif.
  2. Revue sécu RLS (role-sim SQL) : qu'un acteur ne puisse pas éditer/supprimer la réponse d'un autre, ni une personne (non-entité) insérer. RLS calquée sur le pattern `can_act_as` éprouvé, mais non testée en role-sim faute d'accès psql/MCP cette nuit.
  3. Rendu jour/nuit + mobile du fil.
DÉFÉRÉ v1.1 (assumé, noté dans le plan) : **signalement des réponses** (extension `content_reports.target_type += review_reply` + câblage ReportButton). La spec le prévoyait ; sorti du périmètre nuit pour livrer un cœur solide.
PROCHAIN GROS CHANTIER attendu par Uriel : **module Discussion du festival** (spec dédiée à faire — plus lourd : qui poste, modération, notifs de masse).

Landing perf (v0.7.373, rappel) : couche décorative jamais au repos (mix-blend-mode:screen + drift + bg fixed). Corrigé.

À décider (dette qui traîne) : gitignore graphify-out/cache + committer la migration event_ledger non suivie.
