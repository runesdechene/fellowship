/**
 * QUOI     — recopie les phrases de la cloche dans la fonction send-push (dates.ts,
 *            notifications.ts, push-lines.ts → supabase/functions/send-push/phrases/).
 * POURQUOI — le téléphone reçoit la même phrase que la cloche, d'une seule source. La fonction ne
 *            peut pas importer hors de supabase/functions sans risque à l'empaquetage : on recopie,
 *            en ajoutant `.ts` aux imports (Deno l'exige).
 * ATTENTION — `--check` ne copie rien : il échoue si la copie diffère (src/lib/push-copy.test.ts).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FILES = ['dates.ts', 'notifications.ts', 'push-lines.ts']
const from = (name) => fileURLToPath(new URL(`../src/lib/${name}`, import.meta.url))
const to = (name) =>
  fileURLToPath(new URL(`../../../supabase/functions/send-push/phrases/${name}`, import.meta.url))

function copyOf(name) {
  const source = readFileSync(from(name), 'utf8').replace(/\r\n/g, '\n')
  const imports = source.replace(/from '(\.\/[\w-]+)'/g, "from '$1.ts'")
  return `// COPIE de apps/web-v2/src/lib/${name} — ne pas modifier : node apps/web-v2/scripts/sync-push-phrases.mjs\n${imports}`
}

const check = process.argv.includes('--check')
const stale = []
for (const name of FILES) {
  const expected = copyOf(name)
  if (check) {
    const actual = existsSync(to(name)) ? readFileSync(to(name), 'utf8').replace(/\r\n/g, '\n') : ''
    if (actual !== expected) stale.push(name)
  } else {
    mkdirSync(
      fileURLToPath(new URL('../../../supabase/functions/send-push/phrases/', import.meta.url)),
      {
        recursive: true,
      },
    )
    writeFileSync(to(name), expected)
  }
}
if (stale.length > 0) {
  process.stderr.write(`Copie périmée : ${stale.join(', ')}\n`)
  process.exit(1)
}
