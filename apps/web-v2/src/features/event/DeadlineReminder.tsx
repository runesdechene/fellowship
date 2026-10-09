/**
 * QUOI     — « Me rappeler la clôture des candidatures » : la carte et son interrupteur, sous les
 *            infos de « Pour candidater ».
 * POURQUOI — maquette « Points de contact du Pro » (lot 8c) : le Pro ne rate plus une
 *            candidature ; la notification part 7 jours avant la date limite.
 * ATTENTION — Pro seulement : en gratuit, l'interrupteur est grisé et le clic ouvre la bulle du
 *            Pro. Le parent ne pose la carte que si la date limite est à venir.
 */
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { ProBadge } from '@/components/ui/ProBadge'
import { ProBubble } from '@/components/ui/ProBubble'
import { formatDayMonth } from '@/lib/dates'
import { usePlan } from '@/lib/usePlan'
import type { ParticipationStatus } from '@/types/database'
import { useDeadlineReminder } from './useDeadlineReminder'

interface DeadlineReminderProps {
  eventId: string
  actorId: string | null | undefined
  deadline: Date
  status: ParticipationStatus | null
  setStatus: (next: ParticipationStatus | null) => Promise<void>
}

const TITLE = 'Me rappeler la clôture des candidatures'

export function DeadlineReminder(props: DeadlineReminderProps) {
  const { pro } = usePlan()
  const reminder = useDeadlineReminder(props.eventId, props.actorId, props.status, props.setStatus)
  const [inviting, setInviting] = useState(false)
  const on = pro && reminder.on

  const classes = ['deadline-reminder']
  if (on) classes.push('deadline-reminder--on')
  if (!pro) classes.push('deadline-reminder--locked')

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={TITLE}
        className={classes.join(' ')}
        disabled={reminder.saving}
        onClick={() => {
          if (pro) void reminder.toggle()
          else setInviting(true)
        }}
      >
        <Bell size={16} strokeWidth={1.8} className="deadline-reminder__bell" />
        <span className="deadline-reminder__text">
          <span className="deadline-reminder__title">
            {TITLE}
            <ProBadge />
          </span>
          <span className="deadline-reminder__sub">
            7 jours avant le {formatDayMonth(props.deadline)} — par notification
          </span>
        </span>
        <span className="deadline-reminder__switch" />
      </button>
      {inviting && (
        <ProBubble
          title="Ne rate plus une candidature"
          text="Le Pro te prévient 7 jours avant la clôture des candidatures."
          onClose={() => {
            setInviting(false)
          }}
        />
      )}
      {reminder.failed && (
        <p className="deadline-reminder__error">Le rappel n’a pas pu être enregistré.</p>
      )}
    </>
  )
}
