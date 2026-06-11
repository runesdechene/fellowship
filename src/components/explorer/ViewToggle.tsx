import { LayoutGrid, GalleryHorizontalEnd } from 'lucide-react'
import type { ExplorerView } from '@/lib/explorer'

interface ViewToggleProps {
  mode: ExplorerView
  onChange: (mode: ExplorerView) => void
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="group" aria-label="Mode d'affichage">
      <button
        type="button"
        className={'view-toggle-btn' + (mode === 'slideshow' ? ' on' : '')}
        aria-pressed={mode === 'slideshow'}
        onClick={() => onChange('slideshow')}
      >
        <GalleryHorizontalEnd size={17} strokeWidth={2} />
        <span className="view-toggle-label">Slideshow</span>
      </button>
      <button
        type="button"
        className={'view-toggle-btn' + (mode === 'grid' ? ' on' : '')}
        aria-pressed={mode === 'grid'}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid size={17} strokeWidth={2} />
        <span className="view-toggle-label">Grille</span>
      </button>
    </div>
  )
}
