/**
 * QUOI     — les signalements de l'administration : À traiter, Résolus, Rejetés ; chaque ligne mène à
 *            ce qui est visé, « Traiter » ouvre la fenêtre de décision.
 * POURQUOI — reprise de la V1 (lot 4). Pas de maquette : la page est composée des briques de la liste
 *            des comptes (en-tête, filtres segmentés, tableau), sans rien de neuf (spec du 19/10/2026).
 */
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { formatFullDate } from '@/lib/dates'
import {
  readModerationStatus,
  reasonLabel,
  STATUSES,
  targetLabel,
  writeModerationStatus,
} from '@/lib/moderation'
import { ResolveDialog } from './ResolveDialog'
import { useModeration, type Report } from './useModeration'

export function ModerationPage() {
  const [search, setSearch] = useSearchParams()
  const status = readModerationStatus(search)
  const { reports, error, reload } = useModeration(status)
  const [open, setOpen] = useState<Report | null>(null)
  const pending = status === 'pending'

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Signalements</h1>
          <p className="admin-page__lede">
            Ce que les comptes signalent : regarde, puis résous ou rejette.
          </p>
        </div>
        <Segmented
          label="Statut"
          options={STATUSES.map(({ value, label }) => ({ value, label }))}
          value={status}
          onChange={(next) => setSearch(writeModerationStatus(next))}
        />
      </header>
      {error && <p className="admin-page__error">{error}</p>}
      {reports && reports.length === 0 && (
        <p className="admin-page__lede">
          {pending ? 'Rien à traiter. Tout est calme.' : 'Aucun signalement ici.'}
        </p>
      )}
      {reports && reports.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Ce qui est visé</th>
              <th scope="col">Motif</th>
              <th scope="col">Commentaire</th>
              <th scope="col">Signalé par</th>
              <th scope="col">{pending ? 'Le' : 'Traité le'}</th>
              {!pending && <th scope="col">Note</th>}
              <th scope="col">
                <span className="admin-table__sr">Agir</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="admin-table__row">
                <td>
                  {report.target_path ? (
                    <Link to={report.target_path} className="admin-table__row-link">
                      <span className="admin-table__name">
                        {targetLabel(report.target_type, report.target_name)}
                      </span>
                    </Link>
                  ) : (
                    <span className="admin-table__name">
                      {targetLabel(report.target_type, report.target_name)}
                    </span>
                  )}
                </td>
                <td className="admin-table__text">{reasonLabel(report.reason)}</td>
                <td className="admin-table__quote">{report.comment || '—'}</td>
                <td>
                  <span className="admin-table__people">
                    <Avatar
                      src={report.reporter_avatar}
                      name={report.reporter_name}
                      className="admin-table__face"
                    />
                    <span className="admin-table__text">{report.reporter_name || '—'}</span>
                  </span>
                </td>
                <td className="admin-table__text">
                  {formatFullDate(new Date(report.resolved_at || report.created_at))}
                </td>
                {!pending && <td className="admin-table__quote">{report.admin_note || '—'}</td>}
                <td className="admin-table__actions">
                  {pending ? (
                    <Button onClick={() => setOpen(report)}>Traiter</Button>
                  ) : (
                    <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && (
        <ResolveDialog
          report={open}
          onClose={() => setOpen(null)}
          onDone={() => {
            setOpen(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
