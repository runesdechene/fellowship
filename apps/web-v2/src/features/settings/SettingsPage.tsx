/**
 * QUOI     — la page Réglages : le titre et ce qui vient de s'enregistrer, la colonne des rubriques,
 *            puis la rubrique ouverte, seule (`/reglages/:rubrique`).
 * POURQUOI — maquettes `2027 — Réglages · Profil`… `· Contact` (2533:233, 25/10/2026) : une page par
 *            rubrique, la colonne reste. Pas de bouton Enregistrer : chaque changement s'écrit
 *            aussitôt, et l'en-tête le dit.
 * ATTENTION — `/reglages` seul montre le Profil ; sur téléphone, il montre la liste des rubriques
 *            (settings.css), puisque la colonne n'y tient pas à côté.
 */
import { Bell, Check, KeyRound, Mail, Store, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AccountSection } from './AccountSection'
import { ContactSection } from './ContactSection'
import { DeleteAccount } from './DeleteAccount'
import { EntitiesSection } from './EntitiesSection'
import { NotificationSettings } from './NotificationSettings'
import { ProfileSection } from './ProfileSection'
import { ResetRevenueKey } from './ResetRevenueKey'
import type { SaveState } from './useProfileSave'

const SECTIONS = [
  { id: 'profil', label: 'Profil', Icon: UserRound },
  { id: 'compte', label: 'Compte', Icon: KeyRound },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'enseignes', label: 'Enseignes et abonnement', Icon: Store },
  { id: 'contact', label: 'Contact', Icon: Mail },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const SAVED_FOR_MS = 2000

const SAYS: Record<SaveState, string> = {
  idle: 'Chaque changement s’enregistre aussitôt',
  saved: 'Enregistré',
  failed: 'Pas enregistré — réessaie',
}

function Section({ id, onSave }: { id: SectionId; onSave: (state: SaveState) => void }) {
  switch (id) {
    case 'profil':
      return <ProfileSection onSave={onSave} />
    case 'compte':
      return (
        <>
          <AccountSection />
          <ResetRevenueKey />
          <DeleteAccount />
        </>
      )
    case 'notifications':
      return <NotificationSettings />
    case 'enseignes':
      return <EntitiesSection />
    case 'contact':
      return <ContactSection />
  }
}

export function SettingsPage() {
  const { rubrique } = useParams()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const open = SECTIONS.find((section) => section.id === (rubrique ?? 'profil'))

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

  if (!open) return <Navigate to="/reglages" replace />

  return (
    <div className={rubrique ? 'settings' : 'settings settings--index'}>
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
        <nav className="settings__nav" aria-label="Rubriques des Réglages">
          {SECTIONS.map(({ id, label, Icon }) => (
            <Link
              key={id}
              className={
                id === open.id ? 'settings__nav-item settings__nav-item--on' : 'settings__nav-item'
              }
              to={`/reglages/${id}`}
              aria-current={id === open.id ? 'page' : undefined}
            >
              <Icon size={15} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="settings__sections">
          <Section id={open.id} onSave={setSaveState} />
        </div>
      </div>
    </div>
  )
}
