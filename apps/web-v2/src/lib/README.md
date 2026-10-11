# lib — la logique sans écran

Ce que les écrans utilisent sans le redire : fonctions pures (testées à côté, `*.test.ts`) et
les quelques fournisseurs React transverses (session, décor, navigation). Avant d'écrire un
helper, regarder ici — et étendre l'existant plutôt que doubler.

- `supabase.ts` — le client unique.
- `auth.tsx` — session, casquettes, acteur actif, connexion par code (`useAuth`).
- `access.ts` + `useV2Access.ts` — qui peut ouvrir la V2 (les admins).
- `dates.ts` — **toute** la logique de dates ; non négociable (fuseau surveillé).
- `money.ts` — **tous** les montants et le registre de bilan ; non négociable.
- `friends.ts` — les amis présents sur une date, statuts programmés / confirmés.
- `threads.ts` — la logique des fils de discussion (tri, canaux, meilleure réponse).
- `tags.ts` — les catégories réglées dans l'administration.
- `rich-text.ts` — nettoyage du HTML des descriptions.
- `navigation.ts` — la navigation animée (View Transitions).
- `page-chrome.tsx` — le décor qu'une page demande à la coquille.
- `push-lines.ts` — les sept lignes du téléphone et le message envoyé (recopié dans send-push).
- `category-icons.ts` — l'icône de chaque catégorie (planche Figma 2215:2).
- `useTagStyles.ts` — les couleurs des catégories, lues une fois et partagées.
- `who-goes.ts` — la liste « Qui y va » : statut de chaque ami (Inscrit en vert, Dossier envoyé), ordre.
- `image-resize.ts` — réduire une image au navigateur avant envoi (WebP, repli JPEG).
- `vitrine-edit.ts` — les règles de l'éditeur de vitrine : adresse, liens, limites, ce qui a changé.
- `community.ts` — le fil de la communauté : lire, trier par onglet, dire les lignes et les raisons de suivre.
- `suggestions.ts` — les suggestions « Pour toi » : lire la réponse, dire la raison (recopié dans send-push).
- `push-device.ts` — ce que permet ce téléphone, le « Plus tard » de l'invitation, la clé VAPID.
- `push-phone.ts` — les gestes du navigateur : lire, s'abonner, se désabonner (aussi à la déconnexion).
- `usePhonePush.ts` — activer, couper les notifications sur ce téléphone.
- `usePushMuted.ts` — les lignes coupées de la personne (`users.push_muted`).
- `settings.ts` — les règles des Réglages : champs du profil, phrase d'une enseigne, mot de suppression.
- `deletion-plan.ts` — le plan de suppression d'un compte (recopié dans la fonction delete-account).
- `welcome.ts` — les règles de l'arrivée : étapes, validité, département, chiffres du mur.
- `geocode.ts` — les adresses de la Base Adresse Nationale : suggestions, position d'une commune.
- `create-event.ts` — les phrases de la création d'une date : ligne d'un doublon, lieu de l'aperçu.
