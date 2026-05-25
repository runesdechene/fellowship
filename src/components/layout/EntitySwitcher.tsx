import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ChevronDown, User, Store, Check } from 'lucide-react'

/** Sélecteur d'acteur courant : Personne + entités. Visible seulement si ≥1 entité. */
export function EntitySwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { person, entities, currentActor, switchActor } = useAuth()
  const [open, setOpen] = useState(false)

  if (!person || entities.length === 0) {
    // Festivalier pur : pas de sélecteur, juste le nom.
    return (
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><User strokeWidth={1.5} className="h-4 w-4" /></div>
        {!collapsed && <span className="truncate text-sm font-semibold">{person?.display_name ?? 'Moi'}</span>}
      </div>
    )
  }

  const currentLabel = currentActor?.kind === 'entity'
    ? entities.find(e => e.actor_id === currentActor.id)?.brand_name ?? 'Entité'
    : person.display_name ?? 'Moi'

  return (
    <div className="relative px-2 py-2">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left hover:bg-muted">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {currentActor?.kind === 'entity' ? <Store strokeWidth={1.5} className="h-4 w-4" /> : <User strokeWidth={1.5} className="h-4 w-4" />}
        </div>
        {!collapsed && <span className="flex-1 truncate text-sm font-semibold">{currentLabel}</span>}
        {!collapsed && <ChevronDown strokeWidth={1.5} className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="absolute left-2 right-2 z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <button onClick={() => { switchActor(null); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
            <User strokeWidth={1.5} className="h-4 w-4" />
            <span className="flex-1 truncate">{person.display_name ?? 'Moi'} · Festivalier</span>
            {currentActor?.kind === 'person' && <Check strokeWidth={2} className="h-4 w-4 text-primary" />}
          </button>
          {entities.map(e => (
            <button key={e.actor_id} onClick={() => { switchActor(e.actor_id); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
              <Store strokeWidth={1.5} className="h-4 w-4" />
              <span className="flex-1 truncate">{e.brand_name} · {e.type}</span>
              {currentActor?.id === e.actor_id && <Check strokeWidth={2} className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
