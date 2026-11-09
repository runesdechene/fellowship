/**
 * QUOI     — le pied de la page Décades : chaque source et son dernier relevé, puis SuperPDP.
 * POURQUOI — une source muette bloque des journées ; on voit d'où vient le silence (maquette 2795:233).
 */
import { formatDayMonth, formatTime } from '@/lib/dates'
import { REGIMES, SOURCE_NAMES } from '@/lib/reporting'
import { DayMark } from './DayMark'
import type { ReportingData } from './useReporting'

function readLine(lastRead: string | null, failed: boolean): string {
  if (!lastRead) return 'jamais lue'
  const when = new Date(lastRead)
  const moment = `le ${formatDayMonth(when)} à ${formatTime(when)}`
  return failed ? `sans réponse ${moment}` : `lue ${moment}`
}

export function ReportingSources({ data }: { data: ReportingData }) {
  const { company, declarations, sources } = data
  return (
    <section className="admin-card reporting-sources" aria-label="Sources">
      <h2 className="home-card__title">Sources</h2>
      {sources.map((source) => {
        const failed = source.derniere_erreur !== null
        return (
          <span key={source.id} className="reporting-sources__item">
            <DayMark mark={!source.actif ? 'vide' : failed ? 'attente' : 'envoyee'} size="s" />
            <span>
              <strong>{SOURCE_NAMES[source.type] ?? source.type}</strong>
              <span>{source.actif ? readLine(source.derniere_lecture, failed) : 'coupée'}</span>
            </span>
          </span>
        )
      })}
      <span className="reporting-sources__item">
        <DayMark mark={declarations ? 'envoyee' : 'attente'} size="s" />
        <span>
          <strong>SuperPDP</strong>
          <span>
            {company.environnement === 'sandbox' ? 'bac à sable' : 'production'}, régime{' '}
            {(REGIMES[company.regime_tva] ?? company.regime_tva).toLowerCase()}
            {!declarations && ', suivi indisponible'}
          </span>
        </span>
      </span>
    </section>
  )
}
