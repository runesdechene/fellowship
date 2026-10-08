/**
 * QUOI     — l'invitation Pro en bulle : la pastille, un titre, une phrase, « Découvrir le Pro ».
 * POURQUOI — en gratuit, un geste refusé s'explique là où on l'a tenté (maquette « Points de
 *            contact du Pro », Explorer) ; jamais une fenêtre qui recouvre l'écran.
 * ATTENTION — Échap la referme, comme un clic en dehors (géré par l'appelant via onClose).
 */
import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useTransitionNavigate } from '@/lib/navigation'
import { ProBadge } from './ProBadge'

interface ProBubbleProps {
  title: string
  text: string
  onClose?: () => void
  className?: string
}

export function ProBubble({ title, text, onClose, className }: ProBubbleProps) {
  const go = useTransitionNavigate()

  useEffect(() => {
    if (!onClose) return
    const close = onClose
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className={['pro-bubble', className].filter(Boolean).join(' ')}
      role="dialog"
      aria-label={title}
    >
      <ProBadge />
      <p className="pro-bubble__title">{title}</p>
      <p className="pro-bubble__text">{text}</p>
      <button type="button" className="pro-bubble__link" onClick={() => go('/pro')}>
        Découvrir le Pro
        <ArrowRight size={13} strokeWidth={2} />
      </button>
    </div>
  )
}
