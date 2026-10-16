# features/admin-prospects

La page Prospects de l'administration (`/admin/prospects`, lot 3, maquette `2343:2`) : les contacts
à démarcher, travaillés directement dans le tableau.

- `ProspectsPage.tsx` — la page : en-tête, chiffres, bandeau, outils, tableau, pages, fenêtres.
- `useProspects.ts` — charge une page, les chiffres, les nombres des filtres, les sources et les correspondances.
- `ProspectsStats.tsx` — les quatre chiffres.
- `MatchBanner.tsx` — le bandeau des prospects qui ont l'e-mail ou le téléphone d'un compte.
- `ProspectsTable.tsx` — le tableau modifiable, et la ligne d'un prospect en cours d'ajout.
- `ProspectCells.tsx` — les cellules : texte, liste, contact (canal et date), case.
- `prospect-writes.ts` — les écritures : cellule, ajout, suppression, rapprochement, import.
- `ImportDialog.tsx` — la fenêtre d'import CSV, avec son aperçu.
- `MatchDialog.tsx` — la fenêtre « Voir et rapprocher ».
- `ProspectPage.tsx` — la page d'un prospect : fil, écriture, suiveur, informations (lot 3b).
- `useProspect.ts` — charge le prospect, son fil, les modèles et les expéditeurs.
- `ThreadCard.tsx` — le fil des échanges.
- `ComposeCard.tsx` — écrire : modèle, objet, texte, envoi par prospect-send.
- `OwnerMenu.tsx` — « Suivi par » : changer le suiveur, prendre le relais.
- `ProspectSideCards.tsx` — informations modifiables, note, compte créé.
- `TemplatesPage.tsx` — « Modèles et expéditeurs » (`/admin/prospects/modeles`).
- `useTemplates.ts` — charge modèles, expéditeurs et comptes admins.
- `SendersCard.tsx`, `SenderDialog.tsx` — les adresses @equipe.flw.sh et leur fenêtre.
- `TemplatesCard.tsx`, `TemplateEditor.tsx` — les modèles et leur éditeur.
- `UnclassifiedPage.tsx`, `useUnclassified.ts`, `FileDialog.tsx` — « Non classés » : les réponses sans prospect, à ranger.
