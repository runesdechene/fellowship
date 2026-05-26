import type { EntityGalleryRow } from '@/types/database'

interface VitrineGalleryProps {
  photos: EntityGalleryRow[]
}

export function VitrineGallery({ photos }: VitrineGalleryProps) {
  if (photos.length === 0) return null

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
        {photos.map((p) => (
          <div key={p.id} className="v-gphoto">
            <img src={p.image_url} alt="" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  )
}
