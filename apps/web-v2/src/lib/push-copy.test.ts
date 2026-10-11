/**
 * QUOI     — vérifie que les fonctions serveur ont la copie à jour des fichiers partagés.
 * POURQUOI — une phrase changée ici mais pas recopiée enverrait au téléphone un texte qui n'est
 *            plus celui de la cloche, sans que rien ne le dise.
 * ATTENTION — environnement Node (le script lit le disque) :
 * @vitest-environment node
 */
/// <reference types="node" />
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

test('les copies des fonctions serveur sont à jour', () => {
  const script = fileURLToPath(new URL('../../scripts/sync-push-phrases.mjs', import.meta.url))
  expect(() => execFileSync('node', [script, '--check'], { stdio: 'pipe' })).not.toThrow()
})
