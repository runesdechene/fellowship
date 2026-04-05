import { Mail } from 'lucide-react'

interface EmailSignupPlaceholderProps {
  brandName: string
  isOwner: boolean
}

export function EmailSignupPlaceholder({ brandName, isOwner }: EmailSignupPlaceholderProps) {
  return (
    <div
      className="relative rounded-2xl p-6 text-center"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {isOwner && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[0.65rem] font-medium whitespace-nowrap"
          style={{ background: 'hsl(24 72% 60% / 0.15)', color: 'hsl(24 72% 60%)' }}
        >
          Vos visiteurs verront ce formulaire ici
        </div>
      )}
      <Mail className="mx-auto h-6 w-6 text-white/25" />
      <p className="mt-2 text-sm font-medium text-white/60">
        Restez informé des prochains événements de {brandName}
      </p>
      <div className="mt-4 flex items-center gap-2 max-w-xs mx-auto">
        <input
          type="email"
          placeholder="votre@email.com"
          disabled
          className="flex-1 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.25)',
          }}
        />
        <button
          disabled
          className="rounded-lg px-4 py-2 text-sm font-medium cursor-not-allowed"
          style={{ background: 'hsl(24 72% 60% / 0.3)', color: 'hsl(24 72% 60%)' }}
        >
          S'inscrire
        </button>
      </div>
    </div>
  )
}
