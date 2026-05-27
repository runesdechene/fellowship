import { useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { EntityGalleryRow } from '@/types/database'

interface VitrineGalleryProps {
  photos: EntityGalleryRow[]
  editing?: boolean
  onAdd?: (files: File[]) => void
  onRemove?: (id: string) => void
  onReorder?: (orderedIds: string[]) => void
}

export function VitrineGallery({ photos, editing, onAdd, onRemove, onReorder }: VitrineGalleryProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  if (!editing && photos.length === 0) return null

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId || !onReorder) return
    const ids = photos.map(p => p.id)
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId)
    ids.splice(to, 0, ids.splice(from, 1)[0])
    onReorder(ids)
    setDragId(null)
  }

  return (
    <div className="v-card">
      <h2>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        Sélection
      </h2>
      <div className="v-gallery">
        {photos.map(p => (
          <div
            key={p.id}
            className={`v-gphoto ${editing ? 'is-editing' : ''} ${dragId === p.id ? 'is-dragging' : ''}`}
            draggable={editing}
            onDragStart={() => setDragId(p.id)}
            onDragOver={e => { if (editing) e.preventDefault() }}
            onDrop={() => handleDrop(p.id)}
          >
            <img src={p.image_url} alt="" loading="lazy" />
            {editing && onRemove && (
              <button type="button" className="v-gphoto-del" onClick={() => onRemove(p.id)} aria-label="Supprimer la photo"><X /></button>
            )}
          </div>
        ))}
        {editing && onAdd && (
          <button type="button" className="v-gphoto v-gphoto-add" onClick={() => fileRef.current?.click()} aria-label="Ajouter des photos">
            <Plus />
            <input
              ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) onAdd(f); if (fileRef.current) fileRef.current.value = '' }}
            />
          </button>
        )}
      </div>
    </div>
  )
}
