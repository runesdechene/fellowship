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
- `EventRoute.tsx` — `/evenements/:slug/…` : trouve la fiche (slug actuel, ancien slug ou identifiant), remplace l'adresse par l'actuelle et donne `useEventKey()` aux pages ; `LegacyEventRedirect` passe `/evenement/…` et `/e/…` sous `/evenements/`.
- `useEventKey.ts` — l'identifiant et le slug actuel de la fiche, posés par `EventRoute`.
- `useEvent.ts` — l'événement, la participation, et leurs écritures.
- `useEventThreads.ts` — les fils de discussion.
- `Companions.tsx` — la ligne des amis (« A, B, C et 5 autres y vont aussi ») et sa popup.
- `WhoGoesDialog.tsx` — la popup « Qui y va » : tous les amis programmés, leur métier, leur statut.
- `useWhoGoes.ts` — la liste de la popup, chargée à l'ouverture.
- `GuestReviews.tsx` — sans compte, la note et un avis entier dans une carte, puis la porte vers le
  compte gratuit ; `useFicheApercu.ts` lit `apercu_fiche` (décision du 23/10/2026, maquette 2482:878).
- `Breadcrumb.tsx` — sans compte, le fil d'Ariane au-dessus du titre : Festivals › univers › région.
- `MyReportBlock.tsx` — « Mon bilan » d'une date passée.
- `ClaimBanner.tsx` — en bas de la fiche, « Tu organises ce festival ? » : un e-mail à contact@flw.sh pour revendiquer la fiche (caché à qui peut déjà la modifier).
