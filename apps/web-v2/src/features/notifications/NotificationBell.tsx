/**
 * QUOI     — la cloche de la barre du haut : le nombre de nouveautés depuis sa dernière ouverture
 *            (notifications, demandes d'ami, nouveaux abonnés), le panneau au clic.
 * POURQUOI — la seule entrée des notifications, au même coin sur tous les écrans. Le chiffre
 *            s'éteint à l'ouverture ; chaque ligne garde son fond tant qu'elle n'est pas lue
 *            (Uriel, 22/10/2026 : le point restait allumé après avoir ouvert le panneau).
 * ATTENTION — Échap et un clic dehors referment ; ouvrir relit les notifications.
 */
import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useNetwork } from '@/features/community/useNetwork'
import { useTransitionNavigate } from '@/lib/navigation'
import { newFollowers } from '@/lib/network'
import { countLabel, unseenCount } from '@/lib/notifications'
import { NetworkBlock } from './NetworkBlock'
import { NotificationPanel } from './NotificationPanel'
import { useNotifications } from './useNotifications'

export function NotificationBell() {
  const { views, failed, seenAt, markSeen, refresh, markRead, markAllRead, markInterested } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const go = useTransitionNavigate()
  // Le réseau de l'acteur actif, relu à chaque ouverture comme les notifications.
  const { network, answered, followBack, decline } = useNetwork(String(open))
  const requests = network?.requests ?? []
  const newcomers = network ? newFollowers(network.followers, new Date()) : []
  // Une demande d'ami est un abonné : elle date de son abonnement. Qui est l'un et l'autre compte une fois.
  const shown = new Set([...requests, ...newcomers].map((member) => member.id))
  const people = (network?.followers ?? []).filter((member) => shown.has(member.id))
  const count = seenAt
    ? unseenCount(
        [...views.map((view) => view.at), ...people.map((member) => new Date(member.since))],
        seenAt,
      )
    : 0

  useEffect(() => {
    if (!open) return
    function outside(click: MouseEvent) {
      if (click.target instanceof Node && !root.current?.contains(click.target)) setOpen(false)
    }
    function escape(key: KeyboardEvent) {
      if (key.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className="notif-bell" ref={root}>
      <Button
        variant="icon"
        aria-label={count > 0 ? `Notifications, ${String(count)} nouvelles` : 'Notifications'}
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            refresh()
            markSeen()
          }
          setOpen(!open)
        }}
      >
        <Bell size={20} strokeWidth={1.75} />
        {count > 0 && <span className="notif-bell__count">{countLabel(count)}</span>}
      </Button>
      {open && (
        <NotificationPanel
          views={views}
          failed={failed}
          onRead={markRead}
          onReadAll={markAllRead}
          onMark={markInterested}
          network={
            requests.length + newcomers.length > 0 ? (
              <NetworkBlock
                requests={requests}
                newcomers={newcomers}
                answered={answered}
                onFollow={followBack}
                onDecline={decline}
                onOpenFollowers={() => {
                  setOpen(false)
                  go('/communaute/abonnes')
                }}
              />
            ) : null
          }
          onClose={() => {
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
