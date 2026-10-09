/**
 * QUOI     — la cloche de la barre du haut : un point quand il y a du non-lu, le panneau au clic.
 * POURQUOI — la seule entrée des notifications, au même coin sur tous les écrans.
 * ATTENTION — Échap et un clic dehors referment ; ouvrir relit les notifications.
 */
import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { NotificationPanel } from './NotificationPanel'
import { useNotifications } from './useNotifications'

export function NotificationBell() {
  const { views, failed, unread, refresh, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

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
        aria-label={unread ? 'Notifications, du nouveau' : 'Notifications'}
        aria-expanded={open}
        onClick={() => {
          if (!open) refresh()
          setOpen(!open)
        }}
      >
        <Bell size={20} strokeWidth={1.75} />
        {unread && <span className="notif-bell__dot" />}
      </Button>
      {open && (
        <NotificationPanel
          views={views}
          failed={failed}
          onRead={markRead}
          onReadAll={markAllRead}
          onClose={() => {
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
