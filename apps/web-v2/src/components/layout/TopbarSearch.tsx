/**
 * QUOI     — la recherche partout de la barre du haut : sur ordinateur un champ « Festivals,
 *            exposants, dates passées… » (maquette 2584:842), sur téléphone une loupe ronde
 *            (maquette 2584:1056). Absente d'Explorer, qui a sa grande barre.
 * POURQUOI — chercher une date passée ou un exposant depuis n'importe quel écran, sans passer
 *            d'abord par Explorer (Uriel, 31/10/2026).
 * ATTENTION — la recherche vit dans l'adresse d'Explorer : Entrée mène à `/explorer?q=…`. La
 *            loupe ouvre Explorer avec `state.focus` : « Rechercher » y prend le clavier.
 */
import { Search } from 'lucide-react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useTransitionNavigate } from '@/lib/navigation'

export function TopbarSearch() {
  const go = useTransitionNavigate()
  const { pathname } = useLocation()
  if (pathname.startsWith('/explorer')) return null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const field = event.currentTarget.elements.namedItem('q')
    const words = field instanceof HTMLInputElement ? field.value.trim() : ''
    go(words ? `/explorer?${new URLSearchParams({ q: words }).toString()}` : '/explorer')
  }

  return (
    <>
      <form className="topbar-search" role="search" onSubmit={submit}>
        <Search className="topbar-search__icon" size={15} strokeWidth={2} aria-hidden />
        <input
          className="topbar-search__input"
          name="q"
          type="search"
          placeholder="Festivals, exposants, dates passées…"
          aria-label="Rechercher partout"
        />
      </form>
      <Button
        variant="icon"
        className="topbar-search__loupe"
        aria-label="Rechercher"
        title="Rechercher"
        onClick={() => {
          go('/explorer', { state: { focus: true } })
        }}
      >
        <Search size={18} strokeWidth={1.75} />
      </Button>
    </>
  )
}
