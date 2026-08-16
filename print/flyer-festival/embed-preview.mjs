// Construit une page d'aperçu pour le compagnon visuel avec les images du flyer
// inlinées en base64 (le serveur ne sert pas les fichiers statiques à côté du HTML).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = process.argv[2] // chemin du fichier HTML cible (dans le content/ du compagnon)

const b64 = (f) => 'data:image/png;base64,' + readFileSync(join(here, f)).toString('base64')
const recto = b64('apercu-recto.png')
const verso = b64('apercu-verso.png')

const html = `<h2>Le vrai rendu du PDF (logo + 11 événements)</h2>
<p class="subtitle">Images générées par le MÊME moteur que le PDF, depuis le vrai fichier. Ce que tu vois = l'impression, au pixel près.</p>
<div style="display:flex;gap:36px;flex-wrap:wrap;justify-content:center;margin-top:10px">
  <div style="text-align:center">
    <img src="${recto}" alt="Recto" style="width:440px;max-width:90vw;height:auto;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.5)">
    <div style="font-size:14px;font-weight:700;color:#9a8f86;margin-top:12px">RECTO · festivaliers</div>
  </div>
  <div style="text-align:center">
    <img src="${verso}" alt="Verso" style="width:440px;max-width:90vw;height:auto;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.5)">
    <div style="font-size:14px;font-weight:700;color:#9a8f86;margin-top:12px">VERSO · exposants</div>
  </div>
</div>
<p class="subtitle" style="margin-top:18px">Qu'est-ce qu'on ajuste à partir de ce rendu réel ? Logo, événements, wording…</p>`

writeFileSync(out, html)
console.log('written:', out)
