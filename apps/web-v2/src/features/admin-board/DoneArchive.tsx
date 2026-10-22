/**
 * QUOI     — « Terminé » : une colonne par jour, chaque carte avec la photo et le prénom de qui
 *            l'a faite ; plus le jour est ancien, plus la colonne pâlit, jusqu'à s'effacer en 7 jours.
 * POURQUOI — maquette 2432:306 : voir ce que l'équipe a acquis, sans que la liste s'alourdisse.
 */
import type { CSSProperties } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { fadeFor, groupByDay } from '@/lib/admin-board'
import { dayLabel } from '@/lib/dates'
import type { Admin, Task } from './useAdminBoard'

interface DoneArchiveProps {
  done: Task[]
  admins: Admin[]
  weekCount: number
  landed: string | null
  now: Date
}

export function DoneArchive({ done, admins, weekCount, landed, now }: DoneArchiveProps) {
  const byId = new Map(admins.map((a) => [a.id, a]))
  return (
    <section className="board-done" aria-label="Terminé">
      <header className="board-done__head">
        <h2 className="board-zone__title">Terminé</h2>
        <span className="board-done__week">{weekCount} cette semaine</span>
        <span className="board-done__rule" aria-hidden />
        <span className="board-done__note">s’efface en 7 jours</span>
      </header>
      {done.length === 0 ? (
        <p className="board-done__empty">Rien de terminé ces sept derniers jours.</p>
      ) : (
        <div className="board-done__days">
          {groupByDay(done, now).map((day) => (
            <div
              key={day.daysAgo}
              className="board-done__day"
              data-board-today={day.daysAgo === 0 ? '' : undefined}
              style={{ '--board-fade': String(fadeFor(day.daysAgo)) } as CSSProperties}
            >
              <h3 className="board-done__label">{dayLabel(day.date, now)}</h3>
              {day.tasks.map((task) => {
                const who = task.ownerId ? byId.get(task.ownerId) : undefined
                return (
                  <article
                    key={task.id}
                    className={`done-card${task.id === landed ? ' done-card--landed' : ''}`}
                  >
                    <p className="done-card__text">{task.body}</p>
                    {who && (
                      <p className="done-card__who">
                        <Avatar className="done-card__face" src={who.avatarUrl} name={who.name} />
                        {who.name}
                      </p>
                    )}
                  </article>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
