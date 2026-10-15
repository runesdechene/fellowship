# features/admin-entity

L'administration, fiche d'une enseigne (`/admin/enseignes/:id`).

- `EntityPage.tsx` — la page : retour, en-tête, deux colonnes.
- `useAdminEntity.ts` — charge l'enseigne, ses comptes reliés et ses gestes.
- `SubscriptionCard.tsx` — offre, renouvellement, qui paie, parrainage, remise, ambassadeur, et les gestes (offrir, ambassadeur).
- `GiftMonths.tsx` — le panneau « Offrir des mois » (1 à 12, date de fin, envoi).
- `DiscountPicker.tsx` — le panneau « Poser une remise » (coupons Stripe, choix, appliquer).
- `PaymentsCard.tsx` — les factures Stripe de l’enseigne, chargées à part.
- `ActivityCard.tsx` — cinq chiffres et les derniers gestes.
- `MembersCard.tsx` — les comptes reliés.
- `EntityInfoCard.tsx` — nom, type, ville, vitrine, société, téléphone.
- `EntityEditForm.tsx` — le formulaire de correction (nom, métier, ville, vitrine, société, SIREN).
