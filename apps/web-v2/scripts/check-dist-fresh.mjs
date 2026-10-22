/**
 * QUOI     — refuse la mise en production si le `dist/` est plus vieux que le dernier commit.
 * POURQUOI — `deploy:prod` publie `dist/` tel quel, sans le reconstruire : lancé seul, il a remis
 *            trois fois en ligne un ancien build le 22/10/2026, Netlify disant « Deploy is live! »
 *            avec 0 fichier envoyé. Le bon ordre : `pnpm deploy:v2` (build + brouillon), puis
 *            `pnpm deploy:v2:prod` sur ce même `dist/` (.claude/rules/deploiement.md).
 * ATTENTION — ne voit que les commits : une modification non commitée après le build passe.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const index = fileURLToPath(new URL('../dist/index.html', import.meta.url))
const lastCommit =
  Number(execFileSync('git', ['log', '-1', '--format=%ct'], { encoding: 'utf8' })) * 1000

if (!existsSync(index) || statSync(index).mtimeMs < lastCommit) {
  process.stderr.write(
    '\nLe dist/ est plus vieux que le dernier commit : il remettrait en ligne un ancien build.\n' +
      'Lance d’abord « pnpm deploy:v2 » (build + brouillon), vérifie, puis « pnpm deploy:v2:prod ».\n\n',
  )
  process.exit(1)
}
