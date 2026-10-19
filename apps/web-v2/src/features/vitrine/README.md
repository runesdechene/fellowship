# features/vitrine

La vitrine d'un artisan (`/:slug`), dans le langage « 2027 ». Maquette : cadre
`2027 — Vitrine d’un artisan`.

- `VitrinePage.tsx` — l'écran : en-tête, prochaines escales, tampons, pied de page.
- `VitrineHead.tsx` — bannière, logo, identité, réseau, Suivre / Partager (ou Modifier pour le propriétaire).
- `EscaleCard.tsx` — une prochaine escale, avec les amis du visiteur qui y vont.
- `Stamps.tsx` — la route passée en tampons.
- `useVitrine.ts` — le chargement, et Suivre / Ne plus suivre.
- `ReportProfile.tsx` — « Signaler ce profil » au pied de page, et sa fenêtre (motif, commentaire).

Le mode édition (lot 6b, maquette `2231:2`) — le propriétaire modifie sa vitrine en place, sur
ordinateur ; rien n'est publié avant « Enregistrer » :

- `VitrineEditor.tsx` — l'en-tête en édition, et la confirmation avant de quitter avec des changements.
- `EditBar.tsx` — « Mode édition », Annuler, Enregistrer, et ce qui empêche d'enregistrer.
- `EditableText.tsx` · `EditableBanner.tsx` · `EditableLogo.tsx` · `EditableLinks.tsx` ·
  `EditableAddress.tsx` — un élément modifiable chacun.
- `useVitrineEdit.ts` — le brouillon, l'envoi des images et l'enregistrement.

La logique pure vit dans `lib/` : `vitrine.ts` (libellés, découpage de la route, liens),
`vitrine-edit.ts` (règles du brouillon, de l'adresse et des liens), `image-resize.ts`.
