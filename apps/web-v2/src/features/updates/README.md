# updates — la page Nouveautés

Les mises à jour de Fellowship publiées par l'admin (`/admin/mises-a-jour`), lues sur `/nouveautes` :
la dernière dépliée, les précédentes repliées sur leur titre ; un cœur par personne, des commentaires
avec réponses signés « Prénom (Enseigne) ». Spec : `docs/superpowers/specs/2026-10-19-v2-nouveautes-design.md`.

- `UpdatesPage.tsx` — la page.
- `UpdateCard.tsx` — une note telle qu'on la lit (servie aussi à l'aperçu de l'admin).
- `UpdateConversation.tsx` — cœurs et conversation sous une note.
- `useUpdates.ts` — lecture, pastille éteinte à l'ouverture, cœurs et commentaires.
- `useUpdatesUnread.ts` — la pastille de la ligne de version et de l'onglet « Moi ».
