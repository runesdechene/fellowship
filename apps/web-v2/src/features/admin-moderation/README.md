# features/admin-moderation — les signalements

`/admin/signalements?statut=` (lot 4, spec `docs/superpowers/specs/2026-10-19-v2-admin-lot-4-design.md`).
Les statuts, motifs et libellés vivent dans `lib/moderation.ts`.

- `ModerationPage.tsx` — l'écran : À traiter, Résolus, Rejetés ; chaque ligne mène à ce qui est visé.
- `useModeration.ts` — lit les signalements d'un statut (`admin_signalements`) et les traite.
- `ResolveDialog.tsx` — la fenêtre de décision : note, Rejeter, Résoudre.
- `usePendingReports.ts` — le nombre en attente, pour la pastille de la navigation.

Signaler un profil se fait depuis la vitrine : `features/vitrine/ReportProfile.tsx`.
