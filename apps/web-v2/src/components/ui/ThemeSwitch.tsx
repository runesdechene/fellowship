/**
 * QUOI     — l'interrupteur Clair / Sombre, en bas de la barre latérale et dans la feuille « Moi »
 *            du téléphone.
 * POURQUOI — demandé par Uriel le 08/10/2026 : on choisit son thème d'un geste. Sans choix, la V2
 *            suit le réglage de l'appareil.
 * ATTENTION — le thème vit sur `<html data-theme>` (lib/theme.ts), pas dans React : deux
 *            interrupteurs montés en même temps lisent le même attribut.
 */
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { applyTheme, currentTheme, followDevice, storeThemeChoice, type Theme } from '@/lib/theme'

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
]

export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(
    () =>
      followDevice((next) => {
        applyTheme(next)
        setTheme(next)
      }),
    [],
  )

  function choose(next: Theme) {
    storeThemeChoice(next)
    applyTheme(next)
    setTheme(next)
  }

  return (
    <div className="theme-switch" role="group" aria-label="Thème de l’interface">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          className="theme-switch__option"
          aria-pressed={theme === value}
          aria-label={label}
          title={label}
          onClick={() => {
            choose(value)
          }}
        >
          <Icon size={14} strokeWidth={1.9} />
          {!compact && label}
        </button>
      ))}
    </div>
  )
}
