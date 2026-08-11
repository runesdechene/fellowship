---
updated: 2026-08-11T00:00:00Z
summary: "Deux grandes décisions en une session. D'abord ce qu'est Fellowship — l'annuaire de référence des événements où poser son stand, gratuit et ouvert à tous les univers, les organisateurs devenant clients ensuite. Ensuite à quoi il ressemble — une apparence claire et reposante inspirée du site Runes de Chêne, validée sur maquettes pour l'application comme pour la page d'accueil. Tout est écrit dans les décisions 0006 et 0007, avec des maquettes cliquables. Rien n'est encore intégré dans le vrai code."
next_step: "Le chantier prioritaire a changé en fin de session : ce sont les gros festivals qui paient, pas les exposants. Prochaine étape, appeler deux ou trois organisateurs qu'Uriel connaît, sans rien vendre — juste comprendre comment ils gèrent leurs dossiers d'exposants aujourd'hui et ce que ça leur coûte en temps. Ensuite construire la boîte de réception des candidatures (quatre à huit semaines) avec un ou deux d'entre eux comme pilotes, et la leur prévendre au tarif fondateur. Le reste — intégrer la nouvelle apparence, la spec du calendrier — passe derrière."
---

<!-- `summary` et `next_step` (ci-dessus) sont lues PAR UN HUMAIN sur le tableau de bord :
  français clair, sans jargon ni détail technique. Sous le frontmatter = mémoire de travail
  de Claude, jamais affichée. Les tâches affichées viennent de la note Obsidian reliée (✎). -->

## Mémoire de session

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
Mise sur le marché : **prévente de 2-3 pilotes** « saison 2027, tarif fondateur gelé 2 ans ».
⚠️ Honnêteté due : **ça ne fait pas 1 500 €/mois en 6 mois.** Le pont de trésorerie reste non résolu.
⚠️ Ne pas re-proposer : salariat, prestation de projet aux festivals, hausse du prix Pro exposant.

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
