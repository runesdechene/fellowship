/**
 * QUOI     — tests de lib/write-queue.ts : les écritures d'un écran passent une par une.
 * POURQUOI — une écriture lancée pendant qu'une autre s'enregistre ne doit ni se perdre, ni
 *            partir avant elle.
 */
import { describe, expect, it } from 'vitest'
import { createWriteQueue } from './write-queue'

function deferred() {
  let resolve: () => void = () => undefined
  let reject: (reason: Error) => void = () => undefined
  const promise = new Promise<void>((ok, ko) => {
    resolve = ok
    reject = ko
  })
  return { promise, resolve, reject }
}

describe('createWriteQueue', () => {
  it('ne lance la deuxième écriture qu’une fois la première finie', async () => {
    const enqueue = createWriteQueue()
    const order: string[] = []
    const first = deferred()

    const a = enqueue(async () => {
      order.push('a:start')
      await first.promise
      order.push('a:end')
    })
    const b = enqueue(() => {
      order.push('b:start')
      return Promise.resolve()
    })

    await Promise.resolve()
    expect(order).toEqual(['a:start'])
    first.resolve()
    await Promise.all([a, b])
    expect(order).toEqual(['a:start', 'a:end', 'b:start'])
  })

  it('une écriture qui échoue n’empêche pas la suivante, et rend son échec', async () => {
    const enqueue = createWriteQueue()
    const failing = enqueue(() => Promise.reject(new Error('base')))
    const next = enqueue(() => Promise.resolve('ok'))
    await expect(failing).rejects.toThrow('base')
    await expect(next).resolves.toBe('ok')
  })
})
