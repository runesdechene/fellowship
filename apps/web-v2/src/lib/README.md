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
- `community.ts` — le fil de la communauté : lire, trier par onglet, dire les lignes et les raisons de suivre.
- `suggestions.ts` — les suggestions « Pour toi » : lire la réponse, dire la raison (recopié dans send-push).
- `push-device.ts` — ce que permet ce téléphone, le « Plus tard » de l'invitation, la clé VAPID.
- `push-phone.ts` — les gestes du navigateur : lire, s'abonner, se désabonner (aussi à la déconnexion).
- `usePhonePush.ts` — activer, couper les notifications sur ce téléphone.
- `usePushMuted.ts` — les lignes coupées de la personne (`users.push_muted`).
