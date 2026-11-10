/**
 * QUOI     — la ligne « Installer l'app » du menu du compte : la feuille « Moi » du téléphone
 *            (`sheet`) et le menu de la carte de compte sur ordinateur (`menu`).
 * POURQUOI — Uriel, 10/11/2026 : après la croix, l'invitation doit pouvoir revenir. Sur iPhone, la
 *            ligne rouvre la carte et son geste ; ailleurs, elle ouvre la fenêtre du navigateur.
 * ATTENTION — absente quand l'app est installée ou que le navigateur ne sait pas l'installer.
 */
import { Download } from 'lucide-react'
import { dismissInstall, promptInstall } from '@/lib/installation'
import { useInstall } from '@/lib/useInstall'

export function InstallMenuItem({
  variant,
  onDone,
}: {
  variant: 'sheet' | 'menu'
  onDone: () => void
}) {
  const { available, iPhone } = useInstall()
  if (!available) return null

  function install() {
    onDone()
    if (iPhone) dismissInstall(false)
    else void promptInstall()
  }

  if (variant === 'menu') {
    return (
      <button
        type="button"
        role="menuitem"
        className="account-switcher__option account-switcher__add"
        onClick={install}
      >
        <span className="account-switcher__add-icon">
          <Download size={16} strokeWidth={2} />
        </span>
        <span className="account-switcher__name">Installer l’app</span>
      </button>
    )
  }

  return (
    <button type="button" className="tab-sheet__item tab-sheet__link" onClick={install}>
      <Download size={18} strokeWidth={1.8} />
      <span>Installer l’app</span>
    </button>
  )
}
