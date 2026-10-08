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
