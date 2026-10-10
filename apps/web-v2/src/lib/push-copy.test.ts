/**
 * QUOI     — vérifie que la fonction send-push a la copie à jour des phrases de la cloche.
 * POURQUOI — une phrase changée ici mais pas recopiée enverrait au téléphone un texte qui n'est
 *            plus celui de la cloche, sans que rien ne le dise.
 * ATTENTION — environnement Node (le script lit le disque) :
 * @vitest-environment node
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

test('la copie des phrases dans send-push est à jour', () => {
  const script = fileURLToPath(new URL('../../scripts/sync-push-phrases.mjs', import.meta.url))
  expect(() => execFileSync('node', [script, '--check'], { stdio: 'pipe' })).not.toThrow()
})
