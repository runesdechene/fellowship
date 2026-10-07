# V2 — carnet de bord

- `DESIGN-SYSTEM.md` — le design, et comment le changer sans toucher au code.
- `decisions/` — une page par choix structurant : le contexte, la décision, les options
  écartées et pourquoi. On ne rediscute pas une décision sans lire sa page.
- `sondes/` — relevés en prod, en lecture seule, faits avant une spec (un relevé d'un jour).
- `audit-2026-10-07.md` — l’audit de propreté du 07/10, à valider puis corriger.
- `purge-back.md` — tout ce que le back devra perdre ou corriger une fois la V2 lancée.
- `maquettes-2027.md` — les maquettes « 2027 » du Figma (qui font foi) et tout ce qu'elles demandent
  au code et à la base.

Conception : `docs/superpowers/specs/2026-10-07-methode-monorepo-v2-design.md`.
Maquette : le lien Figma est dans `apps/web-v2/README.md`.

## Points ouverts

Repris de l'ancien `xo-status.md` (dernière mise à jour : 20/08/2026).

- Sortie du mur d'affiche — ANNULÉE à l'œil, à refaire un jour avec une maquette
- ~~Trancher : le blé OU la terre pour « il reste un geste à faire »~~ — remplacé le 07/10/2026 : les statuts se lisent par la forme, la terre dit « acquis » (`maquettes-2027.md`).
- ~~Revoir « Acompte versé »~~ — réglé : l’acompte porte le blé, et « À payer » la terre (arbitrage d’Uriel, 07/10/2026).
- Brancher les avis des exposants (notation 3 axes + fil de réponses)
- Écran d'édition d'un événement — débloque l'ajout au clic sur une info manquante
- ~~Renouveler le jeton Supabase, régénérer les types, retirer le client sans schéma~~ — fait le 07/10/2026.
- Vérifier en vrai : changer un statut, saisir un montant (écritures pas testées contre la base)
- Confirmer l'orange du logo (`#c0642a` est-il le bon ?)
- Brancher « Remplir mon bilan » sur un écran de saisie — maquetté le 07/10/2026 (`maquettes-2027.md`).
- ~~Décider du comportement de la cloche~~ — panneau de notifications maquetté le 07/10/2026.
- Décider quand l'écran Explorer entre dans la V2 — maquetté le 07/10/2026, reste à planifier.
- Reprendre l'autocomplétion d'adresse de la V1 (service externe)
- Trancher : « année en cours » = année civile ou saison août→juillet ?
- Deux enseignes s'appellent « Runes de Chêne » en base — vérifier si c'est voulu
