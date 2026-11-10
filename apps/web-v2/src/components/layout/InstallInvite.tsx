/**
 * QUOI     — l'invitation « Installer Fellowship » : une carte posée au-dessus des onglets (en bas à
 *            droite sur ordinateur), le logo, le bouton du navigateur, ou sur iPhone le geste à faire.
 * POURQUOI — maquette 2822:233, validée par Uriel le 10/11/2026, reprise de Runes de Chêne. Sur
 *            iPhone, les notifications n'existent que dans l'app installée.
 * ATTENTION — elle revient à chaque ouverture tant que l'app n'est pas installée ; la croix la fait
 *            taire jusqu'à la prochaine, et « Installer l'app » du menu du compte la rappelle.
 */
import { Share, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { dismissInstall, promptInstall } from '@/lib/installation'
import { useInstall } from '@/lib/useInstall'

const TITLE = 'Installer Fellowship'

export function InstallInvite() {
  const { available, iPhone, dismissed } = useInstall()
  if (!available || dismissed) return null

  return (
    <div className="install-invite" role="region" aria-label={TITLE}>
      <img className="install-invite__logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="" />
      <div className="install-invite__text">
        <p className="install-invite__title">{TITLE}</p>
        {iPhone ? (
          <p className="install-invite__line">
            Touche <Share className="install-invite__share" size={16} aria-label="Partager" /> dans
            Safari, puis « Sur l’écran d’accueil ». Tes notifications arriveront sur ton téléphone.
          </p>
        ) : (
          <>
            <p className="install-invite__line">
              Tes festivals sur ton écran d’accueil, en plein écran, avec tes notifications.
            </p>
            <Button
              variant="action"
              className="install-invite__button"
              onClick={() => {
                void promptInstall()
              }}
            >
              Installer
            </Button>
          </>
        )}
      </div>
      <Button
        variant="bare"
        className="install-invite__close"
        aria-label="Plus tard"
        onClick={() => {
          dismissInstall(true)
        }}
      >
        <X size={16} strokeWidth={2} />
      </Button>
    </div>
  )
}
