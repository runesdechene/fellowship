/**
 * QUOI     — la cloche de la barre du haut : un point quand il y a du non-lu ou une demande d'ami,
 *            le panneau au clic.
 * POURQUOI — la seule entrée des notifications, au même coin sur tous les écrans.
 * ATTENTION — Échap et un clic dehors referment ; ouvrir relit les notifications.
 */
import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useNetwork } from '@/features/community/useNetwork'
import { useTransitionNavigate } from '@/lib/navigation'
import { newFollowers } from '@/lib/network'
import { NetworkBlock } from './NetworkBlock'
import { NotificationPanel } from './NotificationPanel'
import { useNotifications } from './useNotifications'

export function NotificationBell() {
  const { views, failed, unread, refresh, markRead, markAllRead, markInterested } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const go = useTransitionNavigate()
  // Le réseau de l'acteur actif, relu à chaque ouverture comme les notifications.
  const { network, answered, followBack, decline } = useNetwork(String(open))
  const requests = network?.requests ?? []
  const newcomers = network ? newFollowers(network.followers, new Date()) : []
  const waiting = unread || requests.length > 0

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
        aria-label={waiting ? 'Notifications, du nouveau' : 'Notifications'}
        aria-expanded={open}
        onClick={() => {
          if (!open) refresh()
          setOpen(!open)
        }}
      >
        <Bell size={20} strokeWidth={1.75} />
        {waiting && <span className="notif-bell__dot" />}
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
