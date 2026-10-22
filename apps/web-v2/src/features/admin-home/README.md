# features/admin-home

L'accueil de l'administration (`/admin/accueil`) : la santé de l'application en un écran
(maquette Figma 2448:233).

- `HomePage.tsx` — la page : titre, visiteurs par jour, quatre chiffres, assemblage des blocs.
- `useAdminHome.ts` — charge `admin_accueil()` et les six dernières personnes passées.
- `HomeCard.tsx` — un bloc de l'accueil : titre et précision, sans pastille.
- `HomeActivity.tsx` — ce que font les gens, semaine par semaine.
- `HomeTodo.tsx` — ce qu'il reste à traiter.
- `RecentVisitors.tsx` — les dernières personnes passées et leurs visites.

Les visites se notent à l'ouverture de l'app (`noter_visite`, `AppShell`) ; l'historique jour par
jour vit dans `visites_jour`, compté à partir du 22/10/2026.
