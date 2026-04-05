import { Mail } from 'lucide-react'

interface EmailSignupPlaceholderProps {
  brandName: string
  isOwner: boolean
}

export function EmailSignupPlaceholder({ brandName, isOwner }: EmailSignupPlaceholderProps) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 text-center">
      {isOwner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary/10 px-3 py-0.5 text-[0.65rem] font-medium text-primary whitespace-nowrap">
          Vos visiteurs verront ce formulaire ici
        </div>
      )}
      <Mail className="mx-auto h-6 w-6 text-muted-foreground/40" />
      <p className="mt-2 text-sm font-medium">
        Restez informé des prochains événements de {brandName}
      </p>
      <div className="mt-4 flex items-center gap-2 max-w-xs mx-auto">
        <input
          type="email"
          placeholder="votre@email.com"
          disabled
          className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
        />
        <button
          disabled
          className="rounded-lg bg-primary/50 px-4 py-2 text-sm font-medium text-primary-foreground cursor-not-allowed"
        >
          S'inscrire
        </button>
      </div>
    </div>
  )
}
