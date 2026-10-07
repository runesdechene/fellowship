# features/event — la fiche d'un événement

L'écran `/evenement/:id`. La page assemble ; les hooks parlent à la base ; la logique pure
(fils, dates, montants) vit dans `lib/`.

- `EventPage.tsx` — l'écran, et la déclaration de son décor (affiche, retour, compte à rebours).
- `EventStatus.tsx` — le suivi : participation, paiement, bilan.
- `EventDiscussion.tsx` — la discussion du festival.
- `useEvent.ts` — l'événement, la participation, et leurs écritures.
- `useEventThreads.ts` — les fils de discussion.
