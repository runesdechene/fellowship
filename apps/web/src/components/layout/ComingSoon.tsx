import { Sparkles } from 'lucide-react'

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center gap-4 overflow-hidden p-8 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--amber)]">
        <Sparkles strokeWidth={2} className="h-3.5 w-3.5" /> Bientôt
      </span>
      <div
        className="flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-lg"
        style={{ background: 'var(--gradient-primary)' }}
      >
        <Sparkles strokeWidth={1.5} className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h1>
      <p className="max-w-sm text-muted-foreground">
        Cette section arrive très vite. On la peaufine pour qu'elle soit à la hauteur du reste de Fellowship.
      </p>
    </div>
  )
}
