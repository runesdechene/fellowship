/**
 * QUOI     — « L'histoire de la fiche » (`/evenements/:slug/historique`) : une ligne par version, avec
 *            l'auteur, ce qu'il a changé, la date et son mot ; « Actuelle » sur la plus récente.
 * POURQUOI — maquette 2253:2 (lot 10c) : la fiche est partagée ; on voit qui l'a tenue à jour, et
 *            rien ne se perd.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { versionWhen } from '@/lib/event-history'
import { useTransitionNavigate } from '@/lib/navigation'
import { useEventHistory } from './useEventHistory'
import { eventPath } from '@/lib/event-path'
import { useEventKey } from '@/features/event/useEventKey'

export function HistoryPage() {
  const { id, slug } = useEventKey()
  const go = useTransitionNavigate()
  const { entries, eventName, loading, error } = useEventHistory(id)
  const now = new Date()

  return (
    <div className="history">
      <header className="history__head">
        <button type="button" className="history__back" onClick={() => go(eventPath(slug))}>
          <ChevronLeft size={14} strokeWidth={2} />
          {eventName}
        </button>
        <h1 className="history__title">L’histoire de la fiche</h1>
        <p className="history__lead">
          Tenue à jour par les exposants. Chaque version est gardée : rien ne se perd.
        </p>
      </header>

      {error && <p className="history__state">{error}</p>}
      {!loading && !error && (
        <>
          <ul className="history__list">
            {entries.map((entry, index) => {
              const content = (
                <>
                  <Avatar src={entry.avatarUrl} name={entry.author} className="history__avatar" />
                  <span className="history__text">
                    <span className="history__sentence">
                      <b>{entry.author}</b> {entry.sentence}
                    </span>
                    <span className="history__meta">
                      {versionWhen(entry.createdAt, now)}
                      {entry.note && ` · « ${entry.note} »`}
                    </span>
                  </span>
                  {index === 0 ? (
                    <span className="history__current">Actuelle</span>
                  ) : (
                    <span className="history__see">
                      Voir <ChevronRight size={13} strokeWidth={2} />
                    </span>
                  )}
                </>
              )
              const versionId = entry.id
              return (
                <li key={versionId ?? 'origine'}>
                  {versionId !== null ? (
                    <button
                      type="button"
                      className="history__row"
                      onClick={() => go(eventPath(slug, `historique/${String(versionId)}`))}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="history__row">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="history__foot">
            Ouvre une version pour voir ce qu’elle a ajouté et retiré, et y revenir si besoin.
          </p>
        </>
      )}
    </div>
  )
}
