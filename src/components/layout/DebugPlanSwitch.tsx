import { useAuth } from '@/lib/auth'

type PlanOverride = 'pro' | 'free' | null

/** Switch debug réservé aux admins : force le plan vu (Réel/Pro/Gratuit) sans toucher la base.
 *  N'agit que sur l'entité active (le plan vit sur l'entité). */
export function DebugPlanSwitch() {
  const { isAdmin, planOverride, setPlanOverride } = useAuth()
  if (!isAdmin) return null

  const opts: { v: PlanOverride; label: string }[] = [
    { v: null, label: 'Réel' },
    { v: 'pro', label: 'Pro' },
    { v: 'free', label: 'Gratuit' },
  ]

  return (
    <div
      className="hidden md:flex items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5 text-[11px] font-semibold"
      title="Debug admin : force le plan vu de l'entité active (n'écrit rien en base)"
    >
      {opts.map(o => (
        <button
          key={o.label}
          onClick={() => setPlanOverride(o.v)}
          className={`rounded-full px-2 py-0.5 transition ${
            planOverride === o.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
