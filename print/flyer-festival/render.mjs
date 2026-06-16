// Rend le flyer A6 en PDF (fonds perdus 3 mm) + 2 PNG d'aperçu, via Edge headless.
// Usage : node print/flyer-festival/render.mjs
import { chromium } from 'playwright-core'
import { pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const htmlUrl = pathToFileURL(join(here, 'flyer.html')).href

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 })
  await page.goto(htmlUrl, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  // PDF prêt pour l'imprimeur : taille pilotée par @page (111×154 mm = A6 + 3 mm de fonds perdus).
  await page.pdf({
    path: join(here, 'flyer.pdf'),
    printBackground: true,
    preferCSSPageSize: true,
  })

  // Aperçus PNG (une image par face) pour relecture visuelle.
  const sections = await page.$$('.page')
  await sections[0].screenshot({ path: join(here, 'apercu-recto.png') })
  await sections[1].screenshot({ path: join(here, 'apercu-verso.png') })

  console.log('OK : flyer.pdf + apercu-recto.png + apercu-verso.png')
} finally {
  await browser.close()
}
