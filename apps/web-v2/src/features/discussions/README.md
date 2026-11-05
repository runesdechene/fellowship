# features/discussions

Les sujets et Messages (maquette Figma, page Story `2727:291` ; conception
`docs/superpowers/specs/2026-11-04-sujets-et-messages-design.md`).

- `StoryBar` — la barre des sujets en haut du tableau de bord.
- `SujetComposer` — « Lancer un sujet » (`?sujet=nouveau`).
- `DiscussionDrawer` — un sujet ouvert dans un tiroir (`?discussion=<id>`) : sa story d'abord
  (`SujetStory`, on y répond par `StoryReply`), la discussion ensuite (`?fil`).
- `Conversation` — un tchat : en-tête, `ChatFeed` (les bulles et leurs réactions,
  `ReactionPicker`), `ChatInput` (la saisie).
- `MembersSheet`, `PeoplePicker` — gérer un groupe, choisir à qui écrire.
- `MessagesPage` (`/messages`, `/messages/:id`) ; `NewMessage` prend la place de la liste sur
  `/messages/nouveau`.
- `MessagesButton` — l’icône de la barre du haut ; `WriteButton` — « Écrire » sur une vitrine.
- `useDiscussions` — l'état React ; la logique pure vit dans `lib/discussions.ts`, la base dans
  `lib/discussion-api.ts` et `lib/reaction-api.ts`.
