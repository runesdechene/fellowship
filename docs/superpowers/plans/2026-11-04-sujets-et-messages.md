# Plan — les sujets et Messages

> Conception : `docs/superpowers/specs/2026-11-04-sujets-et-messages-design.md`. Maquette : Figma
> page Story (`2727:291`).

1. **Migration** `supabase/migrations/20261104130000_sujets_et_messages.sql` : tables, helper
   `can_see_conversation`, policies SELECT, RPC d'écriture et de lecture, publication temps réel,
   policies du bucket `discussions`. Appliquer (`db push --linked`), vérifier en prod, régénérer
   `types/supabase.ts`.
2. **Logique pure** `lib/discussions.ts` + test : délai restant, regroupement des bulles, couleur
   d'une conversation, libellés et validation.
3. **Écritures et lectures** `lib/discussion-api.ts` : appels RPC, envoi et URL signée des médias.
4. **Écrans** `features/discussions/` : barre des sujets, lancer un sujet, le tchat (tiroir ou
   plein écran), la page Messages et son détail, nouveau message, feuille des membres.
5. **Châssis** : la barre dans `AppShell`, l'icône Messages dans `Topbar`, les routes
   `/messages`, `/messages/nouveau`, `/messages/:id`, le paramètre `?discussion=` pour le tiroir.
6. **Vitrine** : le bouton « Écrire ».
7. **Style** : `styles/3-components/discussions.css`, jetons en couche 2 (jour et nuit).
8. **Vérifier** : lint, `tsc -b`, tests, parcours dans le navigateur ; commit par étape.
