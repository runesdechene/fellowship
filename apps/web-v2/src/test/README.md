# test — la préparation des tests

- `setup.ts` — chargé avant chaque fichier de test (matchers jest-dom).

Les tests eux-mêmes vivent à côté de ce qu'ils testent (`lib/*.test.ts`). Méthode du dépôt :
tester la fonction pure, pas le rendu (`.claude/rules/dev.md`).
