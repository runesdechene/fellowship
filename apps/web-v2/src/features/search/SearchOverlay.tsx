/**
 * QUOI     — la recherche plein écran : un grand champ, « Récemment » et « Par catégorie » avant de
 *            taper, les résultats en direct ensuite ; Entrée mène à tout voir dans Explorer.
 * POURQUOI — maquette 2606:379 (Uriel, 01/11/2026) : une loupe dans la barre du haut plutôt qu'un
 *            champ toujours là, et une recherche qui prend toute la page.
 * ATTENTION — l'ouverture vit dans l'adresse (`?recherche`) : le retour du navigateur la referme.
 *            Le `<dialog>` reste monté et s'ouvre ou se ferme avec l'adresse, pour que son entrée et
 *            sa sortie s'animent (search-overlay.css). Quitter vers un résultat REMPLACE l'entrée
 *            `?recherche` : le retour ramène à la page d'avant, pas à la recherche. Rendu dans
 *            `document.body` : posé dans la page, il passait sous le mur d'affiche (v2.md).
 */
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useTransitionNavigate } from '@/lib/navigation'
import { readRecent, rememberSearch } from '@/lib/recent-searches'
import { fetchTags, type TagRow } from '@/lib/tags'
import { SearchResults, SearchStart } from './SearchResults'
import { MIN_LETTERS, useQuickSearch } from './useQuickSearch'

export const SEARCH_PARAM = 'recherche'

export function SearchOverlay() {
  const [params] = useSearchParams()
  const open = params.has(SEARCH_PARAM)
  const location = useLocation()
  const navigate = useNavigate()
  const go = useTransitionNavigate()
  const dialog = useRef<HTMLDialogElement>(null)
  const [typed, setTyped] = useState('')
  const [tags, setTags] = useState<TagRow[]>([])
  const quick = useQuickSearch(typed)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  // Les catégories, une fois, à la première ouverture.
  const wanted = open && tags.length === 0
  useEffect(() => {
    if (!wanted) return
    let cancelled = false
    void fetchTags().then((rows) => {
      if (!cancelled) setTags(rows)
    })
    return () => {
      cancelled = true
    }
  }, [wanted])

  function close() {
    setTyped('')
    // Ouverte depuis la loupe : on revient d'un pas. Arrivée par un lien : on retire le paramètre.
    if ((location.state as { search?: boolean } | null)?.search) {
      void navigate(-1)
      return
    }
    const next = new URLSearchParams(params)
    next.delete(SEARCH_PARAM)
    void navigate({ search: next.toString() }, { replace: true })
  }

  function leave(to: string) {
    rememberSearch(typed)
    setTyped('')
    go(to, { replace: true })
  }

  const words = typed.trim()
  return createPortal(
    <dialog
      ref={dialog}
      className="search-overlay"
      aria-label="Rechercher"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
    >
      <div className="search-overlay__column">
        <form
          className="search-overlay__bar"
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            leave(words ? `/explorer?${new URLSearchParams({ q: words }).toString()}` : '/explorer')
          }}
        >
          <Search className="search-overlay__icon" size={28} strokeWidth={1.75} aria-hidden />
          <input
            className="search-overlay__input"
            // Texte et non « search » : dans un champ de recherche, Échap vide d'abord le texte.
            type="text"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Un festival, un exposant, une date passée…"
            aria-label="Rechercher partout"
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value)
            }}
          />
          <kbd className="search-overlay__key">Échap</kbd>
          <Button variant="icon" aria-label="Fermer la recherche" onClick={close}>
            <X size={18} strokeWidth={1.75} />
          </Button>
        </form>

        <div className="search-overlay__body" key={quick ? 'results' : 'start'}>
          {!quick && open && (
            <SearchStart recent={readRecent()} tags={tags} onWords={setTyped} onLeave={leave} />
          )}
          {quick?.failed && (
            <p className="search-overlay__empty">La recherche n’a pas abouti, réessaie.</p>
          )}
          {quick?.results && (
            <SearchResults results={quick.results} words={quick.words} onLeave={leave} />
          )}
        </div>

        {words.length >= MIN_LETTERS && (
          <p className="search-overlay__hint">
            <kbd className="search-overlay__key">Entrée</kbd> tout voir dans Explorer
          </p>
        )}
      </div>
    </dialog>,
    document.body,
  )
}
