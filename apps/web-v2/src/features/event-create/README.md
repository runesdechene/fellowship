# features/event-create — créer un événement

L'écran `/evenement/nouveau` : quatre étapes (l'événement, où et quand, catégories, détails),
l'aperçu de la fiche à côté, et la recherche de doublons pendant la saisie.

- `CreateEvent.tsx` — le parcours, l'envoi de l'affiche, la création et l'inscription.
- `EventPreview.tsx` — l'aperçu de la fiche.
- `useEventDraft.ts` — le brouillon gardé dans le navigateur, les étapes, ce qui bloque.
- `useSimilarEvents.ts` — les événements au nom proche.
- `useTags.ts` — les catégories, venues de la base.
