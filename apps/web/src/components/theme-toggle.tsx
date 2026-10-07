import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Changer de thème"
    >
      <span className="knob">
        {theme === 'day' ? (
          <Sun className="h-[13px] w-[13px]" strokeWidth={2.2} />
        ) : (
          <Moon className="h-[13px] w-[13px]" strokeWidth={2.2} />
        )}
      </span>
    </button>
  )
}
