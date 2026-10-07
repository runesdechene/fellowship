# features/event — la fiche d'un événement

L'écran `/evenement/:id`. La page assemble ; les hooks parlent à la base ; la logique pure
(fils, dates, montants) vit dans `lib/`.

- `EventPage.tsx` — l'écran, et la déclaration de son décor (affiche, retour, compte à rebours).
- `EventStatus.tsx` — le statut en contrôle segmenté, et l’objectif de chiffre d’affaires.
- `MyDossier.tsx` — « Mon dossier » : paiement, prix de la place, acompte, échéance du solde.
- `Applying.tsx` — « Pour candidater » : date limite, comment, dossier, contact, ce que j’ai envoyé.
- `useDossier.ts` — le dossier privé (participation_dossiers) : lecture et écriture.
- `EventDiscussion.tsx` — la discussion du festival : canaux, formulaire, écritures.
- `DiscussionThread.tsx` — le rendu d’un fil : la question, ses réponses, qui parle et quand.
- `useEvent.ts` — l'événement, la participation, et leurs écritures.
- `useEventThreads.ts` — les fils de discussion.
