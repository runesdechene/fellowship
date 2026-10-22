# features/notifications — la cloche

- `NotificationBell.tsx` — la cloche de la barre du haut, le chiffre des nouveautés depuis sa dernière ouverture, le panneau.
- `NetworkBlock.tsx` — en tête du panneau : demandes d'ami (× et +) et nouveaux abonnés.
- `NotificationPanel.tsx` — le panneau : notifications groupées par jour, chacune avec le compte qu'elle prévient, « Tout marquer comme lu ».
- `PanelFoot.tsx` — le pied du panneau : « Régler mes notifications », et activer le téléphone.
- `useNotifications.ts` — lecture (toutes les casquettes de l'utilisateur), marquer lu, retenir la dernière ouverture.

Les phrases et le groupement vivent dans `lib/notifications.ts`.
