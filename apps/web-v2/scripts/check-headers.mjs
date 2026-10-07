/**
 * QUOI     — vérifie que chaque fichier de src/ commence par son en-tête QUOI / POURQUOI, et que
 *            chaque dossier de src/ a son README.md.
 * POURQUOI — « chaque fichier se lit seul » (.claude/rules/v2.md) : la règle tient parce que
 *            l'outil la vérifie à chaque `pnpm lint`, pas parce qu'on s'en souvient.
 * ATTENTION — types/supabase.ts est généré : il est exempté, sa doc vit dans types/README.md.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const EXEMPTED = new Set(['types/supabase.ts'])
const CODE = /\.(ts|tsx|css)$/

const problems = []

function visit(dir) {
  if (!existsSync(join(dir, 'README.md')))
    problems.push(`${relative(ROOT, dir) || '.'}/ : pas de README.md`)
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const file = relative(ROOT, path).split('\\').join('/')
    if (statSync(path).isDirectory()) visit(path)
    else if (CODE.test(name) && !EXEMPTED.has(file)) {
      const start = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').slice(0, 40)
      if (!start.startsWith('/**\n * QUOI'))
        problems.push(`${file} : pas d'en-tête QUOI / POURQUOI`)
    }
  }
}

visit(ROOT)

if (problems.length > 0) {
  console.error(problems.join('\n'))
  console.error(
    `\n${problems.length} problème(s) — voir « Chaque fichier se lit seul » dans .claude/rules/v2.md`,
  )
  process.exit(1)
}
