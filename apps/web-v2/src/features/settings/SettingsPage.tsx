/**
 * QUOI     — la page Réglages : le titre et ce qui vient de s'enregistrer, la colonne des sections,
 *            puis les sections.
 * POURQUOI — maquette 2206:691 (lot 9b) : Profil, Compte, Notifications, Enseignes et abonnement,
 *            Contact, et la suppression du compte en bas. Pas de bouton Enregistrer : chaque
 *            changement s'écrit aussitôt, et l'en-tête le dit.
 */
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NotificationSettings } from './NotificationSettings'
import { ProfileSection } from './ProfileSection'
import type { SaveState } from './useProfileSave'

const SECTIONS = [
  { id: 'profil', label: 'Profil' },
  { id: 'notifications', label: 'Notifications' },
] as const

const SAVED_FOR_MS = 2000

const SAYS: Record<SaveState, string> = {
  idle: 'Chaque changement s’enregistre aussitôt',
  saved: 'Enregistré',
  failed: 'Pas enregistré — réessaie',
}

export function SettingsPage() {
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // « Enregistré » ne reste qu'un instant ; un échec reste jusqu'au prochain essai.
  useEffect(() => {
    if (saveState !== 'saved') return
    const timer = window.setTimeout(() => {
      setSaveState('idle')
    }, SAVED_FOR_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [saveState])

  return (
    <div className="settings">
      <header className="settings__header">
        <h1 className="settings__title">Réglages</h1>
        <p
          className={
            saveState === 'failed' ? 'settings__saved settings__saved--failed' : 'settings__saved'
          }
          role="status"
        >
          {saveState !== 'failed' && <Check size={13} strokeWidth={2} />}
          {SAYS[saveState]}
        </p>
      </header>
      <div className="settings__body">
        <nav className="settings__nav" aria-label="Sections des Réglages">
          {SECTIONS.map((section) => (
            <a key={section.id} className="settings__nav-item" href={`#${section.id}`}>
              {section.label}
            </a>
          ))}
        </nav>
        <div className="settings__sections">
          <ProfileSection onSave={setSaveState} />
          <NotificationSettings />
        </div>
      </div>
    </div>
  )
}
