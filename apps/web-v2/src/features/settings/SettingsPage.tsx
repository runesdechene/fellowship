/**
 * QUOI     — la page Réglages : le titre, la colonne des sections, puis les sections.
 * POURQUOI — maquette `2027 — Réglages · notifications sur le téléphone`. La page naît au lot 8e
 *            avec sa seule section Notifications ; le lot 9 ajoutera Profil, Compte, Enseignes et
 *            abonnement, Contact.
 */
import { Check } from 'lucide-react'
import { NotificationSettings } from './NotificationSettings'

export function SettingsPage() {
  return (
    <div className="settings">
      <header className="settings__header">
        <h1 className="settings__title">Réglages</h1>
        <p className="settings__saved">
          <Check size={13} strokeWidth={2} />
          Chaque changement s’enregistre aussitôt
        </p>
      </header>
      <div className="settings__body">
        <nav className="settings__nav" aria-label="Sections des Réglages">
          <a className="settings__nav-item settings__nav-item--on" href="#notifications">
            Notifications
          </a>
        </nav>
        <div className="settings__sections">
          <NotificationSettings />
        </div>
      </div>
    </div>
  )
}
