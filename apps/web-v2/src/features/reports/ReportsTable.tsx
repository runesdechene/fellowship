/**
 * QUOI     — la liste des dates de « Mes bilans » : affiche, nom, date et lieu, puis chiffre
 *            d'affaires, frais et bénéfice ; « Remplir le bilan » pour une date pas encore faite.
 * POURQUOI — chaque ligne ouvre le bilan de sa date (/bilans/:eventId). Cinq dates, puis on
 *            déplie la suite sur place.
 * ATTENTION — sur téléphone, seul le bénéfice reste (la colonne CA et frais se cache en CSS).
 */
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { formatDayMonthShort } from '@/lib/dates'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import { reportFigures, type ReportDate } from '@/lib/reports'

const SHOWN = 5

function ReportRow({ date, best }: { date: ReportDate; best: boolean }) {
  const go = useTransitionNavigate()
  const { filled, revenue, costs, net } = reportFigures(date)

  return (
    <button
      type="button"
      className="reports-table__row"
      onClick={() => go(`/bilans/${date.eventId}`)}
    >
      <span className="reports-table__date">
        {date.imageUrl ? (
          <img className="reports-table__thumb" src={date.imageUrl} alt="" />
        ) : (
          <span className="reports-table__thumb" />
        )}
        <span className="reports-table__name-block">
          <span className="reports-table__name">{date.name}</span>
          <span className="reports-table__meta">
            {formatDayMonthShort(date.startDate)} · {date.place}
          </span>
        </span>
      </span>
      {filled ? (
        <>
          <span className="reports-table__amount reports-table__amount--wide">
            {formatEuros(revenue)}
          </span>
          <span className="reports-table__amount reports-table__amount--wide reports-table__amount--soft">
            {formatEuros(costs)}
          </span>
          <span
            className={best ? 'reports-table__net reports-table__net--best' : 'reports-table__net'}
          >
            {formatSignedEuros(net)}
          </span>
          <span className="reports-table__end">
            <ChevronRight size={16} strokeWidth={2} />
          </span>
        </>
      ) : (
        <>
          <span className="reports-table__amount reports-table__amount--wide reports-table__amount--none">
            —
          </span>
          <span className="reports-table__amount reports-table__amount--wide reports-table__amount--none">
            —
          </span>
          <span className="reports-table__amount reports-table__amount--wide reports-table__amount--none">
            —
          </span>
          <span className="reports-table__end reports-table__todo">
            <span className="reports-table__todo-dot" />
            Remplir le bilan
            <ArrowRight size={13} strokeWidth={2} />
          </span>
        </>
      )}
    </button>
  )
}

export function ReportsTable({ dates, bestId }: { dates: ReportDate[]; bestId: string | null }) {
  const [open, setOpen] = useState(false)
  const shown = open ? dates : dates.slice(0, SHOWN)
  const hidden = dates.length - SHOWN

  return (
    <div className="reports-table">
      <div className="reports-table__head" aria-hidden="true">
        <span className="reports-table__date">Date</span>
        <span className="reports-table__amount reports-table__amount--wide">
          Chiffre d’affaires
        </span>
        <span className="reports-table__amount reports-table__amount--wide">Frais</span>
        <span className="reports-table__net">Bénéfice</span>
        <span className="reports-table__end" />
      </div>
      {shown.map((date) => (
        <ReportRow key={date.eventId} date={date} best={date.eventId === bestId} />
      ))}
      {!open && hidden > 0 && (
        <button
          type="button"
          className="reports-table__more"
          onClick={() => {
            setOpen(true)
          }}
        >
          Voir {hidden === 1 ? 'l’autre date' : `les ${hidden} autres dates`}
          <ChevronDown size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
