import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { ChevronDown, Check, Plus } from 'lucide-react'

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function EntitySwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { person, entities, currentActor, currentActorRow, switchActor } = useAuth()
  const navigate = useNavigate()
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

  const activeEntity = currentActor?.kind === 'entity'
    ? entities.find(e => e.actor_id === currentActor.id) ?? null
    : null
  const label = activeEntity?.brand_name ?? person?.display_name ?? 'Moi'
  const sub = currentActor?.kind === 'entity'
    ? (planForActor(currentActor, currentActorRow) === 'pro' ? 'Exposant · toi' : 'Exposant · gratuit')
    : 'Festivalier'
  // Avatar : entity active → entity.avatar_url ; sinon la personne (users, source de vérité perso).
  const activeAvatar = activeEntity?.avatar_url ?? person?.avatar_url ?? null

  const avContent = activeAvatar
    ? <img src={activeAvatar} alt="" />
    : <span className="av-initial">{initials(label)}</span>

  // Pas de personne chargée → pas de dropdown (étape de boot).
  if (!person) {
    return (
      <div className="entity" style={{ cursor: 'default' }}>
        <div className="av">{avContent}</div>
        {!collapsed && <div className="nm"><b>{label}</b><span>{sub}</span></div>}
      </div>
    )
  }

  return (
    <div className="entity-menu" ref={menuRef}>
      <button className="entity" onClick={() => setOpen(o => !o)}>
        <div className="av">{avContent}</div>
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
          {/* Accès discret pour créer un compte exposant (utile si le user s'est trompé
              en s'inscrivant, ou s'il développe une activité plus tard). */}
          <button
            className="entity-dropdown-create"
            onClick={() => { navigate('/onboarding?intent=add-exposant'); setOpen(false) }}
          >
            <Plus strokeWidth={2} />
            <span style={{ flex: 1 }}>Créer un compte exposant</span>
          </button>
        </div>
      )}
    </div>
  )
}
