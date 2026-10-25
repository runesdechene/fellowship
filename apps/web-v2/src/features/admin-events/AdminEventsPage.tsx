/**
 * QUOI     — les événements de l'administration : recherche, tableau paginé (nom et ville, dates,
 *            catégories, créé par, exposants, créé le), et « Supprimer » avec confirmation.
 * POURQUOI — reprise de la V1 (lot 4). Pas de maquette : la page est composée des briques de la liste
 *            des comptes (en-tête, recherche, tableau, pied de page), sans rien de neuf.
 * ATTENTION — les fiches privées y sont aussi (un admin les lit), marquées « Privée ».
 */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminPager } from '@/components/ui/AdminPager'
import { AdminSearch } from '@/components/ui/AdminSearch'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Tag } from '@/components/ui/Tag'
import { readEventsQuery, writeEventsQuery, type EventsQuery } from '@/lib/admin-events'
import { formatDateRange, parseSqlDate } from '@/lib/dates'
import { tagStyleFor } from '@/lib/tags'
import { useTagStyles } from '@/lib/useTagStyles'
import { SignupDate } from '@/features/admin-accounts/SignupDate'
import { deleteEvent, useAdminEvents, type AdminEvent } from './useAdminEvents'
import { eventPath } from '@/lib/event-path'

export function AdminEventsPage() {
  const [search, setSearch] = useSearchParams()
  const query = readEventsQuery(search)
  const { events, error, reload } = useAdminEvents(query)
  const styles = useTagStyles()
  const [doomed, setDoomed] = useState<AdminEvent | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const now = new Date()
  // Seule la recherche change : elle remplace l'entrée d'historique, le retour arrière saute les frappes.
  const go = (next: Partial<EventsQuery>) =>
    setSearch(writeEventsQuery({ ...query, page: 0, ...next }), {
      replace: Object.keys(next).join() === 'q',
    })

  async function remove(event: AdminEvent) {
    setBusy(true)
    setProblem(null)
    try {
      await deleteEvent(event.id)
      setDoomed(null)
      reload()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'La suppression n’a pas abouti.')
    }
    setBusy(false)
  }

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Événements</h1>
          <p className="admin-page__lede">
            Toutes les fiches, privées comprises. Cherche, ouvre, supprime un doublon.
          </p>
        </div>
      </header>
      <div className="admin-tools">
        <AdminSearch value={query.q} placeholder="Nom ou ville" onSearch={(q) => go({ q })} />
      </div>
      {error && <p className="admin-page__error">{error}</p>}
      {events && events.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Événement</th>
              <th scope="col">Dates</th>
              <th scope="col">Catégories</th>
              <th scope="col">Créé par</th>
              <th scope="col">Suivie par</th>
              <th scope="col">Créé le</th>
              <th scope="col">
                <span className="admin-table__sr">Agir</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="admin-table__row">
                <td>
                  <Link to={eventPath(event.id)} className="admin-table__row-link">
                    <span className="admin-table__identity">
                      <span className="admin-table__name">{event.name}</span>
                      <span className="admin-table__meta">
                        {event.is_private && <span className="admin-table__flag">Privée</span>}
                        {event.city}
                        {event.department && ` (${event.department})`}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="admin-table__text">
                  {formatDateRange(parseSqlDate(event.start_date), parseSqlDate(event.end_date))}
                </td>
                <td>
                  <span className="admin-table__wrap">
                    {event.tags.map((tag) => (
                      <Tag key={tag} name={tag} style={tagStyleFor(styles, tag)} />
                    ))}
                  </span>
                </td>
                <td className="admin-table__text">{event.creator_name || '—'}</td>
                <td className="admin-table__text">{event.exposants}</td>
                <td className="admin-table__text">
                  <SignupDate createdAt={event.created_at} now={now} />
                </td>
                <td className="admin-table__actions">
                  <Button
                    onClick={() => {
                      setProblem(null)
                      setDoomed(event)
                    }}
                  >
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {events && (
        <AdminPager
          page={query.page}
          shown={events.length}
          total={events[0]?.total ?? 0}
          onPage={(page) => go({ page })}
          empty="Aucun événement ne correspond."
        />
      )}
      {doomed && (
        <ConfirmDialog
          title={`Supprimer « ${doomed.name} » ?`}
          text={`La fiche disparaît avec tout ce qui s’y rattache : ${doomed.exposants} exposant(s) qui la suivent, leurs dossiers, bilans, avis et discussions. On ne peut pas revenir en arrière.`}
          confirmLabel="Supprimer"
          busy={busy}
          problem={problem}
          onConfirm={() => void remove(doomed)}
          onClose={() => setDoomed(null)}
        />
      )}
    </div>
  )
}
