# components/ui — les briques

Les composants réutilisables, sans connaissance d'un écran : ils reçoivent des props et rendent
une classe CSS. Aucune valeur de design ici — tout vit dans `styles/3-components/`.

- `Button.tsx` — le bouton, quatre variantes (`solid`, `icon`, `action`, `bare`).
- `Chip.tsx` — la pastille d'état ; la couleur dit qui doit bouger.
- `Select.tsx` — le sélecteur maison, avec icône et couleur par état.
- `Field.tsx` — libellé, champ, zone de texte, interrupteur.
- `Avatar.tsx` — l'avatar rond et la pile d'avatars.
- `Tag.tsx` — la pastille d'une catégorie (couleurs venues de la base).
- `RichText.tsx` — un texte d'organisateur mis en forme, nettoyé avant d'être affiché.
- `ProBadge.tsx` — la pastille noire « Pro ».
- `ProBubble.tsx` — l'invitation Pro en bulle, là où un geste est refusé en gratuit.
- `ProVeil.tsx` — un contenu flouté et inerte, avec l'invitation par-dessus.
- `Poster.tsx` — **la seule affiche** de l'application ; absente, la couleur et l'icône de sa
  catégorie. Sa taille vient de la classe passée.
- `PosterArt.tsx` — la grande affiche (calendrier, Explorer, vitrine) : compose `Poster`, y écrit
  la date quand l'image manque, et pose compte à rebours et amis par-dessus.
- `Wordmark.tsx` — la marque écrite : pictogramme, « Fellowship » en Cabin, point orange ; sa
  couleur et sa taille viennent du contexte.
- `InstagramIcon.tsx` — le pictogramme Instagram au trait (lucide a retiré ses logos de marque).
- `CodeInput.tsx` — les six cases d'un code reçu par e-mail (frappe, collage, retour arrière).
- `IconTile.tsx` — la pastille carrée teintée qui porte une icône (sept tons de l'administration).
- `TypeChip.tsx` — la pastille du type d'enseigne (exposant, festival, entreprise, sans enseigne).
- `OfferBadge.tsx` — l'offre d'une enseigne : Pro / Essai / Gratuit, puis le détail.
- `AdminCard.tsx` — un bloc de fiche d'administration : icône teintée, titre, action.
- `SheetRow.tsx` — une rangée clé/valeur de fiche d'administration (enseigne et personne).
- `NotesCard.tsx` — le bloc « Notes internes » des fiches d'administration : étiquettes et notes d'un acteur.
