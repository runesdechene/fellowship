import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { ChevronDown, Check } from 'lucide-react'

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function EntitySwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { person, entities, currentActor, currentActorRow, switchActor } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Ferme le dropdown au clic en dehors.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const label = currentActor?.kind === 'entity'
    ? entities.find(e => e.actor_id === currentActor.id)?.brand_name ?? 'Entité'
    : person?.display_name ?? 'Moi'
  const sub = currentActor?.kind === 'entity'
    ? (planForActor(currentActor, currentActorRow) === 'pro' ? 'Exposant · toi' : 'Exposant · gratuit')
    : 'Festivalier'

  if (!person || entities.length === 0) {
    return (
      <div className="entity" style={{ cursor: 'default' }}>
        <div className="av">{initials(label)}</div>
        {!collapsed && <div className="nm"><b>{label}</b><span>{sub}</span></div>}
      </div>
    )
  }

  return (
    <div className="entity-menu" ref={menuRef}>
      <button className="entity" onClick={() => setOpen(o => !o)}>
        <div className="av">{initials(label)}</div>
        {!collapsed && <div className="nm"><b>{label}</b><span>{sub}</span></div>}
        {!collapsed && <ChevronDown className="chev" strokeWidth={1.5} width={16} height={16} />}
      </button>
      {open && !collapsed && (
        <div className="entity-dropdown">
          <button onClick={() => { switchActor(null); setOpen(false) }}>
            <span style={{ flex: 1 }}>{person.display_name ?? 'Moi'} · Festivalier</span>
            {currentActor?.kind === 'person' && <Check strokeWidth={2} />}
          </button>
          {entities.map(e => (
            <button key={e.actor_id} onClick={() => { switchActor(e.actor_id); setOpen(false) }}>
              <span style={{ flex: 1 }}>{e.brand_name} · {e.type}</span>
              {currentActor?.id === e.actor_id && <Check strokeWidth={2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
