/**
 * QUOI     — l'accueil de l'administration : le tableau de l'équipe. Les idées à gauche, mon paquet
 *            au centre, les paquets de l'équipe à droite ; dessous, ce qui est terminé.
 * POURQUOI — maquette 2432:306 (Uriel, 22/10/2026) : un tableau pour des cerveaux TDAH. Chacun ne
 *            voit que la carte du dessus de son paquet ; ce qui est fait s'efface en une semaine.
 * ATTENTION — une écriture refusée s'affiche en tête et le tableau reste tel quel.
 */
import { useState } from 'react'
import { doneThisWeek, groupByDay, victoryPhrase } from '@/lib/admin-board'
import { playFanfare } from '@/lib/board-sound'
import { formatWeekdayDayMonth } from '@/lib/dates'
import { DeckTable } from './DeckTable'
import { DoneArchive } from './DoneArchive'
import { IdeaNotes } from './IdeaNotes'
import { TeamDecks } from './TeamDecks'
import { useAdminBoard, type Task } from './useAdminBoard'
import { cheerScreen } from './victory'

export function BoardPage() {
  const board = useAdminBoard()
  const [problem, setProblem] = useState<string | null>(null)
  // La dernière carte terminée : elle s'allume en arrivant dans « Terminé ».
  const [landed, setLanded] = useState<string | null>(null)
  const [cheer, setCheer] = useState<{ id: string; text: string; emptied: boolean } | null>(null)
  const now = new Date()
  const tasks = board.board?.tasks ?? []
  const admins = board.board?.admins ?? []
  const ideas = tasks.filter((t) => t.status === 'idea')
  const done = tasks.filter((t) => t.status === 'done')
  const doneToday = groupByDay(done, now).find((day) => day.daysAgo === 0)?.tasks.length ?? 0
  const week = doneThisWeek(
    done.map((t) => t.movedAt),
    now,
  )

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

  // Une carte ou une idée lâchée sur un paquet ; rien ne bouge si elle y est déjà.
  function give(taskId: string, ownerId: string | null) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || !ownerId || (task.status === 'deck' && task.ownerId === ownerId)) return
    void attempt(board.give(task, ownerId))
  }

  async function finish(task: Task, emptied: boolean): Promise<boolean> {
    if (!(await attempt(board.finish(task)))) return false
    setLanded(task.id)
    setCheer({ id: task.id, text: victoryPhrase(doneToday + 1, emptied), emptied })
    if (emptied) {
      playFanfare()
      cheerScreen()
    }
    return true
  }

  return (
    <div className="admin-page board-page">
      <header className="board-page__head">
        <div>
          <p className="board-page__date">Tâches · {formatWeekdayDayMonth(now)}</p>
          <h1 className="board-page__title">Une carte à la fois.</h1>
        </div>
        <p className="board-page__week">
          <span className="board-page__week-wrap">
            <span
              key={week}
              className={`board-page__week-count${cheer ? ' board-page__week-count--bump' : ''}`}
            >
              {week}
            </span>
            {cheer && (
              <span key={cheer.id} className="board-page__plus" aria-hidden>
                +1
              </span>
            )}
          </span>
          {week > 1 ? 'cartes faites cette semaine' : 'carte faite cette semaine'}
        </p>
      </header>
      {(board.error ?? problem) && <p className="admin-page__error">{board.error ?? problem}</p>}
      <div className="board-stage">
        <IdeaNotes
          ideas={ideas}
          onAdd={(body) => attempt(board.addIdea(body))}
          onRemove={(task) => void attempt(board.remove(task))}
        />
        <DeckTable
          deck={board.deckOf(board.me)}
          now={now}
          doneToday={doneToday}
          cheer={cheer}
          onAdd={(body, urgent) => attempt(board.addToDeck(body, urgent))}
          onFinish={finish}
          onLater={(task) => void attempt(board.later(task))}
          onShuffle={() => void attempt(board.shuffle())}
          onToTop={(task) => void attempt(board.toTop(task))}
          onRemove={(task) => void attempt(board.remove(task))}
          onDropTask={(taskId) => give(taskId, board.me)}
        />
        <TeamDecks
          team={admins.filter((a) => a.id !== board.me)}
          deckOf={board.deckOf}
          onGive={give}
        />
      </div>
      <DoneArchive done={done} admins={admins} weekCount={week} landed={landed} now={now} />
    </div>
  )
}
