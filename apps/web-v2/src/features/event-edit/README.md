# features/event-edit — modifier un événement

L'écran `/evenement/:id/modifier` (lot 10c, maquette 2117:2) : les champs de la création en
sections, l'aperçu de la fiche à droite, et l'enregistrement par la porte d'écriture
`modifier_evenement`, qui garde chaque version (« L'histoire de la fiche », `features/event-history/`).

- `EditEvent.tsx` — la page : barre d'actions, en-tête, sections, aperçu.
- `EditSections.tsx` — les sections du formulaire ; reprend `PlaceFields`, `ApplyFields` et
  `MissingHighlight` de `features/event-create/`.
- `TagPicker.tsx` — les catégories choisies en pastilles, « + Ajouter ».
- `EditPreview.tsx` — la fiche en miniature, mise à jour à la frappe.
- `useEditEvent.ts` — la fiche chargée, le formulaire, l'enregistrement.
