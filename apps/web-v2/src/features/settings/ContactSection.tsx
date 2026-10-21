/**
 * QUOI     — la section Contact des Réglages : écrire à l'équipe.
 * POURQUOI — lot 9b, maquette 2206:691. L'adresse officielle de l'application (vault, _État.md).
 */
import { Mail } from 'lucide-react'
import { SettingCard, SettingRow } from './SettingRow'

export function ContactSection() {
  return (
    <section id="contact" className="settings-section">
      <div className="settings-section__head">
        <h2 className="settings-section__title">Contact</h2>
      </div>
      <SettingCard>
        <SettingRow title="Une question, une idée, un souci ?" note="On lit tout et on répond vite">
          <a className="button" href="mailto:contact@flw.sh">
            <Mail size={14} strokeWidth={2} />
            Écrire à l’équipe
          </a>
        </SettingRow>
      </SettingCard>
    </section>
  )
}
