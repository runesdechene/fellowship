/**
 * QUOI     — la ligne « Installer l'app » du menu du compte (feuille « Moi » du téléphone).
 * POURQUOI — Uriel, 10/11/2026 : après la croix, l'invitation doit pouvoir revenir. Sur Android,
 *            la ligne ouvre la fenêtre du navigateur ; sur iPhone, elle rouvre la carte et son geste.
 * ATTENTION — absente quand l'app est installée ou que le navigateur ne sait pas l'installer.
 */
import { Download } from 'lucide-react'
import { dismissInstall, promptInstall } from '@/lib/installation'
import { useInstall } from '@/lib/useInstall'

export function InstallMenuItem({ onDone }: { onDone: () => void }) {
  const { available, iPhone } = useInstall()
  if (!available) return null

  return (
    <button
      type="button"
      className="tab-sheet__item tab-sheet__link"
      onClick={() => {
        onDone()
        if (iPhone) dismissInstall(false)
        else void promptInstall()
      }}
    >
      <Download size={18} strokeWidth={1.8} />
      <span>Installer l’app</span>
    </button>
  )
}
