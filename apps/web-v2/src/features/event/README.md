# features/event — la fiche d'un événement

L'écran `/evenement/:id`. La page assemble ; les hooks parlent à la base ; la logique pure
(fils, dates, montants) vit dans `lib/`.

- `EventPage.tsx` — l'écran, et la déclaration de son décor (affiche, retour, compte à rebours).
- `EventStatus.tsx` — le statut en contrôle segmenté, et l’objectif de chiffre d’affaires.
- `MyDossier.tsx` — « Mon dossier » : paiement, prix de la place, acompte, échéance du solde.
- `Applying.tsx` — la candidature : le pied noir de « L'essentiel » (date limite, « Candidater ») et, connecté, la fenêtre `?candidater` : comment, dossier, contact, ce que j’ai envoyé (maquette 2518:233).
- `useDossier.ts` — le dossier privé (participation_dossiers) : lecture et écriture.
- `EventDiscussion.tsx` — la discussion du festival en mini-fil : titre et compte, canaux, la question à poser en tête, les deux plus récentes puis « Voir les questions précédentes ».
- `DiscussionThread.tsx` — un fil : la question, ses réponses reliées par le trait des photos, « Répondre à … ».
- `DiscussionBlock.tsx` — le bloc et sa sourdine.
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
- `LastEditionReport.tsx` — « L'année dernière, tu as fait +2 870 € », en haut à droite d'une nouvelle édition ; `useLastEditionReport.ts` lit le net de l'édition précédente.
- `useUrlFlag.ts` — un panneau ouvert par l'adresse (`?carte`, `?candidater`) : le retour le ferme.
- `ClaimBanner.tsx` — en bas de la fiche, « Tu organises ce festival ? » dans le dégradé de la marque : un e-mail à contact@flw.sh pour revendiquer la fiche (caché à qui peut déjà la modifier).
- `EventEssentials.tsx` — « L'essentiel » : une ligne par fait (quand, où, horaires, site…), la candidature en pied, en inversé (maquette 2506:233) ; ses lignes servent aussi à la fenêtre « Candidater ».
- `GuestGoing.tsx` — sans compte : les visages de ceux qui y vont, leur nombre, « Voir qui, avec ton compte gratuit ».
