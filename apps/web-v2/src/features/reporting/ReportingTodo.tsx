/**
 * QUOI     — « À traiter » : les journées bloquées (à vérifier, refusées, réponse perdue) et celles
 *            qui attendent une source, tous mois confondus.
 * POURQUOI — rien ne part tant qu'une journée bloquée n'est pas tranchée ; la page le dit d'abord
 *            (maquette 2795:233). Absent quand il n'y a rien à faire.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { formatWeekdayDayMonthTitle, parseSqlDate } from '@/lib/dates'
import { anomaliesOf, silentSources, toDayStatus } from '@/lib/reporting'
import { HomeCard } from '@/features/admin-home/HomeCard'
import { DayMark } from './DayMark'
import type { ReportingData } from './useReporting'

type TodoDay = ReportingData['todo'][number]

interface Props {
  days: TodoDay[]
  onValidate: (dayId: string) => Promise<string | null>
}

export function ReportingTodo({ days, onValidate }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  if (days.length === 0) return null

  async function validate(dayId: string) {
    setBusy(dayId)
    setProblem(await onValidate(dayId))
    setBusy(null)
  }

  return (
    <HomeCard title="À traiter">
      <ul className="reporting-todo">
        {days.map((day) => {
          const status = toDayStatus(day.statut)
          const date = formatWeekdayDayMonthTitle(parseSqlDate(day.jour))
          if (status === 'en_attente') {
            const silent = silentSources(day.detail)
            const who = silent.length > 0 ? silent.join(' et ') : 'Une source'
            return (
              <li key={day.id} className="reporting-todo__row">
                <DayMark mark="attente" size="l" />
                <span className="reporting-todo__text">
                  <strong>
                    {date} : {who} n’{silent.length > 1 ? 'ont' : 'a'} pas répondu
                  </strong>
                  <span>
                    Le relevé a échoué. Nouvel essai demain matin, rien n’est envoyé d’ici là.
                  </span>
                </span>
              </li>
            )
          }
          const anomaly = anomaliesOf(day.anomalies)[0]
          const title =
            status === 'refusee'
              ? 'SuperPDP a refusé l’envoi'
              : status === 'inconnue'
                ? 'la réponse de SuperPDP s’est perdue'
                : (anomaly?.message ?? 'une anomalie à vérifier')
          const note =
            status === 'refusee'
              ? 'Rien n’est parti. Regarde la réponse de SuperPDP avant de renvoyer.'
              : status === 'inconnue'
                ? 'Renvoyer risquerait de doubler les montants : vérifie chez SuperPDP d’abord.'
                : `${anomaly?.detail ?? ''} Cette journée n’est pas envoyée tant que tu ne l’as pas validée.`
          return (
            <li key={day.id} className="reporting-todo__row">
              <DayMark mark="verifier" size="l" />
              <span className="reporting-todo__text">
                <strong>
                  {date} : {title}
                </strong>
                <span>{note.trim()}</span>
              </span>
              {status === 'a_verifier' && (
                <span className="reporting-todo__actions">
                  {anomaly?.lien && (
                    <a className="button" href={anomaly.lien} target="_blank" rel="noreferrer">
                      Voir la commande
                    </a>
                  )}
                  <Button
                    variant="action"
                    disabled={busy !== null}
                    onClick={() => void validate(day.id)}
                  >
                    Valider la journée
                  </Button>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {problem && <p className="admin-page__error">{problem}</p>}
    </HomeCard>
  )
}
