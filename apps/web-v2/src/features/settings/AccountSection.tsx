/**
 * QUOI     — la section Compte des Réglages : l'adresse de connexion, et se déconnecter.
 * POURQUOI — lot 9b, maquette 2206:691. La connexion se fait par un code reçu par e-mail : pas de
 *            mot de passe à changer, et l'adresse se lit sans se modifier. Jusqu'ici, aucun bouton
 *            de la V2 ne permettait de se déconnecter.
 */
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { useTransitionNavigate } from '@/lib/navigation'
import { SettingCard, SettingRow } from './SettingRow'

export function AccountSection() {
  const { user, signOut } = useAuth()
  const go = useTransitionNavigate()

  return (
    <section id="compte" className="settings-section">
      <div className="settings-section__head">
        <h2 className="settings-section__title">Compte</h2>
      </div>
      <SettingCard>
        <SettingRow title="E-mail" note="Tu te connectes avec un code reçu à cette adresse">
          <span className="setting-row__value">{user?.email}</span>
        </SettingRow>
        <SettingRow title="Se déconnecter">
          <Button
            onClick={() => {
              void signOut().then(() => {
                go('/connexion')
              })
            }}
          >
            <LogOut size={14} strokeWidth={2} />
            Se déconnecter
          </Button>
        </SettingRow>
      </SettingCard>
    </section>
  )
}
