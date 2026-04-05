import { Mail } from 'lucide-react'

interface EmailSignupPlaceholderProps {
  brandName: string
  isOwner: boolean
}

export function EmailSignupPlaceholder({ brandName, isOwner }: EmailSignupPlaceholderProps) {
  return (
    <div className="relative rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-5 text-center">
      {isOwner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary/10 px-3 py-0.5 text-[0.6rem] font-medium text-primary whitespace-nowrap">
          Vos visiteurs verront ce formulaire ici
        </div>
      )}
      <Mail className="mx-auto h-5 w-5 text-muted-foreground/30" />
      <p className="mt-1.5 text-xs font-medium text-foreground/70">
        Restez informé des prochains événements de {brandName}
      </p>
      <div className="mt-3 flex items-center gap-2 max-w-[240px] mx-auto">
        <input
          type="email"
          placeholder="votre@email.com"
          disabled
          className="flex-1 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground cursor-not-allowed"
        />
        <button
          disabled
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground cursor-not-allowed opacity-70"
        >
          S'inscrire
        </button>
      </div>
    </div>
  )
}
