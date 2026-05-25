import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth'

/** Enveloppe une surface Pro : si la personne n'est pas Pro, affiche un teaser « Passe en Pro ». */
export function ProGate({ title, children }: { title: string; children: ReactNode }) {
  const { person } = useAuth()
  if (person?.plan === 'pro') return <>{children}</>
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Lock strokeWidth={1.5} className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-extrabold">{title} — réservé au Pro</h1>
      <p className="max-w-sm text-muted-foreground">Pour vivre de ton art : passe en Pro pour débloquer cette section.</p>
      <Link to="/reglages" className="mt-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Passer en Pro — dès 9,99 € HT/mois</Link>
    </div>
  )
}
