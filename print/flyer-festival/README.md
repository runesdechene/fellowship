# Flyer Fellowship — A6 recto-verso

Flyer générique inspiré de la landing (`flw.sh`), pour les stands d'exposants.
**Recto** = face festivaliers · **Verso** = face exposants. QR → `https://flw.sh`.

## Le fichier à envoyer à l'imprimeur

**`flyer.pdf`** — prêt à imprimer.
- Format **A6** (105 × 148 mm) **+ 3 mm de fonds perdus** sur chaque bord → page **111 × 154 mm**.
- 2 pages : page 1 = recto, page 2 = verso.
- Fonds de couleur jusqu'au bord (full bleed), couleurs forcées, polices embarquées.
- **Pas de traits de coupe** : la plupart des imprimeurs en ligne (Exaprint, Onlineprinters, Helloprint…) les ajoutent automatiquement quand les fonds perdus sont présents. Si ton imprimeur en exige, redemande-moi.
- Recommandé à l'impression : **couché 300 g**, finition mate ou soft-touch (le fond sombre rend mieux en mat).

## Aperçus

- `apercu-recto.png` / `apercu-verso.png` — rendu réel des deux faces (pour validation, pas pour l'impression).

## Modifier / régénérer

Le flyer est du HTML/CSS — facile à éditer.

1. Édite **`flyer.html`** (titres, pastilles, bullets, halos…).
2. Régénère le PDF + les aperçus :
   ```bash
   node print/flyer-festival/render.mjs
   ```
   (utilise Edge en headless via `playwright-core`, déjà présent dans le projet)

## QR code

`qr-flwsh.svg` = QR vectoriel vers `https://flw.sh` (inliné dans `flyer.html`).
Régénérer si l'URL change :
```bash
pnpm dlx qrcode "https://flw.sh" -t svg -o print/flyer-festival/qr-flwsh.svg
```
puis recopier le `<svg>` dans les deux `.qrbox` de `flyer.html`.
