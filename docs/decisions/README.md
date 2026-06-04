# Décisions — le "board room" de Fellowship

Ce dossier est la **source de vérité des décisions stratégiques et produit** de Fellowship :
positionnement, analyse concurrentielle, offres/packs, pricing, go-to-market, choix de vision.

> Distinct de :
> - `docs/superpowers/specs/` + `plans/` → décisions **techniques / design d'implémentation**
> - `graphify-out/` → carte du code **auto-dérivée**
> - mémoire Claude (privée) → contexte de session, non partagé

## Convention

Un fichier Markdown par décision (ou par session de décisions), nommé :

```
NNNN-titre-court.md      ex: 0001-session-2026-05-24-landing-et-packs.md
```

Chaque doc suit un format ADR léger :

- **Contexte** — pourquoi on se pose la question maintenant
- **Options envisagées** — les pistes, avec trade-offs
- **Décision** — ce qu'on a tranché, et pourquoi
- **Conséquences** — ce que ça implique (dev, design, business)
- **Statut** — `proposé` / `acté` / `révisé` / `abandonné`

Liens entre décisions avec des liens Markdown relatifs (compatibles Obsidian si on ouvre ce dossier comme vault).

## Index

- [0001 — Fondations : vision, offres, et DA fondatrice](0001-fondations-vision-packs-da.md) (2026-05-24) — mission/vision, positionnement, modèle de packs, compte unique, périmètre été/V2, **DA « Nuit de Festival »** + [maquette de référence](assets/landing-founding-theme.html)
- [0002 — Cockpit exposant](0002-cockpit-exposant.md) (2026-05-24) — la home produit (tableau de bord), modules, chat global par festival, véhicule, équipe + [cockpit](assets/dashboard-exposant.html) · [calendrier](assets/calendar-exposant.html)
- [0003 — Roadmap : retours de la 1ʳᵉ cliente](0003-roadmap-retours-cliente-1.md) (2026-06-03) — 9 retours triés (bugs Explorer/nav/mobile, polish, événements refusés) + **chantier lisibilité** « une info = un endroit canonique » ; priorisation P0/P1/P2
- [0004 — Le badge « Certifié » comme levier Pro](0004-badge-certifie-levier-pro.md) (2026-06-04) — **Pro = Certifié** (auto, override manuel possible) ; vendre de la **crédibilité > features** ; badge visible partout + nudge sur la vitrine des gratuits ; garde-fous (jamais le statut Stripe brut, wording « Guilde » pas « identité »)
