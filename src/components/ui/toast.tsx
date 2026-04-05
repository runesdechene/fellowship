import { useEffect, useState } from 'react'
import { Check, X, Info, AlertTriangle } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  variant?: ToastVariant
  duration?: number
  onDismiss: () => void
}

const icons: Record<ToastVariant, typeof Check> = {
  success: Check,
  error: X,
  info: Info,
  warning: AlertTriangle,
}

const styles: Record<ToastVariant, string> = {
  success: 'bg-accent/10 text-accent border-accent/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-primary/10 text-primary border-primary/20',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
}

export function Toast({ message, variant = 'info', duration = 3000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true))

    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  const Icon = icons[variant]

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-xl ${styles[variant]}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? '0' : '12px'})`,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {message}
    </div>
  )
}
