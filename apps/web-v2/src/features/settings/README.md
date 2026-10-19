# features/settings — les Réglages

`/reglages` (lot 8e, puis lot 9b, maquette 2206:691). Chaque changement s'enregistre aussitôt.

- `SettingsPage.tsx` — la page : l'en-tête (« Enregistré »), la colonne qui suit le défilement, les
  sections.
- `SettingRow.tsx` — la carte et sa ligne (libellé, aide, contrôle) : toutes les sections en sont
  faites.
- `ProfileSection.tsx` — photo, nom, ville, code postal, genre, lien vers la vitrine.
- `useProfileSave.ts` — écrire un morceau de `users` et relire l'identité.
- `AccountSection.tsx` — l'adresse de connexion, se déconnecter.
- `NotificationSettings.tsx` — la carte du téléphone, puis les lignes et leur interrupteur.
- `PhoneCard.tsx` — activer, couper, ou dire pourquoi c'est impossible.
- `EntitiesSection.tsx` — une ligne par enseigne : son abonnement en une phrase, gérer ou passer Pro, supprimer.
- `BillingRow.tsx`, `BillingDialog.tsx` — « Facturation » sous une enseigne abonnée : raison sociale
  et SIREN, enregistrés en base et chez Stripe (chantier 3, sans maquette).
- `DeleteEntityDialog.tsx` — supprimer une enseigne (retaper son nom), par `delete-account`.
- `useUpcomingCounts.ts` — les dates de chaque enseigne sur les 6 prochains mois.
- `ContactSection.tsx` — écrire à l'équipe.
- `DeleteAccount.tsx` — la carte « Supprimer mon compte » et sa fenêtre de confirmation.
- `useAccountDeletion.ts` — l'aperçu puis la suppression, par la fonction serveur `delete-account`.
- `EntityBase.tsx`, `useEntityBase.ts` — « Siège social ou atelier » sous chaque enseigne (lot 13) :
  sert au calcul des distances, jamais affiché (table `entity_bases`).
