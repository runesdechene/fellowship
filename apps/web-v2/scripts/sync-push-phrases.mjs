/**
 * QUOI     — recopie les fichiers partagés de `src/lib/` dans les fonctions serveur : les phrases de
 *            la cloche dans send-push (dates.ts, event-path.ts, notifications.ts, push-lines.ts, suggestions.ts →
 *            send-push/phrases/), le plan de suppression dans delete-account (deletion-plan.ts).
 * POURQUOI — une seule source pour le navigateur et le serveur. Une fonction ne peut pas importer
 *            hors de supabase/functions sans risque à l'empaquetage : on recopie, en ajoutant `.ts`
 *            aux imports (Deno l'exige).
 * ATTENTION — `--check` ne copie rien : il échoue si une copie diffère (src/lib/push-copy.test.ts).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** [fichier de src/lib, dossier d'arrivée sous supabase/functions] */
const COPIES = [
  ['dates.ts', 'send-push/phrases'],
  ['event-path.ts', 'send-push/phrases'],
  ['notifications.ts', 'send-push/phrases'],
  ['push-lines.ts', 'send-push/phrases'],
  ['suggestions.ts', 'send-push/phrases'],
  ['deletion-plan.ts', 'delete-account'],
]
const from = (name) => fileURLToPath(new URL(`../src/lib/${name}`, import.meta.url))
const to = (name, folder) =>
  fileURLToPath(new URL(`../../../supabase/functions/${folder}/${name}`, import.meta.url))

function copyOf(name) {
  const source = readFileSync(from(name), 'utf8').replace(/\r\n/g, '\n')
  const imports = source.replace(/from '(\.\/[\w-]+)'/g, "from '$1.ts'")
  return `// COPIE de apps/web-v2/src/lib/${name} — ne pas modifier : node apps/web-v2/scripts/sync-push-phrases.mjs\n${imports}`
}

const check = process.argv.includes('--check')
const stale = []
for (const [name, folder] of COPIES) {
  const expected = copyOf(name)
  const target = to(name, folder)
  if (check) {
    const actual = existsSync(target) ? readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : ''
    if (actual !== expected) stale.push(name)
  } else {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, expected)
  }
}
if (stale.length > 0) {
  process.stderr.write(`Copie périmée : ${stale.join(', ')}\n`)
  process.exit(1)
}
