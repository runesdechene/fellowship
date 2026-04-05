import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { changelog, hasSeenLatest, markAsSeen } from '@/changelog'
import './ChangelogModal.css'

export function ChangelogModal() {
  const [show, setShow] = useState(false)
  const latest = changelog[0]

  useEffect(() => {
    if (!hasSeenLatest()) {
      // Small delay so the app loads first
      const t = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  if (!show || !latest) return null

  const handleClose = () => {
    markAsSeen()
    setShow(false)
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="changelog-backdrop" onClick={handleClose}>
      <div className="changelog-modal" onClick={e => e.stopPropagation()}>
        <div className="changelog-header">
          <span className="changelog-badge">
            <Sparkles style={{ width: 12, height: 12, display: 'inline', verticalAlign: -1, marginRight: 4 }} />
            v{latest.version}
          </span>
          <button className="changelog-close" onClick={handleClose}>
            <X strokeWidth={1.5} />
          </button>
        </div>

        <h2 className="changelog-title">{latest.title}</h2>
        <p className="changelog-date">{formatDate(latest.date)}</p>

        <ul className="changelog-list">
          {latest.changes.map((change, i) => (
            <li key={i} className="changelog-item">
              <div className="changelog-item-dot" />
              <span>{change}</span>
            </li>
          ))}
        </ul>

        <div className="changelog-footer">
          <button className="changelog-cta" onClick={handleClose}>
            C'est parti !
          </button>
        </div>
      </div>
    </div>
  )
}
