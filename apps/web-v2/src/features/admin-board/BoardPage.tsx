/**
 * QUOI     — l'accueil de l'administration : le tableau de l'équipe, en quatre colonnes
 *            (À réfléchir, À faire, Maintenant, Fait).
 * POURQUOI — maquette 2417:233 (Uriel, 22/10/2026) : un tableau pour des cerveaux TDAH. Une seule
 *            chose « Maintenant » par personne, en grand ; ce qui attend se réchauffe ; « À faire »
 *            ne montre que cinq cartes ; ce qu'on finit s'allume et se compte sur la semaine.
 * ATTENTION — une écriture refusée s'affiche en tête et le tableau reste tel quel.
 */
import { useState } from 'react'
import type { Tone } from '@/components/ui/IconTile'
import { doneThisWeek, TASK_STATUSES, type TaskStatus } from '@/lib/admin-board'
import { BoardColumn } from './BoardColumn'
import { TaskCard } from './TaskCard'
import { useAdminBoard, type Task } from './useAdminBoard'

const TONES: Record<TaskStatus, Tone> = { think: 'bleu', todo: 'ocre', now: 'terre', done: 'sauge' }

export function BoardPage() {
  const board = useAdminBoard()
  const [problem, setProblem] = useState<string | null>(null)
  // La dernière carte arrivée dans « Fait » : elle seule s'allume.
  const [landed, setLanded] = useState<string | null>(null)
  const now = new Date()
  const tasks = board.tasks ?? []

  async function attempt(job: Promise<void>): Promise<boolean> {
    try {
      await job
      setProblem(null)
      return true
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'Enregistrement impossible')
      return false
    }
  }

  function move(task: Task, status: TaskStatus) {
    if (task.status === status) return
    void attempt(board.move(task, status)).then(
      (ok) => ok && status === 'done' && setLanded(task.id),
    )
  }

  function card(task: Task) {
    return (
      <TaskCard
        key={task.id}
        task={task}
        now={now}
        me={board.me}
        landed={task.id === landed}
        onMove={(status) => move(task, status)}
        onRename={(body) => void attempt(board.rename(task, body))}
        onTake={() => void attempt(board.take(task))}
        onRemove={() => void attempt(board.remove(task))}
      />
    )
  }

  const done = tasks.filter((t) => t.status === 'done')

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Tableau</h1>
          <p className="admin-page__lede">Ce que l’équipe a sur le feu. Une chose à la fois.</p>
        </div>
      </header>
      {(board.error ?? problem) && <p className="admin-page__error">{board.error ?? problem}</p>}
      <div className="board">
        {TASK_STATUSES.map((status) => {
          const column = tasks.filter((t) => t.status === status)
          return (
            <BoardColumn
              key={status}
              status={status}
              tone={TONES[status]}
              tasks={column}
              count={
                status === 'done'
                  ? doneThisWeek(
                      done.map((t) => t.movedAt),
                      now,
                    )
                  : column.length
              }
              hint={
                status === 'now'
                  ? 'une chose à la fois'
                  : status === 'done'
                    ? 'cette semaine'
                    : undefined
              }
              footer={status === 'done' ? 'Se vide tout seul après 7 jours.' : undefined}
              onAdd={
                status === 'think' || status === 'todo'
                  ? (body) => attempt(board.add(body, status))
                  : undefined
              }
              onDrop={(id) => {
                const task = tasks.find((t) => t.id === id)
                if (task) move(task, status)
              }}
              renderCard={card}
            />
          )
        })}
      </div>
    </div>
  )
}
