import { Sparkles } from 'lucide-react'

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles strokeWidth={1.5} className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="max-w-sm text-muted-foreground">Bientôt disponible. On y travaille — cette section arrive très vite.</p>
    </div>
  )
}
