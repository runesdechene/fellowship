/**
 * QUOI     — une file d'écritures : chaque écriture attend la fin de la précédente.
 * POURQUOI — sur un écran qui s'enregistre à chaque geste (le bilan), un clic qui suit la sortie
 *            d'un champ lance une deuxième écriture pendant la première. Sans file, l'une se
 *            perdait ou partait sur des données périmées.
 * ATTENTION — une écriture qui échoue n'arrête pas la file : la suivante part quand même, et
 *            l'échec revient à celui qui l'a lancée.
 */
export function createWriteQueue() {
  let tail: Promise<unknown> = Promise.resolve()
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task)
    tail = run.catch(() => undefined)
    return run
  }
}
