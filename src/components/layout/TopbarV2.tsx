import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { NotifBell } from './NotifBell'
import './TopbarV2.css'

interface Props {
  onCreateEvent: () => void
}

export function TopbarV2({ onCreateEvent }: Props) {
  return (
    <header className="tb2">
      <Link to="/explorer" className="tb2-brand">
        <img className="tb2-mark" src="/icon.png" alt="" />
        <span className="tb2-name">Fellowship<span className="tb2-dot">.</span></span>
      </Link>
      <div className="tb2-right">
        <NotifBell />
        <button className="tb2-cta" onClick={onCreateEvent} aria-label="Ajouter un événement">
          <Plus strokeWidth={2.2} />
          <span>Ajouter un événement</span>
        </button>
      </div>
    </header>
  )
}
