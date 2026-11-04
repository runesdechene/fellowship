# features/discussions

Les sujets et Messages (maquette Figma, page Story `2727:291` ; conception
`docs/superpowers/specs/2026-11-04-sujets-et-messages-design.md`).

- `StoryBar` — la barre des sujets en haut des écrans connectés.
- `SujetComposer` — « Lancer un sujet » (`?sujet=nouveau`).
- `DiscussionDrawer` — un sujet ouvert dans un tiroir (`?discussion=<id>`).
- `Conversation` — un tchat : en-tête, `ChatFeed` (les bulles), `ChatInput` (la saisie).
- `MembersSheet`, `PeoplePicker` — gérer un groupe, choisir à qui écrire.
- `MessagesPage` (`/messages`, `/messages/:id`), `NewMessagePage` (`/messages/nouveau`).
- `MessagesButton` — l’icône de la barre du haut ; `WriteButton` — « Écrire » sur une vitrine.
- `useDiscussions` — l'état React ; la logique pure vit dans `lib/discussions.ts`, la base dans
  `lib/discussion-api.ts`.
